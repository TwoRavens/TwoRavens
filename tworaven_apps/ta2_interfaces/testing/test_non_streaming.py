import json
from unittest import skip

from django.test import Client
from django.test import TestCase
from django.urls import reverse
from django.conf import settings
from django.template.loader import render_to_string

from tworaven_apps.ta2_interfaces.ta2_util import format_info_for_request
from tworaven_apps.utils.msg_helper import msgt
from tworaven_apps.raven_auth.models import User

class NonStreamingTests(TestCase):

    def setUp(self):
        # Set it to internal testing mode
        settings.TA2_STATIC_TEST_MODE = True

        # test client
        self.client = Client()

        user_obj = User.objects.get_or_create(username='dev_admin')[0]
        self.client.force_login(user_obj)

    def test_10_Hello(self):
        """(10) Test Hello"""
        msgt(self.test_10_Hello.__doc__)

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

    def test_20_SearchSolutions(self):
        """(20) Test SearchSolutions"""
        msgt(self.test_20_SearchSolutions.__doc__)
        # url and info for call
        #
        url = reverse('SearchSolutions')

        req_str = render_to_string('test_requests/req_SearchSolutions.json',
                                   {})

        response = self.client.post(url,
                                    req_str,
                                    content_type="application/json")

        # 200 response
        #
        self.assertEqual(response.status_code, 200)

        # convert to JSON
        #
        json_resp = response.json()
        print('json_resp', json_resp)

        self.assertTrue(json_resp['success'])
        self.assertTrue('data' in json_resp)
        self.assertTrue('searchId' in json_resp['data'])

    def test_30_EndSearchSolutions(self):
        """(30) Test EndSearchSolutions"""
        msgt(self.test_30_EndSearchSolutions.__doc__)
        # url and info for call
        #
        url = reverse('EndSearchSolutions')

        info = dict(searchId='searchId')

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

        self.assertTrue(json_resp['success'])
        self.assertTrue('data' in json_resp)



    def test_40_StopSearchSolutions(self):
        """(40) Test StopSearchSolutions"""
        msgt(self.test_40_StopSearchSolutions.__doc__)
        # url and info for call
        #
        url = reverse('StopSearchSolutions')

        info = dict(searchId='searchId')

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

        self.assertTrue(json_resp['success'])
        self.assertTrue('data' in json_resp)

    def test_50_DescribeSolution(self):
        """(50) Test DescribeSolution"""
        msgt(self.test_50_DescribeSolution.__doc__)
        # url and info for call
        #
        url = reverse('DescribeSolution')

        info = dict(solutionId='solutionId')

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

        self.assertTrue(json_resp['success'])
        self.assertTrue('data' in json_resp)
        self.assertTrue('pipeline' in json_resp['data'])
        self.assertTrue('inputs' in json_resp['data']['pipeline'])
        self.assertTrue('outputs' in json_resp['data']['pipeline'])
        self.assertTrue('steps' in json_resp['data']['pipeline'])
        self.assertTrue('steps' in json_resp['data'])


    def test_60_ScoreSolution(self):
        """(60) Test ScoreSolution"""
        msgt(self.test_60_ScoreSolution.__doc__)
        # url and info for call
        #
        url = reverse('ScoreSolution')

        req_str = render_to_string('test_requests/req_ScoreSolution.json',
                                   {})

        response = self.client.post(url,
                                    req_str,
                                    content_type="application/json")

        # 200 response
        #
        self.assertEqual(response.status_code, 200)

        # convert to JSON
        #
        json_resp = response.json()
        print('json_resp', json_resp)

        self.assertTrue(json_resp['success'])
        self.assertTrue('data' in json_resp)
        self.assertTrue('requestId' in json_resp['data'])


    def test_70_FitSolution(self):
        """(70) Test FitSolution"""
        msgt(self.test_70_FitSolution.__doc__)
        # url and info for call
        #
        url = reverse('FitSolution')

        req_str = render_to_string('test_requests/req_FitSolution.json',
                                   {})

        response = self.client.post(url,
                                    req_str,
                                    content_type="application/json")

        # 200 response
        #
        self.assertEqual(response.status_code, 200)

        # convert to JSON
        #
        json_resp = response.json()
        print('json_resp', json_resp)

        self.assertTrue(json_resp['success'])
        self.assertTrue('data' in json_resp)
        self.assertTrue('requestId' in json_resp['data'])


    def test_80_ProduceSolution(self):
        """(80) Test test_80_ProduceSolution"""
        msgt(self.test_80_ProduceSolution.__doc__)
        # url and info for call
        #
        url = reverse('ProduceSolution')

        req_str = render_to_string('test_requests/req_ProduceSolution.json',
                                   {})

        response = self.client.post(url,
                                    req_str,
                                    content_type="application/json")

        # 200 response
        #
        self.assertEqual(response.status_code, 200)

        # convert to JSON
        #
        json_resp = response.json()
        print('json_resp', json_resp)

        self.assertTrue(json_resp['success'])
        self.assertTrue('data' in json_resp)
        self.assertTrue('requestId' in json_resp['data'])
