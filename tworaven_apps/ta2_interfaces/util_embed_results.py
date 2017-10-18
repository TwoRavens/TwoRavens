"""
When a PipelineExecuteResult (in JSON format) contains a result_uri list,
read each of the files in that list and embed its results into the JSON

Example:

- If you see a file uri:
{
    ...
        "progressInfo": "COMPLETED",
        "pipelineId": "pipeline_1",
        "pipelineInfo": {
            "predictResultUris": [
                "file:///out/predict1.csv"
            ],
    ...
}

- Embed the results into the JSON under "predictResultData":
{
    ...
    "progressInfo": "COMPLETED",
        "pipelineId": "pipeline_1",
        "pipelineInfo": {
            "predictResultUris": [
                "/Users/ramanprasad/Documents/github-rp/TwoRavens/tworaven_apps/ta2_interfaces/templates/test_responses/files/samplePredReg.csv"
            ],
            "predictResultData": {
                "file_1": [
                    { "preds": "36.17124" },
                    { "preds": "29.85256" },
                    { "preds": "30.35607" },
                    (etc. etc.)
                ]
            }
    ...
}

"""
import json
from os.path import getsize, isfile
from collections import OrderedDict

from django.conf import settings

from tworaven_apps.utils.csv_to_json import convert_csv_file_to_json
from tworaven_apps.utils.url_helper import format_file_uri_to_path
from tworaven_apps.utils.number_formatting import add_commas_to_number

ERR_CODE_FILE_URI_NOT_SET = 'FILE_URI_NOT_SET'
ERR_CODE_FILE_URI_BAD_FORMAT = 'FILE_URI_BAD_FORMAT'
ERR_CODE_FILE_NOT_FOUND = 'FILE_NOT_FOUND'
ERR_CODE_FILE_NOT_REACHABLE = 'FILE_NOT_REACHABLE'
ERR_CODE_FILE_NOT_EMBEDDABLE = 'FILE_NOT_EMBEDDABLE'
ERR_CODE_FILE_TOO_LARGE_TO_EMBED = 'FILE_TOO_LARGE_TO_EMBED'
ERR_CODE_FAILED_JSON_CONVERSION = 'FAILED_JSON_CONVERSION'

EMBEDDABLE_FILE_TYPES = ('.csv',)

class FileEmbedUtil(object):
    """For a list of given file uris
        - see if it's a .csv file:
        - open the file
        - convert it to JSON
        - embed the JSON in the orginal message
    """
    def __init__(self, json_msg_str):

        self.json_msg_str = json_msg_str

        # for error capture
        self.has_error = False
        self.error_message = None

        self.process_file()

    def add_err_msg(self, err_msg):
        """Add error message"""
        self.has_error = True
        self.error_message = err_msg

    def process_file(self):
        """Go through it"""
        if not self.json_msg_str:
            self.add_err_msg("json_msg_str cannot be None")
            return

        # Convert to a python list or dict
        #
        try:
            json_info = json.loads(self.json_msg_str,
                                   object_pairs_hook=OrderedDict)
        except ValueError as ex_obj:
            self.add_err_msg("Could not convert message to JSON: %s" % ex_obj)
            return

        if isinstance(json_info, list):
            formatted_results, err_msg = self.process_list(json_info)
            if err_msg:
                self.add_err_msg(err_msg)
                return
        else:
            self.add_err_msg(('Failed to process info with type:'
                              ' %s') % type(json_info))
            #assert False, "Need to handle instance: %s" % type(json_info)
            return
        #elif isinstance(json_info, dict) or isinstance(json_info, OrderedDict):
        #    print (json_info)

        try:
            self.final_results = json.dumps(formatted_results)
        except TypeError as ex_obj:
            self.add_err_msg('%s' % ex_obj)


    def get_final_results(self):
        """Return the formatted_results"""
        assert not self.has_error, \
               ('(!) Do not use this method if an error has been detected.'
                ' First check the "has_error" attribute')

        return self.final_results

    def get_final_results_as_dict(self):
        """Return the formatted_results"""
        assert not self.has_error, \
               ('(!) Do not use this method if an error has been detected.'
                ' First check the "has_error" attribute')

        return json.loads(self.final_results, object_pairs_hook=OrderedDict)


    def process_list(self, result_list):
        """Process the results list from a PipelineCreateResult"""
        if not result_list:
            return None, "result_list cannot be None"

        formatted_results = []
        #result_uris = []
        fmt_cnt = 0
        # pip_result is a PipelineCreateResult
        #
        for pip_result in result_list:

            if 'pipelineInfo' in pip_result:
                # Handle a list of PipelineCreateResult objects
                #   - returned by CreatePipelines
                #
                if 'predictResultUris' in pip_result['pipelineInfo']:
                    for file_uri in pip_result['pipelineInfo']['predictResultUris']:
                        fmt_cnt += 1
                        embed_result = self.get_embed_result(file_uri, fmt_cnt)
                        pip_result['pipelineInfo'].setdefault('predictResultData', [])
                        pip_result['pipelineInfo']['predictResultData'].append(embed_result)
            elif 'resultUris' in pip_result:
                # Handle a list of PipelineExecuteResult objects
                #   - returned by GetExecutePipelineResults
                #
                for file_uri in pip_result['resultUris']:
                    fmt_cnt += 1
                    embed_result = self.get_embed_result(file_uri, fmt_cnt)
                    pip_result.setdefault('resultData', [])
                    pip_result['resultData'].append(embed_result)

            formatted_results.append(pip_result)

        # No changes!
        if fmt_cnt == 0:
            return result_list, None

        return formatted_results, None


    def get_embed_result(self, file_uri, file_num):
        """Get the content from the file and format a JSON snippet
        that includes that content.

        Example responses:
           "file_1":{
              "success":true,
              "data":[
                 {"preds":"36.17124"},
                 {"preds":"29.85256"},
                 {"preds":"30.85256"}
              ]
           },
           "file_2":{
              "success":false,
              "err_code":"FILE_NOT_FOUND",
              "message":"The file was not found."
           },
           "file_3":{
              "success":false,
              "err_code":"FILE_NOT_REACHABLE",
              "message":"The file exists but could not be opened."
           },
        """
        py_list = None

        if not file_uri:
            err_code = ERR_CODE_FILE_URI_NOT_SET
            err_msg = 'The file_uri cannot be None or an empty string.'
            return self.format_embed_err(err_code, err_msg, file_num)

        # Convert the file uri to a path
        #
        fpath, err_msg = format_file_uri_to_path(file_uri)
        if err_msg:
            return self.format_embed_err(ERR_CODE_FILE_URI_BAD_FORMAT,
                                         err_msg,
                                         file_num)

        # Is this path a file?
        #
        if not isfile(fpath):
            err_msg = 'File not found: %s' % fpath
            return self.format_embed_err(ERR_CODE_FILE_NOT_FOUND,
                                         err_msg,
                                         file_num)

        # Are these file types embeddable?
        #
        if not self.is_accepted_file_type(fpath):
            err_msg = self.get_embed_file_type_err_msg()
            return self.format_embed_err(ERR_CODE_FILE_NOT_FOUND,
                                         err_msg,
                                         file_num)

        # Attempt to get the file size, which may throw an
        # error if the file is not reachable
        try:
            fsize = getsize(fpath)
        except OSError as ex_obj:
            err_msg = 'Not able to open file: %s' % fpath
            return self.format_embed_err(ERR_CODE_FILE_NOT_REACHABLE,
                                         err_msg,
                                         file_num)

        # Is the file too large to embed?
        #
        if fsize > settings.MAX_EMBEDDABLE_FILE_SIZE:
            err_msg = ('This file was too large to embed.'
                       ' Size was %d bytes but the limit is %d bytes.') %\
                       (add_commas_to_number(fsize),
                        add_commas_to_number(settings.MAX_EMBEDDABLE_FILE_SIZE))
            return self.format_embed_err(ERR_CODE_FILE_TOO_LARGE_TO_EMBED,
                                         err_msg,
                                         file_num)


        (py_list, err_msg2) = convert_csv_file_to_json(fpath, to_string=False)
        if err_msg2:
            return self.format_embed_err(ERR_CODE_FAILED_JSON_CONVERSION,
                                         err_msg2,
                                         file_num)

        # It worked!
        # Send back the data
        #
        embed_snippet = OrderedDict()
        fkey = self.format_file_key(file_num)
        embed_snippet[fkey] = OrderedDict()
        embed_snippet[fkey]['success'] = True
        embed_snippet[fkey]['data'] = py_list

        return embed_snippet

    def format_file_key(self, file_num):
        """Format the key for an individual file embed"""
        assert str(file_num).isdigit(), 'The file_num must be digits.'
        return 'file_%s' % file_num

    def format_embed_err(self, err_code, err_msg, file_num):
        """Format a dict snippet for JSON embedding"""
        info = OrderedDict()
        info['success'] = False
        info['err_code'] = err_code
        info['message'] = err_msg

        od = OrderedDict()
        fkey = self.format_file_key(file_num)
        od[fkey] = info

        return od


    def get_embed_file_type_err_msg(self):
        """Get the error message that the file type isn't recognized"""
        return ("The file doesn't appear to be one"
                " of these types: %s" %\
                  ', '.join(EMBEDDABLE_FILE_TYPES))


    def is_accepted_file_type(self, file_uri):
        """Check if the file extension is in EMBEDDABLE_FILE_TYPES"""
        if not file_uri:
            return False

        file_uri_lcase = file_uri.lower()
        for ftype in EMBEDDABLE_FILE_TYPES:
            if file_uri_lcase.endswith(ftype):
                return True

        return False

    def get_formatted_json(self):
        pass
