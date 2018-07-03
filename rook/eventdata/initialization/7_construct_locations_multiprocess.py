from pymongo import MongoClient
import sys
import time
from multiprocessing import Queue, Process

# Does the same thing as 7_construct_locations, but iterates over partitions of the arcgis locations.
# Takes advantage of multiprocessing and batch updates. Very intensive.
# The batch updating is a nightmare on icews

batch = 5


def format_coordinate(document):

    mapname = {
        "REV_Address": "address_constructed",
        "REV_City": "city_constructed",
        "REV_CountryCode": "country_constructed",
        "REV_Postal": "postal_constructed",
        "REV_PostalExt": "postal_ext_constructed",
        "REV_Region": "region_constructed",
        "REV_Subregion": "subregion_constructed"
    }
    return {mapname[key]: document['attributes'][key] for key in
            set(mapname.keys()) & set(document['attributes'].keys())}


def format_placename(document):
    mapname = {
        "City": "city_constructed",
        "Country": "country_constructed",
        "LangCode": "language_constructed",
        "Region": "region_constructed",
        "Score": "score_constructed",
        "Subregion": "subregion_constructed",
        "Territory": "territory_constructed"
    }
    return {mapname[key]: document['attributes'][key] for key in
            set(mapname.keys()) & set(document['attributes'].keys())}


def process_partition(locations, partition, db):
    result = list(locations.arcgis.aggregate([{"$match": {**partition, "mapped": {"$exists": 1}}}, {"$count": "count"}]))
    count = result[0]['count'] if result else 0
    total = list(locations.arcgis.aggregate([{"$match": partition}, {"$count": "count"}]))[0]['count']

    for document in locations.arcgis.find({**partition, "mapped": {"$exists": 0}}).batch_size(batch):
        count += 1
        print(str(partition) + ' ' + str(count) + '/' + str(total))

        if 'Latitude' in document:
            for collection in ['cline_speed', 'cline_phoenix_nyt', 'cline_phoenix_fbis', 'cline_phoenix_swb']:
                identifiers = ['GP7', 'GP8'] if 'cline_speed' == collection else ['lat', 'lon']
                query = {ident: value for ident, value in zip(identifiers, [document['Latitude'], document['Longitude']])}

                new_data = format_coordinate(document)

                if new_data:
                    db[collection].update_many(query, {"$set": new_data}, upsert=False)

        else:
            for collection in ['acled_africa', 'acled_middle_east', 'acled_asia']:
                if collection == 'icews':
                    docname = {'Country': 'Country', 'Region': 'District', 'Subregion': 'Province', 'City': 'City'}
                elif 'acled' in collection:
                    docname = {'Country': 'COUNTRY', 'Region': 'ADMIN2', 'Subregion': 'ADMIN1', 'City': 'Location'}

                query = {docname[key]: {"$exists": 0} for key in set(docname.keys())}
                for key in set(docname.keys()) & set(document.keys()):
                    query[docname[key]] = document[key]

                new_data = format_placename(document)

                if new_data:
                    db[collection].update_many(query, {"$set": new_data})

        locations.arcgis.update({"_id": document["_id"]}, {"$set": {"mapped": True}})


def reformat_database():
    mongo_client = MongoClient(host='localhost', port=27017)  # Default port
    locations = mongo_client.locations

    partitions = [{"Country": country} for country in locations.arcgis.distinct('Country') if country is not None] + [
            {"Latitude": {"$lte": 0}, "Longitude": {"$lte": 0}},
            {"Latitude": {"$gt": 0},  "Longitude": {"$lte": 0}},
            {"Latitude": {"$lte": 0}, "Longitude": {"$gt": 0}},
            {"Latitude": {"$gt": 0},  "Longitude": {"$gt": 0}},
        ]

    partition_queue = Queue()
    for partition in partitions:
        partition_queue.put(partition)

    total_size = partition_queue.qsize()
    pool = [Process(target=process_wrapper, args=(partition_queue,), name=str(proc))
            for proc in range(4)]

    for proc in pool:
        proc.start()

    while any([proc.is_alive() for proc in pool]) and partition_queue.qsize() != 0:
        # Show status
        sys.stdout.write("\r\x1b[KCollecting: " + str(total_size - partition_queue.qsize()) + '/' + str(total_size))
        sys.stdout.flush()
        time.sleep(5)

    # Print a newline to stdout
    print()

    # Once the pool of partitions has been exhausted, each thread will die
    # Once the threads are dead, this terminates all threads and the program is complete
    for proc in pool:
        proc.terminate()


def process_wrapper(page_queue):
    mongo_client = MongoClient(host='localhost', port=27017)  # Default port
    db = mongo_client.event_data
    locations = mongo_client.locations

    # Take elements from the queue until the queue is exhausted
    while not page_queue.empty():

        partition = page_queue.get()

        success = False
        while not success:
            try:
                process_partition(locations, partition, db)
                success = True
            except Exception as err:
                print(err)
                print("Re-attempting partition " + str(partition))


# Only call when invoked from main. This prevents forked processes from calling it
if __name__ == '__main__':
    reformat_database()
