# after processing the event data through arcGIS, load the data into mongo

from pymongo import MongoClient
import json

mongo_client = MongoClient(host='localhost', port=27017)  # Default port
db = mongo_client.event_data
locations = mongo_client.locations


# returns a version of an object with empty string values removed
def purify(meta):
    if type(meta) is dict:
        return {k: purify(v) for k, v in meta.items() if v is not ""}
    if type(meta) is list:
        return [purify(v) for v in meta if v is not ""]
    return meta

# TODO  