import json

from django.test import Client
from django.test import TestCase
from django.urls import reverse
from django.conf import settings

from tworaven_apps.ta2_interfaces.ta2_util import format_info_for_request
from tworaven_apps.utils.msg_helper import msgt
from tworaven_apps.ta2_interfaces.models import STATUS_VAL_OK,\
    STATUS_VAL_FAILED_PRECONDITION
from tworaven_apps.ta2_interfaces.req_start_session import ERR_MSG_NO_USER_AGENT
from tworaven_apps.ta2_interfaces.req_end_session import ERR_NO_SESSION_ID
#from tworaven_apps.ta2_interfaces.models import Animal

class StartEndSessionTest(TestCase):
    def setUp(self):
        # Set it to internal testing mode
        settings.TA2_STATIC_TEST_MODE = True

    def test_10_good_start(self):
        """(10) Test start session endpoint used by UI"""
        msgt(self.test_10_good_start.__doc__)
        # test client
        client = Client()

        # url and info for call
        #
        url = reverse('StartSession')
        info = dict(user_agent='user_agent')

        response = client.post(url, format_info_for_request(info))

        # 200 response
        #
        self.assertEqual(response.status_code, 200)

        # convert to JSON
        #
        json_resp = response.json()
        print('json_resp', json_resp)

        # status code 'OK'
        #
        self.assertEqual(json_resp['responseInfo']['status']['code'],
                         STATUS_VAL_OK)

        # sessionId returned
        #
        self.assertTrue('sessionId' in json_resp['context'])

        # session id length is reasonable
        #
        self.assertTrue(len(json_resp['context']['sessionId']) > 5)



    def test_20_bad_start(self):
        """(20) Test start session endpoint used by UI. Send an unknown field"""
        msgt(self.test_20_bad_start.__doc__)
        # test client
        client = Client()

        # url and info for call
        #
        url = reverse('StartSession')
        info = dict(user_agent='secret_agent_man',
                    unknown_field='what\'s this?')

        response = client.post(url, format_info_for_request(info))

        # 200 response
        #
        self.assertEqual(response.status_code, 200)

        # convert to JSON
        #
        json_resp = response.json()
        print('json_resp', json_resp)

        # status code 'FAILED_PRECONDITION'
        #
        self.assertEqual(json_resp['responseInfo']['status']['code'],
                         STATUS_VAL_FAILED_PRECONDITION)

        # error message found
        #
        err_snippet = '"SessionRequest" has no field named "unknown_field"'
        idx = json_resp['responseInfo']['status']['details'].find(err_snippet)
        self.assertTrue(idx > -1)

    def test_30_bad_start(self):
        """(30) Test start session endpoint used by UI. Don't send a user agent"""
        msgt(self.test_30_bad_start.__doc__)
        # test client
        client = Client()

        # url and info for call
        #
        url = reverse('StartSession')
        info = dict()   # don't send any info

        response = client.post(url, format_info_for_request(info))

        # 200 response
        #
        self.assertEqual(response.status_code, 200)

        # convert to JSON
        #
        json_resp = response.json()
        print('response: ', json_resp)

        # status code 'FAILED_PRECONDITION'
        #
        self.assertEqual(json_resp['responseInfo']['status']['code'],
                         STATUS_VAL_FAILED_PRECONDITION)

        # error message found
        #
        idx = json_resp['responseInfo']['status']['details'].find(ERR_MSG_NO_USER_AGENT)
        self.assertTrue(idx > -1)

    def test_40_good_end(self):
        """(40) Test the end session endpoint"""
        msgt(self.test_40_good_end.__doc__)
        # test client
        client = Client()

        # url and info for call
        #
        url = reverse('EndSession')
        info = dict(session_id='session_0')

        response = client.post(url, format_info_for_request(info))

        # 200 response
        #
        self.assertEqual(response.status_code, 200)

        # convert to JSON
        #
        json_resp = response.json()
        print('json_resp', json_resp)

        # status code 'OK'
        #
        self.assertEqual(json_resp['status']['code'],
                         STATUS_VAL_OK)

    def test_50_bad_end(self):
        """(50) Test the end session endpoint.  Error: Don't include a session_id"""
        msgt(self.test_50_bad_end.__doc__)
        # test client
        client = Client()

        # url and info for call
        #
        url = reverse('EndSession')
        info = dict(no_session_id='session_0')

        response = client.post(url, format_info_for_request(info))

        # 200 response
        #
        self.assertEqual(response.status_code, 200)

        # convert to JSON
        #
        json_resp = response.json()
        print('json_resp', json_resp)

        # status code 'OK'
        #
        self.assertEqual(json_resp['status']['code'],
                         STATUS_VAL_FAILED_PRECONDITION)

        # error message found
        #
        idx = json_resp['status']['details'].find(ERR_NO_SESSION_ID)
        self.assertTrue(idx > -1)
