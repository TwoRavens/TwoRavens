from datetime import datetime
import json
import uuid
import requests  # http://docs.python-requests.org/en/master/
from tworavensproject.settings.base import (DATAVERSE_SERVER, DATAVERSE_API_KEY, DATASET_PERSISTENT_ID)
from tworaven_apps.utils.view_helper import \
    (get_request_body_as_json,
     get_json_error,
     get_json_success)
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp,
                                                err_resp_with_data)


class GetDataSetFileInfo(object):

    def __init__(self):
        """ to get the JSON representation of the dataset"""
        self.status_code = None
        self.res = None
        dataverse_server = DATAVERSE_SERVER  # no trailing slash
        api_key = DATAVERSE_API_KEY  # generated from kripanshu's account
        dataset_id = 3178257  # database id of the dataset
        persistentId = DATASET_PERSISTENT_ID  # doi or hdl of the dataset

        # Get JSON Representation of a Dataset
        publish_url = '%s/api/datasets/:persistentId/?persistentId=%s'% (dataverse_server,
                                                                        persistentId)

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
        self.res = r.json()

    def return_status(self):
        if self.status_code == 200:
            return ok_resp(self.res)
        else:
            return err_resp(self.res)

    def get_dataset_id(self):
        """ return dataset Id from the Info"""
        if self.status_code == 200:
            dataset_id = self.res['data']['id']
            print("dataset ID ", dataset_id)
            return ok_resp(dataset_id)
        else :
            return err_resp(self.res)

    def get_version_id(self):
        """ return version ID"""
        if self.status_code == 200:
            version_id = self.res['data']['latestVersion']['id']
            print("version ID", version_id)
            return ok_resp(version_id)
        else :
            return err_resp(self.res)


