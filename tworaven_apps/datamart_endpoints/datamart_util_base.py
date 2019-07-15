"""Common methods for DatamartJobUtilISI and DatamartJobUtilNYU"""
from abc import ABC, abstractmethod

import json
from collections import OrderedDict
from tworaven_apps.utils.json_helper import json_loads, json_dumps
import os
from os.path import dirname, join, isfile
from django.conf import settings

from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)
from tworaven_apps.user_workspaces.models import UserWorkspace

from tworaven_apps.datamart_endpoints import static_vals as dm_static

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
