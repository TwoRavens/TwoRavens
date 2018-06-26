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

    def test_030_list(self):
        """(30) Test list all objects"""
        msgt(self.test_030_list.__doc__)

        # add 2 objects
        input_json1 = {"name": "query1",
                      "description": "query1 desc",
                      "username": "two ravens",
                      "query": {"ads": "asd"},
                      "result_count": "4",
                      "saved_to_dataverse": True,
                      "dataverse_url": "www.google.com"}
        input_json2 = {"name": "query2",
                      "description": "query1 desc",
                      "username": "two ravens",
                      "query": {"ads": "asd"},
                      "result_count": "4",
                      "saved_to_dataverse": True,
                      "dataverse_url": "www.google.com"}

        url = reverse('api_add_query')

        response1 = self.client.post(url,
                                    json.dumps(input_json1),
                                    content_type="application/json")
        response2 = self.client.post(url,
                                     json.dumps(input_json2),
                                     content_type="application/json")

        # 200 response
        #
        self.assertEqual(response1.status_code, 200)
        self.assertEqual(response2.status_code, 200)


        # retrieve objects
        url_list = reverse('api_get_list')

        response_list = self.client.get(url_list)

        self.assertEqual(response_list.status_code, 200)

        # convert to JSON
        #
        for job in response_list:
            # convert to JSON
            #
            obj = json.loads(job)['data']
            # print('****json resp ****', json.loads(job)['data'])
            self.assertEqual(obj[0]['id'], 2)
            self.assertEqual(obj[1]['id'], 1)
            self.assertEqual(obj[0]['name'], 'query2')
            self.assertEqual(obj[1]['name'], 'query1')

    def test_040_retrieve_object(self):
        """(40) Test retrieval of particular object"""
        msgt(self.test_040_retrieve_object.__doc__)

        input_json = {"name": "query1",
                      "description": "query1 desc",
                      "username": "two ravens",
                      "query": {"ads": "asd"},
                      "result_count": "4",
                      "saved_to_dataverse": True,
                      "dataverse_url": "www.google.com"}

        url = reverse('api_add_query')

        response = self.client.post(url, json.dumps(input_json),
                                    content_type="application/json")

        # 200 response
        #
        self.assertEqual(response.status_code, 200)

        # get object

        url_get_obj = reverse('api_retrieve_object', kwargs={'job_id': 1})
        response_list = self.client.get(url_get_obj)
        self.assertEqual(response_list.status_code, 200)
        # print("json res", response_list)
        # self.assertEqual(json.loads(response_list)['name'], 'query1')
        for job in response_list:
            obj = json.loads(job)['data']

            self.assertEqual(obj['name'], 'query1')



    def test_050_search(self):
        """(50) Test for search """
        msgt(self.test_050_search.__doc__)
        search_json1 = {
            "name": "query1",
            "description": "query1 desc",
            "username" : "two ravens"

        }
        search_json2 = {
            "name": "query2",
            "description": "query2 desc"
        }
        search_json3 = {
            "name": "query1",
            "description": "query1 desc1",
            "username": "two ravens"
        }
        # add 2 objects
        input_json1 = {"name": "query1",
                       "description": "query1 desc",
                       "username": "two ravens",
                       "query": {"ads": "asd"},
                       "result_count": "4",
                       "saved_to_dataverse": True,
                       "dataverse_url": "www.google.com"}
        input_json2 = {"name": "query2",
                       "description": "query2 desc",
                       "username": "two ravens",
                       "query": {"ads": "asd"},
                       "result_count": "4",
                       "saved_to_dataverse": True,
                       "dataverse_url": "www.google.com"}

        url = reverse('api_add_query')

        response1 = self.client.post(url,
                                     json.dumps(input_json1),
                                     content_type="application/json")
        response2 = self.client.post(url,
                                     json.dumps(input_json2),
                                     content_type="application/json")

        # 200 response
        #
        self.assertEqual(response1.status_code, 200)
        self.assertEqual(response2.status_code, 200)

        url_search = reverse('api_search')

        response_search1 = self.client.post(url_search, json.dumps(search_json1),
                                    content_type="application/json")

        response_search2 = self.client.post(url_search, json.dumps(search_json2),
                                            content_type="application/json")

        response_search3 = self.client.post(url_search, json.dumps(search_json3),
                                            content_type="application/json")

        self.assertEqual(response_search1.status_code, 200)
        self.assertEqual(response_search2.status_code, 200)
        self.assertEqual(response_search3.status_code, 200)
        # print("json res", response_list)
        # self.assertEqual(json.loads(response_list)['name'], 'query1')
        for job in response_search1:
            obj = json.loads(job)['data']
            print("search 1 res", obj)
            self.assertEqual(obj[0]['name'], 'query1')
            self.assertEqual(obj[0]['id'], 1)

        for job in response_search2:
            obj = json.loads(job)['data']
            print("search 2 res", obj)
            self.assertEqual(obj[0]['name'], 'query2')
            self.assertEqual(obj[0]['id'], 2)

        for job in response_search3:
            obj = json.loads(job)
            print("search 3 res", obj)
            self.assertEqual(obj['success'], False)
            self.assertEqual(obj['message'], 'list not retrieved')
















