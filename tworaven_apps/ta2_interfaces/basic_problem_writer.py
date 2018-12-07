"""Class for creating a User Defined Problem file and writing it
to an output file"""
import csv
import json
from datetime import datetime as dt
import os
from os.path import (basename, dirname, isdir, isfile,
                     join, normpath, split, splitext)
from collections import OrderedDict
from tworaven_apps.utils.json_helper import json_dumps
from tworaven_apps.utils.mongo_util import infer_type, quote_val
from tworaven_apps.utils.view_helper import \
    (get_request_body_as_json,
     get_json_error,
     get_json_success)
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp,
                                                err_resp_with_data)

from django.template.loader import render_to_string

from tworaven_apps.utils import random_info
from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.configurations.models_d3m import KEY_PROBLEM_SCHEMA
from tworaven_apps.configurations.utils import \
    (get_latest_d3m_config,
     get_d3m_filepath)


OUTPUT_PROBLEMS_DIR = '/output/problems' # temp use while eval specs worked on
ERR_MSG_UNEXPECTED_DIRECTORY = 'Unexpected base directory'
ERR_MSG_NO_FILENAME = '"filename" is not specified (cannot be blank)'
ERR_MSG_NO_DATA = '"data" is not specified (cannot be blank)'


class BasicProblemWriter(BasicErrCheck):

    IS_CSV_DATA = 'IS_CSV_DATA' # use a csv write to write the data
    INCREMENT_FILENAME = 'INCREMENT_FILENAME' # add '', '_0002' to filename

    def __init__(self, filename, data, **kwargs):
        """
        filename - may also include a directory, but not fullpath
        file_data - data to write
        write_directory - optional base directory if no directory in the config
        """
        self.filename = filename
        self.file_data = data

        self.is_csv_data = kwargs.get(self.IS_CSV_DATA, False)
        self.increment_filename = kwargs.get(self.INCREMENT_FILENAME, False)

        # alternate write directory, if not, uses dirs in the d3m config
        #
        self.write_directory = kwargs.get('write_directory', OUTPUT_PROBLEMS_DIR)

        self.new_filepath = None

        self.write_file()

    def check_filename(self):
        """check the filename"""
        if not self.filename:
            self.add_error_message(ERR_MSG_NO_FILENAME)
            return

        # take out any '..', etc
        #
        self.filename = normpath(self.filename)


    def write_file(self):
        """Initial cut--just write the data to a file"""
        self.check_filename()
        if self.has_error():
            return

        if not self.file_data:
            self.add_error_message(ERR_MSG_NO_DATA)
            return

        attempted_dirs = []

        # (1) Try the "/output/problems" directory
        #
        if self.write_directory:
            success_dirmake1, output_dir1 = self.make_directory(self.write_directory)
            if success_dirmake1:
                fullpath = join(output_dir1, self.filename)
                self.write_new_file(fullpath, output_dir1)
                return
            attempted_dirs = [output_dir1]

        # (2) Try the "user_problems_root" directory
        #
        d3m_config = get_latest_d3m_config()
        if d3m_config and d3m_config.user_problems_root:
            user_problems_root = d3m_config.user_problems_root
            success_dirmake2, output_dir2 = self.make_directory(user_problems_root)
            if success_dirmake2:
                fullpath = join(output_dir2, self.filename)
                self.write_new_file(fullpath, output_dir2)
                return
            attempted_dirs.append(output_dir2)


        # (3) Try the "temp_storage_root" directory
        #
        d3m_config = get_latest_d3m_config()
        if d3m_config and d3m_config.temp_storage_root:
            temp_storage_root = join(d3m_config.temp_storage_root, 'problems')
            success, output_dir3 = self.make_directory(temp_storage_root)
            if success:
                fullpath = join(output_dir3, self.filename)
                self.write_new_file(fullpath, output_dir3)
                return
            attempted_dirs.append(output_dir3)

        self.add_error_message(('Failed to save file!'
                                ' Tried these directories:') %
                               (attempted_dirs))


    def add_increment_to_filename(self, fullpath):
        """Add "_0001", "_0002", etc to filename"""
        if not isinstance(fullpath, str):
            return err_resp("add_increment_to_filename: Fullpath must be a string")

        path, filename = split(fullpath)
        if not filename:
            return err_resp(('add_increment_to_filename: The fullpath'
                             ' must be valid--not an empty string!'))

        # Determine starting file name and number

        # examples: ('data', 'csv'); ('data_0001', 'csv')
        #
        filename, ext = splitext(fullpath)

        # examples: ('data', ''); ('data', '0001')
        #
        start_fname, numeric_suffix = filename.rsplit('_', 1)

        if numeric_suffix and numeric_suffix.isdigit():
            start_num = int(numeric_suffix) + 1
        else:
            start_num = 1

        # The dangerous near-perma loop! Cuts after 1,000,000 attempts
        #
        while True:
            # filename with numeric ending: e.g. data_0001.csv
            #
            num_part = str(start_num).zfill(6)
            new_filename = '%s_%s%s' % (start_fname, num_part, ext)

            new_fullpath = join(path, new_filename)

            # Does the file already exist?
            #
            if not isfile(new_fullpath):
                return ok_resp(new_fullpath)

            # Yes, it exists, try the next number...
            start_num += 1
            if start_num > 999999:
                user_msg = ('File names exhausted at 999,999'
                            ' attempts: %s') % (new_fullpath,)
                return err_resp(user_msg)

    def write_new_file(self, fullpath, expected_base_dir, overwrite_ok=True):
        """Write a file"""
        if self.has_error():
            return

        fullpath = normpath(fullpath)

        if not fullpath.startswith(expected_base_dir):
            user_msg = ('%s\n Expected base directory: "%s"'
                        '\n But not found in: "%s"') % \
                        (ERR_MSG_UNEXPECTED_DIRECTORY, expected_base_dir, fullpath)
            self.add_error_message(user_msg)
            return False

        # make new directory for the problem, if needed
        #
        file_dirname = dirname(fullpath)
        if not file_dirname:
            user_msg = ('Did not find a base directory.'
                        '\n full path: "%s"') % \
                        (fullpath,)
            self.add_error_message(user_msg)
            return False

        success, _updated_dir = self.make_directory(file_dirname)
        if not success:
            user_msg = ('Failed to create directory: %s') % \
                       (file_dirname,)
            self.add_error_message(user_msg)
            return False


        if not fullpath:
            self.add_error_message('"fullpath" is not specified (cannot be blank)')
            return False

        if not self.file_data:
            self.add_error_message('"file_data" is not specified (cannot be blank)')
            return False

        # Does this file exist?
        #
        if isfile(fullpath):
            #
            # Yes, can the file be overwritten?
            #
            if not overwrite_ok:
                self.add_error_message('File already exists: %s' % fullpath)
                return False

            #
            # Should "__0001.ext", "_0002.ext" be added
            #   to the filename?
            #
            if self.increment_filename:
                increment_info = self.add_increment_to_filename(fullpath)
                if not increment_info.success:
                    self.add_error_message(increment_info.err_msg)
                    return False
                fullpath = increment_info.result_obj

        # -------------------------------------
        # Data should be written using a csvwriter
        # -------------------------------------
        if self.is_csv_data:
            return self.write_data_as_csv(fullpath)

        # -------------------------------------
        # The file data is not a string, try:
        #  - converting it to JSON,
        #  - on failure, convert it to a string.
        # -------------------------------------
        if not isinstance(self.file_data, str):
            json_info = json_dumps(self.file_data)
            if json_info.success:
                self.file_data = json_info.result_obj
            else:
                self.file_data = str(self.file_data)

        try:
            with open(fullpath, 'w') as the_file:
                the_file.write(self.file_data)
        except OSError as err_obj:
            user_msg = ('Failed to write file to: %s'
                        '\nError: %s') % (fullpath, err_obj)
            self.add_error_message(user_msg)
            return False

        # it worked!
        self.new_filepath = fullpath
        return True

    def write_data_as_csv(self, fullpath):
        """Write list of dicts as csv, this is not called directly but by using
        the kwarg "is_data_csv" in the constructor"""
        if self.has_error():
            return False

        # Only do this with the "is_csv_data" flag
        #
        if not self.is_csv_data:
            self.add_err_msg('Only used if "is_csv_data" is True')
            return False

        # Expects data to be a python list
        #
        if not isinstance(self.file_data, list):
            self.add_err_msg(('For "write_data_as_csv",'
                              ' expected "data" to be a python list'))
            return False

        # Expects data to be a non-empty list
        #
        if not self.file_data:
            self.add_err_msg(('For "write_data_as_csv",'
                              ' expected "file_data" to be at least 1 row'))
            return False


        if not isinstance(self.file_data[0], dict):
            self.add_err_msg(('For "write_data_as_csv",'
                              ' expected "file_data" to contains rows of dict'))
            return False

        columns = [k for k, v in self.file_data[0].items()]

        # Write to a .csv file, using tab delimiter
        #
        with open(fullpath, 'w', newline='') as output_file:
            dict_writer = csv.DictWriter(output_file,
                                         fieldnames=columns,
                                         #delimiter='\t',
                                         extrasaction='ignore')
            dict_writer.writeheader()
            dict_writer.writerows(self.file_data)

        self.new_filepath = fullpath


    def make_directory(self, new_dirname):
        if not new_dirname:
            self.add_error_message('"new_dirname" is not specified (cannot be blank)')
            return False

        new_dirname = normpath(new_dirname)

        try:
            os.makedirs(new_dirname, exist_ok=True)
        except OSError as err_obj:
            user_msg = 'Could not create the directory: %s' % \
                       new_dirname
            return err_resp(user_msg)

        return ok_resp(new_dirname)



#name = '%s_%s_%s.txt' % (\
#                file_prefix,
#                random_info.get_alphanumeric_string(4),
#                dt.now().strftime('%Y-%m-%d_%H-%M-%S'))

#filepath = join(d3m_config.user_problems_root, fname)
#if not isfile(filepath): # great!  doesn't exist
#break
