"""some script tests for augment
reference: https://gitlab.com/ViDA-NYU/datamart/datamart/blob/master/examples/rest-api-ny-taxi-demand.ipynb
"""
import os, sys
import json
from os.path import abspath, dirname, join

sys.path.append(dirname(abspath(__file__)))
sys.path.append(dirname(dirname(abspath(__file__))))
#FAB_BASE_DIR = os.path.dirname(os.path.abspath(__file__))

os.environ.setdefault('TA2_STATIC_TEST_MODE',
                      'False')
os.environ.setdefault('DJANGO_SETTINGS_MODULE',
                      'tworavensproject.settings.local_settings')

import django
try:
    django.setup()
except Exception as e:
    print("WARNING: Can't configure Django. %s" % e)

from io import BytesIO
import json
import os
import pandas as pd
from pprint import pprint
import requests
import zipfile

TAXI_DATA = ('/Users/ramanprasad/Documents/github-rp/TwoRavens/ravens_volume/'
             'test_data/examples_data_ny_taxi_demand_prediction.csv')

COLLEGE_DEBT_DATA = ('/Users/ramanprasad/Documents/github-rp/TwoRavens/'
                     'ravens_volume/test_data/DA_college_debt/'
                     'TRAIN/dataset_TRAIN/tables/learningData-100-recs.csv')

def run_test_search1():
    url = 'https://datamart.d3m.vida-nyu.org/search'

    resp = requests.post(url,
                         files=dict(data=TAXI_DATA))

    if resp.status_code != 200:
        user_msg = (f'Failed: status code {resp.status_code}'
                    f'\ncontent: {resp.content}')
        print(user_msg)
    else:
        user_msg = (f'Looks good!: status code {resp.status_code}'
                    f'\ncontent: {resp.content}')
        print(user_msg)
        query_results = resp.json()['results']
        print(f'query_results: {query_results}')
    #response.raise_for_status()

def run_test_search2():
    url = 'https://datamart.d3m.vida-nyu.org/search'

    query = {
        'dataset': {
            'about': 'college scorecard'
        }
    }

    file_params = dict(data=COLLEGE_DEBT_DATA, #TAXI_DATA,
                       query=('query.json',
                              json.dumps(query),
                              'application/json'),)

    file_params.pop('data')

    print('file_params', file_params)

    resp = requests.post(url,
                         files=file_params)

    if resp.status_code != 200:
        user_msg = (f'Failed: status code {resp.status_code}'
                    f'\ncontent: {resp.content}')
        print(user_msg)
        return


    user_msg = (f'Looks good!: status code {resp.status_code}'
                f'\ncontent: {resp.content}')
    print(user_msg)

    resp_json = resp.json()

    if resp_json["results"]:
        first_result = resp_json["results"][0]

        print((f'resp_json: {resp_json}\n'
               f'query_results: {first_result}'))
    else:
        print((f'resp_json: {resp_json}\n'))


if __name__ == '__main__':
    run_test_search2()
