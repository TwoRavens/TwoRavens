"""
Some test work against mongo running via an ssh tunnel
"""
import urllib.parse
import os

import pymongo
from pymongo import MongoClient

def format_cred(cred_val):
    """format the credential value"""
    return urllib.parse.quote_plus(cred_val)

username = format_cred('AdminEvent')
password = format_cred(os.environ.get('MONGO_PW', ''))

mongo_server = 'localhost'
mongo_server = '178.128.144.175'

MCLIENT = MongoClient('mongodb://%s:%s@%s:27017/' % \
                     (username, password, mongo_server))

def test():
    """some print stmts"""
    print(MCLIENT.database_names())
    db = MCLIENT.event_data
    print(db.collection_names(include_system_collections=False))

    for item in db.icews.find().skip(0).limit(1):
        print(item)
    #print(vals)
    #

if __name__ == '__main__':
    test()

"""
from django.conf import settings
for val in settings._explicit_settings:
    print(val, eval('settings.' + val))
#    if not val.startswith('__'):
        print(val, eval('settings.' + val))


"""
