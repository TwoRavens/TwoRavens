"""Helper for winter 2019 config loaded through env variables

Conforming to the 1/12/19 version of:
    - https://datadrivendiscovery.org/wiki/display/work/Evaluation+Workflow
    - https://datadrivendiscovery.org/wiki/pages/viewpage.action?pageId=11276800
"""
import os
from os.path import basename, dirname, isdir, isfile, join
from collections import OrderedDict
from django.conf import settings

from tworaven_apps.utils.dict_helper import get_dict_value
from tworaven_apps.utils.msg_helper import msgt
from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.utils.json_helper import json_loads
from tworaven_apps.utils.file_util import \
    (create_directory, move_file)
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)
from tworaven_apps.configurations.utils import \
    (get_latest_d3m_config,
     get_config_file_contents)
from tworaven_apps.user_workspace.models import UserWorkspace
from tworaven_apps.user_workspace.utils import get_user_workspace_by_id

from tworaven_apps.utils.random_info import \
    (get_timestamp_string,
     get_alpha_string)

from tworaven_apps.configurations.models_d3m import \
    (D3MConfiguration,
     KEY_DATASET_SCHEMA,
     KEY_PROBLEM_SCHEMA)

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
        self.dataset_id = None
        self.tables_dir = None  # where source file is copied: learningData.csv
        self.problem_dir = None # where problem dir will be written
        self.new_source_file = None

        self.run_construct_dataset()

    @staticmethod
    def create_dataset_id(old_id=None):
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
        self.dataset_id = NewDatasetUtil.create_dataset_id(self.d3m_config.name)
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

    def get_makedoc_rook_params(self):
        """Prepare the problem and dataset docs
        info to send to rook mkdocsapp:

        datafile: path to data file

        ---------------------------
        # DATA DOC vals
        ---------------------------
        datasetid: datasetID from DATA DOC plus timestamp plus unique id

        name: datasetName from DATA DOC plus (augmented)

        description: description from DATA DOC, plus maybe any description of augmented data

        ---------------------------
        # PROBLEM DOC vals
        ---------------------------
        taskType: taskType from PROBLEM DOC

        taskSubType: taskSubType from PROBLEM DOC
            - Optional! don't send if it's not there

        depvarname: data.targets[...] from PROBLEM DOC, can be more than one object

        metric: performanceMetrics[...] from PROBLEM DOC, can be more than one
        """
        if self.has_error():
            return None

        params = OrderedDict()

        params['datafile'] = self.new_source_file
        params['datasetid'] = self.dataset_id

        # --------------------------------
        # get dataset doc info
        # --------------------------------
        dataset_doc = get_config_file_contents(self.d3m_config,
                                               KEY_DATASET_SCHEMA)
        if not dataset_doc.success:
            user_msg = ('Failed to open the dataset doc. %s') % \
                        (dataset_doc.err_msg,)
            self.add_err_msg(user_msg)
            return None
        dataset_doc = dataset_doc.result_obj

        # name
        #
        doc_val_info = get_dict_value(problem_doc, 'about', 'datasetName')
        if doc_val_info.success:
            params['name'] = '%s (augmented)' % doc_val_info.result_obj
        else:
            self.add_err_msg('about.datasetName not found in dataset doc')
            return None

        # description - optional
        #
        doc_val_info = get_dict_value(problem_doc, 'about', 'description')
        if doc_val_info.success:
            params['description'] = '%s (augmented)' % doc_val_info.result_obj
        else:
            params['description'] = '(augmented data)'

        # --------------------------------
        # get problem doc info
        # --------------------------------
        problem_doc = get_config_file_contents(self.d3m_config,
                                               KEY_PROBLEM_SCHEMA)
        if not problem_doc.success:
            user_msg = ('Failed to open the problem doc. %s') % \
                        (problem_doc.err_msg,)
            self.add_err_msg(user_msg)
            return None
        problem_doc = problem_doc.result_obj

        # taskType - required
        #
        task_type = get_dict_value(problem_doc, 'about', 'taskType')
        if task_type.success:
            params['taskType'] = task_type.result_obj
        else:
            self.add_err_msg('about.taskType not found in problem doc')
            return None

        # taskSubType - optional
        #
        subtask_type = get_dict_value(problem_doc, 'about', 'taskSubType')
        if subtask_type.success:
            params['taskSubType'] = subtask_type.result_obj

        # depvarname - targets
        #
        doc_val_info = get_dict_value(problem_doc, 'inputs', 'data', 'targets')
        if doc_val_info.success:
            params['depvarname'] = doc_val_info.result_obj
        else:
            self.add_err_msg('inputs.data.targets not found in problem doc')
            return None

        return params

    def create_prob_data_docs(self):
        """Send params to rook app"""
        if self.has_error():
            return

        rook_params = self.get_makedoc_rook_params()
        if not rook_params:
            return
