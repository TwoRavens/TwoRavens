"""
Retrieve Seed datasets from: https://gitlab.datadrivendiscovery.org/d3m/datasets/tree/master/seed_datasets_current
(1) Create a file in this directory
    file name: 'gitlab_token.py'
    contents: 'READ_TOKEN = {your gitlab token}'
(2) Change TARGET_OUTPUT_DIR to where you want the datasets to go
    (e.g. you 'tworavens-test-datasets' may be a good place)
(3) Update the SEED_DATASETS_TO_RETRIEVE
(4) >python get_seed_data.py
"""
import os
from os.path import abspath, basename, dirname, isdir, isfile, join, split
import urllib.parse
import requests

# variable READ_TOKEN has a gitlab token
from gitlab_token import READ_TOKEN

BASE_DIR = dirname(dirname(dirname(abspath(__file__))))

TARGET_OUTPUT_DIR = join(BASE_DIR, 'tworavens-test-datasets')

PROJECT_ID = 522

SEED_DATASETS_TO_RETRIEVE = [#'185_baseball_MIN_METADATA',
                             #'196_autoMpg_MIN_METADATA',
                             'LL1_h1b_visa_apps_7480',
                             #'LL1_terra_canopy_height_long_form_s4_80_MIN_METADATA',
                             'JIDO_SOHR_Tab_Articles_8569',
                             'LL1_MITLL_synthetic_vora_E_2538'
                            ]

FILES_TO_RETRIEVE = [\
        # Train
        'TRAIN/dataset_TRAIN/datasetDoc.json',
        'TRAIN/dataset_TRAIN/tables/learningData.csv',
        'TRAIN/problem_TRAIN/dataSplits.csv',
        'TRAIN/problem_TRAIN/probemDoc.json',
        #
        # Test
        'TEST/dataset_TEST/datasetDoc.json',
        'TEST/dataset_TEST/tables/learningData.csv',
        'TEST/problem_TEST/dataSplits.csv',
        'TEST/problem_TEST/probemDoc.json',
        #
        # Score
        #'SCORE/baseline_scores.csv',
        #'SCORE/dataset_SCORE/datasetDoc.json',
        #'SCORE/dataset_SCORE/tables/learningData.csv',
        #'SCORE/problem_SCORE/dataSplits.csv',
        #'SCORE/problem_SCORE/probemDoc.json',
        ]

def msgt(m):
    print('-' * 40)
    print(m)
    print('-' * 40)

def download_seed_dataset(seed_name, output_dir):

    assert isdir(output_dir), f'directory does not exist {output_dir}'
    msgt(f'-- {seed_name} --')

    seed_output_dir = join(output_dir, seed_name)
    headers = {'PRIVATE-TOKEN': READ_TOKEN}

    os.makedirs(seed_output_dir, exist_ok=True)

    cnt = 0
    fnd_cnt = 0
    for path_info in FILES_TO_RETRIEVE:
        cnt +=1
        print(f'\n{cnt} > path_info')

        #https://gitlab.datadrivendiscovery.org/d3m/datasets/raw/master/seed_datasets_current/185_baseball_MIN_METADATA/TRAIN/dataset_TRAIN/datasetDoc.json?inline=false
        path_to_file = (f'seed_datasets_current/{seed_name}/{path_info}')
        path_to_file = urllib.parse.quote(path_to_file, safe='')

        api_url = (f'https://gitlab.datadrivendiscovery.org/api/v4/projects/'
                   f'{PROJECT_ID}/repository/files/{path_to_file}'
                   f'/raw?ref=master')

        print(f'{api_url}')
        r = requests.get(api_url, headers=headers)
        if r.status_code == 404:
            print('No file found (404)')
            continue
        elif r.status_code != 200:
            print('Error! Skipping!', r.status_code)
            continue

        file_dir, fname = split(path_info)
        fulldir = join(seed_output_dir, file_dir)
        if not isdir(fulldir):
            os.makedirs(fulldir, exist_ok=True)
            print('directory created: {fulldir}')

        file_fullpath = join(fulldir, fname)
        open(file_fullpath, 'wb').write(r.text.encode())
        print('file written: ', file_fullpath)
        fnd_cnt += 1

    print(f'\n--- {seed_name}: {fnd_cnt} file(s) found ---')


if __name__ == '__main__':
    for seed_dataset in SEED_DATASETS_TO_RETRIEVE:
        download_seed_dataset(seed_dataset, #'185_baseball_MIN_METADATA',
                              TARGET_OUTPUT_DIR)

"""
import requests
import urllib.parse

headers = {'PRIVATE-TOKEN': READ_TOKEN}

path_to_file = ('seed_datasets_current/185_baseball_MIN_METADATA/'
                'TRAIN/dataset_TRAIN/datasetDoc.json')
path_to_file = urllib.parse.quote(path_to_file, safe='')

url = (f'https://gitlab.datadrivendiscovery.org/api/v4/projects/522/'
       f'repository/files/{path_to_file}/raw?ref=master')
print('url', url)
r = requests.get(url, headers=headers)
print('status_code', r.status_code)
fname = 'README_test.md'
open(fname, 'wb').write(r.text.encode())
print('file written: ', fname)
"""
