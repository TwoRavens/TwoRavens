import json
import zipfile
from io import BytesIO

from django.conf import settings
import pandas as pd
from tworaven_apps.data_prep_utils.new_dataset_util import NewDatasetUtil
from tworaven_apps.user_workspaces.models import UserWorkspace
from tworaven_apps.configurations.utils import get_latest_d3m_config
from tworaven_apps.utils.basic_response import (ok_resp, err_resp)
from tworaven_apps.utils.random_info import get_timestamp_string_readable
from tworaven_apps.utils.json_helper import (json_dumps, json_loads)
from tworaven_apps.utils.dict_helper import (clear_dict,)
from tworaven_common_apps.datamart_endpoints.static_vals import \
    (cached_response,
     cached_response_baseball)
from tworaven_common_apps.datamart_endpoints.datamart_info_util import \
    (get_isi_url,
     get_nyu_url)

import requests
import logging
import os

LOGGER = logging.getLogger(__name__)

PREVIEW_SIZE = 100


# based on documentation here:
# https://gitlab.com/ViDA-NYU/datamart/datamart/blob/master/examples/rest-api-fifa2018_manofmatch.ipynb
class DatamartJobUtilNYU(object):

    @staticmethod
    def datamart_upload(data):
        response = requests.post(
            get_nyu_url() + '/new/upload_data',
            files={
                'file': ('config.json', data)
            }).json()

        print(response)
        if response['code'] != '0000':
            return err_resp(response['message'])

        return ok_resp(response['data'])

    @staticmethod
    def datamart_search(query_str, data_path=None, limit=False):
        """Search the NYU datamart"""
        query_info_json = json_loads(query_str)
        if not query_info_json.success:
            user_msg = ('There is something wrong with the search parameters.'
                        ' (expected a JSON string)')
            return err_resp(user_msg)

        query_dict = query_info_json.result_obj

        clear_dict(query_dict)
        if not query_dict:
            no_params_msg = ('There are no search parameters.'
                             ' You must have at least 1.')
            return err_resp(no_params_msg)

        formatted_json_info = json_dumps(query_dict)
        if not formatted_json_info.success:
            return err_resp('Failed to convert query to JSON. %s' % \
                            formatted_json_info.err_msg)

        print(f'formatted query: {formatted_json_info.result_obj}')
        payload = {'query': ('query.json', formatted_json_info.result_obj)}

        if data_path and os.path.exists(data_path):
            payload['file'] = open(data_path, 'r')

        try:
            response = requests.post(\
                        get_nyu_url() + '/search',
                        files=payload,
                        stream=True,
                        timeout=settings.DATAMART_LONG_TIMEOUT)
        except requests.exceptions.Timeout as err_obj:
            return err_resp('Request timed out. responded with: %s' % err_obj)

        if response.status_code != 200:
            print(str(response))
            print(response.text)
            return err_resp(('NYU Datamart internal server error.'
                             ' status_code: %s') % response.status_code)

        json_results = response.json()['results']
        print('num results: ', len(json_results))

        if not json_results:
            return err_resp('No datasets found. (%s)' % \
                            (get_timestamp_string_readable(time_only=True),))

        return ok_resp(json_results)

    @staticmethod
    def datamart_materialize(user_workspace, search_result):
        """Materialize the dataset!"""
        if not isinstance(user_workspace, UserWorkspace):
            return err_resp('user_workspace must be a UserWorkspace')

        materialize_folderpath = os.path.join(\
                                user_workspace.d3m_config.additional_inputs,
                                'materialize',
                                str(search_result['id']))

        if os.path.exists(materialize_folderpath):
            response = None
        else:
            download_url = f"{get_nyu_url()}/download/{search_result['id']}"
            # print('download_url', download_url)
            # response = requests.get(get_nyu_url() + '/download/' + str(search_result['id']),
            response = requests.get(download_url,
                                    params={'format': 'd3m'},
                                    stream=True)

            if response.status_code != 200:
                return err_resp('NYU Datamart internal server error')

        return ok_resp(DatamartJobUtilNYU.save(materialize_folderpath, response))

    @staticmethod
    def datamart_augment(dataset_path, search_result):

        d3m_config = get_latest_d3m_config()
        if not d3m_config:
            user_msg = 'failed. no d3m config'
            LOGGER.error(user_msg)
            return err_resp(user_msg)

        print(search_result)
        augment_url = f"{ get_nyu_url() }/augment"

        files_info = dict(data=open(dataset_path, 'rb'),
                          task=('task.json',
                                json.dumps(search_result),
                                'application/json'))

        response = requests.post(augment_url,
                                 files=files_info,
                                 stream=True)

        if response.status_code != 200:
            return err_resp('NYU Datamart internal server error')

        augment_folderpath = os.path.join(\
                                    d3m_config.temp_storage_root,
                                    'augment',
                                    str(search_result['id']))

        return ok_resp(DatamartJobUtilNYU.save(augment_folderpath, response))

    @staticmethod
    def save(folderpath, response):

        if not os.path.exists(folderpath):
            with zipfile.ZipFile(BytesIO(response.content), 'r') as data_zip:
                data_zip.extractall(folderpath)

        metadata_filepath = os.path.join(folderpath, 'datasetDoc.json')
        data_filepath = os.path.join(folderpath, 'tables', 'learningData.csv')

        data = []
        with open(data_filepath, 'r') as datafile:
            for i in range(100):
                try:
                    data.append(next(datafile))
                except StopIteration:
                    pass

        return {
            'data_path': data_filepath,
            'metadata_path': metadata_filepath,
            'data_preview': ''.join(data),
            'metadata': json.load(open(metadata_filepath))
        }

    @staticmethod
    def get_data_paths(metadata_path):
        with open(metadata_path, 'r') as metadata_file:
            resources = json.load(metadata_file)['dataResources']

        return [
            os.path.join(os.path.basename(metadata_path), *resource['resPath'].split('/'))
            for resource in resources
        ]
