from datetime import datetime
import json
import uuid
import requests  # http://docs.python-requests.org/en/master/
from django.conf import settings
from tworaven_apps.utils.view_helper import \
    (get_request_body_as_json,
     get_json_error,
     get_json_success)
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp,
                                                err_resp_with_data)
from tworaven_apps.eventdata_queries.dataverse.get_dataset_file_info import GetDataSetFileInfo

class ListFilesInDataset(object):

    def __init__(self,version_id):
        """ get list of files in dataset"""
        """ to get the JSON representation of the dataset"""
        self.status_code = None
        self.res = None
        dataverse_server = settings.DATAVERSE_SERVER  # no trailing slash
        api_key = settings.DATAVERSE_API_KEY  # generated from kripanshu's account
        persistentId = settings.DATASET_PERSISTENT_ID  # doi or hdl of the dataset

        my_obj = GetDataSetFileInfo()
        succ, err_or_obj = my_obj.get_dataset_id()
        succ2, get_version_id = my_obj.get_version_id()
        if not succ:
            self.res = err_or_obj

        dataset_id = err_or_obj
        # version_id = get_version_id

        publish_url = '%s/api/datasets/%s/versions/%s/files?key=%s' % (dataverse_server,
                                                                       dataset_id,
                                                                       version_id,
                                                                       api_key)
        print('-' * 40)
        print('making request: %s' % publish_url)
        r = requests.get(publish_url)

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

    def return_status(self):
        if self.res is not None:
            return ok_resp(self.res)
        else:
            return err_resp(self.res)
