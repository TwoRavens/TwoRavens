"""
Reference:
  - https://vida-nyu.gitlab.io/-/datamart/datamart-api/-/jobs/233008593/artifacts/pages/rest_api.html

- https://datamart.d3m.vida-nyu.org
"""
# from d3m import container
#import datamart
import datamart_nyu
import datetime
from pathlib import Path

from io import BytesIO
from collections import Counter
import zipfile
import random
import requests
import json
import os
from os.path import abspath, dirname, isdir, isfile, join

CURRENT_DIR = dirname(abspath(__file__))
INPUT_DIR = join(CURRENT_DIR, 'input')
OUTPUT_DIR = join(CURRENT_DIR, 'output')


url = 'https://datamart.d3m.vida-nyu.org/search'

search_results_fpath = 'output/search_result_example.json'

test_file_to_augment = join(INPUT_DIR,
                            'aug-medallion-test-file.csv')

def dashes(): print('-' * 40)
def msgt(m): dashes(); print(m); dashes()

def run_checks():
    """run some checks"""
    assert isfile(test_file_to_augment), \
        'test file not found: %s' % test_file_to_augment

    medallions = []
    for line in open(test_file_to_augment, 'r').readlines()[1:]:
        items = line.split(',')
        medallions.append(items[0])

    print(len(medallions))

    c = Counter(medallions)
    print(c.most_common(5))

    outlines = ['Medallion_Number,Earnings']
    for val, cnt in c.most_common(20):
        earnings = random.randint(5000, 7500)
        info_line = f'{val},{earnings}'
        outlines.append(info_line)
        #print(info_line)

    print('\n'.join(outlines))

def run_augment():
    """Download POST"""
    msgt('run_augment')

    input_fpath = join(INPUT_DIR,
                       'medallion-on-datamart.csv')
                       #'medallion-test-file.csv')

    assert isfile(input_fpath), 'input file not found: %s' % input_fpath

    augment_id = 'datamart.socrata.data-cityofnewyork-us.k2tc-bipg'

    search_results = json.loads(open(search_results_fpath, 'r').read())


    for one_result in search_results['results']:
        if one_result['id'] == augment_id:
            query_params = one_result
            break

    #query_params['augmentation'] = {'type': 'none',
    #                                'left_columns': [('Medallion_Number', 0)],
    #                                'right_columns': [('Medallion_Number', 0)]}


    augment_url = 'https://datamart.d3m.vida-nyu.org/augment'

    print('query_params', query_params)

    files = {'data': ('data',
                      open(input_fpath, 'r'))}

    headers = {"Content-Type": "multipart/form-data"}

    try:
        response = requests.post(\
                    augment_url,
                    headers=headers,
                    files=files,
                    # json=query_params,
                    # data=query_params,
                    data=json.dumps(query_params),
                    verify=False,
                    stream=True)
    except requests.exceptions.Timeout as err_obj:
        user_msg = ('Request timed out. responded with: %s' % err_obj)
        print(user_msg)
        return


    if response.status_code != 200:
        user_msg = (f'Augment failed.  Status code:'
                    f' {response.status_code}.  response: {response.text}')
        print(user_msg)
        return

    data_foldername = join(OUTPUT_DIR, 'augment-results',)
    if not isdir(data_foldername):
        os.makedirs(data_foldername)

    try:
        with zipfile.ZipFile(BytesIO(response.content), 'r') as data_zip:
            data_zip.extractall(data_foldername)
    except RuntimeError as err_obj:
        user_msg = (f'Failed to extract zip to "{data_foldername}".'
                    f' Error: %s') % (err_obj,)
        print(user_msg)

    msgt('files downloaded to %s' % data_foldername)


if __name__ == '__main__':
    # run_search()
    # run_checks()
    run_augment()
