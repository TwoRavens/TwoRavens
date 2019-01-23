from tworaven_apps.configurations.utils import get_latest_d3m_config
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)
from tworaven_apps.datamart_endpoints.models import DATAMART_URL

import requests
import logging
import os

LOGGER = logging.getLogger(__name__)


class DatamartJobUtil(object):
    @staticmethod
    def datamart_search(query):
        response = requests.post(DATAMART_URL + '/new/search_data', files={
            'query': ('filename.csv', query)
        }, verify=False).json()

        if response['code'] != "0000":
            return err_resp(response['message'])

        return ok_resp(response['data'])

    @staticmethod
    def datamart_materialize(index, datamart_id):

        d3m_config = get_latest_d3m_config()
        if not d3m_config:
            user_msg = 'datamart_materialize failed. no d3m config'
            LOGGER.error(user_msg)
            return err_resp(user_msg)

        response = requests.get(DATAMART_URL + '/new/materialize_data', params={'index': index},
                                verify=False).json()

        if response['code'] != "0000":
            return err_resp(response['message'])

        datamart_folderpath = os.path.join(d3m_config.temp_storage_root, 'datamart')
        datamart_filepath = os.path.join(datamart_folderpath, str(datamart_id) + '.csv')

        try:
            os.mkdir(datamart_folderpath)
        except OSError:
            pass

        data_split = response['data'].split('\n')

        with open(datamart_filepath, 'w') as datafile:
            datafile.writelines(data_split)

        return ok_resp({
            'data_path': datamart_filepath,
            'data_preview': [line.split(',') for line in data_split[:100]]
        })

    @staticmethod
    def datamart_join():
        response = requests.post(DATAMART_URL + '/augment/default_join', data={},
                                 verify=False).json()

        print('join response')
        print(response)

        if response['code'] != "0000":
            return err_resp(response['message'])

        return ok_resp(response['data'])
