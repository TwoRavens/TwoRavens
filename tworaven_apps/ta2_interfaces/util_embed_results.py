"""
8/2/2018 - Repurposed for the API changes.

Repurposed to handle single data pointers.  Currently handles:

(1) file uri
    - example: file:///output/predictions/0001.csv
When a PipelineExecuteResult (in JSON format) contains a result_uri list,
read each of the files in that list and embed its results into the JSON

Note: csv files are converted to JSON

Example:
    - input: "file:///output/predictions/0001.csv"

Output:
        {
            success: true:
            data: [
                { "preds": "36.17124" },
                { "preds": "29.85256" },
                { "preds": "30.35607" },
                (etc. etc.)
            ]
        }


"""
import json
from os.path import getsize, join, isfile
from collections import OrderedDict

from django.conf import settings

from tworaven_apps.utils.csv_to_json import convert_csv_file_to_json
from tworaven_apps.utils.url_helper import format_file_uri_to_path
from tworaven_apps.utils.number_formatting import add_commas_to_number
from tworaven_apps.utils.static_keys import KEY_SUCCESS, KEY_DATA
from tworaven_apps.ta2_interfaces.static_vals import D3M_OUTPUT_DIR
from tworaven_apps.utils.json_helper import json_loads
from tworaven_apps.raven_auth.models import User
from tworaven_apps.user_workspaces.utils import get_latest_d3m_user_config

KEY_ERR_CODE = 'err_code'
ERR_CODE_FILE_URI_NOT_SET = 'FILE_URI_NOT_SET'
ERR_CODE_FILE_URI_BAD_FORMAT = 'FILE_URI_BAD_FORMAT'
ERR_CODE_FILE_NOT_FOUND = 'FILE_NOT_FOUND'
ERR_CODE_UNHANDLED_FILE_TYPE = 'ERR_CODE_UNHANDLED_FILE_TYPE'
ERR_CODE_FILE_NOT_REACHABLE = 'FILE_NOT_REACHABLE'
ERR_CODE_FILE_NOT_EMBEDDABLE = 'FILE_NOT_EMBEDDABLE'
ERR_CODE_FILE_INVALID_JSON = 'ERR_CODE_FILE_INVALID_JSON'
ERR_CODE_FILE_TOO_LARGE_TO_EMBED = 'FILE_TOO_LARGE_TO_EMBED'
ERR_CODE_FAILED_JSON_CONVERSION = 'FAILED_JSON_CONVERSION'


EXT_JSON = '.json'
EMBEDDABLE_FILE_TYPES = ('.csv', EXT_JSON)


class FileEmbedUtil(object):
    """For a list of given file uris
        - see if it's a .csv file:
        - open the file
        - convert it to JSON
        - embed the JSON in the orginal message
    """
    def __init__(self, data_pointer, user, indices=None):

        self.user = user
        self.data_pointer = data_pointer
        self.final_results = None
        self.indices = set(indices) if indices else None

        # List of paths where attempted to read a file
        self.attempted_file_paths = []

        # for error capture
        #
        self.has_error = False
        self.error_message = None

        self.process_file()

    def add_err_msg(self, err_msg):
        """Add error message"""
        self.has_error = True
        self.error_message = err_msg

    def process_file(self):
        """Go through it"""
        if not isinstance(self.user, User):
            self.add_err_msg('user must be a "User" object, not: "%s"' % self.user)
            return

        self.final_results = self.get_embed_result(self.data_pointer)

    def get_final_results(self):
        """Return the formatted_results"""
        assert not self.has_error, \
               ('(!) Do not use this method if an error has been detected.'
                ' First check the "has_error" attribute')

        return self.final_results

    def load_results_into_mongo(self, file_uri, collection_name, is_second_try=False):

        if not file_uri:
            err_code = ERR_CODE_FILE_URI_NOT_SET
            err_msg = 'The file_uri cannot be None or an empty string.'
            return self.format_embed_err(err_code, err_msg)

        # Convert the file uri to a path
        #
        fpath, err_msg = format_file_uri_to_path(file_uri)
        if err_msg:
            return self.format_embed_err(ERR_CODE_FILE_URI_BAD_FORMAT,
                                         err_msg)


        self.attempted_file_paths.append(fpath)

        # Is this path a file?
        #
        if not isfile(fpath):

            # For local testing, we'll try to map the :/output path back...
            #
            if fpath.startswith(D3M_OUTPUT_DIR) and not is_second_try:
                return self.attempt_test_output_directory(fpath)
            else:
                if is_second_try:
                    path_list = ['%s' % p for p in self.attempted_file_paths]
                    err_msg = ('File not found: %s'
                               ' (Paths attempted: %s)') % \
                               (fpath, ', '.join(path_list))
                else:
                    err_msg = 'File not found: %s' % fpath

                return self.format_embed_err(ERR_CODE_FILE_NOT_FOUND,
                                             err_msg)

        # Are these file types embeddable?
        #
        if not self.is_accepted_file_type(fpath):
            err_msg = self.get_embed_file_type_err_msg()
            return self.format_embed_err(ERR_CODE_UNHANDLED_FILE_TYPE,
                                         err_msg)

        # Attempt to get the file size, which may throw an
        # error if the file is not reachable
        try:
            fsize = getsize(fpath)
        except OSError as ex_obj:
            err_msg = 'Not able to open file: %s' % fpath
            return self.format_embed_err(ERR_CODE_FILE_NOT_REACHABLE,
                                         err_msg)

        # Is the file too large to embed? if indices are set, then this check is ignored
        #
        if not self.indices and fsize > settings.MAX_EMBEDDABLE_FILE_SIZE:
            err_msg = ('This file was too large to embed.'
                       ' Size was %s bytes but the limit is %s bytes.') %\
                       (add_commas_to_number(fsize),
                        add_commas_to_number(settings.MAX_EMBEDDABLE_FILE_SIZE))
            return self.format_embed_err(ERR_CODE_FILE_TOO_LARGE_TO_EMBED,
                                         err_msg)


        # If it's a JSON file, read and return it
        #
        if self.is_json_file_type(fpath):
            # Return the file directly
            response_data = self.load_and_return_json_file(fpath)
            if not response_data[KEY_SUCCESS]:
                return response_data

        # If it's a csv file, read, convert to JSON and return it
        #
        else:
            # The d3mIndex is written out to the column 'd3mIndex'
            (py_list, err_msg2) = convert_csv_file_to_json(fpath, to_string=False, index_column='d3mIndex', indices=self.indices)
            if err_msg2:
                return self.format_embed_err(ERR_CODE_FAILED_JSON_CONVERSION,
                                             err_msg2)

            response_data = OrderedDict()
            response_data[KEY_SUCCESS] = True
            response_data[KEY_DATA] = py_list

        return response_data

    def get_embed_result(self, file_uri, is_second_try=False):
        """Get the content from the file and format a JSON snippet
        that includes that content.
        Example response 1:
            {
              "success":true,
              "data":[
                 {"preds":"36.17124"},
                 {"preds":"29.85256"},
                 {"preds":"30.85256"}
              ]
           }
        Example response 2:
          {
              "success":false,
              "err_code":"FILE_NOT_FOUND",
              "message":"The file was not found."
           }
        """
        py_list = None

        if not file_uri:
            err_code = ERR_CODE_FILE_URI_NOT_SET
            err_msg = 'The file_uri cannot be None or an empty string.'
            return self.format_embed_err(err_code, err_msg)

        # Convert the file uri to a path
        #
        fpath, err_msg = format_file_uri_to_path(file_uri)
        if err_msg:
            return self.format_embed_err(ERR_CODE_FILE_URI_BAD_FORMAT,
                                         err_msg)

        self.attempted_file_paths.append(fpath)

        # Is this path a file?
        #
        if not isfile(fpath):

            # For local testing, we'll try to map the :/output path back...
            #
            if fpath.startswith(D3M_OUTPUT_DIR) and not is_second_try:
                return self.attempt_test_output_directory(fpath)
            else:
                if is_second_try:
                    path_list = ['%s' % p for p in self.attempted_file_paths]
                    err_msg = ('File not found: %s'
                               ' (Paths attempted: %s)') % \
                              (fpath, ', '.join(path_list))
                else:
                    err_msg = 'File not found: %s' % fpath

                return self.format_embed_err(ERR_CODE_FILE_NOT_FOUND,
                                             err_msg)

        # Are these file types embeddable?
        #
        if not self.is_accepted_file_type(fpath):
            err_msg = self.get_embed_file_type_err_msg()
            return self.format_embed_err(ERR_CODE_UNHANDLED_FILE_TYPE,
                                         err_msg)

        # Attempt to get the file size, which may throw an
        # error if the file is not reachable
        try:
            fsize = getsize(fpath)
        except OSError as ex_obj:
            err_msg = 'Not able to open file: %s' % fpath
            return self.format_embed_err(ERR_CODE_FILE_NOT_REACHABLE,
                                         err_msg)

        # Is the file too large to embed? if indices are set, then this check is ignored
        #
        if not self.indices and fsize > settings.MAX_EMBEDDABLE_FILE_SIZE:
            err_msg = ('This file was too large to embed.'
                       ' Size was %s bytes but the limit is %s bytes.') % \
                      (add_commas_to_number(fsize),
                       add_commas_to_number(settings.MAX_EMBEDDABLE_FILE_SIZE))
            return self.format_embed_err(ERR_CODE_FILE_TOO_LARGE_TO_EMBED,
                                         err_msg)


        # If it's a JSON file, read and return it
        #
        if self.is_json_file_type(fpath):
            # Return the file directly
            response_data = self.load_and_return_json_file(fpath)
            if not response_data[KEY_SUCCESS]:
                return response_data

        # If it's a csv file, read, convert to JSON and return it
        #
        else:
            # The d3mIndex is written out to the column 'd3mIndex'
            (py_list, err_msg2) = convert_csv_file_to_json(fpath, to_string=False, index_column='d3mIndex', indices=self.indices)
            if err_msg2:
                return self.format_embed_err(ERR_CODE_FAILED_JSON_CONVERSION,
                                             err_msg2)

            response_data = OrderedDict()
            response_data[KEY_SUCCESS] = True
            response_data[KEY_DATA] = py_list

        return response_data


    def attempt_test_output_directory(self, fpath):
        """quick hack for local testing.
        If the TA2 returns a file with file:///output/...,
        then attempt to map it back to the local directory"""
        d3m_config_info = get_latest_d3m_user_config(self.user)
        if not d3m_config_info.success:
            err_msg = ('No D3M config found and file'
                       ' not found: %s') % fpath
            return self.format_embed_err(ERR_CODE_FILE_NOT_FOUND,
                                         err_msg)

        d3m_config = d3m_config_info.result_obj
        # Make sure (1) there's a "d3m_config.root_output_directory"
        # and (2) it DOES NOT start with "/output"
        #
        if d3m_config.root_output_directory == D3M_OUTPUT_DIR or \
           not d3m_config.root_output_directory:
            err_msg = ('File not found: %s'
                       ' (Note: No alternate directory to try)') % \
                       fpath
            return self.format_embed_err(ERR_CODE_FILE_NOT_FOUND,
                                         err_msg)


        # Replace "/output" with the d3m_config.root_output_directory
        #
        new_fpath = fpath.replace(D3M_OUTPUT_DIR, '')

        # chop any trailing slashes before joining
        #
        if new_fpath.startswith('/'):
            new_fpath = new_fpath[1:]

        new_fpath = join(d3m_config.root_output_directory, new_fpath)

        return self.get_embed_result(new_fpath, is_second_try=True)


    def load_and_return_json_file(self, fpath):
        """Load a JSON file; assumes fpath exists and has undergone prelim checks"""
        assert isfile(fpath), "fpath must exist; check before using this method"

        json_info = None
        with open(fpath) as f:
            fcontent = f.read()
            json_info = json_loads(fcontent)

        if not json_info.success:
            return self.format_embed_err(ERR_CODE_FILE_INVALID_JSON,
                                         json_info.err_msg)

        embed_snippet = OrderedDict()
        embed_snippet[KEY_SUCCESS] = True
        embed_snippet[KEY_DATA] = json_info.result_obj

        return embed_snippet


    def format_file_key(self, file_num):
        """Format the key for an individual file embed"""
        assert str(file_num).isdigit(), 'The file_num must be digits.'
        return 'file_%s' % file_num

    def format_embed_err(self, err_code, err_msg):
        """Format a dict snippet for JSON embedding"""
        info = OrderedDict()
        info[KEY_SUCCESS] = False
        info[KEY_ERR_CODE] = err_code
        info['message'] = err_msg

        return info

        #od = OrderedDict()
        #fkey = self.format_file_key(file_num)
        #od[fkey] = info

        #return od


    def get_embed_file_type_err_msg(self):
        """Get the error message that the file type isn't recognized"""
        return ("The file doesn't appear to be one"
                " of these types: %s" %\
                  ', '.join(EMBEDDABLE_FILE_TYPES))


    def is_json_file_type(self, file_uri):
        """Check if the file extension is EXT_JSON"""
        if not file_uri:
            return False

        file_uri_lcase = file_uri.lower()
        if file_uri_lcase.endswith(EXT_JSON):
            return True

        return False

    def is_accepted_file_type(self, file_uri):
        """Check if the file extension is in EMBEDDABLE_FILE_TYPES"""
        if not file_uri:
            return False

        file_uri_lcase = file_uri.lower()
        for ftype in EMBEDDABLE_FILE_TYPES:
            if file_uri_lcase.endswith(ftype):
                return True

        return False
