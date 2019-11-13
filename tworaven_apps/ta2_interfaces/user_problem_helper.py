"""Class for creating a User Defined Problem file and writing it
   to the D3M user_problems_root directory"""
import json
from datetime import datetime as dt
import os
from os.path import dirname, isdir, isfile, join
from collections import OrderedDict

from django.template.loader import render_to_string

from tworaven_apps.utils import random_info
from tworaven_apps.configurations.models_d3m import KEY_PROBLEM_SCHEMA
from tworaven_apps.configurations.utils import \
    (get_d3m_filepath,)
from tworaven_apps.user_workspaces.utils import \
    (get_latest_d3m_user_config,)

KEY_FILE_PREFIX = 'file_prefix'
KEY_TASK = 'task'
KEY_TASK_SUBTYPE = 'taskSubtype'
KEY_PROBLEM_DESCRIPTION = 'problemDescription'

class UserProblemHelper(object):
    """Create and write a new user problem"""
    def __init__(self, user_obj, problem_updates, **kwargs):
        """problem_updates is a dict sent from the UI"""
        self.user_obj = user_obj
        self.problem_updates = problem_updates
        self.save_schema_to_file = kwargs.get('save_schema_to_file', True)
        # -----------
        self.new_problem_doc = None
        self.problem_filepath = None
        self.problem_file_uri = None

        self.has_error = False
        self.error_message = None

        # -----------
        # run it!
        if self.update_problem_schema():
            if self.save_schema_to_file:
                self.write_problem_schema()

    def add_error_message(self, err_msg):
        """Add error message"""
        self.has_error = True
        self.error_message = err_msg

    def get_success_message(self):
        """user success message"""
        if self.has_error:
            return ('WARNING! WARNING! Error was encountered'
                    '(UserProblemHelper): ') %\
                   self.error_message

        if not self.save_schema_to_file:
            return 'Test endpoint. Problem doc created. (No file written)'

        return 'Problem written: %s' % self.problem_filepath


    def update_problem_schema(self):
        """Update the orig schema with the new info

        [ {target:"Home_runs",
            predictors:["Walks","RBIs"],
            task:"regression",
            rating:5,
            description: "Home_runs is predicted by Walks and RBIs",
            metric: "meanSquaredError"
            }, ]
        """
        if not self.problem_updates:
            self.add_error_message(('No problem updates specified'
                                    ' (UserProblemHelper)'))
            return False

        # (1) get the original problem schema
        #
        success, prob_schema_or_err = UserProblemHelper.get_current_problem_schema(self.user_obj)
        if not success:
            self.add_error_message(prob_schema_or_err)
            return False

        if not self.make_updates(prob_schema_or_err):
            return False

        return True

    def make_updates(self, orig_prob_schema):
        """Update the original schema"""
        if not orig_prob_schema:
            self.add_error_message(('"orig_prob_schema" not found'
                                    ' (UserProblemHelper)'))
            return False
        update_cnt = 0

        # ----------------------------------------------
        # CreatePipelines Field -> problemDoc.json Field
        # ----------------------------------------------

        # ----------------------------------------------
        # (1) task ->|  about > taskType
        # ----------------------------------------------
        if KEY_TASK in self.problem_updates:
            update_cnt += 1
            if not 'about' in orig_prob_schema:
                orig_prob_schema['about'] = OrderedDict()
            orig_prob_schema['about']['taskType'] = self.problem_updates[KEY_TASK]

        # ----------------------------------------------
        # (1a) taskSubtype ->|  about > taskSubtype
        # ----------------------------------------------
        if KEY_TASK_SUBTYPE in self.problem_updates:
            update_cnt += 1
            if not 'about' in orig_prob_schema:
                orig_prob_schema['about'] = OrderedDict()

            # A taskSubtype exists in the problem schema -> update it
            #
            if KEY_TASK_SUBTYPE in orig_prob_schema['about']:
                orig_prob_schema['about'][KEY_TASK_SUBTYPE] = \
                    self.problem_updates[KEY_TASK_SUBTYPE]
            else:
                # There's no taskSubtype AND
                # we want it to appear right after taskType --
                # little painful

                orig_about_section = orig_prob_schema['about']
                new_about_section = OrderedDict()

                # create a new 'about' section, putting taskSubType
                # in the right place
                for about_key, about_val in orig_about_section.items():
                    new_about_section[about_key] = about_val
                    if about_key == 'taskType':
                        new_about_section[KEY_TASK_SUBTYPE] = \
                            self.problem_updates[KEY_TASK_SUBTYPE]
                orig_prob_schema['about'] = new_about_section

        # ----------------------------------------------
        # (2) task_description ->|  about > problemDescription
        # ----------------------------------------------
        if 'task_description' in self.problem_updates:
            update_cnt += 1
            if not 'about' in orig_prob_schema:
                orig_prob_schema['about'] = OrderedDict()
            orig_prob_schema['about'][KEY_PROBLEM_DESCRIPTION] = \
                self.problem_updates['task_description']

        # ----------------------------------------------
        # (3) metrics ->| inputs > performanceMetrics > metric
        # ----------------------------------------------
        if 'metrics' in self.problem_updates:
            update_cnt += 1
            if not 'inputs' in orig_prob_schema:
                orig_prob_schema['inputs'] = OrderedDict()

            # reset the list of performanceMetrics
            orig_prob_schema['inputs']['performanceMetrics'] = []
            #if not 'performanceMetrics' in orig_prob_schema['inputs']:

            for single_metric_val in self.problem_updates['metrics']:
                single_metric_dict = OrderedDict()
                single_metric_dict['metric'] = single_metric_val
                orig_prob_schema['inputs']['performanceMetrics'].append(\
                            single_metric_dict)

        # ----------------------------------------------
        # (4) target_features ->|  inputs > data > targets > colName
        # ----------------------------------------------
        if 'targetFeatures' in self.problem_updates:
            update_cnt += 1
            if 'inputs' in orig_prob_schema and \
                'data' in orig_prob_schema['inputs']:

                num_data_entries = len(orig_prob_schema['inputs']['data'])
                if num_data_entries != 1:
                    err_msg = ('Expect the problem schema to have a single'
                               " entry for \"orig_prob_schema['inputs']['data']\""
                               ". Instead found %d entries.") % num_data_entries

                    self.add_error_message(err_msg)
                    return False

                target_list = []
                for tf in self.problem_updates['targetFeatures']:
                    target_list.append(dict(colName=tf['feature_name']))

                orig_prob_schema['inputs']['data'][0]['targets'] = target_list


        # make other updates, etc....
        """
        CreatePipelines Field -> problemDoc.json Field
        ----------------------------------------------
        task ->          about > taskType
        taskSubType ->          about > taskSubType
        task_description -> about > problemdescription
        metrics ->           inputs > performanceMetrics > metric
        target_features ->  inputs > data > targets > colName

        """

        ## TEST file UNTIL MAPPING READY
        update_cnt += 1
        new_doc_lookup = dict()
        try:
            new_doc_lookup['problem_schema'] = json.dumps(orig_prob_schema,
                                                          indent=4)
            new_doc_lookup['create_pipelines'] = json.dumps(self.problem_updates,
                                                            indent=4)
        except TypeError:
            err_msg = 'Error converting JSON data to string (UserProblemHelper)'
            self.add_error_message(err_msg)
            return False

        self.new_problem_doc = render_to_string('user_problem/problem_doc.txt',
                                                new_doc_lookup)

        if update_cnt == 0:
            self.add_error_message(('No updates made so no file to write'
                                    '(UserProblemHelper)'))
            return False

        return True

    def write_problem_schema(self):
        """Write the new_problem_doc to a file"""
        if self.has_error:
            return False

        if not self.new_problem_doc:
            err_msg = '"new_problem_doc" is not set! (UserProblemHelper)'
            self.add_error_message(err_msg)
            return False

        if KEY_FILE_PREFIX in self.problem_updates:
            success, filepath_or_err = \
                UserProblemHelper.write_to_user_problems_root(\
                            self.new_problem_doc,
                            file_prefix=self.problem_updates[KEY_FILE_PREFIX])
        else:
            success, filepath_or_err = \
                UserProblemHelper.write_to_user_problems_root(\
                                            self.new_problem_doc)

        if not success:
            self.add_error_message(filepath_or_err)
            return False

        self.problem_filepath = filepath_or_err
        self.problem_file_uri = 'file://%s' % filepath_or_err

        return True
        # *
        #


    @staticmethod
    def write_to_user_problems_root(user_obj, problem_info_string, file_prefix='user_prob'):
        """Write a JSON string as a new file to the
           "user_problems_root" directory"""
        if not problem_info_string:
            return False, '"problem_info" not specified (UserProblemHelper)'

        d3m_config_info = get_latest_d3m_user_config(user_obj)
        if not d3m_config_info.success:
            return False, 'D3M config not found (UserProblemHelper)'
        else:
            d3m_config = d3m_config_info.result_obj

        user_problems_root = d3m_config.user_problems_root
        if not isdir(user_problems_root):
            # directory doesn't exist, try to create it..
            try:
                os.makedirs(user_problems_root, exist_ok=True)
            except OSError as err_obj:
                return False,\
                       'Could not create user_problems_root: %s' % \
                       user_problems_root


        # create a file name based on the d3m config
        #
        filepath = None
        for _ in range(3):   # try 3 times, in case name exists

            # filename includes random element + timestring
            #
            fname = '%s_%s_%s.txt' % (\
                                file_prefix,
                                random_info.get_alphanumeric_string(4),
                                dt.now().strftime('%Y-%m-%d_%H-%M-%S'))

            filepath = join(d3m_config.user_problems_root, fname)
            if not isfile(filepath): # great!  doesn't exist
                break

        # write the file
        try:
            open(filepath, 'w').write(problem_info_string)
        except OSError as err_obj:
            return False,\
                   ('Failed to write file to: [%s]'
                    ' (UserProblemHelper): %s') % (filepath, err_obj)
        except Exception as err_obj:
            return False,\
                   ('Failed to write file to: [%s]'
                    ' (UserProblemHelper): %s') % (filepath, err_obj)

        # return file uri
        #file_uri = 'file://%s' % filepath
        return True, filepath


    @staticmethod
    def get_current_problem_schema(user_obj):
        """Return the D3M problem schema as an OrderedDict"""
        d3m_config_info = get_latest_d3m_user_config(user_obj)
        if not d3m_config_info.success:
            return False, ('D3M config not found.  Make sure a default'
                           ' config is set. (UserProblemHelper)')

        filepath_info = get_d3m_filepath(d3m_config_info.result_obj,
                                         KEY_PROBLEM_SCHEMA)
        if not filepath_info.success:
            return False, filepath_info.err_msg

        fcontents = None
        try:
            fcontents = open(filepath_info.result_obj, 'r').read()
        except IOError as err_obj:
            return False, 'Could not open file: %s' % err_obj

        try:
            info_dict = json.loads(fcontents, object_pairs_hook=OrderedDict)
        except json.decoder.JSONDecodeError as err_obj:
            err_msg = 'Failed to problem schema to JSON: %s' % (err_obj)
            return False, err_msg

        return True, info_dict
