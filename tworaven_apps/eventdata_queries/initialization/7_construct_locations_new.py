# originally meant to handle applying all arcgis data to events.
# I ultimately decided it was really only efficient for the icews dataset
# for all other datasets run 7_construct_locations_multiprocess (not at the same time, this is an intensive script)

from pymongo import MongoClient
import sys
import time
from multiprocessing import Queue, Process
from random import shuffle

batch = 1


def format_coordinate(document):

    mapname = {
        "REV_Address": "TwoRavens_address",
        "REV_City": "TwoRavens_city",
        "REV_CountryCode": "TwoRavens_country",
        "REV_Postal": "TwoRavens_postal",
        "REV_PostalExt": "TwoRavens_postal_ext",
        "REV_Region": "TwoRavens_region",
        "REV_Subregion": "TwoRavens_subregion"
    }
    return {mapname[key]: document['attributes'][key] for key in
            set(mapname.keys()) & set(document['attributes'].keys())}


def format_placename(document):
    mapname = {
        "City": "TwoRavens_city",
        "Country": "TwoRavens_country",
        "LangCode": "TwoRavens_language",
        "Region": "TwoRavens_region",
        "Score": "TwoRavens_score",
        "Subregion": "TwoRavens_subregion",
        "Territory": "TwoRavens_territory"
    }
    return {mapname[key]: document['attributes'][key] for key in
            set(mapname.keys()) & set(document['attributes'].keys())}


def process_partition(locations, partition, db):
    print(partition)
    query = {"$and": [
       partition,
       {"TwoRavens_region": {"$exists": 0}},
       {"TwoRavens_subregion": {"$exists": 0}},
       {"TwoRavens_city": {"$exists": 0}},
       {"TwoRavens_address": {"$exists": 0}}]}

    for document in db.icews.find(query).batch_size(batch):

            docname = {'Country': 'Country', 'District': 'Region', 'Province': 'Subregion', 'City': 'City'}
            
            identifier = {docname[key]: {"$exists": 0} if key not in document else document[key].lower() for key in
                          docname.keys()}
            if not identifier:
                continue

            match = list(locations.arcgis.find(identifier))
            if not match:
                continue

            constructed = format_placename(match[0])

            if not constructed:
                continue

            db.icews.update_one(
                {'_id': document['_id']},
                {'$set': constructed})


def reformat_database():
    mongo_client = MongoClient(host='localhost', port=27017)  # Default port
    db = mongo_client.event_data

    #~ partitions = [{"TwoRavens_country": country} for country in db.icews.distinct('TwoRavens_country') if country is not None]
    partitions = []
    for collection in ["gtd"]:#, "ged", "terrier"]:
		if collection == "ged":
			partitions.append(
		#~ elif collection == "gtd":
			#~ country_txt
		#~ elif collection == "terrier":
			#~ country_code (iso 3166-1 alpha-2 codes) (see https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)
    shuffle(partitions)

    partition_queue = Queue()
    for partition in partitions:
        partition_queue.put(partition)

    total_size = partition_queue.qsize()
    pool = [Process(target=process_wrapper, args=(partition_queue,), name=str(proc))
            for proc in range(len(partitions))]#4)]

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
