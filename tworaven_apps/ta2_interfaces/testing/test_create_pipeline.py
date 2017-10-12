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
from tworaven_apps.ta2_interfaces.req_start_session import ERR_MSG_NO_USER_AGENT
from tworaven_apps.ta2_interfaces.req_end_session import ERR_NO_SESSION_ID
#from tworaven_apps.ta2_interfaces.models import Animal

class CreatePipelinesTest(TestCase):
    def setUp(self):
        # Set it to internal testing mode
        settings.TA2_STATIC_TEST_MODE = True


    def test_10_good_create(self):
        """(10) Test create pipelines endpoint used by UI"""
        msgt(self.test_10_good_create.__doc__)
        # test client
        client = Client()

        # url and info for call
        #
        url = reverse('CreatePipelines')

        info_dict = load_template_as_dict('test_requests/req_create_pipeline.json')


        response = client.post(url, format_info_for_request(info_dict))

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
