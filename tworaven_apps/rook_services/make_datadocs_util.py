"""Convenience class for making zombie docs

Example usage:

parms_sort_of = {
    "datafile": "/ravens_volume/test_output/185_baseball/additional_inputs/185_bl_problem_TRAIN-20190131_080340-wuskjx/TRAIN/dataset_TRAIN/tables/learningData.csv",
    "datasetid": "185_bl_problem_TRAIN-20190131_080340-wuskjx",
    "name": "NULL (augmented)",
    "description": "(augmented data)",
    "taskType": "classification",
    "taskSubType": "multiClass",
    "depvarname": [
        {
            "targetIndex": 0,
            "resID": "0",
            "colIndex": 18,
            "colName": "Hall_of_Fame"
        }
    ]
}


from tworaven_apps.rook_services.preprocess_util import MakeDatadocsUtil
mdutil = MakeDatadocsUtil(rook_params)
if mdutil.has_error():
    print('error found: ', mdutil.get_error_message())
else:
    #
    # Preprocess data as python dict
    print('doc data (python dict)', mdutil.get_data())

    # Preprocess data as JSON string
    #
    print('doc data (json string)', mdutil.get_data_as_json())

    # Preprocess data as JSON string indented 4 spaces
    #
    print('doc data (json string)', putil.get_data_as_json(4))

"""
from datetime import datetime as dt
from tworaven_apps.utils.basic_response import (ok_resp, err_resp)
from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.utils.json_helper import json_dumps, json_loads
from tworaven_apps.utils.mongo_util import infer_type

import logging

import csv

LOGGER = logging.getLogger(__name__)


class MakeDatadocsUtil(BasicErrCheck):
    """Convenience class for rook preprocess"""
    def __init__(self, params, datastub=None):
        """Takes a path to a data file and runs preprocess

        - datastub is a unique directory that rookpreprocess uses to write
        """
        self.params = params
        self.datastub = datastub
        self.rook_app_info = None
        self.mkdoc_data = None
        self.run_mkdoc_process()

    def get_problem_doc_string(self):
        """Return the problem doc as a string"""
        return self.get_mkdoc_data_as_json(indent=4, **dict(problemDoc=True))

    def get_dataset_doc_string(self):
        """Return the problem doc as a string"""
        return self.get_mkdoc_data_as_json(indent=4, **dict(datasetDoc=True))

    def get_mkdoc_data_as_json(self, indent=None, **kwargs):
        """Return the preprocess data as a JSON string"""
        assert not self.has_error(), \
            'Make sure "has_error()" is False before calling this method'

        print('type(self.mkdoc_data) (get_mkdoc_data_as_json)', type(self.mkdoc_data))

        if kwargs.get('problemDoc', None) is True:

            if not 'problemDoc' in self.mkdoc_data:
                return err_resp('Error: "problemDoc" not found in rook data')
            core_data = self.mkdoc_data['problemDoc']

        elif kwargs.get('datasetDoc', None) is True:

            if not 'datasetDoc' in self.mkdoc_data:
                return err_resp('Error: "datasetDoc" not found in rook data')
            core_data = self.mkdoc_data['datasetDoc']
        else:
            core_data = self.mkdoc_data

        json_str_info = json_dumps(core_data,
                                   indent=indent)
        if json_str_info.success:
            return ok_resp(json_str_info.result_obj)

        # only happens if not serializable
        return err_resp(json_str_info.err_msg)

    def run_mkdoc_process(self):
        """Run preprocess steps"""
        if self.has_error():
            return

        # Set datastub, if not set
        #
        if not self.datastub:
            time_now = dt.now().strftime('%Y-%m-%d_%H-%M-%S')
            self.datastub = 'config_%s' % time_now

        # Format call data
        #
        call_data = self.params
        if not call_data:
            return

        with open(call_data['datafile'], 'r') as datafile:
            reader = csv.reader(datafile)
            columns = next(reader)
            types = {column: set() for column in columns}

            for line in reader:
                for col, entry in zip(columns, line):
                    entry = infer_type(entry)
                    if entry is not None:
                        types[col].add(type(entry))

        columns_old = {col['colName']: col for col in call_data['datasetDoc']['dataResources'][0]['columns']}

        # convert types inferred from dataset to D3M type labels
        def d3m_type(value):
            d3m_types = {
                str: "string",
                float: "real",
                int: "integer",
                bool: "boolean",
                dt: "dateTime"
            }

            # use the most generic type present in the sample
            for d3m_type in d3m_types:
                if d3m_type in value:
                    return d3m_types[d3m_type]

            # fall back to string
            return "string"

        def make_column(idx, name):
            if name in columns_old:
                return {**columns_old[name], **{'colIndex': idx}}
            # all new columns are attributes
            return {
                "colIndex": idx,
                "colName": name,
                "colType": d3m_type(types[name]),
                "role": ['attribute']
            }

        datasetDoc_columns = [make_column(i, column) for i, column in enumerate(columns)]

        self.mkdoc_data = {
            'problemDoc': {
                'about': call_data['problemDoc']['about'],
                'inputs': {'data': {
                    'datasetID': call_data['datasetid'],
                    'targets': [{
                        'targetIndex': targetIdx,
                        'resID': 'learningData',
                        'colIndex': col['colIndex'],
                        'colName': col['colName']
                    } for targetIdx, col in enumerate([
                        col for col in datasetDoc_columns if 'suggestedTarget' in col['role']
                    ])]
                }},
                **{
                    call_data['problemDoc'][key] for key in ['expectedOutputs', 'dataAugmentation']
                    if key in call_data['problemDoc']
                }
            },
            'datasetDoc': {
                'about': {
                    **call_data['datasetDoc']['about'],
                    **{"datasetID": call_data['datasetid']}
                },
                'dataResources': [{
                    "resID": "learningData",
                    "resPath": "tables/learningData.csv",
                    "resType": "table",
                    "resFormat": [
                        "text/csv"
                    ],
                    "isCollection": False,
                    "columns": datasetDoc_columns
                }]
            }
        }
