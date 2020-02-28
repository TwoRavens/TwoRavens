"""Class for creating a User Defined Problem file and writing it
to an output file"""
import csv
import os
import types
from os.path import (dirname, isdir, isfile,
                     join, normpath, split, splitext)
from tworaven_apps.utils.json_helper import json_dumps
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)

from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.utils.file_util import create_directory

OUTPUT_PROBLEMS_DIR = '/ravens_volume/problems' # temp use while eval specs worked on
ERR_MSG_UNEXPECTED_DIRECTORY = 'Unexpected base directory'
ERR_MSG_NO_FILENAME = '"filename" is not specified (cannot be blank)'
ERR_MSG_NO_DATA = '"data" is not specified (cannot be blank)'


class BasicProblemWriter(BasicErrCheck):

    IS_CSV_DATA = 'IS_CSV_DATA' # use a csv write to write the data
    INCREMENT_FILENAME = 'INCREMENT_FILENAME' # add '', '_0002' to filename
    QUOTING = 'QUOTING'

    def __init__(self, user_workspace, filename, data, **kwargs):
        """
        filename - may also include a directory, but not fullpath
        file_data - data to write, may be list or generator
        write_directory - optional base directory if no directory in the config
        """
        self.user_workspace = user_workspace
        self.filename = filename
        self.file_data = data

        self.is_csv_data = kwargs.get(self.IS_CSV_DATA, False)
        self.increment_filename = kwargs.get(self.INCREMENT_FILENAME, False)
        self.quoting = kwargs.get(self.QUOTING, csv.QUOTE_MINIMAL)

        # alternate write directory, if not, uses dirs in the d3m config
        #
        self.write_directory = self.get_write_directory(kwargs.get('write_directory'))
        # print('--- GET WRITE DIRECTORY ---', self.write_directory)

        self.new_filepath = None

        if not self.has_error():
            self.write_file()


    def get_write_directory(self, kwargs_write_dir):
        """Determine the write directory"""
        if self.has_error():
            return
        # Was it sent as a kwarg?
        if kwargs_write_dir and isdir(kwargs_write_dir):
            return kwargs_write_dir

        # Use the d3m_config connected to the user workspace
        #
        if self.user_workspace:
            output_dir = self.user_workspace.d3m_config.root_output_directory
            output_dir = join(output_dir, 'problems')
        else:
            # Use the default/hard-coded directory
            #
            output_dir = OUTPUT_PROBLEMS_DIR

        dir_info = create_directory(output_dir)
        if dir_info.success:
            return dir_info.result_obj

        self.add_err_msg(dir_info.err_msg)
        return None





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


        # (1) Try a user-specified directory in kwargs
        #
        if self.write_directory:
            success_dirmake1, output_dir1 = self.make_directory(self.write_directory)
            if success_dirmake1:
                fullpath = join(output_dir1, self.filename)
                self.write_new_file(fullpath, output_dir1)
                return
            attempted_dirs = [output_dir1]

        # (2) Try the directory specified in the D3M config "user_problems_directory"
        #       e.g. /output/problems
        #
        d3m_config = self.user_workspace.d3m_config

        if d3m_config and d3m_config.user_problems_root:
            user_problems_root = d3m_config.user_problems_root
            success_dirmake2, output_dir2 = self.make_directory(user_problems_root)
            if success_dirmake2:
                fullpath = join(output_dir2, self.filename)
                self.write_new_file(fullpath, output_dir2)
                return
            attempted_dirs.append(output_dir2)


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
        elif not isinstance(self.file_data, str):
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

        # Expects data to be a python list or generator
        #
        if not isinstance(self.file_data, list) and not isinstance(self.file_data, types.GeneratorType):
            self.add_err_msg(('For "write_data_as_csv",'
                              ' expected "data" to be a python list or generator'))
            return False

        # Expects data to be non-empty
        #
        if isinstance(self.file_data, list) and not self.file_data:
            self.add_err_msg(('For "write_data_as_csv",'
                              ' expected "file_data" to be at least 1 row'))
            return False

        if isinstance(self.file_data, list) and not isinstance(self.file_data[0], dict):
            self.add_err_msg(('For "write_data_as_csv",'
                              ' expected "file_data" to contains rows of dict'))
            return False

        first_row = None
        data_source = None

        if isinstance(self.file_data, list):
            first_row = self.file_data[0]
            data_source = self.file_data

        if isinstance(self.file_data, types.GeneratorType):
            first_row = next(self.file_data)

            def file_data():
                yield first_row
                yield from self.file_data
            data_source = file_data()

        columns = list(first_row.keys())

        with open(fullpath, 'w', newline='') as output_file:
            dict_writer = csv.DictWriter(output_file,
                                         quoting=self.quoting,
                                         fieldnames=columns,
                                         #delimiter='\t',
                                         extrasaction='ignore')
            dict_writer.writeheader()
            # writerows would be better, but it is bugged- incomplete lines are written
            for record in data_source:
                dict_writer.writerow(record)

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
