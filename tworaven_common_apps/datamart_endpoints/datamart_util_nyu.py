import json
import zipfile
from io import BytesIO
from os.path import dirname, join, isfile

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
    (DATAMART_NYU_NAME,
     KEY_NYU_DATAMART_ID,
     KEY_DATA,
     KEY_AUGMENT,
     KEY_MATERIALIZE,
     NUM_PREVIEW_ROWS,
     cached_response,
     cached_response_baseball)
from tworaven_common_apps.datamart_endpoints.datamart_info_util import \
    (get_nyu_url,)
from tworaven_common_apps.datamart_endpoints.datamart_util_base import \
    (DatamartJobUtilBase,)
from tworaven_apps.utils.file_util import \
    (create_directory, read_file_rows)
import requests
import logging
import os

LOGGER = logging.getLogger(__name__)

PREVIEW_SIZE = 100


# based on documentation here:
# https://gitlab.com/ViDA-NYU/datamart/datamart/blob/master/examples/rest-api-fifa2018_manofmatch.ipynb
class DatamartJobUtilNYU(DatamartJobUtilBase):

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
        """Materialize an NYU dataset!"""
        LOGGER.info('-- atttempt to materialize NYU dataset --')
        if not isinstance(user_workspace, UserWorkspace):
            return err_resp('user_workspace must be a UserWorkspace')

        if not isinstance(search_result, dict):
            return err_resp('search_result must be a python dictionary')

        print('\nsearch_result', search_result)
        print('\nsearch_result.keys()', search_result.keys())
        if not KEY_NYU_DATAMART_ID in search_result:
            user_msg = (f'"search_result" did not contain'
                        f' "{KEY_NYU_DATAMART_ID}" key')
            return err_resp(user_msg)

        # -----------------------------------------
        # Format output file path
        # -----------------------------------------
        LOGGER.info('(1) build path')
        datamart_id = search_result[KEY_NYU_DATAMART_ID]

        dest_folderpath_info = DatamartJobUtilNYU.get_output_folderpath(\
                                        user_workspace,
                                        datamart_id,
                                        dir_type=KEY_MATERIALIZE)

        if not dest_folderpath_info.success:
            return err_resp(dest_folderpath_info.err_msg)

        # Set the output folder
        #
        dest_folderpath = dest_folderpath_info.result_obj

        # Set the output file
        #
        dest_filepath = join(dest_folderpath, 'tables', 'learningData.csv')

        LOGGER.info('(2) Download file')

        # -----------------------------------------
        # Has the file already been downloaded?
        # -----------------------------------------
        print('dest_filepath', dest_filepath)
        if isfile(dest_filepath):
            LOGGER.info('(2a) file already downloaded')

            # Get preview rows
            #
            preview_info = read_file_rows(dest_filepath, NUM_PREVIEW_ROWS)
            if not preview_info.success:
                user_msg = (f'Failed to retrieve preview rows.'
                            f' {preview_info.err_msg}')
                return err_resp(user_msg)

            info_dict = DatamartJobUtilNYU.format_materialize_response(\
                            datamart_id, DATAMART_NYU_NAME,
                            dest_filepath, preview_info)

            return ok_resp(info_dict)


        # -----------------------------------------
        # Download the file
        # -----------------------------------------
        # can this be streamed to a file?

        LOGGER.info('(2b) attempting download')

        if not 'id' in search_result:
            user_msg = f'search_result did not contain the key "id"'
            return err_resp(user_msg)

        download_url = f"{get_nyu_url()}/download/{search_result['id']}"

        try:
            response = requests.get(\
                        download_url,
                        params={'format': 'd3m'},
                        verify=False,
                        stream=True,
                        timeout=settings.DATAMART_LONG_TIMEOUT)
        except requests.exceptions.Timeout as err_obj:
            return err_resp('Request timed out. responded with: %s' % err_obj)

        if response.status_code != 200:
            user_msg = (f'Materialize failed.  Status code:'
                        f' {response.status_code}.  response: {response.text}')
            return err_resp(user_msg)

        save_info = DatamartJobUtilNYU.save_datamart_file(\
                                    dest_folderpath,
                                    response,
                                    expected_filepath=dest_filepath)

        if not save_info.success:
            return err_resp(save_info.err_msg)

        # Get preview rows
        #
        preview_info = read_file_rows(dest_filepath, NUM_PREVIEW_ROWS)
        if not preview_info.success:
            user_msg = (f'Failed to retrieve preview rows.'
                        f' {preview_info.err_msg}')
            return err_resp(user_msg)

        info_dict = DatamartJobUtilNYU.format_materialize_response(\
                        datamart_id, DATAMART_NYU_NAME,
                        dest_filepath, preview_info)

        return ok_resp(info_dict)



    @staticmethod
    def datamart_augment(user_workspace, dataset_path, search_result, **kwargs):
        """Augment the file via the NYU API"""
        if not isinstance(user_workspace, UserWorkspace):
            return err_resp('user_workspace must be a UserWorkspace')

        # Make sure the soure file exitss
        #
        if not isfile(dataset_path):
            user_msg = f'Original data file not found: {dataset_path}'
            return err_resp(user_msg)

        # Make sure the NYU datamart id is in the search_result
        #
        if not KEY_NYU_DATAMART_ID in search_result:
            user_msg = (f'"search_result" did not contain'
                        f' "{KEY_NYU_DATAMART_ID}" key')
            return err_resp(user_msg)
        datamart_id = search_result[KEY_NYU_DATAMART_ID]

        # Ready the query parameters
        #
        search_result['join_columns'] = [['INSTNM', 'INSTNM']]
        search_result_str = json.dumps(search_result)
        print('search_result_str', search_result_str)

        files_info = dict(data=open(dataset_path, 'rb'),
                          task=('task.json',
                                search_result_str,
                                'application/json'))

        # Make the augment request
        #
        augment_url = f"{ get_nyu_url() }/augment"

        try:
            response = requests.post(augment_url,
                                     files=files_info,
                                     stream=True,
                                     timeout=settings.DATAMART_LONG_TIMEOUT)
        except requests.exceptions.Timeout as err_obj:
            return err_resp('Request timed out. responded with: %s' % err_obj)

        # Any errors?
        #
        if response.status_code != 200:
            user_msg = (f'NYU Datamart internal server error. Status code:'
                        f' "{response.status_code}"')
            print(response.content)

            return err_resp('NYU Datamart internal server error')

        # Write the augmented file
        #
        dest_folderpath_info = DatamartJobUtilNYU.get_output_folderpath(\
                                        user_workspace,
                                        datamart_id,
                                        dir_type=KEY_AUGMENT)

        if not dest_folderpath_info.success:
            return err_resp(dest_folderpath_info.err_msg)


        augment_folderpath = dest_folderpath_info.result_obj

        # Set the output file
        #
        dest_filepath = join(augment_folderpath, 'tables', 'learningData.csv')


        save_info = DatamartJobUtilNYU.save_datamart_file(\
                                    augment_folderpath,
                                    response,
                                    expected_filepath=dest_filepath)

        if not save_info.success:
            return err_resp(save_info.err_msg)

        # -----------------------------------------
        # Retrieve preview rows and return response
        # -----------------------------------------

        # preview rows
        #
        preview_info = read_file_rows(dest_filepath, NUM_PREVIEW_ROWS)
        if not preview_info.success:
            user_msg = (f'Failed to retrieve preview rows.'
                        f' {preview_info.err_msg}')
            return err_resp(user_msg)

        # Format/return reponse
        #
        info_dict = DatamartJobUtilNYU.format_materialize_response(\
                        datamart_id, DATAMART_NYU_NAME,
                        dest_filepath, preview_info)

        return ok_resp(info_dict)




    @staticmethod
    def save_datamart_file(data_foldername, file_data, **kwargs):
        """Save materialize response as a file"""
        if not file_data:
            return err_resp('"file_data" must be specified')

        # create directory if it doesn't exist
        #       (Ok if the directory already exists)
        #
        dir_info = create_directory(data_foldername)
        if not dir_info.success:
            return err_resp(dir_info.err_msg)

        try:
            with zipfile.ZipFile(BytesIO(file_data.content), 'r') as data_zip:
                data_zip.extractall(data_foldername)
        except RuntimeError as err_obj:
            user_msg = (f'Failed to extract zip to "{data_foldername}".'
                        f' Error: %s') % (err_obj,)
            return err_resp(user_msg)

        data_filepath = join(data_foldername, 'tables', 'learningData.csv')
        if not isfile(data_filepath):
            user_msg = 'File not found in expected place: %s' % data_filepath
            return err_resp(user_msg)

        expected_filepath = kwargs.get('expected_filepath', None)
        if expected_filepath:
            if expected_filepath != data_filepath:
                user_msg = 'File not found on expected path: %s' % expected_filepath
                return err_resp(user_msg)

        return ok_resp(data_filepath)


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
