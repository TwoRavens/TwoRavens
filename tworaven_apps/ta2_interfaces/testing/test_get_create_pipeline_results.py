import json

from django.test import Client
from django.test import TestCase
from django.urls import reverse
from django.conf import settings

from tworaven_apps.ta2_interfaces.ta2_util import format_info_for_request,\
    load_template_as_dict
from tworaven_apps.utils.msg_helper import msgt
from tworaven_apps.ta2_interfaces.models import STATUS_VAL_OK,\
    STATUS_VAL_FAILED_PRECONDITION, STATUS_VAL_COMPLETED
from tworaven_apps.ta2_interfaces.req_get_pipeline_create_results import \
    get_create_pipeline_results, ERR_NO_CONTEXT
from tworaven_apps.raven_auth.models import User


class GetCreatePipelineResultsTest(TestCase):
    def setUp(self):
        # Set it to internal testing mode
        settings.TA2_STATIC_TEST_MODE = True

        # test client
        self.client = Client()

        user_obj = User.objects.get_or_create(username='dev_admin')[0]
        self.client.force_login(user_obj)

    def test_10_good_get_results(self):
        """(10) Success. Test GetCreatePipelineResults endpoint used by UI"""
        msgt(self.test_10_good_get_results.__doc__)

        # url and info for call
        #
        url = reverse('GetCreatePipelineResults')

        info_dict = {"context": {"session_id": "session_0"},
                     "pipeline_ids": ["pipeline_01", "pipeline_02"]}

        response = self.client.post(url,
                                    json.dumps(info_dict),
                                    content_type="application/json")

        # 200 response
        #
        self.assertEqual(response.status_code, 200)

        # convert to JSON
        #
        json_resp = response.json()
        #print('json_resp', json_resp[:200])
        #print(len(json_resp))

        # expect list of 6 responses
        #
        self.assertEqual(len(json_resp), 6)

        # status code 'OK'
        #
        fifth_resp = json_resp[4]
        self.assertEqual(fifth_resp['responseInfo']['status']['code'],
                         STATUS_VAL_OK)

        # progressInfo is "COMPLETED"
        #
        self.assertEqual(fifth_resp['progressInfo'],
                         STATUS_VAL_COMPLETED)

        # There is 1 result uri
        #
        self.assertEqual(len(fifth_resp['pipelineInfo']['predictResultUris']),
                         1)

        # There is 1 corresponding result for predictResultData
        #
        self.assertEqual(len(fifth_resp['pipelineInfo']['predictResultData']),
                         1)

        # The 1st entry in predictResultData contains the key "file_1"
        #
        self.assertTrue('file_1' in\
                        fifth_resp['pipelineInfo']['predictResultData'][0])

    def test_20_bad_request_no_context(self):
        """(20) Missing "context" error. Test GetCreatePipelineResults endpoint used by UI."""
        msgt(self.test_20_bad_request_no_context.__doc__)

        # url and info for call
        #
        url = reverse('GetCreatePipelineResults')

        info_dict = {"context": {"session_id": "session_0"},
                     "pipeline_ids": ["pipeline_01", "pipeline_02"]}


        del info_dict['context']

        #response = self.client.post(url, format_info_for_request(info_dict))
        response = self.client.post(url,
                                    json.dumps(info_dict),
                                    content_type="application/json")

        # 200 response
        #
        self.assertEqual(response.status_code, 200)

        # convert to JSON
        #
        #print('json_resp', response.content[:250])
        json_resp = response.json()

        # status code 'OK'
        #
        self.assertEqual(json_resp['status']['code'],
                         STATUS_VAL_FAILED_PRECONDITION)

        # error message found
        #
        idx = json_resp['status']['details'].find(ERR_NO_CONTEXT)
        self.assertTrue(idx > -1)
