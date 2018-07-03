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


class DataversePublishDataset(object):
    def __init__(self):
        """ publish the dataset
        sample api call :https://dataverse.harvard.edu/api/datasets/
        :persistentId/actions/:publish?type=major&persistentId=doi:10.7910/DVN/SJWX4S&key=YOUR_KEY_HERE


        This is not the request given on guide to dataverse API
        """
        self.status_code = None
        self.res = None
        dataverse_server = DATAVERSE_SERVER  # no trailing slash
        api_key = DATAVERSE_API_KEY  # generated from kripanshu's account
        dataset_id = 1  # database id of the dataset
        persistentId = DATASET_PERSISTENT_ID  # doi or hdl of the dataset

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

        print('-' * 40)
        print('making request: %s' % publish_url)
        r = requests.post(publish_url)

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




