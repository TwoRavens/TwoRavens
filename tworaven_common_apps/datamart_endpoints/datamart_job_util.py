import json
import zipfile
from io import BytesIO

import pandas as pd
from tworaven_apps.data_prep_utils.new_dataset_util import NewDatasetUtil
from tworaven_apps.user_workspaces.models import UserWorkspace
from tworaven_apps.configurations.utils import get_latest_d3m_config
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)
from tworaven_common_apps.datamart_endpoints.models import (DATAMART_ISI_URL,
                                                            DATAMART_NYU_URL,
                                                            cached_response, cached_response_baseball)

import requests
import logging
import os

LOGGER = logging.getLogger(__name__)

PREVIEW_SIZE = 100


class DatamartJobUtilISI(object):

    @staticmethod
    def datamart_scrape(url):

        response = requests.post(
            DATAMART_ISI_URL + '/new/get_metadata_extract_links',
            data=json.dumps({'url': url}),
            headers={'Content-type': 'application/json'},
            verify=False)

        if response.status_code != 200:
            return err_resp('Datamart responded with: ' + response.reason)

        response = response.json()

        if response['code'] != '0000':
            return err_resp(response['message'])

        return ok_resp(response['data'])

    @staticmethod
    def datamart_get_metadata(data):
        response = requests.post(
            DATAMART_ISI_URL + '/new/get_metadata_single_file',
            data=data,
            headers={'Content-type': 'application/json'},
            verify=False)

        if response.status_code != 200:
            return err_resp('Datamart responded with: ' + response.reason)

        response = response.json()

        if response['code'] != '0000':
            return err_resp(response['message'])

        return ok_resp(response['data'])

    @staticmethod
    def datamart_upload(indices):
        response = requests.post(
            DATAMART_ISI_URL + '/new/upload_metadata_list',
            data=indices,
            headers={'Content-type': 'application/json'},
            verify=False)

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

        response = requests.post(
            DATAMART_ISI_URL + '/new/search_data',
            params=params,
            files=files, verify=False)

        if response.status_code != 200:
            return err_resp(response['reason'])

        response = response.json()

        if response['code'] != "0000":
            return err_resp(response['message'])

        # these fields are unnecessarily long
        for dataset in response['data']:
            for variable in dataset['metadata']['variables']:
                if 'semantic_type' in variable:
                    del variable['semantic_type']

        return ok_resp(response['data'][:limit])

    @staticmethod
    def datamart_materialize(search_result):

        d3m_config = get_latest_d3m_config()
        if not d3m_config:
            user_msg = 'datamart_materialize failed. no d3m config'
            LOGGER.error(user_msg)
            return err_resp(user_msg)
        datamart_id = search_result['datamart_id']
        materialize_folderpath = os.path.join(d3m_config.temp_storage_root, 'materialize', str(datamart_id))

        if os.path.exists(materialize_folderpath):
            response = None
        else:
            response = requests.get(DATAMART_ISI_URL + '/new/materialize_data',
                                    params={'datamart_id': datamart_id},
                                    verify=False).json()

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

        response = requests.post(DATAMART_ISI_URL + '/new/join_data',
                                 files={'left_data': open(data_path, 'r')},
                                 data={
                                     'right_data': datamart_id,
                                     'left_columns': left_columns,
                                     'right_columns': right_columns,
                                     'exact_match': exact_match
                                 },
                                 verify=False).json()

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

# based on documentation here:
# https://gitlab.com/ViDA-NYU/datamart/datamart/blob/master/examples/rest-api-fifa2018_manofmatch.ipynb
class DatamartJobUtilNYU(object):

    @staticmethod
    def datamart_upload(data):
        response = requests.post(
            DATAMART_NYU_URL + '/new/upload_data',
            files={
                'file': ('config.json', data)
            }).json()

        print(response)
        if response['code'] != '0000':
            return err_resp(response['message'])

        return ok_resp(response['data'])

    @staticmethod
    def datamart_search(query, data_path=None, limit=False):
        payload = {'query': ('query.json', query)}

        if data_path and os.path.exists(data_path):
            payload['file'] = open(data_path, 'r')

        response = requests.post(
            DATAMART_NYU_URL + '/search',
            files=payload, stream=True)

        if response.status_code != 200:
            print(str(response))
            return err_resp('NYU Datamart internal server error')

        return ok_resp(response.json()['results'])

    @staticmethod
    def datamart_materialize(search_result):

        d3m_config = get_latest_d3m_config()
        if not d3m_config:
            user_msg = 'datamart_materialize failed. no d3m config'
            LOGGER.error(user_msg)
            return err_resp(user_msg)

        materialize_folderpath = os.path.join(
            d3m_config.temp_storage_root,
            'materialize', str(search_result['id']))

        if os.path.exists(materialize_folderpath):
            response = None
        else:
            response = requests.get(DATAMART_NYU_URL + '/download/' + str(search_result['id']),
                                    params={'format': 'd3m'}, stream=True)

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
        response = requests.post(DATAMART_NYU_URL + '/augment', files={
            'data': open(dataset_path, 'rb'),
            'task': ('task.json', json.dumps(search_result), 'application/json')
        }, stream=True)

        if response.status_code != 200:
            return err_resp('NYU Datamart internal server error')

        augment_folderpath = os.path.join(d3m_config.temp_storage_root, 'augment', str(search_result['id']))
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
