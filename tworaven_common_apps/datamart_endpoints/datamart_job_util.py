import json
import zipfile
from io import BytesIO

import pandas as pd

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
    def datamart_upload(data):
        response = requests.post(
            DATAMART_ISI_URL + '/new/upload_data',
            files={
                'file': ('index.json', data)
            }, verify=False).json()

        if response['code'] != '0000':
            return err_resp(response['message'])

        return ok_resp(response['data'])

    @staticmethod
    def datamart_search(query, data_path=None):
        # return ok_resp(json.loads(cached_response_baseball))

        payload = {'query': ('query.json', query)}

        if data_path and os.path.exists(data_path):
            payload['file'] = open(data_path, 'r')

        response = requests.post(
            DATAMART_ISI_URL + '/new/search_data',
            files=payload, verify=False).json()

        if response['code'] != "0000":
            return err_resp(response['message'])

        # these fields are unnecessarily long
        for dataset in response['data']:
            for variable in dataset['metadata']['variables']:
                if 'semantic_type' in variable:
                    del variable['semantic_type']
                if 'named_entity' in variable:
                    del variable['named_entity']

        return ok_resp(response['data'])

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
    def datamart_augment(data_path, search_result, left_columns, right_columns):

        d3m_config = get_latest_d3m_config()
        if not d3m_config:
            user_msg = 'datamart_materialize failed. no d3m config'
            LOGGER.error(user_msg)
            return err_resp(user_msg)

        datamart_id = search_result['datamart_id']

        response = requests.post(DATAMART_ISI_URL + '/new/join_data',
                                 files={'left_data': open(data_path, 'r')},
                                 data={
                                     'right_data': datamart_id,
                                     'left_columns': [left_columns],
                                     'right_columns': [right_columns]
                                 },
                                 verify=False).json()

        if response['code'] != "0000":
            return err_resp(response['message'])

        augment_folderpath = os.path.join(d3m_config.temp_storage_root, 'augment', str(datamart_id))
        return ok_resp(DatamartJobUtilISI.save(augment_folderpath, response))

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

            return {
                'data_path': data_filepath,
                'metadata_path': None,
                'data_preview': ''.join(data),
                'metadata': None
            }

        try:
            os.makedirs(os.path.dirname(data_filepath))
        except OSError:
            pass

        data_split = [i + '\n' for i in response['data'].split('\n')]

        with open(data_filepath, 'w') as datafile:
            datafile.writelines(data_split)

        return {
            'data_path': data_filepath,
            'metadata_path': None,
            'data_preview': '\n'.join(data_split[:100]),
            'metadata': None
        }


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
    def datamart_search(query, data_path=None):
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
            d3m_config['temp_storage_root'],
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

        response = requests.post(DATAMART_NYU_URL + '/augment', files={
            'data': dataset_path,
            'task': ('task.json', search_result, 'application/json')
        }, stream=True)

        if response.status_code != 200:
            return err_resp('NYU Datamart internal server error')

        augment_folderpath = os.path.join(d3m_config['temp_storage_root'], 'augment', str(id))
        return ok_resp(DatamartJobUtilNYU.save(augment_folderpath, response))

    @staticmethod
    def save(folderpath, response):

        if not os.path.exists(folderpath):
            with zipfile.ZipFile(BytesIO(response.content), 'r') as data_zip:
                data_zip.extractall(folderpath)

        metadata_path = os.path.join(folderpath, 'datasetDoc.json')
        data_path = DatamartJobUtilNYU.get_data_paths(metadata_path)[0]

        return {
            'data_path': data_path,
            'metadata_path': metadata_path,
            'data_preview': pd.read_csv(data_path, nrows=PREVIEW_SIZE),
            'metadata': json.load(open(metadata_path))
        }

    @staticmethod
    def get_data_paths(metadata_path):
        with open(metadata_path, 'r') as metadata_file:
            resources = json.load(metadata_file)['dataResources']

        return [
            os.path.join(os.path.basename(metadata_path), *resource['resPath'].split('/'))
            for resource in resources
        ]
