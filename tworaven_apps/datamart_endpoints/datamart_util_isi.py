import json
from collections import OrderedDict
from tworaven_apps.utils.json_helper import json_loads, json_dumps
import os
from os.path import dirname, join, isfile
from django.conf import settings
from tworaven_apps.user_workspaces.utils import get_latest_user_workspace

from tworaven_apps.user_workspaces.models import UserWorkspace
from tworaven_apps.data_prep_utils.duplicate_column_remover import DuplicateColumnRemover
from tworaven_apps.configurations.utils import get_latest_d3m_config
from tworaven_apps.utils.random_info import \
    (get_timestamp_string,
     get_timestamp_string_readable)
from tworaven_apps.utils.file_util import \
    (create_directory, read_file_rows)
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)
from tworaven_apps.utils.dict_helper import (clear_dict,)
from tworaven_apps.datamart_endpoints.datamart_util_base import \
    (DatamartJobUtilBase,)

from tworaven_apps.datamart_endpoints import static_vals as dm_static
from tworaven_apps.datamart_endpoints.datamart_info_util import \
    (get_isi_url,
     get_nyu_url)
from tworaven_apps.behavioral_logs.log_entry_maker import LogEntryMaker
from tworaven_apps.behavioral_logs import static_vals as bl_static
from tworaven_apps.behavioral_logs.log_entry_maker import LogEntryMaker
from tworaven_apps.behavioral_logs import static_vals as bl_static


import requests
import logging
import os

LOGGER = logging.getLogger(__name__)

PREVIEW_SIZE = 100
USE_CACHED_SEARCH = False   # Only True if testing!


class DatamartJobUtilISI(DatamartJobUtilBase):

    def get_datamart_source(self):
        """Return the datamart.  e.g. ISI, NYU, etc"""
        return dm_static.DATAMART_ISI_NAME

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
        """Index a user submitted dataset"""
        print('datamart_upload, index', index)
        try:
            response = requests.post(
                get_isi_url() + '/upload',
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
    def search_with_dataset(dataset_path, query=None, **kwargs):
        """Search the datamart using a dataset"""
        if not isfile(dataset_path):
            user_msg = ('The dataset file could not be found.')
            return err_resp(user_msg)

        search_url = get_isi_url() + '/search'

        # --------------------------------
        # Behavioral logging
        # --------------------------------
        if 'user_workspace' in kwargs:
            log_data = dict(feature_id=f'POST|by-dataset|{search_url}',
                            activity_l1=bl_static.L1_DATA_PREPARATION,
                            activity_l2=bl_static.L2_DATA_SEARCH,
                            path=search_url)

            LogEntryMaker.create_datamart_entry(kwargs['user_workspace'], log_data)
        # --------------------------------

        # --------------------------------
        # Query the datamart
        # --------------------------------

        query_json = None
        if query:
            formatted_json_info = json_dumps(query)
            if not formatted_json_info.success:
                return err_resp('Failed to convert query to JSON. %s' % \
                                formatted_json_info.err_msg)
            query_json = formatted_json_info.result_obj

        print(f'formatted query: {query_json}')

        limit = kwargs.get('limit', 20)
        if not isinstance(limit, int):
            user_msg = ('The results limit must be an'
                        ' integer (datamart_search)')
            return err_resp(user_msg)

        if not USE_CACHED_SEARCH:
            try:
                with open(dataset_path, 'rb') as dataset_p:
                    try:
                        response = requests.post(
                            search_url,
                            params={'max_return_docs': limit},
                            json={'query_json': query_json},
                            files={'data': dataset_p},
                            verify=False,
                            timeout=settings.DATAMART_LONG_TIMEOUT)

                    except requests.exceptions.Timeout as err_obj:
                        return err_resp('Request timed out. responded with: %s' % err_obj)

            except IOError as err_obj:
                user_msg = (f'Failed to search with the dataset file.'
                            f'  Technical: {err_obj}')
                return err_resp(user_msg)

            if response.status_code != 200:
                print(str(response))
                print(response.text)
                return err_resp(('ISI Datamart internal server error.'
                                 ' status_code: %s') % response.status_code)

            response_json = response.json()
        else:
            import json
            print('loading file')
            response_json = json.load(open('/datamart_endpoints/cached_isi_search_response.json', 'r'))

        #print('response_json', response_json)

        if not 'results' in response_json:
            return err_resp('No datasets found. (%s)' % \
                            (get_timestamp_string_readable(time_only=True),))

        json_results = response_json['results']

        print('num results: ', len(json_results))

        return ok_resp(json_results)


    @staticmethod
    def datamart_search(query_dict=None, dataset_path=None, **kwargs):
        """Search the ISI datamart"""

        if query_dict is None and dataset_path is None:
            return err_resp('Either a query or dataset path must be supplied.')

        if query_dict is not None and not isinstance(query_dict, dict):
            user_msg = ('There is something wrong with the search parameters.'
                        ' Please try again. (expected a dictionary)')
            return err_resp(user_msg)

        search_url = get_isi_url() + '/search'

        # --------------------------------
        # Behavioral logging
        # --------------------------------
        if 'user' in kwargs:
            log_data = dict(feature_id=f'POST|{search_url}',
                            activity_l1=bl_static.L1_DATA_PREPARATION,
                            activity_l2=bl_static.L2_DATA_SEARCH,
                            path=search_url)

            LogEntryMaker.create_datamart_entry(kwargs['user'], log_data)
        # --------------------------------

        # --------------------------------
        # Query the datamart
        # --------------------------------

        query_json = None
        if query_dict:
            formatted_json_info = json_dumps(query_dict)
            if not formatted_json_info.success:
                return err_resp('Failed to convert query to JSON. %s' % \
                                formatted_json_info.err_msg)
            query_json = formatted_json_info.result_obj

        print(f'formatted query: {query_json}')

        if dataset_path:
            limit = kwargs.get('limit', 20)
            if not isinstance(limit, int):
                user_msg = ('The results limit must be an'
                            ' integer (datamart_search)')
                return err_resp(user_msg)

            if not USE_CACHED_SEARCH:
                try:
                    with open(dataset_path, 'rb') as dataset_p:
                        try:
                            response = requests.post(
                                search_url,
                                params={'max_return_docs': limit},
                                json={'query_json': query_json},
                                files={'data': dataset_p},
                                verify=False,
                                timeout=settings.DATAMART_LONG_TIMEOUT)

                        except requests.exceptions.Timeout as err_obj:
                            return err_resp('Request timed out. responded with: %s' % err_obj)

                except IOError as err_obj:
                    user_msg = (f'Failed to search with the dataset file.'
                                f'  Technical: {err_obj}')
                    return err_resp(user_msg)

        else:
            raise NotImplementedError('Augmentations on results without a dataset path are not implemented by ISI.')

        if not USE_CACHED_SEARCH:
            if response.status_code != 200:
                return err_resp(response['reason'])

            response_json = response.json()

            if response_json['code'] != "0000":
                return err_resp(response_json['message'])

        else:
            import json
            print('loading file')
            response_json = json.load(open('/datamart_endpoints/cached_isi_search_response.json', 'r'))
        json_results = response_json['search_results']['results']

        #num_datasets = len(response['data'])
        #print('num_datasets', num_datasets)
        #print('iterating through....')

        sorted_data = sorted(json_results,    #response['data'],
                             key=lambda k: k['score'],
                             reverse=True)

        #print([ds['score'] for ds in sorted_data])

        return ok_resp(sorted_data[:limit])

    @staticmethod
    def datamart_materialize(user_workspace, search_result):
        """Materialize the dataset"""
        LOGGER.info('-- atttempt to materialize ISI dataset --')
        if not isinstance(user_workspace, UserWorkspace):
            return err_resp('user_workspace must be a UserWorkspace')

        if not isinstance(search_result, dict):
            return err_resp('search_result must be a python dictionary')

        if dm_static.KEY_ISI_DATAMART_ID not in search_result:
            user_msg = (f'"search_result" did not contain'
                        f' "{dm_static.KEY_ISI_DATAMART_ID}" key')
            return err_resp(user_msg)

        # -----------------------------------------
        # Format output file path
        # -----------------------------------------
        LOGGER.info('(1) build path')
        datamart_id = search_result[dm_static.KEY_ISI_DATAMART_ID]

        dest_filepath_info = DatamartJobUtilISI.get_output_filepath(\
                                        user_workspace,
                                        datamart_id,
                                        dir_type='materialize')

        if not dest_filepath_info.success:
            return err_resp(dest_filepath_info.err_msg)

        dest_filepath = dest_filepath_info.result_obj

        LOGGER.info('(2) Download file')

        # -----------------------------------------
        # Has the file already been downloaded?
        # -----------------------------------------
        print('dest_filepath', dest_filepath)
        if isfile(dest_filepath):
            LOGGER.info('(2a) file already downloaded')

            # Get preview rows
            #
            preview_info = read_file_rows(dest_filepath, dm_static.NUM_PREVIEW_ROWS)
            if not preview_info.success:
                user_msg = (f'Failed to retrieve preview rows.'
                            f' {preview_info.err_msg}')
                return err_resp(user_msg)

            info_dict = DatamartJobUtilISI.format_materialize_response(\
                            datamart_id, dm_static.DATAMART_ISI_NAME,
                            dest_filepath, preview_info)

            return ok_resp(info_dict)

        # -----------------------------------------
        # Download the file
        # -----------------------------------------
        # can this be streamed to a file?

        LOGGER.info('(2b) attempting download')

        # ----------------------------
        # Behavioral logging
        # ----------------------------
        isi_materialize_url = get_isi_url() + f'/download/{datamart_id}'

        log_data = dict(feature_id=f'GET|{isi_materialize_url}',
                        activity_l1=bl_static.L1_DATA_PREPARATION,
                        activity_l2=bl_static.L2_DATA_DOWNLOAD,
                        path=isi_materialize_url)

        LogEntryMaker.create_datamart_entry(user_workspace, log_data)

        try:
            print('isi_materialize_url', isi_materialize_url)
            response = requests.get(\
                        isi_materialize_url,
                        params={'id': datamart_id, 'format': 'd3m'},
                        verify=False,
                        timeout=settings.DATAMART_LONG_TIMEOUT)
        except requests.exceptions.Timeout as err_obj:
            return err_resp('Request timed out. responded with: %s' % err_obj)

        if response.status_code != 200:
            user_msg = (f'Materialize failed.  Status code:'
                        f' {response.status_code}.  response: {response.text}')
            return err_resp(user_msg)

        LOGGER.info('(3) Download complete.  Save file')

        # -----------------------------------------
        # Save the downloaded file
        # -----------------------------------------
        save_info = DatamartJobUtilISI.save_datamart_file(\
                        dest_filepath,
                        response)

        if not save_info.success:
            return err_resp(save_info.err_msg)
        save_info = save_info.result_obj

        # -----------------------------------------
        # Retrieve preview rows and return response
        # -----------------------------------------

        LOGGER.info('(4) File saved')

        # preview rows
        #
        preview_info = read_file_rows(save_info[dm_static.KEY_DATA_PATH],
                                      dm_static.NUM_PREVIEW_ROWS)
        if not preview_info.success:
            user_msg = (f'Failed to retrieve preview rows.'
                        f' {preview_info.err_msg}')
            return err_resp(user_msg)

        # Format/return reponse
        #
        info_dict = DatamartJobUtilISI.format_materialize_response(
            datamart_id,
            dm_static.DATAMART_ISI_NAME,
            save_info[dm_static.KEY_DATA_PATH],
            preview_info,
            **save_info)

        return ok_resp(info_dict)

    @staticmethod
    def datamart_augment(user_workspace, data_path, search_result, exact_match=False, **kwargs):
        if not isinstance(user_workspace, UserWorkspace):
            return err_resp('user_workspace must be a UserWorkspace')

        if not isfile(data_path):
            user_msg = f'Original data file not found: {data_path}'
            return err_resp(user_msg)

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
        LOGGER.info('(1) build path')
        datamart_id = search_result[dm_static.KEY_ISI_DATAMART_ID]

        dest_filepath_info = DatamartJobUtilISI.get_output_filepath(
            user_workspace,
            f'{datamart_id}-{get_timestamp_string()}',
            dir_type=dm_static.KEY_AUGMENT)

        if not dest_filepath_info.success:
            return err_resp(dest_filepath_info.err_msg)

        augment_filepath = dest_filepath_info.result_obj

        augment_url = get_isi_url() + '/augment'

        # ----------------------------
        # Behavioral logging
        # ----------------------------
        log_data = dict(feature_id=f'POST|{augment_url}',
                        activity_l1=bl_static.L1_DATA_PREPARATION,
                        activity_l2=bl_static.L2_DATA_AUGMENT,
                        path=augment_url)

        LogEntryMaker.create_datamart_entry(user_workspace, log_data)
        # ----------------------------

        try:
            response = requests.post(
                augment_url,
                data={
                    'task': json.dumps(search_result),
                    'format': 'd3m'
                },
                files={'data': open(data_path, 'r')},
                verify=False,
                timeout=settings.DATAMART_VERY_LONG_TIMEOUT)

        except requests.exceptions.Timeout as err_obj:
            return err_resp('Request timed out. responded with: %s' % err_obj)

        if not response.status_code == 200:
            user_msg = (f'ISI Augment response failed with status code: '
                        f'{response.status_code}.')
            return err_resp(user_msg)

        save_info = DatamartJobUtilISI.save_datamart_file(\
                        augment_filepath,
                        response)

        if not save_info.success:
            return err_resp(save_info.err_msg)
        save_info = save_info.result_obj

        # -----------------------------------------
        # Retrieve preview rows and return response
        # -----------------------------------------

        # preview rows
        #
        preview_info = read_file_rows(save_info[dm_static.KEY_DATA_PATH],
                                      dm_static.NUM_PREVIEW_ROWS)
        if not preview_info.success:
            user_msg = (f'Failed to retrieve preview rows.'
                        f' {preview_info.err_msg}')
            return err_resp(user_msg)

        # Format/return reponse
        #
        info_dict = DatamartJobUtilISI.format_materialize_response( \
            datamart_id,
            dm_static.DATAMART_ISI_NAME,
            save_info[dm_static.KEY_DATA_PATH],
            preview_info,
            **save_info)

        return ok_resp(info_dict)
