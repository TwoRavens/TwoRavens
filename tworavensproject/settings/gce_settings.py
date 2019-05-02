#
# For deployment on 2ravens.org
#
import os
from .dev_container2 import *

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
CSRF_COOKIE_NAME = '2ravens_org_gce_csrf'

# -----------------------------------
# Note: SECRET_KEY and MONGO_CONNECTION_STRING
#  are loaded from tworavens-web-secrets.yml
# -----------------------------------

# for testing
#TA2_STATIC_TEST_MODE = True
