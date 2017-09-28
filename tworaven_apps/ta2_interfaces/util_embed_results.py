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
from collections import OrderedDict

from tworaven_apps.utils.csv_to_json import convert_csv_file_to_json


class ResultUriFormatter(object):
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
            formatted_results = self.process_list(json_info)

        try:
            self.final_results = json.dumps(formatted_results)
        except TypeError as ex_obj:
            self.add_err_msg('%s' % ex_obj)


    def get_final_results(self):
        """Return the formatted_results"""
        return self.final_results

    def process_list(self, result_list):
        """Process the results list from a PipelineCreateResult"""
        if not result_list:
            self.add_err_msg("result_list cannot be None")
            return

        formatted_results = []
        #result_uris = []
        fmt_cnt = 0
        # pip_result is a PipelineCreateResult
        #
        for pip_result in result_list:
            if 'pipelineInfo' in pip_result:
                if 'predictResultUris' in pip_result['pipelineInfo']:
                    for file_uri in pip_result['pipelineInfo']['predictResultUris']:
                        fmt_cnt += 1
                        embed_result = self.get_embed_result(file_uri, fmt_cnt)
                        pip_result['pipelineInfo'].setdefault('predictResultData', [])
                        pip_result['pipelineInfo']['predictResultData'].append(embed_result)

            formatted_results.append(pip_result)

        # No changes!
        if fmt_cnt == 0:
            return result_list

        return formatted_results


    def get_embed_result(self, file_uri, cnt):
        """Get the content from the """
        err_msg = None
        py_list = None
        
        if not file_uri:
            err_msg = 'file_uri cannot be None'

        elif not file_uri.lower().endswith('.csv'):
            err_msg = 'file doesn\'t appear to be a .csv'

        else:
            (py_list, err_msg) = convert_csv_file_to_json(file_uri, to_string=False)
            if py_list:
                return {'file_%d' % cnt : py_list}

        return {'file_%d' % cnt : err_msg}


    def get_formatted_json(self):
        pass
