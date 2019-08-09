import abc
import uuid
import json
import os

import h2o
import joblib
import pandas
import sklearn.metrics
import requests
import time

from automl.runner import KEY_SUCCESS, KEY_DATA

from automl.solvers.solver_auto_sklearn import SearchAutoSklearn
from automl.solvers.solver_caret import SearchCaret
from automl.solvers.solver_h2o import SearchH2O, ModelH2O
from automl.solvers.solver_tpot import SearchTPOT

SAVED_MODELS_DIRECTORY = '/ravens_volume/solvers/'
DJANGO_SOLVER_SERVICE = 'http://localhost:8080/solver-svc/'
R_SERVICE = 'http://localhost:8000/'


class Solve(object):
    def __init__(self, system, specification, system_params=None):
        self.system = system
        self.specification = specification
        self.system_params = system_params or {}
        self.search = {
            'auto_sklearn': SearchAutoSklearn,
            'h2o': SearchH2O,
            'tpot': SearchTPOT,
            'caret': SearchCaret
        }[system](self.specification['search'], self.system_params, self.found)

    async def run(self):
        start_time = time.time()
        await self.search.run()
        requests.post(
            url=DJANGO_SOLVER_SERVICE + 'finished',
            json={
                KEY_SUCCESS: True,
                KEY_DATA: {
                    "search_id": self.search.search_id,
                    "elapsed_time": time.time() - start_time
                }
            })

    def found(self, model):

        # TODO: thread to avoid (slight) block
        requests.post(
            url=DJANGO_SOLVER_SERVICE + 'describe',
            json=model.describe())

        for score_spec in self.specification['score']:
            requests.post(
                url=DJANGO_SOLVER_SERVICE + 'score',
                json=model.score(score_spec))

        for produce_spec in self.specification['produce']:
            requests.post(
                url=DJANGO_SOLVER_SERVICE + 'produce',
                json=model.produce(produce_spec))


class Search(object):
    def __init__(self, specification, system_params, callback_found=lambda model: None):
        self.search_id = uuid.uuid4()
        self.specification = specification
        self.system_params = system_params
        self.callback_found = callback_found

    @abc.abstractmethod
    async def run(self):
        pass

    @staticmethod
    def load(system, specification, system_params=None):
        return {
            'auto_sklearn': SearchAutoSklearn,
            'caret': SearchCaret,
            'h2o': SearchH2O,
            'tpot': SearchTPOT
        }[system](
            specification=specification,
            system_params=system_params)


class Model(object):
    def __init__(self, model, system, model_id=None, search_id=None):
        self.model = model
        self.system = system
        self.model_id = model_id or uuid.uuid4()
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


class Dataset(object):
    def __init__(self, input):
        if not input:
            raise ValueError('No input provided.')

        if 'resource_uri' not in input:
            raise ValueError('Invalid input: no resource_uri provided.')

        self.input = input

    def get_dataframe(self):
        options = {}

        if 'delimiter' in self.input:
            options['delimiter'] = self.input['delimiter']

        return pandas.read_csv(self.get_resource_uri(), **options)

    def get_resource_uri(self):
        return self.input['resource_uri']

    def get_file_path(self):
        return os.path.join(*self.get_resource_uri().replace('file://', '').split('/'))

    def get_name(self):
        return self.input.get('name', self.input['resource_uri'])
