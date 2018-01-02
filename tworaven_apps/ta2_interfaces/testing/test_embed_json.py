import json
from os.path import abspath, dirname, isfile, join

from django.test import Client
from django.test import TestCase
from django.urls import reverse
from django.conf import settings
from django.template.loader import render_to_string

from tworaven_apps.ta2_interfaces.ta2_util import format_info_for_request,\
    load_template_as_dict
from tworaven_apps.utils.msg_helper import msgt
from tworaven_apps.ta2_interfaces.models import STATUS_VAL_OK,\
    STATUS_VAL_FAILED_PRECONDITION, STATUS_VAL_COMPLETED
from tworaven_apps.ta2_interfaces.req_pipeline_create import ERR_NO_SESSION_ID,\
    ERR_NO_CONTEXT
from tworaven_apps.utils.static_keys import KEY_SUCCESS
from tworaven_apps.ta2_interfaces.util_embed_results import \
    (FileEmbedUtil,
     KEY_ERR_CODE,
     ERR_CODE_FILE_NOT_FOUND,
     ERR_CODE_FAILED_JSON_CONVERSION)
from tworaven_apps.ta2_interfaces.models import TEST_KEY_FILE_URI,\
    KEY_PIPELINE_INFO, KEY_PREDICT_RESULT_DATA, KEY_PREDICT_RESULT_URI
from tworaven_apps.raven_auth.models import User

TEST_FILE_DIR = join(dirname(dirname(abspath(__file__))),
                     'templates',
                     'test_responses',
                     'embed_json')


class EmbedJSONTest(TestCase):
    def setUp(self):
        # Set it to internal testing mode
        settings.TA2_STATIC_TEST_MODE = True

        # test client
        self.client = Client()

        user_obj = User.objects.get_or_create(username='dev_admin')[0]
        self.client.force_login(user_obj)

    def test_10_embed_json_test(self):
        """(10) Test embedding the results of 1 file within the JSON"""
        msgt(self.test_10_embed_json_test.__doc__)

        # Take a canned response and add a real file uri
        #
        fpath = join(TEST_FILE_DIR, 'data_1_col.csv')
        info_dict = {TEST_KEY_FILE_URI: fpath}
        resp_str = render_to_string('test_responses/embed_json/embed_1_file.json',
                                    info_dict)

        # Run it through the formatter which should:
        #   - attempt to open any file uris
        #   - if they're .csv, convert the data to JSON
        #   - embed the JSON data under a new key: predictResultData
        #
        embed_util = FileEmbedUtil(resp_str)

        # was an error encountered?
        #
        self.assertEqual(embed_util.has_error, False)

        # retrieve the response with the newly embedded data
        #
        results_list = embed_util.get_final_results_as_dict()
        results_dict = results_list[0]
        print(embed_util.get_final_results()[:250])

        # Is the pipelineInfo key present
        self.assertTrue(KEY_PIPELINE_INFO in results_dict)

        # Is the list of result uris available
        self.assertTrue(KEY_PREDICT_RESULT_URI in results_dict[KEY_PIPELINE_INFO])

        # Have predictResultData entries been added?
        self.assertTrue(KEY_PREDICT_RESULT_DATA in results_dict[KEY_PIPELINE_INFO])


    def test_20_embed_json_test(self):
        """(20) Test embedding the results of 4 files within the JSON, where
        1 file doesn't exist and another fails to convert"""
        msgt(self.test_20_embed_json_test.__doc__)

        # Take a canned response and add a real file uri
        #
        info_dict = {\
            TEST_KEY_FILE_URI: join(TEST_FILE_DIR, 'data_1_col.csv'),
            '%s2' % TEST_KEY_FILE_URI: join(TEST_FILE_DIR, 'data_2_col.csv'),
            '%s4' % TEST_KEY_FILE_URI: join(TEST_FILE_DIR, 'bad_file.csv')}

        resp_str = render_to_string('test_responses/embed_json/embed_2_files.json',
                                    info_dict)

        # Run it through the formatter which should:
        #   - attempt to open any file uris
        #   - if they're .csv, convert the data to JSON
        #   - embed the JSON data under a new key: predictResultData
        #
        embed_util = FileEmbedUtil(resp_str)

        # was an error encountered?
        #
        self.assertEqual(embed_util.has_error, False)

        # retrieve the response with the newly embedded data
        #
        results_list = embed_util.get_final_results_as_dict()

        # 1st result in the list
        #
        resp1 = results_list[0]
        self.assertTrue(KEY_PIPELINE_INFO in resp1)
        self.assertTrue(KEY_PREDICT_RESULT_URI in resp1[KEY_PIPELINE_INFO])
        self.assertTrue(KEY_PREDICT_RESULT_DATA in resp1[KEY_PIPELINE_INFO])
        self.assertTrue(resp1[KEY_PIPELINE_INFO][KEY_PREDICT_RESULT_DATA][KEY_SUCCESS])

        # 3rd result in the list
        #
        resp3 = results_list[2]
        self.assertTrue(KEY_PIPELINE_INFO in resp3)
        self.assertTrue(KEY_PREDICT_RESULT_URI in resp3[KEY_PIPELINE_INFO])
        self.assertTrue(KEY_PREDICT_RESULT_DATA in resp3[KEY_PIPELINE_INFO])
        self.assertTrue(not resp3[KEY_PIPELINE_INFO][KEY_PREDICT_RESULT_DATA][KEY_SUCCESS])
        self.assertEqual(resp3[KEY_PIPELINE_INFO][KEY_PREDICT_RESULT_DATA][KEY_ERR_CODE],
                         ERR_CODE_FILE_NOT_FOUND)

        # 4th result in the list
        #
        resp4 = results_list[3]
        self.assertTrue(KEY_PIPELINE_INFO in resp4)
        self.assertTrue(KEY_PREDICT_RESULT_URI in resp4[KEY_PIPELINE_INFO])
        self.assertTrue(KEY_PREDICT_RESULT_DATA in resp4[KEY_PIPELINE_INFO])
        self.assertTrue(not resp4[KEY_PIPELINE_INFO][KEY_PREDICT_RESULT_DATA][KEY_SUCCESS])
        self.assertEqual(resp4[KEY_PIPELINE_INFO][KEY_PREDICT_RESULT_DATA][KEY_ERR_CODE],
                         ERR_CODE_FAILED_JSON_CONVERSION)
