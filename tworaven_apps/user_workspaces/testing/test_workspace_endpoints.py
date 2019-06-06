import json
from os.path import abspath, dirname, isfile, join

from django.test import Client
from django.test import TestCase
from django.urls import reverse
from django.conf import settings
from django.template.loader import render_to_string
from django.core.management import call_command

from tworaven_apps.utils.error_messages import *

from tworaven_apps.utils.msg_helper import msgt, msg
from tworaven_apps.user_workspaces import utils as ws_utils

from tworaven_apps.raven_auth.models import User
from tworaven_apps.configurations.models_d3m import D3MConfiguration

CURRENT_DIR = dirname(abspath(__file__))
TEST_RAVEN_CONFIG_FILE = join(CURRENT_DIR, 'data', 'raven_config_valid.json')

assert isfile(TEST_RAVEN_CONFIG_FILE), \
        f'File not found: {TEST_RAVEN_CONFIG_FILE}'


class WorkspaceEndpointTests(TestCase):

    fixtures = ['test_data_2019_0605.json',
                'test_d3m_config_2019_0605']

    def setUp(self):
        # test client
        pass

    def test_10_list_workspaces_not_logged_in(self):
        """(10) List workspaces, not logged in"""
        msgt(self.test_10_list_workspaces_not_logged_in.__doc__)

        # create a web client
        client = Client()

        # retrieve the workspace
        url = reverse('view_latest_raven_configs',
                      kwargs=dict())

        resp = client.get(url).json()

        print('resp', resp)

        self.assertTrue(not resp['success'])

    def test_20_list_workspaces_valid_user(self):
        """(20) List workspaces with a valid user"""
        msgt(self.test_20_list_workspaces_valid_user.__doc__)

        user = User.objects.get(username='test_user')

        for d3m_config in D3MConfiguration.objects.all():
            print('d3m_config', d3m_config.is_default)

        ws_info = ws_utils.get_user_workspaces(user, create_if_not_found=False)
        self.assertTrue(not ws_info.success)

        ws_info2 = ws_utils.get_user_workspaces(user)
        self.assertTrue(ws_info2.success)
        print(ws_info2)

        ws_info3 = ws_utils.get_user_workspaces_as_dict(user)
        self.assertTrue(ws_info3.success)



    def test_30_workspace_by_view(self):
        """(30) Get workspace JSON via view"""
        msgt(self.test_30_workspace_by_view.__doc__)

        user = User.objects.get(username='test_user')

        # create a web client
        client = Client()
        client.force_login(user)

        # retrieve the workspace
        url = reverse('view_latest_raven_configs',
                      kwargs=dict())

        resp = client.get(url).json()

        print('resp', resp)

        # check success messages
        self.assertTrue(resp['success'])

        # should have 1 workspace, created on call
        self.assertEqual(len(resp['data']), 1)

        # The workspace should contain the following variables:
        #   user_workspace_id, is_current_workspace, d3m_config, raven_config
        #
        selected_ws = resp['data'][0]
        user_workspace_id = selected_ws['user_workspace_id']
        self.assertEqual(user_workspace_id, 1)
        self.assertTrue(selected_ws['is_current_workspace'])
        self.assertTrue('d3m_config' in selected_ws)
        self.assertTrue('raven_config' in selected_ws)

        # The raven_config should be empty as nothing has been saved yet
        #
        self.assertTrue(selected_ws['raven_config'] is None)

        # Save workspace with a Raven Config
        #
        url = reverse('save_raven_config_to_existing_workspace',
                      kwargs=dict(workspace_id=user_workspace_id))

        params = {'raven_config': self.get_sample_raven_config()}

        resp = client.post(url, params, content_type='application/json').json()

        # success should be true and `raven_config` parameter should have
        # data!
        self.assertTrue(resp['success'])
        selected_ws2 = resp['data'][0]

        self.assertTrue('raven_config' in selected_ws2)
        self.assertTrue(selected_ws2['raven_config'] is not None)

        self.assertTrue('problems' in selected_ws2['raven_config'])

        #print('resp', resp)
        #print('resp.status_code', resp.status_code)
        #print('resp.content', resp.content)


    def get_sample_raven_config(self):
        """Return valid raven config for testing"""
        fcontents = open(TEST_RAVEN_CONFIG_FILE, 'r').read()
        return json.loads(fcontents)
