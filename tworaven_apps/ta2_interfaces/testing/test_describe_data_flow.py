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
from tworaven_apps.raven_auth.models import User

class DescribeDataFlowTest(TestCase):

    def setUp(self):
        # Set it to internal testing mode
        settings.TA2_STATIC_TEST_MODE = True

        # test client
        self.client = Client()

        user_obj = User.objects.get_or_create(username='dev_admin')[0]
        self.client.force_login(user_obj)

    def test_10_good_request(self):
        """(10) Test endpoint used by UI, with successful result"""
        msgt(self.test_10_good_request.__doc__)

        # url and info for call
        #
        pipeline_id = 'pipeline_222'
        url = reverse('DescribeDataflow')
        info = dict(context=dict(sessionId='session_01'),
                    pipelineId=pipeline_id)

        response = self.client.post(url,
                                    json.dumps(info),
                                    content_type="application/json")

        # 200 response
        #
        self.assertEqual(response.status_code, 200)

        # convert to JSON
        #
        json_resp = response.json()
        #print('json_resp', json_resp)

        # status code 'OK'
        #
        self.assertEqual(json_resp['responseInfo']['status']['code'],
                         STATUS_VAL_OK)


        # pipelineId matches
        #
        self.assertEqual(json_resp['pipelineId'],
                         pipeline_id)

        # 2 modules found
        #
        self.assertTrue(len(json_resp['modules']), 2)

        # 2 connections found
        #
        self.assertTrue(len(json_resp['connections']), 2)



    def test_20_send_badvar_name(self):
        """(20) Forget pipeline id and fail"""
        msgt(self.test_20_send_badvar_name.__doc__)


        # url and info for call
        #
        url = reverse('DescribeDataflow')
        info = dict(context=dict(xsessionId='session_01'))

        response = self.client.post(url,
                                    json.dumps(info),
                                    content_type="application/json")

        # 200 response
        #
        self.assertEqual(response.status_code, 200)

        # convert to JSON
        #
        json_resp = response.json()
        #print('json_resp', json.dumps(json_resp, indent=4))

        # status code 'FAILED_PRECONDITION'
        #
        self.assertEqual(json_resp['responseInfo']['status']['code'],
                         STATUS_VAL_FAILED_PRECONDITION)

        # error message found
        #
        err_snippet = ("Message type \"SessionContext\""
                       " has no field named \"xsessionId\"")
        idx = json_resp['responseInfo']['status']['details'].find(err_snippet)
        self.assertTrue(idx > -1)
