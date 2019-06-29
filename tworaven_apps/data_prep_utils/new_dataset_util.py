"""
For the augment process, complete the following steps:

- retrieve the user's workspace
- construct folders to replicate the D3M format
- move the augmented file into the new folders, renaming it
- create problem docs using rook endpoint and move files into new folder structure
- build and save a new D3m config database entry based on the new folders

"""
from os.path import dirname, isdir, isfile, join
from collections import OrderedDict

from tworaven_apps.utils.dict_helper import get_dict_value
from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.utils.json_helper import json_dumps # json_loads
from tworaven_apps.utils.file_util import \
    (create_directory, move_file, write_file, read_file_contents)
from tworaven_apps.utils.basic_response import (ok_resp, err_resp)
from tworaven_apps.rook_services.make_datadocs_util import MakeDatadocsUtil
from tworaven_apps.configurations.env_config_loader import EnvConfigLoader
from tworaven_apps.ta2_interfaces.websocket_message import WebsocketMessage
from tworaven_apps.data_prep_utils.static_vals import DATAMART_AUGMENT_PROCESS
from tworaven_apps.configurations.utils import \
    (get_config_file_contents,)
from tworaven_apps.user_workspaces.utils import \
    (get_user_workspace_by_id,
     create_new_user_workspace)

from tworaven_apps.datamart_endpoints import static_vals as dm_static

from tworaven_apps.utils.random_info import \
    (get_alpha_string,)

from tworaven_apps.configurations.models_d3m import \
    (KEY_DATASET_SCHEMA,
     KEY_PROBLEM_SCHEMA)
from tworavensproject.celery import celery_app

import logging

LOGGER = logging.getLogger(__name__)


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
        self.orig_dataset_doc = kwargs.get(dm_static.KEY_DATASET_DOC_PATH, None)

        # optional for websocket messages
        #
        self.websocket_id = kwargs.get('websocket_id')

        # to be created
        self.dataset_id = None
        self.dataset_root_dir = None
        self.tables_dir = None  # where source file is copied: learningData.csv
        self.dataset_dir = None
        self.problem_dir = None # where problem dir will be written

        # destination for the self.orig_source_file
        self.new_source_file = None
        # destination for the self.orig_dataset_doc
        self.new_dataset_doc_file = None

        self.rook_params = None
        self.new_d3m_config = None
        self.new_workspace = None

        self.run_construct_dataset()


    @staticmethod
    def make_new_dataset_call(user_workspace_id, source_file, **kwargs):
        """Return the result of a SearchSolutions call.
        If successful, an async process is kicked off"""
        if not user_workspace_id:
            return err_resp('user_workspace_id must be set')

        if not source_file:
            return err_resp('source_file must be set')

        if not isfile(source_file):
            return err_resp('source_file not found: %s' % source_file)


        # Async task to run augment process
        #
        NewDatasetUtil.kick_off_augment_steps.delay(\
                user_workspace_id, source_file, **kwargs)

        return ok_resp('augment process started')

    @staticmethod
    @celery_app.task(ignore_result=True)
    def kick_off_augment_steps(user_workspace_id, source_file, **kwargs):
        """Run this async"""
        ndu = NewDatasetUtil(user_workspace_id, source_file, **kwargs)


    @staticmethod
    def create_dataset_id(old_id=None):
        """Construct an updated Dataset id"""
        if old_id:
            return '%s-augmented-%s' % (old_id,
                                        get_alpha_string(6))
            #return '%s-%s-%s' % (old_id,
            #                     get_timestamp_string(no_breaks=True),
            #s                     get_alpha_string(6))

        return 'augmented-%s' % (get_alpha_string(6),)
                                 #get_timestamp_string(no_breaks=True))


    def retrieve_workspace(self):
        """Retrieve UserWorkspace and D3M config"""
        ws_info = get_user_workspace_by_id(self.user_workspace_id)
        if not ws_info.success:
            self.send_websocket_err_msg(ws_info.err_msg)
            return False

        self.user_workspace = ws_info.result_obj
        self.d3m_config = self.user_workspace.d3m_config
        self.dataset_id = NewDatasetUtil.create_dataset_id(self.d3m_config.name)
        return True

    def show_info(self):
        """Some debug print statements"""
        print('dataset_id', self.dataset_id)
        print('\ntables dir', self.tables_dir)
        print('\nproblem dir', self.problem_dir)
        print('\nnew_source_file', self.new_source_file)
        print('\nnew_dataset_doc_file', self.new_dataset_doc_file)

        if self.rook_params:
            print('rook_info keys', self.rook_params.keys())
            """
            rook_info = json_dumps(self.rook_params, indent=4)
            if rook_info.success:
                print('rook_info', rook_info.result_obj)
            """
        else:
            print('no rook params')
        print('\nnew_d3m_config', self.new_d3m_config)
        print('\nnew_workspace', self.new_workspace)

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
        ws_msg = WebsocketMessage.get_fail_message(DATAMART_AUGMENT_PROCESS,
                                                   user_msg)
        ws_msg.send_message(self.websocket_id)

        # ----------------------------------
        # Log it
        # ----------------------------------
        LOGGER.info('WebsocketMessage: %s', user_msg)



    def run_construct_dataset(self):
        """Go through the steps...."""
        LOGGER.info('>>> run_construct_dataset')
        if not isfile(self.orig_source_file):
            user_msg = 'File does not exists: %s' % self.orig_source_file
            self.send_websocket_err_msg(user_msg)
            return

        LOGGER.info('(1) retrieve workspace')
        if not self.retrieve_workspace():
            return

        LOGGER.info('(2) construct_folders')
        if not self.construct_folders():
            return

        LOGGER.info('(3) move_source_files')
        if not self.move_source_files():
            return

        LOGGER.info('(4) create problem docs (and dataset doc, if needed)')
        if not self.create_problem_data_docs():
            return

        LOGGER.info('(5) create_new_config')
        self.create_new_config()

        # self.send_websocket_err_msg(':( - the augment did not work')

        if not self.has_error() and self.websocket_id:
            ws_msg = WebsocketMessage.get_success_message(\
                        DATAMART_AUGMENT_PROCESS,
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

        params = dict(orig_dataset_id=self.d3m_config.name,
                      is_default_config=False,  # don't want it as default for everyone
                      is_user_config=True)

        print('create_new_config 1')
        ecl_info = EnvConfigLoader.make_config_from_directory(\
                                    self.dataset_root_dir, **params)

        print('create_new_config 2: ', ecl_info)

        if not ecl_info.success:
            self.send_websocket_err_msg('Error creating config: %s' % \
                             ecl_info.err_msg)
            return

        self.new_d3m_config = ecl_info.result_obj
        print('create_new_config 3; new_d3m_config ', self.new_d3m_config)

        # -------------------------
        # Create new UserWorkspace
        # ---------------------------
        print('create_new_config 4')
        params = dict(previous_workspace=self.user_workspace)
        ws_info = create_new_user_workspace(\
                                    self.user_workspace.user,
                                    self.new_d3m_config,
                                    **params)
        if not ws_info.success:
            self.send_websocket_err_msg('Error creating workspace: %s' % \
                             ws_info.err_msg)
            return

        print('create_new_config 5')

        self.new_workspace = ws_info.result_obj

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

        d3m_config = self.user_workspace.d3m_config #et_latest_d3m_config()
        if not d3m_config:
            user_msg = 'Latest D3M configuration not found. (construct_folders)'
            self.send_websocket_err_msg(user_msg)
            return False

        if (not d3m_config.additional_inputs) or \
            (not isdir(d3m_config.additional_inputs)):
            user_msg = ('Additional inputs folder does not exist! %s') % \
                        (d3m_config.additional_inputs,)
            self.send_websocket_err_msg(user_msg)
            return False

        # ---------------------------------------
        # Create the problem_TRAIN
        # ---------------------------------------
        self.dataset_root_dir = join(d3m_config.additional_inputs,
                                     self.dataset_id)
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
        self.tables_dir = join(self.dataset_root_dir,
                               'TRAIN',
                               'dataset_TRAIN',
                               'tables')
        LOGGER.info('       - tables_dir: %s', self.tables_dir)

        dir_info = create_directory(self.tables_dir)
        if not dir_info.success:
            self.send_websocket_err_msg(dir_info.err_msg)
            return False
        self.dataset_dir = dirname(self.tables_dir)
        return True

    def move_source_files(self):
        """Copy file to learningData.csv
        If it exists, also move the new dataset doc
        """
        if self.has_error():
            return False

        self.new_source_file = join(self.tables_dir, 'learningData.csv')
        if isfile(self.new_source_file):
            user_msg = 'Destination file already exists: %s' % self.new_source_file
            self.send_websocket_err_msg(user_msg)
            return False

        move_info = move_file(self.orig_source_file, self.new_source_file)
        if not move_info.success:
            self.send_websocket_err_msg('Failed to move data file: %s' % move_info.err_msg)
            return False

        # -----------------------------------------------------------
        # Optional: move the dataset doc, if it exists
        #   e.g. NYU augment includes a datasetDoc.json`
        # -----------------------------------------------------------
        if not self.orig_dataset_doc:
            return True


        if not isfile(self.orig_dataset_doc):
            user_msg = (f'The new DatasetDoc was not found: '
                        f' {self.orig_dataset_doc}')
            self.send_websocket_err_msg(user_msg)
            return False

        # Set the destination as TRAIN/dataset_TRAIN
        #  (tables_dir = .../TRAIN/dataset_TRAIN/tables)
        #
        self.new_dataset_doc_file = join(dirname(self.tables_dir),
                                         'datasetDoc.json')

        move_info2 = move_file(self.orig_dataset_doc, self.new_dataset_doc_file)
        if not move_info2.success:
            self.send_websocket_err_msg('Failed to move data file: %s' % \
                                        move_info2.err_msg)
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

        citation: citation in data doc, plus maybe anything from augmented data

        ---------------------------
        # PROBLEM DOC vals
        ---------------------------
        taskType: taskType from PROBLEM DOC

        taskSubType: taskSubType from PROBLEM DOC
            - Optional! don't send if it's not there

        targets: data.targets[...] from PROBLEM DOC, can be more than one object

        metric: performanceMetrics[...] from PROBLEM DOC, can be more than one

        performanceMetrics: performanceMetrics[...] from problem doc, can be more than one

        problemDoc: entire problemDoc.json
        datasetDoc: entire datasetDoc.json
        """
        if self.has_error():
            return None

        params = OrderedDict()

        params['datafile'] = self.new_source_file
        params['datasetid'] = self.dataset_id

        # --------------------------------
        # get dataset doc info. If one doesn't exist
        #   from datamart, then make one
        # --------------------------------
        if self.new_dataset_doc_file and isfile(self.new_dataset_doc_file):
            read_info = read_file_contents(self.new_dataset_doc_file,
                                           as_dict=True)
            if not read_info.success:
                user_msg = ('Failed to open the dataset doc. %s') % \
                            (read_info.err_msg,)
                self.send_websocket_err_msg(user_msg)
                return None
            dataset_doc = read_info.result_obj
        else:
            dataset_doc = get_config_file_contents(self.d3m_config,
                                                   KEY_DATASET_SCHEMA)
            if not dataset_doc.success:
                user_msg = ('Failed to open the dataset doc. %s') % \
                            (dataset_doc.err_msg,)
                self.send_websocket_err_msg(user_msg)
                return None
            dataset_doc = dataset_doc.result_obj

        # name
        #
        doc_val_info = get_dict_value(dataset_doc, 'about', 'datasetName')
        if doc_val_info.success:
            params['name'] = '%s (augmented)' % doc_val_info.result_obj
        else:
            self.send_websocket_err_msg('about.datasetName not found in dataset doc')
            return None

        # description - optional
        #
        doc_val_info = get_dict_value(dataset_doc, 'about', 'description')
        if doc_val_info.success:
            params['description'] = '%s (augmented)' % doc_val_info.result_obj
        else:
            params['description'] = '(augmented data)'

        # citation
        #
        doc_val_info = get_dict_value(dataset_doc, 'about', 'citation')
        if doc_val_info.success:
            params['citation'] = '[augmented] %s' % doc_val_info.result_obj
        else:
            params['citation'] = '(no citation)'

        # --------------------------------
        # get problem doc info
        # --------------------------------
        problem_doc = get_config_file_contents(self.d3m_config,
                                               KEY_PROBLEM_SCHEMA)
        if not problem_doc.success:
            user_msg = ('Failed to open the problem doc. %s') % \
                        (problem_doc.err_msg,)
            self.send_websocket_err_msg(user_msg)
            return None
        problem_doc = problem_doc.result_obj

        # taskType - required
        #
        task_type = get_dict_value(problem_doc, 'about', 'taskType')
        if task_type.success:
            params['taskType'] = task_type.result_obj
        else:
            self.send_websocket_err_msg('about.taskType not found in problem doc')
            return None

        # taskSubType - optional
        #
        subtask_type = get_dict_value(problem_doc, 'about', 'taskSubType')
        if subtask_type.success:
            params['taskSubType'] = subtask_type.result_obj

        # targets
        #
        doc_val_info = get_dict_value(problem_doc, 'inputs', 'data')
        if not doc_val_info.success:
            self.send_websocket_err_msg('inputs.data not found in problem doc')
            return None

        if not doc_val_info.result_obj:
            self.send_websocket_err_msg('inputs.data list is empty found in problem doc')
            return None

        try:
            params['targets'] = doc_val_info.result_obj[0]['targets']
        except KeyError:
            self.send_websocket_err_msg('inputs.data.targets not found in problem doc')
            return None

        # performanceMetrics
        #
        doc_val_info = get_dict_value(problem_doc, 'inputs', 'performanceMetrics')
        if not doc_val_info.success:
            self.send_websocket_err_msg('inputs.performanceMetrics not found in problem doc')
            return None
        params['performanceMetrics'] = doc_val_info.result_obj


        # Full docs at the end
        #
        params['problemDoc'] = problem_doc
        params['datasetDoc'] = dataset_doc

        return params


    def create_problem_data_docs(self):
        """Send params to rook app"""
        if self.has_error():
            return False

        self.rook_params = self.get_makedoc_rook_params()
        if not self.rook_params:
            return False

        """
        Warning: This is copying what is in mkdocs for now.
         - The problem should be sourced from raven_config
         - The target columns may not be the same as the original dataset
            - To do: find correct column in new dataset doc
        """
        # -------------------------------------------------
        # Update the index of the target variable to by
        #  locating its position in the new datasetDoc
        # -------------------------------------------------
        print('type(self.rook_params)', type(self.rook_params))
        dependent_varname = self.rook_params['targets'][0]['colName']
        dependent_idx = None

        # Iterate through columns until it is found
        for col_info in self.rook_params['datasetDoc']['dataResources'][0]['columns']:
            if col_info.get('colName') == dependent_varname:
                dependent_idx = col_info['colIndex']

        if not dependent_idx:
            self.add_err_msg(\
                    (f'Could not find "colIdx" of the target, within'
                     f' the new datasetDoc.  colName: "{dependent_varname}"'))
            return False

        # Make the update
        self.rook_params['targets'][0]['colIndex'] = dependent_idx

        # ----------------------------------------
        # Update the problemDoc
        # ----------------------------------------
        new_pdoc = self.rook_params['problemDoc']

        new_pdoc['about']['problemID'] = '%s_problem' % self.rook_params['datasetid']

        new_pdoc['about']['problemName'] = '%s_problem' % self.rook_params['name']

        new_pdoc['about']['taskType'] = self.rook_params['taskType']

        new_pdoc['about']['taskSubType'] = self.rook_params['taskSubType']

        # May be incorrect, the column order may not have been kept
        #
        new_pdoc['inputs']['data'][0]['targets'] = self.rook_params['targets']

        new_pdoc['inputs']['performanceMetrics'] = self.rook_params['performanceMetrics']

        new_pdoc['inputs']['data'][0]['datasetID'] = self.rook_params['datasetid']

        if new_pdoc['about']['taskSubType'] == "remove":
            del new_pdoc['about']['taskSubType']

        # -----------------------------
        # write problemDoc
        # -----------------------------
        pdoc_json_info = json_dumps(new_pdoc, indent=4)
        if not pdoc_json_info.success:
            user_msg = 'Failed to convert the problemDoc to JSON. (augment id:5)'
            self.send_websocket_err_msg(user_msg)
            return False

        problem_doc_path = join(self.problem_dir, 'problemDoc.json')
        finfo2 = write_file(problem_doc_path, pdoc_json_info.result_obj)
        if not finfo2.success:
            self.send_websocket_err_msg(finfo2.err_msg)
            return False

        return True

    def xcreate_problem_data_docs(self):
        """Send params to rook app"""
        if self.has_error():
            return False

        self.rook_params = self.get_makedoc_rook_params()
        if not self.rook_params:
            return False

        import json
        print('self.rook_params', json.dumps(self.rook_params, indent=4))

        md_util = MakeDatadocsUtil(rook_params=self.rook_params)
        if md_util.has_error():
            self.send_websocket_err_msg('Rook error. %s' % md_util.get_error_message())
            return False

        # -----------------------------
        # write datasetDoc
        # -----------------------------
        if self.new_dataset_doc_file and isfile(self.new_dataset_doc_file):
            pass # use the datasetDoc.json from the datamart
        else:
            doc_info = md_util.get_dataset_doc_string()
            if not doc_info.success:
                self.send_websocket_err_msg('Rook datasetDoc error. %s' % \
                                 doc_info.err_msg)
                return False

            dataset_doc_path = join(self.dataset_dir, 'datasetDoc.json')
            finfo = write_file(dataset_doc_path, doc_info.result_obj)
            if not finfo.success:
                self.send_websocket_err_msg(finfo.err_msg)
                return False

        # -----------------------------
        # write problemDoc
        # -----------------------------
        doc_info2 = md_util.get_problem_doc_string()
        if not doc_info2.success:
            self.send_websocket_err_msg('Rook problemDoc error. %s' % \
                             doc_info2.err_msg)
            return False

        problem_doc_path = join(self.problem_dir, 'problemDoc.json')
        finfo2 = write_file(problem_doc_path, doc_info2.result_obj)
        if not finfo2.success:
            self.send_websocket_err_msg(finfo2.err_msg)
            return False

        return True
