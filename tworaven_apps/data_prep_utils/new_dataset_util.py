"""Helper for winter 2019 config loaded through env variables

Conforming to the 1/12/19 version of:
    - https://datadrivendiscovery.org/wiki/display/work/Evaluation+Workflow
    - https://datadrivendiscovery.org/wiki/pages/viewpage.action?pageId=11276800
"""
import os
from os.path import basename, dirname, isdir, isfile, join

from django.conf import settings

from tworaven_apps.utils.msg_helper import msgt
from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.utils.json_helper import json_loads
from tworaven_apps.utils.file_util import \
    (create_directory, move_file)
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)
from tworaven_apps.configurations.utils import get_latest_d3m_config
from tworaven_apps.user_workspace.models import UserWorkspace
from tworaven_apps.user_workspace.utils import get_user_workspace_by_id

from tworaven_apps.utils.random_info import \
    (get_timestamp_string,
     get_alpha_string)
from tworaven_apps.configurations.models_d3m import \
    (D3MConfiguration)


class NewDatasetUtil(BasicErrCheck):
    """Create a config based on a dict containing key value
    pairs based on the D3M environment variables
    - Includes static method to load from actual environment variables
    - Verify required directories
    - Create any needed subdirectories"""

    def __init__(self, user_workspace_id, source_file, **kwargs):
        """Only need a dataset id to start"""
        self.user_workspace_id = user_workspace_id
        self.user_workspace = None
        self.d3m_config = None

        self.dataset_id = None
        self.orig_source_file = source_file

        # optional for websocket messages
        #
        self.websocket_id = kwargs.get('websocket_id')

        # to be created
        self.tables_dir = None  # where source file is copied: learningData.csv
        self.problem_dir = None # where problem dir will be written
        self.new_source_file = None

        self.run_construct_dataset()

    @staticmethod
    def get_dataset_id(old_id=None):
        """Construct an updated Dataset id"""
        if old_id:
            return '%s-%s-%s' % (old_id,
                                 get_timestamp_string(),
                                 get_alpha_string(6))

        return '%s-%s' % (get_alpha_string(6),
                          get_timestamp_string())


    def retrieve_workspace(self):
        """Retrieve UserWorkspace and D3M config"""
        ws_info = get_user_workspace_by_id(self.user_workspace_id)
        if not ws_info.success:
            self.add_err_msg(ws_info.err_msg)
            return False

        self.user_workspace = ws_info.result_obj
        self.d3m_config = ws_info.d3m_config
        return True

    def run_construct_dataset(self):
        """Go through the steps...."""
        if not isfile(self.orig_source_file):
            user_msg = 'File does not exists: %s' % self.orig_source_file
            self.add_err_msg(user_msg)
            return

        if not self.retrieve_workspace():
            return

        if not self.construct_folders():
            return

        if not self.move_source_file():
            return

        if not self.create_prob_data_docs():
            return

    def construct_folders(self):
        """Create the folder structure"""
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

        d3m_config = get_latest_d3m_config()
        if not d3m_config:
            user_msg = 'Latest D3M configuration not found. (construct_folders)'
            self.add_err_msg(user_msg)
            return False

        if (not d3m_config.additional_inputs) or \
            (not isdir(d3m_config.additional_inputs)):
            user_msg = ('Additional inputs folder does not exist! %s') % \
                        (d3m_config.additional_inputs,)
            self.add_err_msg(user_msg)
            return False

        # ---------------------------------------
        # Create the problem_TRAIN
        # ---------------------------------------
        self.problem_dir = join(d3m_config.additional_inputs,
                                'TRAIN',
                                'problem_TRAIN')

        dir_info = create_directory(self.problem_dir)
        if not dir_info.success:
            self.add_err_msg(dir_info.err_msg)
            return False

        # ---------------------------------------
        # Create the tables dir
        # ---------------------------------------
        self.tables_dir = join(d3m_config.additional_inputs,
                               'TRAIN',
                               'dataset_TRAIN',
                               'tables')

        dir_info = create_directory(self.tables_dir)
        if not dir_info.success:
            self.add_err_msg(dir_info.err_msg)
            return False

    def move_source_file(self):
        """Copy file to learningData.csv"""
        if self.has_error():
            return False

        self.new_source_file = join(self.tables_dir, 'learningData.csv')
        if isfile(self.new_source_file):
            user_msg = 'Destination file already exists: %s' % self.new_source_file
            self.add_err_msg(user_msg)
            return False

        move_info = move_file(self.orig_source_file, self.new_source_file)
        if not move_info.success:
            self.add_err_msg('Failed to move data file: %s' % move_info.err_msg)
            return False

        return True

    def create_prob_data_docs(self):
        """Prepare the problem and dataset docs
        info to send to rook mkdocsapp:

        datafile: path to data file

        datasetid: datasetID from data doc plus timestamp plus unique id

        name: datasetName from data doc plus (augmented)

        depvarname: data.targets[...] from problem doc, can be more than one object

        description: description from data doc, plus maybe any description of augmented data

        taskType: taskType from problem doc

        taskSubType: taskSubType from problem doc
            - Optional! don't send if it's not there

        metric: performanceMetrics[...] from problem doc, can be more than one
        """
        if self.has_error():
            return

        pass
