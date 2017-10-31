from __future__ import absolute_import
import json
import sys
from os import makedirs
from os.path import join, normpath, isdir, isfile
from distutils.util import strtobool
import socket

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


# For local dev, remove some of the user password requirements
#
AUTH_PASSWORD_VALIDATORS = [
    dict(NAME='django.contrib.auth.password_validation.UserAttributeSimilarityValidator'),
    #dict(NAME='django.contrib.auth.password_validation.MinimumLengthValidator'),
    #dict(NAME='django.contrib.auth.password_validation.CommonPasswordValidator'),
    dict(NAME='django.contrib.auth.password_validation.NumericPasswordValidator'),
]

# Test email backend, goes to the console
#
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# TwoRavens R service test

R_DEV_SERVER_BASE = 'http://0.0.0.0:8000/custom/'
#R_DEV_SERVER_BASE = 'http://0.0.0.0:8060/custom/'

RECORD_R_SERVICE_ROUTING = False # log R service requests/response JSON to db

# export TA2_STATIC_TEST_MODE=False
TA2_STATIC_TEST_MODE = strtobool(os.environ.get('TA2_STATIC_TEST_MODE', 'True'))   # True: canned responses

# Note: the test server can be run via: https://gitlab.datadrivendiscovery.org/tworavens/TwoRavens/blob/master/docs/dev_notes.md#run-local-ta2-test-server
#
TA2_TEST_SERVER_URL = os.environ.get('TA2_TEST_SERVER_URL', 'localhost:50051')
