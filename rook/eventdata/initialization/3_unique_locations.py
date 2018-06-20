from pymongo import MongoClient
import os

mongo_client = MongoClient(host='localhost', port=27017)  # Default port
db = mongo_client.event_data
locations = mongo_client.locations


def get_arcgis_id(dataset, document):
    if dataset == 'icews':
        relabeling = {
            "Country": "country",
            "Province": "region",
            "District": "subregion",
            "City": "city"
        }
        return {relabeling[key]: document[key] for key in document.keys() & set(relabeling.keys())}

    if dataset in ['cline_phoenix_nyt', 'cline_phoenix_fbis', 'cline_phoenix_swb']:
        return {"singleLine": 'X:' + document['lat'] + ' Y:' + document['lon']}
        # relabeling = {
        #     "countryname": "country",
        #     "statename": "region"
        # }
        # location = {relabeling[key]: document[key] for key in document.keys() & set(relabeling.keys())}
        # if 'placename' in document and ('statename' not in document or document['placename'] != document['statename']):
        #     location['city'] = document['placename']
        # return location

    if dataset in ['acled_africa', 'acled_middle_east', 'acled_asia']:
        relabeling = {
            "COUNTRY": "country",
            "ADMIN1": "region",
            "ADMIN2": "subregion",
            "LOCATION": "city"
        }
        return {relabeling[key]: document[key] for key in document.keys() & set(relabeling.keys())}

    if dataset == 'cline_speed':
        return {"singleLine": 'X:' + document['gp7'] + ' Y:' + document['gp8']}


for collection in ['acled_africa', 'acled_middle_east', 'acled_asia']:  # db.collection_names():
    print(collection)
    for document in db[collection].find({}):
        identifier = get_arcgis_id(collection, document)
        if identifier:
            # print(document)
            # print(identifier)

            locations.arcgis.update_one(identifier, {'$set': {**{'collection': collection}, **identifier}}, upsert=True)
