"""Not all TA2s handle dataset_uri's pointing to csv files.
This is a workaround for TA2s that handle only problem docs.

sample request:

{
    "context": {
        "sessionId": "session_0"
    },
    "pipelineId": "pipeline_1",
    "new_dataset_uri": "file://ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv"
}

1. The current D3M problem directory (in its entirety) is copied to the temp directory
2. Within this copy, the file in the `new_dataset_uri` is used to overwrite the learningData.csv file
   - **possible issue**: What if `learningData.csv` is in the format `learningData.csv.gz`?
     - do we need this for Friday?
3. The original JSON request is updated:
    a. The `new_dataset_uri` is removed
    b. A `dataset_uri` is added to the request with a file uri pointing to the `datasetDoc.json` in the copied folder
4. The updated request is sent to the TA2
"""
from collections import OrderedDict
from datetime import datetime as dt
import json
import shutil
import os
from os.path import basename, isdir, isfile, join
from tworaven_apps.configurations.models_d3m import KEY_PROBLEM_SCHEMA
from tworaven_apps.utils.url_helper import \
    (format_file_uri_to_path,
     add_file_uri_to_path)
from tworaven_apps.utils import random_info
from tworaven_apps.ta2_interfaces.models import \
    (KEY_DATASET_URI, KEY_NEW_DATASET_URI)

from tworaven_apps.configurations.utils import \
    (get_latest_d3m_config,
     get_d3m_filepath)


class ExecutePipelineHelper:
    """Used when a pointer to a dataset folder is needed"""

    def __init__(self, info_dict):

        self.info_dict = info_dict

        self.d3m_config = None
        # to fill in
        self.data_interim_file_path = None  # file created by rook and sent int request
        self.new_data_file_dest = None   # where interim file copied
        self.new_problem_doc_uri = None

        # for error handling
        self.has_error = False
        self.error_message = None

        self.prepare_files()

    def add_error_message(self, err_msg):
        """Add error message"""
        self.has_error = True
        self.error_message = err_msg

    def get_updated_request(self):
        assert not self.has_error, \
            "Check .has_error() before calling this method"

        # remove "new_dataset_uri"
        #
        del self.info_dict[KEY_NEW_DATASET_URI]

        # add "dataset_uri"
        self.info_dict[KEY_DATASET_URI] = self.new_problem_doc_uri

        return self.info_dict

    def prepare_files(self):
        """Go through the workflow..."""
        if not self.info_dict:
            err_msg = ('info_dict cannot be None--no information found'
                       ' (ExecutePipelineRequestHelper)')
            self.add_error_message(err_msg)
            return


        if not self.passes_basic_error_check():
            return

        #if not self.is_file_valid_json():
        #    return

        self.copy_problem_directory()


    def copy_problem_directory(self):
        """Make a copy of the problem directory in temp"""
        if self.has_error:
            return False

        self.d3m_config = get_latest_d3m_config()
        if self.d3m_config is None:
            err_msg = 'D3M config not found (ExecutePipelineRequestHelper)'
            self.add_error_message(err_msg)
            return False

        new_dest_directory = None
        for _ in range(3):
            new_fname = 'dataset_%s-%s' % \
                        (dt.now().strftime('%Y-%m-%d_%H-%M-%S'),
                         random_info.get_alphanumeric_string(3),)

            new_dest_directory = join(self.d3m_config.temp_storage_root,
                                      new_fname)

            if not isdir(new_dest_directory):
                break

        if not new_dest_directory:
            err_msg = 'Failed to create new dataset directory (ExecutePipelineRequestHelper)'
            self.add_error_message(err_msg)
            return False

        # copy training_data_root directory
        #
        new_training_dir = join(new_dest_directory,
                                basename(self.d3m_config.training_data_root))
        try:
            shutil.copytree(self.d3m_config.training_data_root,
                            new_training_dir)
        except OSError:
            err_msg = ('Failed to copy training data root to %s'
                       ' (ExecutePipelineRequestHelper)') % new_training_dir
            self.add_error_message(err_msg)
            return False

        # copy problem_root directory
        #
        new_problem_root_dir = join(new_dest_directory,
                                    basename(self.d3m_config.problem_root))
        try:
            shutil.copytree(self.d3m_config.problem_root,
                            new_problem_root_dir)
        except OSError:
            err_msg = ('Failed to copy problem root to %s'
                       ' (ExecutePipelineRequestHelper)') % new_problem_root_dir
            self.add_error_message(err_msg)
            return False

        self.new_data_file_dest = join(new_training_dir,
                                       'tables/'
                                       'learningData.csv')

        try:
            shutil.copy(self.data_interim_file_path,
                        self.new_data_file_dest)
            print('file copied: [%s] to [%s]'  % \
                  (self.data_interim_file_path,
                   self.new_data_file_dest))
        except OSError:
            err_msg = ('Failed to copy data from [%s] to [%s]'
                       ' (ExecutePipelineRequestHelper)') % \
                       (self.data_interim_file_path,
                        self.new_data_file_dest)
            self.add_error_message(err_msg)
            return False

        success, new_uri_or_err = add_file_uri_to_path(\
                                    join(new_problem_root_dir,
                                         'problemDoc.json'))
        if not success:
            self.add_error_message(new_uri_or_err)
            return False

        self.new_problem_doc_uri = new_uri_or_err

        return True

    def passes_basic_error_check(self):
        """Start with some error checking--make sure that:
           - a new problem file has been specified
           - check if file exists, is readable, and is valid JSON
        """
        # Is there a "new_dataset_uri" key?
        #
        if not KEY_NEW_DATASET_URI in self.info_dict:
            err_msg = ('"%s" not found in info_dict'
                       ' (ExecutePipelineRequestHelper)') % \
                       (KEY_NEW_DATASET_URI)
            self.add_error_message(err_msg)
            return False

        # Usually this is a file_url (e.g. file://)
        # convert it to a reachable file path
        #
        self.data_interim_file_path, err_msg = format_file_uri_to_path(\
                                self.info_dict[KEY_NEW_DATASET_URI])
        if err_msg:
            self.add_error_message(err_msg)
            return False

        # Make sure this file exists
        #
        if not isfile(self.data_interim_file_path):
            err_msg = 'File not found: %s' % self.data_interim_file_path
            self.add_error_message(err_msg)
            return False

        # Make sure this file is readable
        #
        if not os.access(self.data_interim_file_path, os.R_OK):
            err_msg = 'File exists but NOT readable: %s' % self.data_interim_file_path
            self.add_error_message(err_msg)
            return False

        return True

    def is_file_valid_json(self):
        """Is the new data file valid JSON"""
        if self.has_error:
            return False

        # Is the file valid JSON`
        #
        try:
            fcontents = open(self.data_interim_file_path, 'r').read()
        except OSError:
            err_msg = 'Failed to open file: %s' % self.data_interim_file_path
            self.add_error_message(err_msg)
            return False

        # Load it as JSON
        #
        try:
            json.loads(fcontents, object_pairs_hook=OrderedDict)
        except json.decoder.JSONDecodeError as err_obj:
            err_msg = 'Failed to convert problem file [%s] to JSON: %s' % \
                      (self.data_interim_file_path, err_obj)
            self.add_error_message(err_msg)
            return False

        # Looking good so far
        #
        return True
