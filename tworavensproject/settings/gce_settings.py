#
# For deployment on 2ravens.org
#
import json
import os
from .dev_container2 import *
from google.oauth2 import service_account

# -----------------------------------
# Use host forwarded from nginx
# -----------------------------------
USE_X_FORWARDED_HOST = True
ALLOWED_HOSTS = ('*',) #('2ravens.org', )

#DEBUG = strtobool(os.environ.get('DEBUG', 'False'))

DEBUG = False

# -----------------------------------
# use Google Cloud MySQL
# -----------------------------------
xDATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('DB_NAME', 'd3m_gce_ravendb'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
        'PORT': os.environ.get('DB_PORT', 3306),
    }
}

SWAGGER_HOST = '2ravens.org'


# -----------------------------------
# staticfiles served via nginx
# -----------------------------------
STATIC_ROOT = join('/ravens_volume', 'staticfiles', 'static')
if not os.path.isdir(STATIC_ROOT):
    os.makedirs(STATIC_ROOT)

SESSION_COOKIE_NAME = os.environ.get('SESSION_COOKIE_NAME',
                                     '2ravens_org_gce')

CSRF_COOKIE_NAME = os.environ.get('CSRF_COOKIE_NAME',
                                  '2ravens_org_csrf')

# -----------------------------------
# Note: SECRET_KEY and MONGO_CONNECTION_STRING
#  are loaded from tworavens-web-secrets.yml
# -----------------------------------

# for testing
#TA2_STATIC_TEST_MODE = True
# -----------------------------------
# use Google Cloud Storage via django-storages
# -----------------------------------

# add to apps
#
INSTALLED_APPS.append('storages')

# -----------------------------------
# Google buckets - set as default
# -----------------------------------
DEFAULT_FILE_STORAGE = 'storages.backends.gcloud.GoogleCloudStorage'

# bucket name / project id
#
GS_BUCKET_NAME = os.environ.get('GS_BUCKET_NAME',
                                '2ravens-behavioral-logs')

GS_PROJECT_ID = os.environ.get('GS_PROJECT_ID',
                               'raven2-186120')

# -----------------------------------
# Credentials from file info
# -----------------------------------
creds_info_str = os.environ.get('GCE_CREDS_INFO')
if not creds_info_str:
    print('GCE_CREDS_INFO string NOT FOUND!!!')
    GCE_CREDS_INFO = None
    GS_CREDENTIALS = None
else:
    #print('GCE_CREDS_INFO string: %s' % (creds_info_str))
    creds_info_str_decoded = creds_info_str.replace('\n', '')   #.decode("utf-8")
    GCE_CREDS_INFO = json.loads(creds_info_str_decoded)
    GS_CREDENTIALS = service_account.Credentials.from_service_account_info(GCE_CREDS_INFO)
