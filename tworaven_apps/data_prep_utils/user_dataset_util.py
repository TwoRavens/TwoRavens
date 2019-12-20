"""
** For working with new user datasets, use the "user_dataset_util.py" **

Complete the following steps:

- construct folders to replicate the D3M format
- move the user file into the new folders, renaming it
- create a dataset doc
- X - create problem docs using rook endpoint and move files into new folder structure
- build and save a new D3m config database entry based on the new folders

"""
import os
from os.path import dirname, isdir, isfile, join, splitext
from collections import OrderedDict

from django.utils.text import slugify

from tworaven_apps.utils.dict_helper import get_dict_value
from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.utils.file_util import \
    (create_directory,)
from tworaven_apps.utils.basic_response import (ok_resp, err_resp)

from tworaven_apps.raven_auth.models import User

from tworaven_apps.configurations.env_config_loader import EnvConfigLoader
from tworaven_apps.configurations.models_d3m import D3MConfiguration
from tworaven_apps.ta2_interfaces.websocket_message import WebsocketMessage
from tworaven_apps.data_prep_utils.static_vals import ADD_USER_DATASET_PROCESS
from tworaven_apps.data_prep_utils.dataset_doc_maker import DatasetDocMaker

from tworaven_apps.data_prep_utils import static_vals as dp_static

from tworaven_apps.configurations.utils import \
    (get_config_file_contents,)
from tworaven_apps.user_workspaces.utils import \
    (create_new_user_workspace,)

from tworaven_apps.utils.random_info import \
    (get_alpha_string,)

from tworaven_apps.configurations.models_d3m import \
    (KEY_DATASET_SCHEMA,
     KEY_PROBLEM_SCHEMA)

from tworavensproject.celery import celery_app

import logging

LOGGER = logging.getLogger(__name__)


class UserDatasetUtil(BasicErrCheck):
    """Create a config based on a dict containing key value
    pairs based on the D3M environment variables
    - Includes static method to load from actual environment variables
    - Verify required directories
    - Create any needed subdirectories"""

    def __init__(self, user_id, orig_source_files, writable_output_dir, **kwargs):
        """Only need a dataset id to start"""
        self.user_id = user_id
        self.user = None

        # Where the new dataset folders/files will be created
        self.writable_output_dir = writable_output_dir
        self.orig_source_files = orig_source_files

        self.new_dataset_dir = None

        # optional for websocket messages
        #
        self.websocket_id = kwargs.get('websocket_id')

        # optional new dataset name
        #
        self.dataset_name = kwargs.get(dp_static.DATASET_NAME)
        if not self.dataset_name:
            self.dataset_name = f'dataset_{get_alpha_string(7)}'

        #self.user_workspace_id = user_workspace_id
        #self.user_workspace = None

        self.d3m_config = None

        self.dataset_id = None


        # to be created
        self.dataset_id = None
        self.dataset_root_dir = None
        self.dataset_tables_dir = None  # where source file is copied: learningData.csv
        self.dataset_dir = None
        self.problem_dir = None # where problem dir will be written

        # destination for the self.orig_dataset_doc
        self.new_dataset_doc_file = None

        self.rook_params = None
        self.new_d3m_config = None
        self.new_workspace = None

        self.run_construct_dataset()


    @staticmethod
    def make_new_dataset(user_id, source_dir, writable_output_dir, **kwargs):
        """Return the result of a SearchSolutions call.
        If successful, an async process is kicked off"""
        if not user_id:
            return err_resp('user_workspace_id must be set')

        if not isdir(source_dir):
            return err_resp('source_dir not found: %s' % source_dir)

        if not isdir(writable_output_dir):
            return err_resp('writable_output_dir not found: %s' % writable_output_dir)

        source_files = [join(source_dir, x)
                        for x in os.listdir(source_dir)
                        if splitext(x.lower())[1] in dp_static.VALID_EXTENSIONS]

        if not source_files:
            return err_resp(f'No source files found in directory: {source_dir}')

        udu = UserDatasetUtil(1, source_files, writable_output_dir, **kwargs)
        if udu.has_error():
            return err_resp(udu.error_message)

        return ok_resp('it worked')

        # check for about.json


        #UserDatasetUtil.kick_off_new_dataset_steps.delay(\
        #        user_id, source_files, writable_output_dir, **kwargs)

        #return ok_resp('make_new_dataset process started')


    @staticmethod
    @celery_app.task(ignore_result=True)
    def kick_off_new_dataset_steps(user_id, source_file, writable_output_dir, **kwargs):
        """Run this async"""
        user_dataset_util = UserDatasetUtil(\
                            user_id, source_file, writable_output_dir, **kwargs)


    @staticmethod
    def create_dataset_id(dataset_name=None):
        """Construct an updated Dataset id"""
        if dataset_name:
            return '%s-%s' % (dataset_name,
                              get_alpha_string(6))

        return 'dataset-%s' % (get_alpha_string(6),)
                                 #get_timestamp_string(no_breaks=True))


    def send_websocket_err_msg(self, user_msg):
        """Send an error messsage over websockets"""
        # ----------------------------------
        # Add error message to class
        # ----------------------------------
        self.add_err_msg(user_msg)

        if not self.websocket_id:
            return

        user_msg = '%s (datamart augment)' % \
                   (user_msg,)

        # ----------------------------------
        # Send Websocket message
        # ----------------------------------
        ws_msg = WebsocketMessage.get_fail_message(ADD_USER_DATASET_PROCESS,
                                                   user_msg)
        ws_msg.send_message(self.websocket_id)

        # ----------------------------------
        # Log it
        # ----------------------------------
        LOGGER.info('WebsocketMessage: %s', user_msg)



    def run_construct_dataset(self):
        """Go through the steps...."""
        LOGGER.info('>>> run_construct_dataset')

        try:
            self.user = User.objects.get(pk=self.user_id)
        except User.DoesNotExist:
            user_msg = 'No user found for id: %s' % self.user_id
            self.send_websocket_err_msg(user_msg)
            return

        for src_file in self.orig_source_files:
            if not isfile(src_file):
                user_msg = f'File does not exists: {src_file}'
                self.send_websocket_err_msg(user_msg)
                return

        if not isdir(self.writable_output_dir):
            user_msg = f'Directory does not exists: {self.writable_output_dir}'
            self.send_websocket_err_msg(user_msg)
            return

        LOGGER.info('(1) construct_folders')
        if not self.construct_folders():
            return

        LOGGER.info('(2) create dataset doc + move file to .csv')
        if not self.create_files():
            return

        LOGGER.info('(3) create_new_config')
        self.create_new_config()

        # self.send_websocket_err_msg(':( - the augment did not work')

        if not self.has_error() and self.websocket_id:
            ws_msg = WebsocketMessage.get_success_message(\
                        ADD_USER_DATASET_PROCESS,
                        'New user workspace created: %s' % self.new_workspace,
                        msg_cnt=1)
            ws_msg.send_message(self.websocket_id)


    def create_new_config(self):
        """Create a new D3M config and set it as the default
        NOTE: Initial demo - This FAILS for multiple users
        Should be:
            - create new D3M config, but not as default...
        """
        if self.has_error():
            return

        params = dict(is_default_config=True,  # don't want it as default for everyone
                      is_user_config=False)

        print('create_new_config 1', self.dataset_root_dir)
        ecl_info = EnvConfigLoader.make_config_from_directory(\
                                    self.dataset_root_dir, **params)

        print('create_new_config 2: ', ecl_info)

        if not ecl_info.success:
            self.send_websocket_err_msg('Error creating config: %s' % \
                             ecl_info.err_msg)
            return

        self.new_d3m_config = ecl_info.result_obj

        # Put this code somewhere else! lke EnvConfigLoader
        #
        new_config_name = self.dataset_name
        offset = 1
        while D3MConfiguration.objects.filter(name=new_config_name).count() > 0:
            offset += 1
            new_config_name = f'{self.dataset_name}-{str(offset).zfill(3)}'

        self.new_d3m_config.name = new_config_name
        self.new_d3m_config.save()

        # -------------------------
        # Create new UserWorkspace
        # ---------------------------
        print('create_new_config 4')
        ws_info = create_new_user_workspace(\
                                    self.user,
                                    self.new_d3m_config)

        if not ws_info.success:
            self.send_websocket_err_msg('Error creating workspace: %s' % \
                             ws_info.err_msg)
            return

        print('create_new_config 5')

        self.new_workspace = ws_info.result_obj

        return


    def construct_folders(self):
        """Create the folder structure + D3MConfig object"""
        """
           new_dataset_id
           └── TRAIN
               ├── dataset_TRAIN
               │ ├── datasetDoc.json
               │ └── tables XXX
               │    └── learningData.csv
               └── problem_TRAIN XXX
                   ├── dataSplits.csv
                   └── problemDoc.json
        """
        if self.has_error():
            return False

        if not isdir(self.writable_output_dir):
            user_msg = f'UserDatasetUtil. This directory does not exist: {self.writable_output_dir}'
            self.send_websocket_err_msg(user_msg)
            return False

        self.dataset_id = slugify(self.dataset_name[:15] + '-' + get_alpha_string(4))

        self.dataset_root_dir = join(self.writable_output_dir, self.dataset_id)

        # ---------------------------------------
        # Create the problem_TRAIN directory
        # ---------------------------------------
        self.problem_dir = join(self.dataset_root_dir,
                                'TRAIN',
                                'problem_TRAIN')

        LOGGER.info('       - dataset_root_dir: %s', self.dataset_root_dir)
        LOGGER.info('       - problem_dir: %s', self.problem_dir)
        dir_info = create_directory(self.problem_dir)
        if not dir_info.success:
            self.send_websocket_err_msg(dir_info.err_msg)
            return False

        # ---------------------------------------
        # Create the tables dir
        # ---------------------------------------
        self.dataset_tables_dir = join(self.dataset_root_dir,
                                       'TRAIN',
                                       'dataset_TRAIN',
                                       'tables')

        dir_info = create_directory(self.dataset_tables_dir)
        if not dir_info.success:
            self.send_websocket_err_msg(dir_info.err_msg)
            return False
        self.dataset_dir = dirname(self.dataset_tables_dir)
        return True


    def create_files(self):
        """Create a dataset doc and conver/move the source file"""
        if self.has_error():
            return False

        ddm = DatasetDocMaker(self.orig_source_files, self.dataset_dir)

        if ddm.has_error():
            self.send_websocket_err_msg(ddm.error_message)
            return False

        print('it worked!')
        print(ddm.dataset_doc_path)
        print(ddm.final_data_file_path)

        return True
