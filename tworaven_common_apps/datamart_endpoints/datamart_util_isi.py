import json
import zipfile
from io import BytesIO

from django.conf import settings
import pandas as pd
from tworaven_apps.data_prep_utils.new_dataset_util import NewDatasetUtil
from tworaven_apps.user_workspaces.models import UserWorkspace
from tworaven_apps.configurations.utils import get_latest_d3m_config
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)
from tworaven_common_apps.datamart_endpoints.static_vals import \
    (cached_response,
     cached_response_baseball)
from tworaven_common_apps.datamart_endpoints.info_util import \
    (get_isi_url,
     get_nyu_url)

import requests
import logging
import os

LOGGER = logging.getLogger(__name__)

PREVIEW_SIZE = 100


class DatamartJobUtilISI(object):

    @staticmethod
    def datamart_scrape(url):

        try:
            response = requests.post(
                get_isi_url() + '/new/get_metadata_extract_links',
                data=json.dumps({'url': url}),
                headers={'Content-Type': 'application/json'},
                verify=False,
                timeout=settings.DATAMART_LONG_TIMEOUT)
        except requests.exceptions.Timeout as err_obj:
            return err_resp('Request timed out. responded with: %s' % err_obj)


        if response.status_code != 200:
            return err_resp('Datamart responded with: ' + response.reason)

        response = response.json()

        if response['code'] != '0000':
            return err_resp(response['message'])

        return ok_resp(response['data'])

    @staticmethod
    def datamart_get_metadata(data):

        try:
            response = requests.post(
                get_isi_url() + '/new/get_metadata_single_file',
                data=data,
                headers={'Content-Type': 'application/json'},
                verify=False,
                timeout=settings.DATAMART_LONG_TIMEOUT)
        except requests.exceptions.Timeout as err_obj:
            return err_resp('Request timed out. responded with: %s' % err_obj)

        if response.status_code != 200:
            return err_resp('Datamart responded with: ' + response.reason)

        response = response.json()

        if response['code'] != '0000':
            return err_resp(response['message'])

        return ok_resp(response['data'])

    @staticmethod
    def datamart_upload(index):

        try:
            response = requests.post(
                get_isi_url() + '/new/upload_metadata_list',
                data=index.encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                verify=False,
                timeout=settings.DATAMART_LONG_TIMEOUT)
        except requests.exceptions.Timeout as err_obj:
            return err_resp('Request timed out. responded with: %s' % err_obj)

        if response.status_code != 200:
            return err_resp('Datamart responded with: ' + response.reason)

        response = response.json()

        if response['code'] != '0000':
            return err_resp(response['message'])

        return ok_resp(response['data'])

    @staticmethod
    def datamart_search(query, data_path=None, limit=None):
        # TODO disable #debug
        # return ok_resp(json.loads(cached_response_baseball))
        # TODO: respect limit
        limit = 100

        files = {'query': ('query.json', query)}
        if data_path and os.path.exists(data_path):
            files['file'] = open(data_path, 'r')

        params = {'return_named_entity': False}
        if limit:
            params['max_return_docs'] = limit

        print('start seach')
        try:
            response = requests.post(\
                    get_isi_url() + '/new/search_data',
                    params=params,
                    files=files,
                    verify=False,
                    timeout=settings.DATAMART_SHORT_TIMEOUT)
        except requests.exceptions.Timeout as err_obj:
            return err_resp('Request timed out. responded with: %s' % err_obj)

        print('end seach')

        if response.status_code != 200:
            return err_resp(response['reason'])

        response = response.json()
        print('json()!')

        if response['code'] != "0000":
            return err_resp(response['message'])

        # these fields are unnecessarily long
        num_datasets = len(response['data'])
        print('num_datasets', num_datasets)
        print('iterating through....')
        cnt = 0
        for dataset in response['data']:
            cnt += 1
            for variable in dataset['metadata']['variables']:
                if 'semantic_type' in variable:
                    del variable['semantic_type']
        print('iterating done....', cnt)
        return ok_resp(response['data'][:limit])

    @staticmethod
    def datamart_materialize(search_result):

        d3m_config = get_latest_d3m_config()
        if not d3m_config:
            user_msg = 'datamart_materialize failed. no d3m config'
            LOGGER.error(user_msg)
            return err_resp(user_msg)
        datamart_id = search_result['datamart_id']
        materialize_folderpath = os.path.join(d3m_config.temp_storage_root,
                                              'materialize',
                                              str(datamart_id))

        if os.path.exists(materialize_folderpath):
            response = None
        else:

            try:
                response = requests.get(\
                                get_isi_url() + '/new/materialize_data',
                                params={'datamart_id': datamart_id},
                                verify=False,
                                timeout=settings.DATAMART_LONG_TIMEOUT).json()
            except requests.exceptions.Timeout as err_obj:
                return err_resp('Request timed out. responded with: %s' % err_obj)

            if response['code'] != "0000":
                return err_resp(response['message'])

        return ok_resp(DatamartJobUtilISI.save(materialize_folderpath, response))

    @staticmethod
    def datamart_augment(user_workspace, data_path, search_result, left_columns, right_columns, exact_match=False, **kwargs):
        if not isinstance(user_workspace, UserWorkspace):
            return err_resp('user_workspace must be a UserWorkspace')

        d3m_config = get_latest_d3m_config()
        if not d3m_config:
            user_msg = 'datamart_augment failed. no d3m config'
            LOGGER.error(user_msg)
            return err_resp(user_msg)

        datamart_id = search_result['datamart_id']

        # ----------------------------
        # mock call
        # ----------------------------
        # 291780000
        """
        right_data = '291770000'
        left_columns= '[[2]]'
        right_columns = '[[6]]'
        exact_match = True
        data_path = '/Users/ramanprasad/Documents/github-rp/TwoRavens/ravens_volume/test_data/TR1_Greed_Versus_Grievance/TRAIN/dataset_TRAIN/tables/learningData.csv'
        """
        # ----------------------------

        print('inputs:')
        print({
            'right_data': datamart_id,
            'left_columns': left_columns,
            'right_columns': right_columns,
            'exact_match': exact_match
        })

        try:
            response = requests.post(\
                    get_isi_url() + '/new/join_data',
                    files={'left_data': open(data_path, 'r')},
                    data={'right_data': datamart_id,
                          'left_columns': left_columns,
                          'right_columns': right_columns,
                          'exact_match': exact_match},
                    verify=False,
                    timeout=settings.DATAMART_LONG_TIMEOUT).json()

        except requests.exceptions.Timeout as err_obj:
            return err_resp('Request timed out. responded with: %s' % err_obj)

        if response['code'] != "0000":
            return err_resp(response['message'])

        augment_folderpath = os.path.join(\
                            d3m_config.temp_storage_root,
                            'augment',
                            str(datamart_id))

        save_info = DatamartJobUtilISI.save(augment_folderpath, response)
        if not save_info.success:
            return err_resp(save_info.err_msg)

        # Async, start process of creating new dataset...
        #   - This will send a websocket message when process complete
        #   - Needs to be moved to celery queue
        #
        print("save_info.result_obj['data_path']", save_info.result_obj['data_path'])
        ndu_info = NewDatasetUtil.make_new_dataset_call(\
                             user_workspace.id,
                             save_info.result_obj['data_path'],
                             **dict(websocket_id=user_workspace.user.username))
        if not ndu_info.success:
            return err_resp(ndu_info.err_msg)

        return ok_resp('Augment is in process')


    @staticmethod
    def save(folderpath, response):
        data_filepath = os.path.join(folderpath, 'tables', 'learningData.csv')

        if os.path.exists(folderpath):
            data = []
            with open(data_filepath, 'r') as datafile:
                for i in range(100):
                    try:
                        data.append(next(datafile))
                    except StopIteration:
                        pass

            info_dict = {
                'data_path': data_filepath,
                'metadata_path': None,
                'data_preview': ''.join(data),
                'metadata': None
            }
            return ok_resp(info_dict)

        try:
            os.makedirs(os.path.dirname(data_filepath), exist_ok=True)
        except OSError:
            return err_resp('Failed to make directory: %s' % \
                            os.path.dirname(data_filepath))

        data_split = response['data'].split('\n')

        with open(data_filepath, 'w') as datafile:
            datafile.writelines(data_split)

        info_dict = {
            'data_path': data_filepath,
            'metadata_path': None,
            'data_preview': '\n'.join(data_split[:100]),
            'metadata': None
        }
        return ok_resp(info_dict)
