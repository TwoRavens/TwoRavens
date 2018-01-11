import json

from django.test import TestCase
from django.conf import settings

from tworaven_apps.utils.msg_helper import msgt
from tworaven_apps.ta2_interfaces.grpc_util import TA3TA2Util

class TA3TA2UtilTest(TestCase):

    def setUp(self):
        # Set it to internal testing mode
        settings.TA2_STATIC_TEST_MODE = True

    def test_10_get_version(self):
        """(10) Test start session endpoint used by UI"""
        msgt(self.test_10_get_version.__doc__)

        version = TA3TA2Util.get_api_version()

        self.assertTrue(version is not None)

        # 8 being YYYYMMDD, an actual version would be 2017.12.20
        self.assertTrue(len(version) > 8)

        # assume in century 20xx
        self.assertTrue(version[:2] == '20')

    def test_20_problem_schema(self):
        """(20) Pull some problem schema info"""
        msgt(self.test_20_problem_schema.__doc__)

        info_dict = TA3TA2Util.get_problem_schema()

        self.assertTrue(info_dict is not None)

        # Expected keys are there....
        self.assertTrue('TaskType' in info_dict)
        self.assertTrue('TaskSubtype' in info_dict)
        self.assertTrue('PerformanceMetric' in info_dict)

        # Make sure JSON string conversion is the equivalent
        info_dict_string = TA3TA2Util.get_problem_schema_string()

        self.assertEqual(json.dumps(info_dict), info_dict_string)
