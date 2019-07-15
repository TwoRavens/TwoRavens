"""
For the materialze process, complete the following steps:

- retrieve and save the materialized file
- send a web socket message back to the frontend
"""
import logging

from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.ta2_interfaces.websocket_message import WebsocketMessage
from tworaven_apps.user_workspaces.utils import \
    (get_user_workspace_by_id,)

from tworaven_apps.datamart_endpoints import static_vals as dm_static
from tworaven_apps.datamart_endpoints.datamart_util import \
    (get_datamart_job_util)


LOGGER = logging.getLogger(__name__)


class SearchUtil(BasicErrCheck):
    """Create a config based on a dict containing key value
    pairs based on the D3M environment variables
    - Includes static method to load from actual environment variables
    - Verify required directories
    - Create any needed subdirectories"""

    def __init__(self, datamart_name, user_workspace_id, dataset_path, **kwargs):
        """Only need a dataset id to start"""
        self.datamart_name = datamart_name
        self.user_workspace_id = user_workspace_id
        self.user_workspace = None
        self.dataset_path = dataset_path

        # optional for websocket messages
        #
        self.websocket_id = kwargs.get('websocket_id')

        # to be created
        self.datamart_util = None
        self.search_results = None   # file path

        self.run_search_steps()


    def run_search_steps(self):
        """Run through the materialize steps"""
        if self.has_error():
            return

        if not self.retrieve_workspace():
            return

        if not self.load_datamart_util():
            return

        if not self.search_with_file():
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

        resp_info = dict(datamart_name=self.datamart_name,
                         search_results=self.search_results)

        ws_msg = WebsocketMessage.get_success_message(\
                    dm_static.DATAMART_SEARCH_BY_DATASET,
                    'The dataset search is complate',
                    data=resp_info)

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


    def search_with_file(self):
        """Search with a file."""
        if self.has_error():
            return False

        # -----------------------------------
        # RUN THE NYU SEARCH
        # reference: https://github.com/TwoRavens/TwoRavens/issues/641
        # -----------------------------------
        print('self.datamart_util', self.datamart_util)
        if self.datamart_name == dm_static.DATAMART_NYU_NAME:
            return self.run_nyu_search()

        user_msg = (f'Dataset search not available for datamart: '
                    f' {self.datamart_util.get_datamart_source()}')
        self.add_err_msg(user_msg)
        return False

    def run_nyu_search(self):
        """Run the NYU search"""
        params = dict(user=self.user_workspace.user)
        search_info = self.datamart_util.search_with_dataset(\
                                self.dataset_path,
                                **params)

        print('search worked?', search_info.success)

        if not search_info.success:
            self.add_err_msg(search_info.err_msg)
            return False

        print('search_info', search_info.result_obj)

        self.search_results = search_info.result_obj

        return True

    def retrieve_workspace(self):
        """Retrieve UserWorkspace and D3M config"""
        ws_info = get_user_workspace_by_id(self.user_workspace_id)
        if not ws_info.success:
            self.add_err_msg(ws_info.err_msg)
            return False

        self.user_workspace = ws_info.result_obj

        if not self.websocket_id:
            self.websocket_id = self.user_workspace.user.username

        return True

    def show_info(self):
        """Some debug print statements"""
        print('user_workspace_id', self.user_workspace_id)
        print('dataset_path', self.dataset_path)
        if self.has_error():
            print('error', self.get_error_message())
        else:
            print('search_results', self.search_results)

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
        data = {}
        if self.datamart_name:
            data['datamart_name'] = self.datamart_name

        ws_msg = WebsocketMessage.get_fail_message_with_data(\
                                        dm_static.DATAMART_SEARCH_BY_DATASET,
                                        user_msg,
                                        data=data)

        print('send to websocket id: %s' % self.websocket_id)
        ws_msg.send_message(self.websocket_id)

        # ----------------------------------
        # Log it
        # ----------------------------------
        LOGGER.info('WebsocketMessage: %s', user_msg)
