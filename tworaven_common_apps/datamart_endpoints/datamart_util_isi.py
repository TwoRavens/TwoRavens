import json
from collections import OrderedDict
from tworaven_apps.utils.json_helper import json_loads, json_dumps
import os
from os.path import dirname, join, isfile
from django.conf import settings
from tworaven_apps.user_workspaces.utils import get_latest_user_workspace

from tworaven_apps.data_prep_utils.new_dataset_util import NewDatasetUtil
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
from tworaven_common_apps.datamart_endpoints.datamart_util_base import \
    (DatamartJobUtilBase,)

from tworaven_common_apps.datamart_endpoints import static_vals as dm_static
from tworaven_common_apps.datamart_endpoints.datamart_info_util import \
    (get_isi_url,
     get_nyu_url)
from tworaven_apps.behavioral_logs.log_entry_maker import LogEntryMaker
from tworaven_apps.behavioral_logs import static_vals as bl_static


import requests
import logging
import os

LOGGER = logging.getLogger(__name__)

PREVIEW_SIZE = 100


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
    def datamart_search(query_str, data_path=None, **kwargs):
        """Search the ISI datamart"""
        limit = kwargs.get('limit', 100)
        if not isinstance(limit, int):
            user_msg = ('The results limit must be an'
                        ' integer (datamart_search)')
            return err_resp(user_msg)


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

        # --------------------------------
        # (2a) Behavioral logging
        # --------------------------------
        isi_search_url = get_isi_url() + '/new/search_data'

        if 'user' in kwargs:
            log_data = dict(feature_id=f'POST|{isi_search_url}',
                            activity_l1=bl_static.L1_DATA_PREPARATION,
                            activity_l2=bl_static.L2_DATA_SEARCH,
                            path=isi_search_url)

            log_info = LogEntryMaker.create_datamart_entry(kwargs['user'], log_data)
            print('log_info', log_info)
            print('id', log_info.result_obj.id)
        try:
            print('isi_search_url', isi_search_url)
            response = requests.post(\
                    isi_search_url,
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
        LOGGER.info('-- atttempt to materialize ISI dataset --')
        if not isinstance(user_workspace, UserWorkspace):
            return err_resp('user_workspace must be a UserWorkspace')

        if not isinstance(search_result, dict):
            return err_resp('search_result must be a python dictionary')

        if not dm_static.KEY_ISI_DATAMART_ID in search_result:
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
        try:
            isi_materialize_url = get_isi_url() + '/new/materialize_data'
            print('isi_materialize_url', isi_materialize_url)
            response = requests.get(\
                        isi_materialize_url,
                        params={dm_static.KEY_ISI_DATAMART_ID: datamart_id},
                        verify=False,
                        timeout=settings.DATAMART_LONG_TIMEOUT)
        except requests.exceptions.Timeout as err_obj:
            return err_resp('Request timed out. responded with: %s' % err_obj)

        if response.status_code != 200:
            user_msg = (f'Materialize failed.  Status code:'
                        f' {response.status_code}.  response: {response.text}')
            return err_resp(user_msg)

        resp_json = response.json()

        if ('code' not in resp_json) or (resp_json['code'] != "0000"):
            user_msg = 'Error message from datamart:'
            if 'message' in resp_json:
                user_msg += ' %s' % resp_json['message']
                return err_resp(user_msg)

        if not dm_static.KEY_DATA in resp_json:
            user_msg = (f'Key "{dm_static.KEY_DATA}" not found in the'
                        f' materialize response')
            return err_resp(user_msg)

        LOGGER.info('(3) Download complete.  Save file')

        # -----------------------------------------
        # Save the downloaded file
        # -----------------------------------------
        save_info = DatamartJobUtilISI.save_datamart_file(\
                        dest_filepath,
                        resp_json[dm_static.KEY_DATA])

        if not save_info.success:
            return err_resp(save_info.err_msg)

        LOGGER.info('(4) File saved')

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



    @staticmethod
    def datamart_augment(user_workspace, data_path, search_result, left_columns, right_columns, exact_match=False, **kwargs):
        if not isinstance(user_workspace, UserWorkspace):
            return err_resp('user_workspace must be a UserWorkspace')

        if not dm_static.KEY_ISI_DATAMART_ID in search_result:
            user_msg = (f'"search_result" did not contain'
                        f' "{dm_static.KEY_ISI_DATAMART_ID}" key')
            return err_resp(user_msg)

        if not isfile(data_path):
            user_msg = f'Original data file not found: {data_path}'
            return err_resp(user_msg)

        datamart_id = search_result[dm_static.KEY_ISI_DATAMART_ID]

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

        dest_filepath_info = DatamartJobUtilISI.get_output_filepath(\
                                    user_workspace,
                                    f'{datamart_id}-{get_timestamp_string()}',
                                    dir_type=dm_static.KEY_AUGMENT)

        if not dest_filepath_info.success:
            return err_resp(dest_filepath_info.err_msg)

        augment_filepath = dest_filepath_info.result_obj


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
                    timeout=settings.DATAMART_VERY_LONG_TIMEOUT)

        except requests.exceptions.Timeout as err_obj:
            return err_resp('Request timed out. responded with: %s' % err_obj)

        if not response.status_code == 200:
            user_msg = (f'Augment response failed with status code: '
                        f'{response.status_code}.')
            return err_resp(user_msg)

        try:
            resp_json = response.json()
            print('resp_json.keys()', resp_json.keys())
        except ValueError as err_obj:
            user_msg = (f'Augment response failed.  Could not convert to JSON.'
                        f' Error: {err_obj}')
            return err_resp(user_msg)

        if resp_json['code'] != "0000":
            return err_resp(resp_json['message'])

        save_info = DatamartJobUtilISI.save_datamart_file(\
                        augment_filepath,
                        resp_json['data'])

        if not save_info.success:
            return err_resp(save_info.err_msg)

        augment_new_filepath = save_info.result_obj
        print("augment_new_filepath", augment_new_filepath)

        dcr = DuplicateColumnRemover(augment_new_filepath)
        if dcr.has_error():
            user_msg = (f'Augment error during column checks: '
                        f'{dcr.get_error_message()}')
            return err_resp(user_msg)

        return ok_resp(augment_new_filepath)


    @staticmethod
    def save_datamart_file(data_filepath, file_data):
        """Save materialize response as a file"""
        if not file_data:
            return err_resp('"file_data" must be specified')

        # create directory if it doesn't exist
        #       (Ok if the directory already exists)
        #
        dir_info = create_directory(dirname(data_filepath))
        if not dir_info.success:
            return err_resp(dir_info.err_msg)

        # Write the data to the file
        #
        #data_split = file_data.split('\n')

        try:
            with open(data_filepath, 'w') as datafile:
                datafile.write(file_data) #_split)
        except OSError as err_obj:
            user_msg = f'Failed to write file "{data_filepath}". Error: %s' % \
                (err_obj,)
            return err_resp(user_msg)

        return ok_resp(data_filepath)
