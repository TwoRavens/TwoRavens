"""
Convenience commands to run local TA2 docker images
- Updated on 7/17/2018 for the TA2TA3 API
"""
import os
from os.path import isdir, isfile, join

from django.core import management

from tworaven_apps.utils.basic_response import ok_resp, err_resp
from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.configurations.models_d3m import \
    (D3M_SEARCH_CONFIG_NAME,)


RAVENS_DIR = '/ravens_volume/test_data'
RAVENS_OUTPUT_DIR = '/ravens_volume/test_output'

TA2_FeatureLabs = 'TA2_FeatureLabs'
TA2_Brown = 'TA2_Brown'
TA2_ISI = 'TA2_ISI'
TA2_STANFORD = 'TA2_STANFORD'

TA2_NAMES = (TA2_FeatureLabs,
             TA2_Brown,
             TA2_ISI,
             TA2_STANFORD)

TA2_IMAGE_INFO = [
    # Feature Labs: may not be using D3MPORT
    (TA2_FeatureLabs,
     'registry.datadrivendiscovery.org/jkanter/mit-fl-ta2:stable',
     '-p 45042:45042 -e D3MPORT=45042'),

    # Brown: may not be using D3MPORT
    (TA2_Brown,
     'registry.datadrivendiscovery.org/zshang/brown:ta2 ta2_search',
     '-p 45042:45042  -e D3MPORT=45042 -e D3MTESTOPT=xxx -e D3MCPU=1 -e D3MRAM=1Gi'),

    # ISI: not using D3MPORT
    (TA2_ISI,
     'registry.datadrivendiscovery.org/ta2-submissions-summer/ta2-isi/ta3ta2-image:latest',
     '-p 45042:45042 --memory 10g -e D3MRAM=10Gi -e D3MCPU=1'),

    # STANFORD: not using D3MPORT
    (TA2_STANFORD,
     'registry.datadrivendiscovery.org/jdunnmon/d3m-ta2-stanford:latest',
     '-p 45042:50051 --memory 10g -e D3MRAM=10Gi -e D3MCPU=1'),
]

class TA2Helper(BasicErrCheck):
    """For running local TA2 docker images"""
    def __init__(self, ta2_name, data_input_dir, data_output_dir, **kwargs):
        """
        ta2_image_name - TA2 image name
        """
        self.data_input_dir = data_input_dir
        self.data_output_dir = data_output_dir
        self.ta2_name = ta2_name

        self.basic_checks()
        self.load_d3m_config()

    def get_ta2_info(self):
        """Return TA2 Info"""
        for info in TA2_IMAGE_INFO:
            if self.ta2_name == info[0]:
                return info

        user_msg = "No TA2 image info found for name: %s" % self.ta2_name
        self.add_err_msg(user_msg)
        return None


    @staticmethod
    def get_problem_choices():
        """List the problem set choices"""
        # pull config files from ravens volume
        config_choices = [x for x in os.listdir(RAVENS_DIR)
                          if isdir(join(RAVENS_DIR, x)) and \
                             isfile(join(RAVENS_DIR, x, D3M_SEARCH_CONFIG_NAME))]

        # pair each data directory with a number:
        # [(1, 185_baseball), (2, 196_autoMpg), etc]
        #
        choice_pairs = [(idx, x) for idx, x in enumerate(config_choices, 1)]

        return choice_pairs

    @staticmethod
    def show_choices(cmd_name='run_featurelabs_choose_config'):
        """Print the problem choices to the Terminal"""
        choice_pairs = TA2Helper.get_problem_choices()

        print('-' * 40)
        print('Listing config files in: %s' % RAVENS_DIR)
        print('-' * 40)
        print('\nPlease run the fab command again using a config file number:\n')
        for choice_pair in choice_pairs:
            print('(%d) %s' % (choice_pair[0], choice_pair[1]))

        print('\nExample: fab %s:1' % cmd_name)

    @staticmethod
    def run_ta2_with_dataset(ta2_name, choice_num, cmd_name):
        """Run a TA2 with a selected dataset"""
        if not choice_num:
            TA2Helper.show_choices(cmd_name)
            return err_resp('')

        if not choice_num.isdigit():
            TA2Helper.show_choices(cmd_name)
            user_msg = ('\n--> Error: "%s" is not a valid choice'
                        '\n    Please choose a valid number') % choice_num
            return err_resp(user_msg)

        # ------------------------------
        # select the dataset
        # ------------------------------
        choice_pairs = TA2Helper.get_problem_choices()

        choice_num = int(choice_num)
        if choice_num in [x[0] for x in choice_pairs]:
            data_dir_path = join(RAVENS_DIR, choice_pairs[choice_num-1][1])
            output_dir_path = join(RAVENS_OUTPUT_DIR, choice_pairs[choice_num-1][1])
        else:
            print('\n--> Error: "%d" is not a valid choice\n' % choice_num)
            TA2Helper.show_choices(cmd_name)
            return err_resp('')

        # ------------------------------
        # Run the TA2
        # ------------------------------
        ta2_helper = TA2Helper(ta2_name, data_dir_path, output_dir_path)
        if ta2_helper.has_error():
            return err_resp(ta2_helper.error_message)

        return ok_resp(ta2_helper.get_ta2_run_command())


    def get_ta2_run_command(self):
        """Return the Docker run command"""
        if self.has_error():
            return self.error_message

        ta2_info = self.get_ta2_info()
        if not ta2_info:
            return

        image_name = ta2_info[1]
        additional_options = ta2_info[2]

        print('INPUT', self.data_input_dir)
        print('OUTPUT', self.data_output_dir)

        docker_cmd = ('docker run --rm'
                      ' --name ta2_server'
                      ' -e D3MTIMEOUT=60'
                      ' -e D3MINPUTDIR=/input'
                      ' -e D3MOUTPUTDIR=/output'
                      ' -e D3MRUN=ta2ta3'
                      ' {2}'
                      ' -v {0}:/input'
                      ' -v {1}:/output'
                      ' -v /ravens_volume:/ravens_volume'
                      ' {3}'
                      '').format(self.data_input_dir,
                                 self.data_output_dir,
                                 additional_options,
                                 image_name)

        return docker_cmd

    def load_d3m_config(self):
        """load D3M config"""
        if self.has_error():
            return

        try:
            management.call_command('load_config', self.data_input_dir)
        except management.base.CommandError as err_obj:
            user_msg = '> Failed to load D3M config.\n%s' % err_obj
            self.add_err_msg(user_msg)


    def basic_checks(self):
        """check basic paths, etc"""
        if not self.ta2_name in TA2_NAMES:
            user_msg = 'No TA2 name specified.  Allowed names: %s' % TA2_NAMES
            self.add_err_msg(user_msg)
            return

        if not isdir(self.data_input_dir):
            user_msg = 'ERROR: Data directory not found: %s' % \
                       self.data_input_dir
            self.add_err_msg(user_msg)
            return

        config_file = join(self.data_input_dir,
                           D3M_SEARCH_CONFIG_NAME)

        if not isfile(config_file):
            user_msg = 'ERROR: config file not found: %s' % config_file
            self.add_err_msg(user_msg)
            return

        if not isdir(self.data_output_dir):
            os.makedirs(self.data_output_dir)
            print('output directory created: %s' % self.data_output_dir)


    def ta2_notes(self):
        """
        docker run -t --name ta2_server -p45042:45042 -e D3MTIMEOUT=1 -e D3MINPUTDIR=/input -e D3MOUTPUTDIR=/output -e D3MRUN=ta2ta3 -e D3MTESTOPT=xxx -e D3MCPU=1 -e D3MRAM=1Gi -v $(pwd)/data/datasets:/input -v $(pwd)/data/output:/output  registry.datadrivendiscovery.org/zshang/brown:ta2 ta2_search
        """
        pass