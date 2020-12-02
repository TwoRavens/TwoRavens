#
# For deployment on 2ravens.org
#
import json
import os
from .dev_container2 import *
#from google.oauth2 import service_account

# -----------------------------------
# Use host forwarded from nginx
# -----------------------------------
USE_X_FORWARDED_HOST = True
ALLOWED_HOSTS = ('*',) #('2ravens.org', )

DEBUG = strtobool(os.environ.get('DEBUG', 'False'))

# DEBUG = False

# -----------------------------------
# Use the default local database which
#   is Postgres in a docker container
#
# X use Google Cloud MySQL
# -----------------------------------
DATABASES = {
    'default': {
        'ENGINE': os.environ.get('DB_ENGINE', 'django.db.backends.postgresql'),
        'NAME': os.environ.get('DB_NAME', 'raven_1'),
        'USER': os.environ.get('DB_USER', 'raven_user'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'ephemeral_data'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),    # For k8s container
        'PORT': os.environ.get('DB_PORT', '5432'),
    },
}

SWAGGER_HOST = '2ravens.org'

SESSION_COOKIE_NAME = os.environ.get('SESSION_COOKIE_NAME',
                                     '2ravens_org_azure')

CSRF_COOKIE_NAME = os.environ.get('CSRF_COOKIE_NAME',
                                  '2ravens_org_csrf_azure')

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
#INSTALLED_APPS.append('storages')
