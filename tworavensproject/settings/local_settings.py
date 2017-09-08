from __future__ import absolute_import
import json
import sys
from os import makedirs
from os.path import join, normpath, isdir, isfile

from .base import *

DEBUG = True

SECRET_KEY = 'ye-local-laptop-secret-key'

LOCAL_SETUP_DIR = join(BASE_DIR, 'test_setup_local')
if not isdir(LOCAL_SETUP_DIR):
    makedirs(LOCAL_SETUP_DIR)

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': join(LOCAL_SETUP_DIR, 'two_ravens1.db3'),
    }
}

SESSION_COOKIE_NAME = 'two_ravens_local'

# where static files are collected
STATIC_ROOT = join(LOCAL_SETUP_DIR, 'staticfiles')
if not isdir(STATIC_ROOT):
    makedirs(STATIC_ROOT)

TEST_DIRECT_STATIC = join(BASE_DIR, 'assets')

# http://django-debug-toolbar.readthedocs.org/en/latest/installation.html
INTERNAL_IPS = ('127.0.0.1',)

ALLOWED_HOSTS = ('*', )
#('localhost', '127.0.0.1', '0.0.0.0',)

#INSTALLED_APPS += ['debug_toolbar']
########## END TOOLBAR CONFIGURATION

#MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']

MEDIA_ROOT = join(LOCAL_SETUP_DIR, "media")

MEDIA_URL = '/media/'

TIME_ZONE = 'America/New_York'

# TwoRavens R service test

R_DEV_SERVER_BASE = 'http://0.0.0.0:8000/custom/'
#R_DEV_SERVER_BASE = 'http://0.0.0.0:8060/custom/'

RECORD_R_SERVICE_ROUTING = True # log R service requests/response JSON to db


#WEBPACK_LOADER['DEFAULT'].update(\
#    dict(BUNDLE_DIR_NAME='dist/',
#         STATS_FILE=join(BASE_DIR, 'webpack-stats-prod.json'))\
#    )
