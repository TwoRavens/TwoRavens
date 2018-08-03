# import json
# from unittest import skip
#
# from django.test import Client
# from django.test import TestCase
# from django.urls import reverse
# from django.conf import settings
# from django.template.loader import render_to_string
# from tworaven_apps.raven_auth.models import User
# from tworaven_apps.utils.msg_helper import msgt
#
# class DataverseCheckTest(TestCase):
#     """ test cases for dataverse upload"""
#
#     def setUp(self):
#         # Set it to internal testing mode
#         settings.TA2_STATIC_TEST_MODE = True
#
#         # test client
#         self.client = Client()
#
#         user_obj = User.objects.get_or_create(username='dev_admin')[0]
#         self.client.force_login(user_obj)
#         self.input_json1 = {
#             "name": "query_1",
#             "description": "query to get the data of year 1998",
#             "username": "two_ravens",
#             "query": [
#                 {
#                     "$match": {
#                         "year": 1998,
#                         "target_root": "RUS",
#                         "target_agent": "GOV"
#                     }
#                 },
#                 {
#                     "$count": "year_1998"
#                 }
#             ],
#             "result_count": "4",
#             "collection_type": "aggregate",
#             "save_to_dataverse": True,
#             "collection_name": "cline_phoenix_fbis"
#         }
#
#     def test_010_add_archive_query(self):
#         """(10) Test add_archive_query"""
#         msgt(self.test_010_add_archive_query.__doc__)
#         url = reverse('api_add_query')
#
#         response = self.client.post(url,
#                                     json.dumps(self.input_json1),
#                                     content_type="application/json")
#
#         # 200 response
#         #
#         self.assertEqual(response.status_code, 200)
#
#         # convert to JSON
#         #
#         json_resp = response.json()
#         print('json_resp', json_resp)
#
#         url_check = reverse('api_upload_to_dataverse', args=[1])
#         response_check = self.client.get(url_check)
#
#         self.assertEqual(response_check.status_code, 200)
