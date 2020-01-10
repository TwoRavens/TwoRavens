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

from tworaven_apps.datamart_endpoints import static_vals as dm_static

from tworaven_apps.datamart_endpoints.datamart_util import \
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

        # print('self.augment_params', json.dumps(self.augment_params, indent=4))
        # print('augment keys', self.augment_params.keys())
        # optional for websocket messages
        #
        self.websocket_id = kwargs.get('websocket_id')

        # to be created
        self.datamart_util = None
        self.augment_new_filepath = None   # file path
        self.augment_new_datasetdoc = None # dataset doc path
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

        if self.datamart_name == dm_static.DATAMART_ISI_NAME:
            if not self.augment_isi_file():
                return
        elif self.datamart_name == dm_static.DATAMART_NYU_NAME:
            if not self.augment_nyu_file():
                return
        else:
            user_msg = (f'Materialize not implemented for this'
                        f' datamart type: {self.datamart_name}')
            self.add_err_msg(user_msg)
            return

        self.make_new_dataset()

        self.send_websocket_success_message()


    def show_info(self):
        """Some debug print statements"""
        print('user_workspace_id', self.user_workspace_id)
        # print('augment_params', self.augment_params)
        if self.has_error():
            print('error', self.get_error_message())
        else:
            print('augment_new_filepath', self.augment_new_filepath)
            print('augment_new_datasetdoc', self.augment_new_datasetdoc)
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
        ws_msg = WebsocketMessage.get_fail_message(dm_static.DATAMART_AUGMENT_PROCESS,
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

        # self.add_err_msg(('ISI Augment is disabled!!!!'
        #                   ' (augment_util.augment_isi_file)'))
        # return False

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
                            self.augment_params[dm_static.KEY_DATA_PATH],
                            search_result_json,
                            exact_match=self.augment_params.get('exact_match'),
                            **extra_params)

        if not augment_info.success:
            self.add_err_msg(augment_info.err_msg)
            return False

        augment_dict = augment_info.result_obj

        keys_to_check = [dm_static.KEY_DATA_PATH,
                         dm_static.KEY_DATASET_DOC_PATH]
        for key in keys_to_check:
            if key not in augment_dict:
                user_msg = (f'Key "{key}" not found in the NYU augment_dict.'
                            f' Keys: {augment_dict.keys()}')
                self.add_err_msg(user_msg)
                return False

        self.augment_new_filepath = augment_dict[dm_static.KEY_DATA_PATH]
        self.augment_new_datasetdoc = augment_dict[dm_static.KEY_DATASET_DOC_PATH]

        return True


    def augment_nyu_file(self):
        """Augment the file via NYU API"""
        if self.has_error():
            return False

        # -----------------------------
        # TEMPORARILY DISABLED
        # -----------------------------
        #err_msg = ('NYU augment functionality is currently disabled')
        #self.add_err_msg(err_msg)
        #return False

        #print('augment_params', self.augment_params)

        # Check for required keys and convert them python dicts
        #
        req_keys = ['search_result',
                    'left_columns',
                    'right_columns']
        keys_not_found = []
        jsonified_data = {}
        for rk in req_keys:
            if not rk in self.augment_params:
                keys_not_found.append(rk)
            else:
                json_info = json_loads(self.augment_params[rk])
                if not json_info.success:
                    user_msg = (f'Sorry!  Augment failed.  (The data for'
                                f' "{rk}" was not JSON)')
                    self.add_err_msg(user_msg)
                    return False
                jsonified_data[rk] = json_info.result_obj

        if keys_not_found:
            user_msg = (f'Sorry! Augment failed.  (These required fields'
                        f' weren\'t found: {req_keys})')
            self.add_err_msg(user_msg)
            return

        # Format the task for augment submission
        #
        task_data = jsonified_data['search_result']

        task_data['augmentation'] = {\
                'type': 'join',
                'left_columns': jsonified_data['left_columns'], # game id user's dataset
                'right_columns': jsonified_data['right_columns'] # game id in datamart dataset
                }

        extra_params = dict()   # none for now...

        # Different params than ISI
        #
        augment_info = self.datamart_util.datamart_augment(\
                            self.user_workspace,
                            self.augment_params[dm_static.KEY_DATA_PATH],
                            task_data,
                            **extra_params)

        if not augment_info.success:
            self.add_err_msg(augment_info.err_msg)
            return False

        # ----------------------------------------
        # Looks like the augment worked.
        #   It should have returned:
        #   - a data file path
        #   - a dataset doc path
        # ----------------------------------------
        augment_dict = augment_info.result_obj

        keys_to_check = [dm_static.KEY_DATA_PATH,
                         dm_static.KEY_DATASET_DOC_PATH]
        for key in keys_to_check:
            if key not in augment_dict:
                user_msg = (f'Key "{key}" not found in the NYU augment_dict.'
                            f' Keys: {augment_dict.keys()}')
                self.add_err_msg(user_msg)
                return False

        self.augment_new_filepath = augment_dict[dm_static.KEY_DATA_PATH]
        self.augment_new_datasetdoc = augment_dict[dm_static.KEY_DATASET_DOC_PATH]

        return True

    def make_new_dataset(self):
        """Build a new dataset using the augmented file"""
        if self.has_error():
            return

        # Start process of creating new dataset...
        #   - This will send a websocket message when process complete
        #
        extra_params = { \
                'websocket_id': self.websocket_id,
                dm_static.KEY_DATASET_DOC_PATH: self.augment_new_datasetdoc}

        new_dataset_util = NewDatasetUtil(\
                                    self.user_workspace.id,
                                    self.augment_new_filepath,
                                    **extra_params)

        if new_dataset_util.has_error():
            self.add_err_msg(new_dataset_util.get_error_message())
            return

        self.new_workspace = new_dataset_util.new_workspace

    def send_websocket_success_message(self):
        """Send a websocket message with the materialize_result data"""
        LOGGER.info('(5) send_websocket_success_message')
        if self.has_error():
            return

        if not self.websocket_id:
            LOGGER.info('(5a) no websocket_id')
            return

        LOGGER.info('(5b) send the message!')

        ws_string_info = json_dumps(self.new_workspace.to_dict())
        if not ws_string_info.success:
            user_msg = ('Sorry! An error occurred.  (Created workspace but'
                        ' failed JSON conversion.)')
            self.add_err_msg(user_msg)
            return

        ws_msg = WebsocketMessage.get_success_message(\
                    dm_static.DATAMART_AUGMENT_PROCESS,
                    ('The dataset has been augmented '
                     'and a new workspace created'),
                    msg_cnt=99,
                    data={
                        'workspace_json_string': ws_string_info.result_obj,
                        'augment_params': self.augment_params
                    })
        ws_msg.send_message(self.websocket_id)
        LOGGER.info('(5c) sent!')
