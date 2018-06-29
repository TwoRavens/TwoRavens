"""Class for creating a User Defined Problem file and writing it
to an output file"""

import json
from datetime import datetime as dt
import os
from os.path import dirname, isdir, isfile, join
from collections import OrderedDict
from tworaven_apps.utils.view_helper import \
    (get_request_body_as_json,
     get_json_error,
     get_json_success)
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp,
                                                err_resp_with_data)

from django.template.loader import render_to_string

from tworaven_apps.utils import random_info
from tworaven_apps.configurations.models_d3m import KEY_PROBLEM_SCHEMA
from tworaven_apps.configurations.utils import \
    (get_latest_d3m_config,
     get_d3m_filepath)


OUTPUT_PROBLEMS_DIR = '/output/problems' # temp use while eval specs worked on


class BasicProblemWriter(object):

    def __init__(self, filename, data):
        self.filename = filename
        self.file_data = data

        self.has_error = False
        self.error_message = None

        self.new_filepath = None

        self.write_file()


    def add_error_message(self, user_msg):
        """add error"""
        self.has_error = True
        self.error_message = user_msg

    def write_file(self):
        """Initial cut--just write the data to a file"""
        if not self.filename:
            self.add_error_message('"filename" is not specified (cannot be blank)')
            return

        if not self.file_data:
            self.add_error_message('"data" is not specified (cannot be blank)')
            return

        attempted_dirs = [OUTPUT_PROBLEMS_DIR]

        # (1) Try the "/output/problems" directory
        #
        success_dirmake1 = self.make_directory(OUTPUT_PROBLEMS_DIR)
        if success_dirmake1:
            fullpath = join(OUTPUT_PROBLEMS_DIR, self.filename)
            self.write_new_file(fullpath)
            return

        # (2) Try the "user_problems_root" directory
        #
        d3m_config = get_latest_d3m_config()
        if d3m_config and d3m_config.user_problems_root:
            user_problems_root = d3m_config.user_problems_root
            success_dirmake2 = self.make_directory(user_problems_root)
            if success_dirmake2:
                fullpath = join(user_problems_root, self.filename)
                self.write_new_file(fullpath)
                return
            attempted_dirs.append(user_problems_root)


        # (3) Try the "temp_storage_root" directory
        #
        d3m_config = get_latest_d3m_config()
        if d3m_config and d3m_config.temp_storage_root:
            temp_storage_root = join(d3m_config.temp_storage_root, 'problems')
            success = self.make_directory(temp_storage_root)
            if success:
                fullpath = join(temp_storage_root, self.filename)
                self.write_new_file(fullpath)
                return
            attempted_dirs.append(temp_storage_root)

        self.add_error_message(('Failed to save file!'
                                ' Tried these directories:') %
                               (attempted_dirs))



    def write_new_file(self, fullpath, overwrite_ok=True):
        """Write a file"""
        if self.has_error:
            return

        if not fullpath:
            self.add_error_message('"fullpath" is not specified (cannot be blank)')
            return False

        if not self.file_data:
            self.add_error_message('"file_data" is not specified (cannot be blank)')
            return False

        if isfile(fullpath) and not overwrite_ok:
            self.add_error_message('File already exists: %s' % fullpath)
            return False

        if not isinstance(self.file_data, str):
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

    def make_directory(self, new_dirname):
        if not new_dirname:
            self.add_error_message('"new_dirname" is not specified (cannot be blank)')
            return False

        try:
            os.makedirs(new_dirname, exist_ok=True)
        except OSError as err_obj:
            user_msg = 'Could not create the directory: %s' % \
                       new_dirname
            return False

        return True



#name = '%s_%s_%s.txt' % (\
#                file_prefix,
#                random_info.get_alphanumeric_string(4),
#                dt.now().strftime('%Y-%m-%d_%H-%M-%S'))

#filepath = join(d3m_config.user_problems_root, fname)
#if not isfile(filepath): # great!  doesn't exist
#break
