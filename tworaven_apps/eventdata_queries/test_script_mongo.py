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

def run_test2():
    from tworaven_apps.eventdata_queries.event_job_util import EventJobUtil
    info = {\
        "d3mIndex": 0,
    	"Player": "HANK,_AARON",
    	"Number_seasons": 23,
    	"Games_played": 3298,
    	"At_bats": 12364,
    	"Runs": 2174,
    	"Hits": 3771,
    	"Doubles": 624,
    	"Triples": 98,
    	"Home_runs": 755,
    	"RBIs": 2297,
    	"Walks": 1402,
    	"Strikeouts": 1383,
    	"Batting_average": 0.305,
    	"On_base_pct": 0.377,
    	"Slugging_pct": 0.555,
    	"Fielding_ave": 0.98,
    	"Position": "Outfield",
        "Hall_of_Fame": 1}
    collection = 'my_collection'

    info = EventJobUtil.export_csv(collection, [info])
    print(info)
    if info.success:
        print(info.result_obj)

if __name__ == '__main__':
    run_test2()
