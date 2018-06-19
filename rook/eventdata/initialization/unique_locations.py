from pymongo import MongoClient

mongo_client = MongoClient(host='localhost', port=27017)  # Default port
db = mongo_client.event_data

location_columns = {
    "acled_africa": ['COUNTRY', 'ADMIN1', 'ADMIN2', 'ADMIN3', 'LOCATION'],
    "acled_middle_east": ['COUNTRY', 'ADMIN1', 'ADMIN2', 'ADMIN3', 'LOCATION'],
    "acled_asia": ['COUNTRY', 'ADMIN1', 'ADMIN2', 'ADMIN3', 'LOCATION'],
    "cline_phoenix_nyt": ['countryname', 'statename', 'placename'],
    "cline_phoenix_fbis": ['countryname', 'statename', 'placename'],
    "cline_phoenix_swb": ['countryname', 'statename', 'placename'],
    # "speed": ['country'],
    "icews": ['Country', 'Province', 'District', 'City']
}

all_locations = set()

for collection in location_columns:
    for location in db[collection].aggregate([{"$group": {"_id": {name: '$' + name for name in location_columns[collection]}}}]):
        idx = [location['_id'][val] for val in location_columns[collection] if val in location['_id']]
        all_locations.add(', '.join(sorted(set(location['_id'].values()), key=lambda x: idx.index(x))))


with open('./locations.txt', 'w') as outfile:
    for location in all_locations:
        outfile.write(location + '\n')
print(len(all_locations))
