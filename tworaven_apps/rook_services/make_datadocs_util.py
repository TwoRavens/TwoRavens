"""Convenience class for calling rook make zombie docs

Example usage:

rook_parms_sort_of = {
    "datafile": "/ravens_volume/test_output/185_baseball/additional_inputs/185_bl_problem_TRAIN-20190131_080340-wuskjx/TRAIN/dataset_TRAIN/tables/learningData.csv",
    "datasetid": "185_bl_problem_TRAIN-20190131_080340-wuskjx",
    "name": "NULL (augmented)",
    "description": "(augmented data)",
    "taskType": "classification",
    "taskSubType": "multiClass",
    "depvarname": [
        {
            "targetIndex": 0,
            "resID": "0",
            "colIndex": 18,
            "colName": "Hall_of_Fame"
        }
    ]
}


from tworaven_apps.rook_services.preprocess_util import MakeDatadocsUtil
mdutil = MakeDatadocsUtil(rook_params)
if mdutil.has_error():
    print('error found: ', mdutil.get_error_message())
else:
    #
    # Preprocess data as python dict
    print('doc data (python dict)', mdutil.get_data())

    # Preprocess data as JSON string
    #
    print('doc data (json string)', mdutil.get_data_as_json())

    # Preprocess data as JSON string indented 4 spaces
    #
    print('doc data (json string)', putil.get_data_as_json(4))

"""
from os.path import isfile
from datetime import datetime as dt
import requests
from tworaven_apps.utils.basic_response import (ok_resp, err_resp)
from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.rook_services.rook_app_info import RookAppInfo
from tworaven_apps.rook_services.app_names import \
    (MKDOCS_ROOK_APP_NAME, SOLA_JSON_KEY)
from tworaven_apps.utils.json_helper import json_dumps, json_loads


class MakeDatadocsUtil(BasicErrCheck):
    """Convenience class for rook preprocess"""
    def __init__(self, rook_params, datastub=None):
        """Takes a path to a data file and runs preprocess

        - datastub is a unique directory that rookpreprocess uses to write
        """
        self.rook_params = rook_params
        self.datastub = datastub
        self.rook_app_info = None
        self.mkdoc_data = None

        self.set_rook_app_info()
        self.run_mkdoc_process()

    def get_problem_doc_string(self):
        """Return the problem doc as a string"""
        return self.get_mkdoc_data_as_json(indent=4, **dict(problemDoc=True))

    def get_dataset_doc_string(self):
        """Return the problem doc as a string"""
        return self.get_mkdoc_data_as_json(indent=4, **dict(datasetDoc=True))


    def get_mkdoc_data_as_json(self, indent=None, **kwargs):
        """Return the preprocess data as a JSON string"""
        assert not self.has_error(),\
            'Make sure "has_error()" is False before calling this method'

        print('-' * 40)
        print('-' * 40)
        print(self.mkdoc_data)
        print('-' * 40)
        print(type(self.mkdoc_data))

        if kwargs.get('problemDoc', None) is True:

            if not 'problemDoc' in self.mkdoc_data:
                return err_resp('Error: "problemDoc" not found in rook data')
            core_data = self.mkdoc_data['problemDoc']

        elif kwargs.get('datasetDoc', None) is True:

            if not 'datasetDoc' in self.mkdoc_data:
                return err_resp('Error: "datasetDoc" not found in rook data')
            core_data = self.mkdoc_data['datasetDoc']

        else:
            core_data = self.mkdoc_data

        json_str_info = json_dumps(core_data,
                                   indent=indent)
        if json_str_info.success:
            return ok_resp(json_str_info.result_obj)

        # SHOULDN'T HAPPEN!
        return err_resp(json_str_info.err_msg)


    def get_mkdoc_data(self):
        """Return the preprocess data as a python dict"""

        assert not self.has_error(),\
            'Make sure "has_error()" is False before calling this method'
        return self.mkdoc_data


    def set_rook_app_info(self):
        """Create a RookAppInfo object"""

        self.rook_app_info = RookAppInfo.get_appinfo_from_url(MKDOCS_ROOK_APP_NAME)
        if self.rook_app_info is None:
            err_msg = ('unknown rook app: "{0}" (please add "{0}" to '
                       ' "tworaven_apps/rook_services/app_names.py")').format(\
                       MKDOCS_ROOK_APP_NAME,)
            self.add_error_message(err_msg)

    def get_call_data(self):
        """Format data for rook call"""
        if self.has_error():
            return None

        #info = dict(data=self.rook_params,
        #            datastub=self.datastub)

        json_str_info = json_dumps(self.rook_params)
        if json_str_info.success:
            app_data = {SOLA_JSON_KEY: json_str_info.result_obj}
            return app_data

        # Failed JSON string conversion
        #
        self.add_error_message(json_str_info.err_msg)
        return None


    def run_mkdoc_process(self):
        """Run preprocess steps"""
        if self.has_error():
            return

        # cursory param check
        #
        if not self.rook_params:
            self.add_error_message('rook_params is not defined')
            return

        if not isinstance(self.rook_params, dict):
            self.add_error_message('rook_params must be a python dict')
            return

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

        print('rook_svc_url:', rook_svc_url)
        print('call_data:', call_data)

        # Call R services
        #
        try:
            rservice_req = requests.post(rook_svc_url,
                                         data=call_data)
        except ConnectionError:
            err_msg = 'R Server not responding: %s' % rook_svc_url
            self.add_err_msg(err_msg)
            return

        if not rservice_req.status_code == 200:
            user_msg = ('Rook request failed. Status code: %s'
                        ' \nUrl: %s') % \
                        (rservice_req.status_code, rook_svc_url)
            self.add_err_msg(user_msg)

        result_info = json_loads(rservice_req.text)
        if not result_info.success:
            user_msg = ('Failed to convert datadoc info '
                        ' to JSON: %s') % result_info.err_msg
            self.add_err_msg(user_msg)
            return

        self.mkdoc_data = result_info.result_obj



"""
from tworaven_apps.rook_services.preprocess_util import PreprocessUtil
src_file = '/ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv'


"""
