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


class DataversePublishDataset(object):
    def __init__(self):
        """ publish the dataset
        sample api call :https://dataverse.harvard.edu/api/datasets/
        :persistentId/actions/:publish?type=major&persistentId=doi:10.7910/DVN/SJWX4S&key=YOUR_KEY_HERE


        This is not the request given on guide to dataverse API
        """
        self.status_code = None
        self.res = None
        self.res_info = None
        dataverse_server = settings.DATAVERSE_SERVER  # no trailing slash
        api_key = settings.DATAVERSE_API_KEY  # generated from kripanshu's account
        persistentId = settings.DATASET_PERSISTENT_ID  # doi or hdl of the dataset

        # get dataset ID
        my_obj = GetDataSetFileInfo()
        succ, file_info_obj = my_obj.return_status()
        if not succ:
            self.res_info = file_info_obj

        succ, err_or_obj = my_obj.get_dataset_id()
        if not succ:
            self.res = err_or_obj

        dataset_id = err_or_obj

        type_input = 'major'    # for testing
        publish_url = '%s/api/datasets/%s/actions/:publish?type=%s&key=%s' %(dataverse_server,
                                                                            dataset_id,
                                                                            type_input,
                                                                            api_key)
        # publish_url = '%s/api/datasets/:persistentId/actions/' \
        #               ':publish?type=%s&persistentId=%skey=%s'% \
        #               (dataverse_server,
        #                type_input,
        #                persistentId,
        #                api_key)

        # # Get JSON Representation of a Dataset
        # publish_url = '%s/api/datasets/:persistentId/?persistentId=%s'% (dataverse_server,
        #                                                                 persistentId)

        print('-' * 40)
        print('making request: %s' % publish_url)
        # r = requests.post(publish_url)
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

    def get_dataset_file_info(self):
        if self.status_code == 200:
            return ok_resp(self.res_info)
        else:
            return err_resp(self.res_info)




