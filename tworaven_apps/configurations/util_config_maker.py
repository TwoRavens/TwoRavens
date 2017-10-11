"""
Make some configs for dev testing based on paths local to the installation
"""
import os
import json
from os.path import abspath, isdir, join

from django.conf import settings

from tworaven_apps.configurations.models_d3m import D3MConfiguration


_TEST_BASE_DIR = join(settings.BASE_DIR, 'ravens_volume')
_TEST_DATA_DIR = join(_TEST_BASE_DIR, 'test_data')
_TEST_DATA_OUTPUT_DIR = join(_TEST_BASE_DIR, 'test_output')

if not isdir(_TEST_DATA_OUTPUT_DIR):
    os.makedirs(_TEST_DATA_OUTPUT_DIR)

class TestConfigMaker:
    """Make a D3M config based on local files in the /data directory
    Also create TA2 style config files for mount tests.
        - These config volumes take specify a root path from '/ravens_volume'
            and are for container use
    """

    def __init__(self, config_name='o_196seed', **kwargs):
        """set the config name"""
        self.config_name = config_name
        self.is_default = kwargs.get('is_default', False)

        # If this is used, the info sent to the db is cleared
        # it is assumed app will read from /ravens_volume/config*.json
        self.config_files_only = kwargs.get('config_files_only',
                                            False)

        self.make_d3m_config()

    @staticmethod
    def make_configs(config_files_only=False):
        """Make config db entries, directories, and files"""
        data_dir = _TEST_DATA_DIR

        problem_dirs = [x for x in os.listdir(data_dir)
                        if isdir(join(data_dir, x)) and
                        x[:2] in ['o_', 'r_'] and
                        not x.endswith('_output')]

        for idx, name in enumerate(problem_dirs):
            kwargs = dict(config_files_only=config_files_only)

            if idx == 0:
                kwargs['is_default'] = True
                tcm = TestConfigMaker(name, **kwargs)
            else:
                tcm = TestConfigMaker(name, **kwargs)

    @staticmethod
    def make_deploy_config_files():
        """Make config directories and files--but NOT db entries"""
        TestConfigMaker.make_configs(config_files_only=True)

    def add_gitkeep(self, dir_name):
        """Add an empty .gitkeep file to the directory"""
        if not isdir(dir_name):
            return

        fpath = join(dir_name, '.gitkeep')
        if isfile(fpath):
            return

        open(fpath, 'w').write('')

    def make_d3m_config(self):
        """Make a D3MConfiguration object"""

        # Does the local data directory exist?
        #
        config_data_dir = join(_TEST_DATA_DIR,
                               self.config_name)
        data_dir = abspath(config_data_dir)
        if not isdir(data_dir):
            print('Data directory doesn\'t exist: %s' % data_dir)
            print('> D3M config "%s" not loaded' % self.config_name)
            return

        if D3MConfiguration.objects.filter(name=self.config_name).first():
            print('> D3M config "%s" already exists' % self.config_name)
            return


        # Make the local output directory`
        #
        d3m_output_base = abspath(\
                            join(_TEST_DATA_OUTPUT_DIR,
                                 'd3m_output_%s' % self.config_name))


        #self.add_gitkeep(d3m_output_base)

        # create output dirs
        #
        output_dir_names = ['pipeline_logs', 'executables', 'temp']
        for folder_name in output_dir_names:
            d3m_output_dir = join(d3m_output_base, folder_name)
            if not isdir(d3m_output_dir):
                print('   ...Create D3M output dir: %s' % d3m_output_dir)
                os.makedirs(d3m_output_dir)
                #self.add_gitkeep(d3m_output_dir)

        # create a D3MConfiguration object
        #
        d3m_config = D3MConfiguration(\
            name=self.config_name,
            is_default=self.is_default,
            dataset_schema=join(data_dir, 'data', 'dataSchema.json'),
            problem_schema=join(data_dir, 'problemSchema.json'),
            training_data_root=join(data_dir, 'data'),
            pipeline_logs_root=join(d3m_output_base, output_dir_names[0]),
            executables_root=join(d3m_output_base, output_dir_names[1]),
            temp_storage_root=join(d3m_output_base, output_dir_names[2]))

        d3m_config.save()

        if not self.config_files_only:
            print('\n>> D3M config added for: %s' % self.config_name)

        # test-data deploy case with docker-compose or kubernetes
        #
        if self.config_files_only:
            config_info = d3m_config.to_ta2_config_test(save_shortened_names=True)
            config_content = json.dumps(config_info, indent=4)
            config_path = join(_TEST_BASE_DIR, 'config_%s.json' % self.config_name)
            open(config_path, 'w').write(config_content)
            print('file written: %s' % config_path)

            # Remove the db entry!
            #d3m_config.delete()
