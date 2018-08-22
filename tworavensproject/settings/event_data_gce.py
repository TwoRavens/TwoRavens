"""
Settings for deployment on eventdata.2ravens.org
"""
from .dev_container2 import *
from distutils.util import strtobool
import os


# -----------------------------------
# Override some basic settings
# -----------------------------------
ALLOWED_HOSTS = ('.2ravens.org', )

DEBUG = strtobool(os.environ.get('DEBUG', 'False'))

# staticfiles served via nginx
#
STATIC_ROOT = join('/ravens_volume', 'staticfiles', 'static')
if not os.path.isdir(STATIC_ROOT):
    os.makedirs(STATIC_ROOT)

SESSION_COOKIE_NAME = os.environ.get('RAVENS_SESSION_COOKIE_NAME',
                                     'gce_event_data')
CSRF_COOKIE_NAME = 'gce_event_data_csrf'

# -----------------------------------
# Social Auth related for github login
# -----------------------------------
GITHUB_REDIRECT_URI = os.environ.get(\
                        'GITHUB_REDIRECT_URI',
                        'http://eventdata.2ravens.org/oauth/complete/github/')

SOCIAL_AUTH_GITHUB_AUTH_EXTRA_ARGUMENTS = dict(redirect_uri=GITHUB_REDIRECT_URI)


# -----------------------------------
# use Google Cloud MySQL
# -----------------------------------
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('DB_NAME', 'gce_raven_eventdata'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
        'PORT': os.environ.get('DB_PORT', 3306),
    }
}

# -----------------------------------
# some deploy settings for when cert
# is in place
# -----------------------------------
#SECURE_CONTENT_TYPE_NOSNIFF = True
#SECURE_BROWSER_XSS_FILTER = True
#CSRF_COOKIE_SECURE = True
#SESSION_COOKIE_SECURE = True
