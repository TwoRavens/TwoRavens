# after processing the event data through arcGIS, load the data into mongo
from pymongo import MongoClient
import json
import glob

path_files = './arcgis_filtered/*_rev.json'

mongo_client = MongoClient(host='localhost', port=27017)  # Default port
db = mongo_client.event_data
locations = mongo_client.locations


# returns a version of an object with empty string values removed
def purify(meta):
    if type(meta) is dict:
        return {k: purify(v) for k, v in meta.items() if v is not "" and v is not None}
    if type(meta) is list:
        return [purify(v) for v in meta if v is not ""]
    return meta

def get_identifiers(meta):
    identifiers = {}
    for key in meta['attributes'].keys():
        if 'USER_' in key or key in ['Latitude', 'Longitude']:
            identifiers[key.replace('USER_', '')] = meta['attributes'][key]
    return identifiers

for file in glob.glob(path_files):
    with open(file, 'r') as infile:
        for location in json.load(infile)['features']:
            locations.arcgis2.update_one(
                get_identifiers(location),
                {'$set': {**purify(location), **get_identifiers(location)}},
                upsert=True)
