
import json
import pandas
import numpy as np
from scipy.sparse.csr import csr_matrix
from sklearn.impute import SimpleImputer

from model import R_SERVICE, KEY_SUCCESS, KEY_MESSAGE, KEY_DATA, get_metric, should_maximize
from util_dataset import Dataset
from util_model import ModelSklearn, ModelH2O, ModelLudwig

import uuid
import abc
import requests
import sys

# PREPROCESSING
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer

from sklearn.metrics.scorer import make_scorer


def preprocess(dataframe, specification):

    X = specification['problem']['predictors']
    y = specification['problem']['targets'][0]

    categorical_features = [i for i in specification['problem']['categorical'] if i != y and i in X]

    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
        ('onehot', OneHotEncoder(handle_unknown='ignore'))
    ])

    numerical_features = [i for i in X if i not in categorical_features]
    numerical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])

    preprocessor = ColumnTransformer(transformers=[
        ('numeric', numerical_transformer, numerical_features),
        ('categorical', categorical_transformer, categorical_features)
    ])

    stimulus = dataframe[X]
    stimulus = preprocessor.fit_transform(stimulus)

    return stimulus, preprocessor


class Search(object):
    system = None

    def __init__(self, specification, system_params, callback_found=lambda model, params: None, callback_params=None):
        self.search_id = str(uuid.uuid4())
        self.specification = specification
        self.system_params = system_params
        self.callback_found = callback_found
        self.callback_params = callback_params

    @abc.abstractmethod
    def run(self):
        pass

    @staticmethod
    def load(system, specification, system_params=None, callback_found=lambda model: None):
        return {
            'auto_sklearn': SearchAutoSklearn,
            'caret': SearchCaret,
            'h2o': SearchH2O,
            'tpot': SearchTPOT,
            'ludwig': SearchLudwig
        }[system](
            specification=specification,
            system_params=system_params,
            callback_found=callback_found)


class SearchAutoSklearn(Search):
    system = 'auto_sklearn'

    def run(self):
        import autosklearn.classification
        import autosklearn.regression

        dataset = Dataset(self.specification['input'])

        dataframe = dataset.get_dataframe().dropna()
        dataframe.reset_index(drop=True, inplace=True)
        stimulus, preprocessor = preprocess(dataframe, self.specification)

        x = self.specification['problem']['predictors']
        y = self.specification['problem']['targets'][0]

        # if os.path.exists(tmp_folder):
        #     shutil.rmtree(tmp_folder)
        # if os.path.exists(output_folder):
        #     shutil.rmtree(output_folder)

        if 'configuration' in self.specification:
            config = self.specification['configuration']

            self.system_params['resampling_strategy_arguments'] = self.system_params.get('resampling_strategy_arguments', {})
            self.system_params['resampling_strategy_arguments']['shuffle'] = config.get('shuffle', False)

            if config['method'] == "HOLDOUT":
                self.system_params['resampling_strategy'] = 'holdOut'
                self.system_params['resampling_strategy_arguments']['train_size'] = max(0, config.get('trainTestRatio')) or .6

            if config['method'] == "K_FOLD":
                self.system_params['resampling_strategy'] = 'cv'
                self.system_params['resampling_strategy_arguments']['folds'] = config.get('folds') or 10

        if self.specification.get('timeBoundSearch'):
            self.system_params['time_left_for_this_task'] = self.specification.get('timeBoundSearch')

        if self.specification.get('timeBoundRun'):
            self.system_params['per_run_time_limit'] = self.specification.get('timeBoundRun')
        # sklearn_temp_path = '/ravens_volume/solvers/auto_sklearn/temporary/' + str(uuid.uuid4())
        # tmp_folder = os.path.join(*sklearn_temp_path.split('/'), 'temp')
        # output_folder = os.path.join(*sklearn_temp_path.split('/'), 'output')

        # self.system_params['tmp_folder'] = tmp_folder
        # self.system_params['output_folder'] = output_folder
        # self.system_params['delete_tmp_folder_after_terminate'] = False

        # valid system params
        # https://automl.github.io/auto-sklearn/master/api.html#api
        automl = {
            'REGRESSION': autosklearn.regression.AutoSklearnRegressor,
            'CLASSIFICATION': autosklearn.classification.AutoSklearnClassifier
        }[self.specification['problem']['taskType']](**self.system_params)

        automl.fit(stimulus, dataframe[y])

        if self.system_params['resampling_strategy'] == 'cv':
            automl.refit(stimulus, dataframe[y])

        model = ModelSklearn(
            automl,
            system='auto_sklearn',
            search_id=self.search_id,
            predictors=x,
            targets=[y],
            preprocess=preprocessor,
            task=self.specification['problem']['taskType'])
        model.save()

        self.callback_found(model, self.callback_params)

        return {
            KEY_SUCCESS: True,
            KEY_MESSAGE: 'search complete',
            KEY_DATA: {
                'search_id': self.search_id,
                'system': 'auto_sklearn'
            }
        }


class SearchCaret(Search):
    system = 'caret'

    def run(self):
        return requests.post(R_SERVICE + 'caretSolve.app', json={
            'callback_params': self.callback_params,
            'search_id': self.search_id,
            'specification': self.specification,
            'system_params': self.system_params
        }).json()


class SearchH2O(Search):
    system = 'h2o'

    def run(self):
        import h2o
        from h2o.automl import H2OAutoML

        # ensure backend solver is running
        h2o.init()

        train = h2o.import_file(Dataset(self.specification['input']).get_resource_uri())
        test = None

        X = self.specification['problem']['predictors']
        y = self.specification['problem']['targets'][0]

        if self.specification['problem']['taskType'] == 'CLASSIFICATION':
            # For classification, response should be a factor
            train[y] = train[y].asfactor()

        if 'configuration' in self.specification:
            config = self.specification['configuration']

            if config['method'] == "HOLDOUT":
                train, test = train.split_frame(
                    ratios=[max(0, config.get('trainTestRatio')) or .6],
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

        # sort_metrics = {
        #     'ACCURACY': "rmse",
        #     'ROC_AUC': "auc",
        #     'MEAN_SQUARED_ERROR': "mse",
        #     'ROOT_MEAN_SQUARED_ERROR': "rmse",
        #     'MEAN_ABSOLUTE_ERROR': "mae",
        #     'LOSS': "logloss",
        # }
        # if 'performanceMetric' in self.specification:
        #     metric_spec = self.specification['performanceMetric']
        #     if metric_spec['metric'] in sort_metrics:
        #         self.system_params['sort_metric'] = sort_metrics[metric_spec['metric']]
        #         self.system_params['stopping_metric'] = sort_metrics[metric_spec['metric']]

        # CV models are useful for model comparisons
        # self.system_params['keep_cross_validation_models'] = True

        if 'CLASSIFICATION' in self.specification['problem']['taskType']:
            train[y] = train[y].asfactor()

        train_params = {
            "x": X,
            "y": y,
            "training_frame": train
        }
        if test:
            train_params['leaderboard_frame'] = test

        automl = H2OAutoML(**self.system_params)
        automl.train(**train_params)

        if not automl.leader:
            return {
                KEY_SUCCESS: False,
                KEY_MESSAGE: 'no models found',
                KEY_DATA: {
                    'search_id': self.search_id,
                    'system': 'h2o'
                }
            }

        leaderboard = automl.leaderboard

        # take up to 10 models
        for model_id in leaderboard.head(10).as_data_frame()['model_id']:
            model = ModelH2O(
                h2o.get_model(model_id),
                search_id=self.search_id,
                predictors=X,
                targets=[y],
                task=self.specification['problem']['taskType'])
            model.save()

            self.callback_found(model, self.callback_params)

        return {
            KEY_SUCCESS: True,
            KEY_MESSAGE: 'search complete',
            KEY_DATA: {
                'search_id': self.search_id,
                'system': 'h2o'
            }
        }

        return {
            KEY_SUCCESS: True,
            KEY_MESSAGE: 'search complete',
            KEY_DATA: {
                'search_id': self.search_id,
                'system': 'h2o'
            }
        }


class SearchTPOT(Search):
    system = 'tpot'

    def run(self):
        import tpot
        dataset = Dataset(self.specification['input'])

        dataframe = dataset.get_dataframe().dropna()
        stimulus, preprocessor = preprocess(dataframe, self.specification)

        X = self.specification['problem']['predictors']
        y = self.specification['problem']['targets'][0]

        self.system_params['config_dict'] = 'TPOT sparse'

        # scorer = make_scorer(
        #     get_metric(self.specification['performanceMetric']),
        #     greater_is_better=should_maximize(self.specification['performanceMetric']))
        # self.system_params['scoring'] = scorer

        automl = {
            'REGRESSION': tpot.TPOTRegressor,
            'CLASSIFICATION': tpot.TPOTClassifier
        }[self.specification['problem']['taskType']](**self.system_params)

        automl.fit(stimulus, dataframe[y])

        # selected models along the cost-complexity vs accuracy frontier
        for model_str in automl.pareto_front_fitted_pipelines_:
            model = ModelSklearn(
                automl.pareto_front_fitted_pipelines_[model_str],
                system='tpot',
                search_id=self.search_id,
                predictors=X,
                targets=[y],
                preprocess=preprocessor,
                task=self.specification['problem']['taskType'])
            model.save()

            self.callback_found(model, self.callback_params)

        return {
            KEY_SUCCESS: True,
            KEY_MESSAGE: 'search complete',
            KEY_DATA: {
                'search_id': self.search_id,
                'system': 'tpot'
            }
        }


class SearchMLBox(Search):
    system = 'mlbox'

    def run(self):
        import mlbox.model.classification
        import mlbox.model.regression

        dataset = Dataset(self.specification['input'])

        dataframe = dataset.get_dataframe().dropna()
        X = self.specification['problem']['predictors']
        y = self.specification['problem']['targets'][0]

        stimulus, preprocessor = preprocess(dataframe, self.specification)

        automl = {
            'REGRESSION': mlbox.model.regression.Regressor,
            'CLASSIFICATION': mlbox.model.classification.Classifier
        }[self.specification['problem']['taskType']](**self.system_params)

        if issubclass(type(stimulus), csr_matrix):
            stimulus = stimulus.toarray()

        automl.fit(df_train=pandas.DataFrame(stimulus), y_train=dataframe[y])

        model = ModelSklearn(
            automl,
            system='mlbox',
            search_id=self.search_id,
            predictors=X,
            targets=[y],
            preprocess=preprocessor,
            task=self.specification['problem']['taskType'])
        model.save()

        self.callback_found(model, self.callback_params)

        return {
            KEY_SUCCESS: True,
            KEY_MESSAGE: 'search complete',
            KEY_DATA: {
                'search_id': self.search_id,
                'system': 'mlbox'
            }
        }


class SearchLudwig(Search):
    system = 'ludwig'

    def run(self):
        from ludwig.api import LudwigModel

        dataset = Dataset(self.specification['input'])

        dataframe = dataset.get_dataframe()
        predictors = self.specification['problem']['predictors']
        targets = self.specification['problem']['targets']

        target_type = {
            "REGRESSION": 'numerical',
            "CLASSIFICATION": 'category'
        }[self.specification['problem']['taskType']]

        # https://github.com/uber/ludwig/blob/master/tests/integration_tests/utils.py
        model_definition = {
            "input_features": [{
                "name": predictor,
                "type": 'category' if predictor in self.specification['problem']['categorical'] else 'numerical'
            } for predictor in predictors],
            "output_features": [{"name": target, "type": target_type} for target in targets]
        }

        automl = LudwigModel(model_definition)

        train_statistics = automl.train(dataframe)

        print('train_statistics')
        print(train_statistics)

        model = ModelLudwig(
            automl,
            search_id=self.search_id,
            predictors=predictors,
            targets=targets,
            task=self.specification['problem']['taskType'])

        model.save()
        self.callback_found(model, self.callback_params)

        return {
            KEY_SUCCESS: True,
            KEY_MESSAGE: 'search complete',
            KEY_DATA: {
                'search_id': self.search_id,
                'system': 'ludwig'
            }
        }


class SearchMLJarSupervised(Search):
    system = 'mljar-supervised'

    def run(self):
        from supervised.automl import AutoML

        dataset = Dataset(self.specification['input'])

        dataframe = dataset.get_dataframe().dropna()
        X = self.specification['problem']['predictors']
        y = self.specification['problem']['targets'][0]

        stimulus, preprocessor = preprocess(dataframe, self.specification)

        if self.specification.get('timeBoundSearch'):
            self.system_params['total_time_limit'] = self.specification['timeBoundSearch']

        if self.specification.get('timeBoundRun'):
            self.system_params['learner_time_limit'] = self.specification['timeBoundRun']

        automl = AutoML(**self.system_params)

        # mljar seems kind of fragile?
        stimulus = pandas.DataFrame(stimulus)
        stimulus.columns = [str(i).strip() for i in stimulus.columns]

        automl.fit(stimulus, dataframe[y])

        for model_mljar in sorted(automl._models, key=lambda m: m.get_final_loss())[:4]:
            model = ModelSklearn(
                model_mljar,
                system='mljar-supervised',
                search_id=self.search_id,
                predictors=X,
                targets=[y],
                preprocess=preprocessor,
                task=self.specification['problem']['taskType'])

            model.save()
            self.callback_found(model, self.callback_params)

        return {
            KEY_SUCCESS: True,
            KEY_MESSAGE: 'search complete',
            KEY_DATA: {
                'search_id': self.search_id,
                'system': 'mljar-supervised'
            }
        }


class SearchMLBox(Search):

    def run(self):
        import mlbox.model.classification
        import mlbox.model.regression

        dataset = Dataset(self.specification['input'])

        dataframe = dataset.get_dataframe()
        X = self.specification['problem']['predictors']
        y = self.specification['problem']['targets'][0]

        stimulus, preprocessor = preprocess(dataframe, self.specification)

        automl = {
            'REGRESSION': mlbox.model.regression.Regressor,
            'CLASSIFICATION': mlbox.model.classification.Classifier
        }[self.specification['problem']['taskType']](**self.system_params)

        if issubclass(type(stimulus), csr_matrix):
            stimulus = stimulus.toarray()

        automl.fit(df_train=pandas.DataFrame(stimulus), y_train=dataframe[y])

        model = ModelSklearn(
            automl,
            system='mlbox',
            search_id=self.search_id,
            predictors=X,
            targets=[y],
            preprocess=preprocessor)
        model.save()

        self.callback_found(model, self.callback_params)

        return {
            KEY_SUCCESS: True,
            KEY_MESSAGE: 'search complete',
            KEY_DATA: {
                'search_id': self.search_id,
                'system': 'mlbox'
            }
        }


class SearchLudwig(Search):
    system = 'ludwig'

    def run(self):
        from ludwig.api import LudwigModel

        dataset = Dataset(self.specification['input'])

        dataframe = dataset.get_dataframe()
        predictors = self.specification['problem']['predictors']
        targets = self.specification['problem']['targets']

        target_type = {
            "REGRESSION": 'numerical',
            "CLASSIFICATION": 'category'
        }[self.specification['problem']['taskType']]

        # https://github.com/uber/ludwig/blob/master/tests/integration_tests/utils.py
        model_definition = {
            "input_features": [{
                "name": predictor,
                "type": 'category' if predictor in self.specification['problem']['categorical'] else 'numerical'
            } for predictor in predictors],
            "output_features": [{"name": target, "type": target_type} for target in targets]
        }

        automl = LudwigModel(model_definition)

        train_statistics = automl.train(dataframe)

        print('train_statistics')
        print(train_statistics)

        model = ModelLudwig(
            automl,
            search_id=self.search_id,
            predictors=predictors,
            targets=targets)

        model.save()
        self.callback_found(model, self.callback_params)

        return {
            KEY_SUCCESS: True,
            KEY_MESSAGE: 'search complete',
            KEY_DATA: {
                'search_id': self.search_id,
                'system': 'ludwig'
            }
        }


class SearchMLJarSupervised(Search):
    system = 'mljar-unsupervised'

    def run(self):
        from supervised.automl import AutoML

        dataset = Dataset(self.specification['input'])

        dataframe = dataset.get_dataframe()
        X = self.specification['problem']['predictors']
        y = self.specification['problem']['targets'][0]

        stimulus, preprocessor = preprocess(dataframe, self.specification)

        if self.specification.get('timeBoundSearch'):
            self.system_params['total_time_limit'] = self.specification['timeBoundSearch']

        if self.specification.get('timeBoundRun'):
            self.system_params['learner_time_limit'] = self.specification['timeBoundRun']

        automl = AutoML(**self.system_params)

        # mljar seems kind of fragile?
        stimulus = pandas.DataFrame(stimulus)
        stimulus.columns = [str(i).strip() for i in stimulus.columns]

        automl.fit(stimulus, dataframe[y])

        model = ModelSklearn(
            automl._best_model,
            system='mljar-supervised',
            search_id=self.search_id,
            predictors=X,
            targets=[y],
            preprocess=preprocessor)

        model.save()
        self.callback_found(model, self.callback_params)

        return {
            KEY_SUCCESS: True,
            KEY_MESSAGE: 'search complete',
            KEY_DATA: {
                'search_id': self.search_id,
                'system': 'mljar-supervised'
            }
        }
