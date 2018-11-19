from pymongo import MongoClient
import json
from datetime import datetime

# this is for preparing .tsv files for the endpoints for downloading the entire database
# I would have just ran mongoexport, but this formats the constructed dates to YYYY-MM-DD

mongo_client = MongoClient(host='localhost', port=27017)  # Default port
db = mongo_client.event_data

batch = 500

def serialize(value):
    return value.isoformat()[:10] if type(value) is datetime else str(value)

def format(columns, record):
    return '\t'.join([serialize(record[column]) if column in record else '' for column in columns]) + '\n'

for collection in ['icews']:

    config_file = json.load(open('../collections/' + collection + '.json', 'r'))
    columns = config_file['columns'] + config_file['columns_constructed']

    for year in range(1994, 2017):
        with open('./temp/' + collection + '_' + str(year) + '.tsv', 'w') as outfile:
            outfile.write('\t'.join(columns) + '\n')
            for record in db[collection].find({"Event Date": {"$gte": str(year) + "-01-01", "$lt": str(year + 1) + '-01-01'}}).batch_size(batch):
                outfile.write(format(columns, record))
