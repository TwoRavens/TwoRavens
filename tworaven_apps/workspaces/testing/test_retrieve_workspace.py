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
from tworaven_apps.raven_auth.models import User
from tworaven_apps.workspaces.models import DataSourceType, SavedWorkspace
from tworaven_apps.workspaces.workspace_retriever import WorkspaceRetriever

TEST_FIXTURE_FILE = join(dirname(dirname(abspath(__file__))),
                         'fixtures',
                         'ws_test_2017_1205',)


class WorkspaceRetrievalTest(TestCase):

    fixtures = ['ws_test_2017_1205.json']

    def setUp(self):
        # test client
        pass

    def test_10_list_workspaces_null_user(self):
        """(10) List workspaces by null user"""
        msgt(self.test_10_list_workspaces_null_user.__doc__)

        success, ws_list = WorkspaceRetriever.list_workspaces_by_user(None)
        self.assertEqual(success, False)
        self.assertEqual(ws_list, ERR_AUTH_USER_IS_NONE)

    def test_20_list_workspaces_valid_user(self):
        """(20) List workspaces by valid user"""
        msgt(self.test_20_list_workspaces_valid_user.__doc__)

        user = User.objects.get(username='dev_admin')
        success, ws_list = WorkspaceRetriever.list_workspaces_by_user(user)
        self.assertEqual(success, True)
        self.assertEqual(len(ws_list), 3)

        msgt('get workspace by id and user')
        first_id = ws_list[0].id
        success, saved_ws = WorkspaceRetriever.get_by_user_and_id(user, first_id)
        self.assertEqual(success, True)

        msgt('check zvars')

        expected_zvars = ['Number_seasons', 'Games_played', 'At_bats', 'Runs',
                          'Hits', 'Doubles', 'Triples', 'Home_runs', 'RBIs',
                          'Walks', 'Strikeouts', 'Batting_average',
                          'On_base_pct', 'Slugging_pct', 'Fielding_ave',
                          'Position', 'Hall_of_Fame', 'Player']
        self.assertEqual(saved_ws.zparams['zvars'], expected_zvars)

    def test_30_workspace_by_view(self):
        """(30) Get workspace JSON via view"""
        msgt(self.test_30_workspace_by_view.__doc__)

        # Get a user
        user_obj = User.objects.get_or_create(username='dev_admin')[0]

        # Get workspace list for a legit id
        success, ws_list = WorkspaceRetriever.list_workspaces_by_user(user_obj)
        expected_workspace = ws_list[0]
        ws_id = expected_workspace.id

        # create a web client and login
        client = Client()
        client.force_login(user_obj)

        # retrieve the workspace
        url = reverse('view_workspace_by_id_json',
                      kwargs=dict(workspace_id=ws_id))

        response1 = client.get(url)

        # 200 status code
        #
        self.assertEqual(response1.status_code, 200)

        json_resp = response1.json()
        self.assertEqual(json_resp['app_domain'],
                         expected_workspace.app_domain)
        self.assertEqual(json_resp['user']['username'],
                         expected_workspace.user.username)
        self.assertEqual(json_resp['data_source_type']['name'],
                         expected_workspace.data_source_type.name)
