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


class DataverseFileUpload(object):

    def __init__(self, temp_file_path):
        """function to upload the file"""

        self.status_code = None
        self.res = None
        dataverse_server = DATAVERSE_SERVER  # no trailing slash
        api_key = DATAVERSE_API_KEY    # generated from kripanshu's account
        # dataset_id = 1  # database id of the dataset
        persistentId = DATASET_PERSISTENT_ID   # doi or hdl of the dataset

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
        file_open = open(temp_file_path, 'r').read()
        file_content = 'query: %s' % file_open
        file_name = 'temp_query' + str(uuid.uuid4())
        files = {'file': (file_name, file_content)}

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
        self.res = r.json()

    def return_status(self):
        if self.status_code == 200:
            return ok_resp(self.res)
        else:
            return err_resp(self.res)

