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
import os
from os.path import isdir, isfile
from tworaven_apps.configurations.models_d3m import KEY_PROBLEM_SCHEMA
from tworaven_apps.utils.url_helper import format_file_uri_to_path
from tworaven_apps.configurations.utils import \
    (get_latest_d3m_config,
     get_d3m_filepath)

KEY_NEW_DATASET_URI = 'new_dataset_uri'

class ExecutePipelineRequestHelper:
    """Used when a pointer to a dataset folder is needed"""

    def __init__(self, info_dict):

        self.info_dict = info_dict

        # to fill in
        self.new_dataset_uri = None

        # for error handling
        self.has_error = False
        self.error_message = None

        self.prepare_files()

    def add_error_message(self, err_msg):
        """Add error message"""
        self.has_error = True
        self.error_message = err_msg

    def prepare_files(self):
        """Go through the workflow..."""
        if not self.info_dict:
            err_msg = ('info_dict cannot be None--no information found'
                       ' (ExecutePipelineRequestHelper)')
            self.add_err_msg(err_msg)
            return

        if not KEY_NEW_DATASET_URI in self.info_dict:
            err_msg = ('"%s" not found in info_dict'
                       ' (ExecutePipelineRequestHelper)') % \
                       (KEY_NEW_DATASET_URI)
            self.add_err_msg(err_msg)
            return

        # Usually this is a file_url (e.g. file://)
        # convert it to a reachable file path
        #
        datafile_path, err_msg = format_file_uri_to_path(\
                            self.info_dict[KEY_NEW_DATASET_URI])

        if err_msg:
            self.add_err_msg(err_msg)
            return

        d3m_config = get_latest_d3m_config()
        if d3m_config is None:
            err_msg = 'D3M config not found (ExecutePipelineRequestHelper)'
            self.add_err_msg(err_msg)
            return
