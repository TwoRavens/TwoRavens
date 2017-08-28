from __future__ import absolute_import
import json
import sys
from os import makedirs
from os.path import join, normpath, isdir, isfile

from .base import *

DEBUG = True # False - will be False

ROOT_URLCONF = 'tworavensproject.urls_prod'

APACHE_WEB_DIRECTORY = '/var/www/html'

SECRET_KEY = 'ye-dev-container-secret-key'

LOCAL_SETUP_DIR = join(BASE_DIR, 'srv', 'webapps', 'tworavens_files')
if not isdir(LOCAL_SETUP_DIR):
    makedirs(LOCAL_SETUP_DIR)

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': join(LOCAL_SETUP_DIR, 'two_ravens.db3'),
    }
}

SESSION_COOKIE_NAME = 'two_ravens_local'

# where static files are collected
STATIC_ROOT = join(APACHE_WEB_DIRECTORY, '2ravens', 'static')

# http://django-debug-toolbar.readthedocs.org/en/latest/installation.html
INTERNAL_IPS = ('127.0.0.1', '0.0.0.0')

#INSTALLED_APPS += ['debug_toolbar']
########## END TOOLBAR CONFIGURATION

#MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']

MEDIA_ROOT = join(APACHE_WEB_DIRECTORY, "media")

MEDIA_URL = '/media/'

TIME_ZONE = 'America/New_York'

# TwoRavens R service test

R_DEV_SERVER_BASE = 'http://0.0.0.0:8000/custom/'

RECORD_R_SERVICE_ROUTING = True # log R service requests/response JSON to db
