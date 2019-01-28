import json
from unittest import skip
import os
from os.path import join

#from django.test import Client
from django.test import TestCase
from django.urls import reverse
from django.conf import settings
from django.template.loader import render_to_string

#from tworaven_apps.ta2_interfaces.ta2_util import format_info_for_request
#from tworaven_apps.ta2_interfaces.grpc_util import TA3TA2Util
from tworaven_apps.utils.msg_helper import msgt
from tworaven_apps.configurations.env_config_loader import EnvConfigLoader
from tworaven_apps.configurations.static_vals import \
    (D3M_VARIABLE_LIST,
     KEY_D3MINPUTDIR,
     KEY_TA2TA3)

class MakeConfigTest(TestCase):

    def setUp(self):
        # Set it to internal testing mode
        settings.TA2_STATIC_TEST_MODE = True

    def tearDown(self):
        """Remove test env variables"""
        for varname in D3M_VARIABLE_LIST:
            if varname in os.environ:
                del os.environ[varname]

    def test_010_working_config(self):
        """(10) Test Working config"""
        msgt(self.test_010_working_config.__doc__)
        baseball_dir = join(settings.BASE_DIR,
                            'ravens_volume',
                            'test_data',
                            '185_baseball')
        baseball_output_dir = join(\
                            settings.BASE_DIR,
                            'ravens_volume',
                            'test_output',)

        config_env = dict(\
                        D3MRUN=KEY_TA2TA3,
                        D3MINPUTDIR=baseball_dir,
                        D3MPROBLEMPATH=join(baseball_dir,
                                            '185_baseball_problem',
                                            'problemDoc.json'),
                        D3MOUTPUTDIR=baseball_output_dir,
                        D3MLOCALDIR=baseball_output_dir,
                        D3MSTATICDIR=baseball_output_dir,
                        D3MTIMEOUT='%d' % (60*10),
                        D3MCPU='1',
                        D3MRAM='1Gi')

        # update settings variables
        #
        for env_name, env_val in config_env.items():
            setattr(settings, env_name, env_val)

        """
        ekeys = list(os.environ.keys())
        ekeys.sort()
        for k in ekeys:
            print('%s: %s' % (k, os.environ[k]))
        """

        config_loader = EnvConfigLoader.run_loader_from_settings()
        if config_loader.has_error():
            print(config_loader.get_error_message())
        else:
            print('ok!', config_loader.get_d3m_config())

        self.assertEqual(config_loader.has_error(), False)

        d3m_config = config_loader.get_d3m_config()

        print(d3m_config.get_json_string(indent=4))

        # -----------------------------------------
        # update env variables
        # -----------------------------------------
        for env_name, env_val in config_env.items():
            os.environ[env_name] = env_val

        config_loader2 = EnvConfigLoader.run_loader_from_settings()
        if config_loader2.has_error():
            print(config_loader2.get_error_message())
        else:
            print('ok!', config_loader2.get_d3m_config())

        # Error b/c config just made with the same name
        #
        self.assertEqual(config_loader2.has_error(), True)

        # Delete config and try again
        #
        d3m_config.delete()
        config_loader2 = EnvConfigLoader.run_loader_from_env()
        self.assertEqual(config_loader.has_error(), False)
        d3m_config2 = config_loader2.get_d3m_config()
        print(d3m_config2.get_json_string(indent=4))
