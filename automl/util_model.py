import joblib
import abc
import uuid
import json
import requests
import os
import sklearn.metrics
import h2o

from model import SAVED_MODELS_DIRECTORY, R_SERVICE
from util_dataset import Dataset


class Model(object):
    def __init__(self, model, system, model_id=None, search_id=None):
        self.model = model
        self.system = system
        self.model_id = model_id or str(uuid.uuid4())
        self.search_id = search_id

    @abc.abstractmethod
    def describe(self):
        pass

    @abc.abstractmethod
    def score(self, specification):
        pass

    @abc.abstractmethod
    def produce(self, specification):
        pass

    @abc.abstractmethod
    def save(self):
        pass

    @staticmethod
    def load(model_id):
        model_folder_path = os.path.join(SAVED_MODELS_DIRECTORY, model_id)
        metadata_path = os.path.join(model_folder_path, 'metadata.json')

        if not os.path.exists(metadata_path):
            raise FileNotFoundError

        with open(metadata_path, 'r') as metadata_file:
            metadata = json.load(metadata_file)

        if metadata['system'] in ['auto_sklearn', 'tpot']:
            return ModelSklearn(
                model=joblib.load(os.path.join(model_folder_path, 'model.joblib')),
                system=metadata['system'],
                model_id=model_id,
                search_id=metadata['search_id'])

        if metadata['system'] == 'h2o':
            return ModelH2O(
                model=h2o.load_model(os.path.join(model_folder_path, metadata['model_filename'])),
                model_id=model_id,
                search_id=metadata['search_id'])

        raise ValueError(f'System type "{metadata["system"]}" is not recognized.')

    @staticmethod
    def _score(specification, actual, predicted):
        if specification['metric'] == "ACCURACY":
            return sklearn.metrics.accuracy_score(actual, predicted)
        if specification['metric'] == "PRECISION":
            return sklearn.metrics.precision_score(actual, predicted)
        if specification['metric'] == "RECALL":
            return sklearn.metrics.recall_score(actual, predicted)
        if specification['metric'] == "F1":
            return sklearn.metrics.f1_score(actual, predicted)
        if specification['metric'] == "F1_MICRO":
            return sklearn.metrics.f1_score(actual, predicted, average="micro")
        if specification['metric'] == "F1_MACRO":
            return sklearn.metrics.f1_score(actual, predicted, average="macro")
        if specification['metric'] == "ROC_AUC":
            return sklearn.metrics.roc_auc_score(actual, predicted)
        if specification['metric'] == "ROC_AUC_MICRO":
            return sklearn.metrics.roc_auc_score(actual, predicted, average="micro")
        if specification['metric'] == "ROC_AUC_MACRO":
            return sklearn.metrics.roc_auc_score(actual, predicted, average="macro")
        if specification['metric'] == "MEAN_SQUARED_ERROR":
            return sklearn.metrics.mean_squared_error(actual, predicted)
        if specification['metric'] == "MEAN_ABSOLUTE_ERROR":
            return sklearn.metrics.mean_absolute_error(actual, predicted)
        if specification['metric'] == "R_SQUARED":
            return sklearn.metrics.r2_score(actual, predicted)
        if specification['metric'] == "JACCARD_SIMILARITY_SCORE":
            return sklearn.metrics.jaccard_similarity_score(actual, predicted)
        if specification['metric'] == "PRECISION_AT_TOP_K":
            raise NotImplementedError
        if specification['metric'] == "OBJECT_DETECTION_AVERAGE_PRECISION":
            raise NotImplementedError
        if specification['metric'] == "HAMMING_LOSS":
            return sklearn.metrics.hamming_loss(actual, predicted)
        if specification['metric'] == "RANK":
            raise NotImplementedError

        raise NotImplementedError


class ModelSklearn(Model):

    def describe(self):
        # TODO: improve model description
        return {
            "description": str(self.model),
            "model_id": self.model_id
        }

    def score(self, specification):
        data = Dataset(specification['input']).get_dataframe()
        predicted = self.model.predict(data)

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
        data = Dataset(specification['input']).get_dataframe()

        resource_path = os.path.join(
            *specification['output']['resource_uri'].replace('file://', '').split('/'),
            str(uuid.uuid4()) + '.csv')

        predictions = self.model.predict(data)
        predictions.insert(0, 'd3mIndex', data['d3mIndex'])
        predictions.to_csv(resource_path)

        return resource_path

    def save(self):
        model_folder_path = os.path.join(SAVED_MODELS_DIRECTORY, self.model_id)
        metadata_path = os.path.join(model_folder_path, 'metadata.json')

        if not os.path.exists(metadata_path):
            os.mkdir(model_folder_path)

        with open(model_folder_path, 'w') as metadata_file:
            json.dump(metadata_file, {
                'solver_type': self.solver_type,
                'model_id': self.model_id
            })

        joblib.dump(self.model, os.path.join(model_folder_path, 'model.joblib'))


class ModelCaret(Model):
    def __init__(self, model, model_id=None, search_id=None):
        super().__init__(model, 'caret', model_id, search_id)

    def describe(self):
        # TODO: improve model description
        return {
            "description": str(self.model),
            "model_id": self.model_id
        }

    def score(self, specification):
        response = requests.post(
            R_SERVICE + 'caretProduce.app',
            json={'specification': specification}).json()

        if not response['success']:
            raise ValueError(response['message'])
        data = Dataset(specification['input']).get_dataframe()
        predicted = Dataset(response['data']).get_dataframe()

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
        response = requests.post(
            R_SERVICE + 'caretProduce.app',
            json={'specification': specification}).json()

        if not response['success']:
            raise ValueError(response['message'])

        return response['data']

    def save(self):
        # ignore, model is only present in remote caret.app
        raise ValueError('Caret model is not saveable in Python.')


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
