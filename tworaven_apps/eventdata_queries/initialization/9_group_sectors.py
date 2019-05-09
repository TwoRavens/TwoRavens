from pymongo import MongoClient
import json
import sys


# group sectors fields in icews and phoenix into a new column


# number of records in a batch. If not set, the query will time out
batch = 100

mongo_client = MongoClient(host='localhost', port=27017)  # Default port
db = mongo_client.event_data

outcolumns = ['Source Sectors Grouped', 'Target Sectors Grouped']


for collection in db.collection_names():
    print(collection)
    count = 0

    def print_count():
        global count
        count += 1
        sys.stdout.write("\r\x1b[KRecord: " + str(count))
        sys.stdout.flush()

    if 'icews' == collection:
        columns = ['Source Sectors', 'Target Sectors']

        with open('./sectors_icews.json', 'r') as infile:
            remap = json.load(infile)

        def combine(text):
            return ','.join(sorted(set(remap[x] for x in text.split(',') if x in remap)))

        query = {"$or": [{outcol: {"$exists": 0}} for col, outcol in zip(columns, outcolumns)]}

        for doc in db[collection].find(query).batch_size(batch):
            print_count()

            grouped = {outcol: combine(doc[col]) for col, outcol in zip(columns, outcolumns) if col in doc}

            if grouped:
                db.icews.update_one(
                    {'_id': doc['_id']},
                    {'$set': grouped})

    if 'phoenix' in collection:
        tabs = [['source_agent', 'source_others'], ['target_agent', 'target_others']]

        with open('./sectors_phoenix.json', 'r') as infile:
            remap = json.load(infile)

        def combine(text):
            return ','.join(sorted(set(y for x in text.split(';') if x in remap for y in remap[x])))

        query = {"$or": [{outcol: {"$exists": 0}} for outcol in outcolumns]}

        for doc in db[collection].find(query).batch_size(batch):
            print_count()

            # join the agent and agent_other fields and map to new value
            vals = [combine(';'.join([doc[col] for col in tab if col in doc])) for tab in tabs]

            # reformat to standardized column name
            grouped = {outcol: val for outcol, val in zip(outcolumns, vals) if val}

            if grouped:
                db.icews.update_one(
                    {'_id': doc['_id']},
                    {'$set': grouped})
