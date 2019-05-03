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
from tworaven_apps.ta2_interfaces.search_history_util import SearchHistoryUtil

TEST_FIXTURE_FILE = join(dirname(dirname(abspath(__file__))),
                         'fixtures',
                         'test_stored_grpc_history_2019_0328',)


class SearchHistoryTest(TestCase):

    fixtures = ['test_stored_grpc_history_2019_0328.json']

    def setUp(self):
        # test client
        pass

    def test_10_retrieve_history(self):
        """(10) Test the SearchHistoryUtil"""
        msgt(self.test_10_retrieve_history.__doc__)

        search_id = 1
        search_history_util = SearchHistoryUtil(search_id=search_id)

        self.assertEqual(search_history_util.has_error(), False)

        if search_history_util.has_error():
            print(f'Error found: {search_history_util.get_error_message()}')
            return

        json_history = search_history_util.get_finalized_history()

        for item in json_history:

            print('item', json.dumps(item, indent=4))
            return
            print('\n')
            print('-' * 40)
            req_text = (f"{item['request_type']} - (id: {item['id']})"
                        f" ")
            print(req_text)
            for resp_item in item['response_list']:
                print((f"  - (id: {resp_item['id']}) - (pipeline_id: {resp_item['pipeline_id']})"
                       f" - ({resp_item['status']})"))
            #return


        # self.assertEqual(ws_list, ERR_AUTH_USER_IS_NONE)
