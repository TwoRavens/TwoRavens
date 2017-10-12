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
from tworaven_apps.ta2_interfaces.util_embed_results import ResultUriFormatter
from tworaven_apps.ta2_interfaces.models import TEST_KEY_FILE_URI,\
    KEY_PIPELINE_INFO, KEY_PREDICT_RESULT_DATA, KEY_PREDICT_RESULT_URIS

TEST_FILE_DIR = join(dirname(dirname(abspath(__file__))),
                     'templates',
                     'test_responses',
                     'embed_json')


class EmbedJSONTest(TestCase):
    def setUp(self):
        # Set it to internal testing mode
        settings.TA2_STATIC_TEST_MODE = True

    def test_10_embed_json_test(self):
        """Test embedding the results of a file within the JSON"""

        fpath = join(TEST_FILE_DIR, 'data_1_col.csv')
        info_dict = {TEST_KEY_FILE_URI: fpath}
        resp_str = render_to_string('test_responses/embed_json/embed_1_file.json',
                                    info_dict)

        formatter = ResultUriFormatter(resp_str)

        self.assertEqual(formatter.has_error, False)

        results_list = formatter.get_final_results_as_dict()
        results_dict = results_list[0]
        print(formatter.get_final_results())
        #KEY_PIPELINE_INFO, KEY_PREDICT_RESULT_DATA
        self.assertTrue(KEY_PIPELINE_INFO in results_dict)
        self.assertTrue(KEY_PREDICT_RESULT_URIS in results_dict[KEY_PIPELINE_INFO])
        self.assertTrue(KEY_PREDICT_RESULT_DATA in results_dict[KEY_PIPELINE_INFO])
