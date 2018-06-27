from datetime import datetime
import json
import requests  # http://docs.python-requests.org/en/master/
from tworavensproject.settings.base import (DATAVERSE_SERVER, DATAVERSE_API_KEY, DATASET_PERSISTENT_ID)

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
file_content = 'content2: %s' % datetime.now()
files = {'file': ('editor_test.tab', file_content)}

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
