"""Helper for winter 2019 config loaded through env variables

Conforming to the 1/12/19 version of:
    - https://datadrivendiscovery.org/wiki/display/work/Evaluation+Workflow
    - https://datadrivendiscovery.org/wiki/pages/viewpage.action?pageId=11276800
"""
import os
from os.path import dirname, isdir, isfile, join
from django.conf import settings

from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.utils.json_helper import json_loads

from tworaven_apps.configurations.models_d3m import \
    (D3MConfiguration)
from tworaven_apps.configurations.static_vals import \
    (D3M_VARIABLE_LIST,
     D3M_DIRECTORY_VARIABLES,
     D3M_OUTPUT_SUBDIRECTORIES,
     KEY_D3M_DIR_TEMP,
     KEY_D3M_USER_PROBLEMS_ROOT)


class EnvConfigLoader(BasicErrCheck):
    """Create a config based on environment variables
    - Verify required directories
    - Create any needed subdirectories"""

    def __init__(self, **kwargs):
        """Make that config"""
        self.delete_if_exists = kwargs.get('delete_if_exists', False)

        self.problem_doc = None
        self.d3m_config = None

        self.run_make_config()

    def run_make_config(self):
        if self.has_error():
            return

        if not self.verify_variable_existence():
            return

        if not self.read_problem_doc():
            return

        self.build_config_entry()

    def read_problem_doc(self):
        """Verify the problem path
        example: "/input/TRAIN/problem_TRAIN/problemDoc.json"
        """
        if self.has_error():
            return False

        if not isfile(settings.D3MPROBLEMPATH):
            user_msg = ('D3MPROBLEMPATH file non-existent or'
                        ' can\'t be reached') % settings.D3MPROBLEMPATH
            self.add_err_msg(user_msg)
            return False

        json_content = open(settings.D3MPROBLEMPATH, 'r').read()
        pdoc_info = json_loads(json_content)
        if not pdoc_info.success:
            user_msg = ('D3MPROBLEMPATH file not JSON.  %s\nError: %s') % \
                        (settings.D3MPROBLEMPATH, pdoc_info.err_msg)
            self.add_err_msg(user_msg)
            return False

        self.problem_doc = pdoc_info.result_obj
        return True


    def verify_variable_existence(self):
        """Iterate through env variables and make sure they exist.
        If it's a directory, make sure it exists.
        """
        if self.has_error():
            return False

        for attr in D3M_VARIABLE_LIST:

            # Is it in settings?
            #
            if not hasattr(settings, attr):
                user_msg = 'Variable must be in settings: %s' % attr
                self.add_err_msg(user_msg)
                return False

            # Is a value set?
            #
            attr_val = getattr(settings, attr)
            if not attr_val:
                user_msg = 'Environment variable must be set: %s' % attr
                self.add_err_msg(user_msg)
                return False

            # If it's a directory, does it exist?
            #
            if attr in D3M_DIRECTORY_VARIABLES:
                if not isdir(attr_val):
                    user_msg = 'Directory not found for variable %s: %s' % \
                            (attr, attr_val)
                    self.add_err_msg(user_msg)
                    return False

        return True


    def build_config_entry(self):
        """Make an entry 185_baseball_dataset on the TA3 config here
        https://datadrivendiscovery.org/wiki/pages/viewpage.action?pageId=11276800
        For now, retrofitting back to D3MConfiguration model with
            temp_storage_root and user_problems_root, training_data_root

        New config example of problemDocPath
            example: "/input/TRAIN/problem_TRAIN/problemDoc.json"
        """
        if self.has_error():
            return

        # If created from paths, make it the default!
        #
        config_info = dict(is_default=True)

        try:
            name = self.problem_doc['about']['problemID']
            # name
            config_info['name'] = name
            # problem_schema
            config_info['problem_schema'] = settings.D3MPROBLEMPATH
        except KeyError:
            user_msg = ('about.Problem ID not found in problem doc: %s') % \
                    settings.D3MPROBLEMPATH
            self.add_err_msg(user_msg)
            return

        # If it exists, delete it
        d3m_config = D3MConfiguration.objects.filter(name=name).first()
        if d3m_config:
            if self.delete_if_exists:
                print('Found config with same name:' %  d3m_config)
                print('Deleting it....')
                d3m_config.delete()
            else:
                user_msg = 'Config with same id:name exists: %s:%s' % \
                        (d3m_config.id, d3m_config.name)
                self.add_err_msg(user_msg)
                return

        if settings.D3MPROBLEMPATH.find('problem_TRAIN'):
            # go up 2 directories + 'dataset_TRAIN'
            # don't rely on D3MINPUTDIR
            #
            config_info['training_data_root'] = \
                join(dirname(dirname(settings.D3MINPUTDIR)), 'dataset_TRAIN')

        config_info['root_output_directory'] = settings.D3MOUTPUTDIR
        config_info['d3m_input_dir'] = settings.D3MINPUTDIR
        config_info['ram'] = settings.D3MRAM
        config_info['cpus'] = settings.D3MCPU
        config_info['timeout'] = settings.D3MTIMEOUT

        new_config = D3MConfiguration(**config_info)
        new_config.save()

        for new_dirname in D3M_OUTPUT_SUBDIRECTORIES:
            new_dir_fullpath = join(settings.D3MOUTPUTDIR, new_dirname)
            if not isdir(new_dir_fullpath):
                os.makedirs(new_dir_fullpath, exist_ok=True)

            if new_dirname == KEY_D3M_DIR_TEMP:
                new_config.temp_storage_root = new_dir_fullpath

            if new_dirname == KEY_D3M_USER_PROBLEMS_ROOT:
                new_config.user_problems_root = new_dir_fullpath

        # save updated config
        new_config.save()

        self.d3m_config = new_config

    def get_d3m_config(self):
        """Return a pointer to the D3MConfiguration"""
        assert not self.has_error(), \
            "Make sure .has_error() is False before using this method!"

        return self.d3m_config
