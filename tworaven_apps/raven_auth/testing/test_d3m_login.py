import json
import random
import string

from django.test import Client
from django.test import TestCase
from django.urls import reverse
from django.conf import settings

from tworaven_apps.utils import random_info
from tworaven_apps.utils.msg_helper import msgt
from tworaven_apps.configurations.models import AppConfiguration, D3M_DOMAIN
# from tworaven_apps.configurations.util_config_maker import TestConfigMaker
from tworaven_apps.raven_auth.models import User

LOGIN_STR = '<h3>Login</h3>'
USERNAME_STR = 'required id="id_username"'

class D3MLogin(TestCase):

    def setUp(self):
        """Set a test AppConfiguration object with D3M_DOMAIN"""

        # Load D3M configs
        #
        TestConfigMaker.make_configs()

        # Create an AppConfiguration object
        #
        params = dict(name='test d3m',
                      app_domain=D3M_DOMAIN,
                      production=False,
                      privacy_mode=False,
                      is_active=True)
        app_config = AppConfiguration(**params)
        app_config.save()

        # test client
        self.client = Client()




    def test_10_redirect_to_login(self):
        """(10) Redirect to login when in D3M mode"""
        msgt(self.test_10_redirect_to_login.__doc__)

        # Attempt to go the main workspace
        #
        url = reverse('home')

        # --------------------------------
        # Look for 302 redirect
        # --------------------------------
        resp1 = self.client.get(url)

        # 302 response - redirect
        #
        self.assertEqual(resp1.status_code, 302)


        # --------------------------------
        # Follow redirect to login page
        # --------------------------------
        resp2 = self.client.get(url, follow=True)

        login_found = resp2.content.decode('utf-8').find(LOGIN_STR) > -1
        self.assertTrue(login_found)

        username_found = resp2.content.decode('utf-8').find(USERNAME_STR) > -1
        self.assertTrue(username_found)


    def test_20_already_logged_in(self):
        """(20) Already logged in, no redirect"""
        msgt(self.test_20_already_logged_in.__doc__)

        # make a user
        username = 'test_user_%s' %\
                   (random_info.get_alphanumeric_uppercase(5))

        rand_pw = random_info.get_alphanumeric_uppercase(12)

        new_user = User(username=username,
                        first_name='One',
                        last_name='Test',
                        is_staff=False,
                        is_active=True,
                        is_superuser=False)
        new_user.set_password(rand_pw)
        new_user.save()



        # test client
        client = Client()
        client.login(username=username, password=rand_pw)

        # Attempt to go the main workspace
        #
        url = reverse('home')

        # --------------------------------
        # logged in, should be able to reach page
        # --------------------------------
        response1 = client.get(url)

        # 200 status code
        #
        self.assertEqual(response1.status_code, 200)

        login_not_found = response1.content.decode('utf-8').find(LOGIN_STR)  == -1
        self.assertTrue(login_not_found)

        username_not_found = response1.content.decode('utf-8').find(USERNAME_STR) == -1
        self.assertTrue(username_not_found)

        # remove the new user
        new_user.delete()
