"""Used for dev. purposes"""
import json
import os
import sys
from collections import OrderedDict
from os.path import abspath, dirname
import pymongo

# ----------------------------------------------------
# Add this directory to the python system path
# ----------------------------------------------------
BASE_DIR = dirname(dirname(dirname(abspath(__file__))))
sys.path.append(BASE_DIR)

# ----------------------------------------------------
# Set the DJANGO_SETTINGS_MODULE, if it's not already
# ----------------------------------------------------
KEY_DJANGO_SETTINGS_MODULE = 'DJANGO_SETTINGS_MODULE'
if not KEY_DJANGO_SETTINGS_MODULE in os.environ:
    os.environ.setdefault(KEY_DJANGO_SETTINGS_MODULE,
                          'tworavensproject.settings.local_settings')

os.environ.setdefault('TA2_STATIC_TEST_MODE', '0')

import django
django.setup()

from tworaven_apps.eventdata_queries.mongo_retrieve_util import MongoRetrieveUtil

def run_test():
    print('step 1')
    mr = MongoRetrieveUtil('test-it')
    if mr.has_error():
        #print(mr.get_error_message())
        return

    db_info = mr.get_mongo_db('ok-db')
    print('db_info.success', db_info.success)

    print('step 2')

    client_info = mr.get_mongo_client()
    if client_info.success:
        client = client_info.result_obj
    for x in client.list_databases():
        print(x)
    print('step 3')

    return


    print('get_mongo_url:', mr.get_mongo_url())
    db_info = mr.get_mongo_db('hello')
    print('success?', db_info.success)

    print(mr.list_databases())



if __name__ == '__main__':
    run_test()
