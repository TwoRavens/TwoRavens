from model import R_SERVICE
from util_dataset import Dataset
from util_model import ModelSklearn, ModelH2O, ModelCaret

import uuid
import abc
import requests

import tpot
import h2o
from h2o.automl import H2OAutoML
import autosklearn.classification
import autosklearn.regression


class Search(object):
    def __init__(self, specification, system_params, callback_found=lambda model: None):
        self.search_id = str(uuid.uuid4())
        self.specification = specification
        self.system_params = system_params
        self.callback_found = callback_found

    @abc.abstractmethod
    async def run(self):
        pass

    @staticmethod
    def load(system, specification, system_params=None, callback_found=lambda model: None):
        return {
            'auto_sklearn': SearchAutoSklearn,
            'caret': SearchCaret,
            'h2o': SearchH2O,
            'tpot': SearchTPOT
        }[system](
            specification=specification,
            system_params=system_params,
            callback_found=callback_found)


class SearchAutoSklearn(Search):

    def run(self):
        dataset = Dataset(self.specification['input'])
        dataframe = dataset.get_dataframe()

        x = dataframe[self.specification['problem']['predictors']]
        y = dataframe[self.specification['problem']['targets'][0]]

        #
        # if os.path.exists(tmp_folder):
        #     shutil.rmtree(tmp_folder)
        # if os.path.exists(output_folder):
        #     shutil.rmtree(output_folder)

        if 'configuration' in self.specification:
            config = self.specification['configuration']

            self.system_params['resampling_strategy_arguments'] = self.system_params.get('resampling_strategy_arguments', {})
            self.system_params['resampling_strategy_arguments']['shuffle'] = config.get('shuffle', False)

            if config['method'] == "HOLDOUT":
                self.system_params['resampling_strategy'] = 'holdout'
                self.system_params['resampling_strategy_arguments']['train_size'] = config.get('trainTestRatio') or .6

            if config['method'] == "K_FOLD":
                self.system_params['resampling_strategy'] = 'cv'
                self.system_params['resampling_strategy_arguments']['folds'] = config.get('folds') or 10

        print('system params', self.system_params, flush=True)
        automl = {
            'REGRESSION': autosklearn.regression.AutoSklearnRegressor,
            'CLASSIFICATION': autosklearn.classification.AutoSklearnClassifier
        }[self.specification['problem']['taskType']](**self.system_params)

        print('started fitting', flush=True)
        automl.fit(dataframe[x], dataframe[y], dataset_name=dataset.get_name())

        print('started wrapping model', flush=True)
        model = ModelSklearn(automl, system='auto_sklearn', search_id=self.search_id)
        model.save()

        self.callback_found(model)


class SearchCaret(Search):

    model_space_default = {
        'regression': [
            {"method": 'lm'},  # old faithful
            {"method": 'pcr'},  # principal components regression
            {"method": 'glmnet'},  # lasso/ridge
            {"method": 'rpart'},  # regression tree
            {"method": 'knn'},  # k nearest neighbors
            {"method": 'earth'},  # regression splines
            {"method": 'svmLinear'}  # linear support vector regression
        ],
        "classification": [
            {"method": 'glm', "hyperparameters": {"family": 'binomial'}},
            {"method": 'glmnet', "hyperparameters": {"family": 'binomial'}},
            {"method": 'lda'},  # linear discriminant analysis
            {"method": 'qda'},  # quadratic discriminant analysis
            {"method": 'rpart'},  # decision tree
            {"method": 'svmLinear'},  # support vector machine
            {"method": 'naive_bayes'},
            {"method": 'knn'}
        ]
    }

    def run(self):

        for method_spec in self.system_params.get('model_space', self.model_space_default):

            response = requests.post(R_SERVICE + 'caret.app', json={
                'specification': self.specification,
                'system_params': {'method_spec': method_spec}}).json()

            if not response['success']:
                raise ValueError(response['message'])

            for model_spec in response['data']['model']:
                ModelCaret(model_spec)


class SearchH2O(Search):

    async def run(self):

        # ensure backend solver is running
        h2o.init()

        train = h2o.import_file(Dataset(self.specification['input']).get_resource_uri())
        test = None

        X = self.specification['problem']['predictors']
        y = self.specification['problem']['targets'][0]

        if self.specification['problem']['taskType'] in ['classification', 'semisupervisedClassification']:
            # For classification, response should be a factor
            train[y] = train[y].asfactor()

        if 'configuration' in self.specification:
            config = self.specification['configuration']

            self.system_params['resampling_strategy_arguments'] = self.system_params.get('resampling_strategy_arguments', {})
            self.system_params['resampling_strategy_arguments']['shuffle'] = config.get('shuffle', False)

            if config['method'] == "HOLDOUT":
                train, test = train.split_frame(
                    ratios=[config.get('trainTestRatio') or .6],
                    seed=config.get('randomSeed'))

            if config['method'] == "K_FOLD":
                self.system_params['nfolds'] = config.get('folds') or 10

            self.system_params['balance_classes'] = config.get('stratified', False)

        if 'timeBoundSearch' in self.specification:
            self.system_params['max_runtime_secs'] = self.specification['timeBoundSearch']
        if 'timeBoundRun' in self.specification:
            self.system_params['max_runtime_secs_per_model'] = self.specification['timeBoundRun']
        if 'rankSolutionsLimit' in self.specification:
            self.system_params['max_models'] = self.specification['rankSolutionsLimit']

        sort_metrics = {
            'accuracy': "deviance",
            'rocAuc': "auc",
            'meanSquaredError': "mse",
            'rootMeanSquaredError': "rmse",
            'meanAbsoluteError': "mae",
            'loss': "logloss",
        }
        if 'performanceMetric' in self.specification:
            metric_spec = self.specification['performanceMetric']
            if metric_spec['metric'] in sort_metrics:
                self.system_params['sort_metric'] = sort_metrics[metric_spec['metric']]
                self.system_params['stopping_metric'] = sort_metrics[metric_spec['metric']]

        # CV models are useful for model comparisons
        self.system_params['keep_cross_validation_models'] = True

        train_params = {
            "x": X,
            "y": y,
            "training_frame": train
        }
        if test:
            train_params['leaderboard_frame'] = test

        automl = H2OAutoML(**self.system_params)
        automl.train(**train_params)

        # TODO: extract more than one model
        model = ModelH2O(automl.leader, search_id=self.search_id)
        self.callback_found(model)


class SearchTPOT(Search):

    async def run(self):
        dataset = Dataset(self.specification['input'])

        dataframe = dataset.get_dataframe()
        X = dataframe[self.specification['problem']['predictors']]
        y = dataframe[self.specification['problem']['targets'][0]]

        automl = {
            'regression': tpot.TPOTRegressor,
            'classification': tpot.TPOTClassifier
        }[self.specification['problem']['taskType']](**self.system_params)

        automl.fit(X, y)

        # selected models along the cost-complexity vs accuracy frontier
        for model_str in automl.pareto_front_fitted_pipelines_:
            model = ModelSklearn(automl.pareto_front_fitted_pipelines_[model_str], system='tpot', search_id=self.search_id)
            model.save()
            self.callback_found(model)
