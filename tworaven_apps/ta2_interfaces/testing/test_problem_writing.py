import json
from unittest import skip
import tempfile

from django.test import Client
from django.test import TestCase
from django.urls import reverse
from django.conf import settings
from django.template.loader import render_to_string

from tworaven_apps.ta2_interfaces.basic_problem_writer import \
    (BasicProblemWriter, ERR_MSG_UNEXPECTED_DIRECTORY,
     ERR_MSG_NO_FILENAME, ERR_MSG_NO_DATA)
from tworaven_apps.user_workspaces.models import UserWorkspace
from tworaven_apps.utils.msg_helper import msgt
from tworaven_apps.raven_auth.models import User

class ProblemWriterTest(TestCase):

    fixtures = ['test_problem_writer_2019_1106.json']

    def setUp(self):
        # Set it to internal testing mode
        settings.TA2_STATIC_TEST_MODE = True

        self.test_dir = tempfile.TemporaryDirectory()

        # test client
        self.client = Client()

        self.user_obj = User.objects.get_or_create(username='dev_admin')[0]

        self.user_workspace = UserWorkspace.objects.first()

        self.client.force_login(self.user_obj)

    def test_010_testwrite(self):
        """(10) test success"""
        msgt(self.test_010_testwrite.__doc__)

        fname = 'dir1/dir2/test_file1.json'
        data = dict(pet="dog")

        bpw = BasicProblemWriter(self.user_workspace,
                                 fname,
                                 data,
                                 **dict(write_directory=self.test_dir.name))

        if bpw.has_error():
            msgt('bpw.error_message: %s' % bpw.error_message)

        self.assertTrue(not bpw.has_error())
        self.assertTrue(bpw.error_message is None)

        self.assertTrue(bpw.new_filepath.endswith(fname))
        print('new_filepath:', bpw.new_filepath)
        content = open(bpw.new_filepath, 'r').read()
        self.assertEqual(json.loads(content), data)

        self.test_dir.cleanup()


    def test_020_test_fail_bad_dir(self):
        """(20) test fail bad directory"""
        msgt(self.test_020_test_fail_bad_dir.__doc__)

        fname = '../dir-traverse/../test_file1.json'
        data = dict(pet="dog")

        bpw = BasicProblemWriter(self.user_workspace,
                                 fname,
                                 data,
                                 **dict(write_directory=self.test_dir.name))

        self.assertTrue(bpw.has_error())
        self.assertTrue(bpw.error_message)
        self.assertTrue(bpw.error_message.find(ERR_MSG_UNEXPECTED_DIRECTORY) > -1)

        self.test_dir.cleanup()


    def test_030_test_fail_no_filename(self):
        """(30) test fail no filename"""
        msgt(self.test_030_test_fail_no_filename.__doc__)

        fname = ''
        data = dict(pet="dog")

        bpw = BasicProblemWriter(self.user_workspace,
                                 fname,
                                 data,
                                 **dict(write_directory=self.test_dir.name))

        self.assertTrue(bpw.has_error())
        self.assertTrue(bpw.error_message)
        print('error_message:', bpw.error_message)
        self.assertTrue(bpw.error_message.find(ERR_MSG_NO_FILENAME) > -1)

        self.test_dir.cleanup()

    def test_040_test_fail_no_data(self):
        """(40) test fail no data"""
        msgt(self.test_040_test_fail_no_data.__doc__)

        fname = 'dog_data.json'
        data = ''

        bpw = BasicProblemWriter(self.user_workspace,
                                 fname,
                                 data,
                                 **dict(write_directory=self.test_dir.name))

        self.assertTrue(bpw.has_error())
        self.assertTrue(bpw.error_message)
        print('error_message:', bpw.error_message)
        self.assertTrue(bpw.error_message.find(ERR_MSG_NO_DATA) > -1)

        self.test_dir.cleanup()
