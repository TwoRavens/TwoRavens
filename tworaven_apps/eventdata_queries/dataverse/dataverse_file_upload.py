from datetime import datetime
import json
import uuid
import requests  # http://docs.python-requests.org/en/master/
from django.conf import settings
from tworaven_apps.utils.view_helper import \
    (get_request_body_as_json,
     get_json_error,
     get_json_success)
from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp,
                                                err_resp_with_data)
FILE_CONTENT = u'file_content'
TEMP_FILE_PATH = u'temp_file_path'
INPUT_TYPE = (FILE_CONTENT, TEMP_FILE_PATH)


class DataverseFileUpload(BasicErrCheck):
    def __init__(self, file_upload_name, **kwargs):
        """
        It is required to either have a temp_file_path or file_content

        """
        self.status_code = None
        self.res = None
        self.temp_file_path = kwargs.get('temp_file_path')
        self.input_file_content = kwargs.get('file_content')
        self.filename = file_upload_name
        self.error_found = False
        self.error_message = None
        self.input_type = None
        self.run_process()

    def get_file_content(self):
        if self.temp_file_path:
            self.input_type = TEMP_FILE_PATH
        elif self.input_file_content:
            self.input_type = FILE_CONTENT
        else:
            self.add_err_msg('It is required to either have a %s or %s' % (TEMP_FILE_PATH, FILE_CONTENT))

    def run_process(self):
        dataverse_server = settings.DATAVERSE_SERVER  # no trailing slash
        api_key = settings.DATAVERSE_API_KEY  # generated from kripanshu's account
        # dataset_id = 1  # database id of the dataset
        persistentId = settings.DATASET_PERSISTENT_ID  # doi or hdl of the dataset

        # --------------------------------------------------
        # Using a "jsonData" parameter, add optional description + file tags
        # --------------------------------------------------
        params = dict(description='Testing file upload',
                      categories=['Test', 'Two Ravens', 'EventData'])

        params_as_json_string = json.dumps(params)

        payload = dict(jsonData=params_as_json_string)

        # --------------------------------------------------
        # Add file using the Dataset's persistentId (e.g. doi, hdl, etc)
        # --------------------------------------------------
        url_persistent_id = '%s/api/datasets/:persistentId/add?persistentId=%s&key=%s' % (dataverse_server,
                                                                                          persistentId,
                                                                                          api_key)

        # -------------------
        # Update the file content to avoid a duplicate file error
        # -------------------
        # file_open = open(temp_file_path, 'r').read()
        # file_content = 'query: %s' % file_open
        # file_name = self.filename
        # files = {'file': (file_name, file_content)}
        self.get_file_content()
        if self.has_error():
            return err_resp(self.error_message)

        success, files = self.update_file_content(self.input_type)
        if not success:
            self.add_err_msg(files)
            return err_resp(self.error_message)

        # -------------------
        # Make the request
        # -------------------
        print('-' * 40)
        print('making request: %s' % url_persistent_id)
        r = requests.post(url_persistent_id, data=payload, files=files)

        # -------------------
        # Print the response
        # -------------------
        print('-' * 40)
        print(r.json())
        print(r.status_code)
        self.status_code = r.status_code
        if r.status_code == 200:
            self.res = r.json()
        else:
            self.res = None

    def update_file_content(self, input_type):
        """ update the files using the type"""
        if input_type is TEMP_FILE_PATH:
            print(TEMP_FILE_PATH)
            file_open = open(self.temp_file_path, 'r').read()
            file_content = 'query: %s' % file_open
            file_name = self.filename
            files = {'file': (file_name, file_content)}

            return ok_resp(files)

        elif input_type is FILE_CONTENT:
            print(FILE_CONTENT)
            file_content = '%s' % self.input_file_content
            file_name = self.filename
            files = {'file': (file_name, file_content)}
            return ok_resp(files)

        else:
            return err_resp('It is required to either have a %s or %s' % (TEMP_FILE_PATH, FILE_CONTENT))

    def return_status(self):
        if self.res is not None:
            return ok_resp(self.res)
        else:
            self.add_err_msg(self.res)
            return err_resp(self.error_message)

