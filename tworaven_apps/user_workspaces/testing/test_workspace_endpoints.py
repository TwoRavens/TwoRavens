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
                'test_d3m_config_2019_1106']

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

        self.assertTrue(not resp['success'])

    def test_20_list_workspaces_valid_user(self):
        """(20) List workspaces with a valid user"""
        msgt(self.test_20_list_workspaces_valid_user.__doc__)

        user = User.objects.get(username='test_user')

        #
        print('\n -- Retrieve the user workspaces.  Do NOT create a default one')
        #
        ws_info = ws_utils.get_user_workspaces(user, create_if_not_found=False)
        self.assertTrue(not ws_info.success)

        #
        print(('\n -- Retrieve the user workspaces.'
               ' Create if one not found. (This is the default behavior)'))
        #
        ws_info2 = ws_utils.get_user_workspaces(user)
        self.assertTrue(ws_info2.success)
        self.assertEqual(len(ws_info2.result_obj), 1)

        #
        print(('\n -- Retrieve the user workspaces as list of dicts.'))
        #
        ws_info3 = ws_utils.get_user_workspaces_as_dict(user)
        self.assertTrue(ws_info3.success)
        self.assertEqual(len(ws_info3.result_obj), 1)


    def test_30_workspace_by_view(self):
        """(30) List workspaces, Save workspace, Save as new workspace"""
        msgt(self.test_30_workspace_by_view.__doc__)

        user = User.objects.get(username='test_user')

        # create a web client
        client = Client()
        client.force_login(user)

        # --------------------------------------
        # Retrieve the workspace, should have no
        # raven_config
        # --------------------------------------
        print('\n -- Retrieve the workspace, should have no raven_config')

        url = reverse('view_latest_raven_configs',
                      kwargs=dict())

        resp = client.get(url).json()
        # print('resp', resp)

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

        selected_ws = None

        # --------------------------------------
        # Save workspace with a Raven Config
        # --------------------------------------
        print('\n -- Save workspace with a Raven Config')

        url = reverse('save_raven_config_to_existing_workspace',
                      kwargs=dict(workspace_id=user_workspace_id))

        params = {'raven_config': self.get_sample_raven_config()}

        resp = client.post(url, params, content_type='application/json').json()

        # success should be true and `raven_config` parameter should have
        # data!
        self.assertTrue(resp['success'])
        selected_ws = resp['data']

        self.assertTrue('raven_config' in selected_ws)
        self.assertTrue(selected_ws['raven_config'] is not None)

        self.assertTrue('problems' in selected_ws['raven_config'])

        selected_ws = None
        # --------------------------------------
        # Save workspace with a new name
        # --------------------------------------
        print('\n -- Save workspace with a new name')

        new_workspace_name = 'giraffe'
        url = reverse('save_raven_config_as_new_workspace',
                      kwargs=dict(workspace_id=user_workspace_id))

        params = {'raven_config': self.get_sample_raven_config(),
                  'new_workspace_name': new_workspace_name}

        resp = client.post(url, params, content_type='application/json').json()

        # success should be true and workspace name should be updated
        #
        self.assertTrue(resp['success'])
        selected_ws = resp['data']

        self.assertTrue('raven_config' in selected_ws)
        self.assertTrue(selected_ws['raven_config'] is not None)

        self.assertEqual(selected_ws['name'], new_workspace_name)

        selected_ws = None

        # --------------------------------------
        # Now there should be 2 workspaces...
        # --------------------------------------
        print('\n -- Now there should be 2 workspaces...')

        url = reverse('view_latest_raven_configs',
                      kwargs=dict())

        resp = client.get(url).json()

        # check success messages
        self.assertTrue(resp['success'])

        # should have 2 workspaces!
        self.assertEqual(len(resp['data']), 2)

        selected_ws = resp['data'][0]

        # The selected workspace should be "giraffe"
        self.assertTrue(selected_ws['is_current_workspace'])
        self.assertEqual(selected_ws['name'], new_workspace_name)

        new_workspace_id = selected_ws['user_workspace_id']

        selected_ws = None
        # --------------------------------------
        # Retrieve the current workspace by its id
        # --------------------------------------
        print('\n -- Retrieve the current workspace by its id')

        url = reverse('view_user_raven_config',
                      kwargs=dict(user_workspace_id=new_workspace_id))

        resp = client.get(url).json()

        # check success messages
        self.assertTrue(resp['success'])

        # check thaat workspace is retrieved
        self.assertEqual(resp['data']['user_workspace_id'], new_workspace_id)
        self.assertTrue('raven_config' in resp['data'])

        # --------------------------------------
        # Save workspace with a new name - AGAIN!
        # --------------------------------------
        print('\n -- Save workspace with a new name - AGAIN!')
        new_workspace_name = 'going to the country--gonna__'
        url = reverse('save_raven_config_as_new_workspace',
                      kwargs=dict(workspace_id=new_workspace_id))

        params = {'raven_config': self.get_sample_raven_config(),
                  'new_workspace_name': new_workspace_name}

        resp = client.post(url, params, content_type='application/json').json()

        # success should be true and workspace name should be updated
        #
        self.assertTrue(resp['success'])
        selected_ws = resp['data']

        self.assertTrue('raven_config' in selected_ws)
        self.assertTrue(selected_ws['raven_config'] is not None)

        self.assertEqual(selected_ws['name'], new_workspace_name)

        selected_ws = None


    def test_40_save_workspace_errors(self):
        """(40) Trying saving workspaces with bad params"""
        msgt(self.test_40_save_workspace_errors.__doc__)

        user = User.objects.get(username='test_user')

        # create a web client
        client = Client()
        client.force_login(user)

        # --------------------------------------
        # Retrieve the workspace, should have no
        # raven_config
        # --------------------------------------
        url = reverse('view_latest_raven_configs',
                      kwargs=dict())

        resp = client.get(url).json()

        # check success messages
        self.assertTrue(resp['success'])

        selected_ws = resp['data'][0]
        user_workspace_id = selected_ws['user_workspace_id']
        current_workspace_name =  selected_ws['name']

        # --------------------------------------
        # Save with bad id
        # --------------------------------------
        print('\n-- Save with bad id --')
        bad_id = 500
        url = reverse('save_raven_config_to_existing_workspace',
                      kwargs=dict(workspace_id=bad_id))

        params = {'raven_config': self.get_sample_raven_config()}

        resp = client.post(url, params, content_type='application/json').json()

        self.assertEqual(resp['success'], False)
        self.assertTrue('message' in resp)

        # --------------------------------------
        # Save with no raven config
        # --------------------------------------
        print('\n-- Save with no raven config --')

        url = reverse('save_raven_config_to_existing_workspace',
                      kwargs=dict(workspace_id=user_workspace_id))

        params = {}   # {'raven_config': self.get_sample_raven_config()}

        resp = client.post(url, params, content_type='application/json').json()

        self.assertEqual(resp['success'], False)
        self.assertTrue('message' in resp)

        # --------------------------------------
        # Save with null raven config
        # --------------------------------------
        print('\n-- Save with null raven config --')

        url = reverse('save_raven_config_to_existing_workspace',
                      kwargs=dict(workspace_id=user_workspace_id))

        params = {'raven_config': None}

        resp = client.post(url, params, content_type='application/json').json()

        self.assertEqual(resp['success'], False)
        self.assertTrue('message' in resp)

        # --------------------------------------
        # Save workspace with a new name -- but don't send the name
        # --------------------------------------
        print('\n-- Save new workspace w/o a name --')

        new_workspace_name = 'giraffe'
        url = reverse('save_raven_config_as_new_workspace',
                      kwargs=dict(workspace_id=user_workspace_id))

        params = {'raven_config': self.get_sample_raven_config(),
                  # 'new_workspace_name': new_workspace_name
                  }

        resp = client.post(url, params, content_type='application/json').json()
        self.assertEqual(resp['success'], False)
        self.assertTrue('message' in resp)

        # --------------------------------------
        # Save workspace with a new name -- but an invalid name
        # --------------------------------------
        print('\n-- Save workspace with a new name -- but an invalid name --')
        new_workspace_name = 'NumberLetter_-butnoothers#$@#$'

        url = reverse('save_raven_config_as_new_workspace',
                      kwargs=dict(workspace_id=user_workspace_id))

        params = {'raven_config': self.get_sample_raven_config(),
                  'new_workspace_name': new_workspace_name
                  }

        resp = client.post(url, params, content_type='application/json').json()
        self.assertEqual(resp['success'], False)
        self.assertTrue('message' in resp)

        # --------------------------------------
        # Save workspace with same name -- also invalid
        # --------------------------------------
        print('\n-- Save workspace with same name -- also invalid --')

        url = reverse('save_raven_config_as_new_workspace',
                      kwargs=dict(workspace_id=user_workspace_id))

        params = {'raven_config': self.get_sample_raven_config(),
                  'new_workspace_name': current_workspace_name
                  }

        resp = client.post(url, params, content_type='application/json').json()
        self.assertEqual(resp['success'], False)
        self.assertTrue('message' in resp)

        # --------------------------------------
        # Save workspace with too short a name
        # --------------------------------------
        print('\n-- Save workspace with too short a name --')

        new_workspace_name = 'meep'

        url = reverse('save_raven_config_as_new_workspace',
                      kwargs=dict(workspace_id=user_workspace_id))

        params = {'raven_config': self.get_sample_raven_config(),
                  'new_workspace_name': new_workspace_name
                  }

        resp = client.post(url, params, content_type='application/json').json()
        self.assertEqual(resp['success'], False)
        self.assertTrue('message' in resp)

    def get_sample_raven_config(self):
        """Return valid raven config for testing"""
        fcontents = open(TEST_RAVEN_CONFIG_FILE, 'r').read()
        return json.loads(fcontents)
