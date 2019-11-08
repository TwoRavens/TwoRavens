import abc
import uuid
import json
import os
import numpy as np

import requests

import joblib
import h2o
import pandas
from scipy.sparse import csr_matrix

from model import SAVED_MODELS_PATH, R_SERVICE, get_metric
from util_dataset import Dataset
from collections import defaultdict

from sklearn import model_selection


class Model(object):
    def __init__(self, model, system, predictors, targets, model_id=None, search_id=None, train_specification=None):
        self.model = model
        self.system = system
        self.model_id = model_id or str(uuid.uuid4())
        self.search_id = search_id
        self.predictors = predictors
        self.targets = targets

        # which dataset model is currently trained on
        self.train_specification = train_specification

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

        if metadata['system'] in ['auto_sklearn', 'tpot', 'mlbox', 'mljar-supervised']:

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
                train_specification=metadata['train_specification'],
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
                search_id=metadata['search_id'],
                train_specification=metadata['train_specification'])

        raise ValueError(f'System type "{metadata["system"]}" is not recognized.')

    def make_splits(self, configuration, data):

        if configuration['method'] == 'K_FOLD':
            split_arguments = {
                'n_splits': configuration.get('folds'),
                'shuffle': configuration.get('shuffle'),
                'random_state': configuration.get('randomSeed')
            }
            if configuration['stratified']:
                return model_selection.StratifiedKFold(**split_arguments).split(data, data[self.targets[0]])
            else:
                return model_selection.KFold(**split_arguments).split(data)

        elif configuration['method'] == 'HOLDOUT':
            return [model_selection.train_test_split(
                data,
                test_size=float(configuration.get('trainTestRatio', 0.35)),
                stratify=self.targets[0] if configuration.get('stratified') else None,
                random_state=configuration.get('randomSeed'))]
        else:
            raise ValueError(f'Invalid evaluation method: {configuration.method}')


class ModelSklearn(Model):
    def __init__(self, model, system, predictors, targets, model_id=None, search_id=None, preprocess=None, train_specification=None):
        super().__init__(model, system, predictors, targets, model_id, search_id, train_specification)
        # categorical one hot encoding
        self.preprocess = preprocess

    def describe(self):
        model_name = self.model.__class__.__name__
        description = str(self.model)
        if self.system == 'mljar-supervised':
            model_name = self.model.get_name()

        if self.system == 'mlbox':
            model_name = self.model.get_estimator().__class__.__name__
            description = str(self.model.get_estimator())

        return {
            "model": model_name,
            "description": description,
            "model_id": self.model_id,
            "search_id": self.search_id,
            "system": self.system
        }

    def score(self, specification):
        dataframe = Dataset(specification['input']).get_dataframe()

        if self.system == 'mlbox':
            # must have a dense pandas array
            if issubclass(type(dataframe), csr_matrix):
                dataframe = dataframe.toarray()
            dataframe = pandas.DataFrame(dataframe)

        if self.system == 'mljar-supervised':
            # must have a pandas array with formatted column names (so they don't get modified by the solver)
            dataframe = pandas.DataFrame(dataframe)
            dataframe.columns = [str(i).strip() for i in dataframe.columns]

        configuration = specification['configuration']

        splits = self.make_splits(configuration, dataframe)
        split_scores = defaultdict(list)
        split_weights = defaultdict(list)
        for train_split, test_split in splits:
            self.fit(train_split)

            actual = np.array(test_split[self.targets[0]]).astype(float)
            predicted = self.model.predict(test_split[self.predictors])

            if self.system == 'mljar-supervised':
                predicted = pandas.DataFrame((predicted.idxmax(axis=1) == 'p_1').astype(int))
                predicted.columns = [self.targets[0]]

            for metric in specification['performanceMetrics']:
                split_scores[json.dumps(metric)].append(get_metric(metric)(actual, predicted))
                split_weights[json.dumps(metric)].append(test_split.size)

        scores = []
        for metric in split_scores:
            scores.append({
                'value': np.average(split_scores[metric], weights=split_weights[metric]),
                'metric': json.loads(metric),
                'target': self.targets[0]
            })

        return {
            'search_id': self.search_id,
            'model_id': self.model_id,
            'scores': scores,
            'system': self.system
        }

    def fit(self, data, specification=None):
        # check if model has already been trained for the same dataset
        specification_str = json.dumps(specification) if specification else None
        if self.train_specification and self.train_specification == specification_str:
            return
        self.train_specification = specification_str

        if self.system == 'auto_sklearn':
            self.model.refit(data[self.predictors], data[self.targets[0]])
        elif self.system == 'mljar-supervised':
            print(data)
            self.model.train({"train": {
                "X": data[self.predictors], 'y': data[self.targets[0]]
            }})
        else:
            self.model.fit(data[self.predictors], data[self.targets[0]])

    def produce(self, specification):
        configuration = specification.get('configuration', {})
        predict_type = configuration.get('predict_type', 'RAW')

        self.fit(Dataset(specification['train']).get_dataframe(), specification['train'])
        dataset = Dataset(specification['input'])
        dataframe = dataset.get_dataframe()

        stimulus = dataframe[self.predictors]

        if self.preprocess:
            stimulus = self.preprocess.transform(stimulus)

        if self.system == 'mlbox':
            if issubclass(type(stimulus), csr_matrix):
                stimulus = stimulus.toarray()
            stimulus = pandas.DataFrame(stimulus)

        if self.system == 'mljar-supervised':
            stimulus = pandas.DataFrame(stimulus)
            stimulus.columns = [str(i).strip() for i in stimulus.columns]

        output_directory_path = specification['output']['resource_uri'].replace('file://', '')
        output_path = '/' + os.path.join(
            *output_directory_path.split('/'),
            str(uuid.uuid4()) + '.csv')

        if self.system == 'mljar-supervised':
            predictions = self.model.predict(stimulus)
            if predict_type == 'RAW':
                predictions = pandas.DataFrame((predictions.idxmax(axis=1) == 'p_1').astype(int))
                predictions.columns = [self.targets[0]]

        else:
            if predict_type == 'RAW':
                predictions = self.model.predict(stimulus)
                if len(predictions.shape) > 1:
                    predictions = np.argmax(predictions, axis=-1)
                predictions = pandas.DataFrame(predictions, columns=[self.targets[0]])
            else:
                predictions = self.model.predict_proba(stimulus)
                # TODO: standardize probability column names
                predictions = pandas.DataFrame(predictions, columns=[f'p_{i}' for i in range(predictions.shape[1])])

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
            'produce': {
                'input': specification['input'],
                'configuration': configuration,
                'data_pointer': output_path
            },
            'search_id': self.search_id,
            'model_id': self.model_id,
            'system': self.system
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
                'targets': self.targets,
                'train_specification': self.train_specification
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
    def __init__(self, model, predictors, targets, model_id=None, search_id=None, train_specification=None, task=None):
        super().__init__(model, 'h2o', predictors, targets, model_id, search_id, train_specification)
        self.task = task

    def describe(self):
        return {
            "model": f'{self.model.algo}-{self.model.type}',
            "description": f'{self.model.algo}-{self.model.type}',
            "model_id": self.model_id,
            'search_id': self.search_id,
            "system": self.system,
        }

    def fit(self, data, specification=None):
        # check if model has already been trained for the same dataset
        specification_str = json.dumps(specification) if specification else None
        if self.train_specification and self.train_specification == specification_str:
            return
        self.train_specification = specification_str

        self.model.train(y=self.targets[0], x=self.predictors, training_frame=data)

    def score(self, specification):
        configuration = specification['configuration']
        resource_uri = Dataset(specification['input']).get_resource_uri()
        data = h2o.import_file(resource_uri)
        if 'CLASSIFICATION' in self.task:
            data[self.targets[0]] = data[self.targets[0]].asfactor()

        if configuration.get('stratified'):
            # how does h2o know which column to stratify for? weirdness here
            folds = data.stratified_kfold_column(n_folds=configuration['folds'])
        else:
            folds = data.kfold_column(n_folds=configuration['folds'])

        split_scores = defaultdict(list)
        split_weights = defaultdict(list)
        for split_id in range(configuration['folds']):
            train, test = data[folds != split_id], data[folds == split_id]
            self.fit(train)
            prediction = self.model.predict(test).as_data_frame()['predict']
            actual = test[self.targets[0]].as_data_frame()[self.targets[0]]

            for metric_schema in specification['performanceMetrics']:
                split_scores[json.dumps(metric_schema)].append(get_metric(metric_schema)(actual, prediction))
                split_weights[json.dumps(metric_schema)].append(prediction.size)

        scores = []

        for metric in split_scores:
            scores.append({
                'value': np.average(split_scores[metric], weights=split_weights[metric]),
                'metric': json.loads(metric),
                'target': self.targets[0]
            })

        return {
            'search_id': self.search_id,
            'model_id': self.model_id,
            'scores': scores,
            "system": self.system
        }

    def produce(self, specification):
        configuration = specification.get('configuration', {})
        predict_type = configuration.get('predict_type', 'RAW')

        train = h2o.import_file(Dataset(specification['train']).get_resource_uri())
        if 'CLASSIFICATION' in self.task:
            train[self.targets[0]] = train[self.targets[0]].asfactor()

        self.fit(train, specification['train'])

        test_dataset = Dataset(specification['input'])
        data = h2o.import_file(test_dataset.get_resource_uri())
        if 'CLASSIFICATION' in self.task:
            data[self.targets[0]] = data[self.targets[0]].asfactor()

        predictions = self.model.predict(data).as_data_frame()

        if predict_type == 'RAW':
            if 'CLASSIFICATION' in self.task:
                predictions = predictions[['predict']]
            predictions.columns = [self.targets[0]]
        else:
            # TODO: standardize probability column names
            predictions.drop('predict', 1, inplace=True)
        predictions['d3mIndex'] = test_dataset.get_dataframe()['d3mIndex']

        output_directory_path = specification['output']['resource_uri'].replace('file://', '')
        output_path = '/' + os.path.join(
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
            'produce': {
                'input': specification['input'],
                'configuration': configuration,
                'data_pointer': output_path
            },
            'search_id': self.search_id,
            'model_id': self.model_id,
            "system": self.system
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
                'targets': self.targets,
                'train_specification': self.train_specification
            }, metadata_file)


class ModelLudwig(Model):
    def __init__(self, model, predictors, targets, model_id=None, search_id=None, train_specification=None):
        super().__init__(model, 'ludwig', predictors, targets, model_id, search_id, train_specification)

    def describe(self):
        return {
            # TODO: extract more relevant description of model algorithm
            "model": 'multilayer feedforward network',
            "description": str(self.model),
            "model_id": self.model_id,
            "system": self.system
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
                'value': get_metric(metric)(dataframe[target], predicted),
                'metric': metric,
                'target': target
            })

        return scores

    def produce(self, specification):
        configuration = specification.get('configuration', {})
        predict_type = configuration.get('predict_type', 'RAW')

        dataset = Dataset(specification['input'])
        dataframe = dataset.get_dataframe()

        predictions = self.model.predict(dataframe).as_data_frame()
        predictions.insert(0, 'd3mIndex', dataframe['d3mIndex'])

        output_directory_path = specification['output']['resource_uri'].replace('file://', '')
        output_path = '/' + os.path.join(
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
            'produce': {
                'input': specification['input'],
                'configuration': configuration,
                'data_pointer': output_path
            },
            'search_id': self.search_id,
            'model_id': self.model_id,
            "system": self.system
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
