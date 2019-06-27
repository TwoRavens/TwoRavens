"""
Reference:
  - https://vida-nyu.gitlab.io/-/datamart/datamart-api/-/jobs/233008593/artifacts/pages/rest_api.html

- https://datamart.d3m.vida-nyu.org
"""
from io import BytesIO

import zipfile
import requests
import json
import os
from os.path import abspath, dirname, isdir, join

CURRENT_DIR = dirname(abspath(__file__))
OUTPUT_DIR = join(CURRENT_DIR, 'output')


url = 'https://datamart.d3m.vida-nyu.org/search'

search_results_fpath = 'output/search_result_example.json'


def run_search():
    """Search"""
    query = {"keywords":["taxi"],"variables":[]}
    r = requests.post(url, json=query)

    json_info = r.json()
    result = json.dumps(json_info, indent=4)
    open(search_results_fpath, 'w').write(result)

    #print(r.json())
    print(r.status_code)

def run_download():
    """Download"""
    search_results = json.loads(open(search_results_fpath, 'r').read())

    download_url_base = 'https://datamart.d3m.vida-nyu.org/download/'
    download_url = ''

    for one_result in search_results['results']:
        result_id = one_result['id']
        download_url = f'{download_url_base}{result_id}'
        print(f'{result_id} - {download_url_base}{result_id}')
        break
    #print(content)

    print('try to download: %s' % download_url)

    try:
        response = requests.get(\
                    download_url,
                    params={'format': 'd3m'},
                    verify=False,
                    stream=True)
    except requests.exceptions.Timeout as err_obj:
        user_msg = ('Request timed out. responded with: %s' % err_obj)
        print(user_msg)
        return


    if response.status_code != 200:
        user_msg = (f'Materialize failed.  Status code:'
                    f' {response.status_code}.  response: {response.text}')
        print(user_msg)
        return

    data_foldername = join(OUTPUT_DIR, 'downloads')
    if not isdir(data_foldername):
        os.makedirs(data_foldername)

    try:
        with zipfile.ZipFile(BytesIO(response.content), 'r') as data_zip:
            data_zip.extractall(data_foldername)
    except RuntimeError as err_obj:
        user_msg = (f'Failed to extract zip to "{data_foldername}".'
                    f' Error: %s') % (err_obj,)
        print(user_msg)


if __name__ == '__main__':
    # run_search()
    run_download()
