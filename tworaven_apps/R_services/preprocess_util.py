"""Convenience class for calling rook preprocess

Example usage:

from tworaven_apps.R_services.preprocess_util import PreprocessUtil
src_file = '/ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv'

putil = PreprocessUtil(src_file)
if putil.has_error():
    print('error found: ', putil.get_error_message())
else:
    # Preprocess data as a python dict
    #
    print('preprocess data (python dict)', putil.get_preprocess_data())

    # Preprocess data as a JSON string
    #
    print('preprocess data (json string)', putil.get_preprocess_data_as_json())

    # Preprocess data as a JSON string indented 4 spaces
    #
    print('preprocess data (json string)', putil.get_preprocess_data_as_json(4))

---
10/2019 - Updated to use:
    - rook preprocess OR
    - tworavens-preprocess via pypi: https://pypi.org/project/tworavens-preprocess/

"""
from os.path import isfile
import requests

# source: https://pypi.org/project/tworavens-preprocess/
from raven_preprocess.preprocess_runner import PreprocessRunner

from tworaven_apps.data_prep_utils.duplicate_column_remover import DuplicateColumnRemover
from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.utils.json_helper import json_dumps, json_loads



class PreprocessUtil(BasicErrCheck):
    """Convenience class for rook preprocess"""
    def __init__(self, source_path, **kwargs):
        """Takes a path to a data file and runs preprocess

        - datastub - a unique directory that rookpreprocess uses to write
        - use_python_preprocess - boolean, default False.
                - use python package for preprocessing.
        """
        self.source_path = source_path

        # R preprocess specific value
        self.datastub = kwargs.get('datastub', None)

        # Flag - should python preprocess be used
        self.use_python_preprocess = kwargs.get('use_python_preprocess', True)

        # Option to read 1st line of file and fix duplicate columns names
        #
        self.fix_duplicate_columns = kwargs.get('fix_duplicate_columns', True)

        self.rook_app_info = None
        self.preprocess_data = None

        self.column_names = None

        self.run_preprocess()


    def get_preprocess_data_as_json(self, indent=None):
        """Return the preprocess data as a JSON string"""
        assert not self.has_error(),\
            'Make sure "has_error()" is False before calling this method'

        json_str_info = json_dumps(self.preprocess_data,
                                   indent=indent)
        if json_str_info.success:
            return json_str_info.result_obj

        # SHOULDN'T HAPPEN!
        return json_str_info.err_msg

    def get_preprocess_data(self):
        """Return the preprocess data as a python dict"""

        assert not self.has_error(),\
            'Make sure "has_error()" is False before calling this method'
        return self.preprocess_data

    def get_call_data(self):
        """Format data for rook call"""
        if self.has_error():
            return None

        info = dict(data=self.source_path,
                    datastub=self.datastub)

        if self.column_names:
            info['columns'] = self.column_names

        json_str_info = json_dumps(info)
        if json_str_info.success:
            return info

        # Failed JSON string conversion
        #
        self.add_error_message(json_str_info.err_msg)
        return None


    def run_preprocess(self):
        """Run preprocess steps"""
        if self.has_error():
            return

        # Make sure file exists
        #
        if not (self.source_path and isfile(self.source_path)):
            self.add_error_message('File not found: %s' % self.source_path)
            return

        # Fix duplicate columns
        #
        if self.fix_duplicate_columns:
            dcr = DuplicateColumnRemover(self.source_path)
            self.column_names = dcr.updated_columns

            self.column_names = [requests.utils.quote(column) for column in self.column_names]

            if dcr.has_error():
                user_msg = (f'Augment error during column checks: '
                            f'{dcr.get_error_message()}')
                self.add_error_message(user_msg)
                return

        # https://pypi.org/project/tworavens-preprocess/
        #
        run_info = PreprocessRunner.load_from_file(self.source_path)

        if not run_info.success:
            self.add_err_msg(run_info.err_msg)

        runner = run_info.result_obj

        # retrieve the data as a python OrderedDict
        #
        self.preprocess_data = runner.get_final_dict()


"""
from tworaven_apps.R_services.preprocess_util import PreprocessUtil
src_file = '/ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv'


"""
