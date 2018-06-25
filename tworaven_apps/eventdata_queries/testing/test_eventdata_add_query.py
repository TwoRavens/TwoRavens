import json
from unittest import skip

from django.test import Client
from django.test import TestCase
from django.urls import reverse
from django.conf import settings
from django.template.loader import render_to_string
from tworaven_apps.raven_auth.models import User
from tworaven_apps.utils.msg_helper import msgt


class EventDataQueryAddTest(TestCase):
    """ test cases for adding the query to database"""

    def setUp(self):
        # Set it to internal testing mode
        settings.TA2_STATIC_TEST_MODE = True

        # test client
        self.client = Client()

        user_obj = User.objects.get_or_create(username='dev_admin')[0]
        self.client.force_login(user_obj)

    def test_010_Hello(self):
        """(10) Test Hello"""
        msgt(self.test_010_Hello.__doc__)

        # url and info for call
        #
        url = reverse('Hello')
        info = dict()

        response = self.client.post(url,
                                    json.dumps(info),
                                    content_type="application/json")

        # 200 response
        #
        self.assertEqual(response.status_code, 200)

        # convert to JSON
        #
        json_resp = response.json()
        print('json_resp', json_resp)

        # status code 'OK'
        #
        self.assertEqual(json_resp['success'], True)

        # data section returned
        #
        self.assertTrue('data' in json_resp)

        self.assertTrue('userAgent' in json_resp['data'])
        self.assertTrue('version' in json_resp['data'])

    def test_020_add_query(self):
        """(20) Test AddQuery"""
        msgt(self.test_020_add_query.__doc__)
        # url and info for call
        #
        input_json = {"name": "query2",
                      "description": "query1 desc",
                      "username": "two ravens",
                      "query": {"ads": "asd"},
                      "result_count": "4",
                      "saved_to_dataverse": True,
                      "dataverse_url": "www.google.com"}

        output_json = {'id': 1, 'name': 'query2', 'description': 'query1 desc',
                                                                           'username': 'two ravens', 'query': {'ads': 'asd'},
                                                                           'result_count': 4, 'created': '2018-06-25T19:04:23.277Z',
                                                                           'modified': '2018-06-25T19:04:23.277Z', 'saved_to_dataverse': True,
                                                                           'dataverse_url': 'http://www.google.com'}

        url = reverse('api_add_query')

        response = self.client.post(url,
                                    json.dumps(input_json),
                                    content_type="application/json")

        # 200 response
        #
        self.assertEqual(response.status_code, 200)

        # convert to JSON
        #
        json_resp = response.json()
        print('json_resp', json_resp)

        # status code 'OK'
        #
        self.assertEqual(json_resp['success'], True)

        self.assertEqual(json_resp['data']['name'],output_json['name'])
        self.assertEqual(json_resp['data']['username'], output_json['username'])
        self.assertEqual(json_resp['data']['description'], output_json['description'])
        self.assertEqual(json_resp['data']['query'], output_json['query'])
        self.assertEqual(json_resp['data']['result_count'], output_json['result_count'])

    def test_030_add_query(self):
        """(30) Test list all objects"""
        msgt(self.test_030_add_query.__doc__)






