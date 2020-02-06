"""
python manage.py test tworaven_apps.image_utils
"""
from django.test import TestCase
from django.test import Client
from django.conf import settings

from collections import OrderedDict
from unittest import skip
from django.test import TestCase
from django.urls import reverse

from tworaven_apps.utils.msg_helper import msg, msgt
from tworaven_apps.image_utils.markup_image_helper import \
    (markup_image,)
import os
from os.path import abspath, dirname, isdir, isfile, join

from tworaven_apps.solver_interfaces.models import (
    KEY_SUCCESS,
    KEY_DATA,
    KEY_MESSAGE)

class ImageMarkupHelper(TestCase):
    """Image markup test"""

    def setUp(self):
        settings.DEBUG = True

    def get_test_spec(self):
        """Return the test spec"""
        data_dir = join(dirname(abspath(__file__)), 'test_data')

        spec = {\
          "file_path": join(data_dir, 'FudanPed00001.png'),
          "borders": {\
            "FFCC00": [
                "160,182,160,431,302,431,302,182",
                "420,171,420,486,535,486,535,171"
            ],
            "00FF00": [
                "140,192,140,451,302,451,302,192",
                "400,191,400,486,515,486,515,191",
                "5,100,5,30,20,30,20,100"
            ]},
          "maximum_size": [
              500,
              500
          ]}

        return spec

    def get_output_dir(self):
        """Return the output directory"""
        output_dir = join(dirname(abspath(__file__)),
                          'test_data',
                          'output_dir')
        if not isdir(output_dir):
            os.makedirs(output_dir)
        return output_dir


    def test_010_markup_image(self):
        """(10) Test markup image"""
        msgt(self.test_010_markup_image.__doc__)

        spec = self.get_test_spec()

        info = markup_image(spec, self.get_output_dir())
        print(info)

        self.assertEqual(info.get(KEY_SUCCESS), True)
        self.assertTrue(KEY_DATA in info)

        self.clean_up_file(info)


    def clean_up_file(self, info):
        """Delete test file"""
        if KEY_DATA in info:
            if isfile(info[KEY_DATA]):
                print('Clean up. Remove file: %s' % info[KEY_DATA])
                os.remove(info[KEY_DATA])


    def test_020_markup_image_via_endpoint(self):
        """(20) Test markup image via endpoint"""
        msgt(self.test_020_markup_image_via_endpoint.__doc__)

        # ----------------------------------
        msgt('(a) All specs')
        # ----------------------------------

        spec = self.get_test_spec()

        # create a web client
        client = Client()

        # create log entry url
        url = reverse('view_markup_image')

        # make request
        resp = client.post(url,
                           spec,
                           content_type='application/json').json()

        print('resp', resp)
        self.assertTrue('success' in resp)
        self.assertTrue(resp['success'] is True)
        self.clean_up_file(resp)

        # ----------------------------------
        msgt('(b) File path only')
        # ----------------------------------
        del spec['borders']
        del spec['maximum_size']

        # make request
        resp = client.post(url,
                           spec,
                           content_type='application/json').json()

        print('resp', resp)
        self.assertTrue('success' in resp)
        self.assertTrue(resp['success'] is True)
        self.clean_up_file(resp)

        # ----------------------------------
        msgt('(c) File path and borders only')
        # ----------------------------------
        spec = self.get_test_spec()
        del spec['maximum_size']

        # make request
        resp = client.post(url,
                           spec,
                           content_type='application/json').json()

        print('resp', resp)
        self.assertTrue('success' in resp)
        self.assertTrue(resp['success'] is True)
        self.clean_up_file(resp)

        # ----------------------------------
        msgt('(3) File path and max size only')
        # ----------------------------------
        spec = self.get_test_spec()
        del spec['borders']

        # make request
        resp = client.post(url,
                           spec,
                           content_type='application/json').json()

        print('resp', resp)
        self.assertTrue('success' in resp)
        self.assertTrue(resp['success'] is True)
        self.clean_up_file(resp)

    def test_030_err_markup_image_via_endpoint(self):
        """(30) Check errors for markup image via endpoint"""
        msgt(self.test_030_err_markup_image_via_endpoint.__doc__)

        spec = self.get_test_spec()

        # create a web client
        client = Client()

        # create log entry url
        url = reverse('view_markup_image')


        # ----------------------------------
        msgt('(a) Bad image path')
        # ----------------------------------
        spec["file_path"] = 'FudanPed00001.png'

        # make request
        resp = client.post(url,
                           spec,
                           content_type='application/json').json()

        print('resp', resp)
        self.assertTrue('success' in resp)
        self.assertTrue(resp['success'] is False)

        # ----------------------------------
        msgt('(b) Bad color name "gravy"')
        # ----------------------------------
        spec = self.get_test_spec()

        spec["borders"].update(dict(gravy=spec["borders"]['FFCC00']))

        # make request
        resp = client.post(url,
                           spec,
                           content_type='application/json').json()

        print('resp', resp)
        self.assertTrue('success' in resp)
        self.assertTrue(resp['success'] is False)

        # ----------------------------------
        msgt('(c) Bounding box coordinate bigger than image')
        # ----------------------------------
        spec = self.get_test_spec()

        # set width of 16000 in 1st pair
        #
        spec["borders"].update(dict(FFCC00=["16000,182,160,431,302,431,302,182"]))
        print(spec)
        # make request
        resp = client.post(url,
                           spec,
                           content_type='application/json').json()

        print('resp', resp)
        self.assertTrue('success' in resp)
        self.assertTrue(resp['success'] is False)

        # ----------------------------------
        msgt('(d) No file parameter')
        # ----------------------------------
        spec = self.get_test_spec()
        del spec['file_path']

        print(spec)
        # make request
        resp = client.post(url,
                           spec,
                           content_type='application/json').json()

        print('resp', resp)
        self.assertTrue('success' in resp)
        self.assertTrue(resp['success'] is False)
