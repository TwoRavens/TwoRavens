"""
For the materialze process, complete the following steps:

- retrieve and save the materialized file
- send a web socket message back to the frontend
"""
import logging
import json

from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.utils.json_helper import json_loads, json_dumps
#from tworaven_apps.utils.basic_response import (ok_resp, err_resp)
from tworaven_apps.ta2_interfaces.websocket_message import WebsocketMessage
from tworaven_apps.data_prep_utils.new_dataset_util import NewDatasetUtil

from tworaven_apps.user_workspaces.utils import \
    (get_user_workspace_by_id,)

from tworaven_common_apps.datamart_endpoints.static_vals import \
    (DATAMART_AUGMENT_PROCESS,
     DATAMART_ISI_NAME,
     DATAMART_NYU_NAME,
     KEY_DATA_PATH)
from tworaven_common_apps.datamart_endpoints.datamart_util import \
    (get_datamart_job_util)


LOGGER = logging.getLogger(__name__)


class AugmentUtil(BasicErrCheck):
    """Run the Datamart augment step"""

    def __init__(self, datamart_name, user_workspace_id, augment_params, **kwargs):
        """Only need a dataset id to start"""
        self.datamart_name = datamart_name
        self.user_workspace_id = user_workspace_id
        self.user_workspace = None
        self.augment_params = augment_params

        print('self.augment_params', json.dumps(self.augment_params, indent=4))
        print('augment keys', self.augment_params.keys())
        # optional for websocket messages
        #
        self.websocket_id = kwargs.get('websocket_id')

        # to be created
        self.datamart_util = None
        self.augment_new_filepath = None   # file path
        self.new_workspace = None

        self.run_augment_steps()


    def run_augment_steps(self):
        """Run through the augment steps"""
        if self.has_error():
            return

        if not self.retrieve_workspace():
            return

        if not self.load_datamart_util():
            return

        if self.datamart_name == DATAMART_ISI_NAME:
            if not self.augment_isi_file():
                return
        elif self.datamart_name == DATAMART_NYU_NAME:
            if not self.augment_nyu_file():
                return
        else:
            self.add_err_msg('Materialize not implemented for NYU. (Only ISI)')
            return

        self.make_new_dataset()

        self.send_websocket_success_message()


    def show_info(self):
        """Some debug print statements"""
        print('user_workspace_id', self.user_workspace_id)
        print('augment_params', self.augment_params)
        if self.has_error():
            print('error', self.get_error_message())
        else:
            print('augment_new_filepath', self.augment_new_filepath)
            print('new_workspace', self.new_workspace)


    def retrieve_workspace(self):
        """Retrieve UserWorkspace and D3M config"""
        ws_info = get_user_workspace_by_id(self.user_workspace_id)
        if not ws_info.success:
            self.add_err_msg(ws_info.err_msg)
            return False

        self.user_workspace = ws_info.result_obj
        return True


    def add_err_msg(self, user_msg):
        """Add to base base "add_err_msg", also send a websocket message"""
        # call the base "add_err_msg"
        #
        super().add_err_msg(user_msg)

        if not self.websocket_id:
            return

        user_msg = '%s (datamart augment)' % \
                   (user_msg,)

        # ----------------------------------
        # Send Websocket message
        # ----------------------------------
        ws_msg = WebsocketMessage.get_fail_message(DATAMART_AUGMENT_PROCESS,
                                                   user_msg)
        print('send to websocket id: %s' % self.websocket_id)
        ws_msg.send_message(self.websocket_id)

        # ----------------------------------
        # Log it
        # ----------------------------------
        LOGGER.info('WebsocketMessage: %s', user_msg)


    def load_datamart_util(self):
        """Load the appropriate Datamart Util, e.g. for ISI, NYU, etc"""
        if self.has_error():
            return False

        datamart_util_info = get_datamart_job_util(self.datamart_name)
        if not datamart_util_info.success:
            self.add_err_msg(datamart_util_info.err_msg)
            return False

        self.datamart_util = datamart_util_info.result_obj
        return True


    def augment_isi_file(self):
        """Augment the file via the ISI API"""
        if self.has_error():
            return False

        # user_workspace, data_path, search_result, left_columns,
        # right_columns, exact_match=False, **kwargs
        search_result_info = json_loads(self.augment_params['search_result'])
        if not search_result_info.success:
            err_msg = (f"Failed to load augment_params['search_result']"
                       f" as JSON: {search_result_info.err_msg}")
            self.add_err_msg(err_msg)
            return
        search_result_json = search_result_info.result_obj

        extra_params = dict()   # none for now...

        augment_info = self.datamart_util.datamart_augment(\
                            self.user_workspace,
                            self.augment_params['data_path'],
                            search_result_json,
                            self.augment_params['left_columns'],
                            self.augment_params['right_columns'],
                            exact_match=self.augment_params['exact_match'],
                            **extra_params)

        if not augment_info.success:
            self.add_err_msg(augment_info.err_msg)
            return False

        # print('augment_info', augment_info.result_obj)

        self.augment_new_filepath = augment_info.result_obj
        return True


    def augment_nyu_file(self):
        """Augment the file via NYU API"""
        if self.has_error():
            return False

        # user_workspace, data_path, search_result, left_columns,
        # right_columns, exact_match=False, **kwargs
        search_result_info = json_loads(self.augment_params['search_result'])
        if not search_result_info.success:
            err_msg = (f"Failed to load augment_params['search_result']"
                       f" as JSON: {search_result_info.err_msg}")
            self.add_err_msg(err_msg)
            return
        search_result_json = search_result_info.result_obj

        extra_params = dict()   # none for now...

        # Different params than ISI
        #
        augment_info = self.datamart_util.datamart_augment(\
                            self.user_workspace,
                            self.augment_params['data_path'],
                            search_result_json,
                            **extra_params)

        if not augment_info.success:
            self.add_err_msg(augment_info.err_msg)
            return False

        # print('augment_info', augment_info.result_obj)

        if not isinstance(augment_info.result_obj, dict):
            self.add_err_msg('NYU augment info did not return a dict')
            return False

        augment_dict = augment_info.result_obj

        if not KEY_DATA_PATH in augment_dict:
            user_msg = (f'Key "{KEY_DATA_PATH}" not found in the NYU'
                        f' augment_dict.'
                        f' Keys: {augment_dict.keys()}')
            self.add_err_msg(user_msg)
            return False

        print('augment_dict', augment_dict)
        self.augment_new_filepath = augment_dict[KEY_DATA_PATH]
        return True

    def make_new_dataset(self):
        """Build a new dataset using the augmented file"""
        if self.has_error():
            return

        # Start process of creating new dataset...
        #   - This will send a websocket message when process complete
        #
        new_dataset_util = NewDatasetUtil(\
                                    self.user_workspace.id,
                                    self.augment_new_filepath,
                                    **dict(websocket_id=self.websocket_id))

        if new_dataset_util.has_error():
            self.add_err_msg(new_dataset_util.get_error_message())
            return


    def send_websocket_success_message(self):
        """Send a websocket message with the materialize_result data"""
        LOGGER.info('(5) send_websocket_success_message')
        if self.has_error():
            return

        if not self.websocket_id:
            LOGGER.info('(5a) no websocket_id')
            return

        LOGGER.info('(5b) send the message!')
        ws_msg = WebsocketMessage.get_success_message(\
                    DATAMART_AUGMENT_PROCESS,
                    ('The dataset has been augmented '
                     'and a new workspace created'))
        ws_msg.send_message(self.websocket_id)
        LOGGER.info('(5c) sent!')
