import abc
import uuid
import json
import os

import requests

import joblib
import h2o
import pandas

from model import SAVED_MODELS_PATH, R_SERVICE, get_metric
from util_dataset import Dataset


class Model(object):
    def __init__(self, model, system, predictors, targets, model_id=None, search_id=None):
        self.model = model
        self.system = system
        self.model_id = model_id or str(uuid.uuid4())
        self.search_id = search_id
        self.predictors = predictors
        self.targets = targets

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
        model_folder_path = os.path.join(SAVED_MODELS_PATH, model_id)
        metadata_path = os.path.join(model_folder_path, 'metadata.json')

        if not os.path.exists(metadata_path):
            raise FileNotFoundError

        with open(metadata_path, 'r') as metadata_file:
            metadata = json.load(metadata_file)

        if metadata['system'] in ['auto_sklearn', 'tpot', 'mlbox', 'mljar-unsupervised']:

            preprocess = None
            if os.path.exists(os.path.join(model_folder_path, 'preprocess.joblib')):
                preprocess = joblib.load(os.path.join(model_folder_path, 'preprocess.joblib'))

            return ModelSklearn(
                model=joblib.load(os.path.join(model_folder_path, 'model.joblib')),
                predictors=metadata['predictors'],
                targets=metadata['targets'],
                system=metadata['system'],
                model_id=model_id,
                search_id=metadata['search_id'],
                preprocess=preprocess)

        if metadata['system'] == 'ludwig':
            return ModelLudwig(
                model=joblib.load(os.path.join(model_folder_path, 'model.joblib')),
                predictors=metadata['predictors'],
                targets=metadata['targets'],
                model_id=model_id,
                search_id=metadata['search_id'])

        if metadata['system'] == 'h2o':
            return ModelH2O(
                model=h2o.load_model(os.path.join(model_folder_path, metadata['model_filename'])),
                model_id=model_id,
                predictors=metadata['predictors'],
                targets=metadata['targets'],
                search_id=metadata['search_id'])

        raise ValueError(f'System type "{metadata["system"]}" is not recognized.')


class ModelSklearn(Model):
    def __init__(self, model, system, predictors, targets, model_id=None, search_id=None, preprocess=None):
        super().__init__(model, system, predictors, targets, model_id, search_id)
        # categorical one hot encoding
        self.preprocess = preprocess

    def describe(self):
        # TODO: improve model description
        return {
            "description": str(self.model),
            "model_id": self.model_id
        }

    def score(self, specification):
        data = Dataset(specification['input']).get_dataframe()

        stimulus = data[self.predictors]

        if self.preprocess:
            stimulus = self.preprocess.transform(stimulus)

        predicted = self.model.predict(stimulus)
        actual = data[self.targets[0]].to_numpy().astype(float)

        scores = []

        for metric in specification['performanceMetrics']:
            scores.append({
                'value': get_metric(metric)(actual, predicted),
                'metric': metric,
                'target': self.targets[0]
            })

        return scores

    def produce(self, specification):
        predict_type = specification.get('configuration', {}).get('predict_type', 'RAW')

        dataset = Dataset(specification['input'])
        dataframe = dataset.get_dataframe()

        stimulus = dataframe[self.predictors]

        if self.preprocess:
            stimulus = self.preprocess.transform(stimulus)

        output_directory_path = specification['output']['resource_uri'].replace('file://', '')
        output_path = os.path.join(
            *output_directory_path.split('/'),
            str(uuid.uuid4()) + '.csv')

        pred_function = self.model.predict if predict_type == 'RAW' else self.model.predict_proba

        predictions = pandas.DataFrame(pred_function(stimulus), columns=self.targets)
        predictions.insert(0, 'd3mIndex', dataframe['d3mIndex'])

        if not os.path.exists(output_directory_path):
            os.makedirs(output_directory_path)

        cwd = os.getcwd()
        try:
            os.chdir('/')
            predictions.to_csv(output_path, index=False)
        finally:
            os.chdir(cwd)

        return {
            'data_pointer': output_path,
            'predict_type': predict_type,
            'search_id': self.search_id,
            'model_id': self.model_id
        }

    def save(self):
        model_folder_path = os.path.join(SAVED_MODELS_PATH, self.model_id)
        metadata_path = os.path.join(model_folder_path, 'metadata.json')

        if not os.path.exists(metadata_path):
            os.makedirs(model_folder_path)

        with open(metadata_path, 'w') as metadata_file:
            json.dump({
                'system': str(self.system),
                'model_id': str(self.model_id),
                'predictors': self.predictors,
                'targets': self.targets
            }, metadata_file)

        joblib.dump(self.model, os.path.join(model_folder_path, 'model.joblib'))

        if self.preprocess:
            joblib.dump(self.preprocess, os.path.join(model_folder_path, 'preprocess.joblib'))


class ModelCaret(Model):
    def __init__(self, model, predictors, targets, model_id=None, search_id=None):
        super().__init__(model, 'caret', predictors, targets, model_id, search_id)

    def describe(self):
        response = requests.post(
            R_SERVICE + 'caretDescribe.app',
            json={'model_id': self.model_id}).json()

        if not response['success']:
            raise ValueError(response['message'])

        return response['data']

    def score(self, specification):
        response = requests.post(
            R_SERVICE + 'caretScore.app',
            json={
                'model_id': self.model_id,
                'specification': specification
            }).json()

        if not response['success']:
            raise ValueError(response['message'])

        return response['data']

    def produce(self, specification):
        response = requests.post(
            R_SERVICE + 'caretProduce.app',
            json={
                'model_id': self.model_id,
                'specification': specification
            }).json()

        if not response['success']:
            raise ValueError(response['message'])

        return response['data']

    def save(self):
        # ignore, model is only present in remote caret.app
        raise ValueError('Caret model is not saveable in Python.')


class ModelH2O(Model):
    def __init__(self, model, predictors, targets, model_id=None, search_id=None):
        super().__init__(model, 'h2o', predictors, targets, model_id, search_id)

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

        # H2O supports only one target
        target = self.targets[0]

        scores = []
        for metric in specification['performanceMetrics']:
            try:
                scores.append({
                    'value': Model._score(metric, data[target], predicted),
                    'metric': metric,
                    'target': target
                })
            except NotImplementedError:
                pass

        return scores

    def produce(self, specification):
        predict_type = specification.get('configuration', {}).get('predict_type', 'RAW')

        resource_uri = Dataset(specification['input']).get_resource_uri()
        data = h2o.import_file(resource_uri)

        predictions = self.model.predict(data).as_data_frame()
        predictions.insert(0, 'd3mIndex', data.as_data_frame()['d3mIndex'])

        output_directory_path = specification['output']['resource_uri'].replace('file://', '')
        output_path = os.path.join(
            *output_directory_path.split('/'),
            str(uuid.uuid4()) + '.csv')

        if not os.path.exists(output_directory_path):
            os.makedirs(output_directory_path)

        cwd = os.getcwd()
        try:
            os.chdir('/')
            predictions.to_csv(output_path, index=False)
        finally:
            os.chdir(cwd)

        return {
            'data_pointer': output_path,
            'predict_type': predict_type,
            'search_id': self.search_id,
            'model_id': self.model_id
        }

    def save(self):
        model_folder_path = os.path.join(SAVED_MODELS_PATH, self.model_id)
        metadata_path = os.path.join(model_folder_path, 'metadata.json')

        if not os.path.exists(metadata_path):
            os.makedirs(model_folder_path)

        model_path = h2o.save_model(self.model, path=model_folder_path, force=True)
        with open(metadata_path, 'w') as metadata_file:
            json.dump({
                'system': self.system,
                'model_id': self.model_id,
                'model_filename': model_folder_path.replace(model_path, ''),
                'predictors': self.predictors,
                'targets': self.targets
            }, metadata_file)


class ModelLudwig(Model):
    def __init__(self, model, predictors, targets, model_id=None, search_id=None):
        super().__init__(model, 'ludwig', predictors, targets, model_id, search_id)

    def describe(self):
        return {
            "description": str(self.model),
            "model_id": self.model_id
        }

    def score(self, specification):

        dataset = Dataset(specification['input'])
        dataframe = dataset.get_dataframe()

        predicted = self.model.predict(dataframe).as_data_frame()

        # H2O supports only one target
        target = self.targets[0]

        scores = []
        for metric in specification['performanceMetrics']:
            scores.append({
                'value': Model._score(metric, dataframe[target], predicted),
                'metric': metric,
                'target': target
            })

        return scores

    def produce(self, specification):
        predict_type = specification.get('configuration', {}).get('predict_type', 'RAW')

        dataset = Dataset(specification['input'])
        dataframe = dataset.get_dataframe()

        predictions = self.model.predict(dataframe).as_data_frame()
        predictions.insert(0, 'd3mIndex', dataframe['d3mIndex'])

        output_directory_path = specification['output']['resource_uri'].replace('file://', '')
        output_path = os.path.join(
            *output_directory_path.split('/'),
            str(uuid.uuid4()) + '.csv')

        if not os.path.exists(output_directory_path):
            os.makedirs(output_directory_path)

        cwd = os.getcwd()
        try:
            os.chdir('/')
            predictions.to_csv(output_path, index=False)
        finally:
            os.chdir(cwd)

        return {
            'data_pointer': output_path,
            'predict_type': predict_type,
            'search_id': self.search_id,
            'model_id': self.model_id
        }

    def save(self):
        model_folder_path = os.path.join(SAVED_MODELS_PATH, self.model_id)
        metadata_path = os.path.join(model_folder_path, 'metadata.json')

        if not os.path.exists(metadata_path):
            os.makedirs(model_folder_path)

        model_path = self.model.save(path=model_folder_path)
        with open(metadata_path, 'w') as metadata_file:
            json.dump({
                'system': self.system,
                'model_id': self.model_id,
                'model_filename': model_folder_path.replace(model_path, ''),
                'predictors': self.predictors,
                'targets': self.targets
            }, metadata_file)
