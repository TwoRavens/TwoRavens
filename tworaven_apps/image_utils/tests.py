"""
python manage.py test tworaven_apps.image_utils
"""
from django.test import TestCase

from collections import OrderedDict
from unittest import skip
from django.test import TestCase

from tworaven_apps.utils.msg_helper import msgt
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

    def test_010_working_config(self):
        """(10) Test Working config"""
        msgt(self.test_010_working_config.__doc__)

        data_dir = join(dirname(abspath(__file__)), 'test_data')
        output_dir = join(data_dir, 'output_dir')
        if not isdir(output_dir):
            os.makedirs(output_dir)

        spec = {\
          "file_path": join(data_dir, 'FudanPed00001.png'),
          "borders": {\
            "RED_HEX": [
                "160,182,160,431,302,431,302,182",
                "420,171,420,486,535,486,535,171"
            ],
            "GREEN_HEX": [
                "140,192,140,451,302,451,302,192",
                "400,191,400,486,515,486,515,191",
                "5,100,5,30,20,30,20,100"
            ]},
          "maximum_size": [
              500,
              500
          ]}

        info = markup_image(spec, output_dir)
        print(info)

        self.assertEqual(info.get(KEY_SUCCESS), True)
        self.assertTrue(KEY_DATA in info)
        if KEY_DATA in info:
            if isfile(info[KEY_DATA]):
                print('Clean up. Remove file: %s' % info[KEY_DATA])
                os.remove(info[KEY_DATA])
