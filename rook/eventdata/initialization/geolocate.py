# Using the arcgis API to geocode locations.
# This is a challenge due to the API token, so this wasn't included in the initialization path
# It would be nice to use this for ongoing maintenance of datasets that are still being updated,
#    since the singleLine= argument is much simpler than constructing the csv and running the reverse geocode

import requests
from pymongo import MongoClient
import json


demo = True
url_root = 'http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?'

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


if demo:
    query = [{"mapped": {"$exists": 0}}, {"$sample": {"size": 1}}]
    api_args = {
        "outFields": "*",
        "forStorage": "false",
        "f": "pjson"  # p for 'pretty'
    }

else:
    query = [{"mapped": {"$exists": 0}}]
    api_args = {
        "outFields": "*",
        "forStorage": "true",
        "f": "json",
        "token": ""  # do not add to git!
    }

api_fields = {'country', 'region', 'subregion', 'city', 'singleLine'}

for document in locations.arcgis.find(query):

    arguments = {**api_args, **{key: document[key] for key in document.keys() & api_fields}}
    url = (url_root + '&'.join([key + '=' + value for key, value in arguments.items()])).replace(' ', '%20')
    response = json.loads(requests.get(url).content.decode('UTF-8'))
    locations.arcgis.update_one(
        {"_id": document['_id']},
        {'$set': {**{'response': response}, **{"mapped": 1}}},
        upsert=True)

    if demo:
        print(arguments)
        print(url)
        print(response)

# example url
# http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?Address=380+new+york+st&City=redlands&Region=CA&Postal=92373&outFields=*&forStorage=false&f=pjson
