"""Common methods for DatamartJobUtilISI and DatamartJobUtilNYU"""
import zipfile
from abc import ABC, abstractmethod

from collections import OrderedDict
from io import BytesIO

import os
from os.path import dirname, join, isfile
from django.conf import settings

from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)
from tworaven_apps.user_workspaces.models import UserWorkspace

from tworaven_apps.datamart_endpoints import static_vals as dm_static
from tworaven_apps.utils.file_util import create_directory


class DatamartJobUtilBase(ABC):
    """Base class for other DatamartJobUtil objects"""

    @abstractmethod
    def get_datamart_source(self):
        """Return the datamart.  e.g. ISI, NYU, etc"""
        return

    @staticmethod
    def get_output_filepath(user_workspace, datamart_id, dir_type='materialize'):
        """Create the output filepath for materialze and augment"""
        if not isinstance(user_workspace, UserWorkspace):
            return err_resp('user_workspace must be a UserWorkspace')
        if not datamart_id:
            return err_resp('"datamart_id" must be set')

        output_path = join(user_workspace.d3m_config.additional_inputs,
                           dir_type,
                           str(datamart_id),
                           'learningData.csv')

        return ok_resp(output_path)

    @staticmethod
    def get_output_folderpath(user_workspace, datamart_id, dir_type='materialize'):
        """Create the output filepath for materialze and augment"""

        output_filepath_info = DatamartJobUtilBase.get_output_filepath(\
                            user_workspace, datamart_id, dir_type)

        if output_filepath_info.success:
            return ok_resp(dirname(output_filepath_info.result_obj))

        # Error: this is an err_resp so return it
        return output_filepath_info


    @staticmethod
    def format_materialize_response(datamart_id, datamart_name,
                                    dest_filepath, preview_info, **kwargs):
        """Return the materialize response"""

        datasetdoc_path = kwargs.get(dm_static.KEY_DATASET_DOC_PATH)

        info_dict = OrderedDict({ \
                    dm_static.KEY_ISI_DATAMART_ID: datamart_id,
                    'source_mode': datamart_name,
                    dm_static.KEY_DATA_PATH: dest_filepath,
                    'filesize': os.stat(dest_filepath).st_size,
                    'metadata_path': None,

                    # Used if materialize also includes a datasetdoc
                    dm_static.KEY_DATASET_DOC_PATH: kwargs.get(dm_static.KEY_DATASET_DOC_PATH),
                    'data_preview': ''.join(preview_info.result_obj),
                    'metadata': None})

        return info_dict



    @staticmethod
    def save_datamart_file(data_foldername, file_data, **kwargs):
        """Save materialize response as a file.  This should be a .zip
        containing both a datafile and a datasetDoc.json"""
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

        # Make sure that learningData.csv exists
        #
        data_filepath = join(data_foldername, 'tables', 'learningData.csv')
        if not isfile(data_filepath):
            user_msg = ('File "learningData.csv" not found in expected'
                        'place: %s') % data_filepath
            return err_resp(user_msg)

        # Make sure that the datasetDoc.json exists
        #
        datasetdoc_path = join(data_foldername, 'datasetDoc.json')
        if not isfile(datasetdoc_path):
            user_msg = ('File datasetDoc.json not found in'
                        ' expected place: %s') % datasetdoc_path
            return err_resp(user_msg)

        expected_filepath = kwargs.get('expected_filepath', None)
        if expected_filepath:
            if expected_filepath != data_filepath:
                user_msg = 'File not found on expected path: %s' % expected_filepath
                return err_resp(user_msg)

        return ok_resp({dm_static.KEY_DATA_PATH: data_filepath,
                        dm_static.KEY_DATASET_DOC_PATH: datasetdoc_path})
