# filter locations that have already been processed by arcgis- might need more debugging on a second run

from pymongo import MongoClient
import os
import glob

mongo_client = MongoClient(host='localhost', port=27017)  # Default port
db = mongo_client.locations

all_headers = ['Latitude', 'Longitude', 'Country', 'Region', 'Subregion', 'City']

processed = set()

#~ for identifier in db.arcgis.aggregate([{"$group": {'_id': {header: '$' + header for header in all_headers}}}]):
    #~ print(','.join([identifier['_id'][header] for header in all_headers if header in identifier['_id']]))
    #~ processed.add(','.join([identifier['_id'][header] for header in all_headers if header in identifier['_id']]))

for file in glob.glob('./locations_*.csv'):
    print(file)
    with open(file, 'r') as infile, open(file.replace('.csv', '_filtered.csv'), 'w') as outfile:
        headers = infile.readline().split(',')
        outfile.write(','.join(headers))

        for line in infile.readlines():
            if line not in processed:
                outfile.write(line)
