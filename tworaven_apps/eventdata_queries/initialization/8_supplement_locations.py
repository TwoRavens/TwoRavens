from pymongo import MongoClient
import json
import os
import sys

# fill in any records that weren't matched by arcgis with alignments from existing fields

mongo_client = MongoClient(host='localhost', port=27017)  # Default port
db = mongo_client.event_data

batch = 100

query = [{"$match": {"country_constructed": {"$exists": 0}}}]

with open(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'alignments', 'location.json'))) as locfile:
    alignment = json.load(locfile)

for collection in ['icews']: # db.collection_names():
    print(collection)

    if 'cline_speed' == collection: 
        cowcodes = {}
        for equivalency in alignment:
            if 'cowcode' in equivalency:
                cowcodes[equivalency['cowcode']] = equivalency['ISO-3']

        for document in db[collection].aggregate(query).batch_size(batch):
            if 'cowcode' in document and document['cowcode'] in cowcodes:
                db[collection].update_one(
                    {'_id': document['_id']},
                    {'$set': {"country_constructed": cowcodes[document['cowcode']]}})

    elif 'cline' in collection:
        for document in db[collection].aggregate(query).batch_size(batch):
            if 'countryname' in document:
                db[collection].update_one(
                    {'_id': document['_id']},
                    {'$set': {'country_constructed': document['countryname']}})

    elif 'acled' in collection:
        UNM49 = {}
        for equivalency in alignment:
            if 'UN M.49' in equivalency:
                UNM49[equivalency['UN M.49']] = equivalency['ISO-3']

        for document in db[collection].aggregate(query).batch_size(batch):
            if 'ISO' in document and document['ISO'].zfill(3) in UNM49:
                db[collection].update_one(
                    {'_id': document['_id']},
                    {'$set': {"country_constructed": UNM49[document['ISO'].zfill(3)]}})

    elif 'icews' == collection:
        placename = {}

        for equivalency in alignment:
            if 'ICEWS' in equivalency:
                placename[equivalency['ICEWS']] = equivalency['ISO-3']
        count = 0
        for document in db[collection].aggregate(query).batch_size(batch):
            # Show status
            count += 1
            sys.stdout.write("\r\x1b[KRecord: " + str(count))
            sys.stdout.flush()

            if 'Country' in document and document['Country'] in placename:
                db[collection].update_one(
                    {'_id': document['_id']},
                    {'$set': {"country_constructed": placename[document['Country']]}})
