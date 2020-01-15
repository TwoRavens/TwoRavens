"""Wrapping @mshoemate's script into a quick class"""
import json
import hashlib
import os

import pandas as pd

from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)
from os.path import basename, dirname, isdir, isfile, join, splitext
from collections import OrderedDict


from tworaven_apps.data_prep_utils import static_vals as dp_static

from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.utils.file_util import \
    (create_directory,)

from tworaven_apps.utils.random_info import \
    (get_alpha_string,)

# mapping from: https://pbpython.com/pandas_dtypes.html
#   -> https://gitlab.datadrivendiscovery.org/MIT-LL/d3m_data_supply/blob/shared/schemas/datasetSchema.json



class DatasetDocMaker(BasicErrCheck):
    """Create a DatasetDoc and optional ProblemDoc"""

    def __init__(self, input_data_paths, dataset_output_dir, **kwargs): # about, problem={}):

        self.problem = kwargs.get('problem', {})
        self.input_data_paths = input_data_paths
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

        # construct a mapping to output paths
        inout_data_paths = OrderedDict()

        print('-- Iterate through input files --')
        for src_data_path in self.input_data_paths:
            offset = 1
            print('src_data_path', src_data_path)

            file_ext = splitext(src_data_path)[1].lower()
            if not file_ext in dp_static.VALID_EXTENSIONS:
                print('  -> Invalid extension, skipping: ', file_ext)
                continue

            # Set the output file name: learningData.csv, learningData_01.csv, etc.
            filename = 'learningData'
            candidate_name = join('tables', filename + '.csv')
            while candidate_name in inout_data_paths.values():
                offset += 1
                offset_str = f'_{str(offset).zfill(2)}'
                #_name, extension = os.path.splitext(os.path.basename(src_data_path))
                candidate_name = join('tables', f'{filename}{offset_str}.csv')

            inout_data_paths[src_data_path] = candidate_name
            print(' -> post-conversion name:', candidate_name)

        print('inout_data_paths', inout_data_paths)

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

        # Iterate through input files / proposed output files
        #   - Open the input file and write it as a .csv
        #   - From each input file, gather information for the dataset doc
        #
        for input_path, output_data_path in inout_data_paths.items():
            #print('Doc Maker 3: Attempt to read:', input_path)
            data_info = self.d3m_load_resource(input_path)
            if not data_info.success:
                self.add_err_msg(data_info.err_msg)
                return
            data = data_info.result_obj

            if not isinstance(data, pd.DataFrame):
                user_msg = (f'Failed to load the file into a'
                            f' data frame: {input_path}')
                self.add_err_msg(user_msg)
                return

            resourceID = splitext(basename(input_path))[0]

            columnConfigs = []
            for colIndex, (colName, colType) in enumerate(zip(data.columns.values, data.dtypes)):
                columnConfig = {
                    'colIndex': colIndex,
                    'colName': colName,
                    'colType': dp_static.DTYPES.get(str(colType), None) or 'unknown',
                    'role': infer_roles(colName)
                }
                columnConfigs.append(columnConfig)
                if columnConfig['role'][0] == 'suggestedTarget':
                    target_configs.append({
                        'resID': resourceID,
                        'colIndex': colIndex,
                        'colName': colName
                    })

            # output_data_path = join('tables', 'learningData.csv')

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
                        'colType': dp_static.DTYPES.get(str(column[1]), None) or 'unknown',
                        'role': infer_roles(column[0])
                    } for i, column in enumerate(zip(data.columns.values, data.dtypes))
                ]
            })

            final_data_file_path = join(self.dataset_output_dir,
                                        output_data_path)

            dir_info = create_directory(dirname(final_data_file_path))

            if not dir_info.success:
                self.add_err_msg(dir_info.err_msg)
                return

            data.to_csv(final_data_file_path, index=False)

        # write dataset config
        self.dataset_doc_path = join(self.dataset_output_dir, 'datasetDoc.json')
        with open(self.dataset_doc_path, 'w') as dataset_doc:

            dataset_doc.write(json.dumps({
                'about': {**{
                    'datasetID': dataset_id,
                    'datasetSchemaVersion': dp_static.DATASET_SCHEMA_VERSION,
                    'redacted': True,
                    'digest': hashlib.sha256(self.about['datasetName'].encode()).hexdigest()
                }, **self.about},
                'dataResources': resource_configs
            }, indent=4))

    

    def d3m_load_resource(self, path):
        """Open data file and return a pandas data frame"""
        print('-- d3m_load_resource --', path)
        path_ext = splitext(path.lower())[1]

        try:
            if path_ext == dp_static.EXT_CSV:
                print('csv file')
                # csv file
                #
                data = pd.read_csv(path, low_memory=False)

            elif path_ext in [dp_static.EXT_TSV, dp_static.EXT_TAB]:
                print('Tab-delimited')
                # Tab-delimited
                #
                data = pd.read_csv(path, delimiter='\t', low_memory=False)

            elif path_ext in [dp_static.EXT_XLS, dp_static.EXT_XLSX]:
                print('Excel file')
                # Excel file
                #
                data = pd.read_excel(path)
            else:
                return err_resp('File extension not valid: %s' % path_ext)
        except FileNotFoundError as err_obj:
            return err_resp('File not found: %s' % err_obj)
        except pd.errors.ParserError as err_obj:
            return err_resp('Failed to open file: %s' % err_obj)

        if 'd3mIndex' not in data:
            data.insert(0, 'd3mIndex', range(len(data)))

        return ok_resp(data)
