import json

from django.test import Client
from django.test import TestCase
from django.urls import reverse
from django.conf import settings

from tworaven_apps.ta2_interfaces import core_pb2
from tworaven_apps.ta2_interfaces.models import STATUS_VAL_OK,\
    STATUS_VAL_FAILED_PRECONDITION


#from tworaven_apps.ta2_interfaces.models import Animal

class StartEndSessionTest(TestCase):
    def setUp(self):
        # Set it to internal testing mode
        settings.TA2_STATIC_TEST_MODE = True
        #Animal.objects.create(name="lion", sound="roar")
        #Animal.objects.create(name="cat", sound="meow")

    def format_info_for_request(self, info_dict):
        """TwoRavens info is sent from the UI as
        a JSON string under the key 'grpcrequest'"""

        return dict(grpcrequest=json.dumps(info_dict))

    def test_good_start(self):
        """Test start session endpoint used by UI"""
        print(self.test_good_start.__doc__)
        # test client
        client = Client()

        # url and info for call
        #
        url = reverse('StartSession')
        info = dict(user_agent='user_agent')

        response = client.post(url, self.format_info_for_request(info))

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


    def test_bad_start(self):
        """Test start session endpoint used by UI. Don't send user agent"""
        print(self.test_good_start.__doc__)
        # test client
        client = Client()

        # url and info for call
        #
        url = reverse('StartSession')
        info = dict(xuser_agent='user_agent')

        response = client.post(url, self.format_info_for_request(info))

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
        err_snippet = '"SessionRequest" has no field named "xuser_agent"'
        idx = json_resp['responseInfo']['status']['details'].find(err_snippet)
        self.assertTrue(idx > -1)
