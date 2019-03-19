"""Convenience class for calling rook preprocess

Example usage:

from tworaven_apps.rook_services.preprocess_util import PreprocessUtil
src_file = '/ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv'

putil = PreprocessUtil(src_file)
if putil.has_error():
    print('error found: ', putil.get_error_message())
else:
    #
    # Preprocess data as python dict
    print('preprocess data (python dict)', putil.get_preprocess_data())

    # Preprocess data as JSON string
    #
    print('preprocess data (json string)', putil.get_preprocess_data_as_json())

    # Preprocess data as JSON string indented 4 spaces
    #
    print('preprocess data (json string)', putil.get_preprocess_data_as_json(4))

"""
import csv
from io import StringIO
from os.path import isfile
from datetime import datetime as dt
import requests

from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.rook_services.rook_app_info import RookAppInfo
from tworaven_apps.rook_services.app_names import \
    (PREPROCESS_ROOK_APP_NAME, SOLA_JSON_KEY)
from tworaven_apps.utils.json_helper import json_dumps, json_loads
from tworaven_apps.utils.dict_helper import column_uniquify
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)

class PreprocessUtil(BasicErrCheck):
    """Convenience class for rook preprocess"""
    def __init__(self, source_path, **kwargs):
        """Takes a path to a data file and runs preprocess

        - datastub is a unique directory that rookpreprocess uses to write
        """
        self.source_path = source_path
        self.datastub = kwargs.get('datastub', None)

        # Option to read 1st line of file and fix duplicate columns names
        #
        self.fix_duplicate_columns = kwargs.get('fix_duplicate_columns', True)

        self.rook_app_info = None
        self.preprocess_data = None

        self.set_rook_app_info()
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


    def set_rook_app_info(self):
        """Create a RookAppInfo object"""

        self.rook_app_info = RookAppInfo.get_appinfo_from_url(PREPROCESS_ROOK_APP_NAME)
        if self.rook_app_info is None:
            err_msg = ('unknown rook app: "{0}" (please add "{0}" to '
                       ' "tworaven_apps/rook_services/app_names.py")').format(\
                       PREPROCESS_ROOK_APP_NAME,)
            self.add_error_message(err_msg)

    def get_call_data(self):
        """Format data for rook call"""
        if self.has_error():
            return None

        info = dict(data=self.source_path,
                    datastub=self.datastub)

        json_str_info = json_dumps(info)
        if json_str_info.success:
            app_data = {SOLA_JSON_KEY: json_str_info.result_obj}
            return app_data

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
            col_info = PreprocessUtil.remove_duplicate_columns(self.source_path)
            if not col_info.success:
                user_msg = f'Error fixing duplicate columns. {col_info.err_msg}'
                self.add_error_message(user_msg)
                return
            print(f'remove_duplicate_columns (worked): {col_info.result_obj}')

        # Set datastub, if not set
        #
        if not self.datastub:
            time_now = dt.now().strftime('%Y-%m-%d_%H-%M-%S')
            self.datastub = 'config_%s' % time_now

        # Format call data
        #
        call_data = self.get_call_data()
        if not call_data:
            return

        rook_svc_url = self.rook_app_info.get_rook_server_url()

        # Call R services
        #
        try:
            rservice_req = requests.post(rook_svc_url,
                                         data=call_data)
        except ConnectionError:
            err_msg = 'R Server not responding: %s' % rook_svc_url
            self.add_err_msg(err_msg)
            return

        result_info = json_loads(rservice_req.text)
        if not result_info.success:
            user_msg = ('Failed to convert preprocess data '
                        ' to JSON: %s') % result_info.err_msg
            self.add_err_msg(user_msg)
            return

        self.preprocess_data = result_info.result_obj


    @staticmethod
    def remove_duplicate_columns(source_path):
        """Remove duplicate columns
        reference: https://stackoverflow.com/questions/44778/how-would-you-make-a-comma-separated-string-from-a-list-of-strings
        """
        if (not source_path) or (not isfile(source_path)):
            return err_resp(f'File not found: {source_path}')

        orig_column_names = None
        csv_dialect = None

        # Read in the header row
        #
        with open(source_path, newline='') as fh:
            reader = csv.reader(fh)
            csv_dialect = reader.dialect
            #col_delimiter = reader.dialect.delimiter
            #import ipdb; ipdb.set_trace()
            for row in reader:
                orig_column_names = row
                break

        # Check for unique columns
        #
        col_info = column_uniquify(orig_column_names)
        if not col_info.success:
            return err_resp(col_info.err_msg)

        updated_columns = col_info.result_obj['new_columns']
        num_cols_renamed = col_info.result_obj['num_cols_renamed']

        if num_cols_renamed == 0:   # Nothing to change!
            return ok_resp('All set. Column names are already unique')

        # For Mongo: Remove dots and dollar signs from column names
        #  temp fix 3/19/2019
        #
        updated_columns = [x.replace('.', '_').replace('$', '-')
                           for x in updated_columns]


        print('num_cols_renamed: ', num_cols_renamed)
        # ---------------------------------
        # Format a new first file line
        # ---------------------------------
        new_first_line = StringIO()
        writer = csv.writer(new_first_line, dialect=csv_dialect)
        writer.writerow(updated_columns)

        new_first_line_content = new_first_line.getvalue() # \
                                 # + csv_dialect.lineterminator

        print('new_first_line_content', new_first_line_content)

        # ---------------------------------
        # Replace original first line (ref: reddit)
        # ---------------------------------
        with open(source_path, 'r+') as fh: #open in read / write mode
            # Read the file
            #
            fh.readline() #read the first line and throw it out
            file_data = fh.read() #read the rest
            #
            # Do some writing, e.g. new header row
            #
            fh.seek(0) #set the cursor to the top of the file
            fh.write(new_first_line_content)    # write 1st line
            fh.write(file_data) #write the data back
            fh.truncate() #set the file size to the current size


        return ok_resp('All set. Columns updated')
        #column_uniquify

"""
from tworaven_apps.rook_services.preprocess_util import PreprocessUtil
src_file = '/ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv'


"""
