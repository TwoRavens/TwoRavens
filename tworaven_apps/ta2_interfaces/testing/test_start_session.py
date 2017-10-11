from django.test import Client
from django.test import TestCase
from django.urls import reverse
from django.conf import settings
import json
#from tworaven_apps.ta2_interfaces.models import Animal

class StartSessionTest(TestCase):
    def setUp(self):
        settings.TA2_STATIC_TEST_MODE = True
        #Animal.objects.create(name="lion", sound="roar")
        #Animal.objects.create(name="cat", sound="meow")

    def test_start_session(self):
        """Test start session endpoint used by UI"""

        # test client
        client = Client()

        # info for call
        url = reverse('StartSession')
        info = dict(user_agent='user_agent')
        data = dict(grpcrequest=json.dumps(info))
        response = client.post(url, data)

        self.assertEqual(response.status_code, 200)

        json_resp = response.json()
        self.assertEqual(json_resp['responseInfo']['status']['code'], 'OK')

        #import ipdb; ipdb.set_trace()
        print(response.status_code)
        #200
        print(response.content)
    
