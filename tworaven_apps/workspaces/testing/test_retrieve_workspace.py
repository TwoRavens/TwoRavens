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

"""
class WorkspaceTestBaseFixtures(TestCase):

    #fixtures = ['ws_test_2017_1205.json']
    def setUp(self):
        # Load fixtures
        msgt('load fixtures from: %s' % TEST_FIXTURE_FILE)
        call_command('loaddata', TEST_FIXTURE_FILE, verbosity=0)
"""

class WorkspaceRetrievalTest(TestCase):

    fixtures = ['ws_test_2017_1205.json']

    def setUp(self):
        super(WorkspaceRetrievalTest, self).setUp()

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

        expected_zvars = ['Number_seasons', 'Games_played', 'At_bats', 'Runs', 'Hits', 'Doubles', 'Triples', 'Home_runs', 'RBIs', 'Walks', 'Strikeouts', 'Batting_average', 'On_base_pct', 'Slugging_pct', 'Fielding_ave', 'Position', 'Hall_of_Fame', 'Player']
        self.assertEqual(saved_ws.zparams['zvars'], expected_zvars)
