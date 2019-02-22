import json
from tworaven_apps.utils.json_helper import json_loads, json_dumps

from django.conf import settings
from tworaven_apps.user_workspaces.utils import get_latest_user_workspace

from tworaven_apps.data_prep_utils.new_dataset_util import NewDatasetUtil
from tworaven_apps.user_workspaces.models import UserWorkspace
from tworaven_apps.configurations.utils import get_latest_d3m_config
from tworaven_apps.utils.random_info import get_timestamp_string_readable
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)
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
        """Use endpoint: /new/get_metadata_single_file"""
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
    def datamart_search(query_str, data_path=None, limit=None):
        # TODO disable #debug
        # return ok_resp(json.loads(cached_response_baseball))
        # TODO: respect limit
        limit = 100

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
        files = {'query': ('query.json', formatted_json_info.result_obj)}

        #files = {'query': ('query.json', query)}
        if data_path and os.path.exists(data_path):
            files['file'] = open(data_path, 'r')

        params = {'return_named_entity': False}
        if limit:
            params['max_return_docs'] = limit

        print('start search')
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

        if response['code'] != "0000":
            return err_resp(response['message'])

        #num_datasets = len(response['data'])
        #print('num_datasets', num_datasets)
        #print('iterating through....')

        # these fields are unnecessarily long
        dataset_cnt = 0
        processed_datasets = []
        for dataset in response['data']:
            try:
                variable_data = dataset['metadata']['variables']
            except KeyError:
                continue    # skip to next record
            dataset_cnt += 1

            for variable in variable_data:
                if 'semantic_type' in variable:
                    del variable['semantic_type']
            processed_datasets.append(dataset)

        print('dataset_cnt', dataset_cnt)
        #print('processed_datasets', processed_datasets)

        if not processed_datasets:
            return err_resp('No datasets found. (%s)' % \
                            (get_timestamp_string_readable(),))

        # Normally, the data is sorted by score in descending order,
        # but just in case...
        #
        sorted_data = sorted(processed_datasets,    #response['data'],
                             key=lambda k: k['score'],
                             reverse=True)

        #print([ds['score'] for ds in sorted_data])

        return ok_resp(sorted_data[:limit])


    @staticmethod
    def datamart_materialize(user_workspace, search_result):
        """Materialize the dataset"""
        if not isinstance(user_workspace, UserWorkspace):
            return err_resp('user_workspace must be a UserWorkspace')

        datamart_id = search_result['datamart_id']
        materialize_folderpath = os.path.join(\
                                user_workspace.d3m_config.additional_inputs,
                                'materialize',
                                str(datamart_id))

        print('materialize_folderpath', materialize_folderpath)
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

        save_info = DatamartJobUtilISI.save_datamart_file(materialize_folderpath, response)
        if not save_info.success:
            return err_resp(save_info.err_msg)

        return ok_resp(save_info.result_obj)

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

        save_info = DatamartJobUtilISI.save_datamart_file(augment_folderpath, response)
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
    def save_datamart_file(folderpath, response):
        """Save materialize response as a file"""
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