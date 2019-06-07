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


from tworaven_apps.behavioral_logs.models import BehavioralLogEntry
from tworaven_apps.behavioral_logs.forms import BehavioralLogEntryForm
from tworaven_apps.behavioral_logs.log_util import BehavioralLogUtil as LogUtil
from tworaven_apps.behavioral_logs import static_vals as bl_static

CURRENT_DIR = dirname(abspath(__file__))
TEST_DATA_DIR = join(CURRENT_DIR, 'data')
#TEST_RAVEN_CONFIG_FILE = join(CURRENT_DIR, 'data', 'raven_config_valid.json')

#assert isfile(TEST_RAVEN_CONFIG_FILE), \
#        f'File not found: {TEST_RAVEN_CONFIG_FILE}'


class BehavioralLogTests(TestCase):

    fixtures = ['test_user_info_2019_0607.json',]
    #'test_d3m_config_2019_0605']

    def setUp(self):
        # test client
        pass

    def test_10_log_entry_not_logged_in(self):
        """(10) List workspaces, not logged in"""
        msgt(self.test_10_log_entry_not_logged_in.__doc__)

        # create a web client
        client = Client()

        # create log entry url
        url = reverse('view_create_log_entry')

        params = self.get_test_params_as_dict('log_params_01.json')

        resp = client.post(url,
                           params,
                           content_type='application/json').json()

        print('resp', resp)
        self.assertTrue(not resp['success'])

    def test_20_log_entry_valid(self):
        """(20) Send valid log entries via API"""
        msgt(self.test_20_log_entry_valid.__doc__)

        user = User.objects.get(username='test_user')

        # create a web client
        #
        client = Client()
        client.force_login(user)

        # create log entry url
        #
        url = reverse('view_create_log_entry_verbose')

        # retrieve log entry params
        #
        params = self.get_test_params_as_dict('log_params_01.json')

        # make the POST request
        #
        resp = client.post(url,
                           params,
                           content_type='application/json').json()

        print('resp', resp)
        self.assertTrue(resp['success'])
        self.assertTrue(resp['data']['id'])

    def test_30_log_entry_invalid(self):
        """(30) Try entering invalid data"""
        msgt(self.test_30_log_entry_invalid.__doc__)

        user = User.objects.get(username='test_user')

        # create a web client
        #
        client = Client()
        client.force_login(user)

        # create log entry url
        #
        url = reverse('view_create_log_entry_verbose')

        # retrieve log entry params
        #
        params = self.get_test_params_as_dict('log_params_02_invalid.json')

        # make the POST request
        #
        resp = client.post(url,
                           params,
                           content_type='application/json').json()

        print('resp', resp)
        self.assertTrue(not resp['success'])

        err_dict = resp['errors']
        self.assertTrue('type' in err_dict)
        self.assertTrue('activity_l1' in err_dict)
        self.assertTrue('path' in err_dict)



    def get_test_params_as_dict(self, fname):
        """Return valid raven config for testing"""

        fpath = join(TEST_DATA_DIR, fname)
        assert isfile(fpath), 'File not found: %s' % fpath

        fcontents = open(fpath, 'r').read()
        return json.loads(fcontents)
