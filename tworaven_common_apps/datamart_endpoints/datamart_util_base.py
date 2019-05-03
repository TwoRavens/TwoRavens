"""Common methods for DatamartJobUtilISI and DatamartJobUtilNYU"""

import json
from collections import OrderedDict
from tworaven_apps.utils.json_helper import json_loads, json_dumps
import os
from os.path import dirname, join, isfile
from django.conf import settings

from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)
from tworaven_apps.user_workspaces.models import UserWorkspace
from tworaven_common_apps.datamart_endpoints.static_vals import \
    (DATAMART_ISI_NAME,
     DATAMART_NYU_NAME,
     KEY_ISI_DATAMART_ID,
     KEY_DATA,
     NUM_PREVIEW_ROWS)

class DatamartJobUtilBase(object):
    """Base class for other DatamartJobUtil objects"""

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
    def format_materialize_response(datamart_id, datamart_name, dest_filepath, preview_info):
        """Return the materialize response"""
        info_dict = OrderedDict({ \
                        KEY_ISI_DATAMART_ID: datamart_id,
                        'source_mode': datamart_name,
                        'data_path': dest_filepath,
                        'filesize': os.stat(dest_filepath).st_size,
                        'metadata_path': None,
                        'data_preview': ''.join(preview_info.result_obj),
                        'metadata': None})

        return info_dict
