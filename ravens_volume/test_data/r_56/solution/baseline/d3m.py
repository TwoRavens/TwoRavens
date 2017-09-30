import csv
import gzip
import json
import os

from collections import OrderedDict, namedtuple

import pandas as pd
from pandas import DataFrame


def open_read_csv_gz(filename, encoding='utf-8'):

    if filename.endswith('.gz'):
        gz_filename = filename
        filename = gz_filename[:-3]
    else:
        gz_filename = filename + '.gz'

    if os.path.isfile(filename):
        return open(filename, 'r', encoding=encoding)
    elif os.path.isfile(gz_filename):
        return gzip.open(gz_filename, 'rt', encoding=encoding)
    else:
        raise FileNotFoundError('Unable to find file %s or %s' % (filename, gz_filename))


def cached(f):
    """ Decorator for caching results of the first call to a function given the arguments.

    :param f:
    :return:
    """

    cache = {}

    def check_cached(*args):

        nonlocal cache

        if args not in cache:
            cache[args] = f(*args)

        return cache[args]

    return check_cached


class D3M(object):

    def __init__(self, dir):
        self.dir = os.path.abspath(dir)
        self.problem_schema = D3MProblemSchema(os.path.join(self.dir, 'problemSchema.json'))
        self.data_schema = D3MDataSchema(os.path.join(self.dir, 'data', 'dataSchema.json'))

    @property
    @cached
    def train_data(self):
        """

        :return:
        :rtype: DataFrame
        """
        return self.read_csv_as_dataframe(os.path.join(self.dir, 'data', 'trainData.csv'), self.data_schema.train_data.data)

    @property
    @cached
    def train_targets(self):
        """

        :return:
        :rtype: DataFrame
        """
        return self.read_csv_as_dataframe(os.path.join(self.dir, 'data', 'trainTargets.csv'), self.data_schema.train_data.targets)

    @property
    @cached
    def test_data(self):
        """

        :return:
        :rtype: DataFrame
        """
        return self.read_csv_as_dataframe(os.path.join(self.dir, 'data', 'testData.csv'), self.data_schema.test_data.data)

    @property
    @cached
    def test_targets(self):
        """

        :return:
        :rtype: DataFrame
        """
        return self.read_csv_as_dataframe(os.path.join(self.dir, 'data', 'testTargets.csv'), self.data_schema.test_data.targets)

    def open_raw_data(self, filename, *args, **kwargs):
        return open(os.path.join(self.dir, 'data', 'raw_data', filename), *args, **kwargs)

    @staticmethod
    def read_csv_as_dataframe(csv_filename, variables_dict=None):
        """

        :param csv_filename:
        :param variables_dict:
        :type variables_dict: dict[str, D3MVariable]
        :return:
        """

        # get the column names
        with open_read_csv_gz(csv_filename, encoding='utf-8') as f:
            csv_reader = csv.reader(f)
            column_names = next(csv_reader)

        # identify index column, if any
        index_col = None
        if variables_dict is not None:
            for i, name in enumerate(column_names):
                if name == 'd3mIndex' and variables_dict[name].role == 'index':
                    index_col = i

        with open_read_csv_gz(csv_filename, encoding='utf-8') as f:
            df = pd.read_csv(f, header=0, index_col=index_col, dtype=str)
        return df


class D3MProblemSchema(object):

    def __init__(self, filename):

        with open(filename, 'r') as f:
            raw_schema = json.load(f)

        self.problem_id = raw_schema['problemId']
        self.redacted = raw_schema['redacted']
        self.description_file = raw_schema['descriptionFile'] if 'descriptionFile' in raw_schema else None
        self.citation_file = raw_schema['citationFile'] if 'citationFile' in raw_schema else None
        self.task_type = raw_schema['taskType']
        self.task_subtype = raw_schema['taskSubType'] if 'taskSubType' in raw_schema else None
        self.datasets = raw_schema['datasets']
        self.target = raw_schema['target']
        self.output_type = raw_schema['outputType']
        self.metric = raw_schema['metric']
        self.problem_schema_version = raw_schema['problemSchemaVersion']


class D3MDataSchema(object):

    DataTargets = namedtuple('DataTargets', ['num_samples', 'data', 'targets'])

    def __init__(self, filename):

        with open(filename, 'r') as f:
            self._raw_schema = json.load(f)

        self.dataset_id = self._raw_schema['datasetId']
        self.redacted = self._raw_schema['redacted']
        self.name = self._raw_schema['name'] if not self.redacted else None
        self.description_file = self._raw_schema['descriptionFile'] if 'descriptionFile' in self._raw_schema else None
        self.citation_file = self._raw_schema['citationFile'] if 'citationFile' in self._raw_schema else None
        self.human_subjects_research = self._raw_schema['humanSubjectsResearch'] if 'humanSubjectsResearch' in self._raw_schema else None
        self.original_license = self._raw_schema['originalLicense'] if 'originalLicense' in self._raw_schema else None
        self.version = self._raw_schema['version'] if 'version' in self._raw_schema else None
        self.version_notes = self._raw_schema['versionNotes'] if 'versionNotes' in self._raw_schema else None
        self.source = self._raw_schema['source'] if 'source' in self._raw_schema else None
        self.remote_uri = self._raw_schema['remoteURI'] if 'remoteURI' in self._raw_schema else None
        self.raw_data = self._raw_schema['rawData']
        self.raw_data_file_types = self._raw_schema['rawDataFileTypes'] if 'rawDataFileTypes' in self._raw_schema else None

        self._train_data_raw = self._raw_schema['trainData']
        self._train_data_num_samples = self._train_data_raw['numSamples']
        if 'trainData' in self._train_data_raw:
            self._train_data_data = self.variable_list_to_dict(self._train_data_raw['trainData'])
        else:
            self._train_data_data = None
        if 'trainTargets' in self._train_data_raw:
            self._train_data_targets = self.variable_list_to_dict(self._train_data_raw['trainTargets'])
        else:
            self._train_data_targets = None
        self.train_data = self.DataTargets(
            num_samples=self._train_data_num_samples,
            data=self._train_data_data,
            targets=self._train_data_targets
        )

        self.test_data_schema_mirrors_train_data_schema = self._raw_schema['testDataSchemaMirrorsTrainDataSchema']

        self._test_data_raw = self._raw_schema['testData']
        self._test_data_num_samples = self._test_data_raw['numSamples']
        if self.test_data_schema_mirrors_train_data_schema:
            self._test_data_data = self._train_data_data
            self._test_data_targets = self._train_data_targets
        else:
            if 'testData' in self._test_data_raw:
                self._test_data_data = self.variable_list_to_dict(self._test_data_raw['testData'])
            else:
                self._test_data_data = None
            if 'testTargets' in self._test_data_raw:
                self._test_data_targets = self.variable_list_to_dict(self._test_data_raw['testTargets'])
            else:
                self._test_data_targets = None
        self.test_data = self.DataTargets(
            num_samples=self._test_data_num_samples,
            data=self._test_data_data,
            targets=self._test_data_targets
        )

        self.data_schema_version = self._raw_schema['dataSchemaVersion']

    def __repr__(self):
        return 'D3MDataSchema(%s)' % json.dumps(self._raw_schema, indent=2, sort_keys=True)

    @staticmethod
    def variable_list_to_dict(vars):
        """

        :param vars:
        :return:
        :rtype: dict[str, D3MVariable]
        """
        d = OrderedDict()
        for raw_var in vars:
            v = D3MVariable(raw_var)
            d[v.name] = v
        return d


class D3MVariable(object):

    def __init__(self, raw_var):

        self.name = raw_var['varName'] if 'varName' in raw_var else None
        self.description = raw_var['varDescription'] if 'varDescription' in raw_var else None
        self.type = raw_var['varType'] if 'varType' in raw_var else None
        self.file_type = raw_var['varFileType'] if 'varFileType' in raw_var else None
        self.file_format = raw_var['varFileFormat'] if 'varFileFormat' in raw_var else None
        self.role = raw_var['varRole'] if 'varRole' in raw_var else None
