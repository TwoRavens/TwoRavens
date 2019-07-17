"""Helper for winter 2019 config loaded through env variables

Conforming to the 1/12/19 version of:
    - https://datadrivendiscovery.org/wiki/display/work/Evaluation+Workflow
    - https://datadrivendiscovery.org/wiki/pages/viewpage.action?pageId=11276800
"""
import os
from os.path import basename, dirname, isdir, isfile, join
from types import SimpleNamespace

from django.conf import settings

from tworaven_apps.utils import random_info
from tworaven_apps.utils.msg_helper import msgt
from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.utils.json_helper import json_loads
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)
from tworaven_apps.configurations.models_d3m import \
    (D3MConfiguration)
from tworaven_apps.configurations import static_vals as cstatic



class EnvConfigLoader(BasicErrCheck):
    """Create a config based on a dict containing key value
    pairs based on the D3M environment variables
    - Includes static method to load from actual environment variables
    - Verify required directories
    - Create any needed subdirectories"""

    def __init__(self, env_config_vals, **kwargs):
        """Make that config
        env_config_vals - may be a dict or SimpleNamespace

        is_default_config - Set this as the default config

        For augmented datasets, add these extra arguments:
        (1) orig_dataset_id="orig name or dataset id"
        (2) is_user_config=True
        """
        self.env_config = env_config_vals
        if isinstance(self.env_config, dict):
            self.env_config = SimpleNamespace(**self.env_config)

        assert isinstance(self.env_config, SimpleNamespace), \
            '"env_config_vals" must be a dict or a SimpleNamespace'

        self.delete_if_exists = kwargs.get('delete_if_exists', False)
        self.success_keeping_config = False

        self.is_default_config = kwargs.get('is_default_config', False)

        self.orig_dataset_id = kwargs.get('orig_dataset_id', None)
        self.is_user_config = kwargs.get('is_user_config', False)

        self.problem_doc = None
        self.d3m_config = None

        self.run_make_config()

    @staticmethod
    def run_loader_from_settings():
        """Use variables from Django settings"""
        config_info = SimpleNamespace()

        for attr in cstatic.D3M_VARIABLE_LIST:
            if not hasattr(settings, attr):
                setattr(config_info, attr, None)
            else:
                setattr(config_info, attr, getattr(settings, attr))

        params = dict() #dict(delete_if_exists=True)
        return EnvConfigLoader(config_info, **params)

    @staticmethod
    def run_loader_from_env():
        """Use the current environment variables"""
        config_info = dict()

        for attr in cstatic.D3M_VARIABLE_LIST:
            if attr in os.environ:
                config_info[attr] = os.environ[attr]
            else:
                config_info[attr] = None

        return EnvConfigLoader(config_info,
                               is_default_config=True,
                               delete_if_exists=True)


    def run_make_config(self):
        """Make a D3MConfiguration object"""
        if self.has_error():
            return

        if not self.verify_variable_existence():
            return

        if not self.read_problem_doc_if_exists():
            return

        self.build_config_entry()

        # bit of a hack, condition where keep config
        if self.success_keeping_config:
            return

    def read_problem_doc_if_exists(self):
        """Verify the problem path
        example: "/input/TRAIN/problem_TRAIN/problemDoc.json"

        Note: As of 7/17/2019, it's ok if there's no problem doc
        """
        if self.has_error():
            return False

        if not isfile(self.env_config.D3MPROBLEMPATH):
            user_msg = ('D3MPROBLEMPATH file non-existent or'
                        ' can\'t be reached: %s') % \
                        self.env_config.D3MPROBLEMPATH
            print('Note: ', user_msg)
            # self.add_err_msg(user_msg)
            return True

        json_content = open(self.env_config.D3MPROBLEMPATH, 'r').read()
        pdoc_info = json_loads(json_content)
        if not pdoc_info.success:
            user_msg = ('D3MPROBLEMPATH file not JSON.  %s\nError: %s') % \
                        (self.env_config.D3MPROBLEMPATH, pdoc_info.err_msg)
            print('Note: ', user_msg)
            # self.add_err_msg(user_msg)
            return True

        self.problem_doc = pdoc_info.result_obj
        return True


    def verify_variable_existence(self):
        """Iterate through variables and make sure they exist.
        If it's a directory, make sure it exists.
        """
        if self.has_error():
            return False

        for attr in cstatic.D3M_REQUIRED_VARIABLES:    # cstatic.D3M_VARIABLE_LIST:

            # Is it in settings?
            #
            if not hasattr(self.env_config, attr):
                user_msg = 'Variable must be in settings: %s' % attr
                self.add_err_msg(user_msg)
                return False

            # Is a value set?
            #
            attr_val = getattr(self.env_config, attr)
            if not attr_val:
                user_msg = 'Environment variable must be set: %s' % attr
                self.add_err_msg(user_msg)
                return False

            # If it's a directory, does it exist?
            #
            if attr in cstatic.D3M_DIRECTORY_VARIABLES:
                if not isdir(attr_val):
                    if attr in [cstatic.KEY_D3MSTATICDIR, cstatic.KEY_D3MLOCALDIR]:
                        try:
                            os.makedirs(attr_val, exist_ok=True)
                        except OSError:
                            user_msg = ('Failed to find or create directory'
                                        ' for %s at %s') % \
                                        (attr, attr_val)
                            return False
                    else:
                        user_msg = 'Directory not found for variable %s: %s' % \
                                (attr, attr_val)
                        self.add_err_msg(user_msg)
                        return False

        return True


    def build_config_entry(self):
        """Make an entry 185_baseball_dataset on the TA3 config here
        https://datadrivendiscovery.org/wiki/pages/viewpage.action?pageId=11276800
        For now, retrofitting back to D3MConfiguration model with
            user_problems_root, training_data_root

        New config example of problemDocPath
            example: "/input/TRAIN/problem_TRAIN/problemDoc.json"
        """
        if self.has_error():
            return

        # Should this be the default?
        #
        print('Default status', self.is_default_config)
        config_info = dict(is_default=self.is_default_config)

        if self.problem_doc:
            try:
                name = self.problem_doc['about']['problemID']
            except KeyError:
                user_msg = ('about.Problem ID not found in problem doc: %s') % \
                        self.env_config.D3MPROBLEMPATH
                self.add_err_msg(user_msg)
                return
        else:
            name = 'config_%s_%s' % \
                        (random_info.get_timestamp_string(),
                         random_info.get_alphanumeric_lowercase(4))
        # If it exists, delete it
        d3m_config = D3MConfiguration.objects.filter(name=name).first()
        if d3m_config:
            print('-' * 40)
            print('Found config with same name: %s' %  d3m_config)
            if self.delete_if_exists:
                print('Deleting it....')
                d3m_config.delete()
            else:
                user_msg = ('Config with same name'
                            ' (%s) exists. Keeping it.') % \
                            (d3m_config.id,)

                self.success_keeping_config = True
                self.d3m_config = d3m_config
                print(user_msg)
                print('-' * 40)

                return

        config_info['name'] = name
        config_info['orig_dataset_id'] = \
                        self.orig_dataset_id if self.orig_dataset_id else name
        config_info['is_user_config'] = self.is_user_config


        # problem_schema
        config_info['problem_schema'] = self.env_config.D3MPROBLEMPATH
        config_info['problem_root'] = dirname(self.env_config.D3MPROBLEMPATH)


        if not isdir(self.env_config.D3MINPUTDIR):
            user_msg = (f'D3MINPUTDIR is not accessible:'
                        f' {self.env_config.D3MINPUTDIR}')
            self.add_err_msg(user_msg)
            return


        config_info['training_data_root'] = \
                join(self.env_config.D3MINPUTDIR,
                     'TRAIN',
                     'dataset_TRAIN')

        config_info['dataset_schema'] = \
            join(config_info['training_data_root'],
                 'datasetDoc.json')

        config_info['root_output_directory'] = self.env_config.D3MOUTPUTDIR
        config_info['d3m_input_dir'] = self.env_config.D3MINPUTDIR
        config_info['ram'] = self.env_config.D3MRAM
        config_info['cpus'] = self.env_config.D3MCPU
        config_info['timeout'] = self.env_config.D3MTIMEOUT
        config_info['env_values'] = self.env_config.__dict__
        #print('config_info', config_info)
        new_config = D3MConfiguration(**config_info)
        new_config.save()

        print('new_config default', new_config.is_default)

        for new_dirname in cstatic.D3M_OUTPUT_SUBDIRECTORIES:
            new_dir_fullpath = join(self.env_config.D3MOUTPUTDIR, new_dirname)

            if not isdir(new_dir_fullpath):
                os.makedirs(new_dir_fullpath, exist_ok=True)

            if new_dirname == cstatic.USER_PROBLEMS_ROOT_DIR_NAME:
                print('!!! Create: new_dirname', new_dirname)
                # updated, retrieved with key cstatic.KEY_D3M_USER_PROBLEMS_ROOT:
                new_config.user_problems_root = new_dir_fullpath

            elif new_dirname == cstatic.KEY_D3M_DIR_ADDITIONAL_INPUTS:
                new_config.additional_inputs = new_dir_fullpath

        # save updated config
        new_config.save()

        self.d3m_config = new_config

    def get_d3m_config(self):
        """Return a pointer to the D3MConfiguration"""
        assert not self.has_error(), \
            "Make sure .has_error() is False before using this method!"

        return self.d3m_config

    @staticmethod
    def make_d3m_test_configs_env_based(base_data_dir=None):
        """Iterate over test data directories to make D3M configs"""
        if base_data_dir is None:
            base_data_dir = join(settings.BASE_DIR,
                                 'ravens_volume',
                                 'test_data')
        cnt = 0
        for dname in os.listdir(base_data_dir):
            #if not dname[0].isdigit():
            #    if dname not in ['TR1_Greed_Versus_Grievance']:
            #        continue
            cnt += 1
            fullpath = join(base_data_dir, dname)
            msgt('(%d) Make config: %s' % (cnt, fullpath))
            attempt_info = EnvConfigLoader.make_config_from_directory(fullpath)
            if attempt_info.success:
                print('It worked!  Created: %s' % attempt_info.result_obj)
            else:
                print('Error: %s' % attempt_info.err_msg)

    @staticmethod
    def make_config_from_directory(fullpath, **kwargs):
        """Make a directory from an existing path"""
        if not isdir(fullpath):
            return err_resp('Directory not found: %s' % fullpath)

        info = SimpleNamespace()

        info.D3MRUN = cstatic.KEY_TA2TA3 # ?
        info.D3MINPUTDIR = fullpath
        info.D3MPROBLEMPATH = join(fullpath,
                                   'TRAIN',
                                   'problem_TRAIN',
                                   'problemDoc.json')

        # Create these output directories
        #
        info.D3MOUTPUTDIR = join(dirname(dirname(fullpath)),
                                 'test_output',
                                 basename(fullpath))
        os.makedirs(info.D3MOUTPUTDIR, exist_ok=True)

        info.D3MLOCALDIR = join(info.D3MOUTPUTDIR, 'local_dir')
        os.makedirs(info.D3MLOCALDIR, exist_ok=True)

        info.D3MSTATICDIR = join(info.D3MOUTPUTDIR, 'static_dir')
        os.makedirs(info.D3MSTATICDIR, exist_ok=True)

        info.D3MTIMEOUT = '%d' % (60*10)
        info.D3MCPU = '1'
        info.D3MRAM = 1 # 1000 * 1024 * 1024 # '1Gi'
        #info.D3MRAM = '1Gi'

        loader = EnvConfigLoader(info, **kwargs)
        if loader.has_error():
            if loader.success_keeping_config:
                return ok_resp(loader.get_d3m_config())
            else:
                return err_resp(loader.get_error_message())
        else:
            return ok_resp(loader.get_d3m_config())
