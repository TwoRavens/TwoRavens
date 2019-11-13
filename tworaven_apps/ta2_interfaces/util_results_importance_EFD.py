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
from os.path import join, isfile
from collections import OrderedDict

from django.conf import settings

from tworaven_apps.data_prep_utils.duplicate_column_remover import DuplicateColumnRemover
from tworaven_apps.eventdata_queries.event_job_util import EventJobUtil
from tworaven_apps.eventdata_queries.mongo_retrieve_util import MongoRetrieveUtil
from tworaven_apps.utils.url_helper import format_file_uri_to_path
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

    def load_results_into_mongo(self, file_uri, collection_name, columns, is_second_try=False):

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

        EventJobUtil.import_dataset(
            settings.TWORAVENS_MONGO_DB_NAME,
            collection_name,
            datafile=fpath,
            column_names=columns,
            indexes=['d3mIndex'])

        return OrderedDict({KEY_SUCCESS: True})

    def get_statistics_results(self, file_uri, is_second_try=False):
        """Get the content from the file and format a JSON snippet
        that includes statistical summaries.
        """

        # make sure the base dataset is loaded
        EventJobUtil.import_dataset(
            settings.TWORAVENS_MONGO_DB_NAME,
            self.metadata['collectionName'],
            datafile=self.metadata['collectionPath'])

        results_collection_name = self.metadata['collectionName'] + \
                                  '_solution_' + str(self.metadata['solutionId'])

        util = MongoRetrieveUtil(
            settings.TWORAVENS_MONGO_DB_NAME,
            settings.MONGO_COLLECTION_PREFIX + self.metadata['collectionName'])
        if util.has_error():
            return OrderedDict({KEY_SUCCESS: False, KEY_DATA: util.get_error_message()})

        # populate levels if not passed (for example, numeric column tagged as categorical)
        for key in self.metadata['levels']:
            if not self.metadata['levels'][key]:
                response = util.run_query([
                    *self.metadata['query'],
                    {"$group": {"_id": f"${key}"}},
                ], 'aggregate')

                if not response[0]:
                    return OrderedDict({KEY_SUCCESS: False, KEY_DATA: response[1]})
                self.metadata['levels'][key] = [doc['_id'] for doc in response[1]]

        self.metadata['levels'].update({
            'fitted ' + key: self.metadata['levels'][key] for key in self.metadata['levels']
        })

        def is_categorical(variable, levels):
            return variable in levels

        def branch_target(variable, levels):
            if is_categorical(variable, levels):
                return {
                    f'{variable}-{level}': {
                        "$avg": {"$cond": [{"$eq": [f"${variable}", level]}, 1, 0]}
                    } for level in self.metadata['levels'][variable]}
            return {variable: {"$avg": f'${variable}'}}

        def aggregate_targets(variables, levels):
            return {k: v for d in [
                *[branch_target('fitted ' + target, levels) for target in variables],
                *[branch_target('actual ' + target, levels) for target in variables]
            ] for k, v in d.items()}

        target_aggregator = aggregate_targets(self.metadata['targets'], self.metadata['levels'])

        query = [
            *self.metadata['query'],
            {
                "$lookup": {
                    "from": settings.MONGO_COLLECTION_PREFIX + results_collection_name,
                    "localField": "d3mIndex",
                    "foreignField": "d3mIndex",
                    "as": "results_collection"
                }
            },
            {
                "$unwind": "$results_collection"
            },
            {
                "$project": {
                    **{
                        'fitted ' + name: f"$results_collection\\.{name}" for name in self.metadata['targets']
                    },
                    **{
                        'actual ' + name: f"${name}" for name in self.metadata['targets']
                    },
                    **{
                        predictor: 1 for predictor in self.metadata['predictors']
                      },
                    **{"_id": 0}}
            },
            {
                "$facet": {
                    predictor: [
                        {
                            "$group": {
                                **{"_id": f'${predictor}'},
                                **target_aggregator
                            }
                        },
                        {
                            "$project": {
                                **{predictor: "$_id"},
                                **{k: 1 for k in target_aggregator.keys()},
                                **{"_id": 0}
                            }
                        }
                    ] if is_categorical(predictor, self.metadata['levels']) else [
                        {
                            "$bucketAuto": {
                                "groupBy": f'${predictor}',
                                "buckets": 100,
                                "output": target_aggregator
                            }
                        },
                        {
                            "$project": {
                                **{predictor: {"$avg": ["$_id\\.min", "$_id\\.max"]}},
                                **{k: 1 for k in target_aggregator.keys()},
                                **{"_id": 0}
                            }
                        }
                    ] for predictor in self.metadata['predictors']
                }
            },
        ]

        print(query)

        columns = DuplicateColumnRemover(file_uri).orig_column_names
        if 'd3mIndex' not in columns:
            columns[0] = 'd3mIndex'

        try:
            status = self.load_results_into_mongo(
                file_uri,
                results_collection_name,
                columns,
                is_second_try)

            if not status['success']:
                return status

            response = list(util.run_query(query, method='aggregate'))

        finally:
            EventJobUtil.delete_dataset(
                settings.TWORAVENS_MONGO_DB_NAME,
                results_collection_name)

        if not response[0]:
            return OrderedDict({KEY_SUCCESS: response[0], KEY_DATA: response[1]})

        return OrderedDict({KEY_SUCCESS: response[0], KEY_DATA: response[1][0]})

    def attempt_test_output_directory(self, fpath):
        """quick hack for local testing.
        If the TA2 returns a file with file:///output/...,
        then attempt to map it back to the local directory"""
        d3m_config_info = get_latest_d3m_user_config(self.user)
        if not d3m_config_info['success']:
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
