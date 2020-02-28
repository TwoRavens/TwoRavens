"""
This file exists to allow a local event data to be run on port 8070
with a different database than the main TwoRavens app
"""
from __future__ import absolute_import
import json
import sys
from os import makedirs
from os.path import join, normpath, isdir, isfile
from distutils.util import strtobool
import socket

from .local_settings import *


LOCAL_SETUP_DIR = os.environ.get(\
                        'LOCAL_SETUP_DIR',
                        join(BASE_DIR, 'test_setup_event_data_local'))

if not isdir(LOCAL_SETUP_DIR):
    makedirs(LOCAL_SETUP_DIR)

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': join(LOCAL_SETUP_DIR, 'two_ravens_event_data1.db3'),
    }
}

SESSION_COOKIE_NAME = os.environ.get('SESSION_COOKIE_NAME',
                                     'two_ravens_evtdata_local')

CSRF_COOKIE_NAME = os.environ.get('CSRF_COOKIE_NAME',
                                  'two_ravens_evtdata_local_csrf')

EVENTDATA_DATASETS = ["acled_africa.json",
                      "acled_asia.json",
                      "acled_middle_east.json",
                      "cline_speed.json",
                      "icews.json",
                      "ged.json",
                      "gtd.json",
                      "covid_19.json"]
