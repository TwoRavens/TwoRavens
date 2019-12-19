"""Wrapping @mshoemate's script into a quick class"""
import json
import hashlib
import os

import pandas as pd

from os.path import dirname, isdir, isfile, join
from collections import OrderedDict

from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.utils.file_util import \
    (create_directory,)

from tworaven_apps.utils.random_info import \
    (get_alpha_string,)

# mapping from: https://pbpython.com/pandas_dtypes.html
#   -> https://gitlab.datadrivendiscovery.org/MIT-LL/d3m_data_supply/blob/shared/schemas/datasetSchema.json
DTYPES = {
    'int64': 'integer',
    'float64': 'real',
    'bool': 'boolean',
    'object': 'string',
    'datetime64': 'dateTime',
    'category': 'categorical'
}

DSV_EXTENSIONS = ['.csv', '.tsv', '.xlsx', '.xls']

DATASET_SCHEMA_VERSION = '3.2.0'
PROBLEM_SCHEMA_VERSION = '3.2.0'

class DatasetDocMaker(BasicErrCheck):
    """Create a DatasetDoc and optional ProblemDoc"""

    def __init__(self, input_data_path, dataset_output_dir, **kwargs): # about, problem={}):

        self.problem = kwargs.get('problem', {})
        self.input_data_path = input_data_path
        self.dataset_output_dir = dataset_output_dir

        self.targets = self.problem.get('targets', [])

        self.about = kwargs.get(\
                        'about',
                        dict(datasetName=f'dataset_{get_alpha_string(6)}'))

        # To create
        #
        self.dataset_doc_path = None
        self.final_data_file_path = None
        self.make_doc()

    def make_doc(self):
        """Create the docs"""
        if self.has_error():
            return

        dataset_id = self.about['datasetName'].replace(' ', '_')

        """
        datasetPath = join(outputDir, datasetID)

        datasetDir = join(datasetPath, 'TRAIN', 'dataset_TRAIN')
        problemDir = join(datasetPath, 'TRAIN', 'problem_TRAIN')

        os.makedirs(datasetDir, exist_ok=True)
        os.makedirs(problemDir, exist_ok=True)
        """
        """

        # construct a mapping to output paths
        outDataPaths = {}
        for dataPath in self.dataPaths:
            offset = 1
            if os.path.splitext(dataPath)[1] in DSV_EXTENSIONS:
                # filename, extension = os.path.splitext(os.path.basename(dataPath))
                # TODO: disable this line once paths aren't hardcoded to 'learningData'
                filename = 'learningData'

                candidateName = join('tables', filename + '.csv')
                while candidateName in outDataPaths:
                    offset += 1
                    filename, extension = os.path.splitext(os.path.basename(dataPath))
                    candidateName = join('tables', filename + offset + '.csv')

                outDataPaths[candidateName] = dataPath
        """
        def infer_roles(column_name):
            """Infer column role"""
            roles = []
            if column_name == 'd3mIndex':
                roles.append('index')
            elif column_name in self.targets:
                roles.append('suggestedTarget')
            else:
                roles.append('attribute')

            if column_name in self.problem.get('time', []):
                roles.append('timeIndicator')
            return roles

        target_configs = []
        # individually load, index, analyze, and save each dataset
        resource_configs = []

        data = self.d3m_load_resource(self.input_data_path)
        if not isinstance(data, pd.DataFrame):
            user_msg = (f'Failed to load the file into a'
                        f' data frame: {self.input_data_path}')
            self.add_err_msg(user_msg)
            return

        resourceID = os.path.splitext(os.path.basename(self.input_data_path))[0]

        columnConfigs = []
        for colIndex, (colName, colType) in enumerate(zip(data.columns.values, data.dtypes)):
            columnConfig = {
                'colIndex': colIndex,
                'colName': colName,
                'colType': DTYPES.get(str(colType), None) or 'unknown',
                'role': infer_roles(colName)
            }
            columnConfigs.append(columnConfig)
            if columnConfig['role'][0] == 'suggestedTarget':
                target_configs.append({
                    'resID': resourceID,
                    'colIndex': colIndex,
                    'colName': colName
                })

        output_data_path = join('tables', 'learningData.csv')

        resource_configs.append({
            'resID': resourceID,
            'resPath': output_data_path,
            'resType': 'table',
            'resFormat': ['text/csv'],
            'isCollection': False,
            'columns': [
                {
                    'colIndex': i,
                    'colName': column[0],
                    'colType': DTYPES.get(str(column[1]), None) or 'unknown',
                    'role': infer_roles(column[0])
                } for i, column in enumerate(zip(data.columns.values, data.dtypes))
            ]
        })

        self.final_data_file_path = join(self.dataset_output_dir,
                                         output_data_path)

        dir_info = create_directory(dirname(self.final_data_file_path))
        if not dir_info.success:
            self.add_err_msg(dir_info.err_msg)
            return

        data.to_csv(self.final_data_file_path, index=False)

        # write dataset config
        self.dataset_doc_path = join(self.dataset_output_dir, 'datasetDoc.json')
        with open(self.dataset_doc_path, 'w') as dataset_doc:

            dataset_doc.write(json.dumps({
                'about': {**{
                    'datasetID': dataset_id,
                    'datasetSchemaVersion': DATASET_SCHEMA_VERSION,
                    'redacted': True,
                    'digest': hashlib.sha256(self.about['datasetName'].encode()).hexdigest()
                }, **self.about},
                'dataResources': resource_configs
            }, indent=4))

        # write problem
        """
        with open(join(problemDir, 'problemDoc.json'), 'w') as problemDoc:
            problemID = problem.get('problemName', dataset_id + '_problem_TRAIN')
            problemDoc.write(json.dumps({
                'about': {
                    'problemID': problemID,
                    'problemName': problem.get('problemName', about['datasetName'] + ' problem'),
                    'taskType': problem.get('taskType', 'regression'),
                    'taskSubType': problem.get('taskSubType', 'regression'),
                    'problemSchemaVersion': PROBLEM_SCHEMA_VERSION,
                    'problemVersion': '1.0'
                },
                'inputs': {
                    'data': [{
                        'datasetID': dataset_id,
                        'targets': [
                            {**{'targetIndex': targetIndex}, **target} for targetIndex, target in enumerate(target_configs)
                        ]
                    }],
                    'dataSplits': problem.get('dataSplits', {
                        "method": "holdOut",
                        "testSize": 0.35,
                        "stratified": False,
                        "numRepeats": 0,
                        "splitsFile": "dataSplits.csv"
                    }),
                    'performanceMetrics': [
                        {'metric': metric} for metric in problem.get('metrics', ['rootMeanSquaredError'])
                    ],
                    "expectedOutputs": {
                        "predictionsFile": "predictions.csv"
                    }
                }
            }, indent=4))
        """


    def d3m_load_resource(self, path):
        """Open data file and return a pandas data frame"""
        if path.endswith('.csv'):
            data = pd.read_csv(path, low_memory=False)
        elif path.endswith('.tsv'):
            data = pd.read_csv(path, delimiter='\t', low_memory=False)
        elif os.path.splitext(path)[1] in ['.xlsx', '.xls']:
            data = pd.read_excel(path)
        else:
            return None

        if 'd3mIndex' not in data:
            data.insert(0, 'd3mIndex', range(len(data)))
        return data
