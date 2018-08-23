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
        self.input_json1 = {
   "name":"query_1",
   "description":"query to get the data of year 1998",
   "username":"two_ravens",
   "query":[
      {
         "$match":{
            "year":1998,
            "target_root":"RUS",
            "target_agent":"GOV"
         }
      },
      {
         "$count":"year_1998"
      }
   ],
   "result_count":"4",
   "collection_type":"aggregate",
   "save_to_dataverse":True,
   "collection_name":"cline_phoenix_fbis"
                            }
        self.input_json2 = {
   "name":"query_2",
   "description":"query to get the data of year 1998",
   "username":"two_ravens",
   "query":[
      {
         "$match":{
            "year":1998,
            "target_root":"RUS",
            "target_agent":"GOV"
         }
      },
      {
         "$count":"year_1998"
      }
   ],
   "result_count":"4",
   "collection_type":"aggregate",
   "save_to_dataverse":True,
   "collection_name":"cline_phoenix_fbis"}

    def test_010_add_query(self):
        """(10) Test AddQuery"""
        msgt(self.test_010_add_query.__doc__)
        # url and info for call
        #
        output_json = {"id": 1,
        "name": "query_1",
        "description": "query to get the data of year 1998",
        "username": "two_ravens",
        "query": [
            {
                "$match": {
                    "year": 1998,
                    "target_root": "RUS",
                    "target_agent": "GOV"
                }
            },
            {
                "$count": "year_1998"
            }
        ],
        "result_count": "4",
        "created": "2018-07-26T05:08:38.281Z",
        "modified": "2018-07-26T05:08:38.281Z",
        "collection_type": "aggregate",
        "collection_name": "cline_phoenix_fbis",
        "save_to_dataverse": True}

        url = reverse('api_add_event_data_query')

        response = self.client.post(url,
                                    json.dumps(self.input_json1),
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

    def test_020_list(self):
        """(20) Test list all objects"""
        msgt(self.test_020_list.__doc__)

        url = reverse('api_add_event_data_query')

        response1 = self.client.post(url,
                                     json.dumps(self.input_json1),
                                     content_type="application/json")
        response2 = self.client.post(url,
                                     json.dumps(self.input_json2),
                                     content_type="application/json")

        # 200 response
        #
        self.assertEqual(response1.status_code, 200)
        self.assertEqual(response2.status_code, 200)


        # retrieve objects
        url_list = reverse('api_get_event_data_queries')

        response_list = self.client.get(url_list)

        self.assertEqual(response_list.status_code, 200)

        # convert to JSON
        #
        json_resp = response_list.json()
        obj = json_resp['data']
        print("--------------- data obj -------------", obj)
        # print('****json resp ****', json.loads(job)['data'])
        self.assertEqual(obj[0]['id'], 2)
        self.assertEqual(obj[1]['id'], 1)
        self.assertEqual(obj[0]['name'], 'query_2')
        self.assertEqual(obj[1]['name'], 'query_1')

    def test_030_retrieve_object(self):
        """(30) Test retrieval of particular object"""
        msgt(self.test_030_retrieve_object.__doc__)

        url = reverse('api_add_event_data_query')

        response = self.client.post(url, json.dumps(self.input_json1),
                                    content_type="application/json")

        # 200 response
        #
        self.assertEqual(response.status_code, 200)

        # get object

        url_get_obj = reverse('api_retrieve_event_data_query', kwargs={'job_id': 1})
        response_list = self.client.get(url_get_obj)
        self.assertEqual(response_list.status_code, 200)
        # print("json res", response_list)
        # self.assertEqual(json.loads(response_list)['name'], 'query1')
        json_resp = response_list.json()

        obj = json_resp['data']

        self.assertEqual(obj['name'], 'query_1')

    def test_040_search(self):
        """(40) Test for search """
        msgt(self.test_040_search.__doc__)
        search_json1 = {
            "name": "query_1",
            "description": "query to get the data of year 1998",
            "username" : "two_ravens"

        }
        search_json2 = {
            "name": "query_2",
            "description": "query to get the data of year 1998"
        }
        search_json3 = {
            "name": "query_1",
            "description": "query to get the data of year 1998",
            "username": "two ravens"
        }   # this should not work as incorrect user name

        url = reverse('api_add_event_data_query')

        response1 = self.client.post(url,
                                     json.dumps(self.input_json1),
                                     content_type="application/json")
        response2 = self.client.post(url,
                                     json.dumps(self.input_json2),
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
        json_resp1 = response_search1.json()
        self.assertEqual(json_resp1['data'][0]['name'], 'query_1')
        self.assertEqual(json_resp1['data'][0]['id'], 1)

        json_resp2 = response_search2.json()
        self.assertEqual(json_resp2['data'][0]['name'], 'query_2')
        self.assertEqual(json_resp2['data'][0]['id'], 2)

        json_resp3 = response_search3.json()
        print("-------------json response 3 -----------", json_resp3)
        self.assertEqual(json_resp3['success'], False)
        self.assertEqual(json_resp3['message'], 'list not retrieved')
















