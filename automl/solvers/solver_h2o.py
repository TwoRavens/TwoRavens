import json
import uuid
import os
import h2o
from h2o.automl import H2OAutoML

from automl.base import Search, Dataset, Model, SAVED_MODELS_DIRECTORY


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


class ModelH2O(Model):
    def __init__(self, model, model_id=None, search_id=None):
        super().__init__(model, 'h2o', model_id, search_id)

    def describe(self):
        # TODO: improve model description
        return {
            "description": str(self.model),
            "model_id": self.model_id
        }

    def score(self, specification):
        resource_uri = Dataset(specification['input']).get_resource_uri()
        data = h2o.import_file(resource_uri)
        predicted = self.model.predict(data).as_data_frame()
        data = data.as_data_frame()

        scores = []
        for metric in specification['performanceMetrics']:
            for target in predicted.columns:
                try:
                    scores.append({
                        'value': Model._score(metric, data[target], predicted[target]),
                        'metric': metric,
                        'target': target
                    })
                except NotImplementedError:
                    pass

        return scores

    def produce(self, specification):
        resource_uri = Dataset(specification['input']).get_resource_uri()
        data = h2o.import_file(resource_uri)

        resource_path = os.path.join(
            *specification['output']['resource_uri'].replace('file://', '').split('/'),
            str(uuid.uuid4()) + '.csv')

        predictions = self.model.predict(data).as_data_frame()
        predictions.insert(0, 'd3mIndex', data.as_data_frame()['d3mIndex'])
        predictions.to_csv(resource_path)

        return resource_path

    def save(self):
        model_folder_path = os.path.join(SAVED_MODELS_DIRECTORY, self.model_id)
        metadata_path = os.path.join(model_folder_path, 'metadata.json')

        if not os.path.exists(metadata_path):
            os.mkdir(model_folder_path)

        model_path = h2o.save_model(self.model, path=model_folder_path, force=True)
        with open(model_folder_path, 'w') as metadata_file:
            json.dump(metadata_file, {
                'solver_type': self.solver_type,
                'model_id': self.model_id,
                'model_filename': model_folder_path.replace(model_path, '')
            })
