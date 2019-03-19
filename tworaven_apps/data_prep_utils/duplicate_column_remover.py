""""Remove duplicate column names from a file

reference: https://stackoverflow.com/questions/44778/how-would-you-make-a-comma-separated-string-from-a-list-of-strings
"""
import logging

import csv
from io import StringIO
from os.path import isfile
from datetime import datetime as dt

from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.utils.json_helper import json_dumps, json_loads
from tworaven_apps.utils.dict_helper import column_uniquify
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)
LOGGER = logging.getLogger(__name__)


class DuplicateColumnRemover(BasicErrCheck):
    """remove duplicate columns"""

    def __init__(self, source_path):
        """Remove duplicate column names from a file"""
        self.source_path = source_path

        self.orig_column_names = None
        self.csv_dialect = None

        self.updated_columns = None
        self.num_cols_renamed = 0

        self.success_msg = None
        self.file_change_needed = False

        self.run_process()

    def run_process(self):
        """Run through steps"""
        if self.has_error():
            return

        if (not self.source_path) or (not isfile(self.source_path)):
            user_msg = f'File not found: {self.source_path}'
            self.add_err_msg(user_msg)
            return

        if not self.load_column_names():
            return

        if not self.format_column_names():
            return

        if self.column_change_needed is True:
            self.rewrite_file()

    def format_column_names(self):
        """Format the list of column names"""
        if self.has_error():
            return False

        if not self.orig_column_names:
            user_msg = 'Original column names not retrieved'
            self.add_err_msg(user_msg)
            return False

        # Check for unique columns
        #
        col_info = column_uniquify(self.orig_column_names)
        if not col_info.success:
            self.add_err_msg(col_info.err_msg)
            return False

        self.updated_columns = col_info.result_obj['new_columns']
        self.num_cols_renamed = col_info.result_obj['num_cols_renamed']

        if self.num_cols_renamed == 0:   # Nothing to change!
            self.success_msg = 'All set. Column names are already unique'
            return True

        # For Mongo: Remove dots and dollar signs from column names
        #  temp fix 3/19/2019
        #
        self.updated_columns = [x.replace('.', '_').replace('$', '-')
                                for x in self.updated_columns]

        self.file_change_needed = True

        return True


    def load_column_names(self):
        """Load column names by reading 1st line of file"""
        if self.has_error():
            return False

        self.orig_column_names = None
        self.csv_dialect = None

        # Read in the header row
        #
        with open(self.source_path, newline='') as fh:
            reader = csv.reader(fh)
            self.csv_dialect = reader.dialect
            #col_delimiter = reader.dialect.delimiter
            for row in reader:
                self.orig_column_names = row
                break

        if not self.orig_column_names:
            self.add_err_msg('Failed to load original column names')
            return False

        return True

    @staticmethod
    def rewrite_file_header(self):
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
