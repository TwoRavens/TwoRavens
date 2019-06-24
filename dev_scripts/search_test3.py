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

def run_augment_test():
    """Download POST"""

    # Query result
    #
    task_data = """{"id": "datamart.socrata.data-cityofnewyork-us.k2tc-bipg", "score": 8.788908, "metadata": {"name": "Medallion Taxi Initial Inspection Schedule", "description": "This is a schedule of Medallion Taxicab initial inspections at the Taxi and Limousine Commission\\u2019...", "size": 686334, "nb_rows": 13537, "columns": [{"name": "Medallion_Number", "structural_type": "http://schema.org/Text", "semantic_types": []}, {"name": "Schedule_Date", "structural_type": "http://schema.org/Text", "semantic_types": ["http://schema.org/DateTime"], "mean": 1566600510.95516, "stddev": 3029873.8282078225, "coverage": [{"range": {"gte": 1561334400.0, "lte": 1571788800.0}}]}, {"name": "Schedule_Time", "structural_type": "http://schema.org/Text", "semantic_types": ["http://schema.org/DateTime"], "mean": 1561359725.6562016, "stddev": 4632.38259222503, "coverage": [{"range": {"gte": 1561352400.0, "lte": 1561374000.0}}]}, {"name": "Fleet_Agent_Code", "structural_type": "http://schema.org/Integer", "semantic_types": [], "mean": 148.76346310113024, "stddev": 140.04502936441713, "coverage": [{"range": {"gte": 0.0, "lte": 999.0}}]}, {"name": "Last_Updated_Date", "structural_type": "http://schema.org/Text", "semantic_types": ["https://schema.org/Enumeration", "http://schema.org/DateTime"], "mean": 1561248000.0, "stddev": 0.0, "coverage": [{"range": {"gte": 1561248000.0, "lte": 1561248000.0}}]}, {"name": "Last_Updated_Time", "structural_type": "http://schema.org/Text", "semantic_types": ["https://schema.org/Enumeration", "http://schema.org/DateTime"], "mean": 1561399296.0, "stddev": 0.0, "coverage": [{"range": {"gte": 1561399200.766, "lte": 1561399200.766}}]}], "materialize": {"socrata_id": "k2tc-bipg", "socrata_domain": "data.cityofnewyork.us", "socrata_updated": "2019-06-23T22:10:10.000Z", "direct_url": "https://data.cityofnewyork.us/api/views/k2tc-bipg/rows.csv?accessType=DOWNLOAD", "identifier": "datamart.socrata", "date": "2019-06-24T02:01:08.225169Z"}, "date": "2019-06-24T03:19:48.375479Z"}, "augmentation": {"type": "none", "left_columns": [], "right_columns": []}}"""

    # syntax check
    #
    assert json.loads(task_data), 'task_data not valid json'

    # Base file to augment.  Has two columns: Medallion_Number, Earnings
    #       2 columns x 20 rows
    #
    input_fpath = join(INPUT_DIR, 'medallion-test-file.csv')
    assert isfile(input_fpath), f'File not found: {input_fpath}'

    # Set file for request
    #
    files = {'data': open(input_fpath, 'rb')}

    # Set headers
    #
    headers = {"Content-Type": "multipart/form-data"}

    # Augment url
    #
    augment_url = 'https://datamart.d3m.vida-nyu.org/augment'

    print('task_data', task_data)
    print('-' * 40)
    print('augment_url', augment_url)
    print('-' * 40)

    # Make request
    #
    try:
        response = requests.post(augment_url,
                                 headers=headers,
                                 files=files,
                                 data=task_data,
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

    print('augment success!')
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
    run_augment_test()
