"""
Reference:
  - https://vida-nyu.gitlab.io/-/datamart/datamart-api/-/jobs/233008593/artifacts/pages/rest_api.html

- https://datamart.d3m.vida-nyu.org
"""
import json
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


url = 'https://auctus.vida-nyu.org'

search_results_fpath = 'output/search_result_example2.json'


def dashes(): print('-' * 40)
def msgt(m): dashes(); print(m); dashes()

def run_checks():
    """run some checks"""
    assert isfile(test_file_to_augment), \
        'test file not found: %s' % test_file_to_augment

    game_ids = []
    for line in open(test_file_to_augment, 'r').readlines()[1:]:
        items = line.split(',')
        game_ids.append(items[0])

    print(len(game_ids))

    c = Counter(game_ids)
    print(c.most_common(5))

    outlines = ['Medallion_Number,Earnings']
    for val, cnt in c.most_common(20):
        earnings = random.randint(5000, 7500)
        info_line = f'{val},{earnings}'
        outlines.append(info_line)
        #print(info_line)

    print('\n'.join(outlines))

def run_augment_test():
    """Download POST"""

    # Query result
    #
    result_content = open(join(INPUT_DIR, 'nyu_result_aug_01_water.json'), 'r').read()

    task_data = json.loads(result_content)

    """
     "left_columns": "[[1]]",
    "right_columns": "[[13]]",
    "augment_with_dataset": true,
    "augment_with_join_pairs": false,
    "exact_match": true
    """
    task_data['augmentation'] = {\
                    'type': 'join',
                    'left_columns': [[1]], #[(1,)], # game id user's dataset
                    'right_columns': [[13]], #[(0,)] # game id in datamart dataset
                    }

    # syntax check
    #
    #assert json.loads(task_data), 'task_data not valid json'

    # Augment url
    #
    augment_url = 'https://auctus.vida-nyu.org/augment'

    print('task_data', task_data)
    print('-' * 40)
    print('augment_url', augment_url)
    print('-' * 40)

    # TAXI Dataset
    test_file_to_augment = join(INPUT_DIR,
                                'seed_taxi_data.csv',)

    data_params = dict(data=open(test_file_to_augment, 'rb'),
                       task=json.dumps(task_data),
                       )

    # Make request
    #
    try:
        response = requests.post(augment_url,
                                 files=data_params,
                                 verify=False,
                                 allow_redirects=True,
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

    print('augment success!')


    data_foldername = join(OUTPUT_DIR, 'augment-results-fifa',)
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
    run_augment_test()
