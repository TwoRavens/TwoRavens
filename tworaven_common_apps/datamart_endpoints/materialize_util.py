"""
For the materialze process, complete the following steps:

- retrieve and save the materialized file
- send a web socket message back to the frontend
"""
import logging

from tworaven_apps.utils.basic_err_check import BasicErrCheck
#from tworaven_apps.utils.json_helper import json_loads, json_dumps
#from tworaven_apps.utils.basic_response import (ok_resp, err_resp)
from tworaven_apps.ta2_interfaces.websocket_message import WebsocketMessage
from tworaven_apps.user_workspaces.utils import \
    (get_user_workspace_by_id,)

from tworaven_common_apps.datamart_endpoints.static_vals import \
    (DATAMART_MATERIALIZE_PROCESS,)
from tworaven_common_apps.datamart_endpoints.datamart_util import \
    (get_datamart_job_util)


LOGGER = logging.getLogger(__name__)


class MaterializeUtil(BasicErrCheck):
    """Create a config based on a dict containing key value
    pairs based on the D3M environment variables
    - Includes static method to load from actual environment variables
    - Verify required directories
    - Create any needed subdirectories"""

    def __init__(self, datamart_name, user_workspace_id, datamart_params, **kwargs):
        """Only need a dataset id to start"""
        self.datamart_name = datamart_name
        self.user_workspace_id = user_workspace_id
        self.user_workspace = None
        self.datamart_params = datamart_params

        # optional for websocket messages
        #
        self.websocket_id = kwargs.get('websocket_id')

        # to be created
        self.datamart_util = None
        self.materialize_result = None   # file path

        self.run_materialize_steps()


    def run_materialize_steps(self):
        """Run through the materialize steps"""
        if self.has_error():
            return

        if not self.retrieve_workspace():
            return

        if not self.load_datamart_util():
            return

        if not self.download_file():
            return

        self.send_websocket_success_message()


    def send_websocket_success_message(self):
        """Send a websocket message with the materialize_result data"""
        LOGGER.info('(5) send_websocket_success_message')
        if self.has_error():
            return

        if not self.websocket_id:
            LOGGER.info('(5a) not websocket_id')
            return

        LOGGER.info('(5b) send the message!')
        ws_msg = WebsocketMessage.get_success_message(\
                    DATAMART_MATERIALIZE_PROCESS,
                    'The dataset has been materialized',
                    #data=dict(dog=1))
                    data=self.materialize_result)
        ws_msg.send_message(self.websocket_id)
        LOGGER.info('(5c) sent!')


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


    def download_file(self):
        """Download the file"""
        if self.has_error():
            return False

        materialize_info = self.datamart_util.datamart_materialize(\
                                    self.user_workspace,
                                    self.datamart_params['search_result'])

        print('materialize worked?', materialize_info.success)
        if not materialize_info.success:
            self.add_err_msg(materialize_info.err_msg)
            return False

        # print('materialize_result', materialize_info.result_obj)

        self.materialize_result = materialize_info.result_obj
        return True

    def retrieve_workspace(self):
        """Retrieve UserWorkspace and D3M config"""
        ws_info = get_user_workspace_by_id(self.user_workspace_id)
        if not ws_info.success:
            self.add_err_msg(ws_info.err_msg)
            return False

        self.user_workspace = ws_info.result_obj
        return True

    def show_info(self):
        """Some debug print statements"""
        print('user_workspace_id', self.user_workspace_id)
        print('datamart_params', self.datamart_params)
        if self.has_error():
            print('error', self.get_error_message())
        else:
            print('materialize_result', self.materialize_result)

    def add_err_msg(self, user_msg):
        """Add to base base "add_err_msg", also send a websocket message"""
        # call the base "add_err_msg"
        #
        super().add_err_msg(user_msg)

        if not self.websocket_id:
            return

        user_msg = '%s (datamart materialize)' % \
                   (user_msg,)

        # ----------------------------------
        # Send Websocket message
        # ----------------------------------
        ws_msg = WebsocketMessage.get_fail_message(DATAMART_MATERIALIZE_PROCESS,
                                                   user_msg)
        print('send to websocket id: %s' % self.websocket_id)
        ws_msg.send_message(self.websocket_id)

        # ----------------------------------
        # Log it
        # ----------------------------------
        LOGGER.info('WebsocketMessage: %s', user_msg)
