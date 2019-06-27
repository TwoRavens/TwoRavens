"""
Reference:
  - https://vida-nyu.gitlab.io/-/datamart/datamart-api/-/jobs/233008593/artifacts/pages/rest_api.html

- https://datamart.d3m.vida-nyu.org
"""

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

search_results_fpath = 'output/search_result_example2.json'

test_file_to_augment = join(INPUT_DIR,
                            'man-of-match.csv')

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
    task_data = {"id":"datamart.upload.8733eed7d5844bc990d1153b6957cf90", "score":16.474606, "metadata":{"date":"2019-01-17T19:37:17.793933Z", "description":"This data contains FIFA 2018 match and player information.;Sports,  Soccer,  Football;FIFA,  FIF...", "filename":"FIFA_2018_Statistics_N.csv", "name":"FIFA 2018 game statistics data", "nb_rows":128, "size":3152, "columns":[{"name":"GameID", "structural_type":"http://schema.org/Integer", "semantic_types":["http://schema.org/identifier"], "mean":63.5, "stddev":36.94928957368463, "coverage":[{"range":{"gte":0, "lte":127}}]}, {"name":"Goal Scored", "structural_type":"http://schema.org/Integer", "semantic_types":[], "mean":1.3203125, "stddev":1.1519927961336174, "coverage":[{"range":{"gte":0, "lte":6}}]}, {"name":"Attempts", "structural_type":"http://schema.org/Integer", "semantic_types":[], "mean":12.59375, "stddev":5.2252952966794135, "coverage":[{"range":{"gte":3, "lte":26}}]}, {"name":"On-Target", "structural_type":"http://schema.org/Integer", "semantic_types":[], "mean":3.9140625, "stddev":2.225657710901151, "coverage":[{"range":{"gte":0, "lte":12}}]}, {"name":"Corners", "structural_type":"http://schema.org/Integer", "semantic_types":[], "mean":4.71875, "stddev":2.4364981915650996, "coverage":[{"range":{"gte":0, "lte":11}}]}, {"name":"Free Kicks", "structural_type":"http://schema.org/Integer", "semantic_types":[], "mean":14.890625, "stddev":4.705771680540291, "coverage":[{"range":{"gte":5, "lte":26}}]}, {"name":"Fouls Committed", "structural_type":"http://schema.org/Integer", "semantic_types":[], "mean":13.546875, "stddev":4.601051807399586, "coverage":[{"range":{"gte":5, "lte":25}}]}, {"name":"Yellow Card", "structural_type":"http://schema.org/Integer", "semantic_types":[], "mean":1.6953125, "stddev":1.3202662713800386, "coverage":[{"range":{"gte":0, "lte":6}}]}, {"name":"Red", "structural_type":"http://schema.org/Integer", "semantic_types":["http://schema.org/Boolean"], "mean":0.015625, "stddev":0.12401959270615269, "coverage":[{"range":{"gte":0, "lte":1}}]}, {"name":"Own goal Time", "structural_type":"http://schema.org/Integer", "semantic_types":[], "mean":4.296875, "stddev":15.458865558411048, "coverage":[{"range":{"gte":12, "lte":90}}]}], "materialize":{"identifier":"datamart.upload"}}, "augmentation":{"type":"none", "left_columns":[], "right_columns":[]}}

    task_data['augmentation'] = {\
                    'type': 'join',
                    'left_columns': [(1,)], # game id user's dataset
                    'right_columns': [(0,)] # game id in datamart dataset
                    }

    # syntax check
    #
    #assert json.loads(task_data), 'task_data not valid json'

    # Augment url
    #
    augment_url = 'https://datamart.d3m.vida-nyu.org/augment'

    print('task_data', task_data)
    print('-' * 40)
    print('augment_url', augment_url)
    print('-' * 40)

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
