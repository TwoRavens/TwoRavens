import requests # http://docs.python-requests.org
import json

DATAMART_ISI_URL = 'https://dsbox02.isi.edu:9000'

DOC_LIMIT = 5

# ---------------------------------------------------
# Prepare the query string in the files section(?)
# ---------------------------------------------------
query = {"dataset":{"about":"weather","keywords":[]}}
query_string = json.dumps(query) # this has to be a string
files = {'query': ('query.json', query_string)}

# ---------------------------------------------------
# Prepare parameters, including the document limit
# ---------------------------------------------------
params = {'return_named_entity': False,
          'max_return_docs': DOC_LIMIT}

# ---------------------------------------------------
# POST the request
# ---------------------------------------------------
response = requests.post(
    DATAMART_ISI_URL + '/new/search_data',
    params=params,
    files=files,
    verify=False)


import curlify
print('curl it?', curlify.to_curl(response.request))

if response.status_code != 200:
    print('Failed.  Status code: %s' % response.status_code)
    print(response.text)
else:
    resp_json = response.json()

    if resp_json['code'] != "0000":
        print('Failed.  See message', resp_json['message'])

    # ---------------------------------------------------
    # Get the number of datasets
    # ---------------------------------------------------
    num_datasets = len(resp_json['data']) if 'data' in resp_json else 0

    print('\n\n# of Datasets', num_datasets)

    # ---------------------------------------------------
    # Iterate through datasets
    # ---------------------------------------------------
    for idx, dataset in enumerate(resp_json['data']):
        print('-' *40)
        print('# %d' % (idx+1))
        print('dataset id: ', dataset['datamart_id'])
        print('description: ', dataset['metadata']['description'])
        #continue
        #print(json.dumps(dataset, indent=4))
    print('-' *40)
