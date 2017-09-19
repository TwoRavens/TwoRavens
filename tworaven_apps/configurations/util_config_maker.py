"""
Make some configs for dev testing based on paths local to the installation
"""
import os
from os.path import abspath, isdir, join

from django.conf import settings

from tworaven_apps.configurations.models_d3m import D3MConfiguration

class TestConfigMaker:
    """Make a D3M config based on local files in the /data directory"""

    def __init__(self, config_name='o_196seed', is_default=False):
        """set the config name"""
        self.config_name = config_name
        self.is_default = is_default
        self.make_d3m_config()

    @staticmethod
    def make_configs():
        """Make config entries"""
        for idx, name in enumerate(['o_196seed', 'o_4550']):
            if idx==0:
                tcm = TestConfigMaker(name, is_default=True)
            else:
                tcm = TestConfigMaker(name)

    def make_d3m_config(self):
        """Make a D3MConfiguration object"""

        # Does the local data directory exist?
        #
        config_data_dir = join(settings.BASE_DIR,
                               'data',
                               'd3m',
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
                            join(settings.LOCAL_SETUP_DIR,
                                 'd3m_output_%s' % self.config_name))

        # create output dirs
        #
        for folder_name in ['pipeline_logs', 'executables', 'temp']:
            d3m_output_dir = join(d3m_output_base, folder_name)
            if not isdir(d3m_output_dir):
                print('   ...Create D3M output dir: %s' % d3m_output_dir)
                os.makedirs(d3m_output_dir)

        # create a D3MConfiguration object
        #
        d3m_config = D3MConfiguration(\
            name=self.config_name,
            is_default=self.is_default,
            dataset_schema=join(data_dir, 'data', 'dataSchema.json'),
            problem_schema=join(data_dir, 'problemSchema.json'),
            training_data_root=join(data_dir, 'data'),
            pipeline_logs_root=d3m_output_dir,
            executables_root=d3m_output_dir,
            temp_storage_root=d3m_output_dir)

        d3m_config.save()
        print('\n>> D3M config added for: %s' % self.config_name)
