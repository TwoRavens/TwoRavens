"""
8/2/2018 - Repurposed for the API changes.
7/7/2019 - Repurposed from util_embed_results for generating statistics.

Handle single data pointers.  Currently handles:

(1) file uri
    - example: file:///output/predictions/0001.csv
When a PipelineExecuteResult (in JSON format) contains a result_uri list,
read each of the files in that list and embed its results into the JSON

Example:
    - input: "file:///output/predictions/0001.csv"

Output:
        // TODO output example


"""
from os.path import getsize, join, isfile
from collections import OrderedDict
import pandas as pd
from sklearn.metrics.classification import confusion_matrix

from django.conf import settings

from tworaven_apps.eventdata_queries.mongo_retrieve_util import MongoRetrieveUtil
from tworaven_apps.utils.url_helper import format_file_uri_to_path
from tworaven_apps.utils.number_formatting import add_commas_to_number
from tworaven_apps.utils.static_keys import KEY_SUCCESS, KEY_DATA
from tworaven_apps.ta2_interfaces.static_vals import D3M_OUTPUT_DIR
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
ERR_CODE_FILE_INVALID_CSV = 'ERR_CODE_FILE_INVALID_CSV'
ERR_CODE_FILE_TOO_LARGE_TO_EMBED = 'FILE_TOO_LARGE_TO_EMBED'
ERR_CODE_FAILED_JSON_CONVERSION = 'FAILED_JSON_CONVERSION'


EXT_JSON = '.json'
EMBEDDABLE_FILE_TYPES = ('.csv', EXT_JSON)


class ImportanceEFDUtil(object):
    """For a list of given file uris
        - see if it's a .csv file:
        - open the file
        - convert it to JSON
        - embed the JSON in the orginal message
    """
    def __init__(self, data_pointer, metadata, user):

        self.user = user
        self.data_pointer = data_pointer
        self.metadata = metadata
        self.final_results = None

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

        self.final_results = self.get_statistics_results(self.data_pointer)

    def get_final_results(self):
        """Return the formatted_results"""
        assert not self.has_error, \
            ('(!) Do not use this method if an error has been detected.'
             ' First check the "has_error" attribute')

        return self.final_results

    def get_statistics_results(self, file_uri, is_second_try=False):
        """Get the content from the file and format a JSON snippet
        that includes statistical summaries.
        """

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

        # Is the file too large to embed?
        #
        if fsize > settings.MAX_EMBEDDABLE_FILE_SIZE:
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
            results_obj = self.load_and_return_json_file(fpath)
            if results_obj.success:
                fitted_values = results_obj.data
            else:
                return results_obj

        # If it's a csv file, read to dataframe
        #
        else:
            results_obj = self.load_and_return_csv_file(fpath)
            if results_obj.success:
                fitted_values = results_obj.data
            else:
                return results_obj

        # align joining column and avoid target collision in join
        actual_target_name = self.metadata['targets'][0]
        fitted_target_name = 'fitted_' + actual_target_name
        fitted_values.columns = ['d3mIndex', fitted_target_name]

        util = MongoRetrieveUtil(settings.TWORAVENS_MONGO_DB_NAME, self.metadata['collectionName'])
        if util.has_error():
            return OrderedDict({KEY_SUCCESS: False, KEY_DATA: util.get_error_message()})

        # TODO: exhausting this cursor is potentially a memory bomb
        actual_values = pd.DataFrame(list(util.run_query([
            *self.metadata['manipulations'],
            {'$project': {variable: 1 for variable in [*self.metadata['predictors'], actual_target_name]}}
        ], 'aggregate')))

        results_values = actual_values.join(fitted_values, 'd3mIndex')

        results = {}

        if self.metadata['task'] in ['classification', 'semisupervisedClassification']:
            labels = list({*pd.unique(results_values[actual_target_name]),
                           *pd.unique(results_values[fitted_target_name])})

            results['confusion_matrix'] = confusion_matrix(
                results_values[actual_target_name],
                results_values[fitted_target_name],
                labels=labels)
            results['labels'] = labels

        # elif self.metadata.task in ['regression', 'semisupervisedRegression']:

        def aggregate_target(variable):
            if variable in self.metadata['nominal']:
                # bin counts by variable levels
                return {level: {"$sum": {"$cond": [{"$eq": [f"${variable}", level]}, 1, 0]}}
                        for level in self.metadata['summaries'][variable].plotvalues.keys()}
            else:
                return {"average": {"$avg": f"${variable}"}}

        def importance_target(variable):
            return list(util.run_query([
                *self.metadata['manipulations'],
                {"$facet": {
                    predictor: [{
                        "$bucketAuto": {
                            "buckets": min(100, int(len(actual_values) / 10)),
                            "groupBy": f"${predictor}",
                            "output": aggregate_target(variable)
                        }
                    }]
                    for predictor in self.metadata['predictors']}}
            ], 'aggregate'))[0]

        results['importance'] = {}
        for target in self.metadata['targets']:
            results['importance'][target] = importance_target(target)

        # return OrderedDict({KEY_SUCCESS: False, KEY_DATA: f"Invalid task type: {self.metadata.task}"})

        # Send back the data
        #
        return OrderedDict({KEY_SUCCESS: True, KEY_DATA: results})


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

        try:
            with open(fpath) as f:
                fcontent = f.read()
                dataframe = pd.read_json(fcontent)
        # TODO: narrower exception catch
        except Exception as err:
            return self.format_embed_err(ERR_CODE_FILE_INVALID_JSON,
                                         str(err))

        embed_snippet = OrderedDict()
        embed_snippet[KEY_SUCCESS] = True
        embed_snippet[KEY_DATA] = dataframe

        return embed_snippet


    def load_and_return_csv_file(self, fpath):
        """Load a JSON file; assumes fpath exists and has undergone prelim checks"""
        assert isfile(fpath), "fpath must exist; check before using this method"

        try:
            with open(fpath) as f:
                fcontent = f.read()
                dataframe = pd.read_csv(fcontent)
        # TODO: narrower exception catch
        except Exception as err:
            return self.format_embed_err(ERR_CODE_FILE_INVALID_CSV,
                                         str(err))

        embed_snippet = OrderedDict()
        embed_snippet[KEY_SUCCESS] = True
        embed_snippet[KEY_DATA] = dataframe

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
                " of these types: %s" % \
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
