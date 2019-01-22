# ged/gtd/terrier have longitude/latitude data
# partition on this
# for each doc in partition: match long/lat from arcgis2 data

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
        "REV_Subregion": "TwoRavens_subregion",
        "REV_Countr": "TwoRavens_country",
        "REV_Subreg": "TwoRavens_subregion",
        "REV_Addres": "TwoRavens_address"
    }
    return {mapname[key]: document['attributes'][key] for key in
            set(mapname.keys()) & set(document['attributes'].keys())}

def process_partition(locations, partition, db):
	#~ print("in process partition")
	#~ print(partition)
	#~ query = partition
	query = {"$and": [
	   partition,
	   {"TwoRavens_country": {"$exists": 0}} ]}
	
	for collection in ["acled_africa", "acled_asia", "acled_middle_east"]: #["gtd"]:#, "terrier"]:
		matchZero = 0
		matchMult = 0
		emptyMatch = 0
		matchCount = 0
		collectionRes = db[collection].find(query)		#finds only the partition in the specified collection
		exp = collectionRes.count()
		print("\nfound ", collectionRes.count(), " docs for partition ", partition, " col = ", collection)
		for doc in collectionRes:
			#~ print("found:")
			#~ print(doc)
			#~ print("lat/long")
			#~ print(doc["longitude"], " ", doc["latitude"])
			queryMatch = {"$and": [{"Longitude": doc["LONGITUDE"]}, {"Latitude": doc["LATITUDE"]}]}
			#~ print("query:")
			#~ print(query)
			match = locations["arcgis3"].find(queryMatch)
			#~ print("matched: ", match.count(), " res= ", format_coordinate(match[0]))
			if match.count() == 0:
				matchZero += 1
			elif match.count() > 1:
				matchMult += 1
			elif match.count() < 0:
				print("unknown")
			if match.count() == 1:
				cons = format_coordinate(match[0])
				if not cons:
					emptyMatch += 1
					continue
				db[collection].update_one({"_id": doc["_id"]}, {"$set": cons})
				matchCount += 1
			#~ print(format_coordinate(match[0]))
		print("\ncol: ", collection, "\npart: ", partition, "\nmatch missed: ", matchZero, "\nmatch multiple: ", matchMult, "\nempty match: ", emptyMatch, "\nmatched: ", matchCount, "\nexpected: ", exp, "\n", "-" * 50, "\ndone with partition ", partition, "-" * 75)
    #~ for document in db.icews.find(query).batch_size(batch):

            #~ docname = {'Country': 'Country', 'District': 'Region', 'Province': 'Subregion', 'City': 'City'}
            
            #~ identifier = {docname[key]: {"$exists": 0} if key not in document else document[key].lower() for key in
                          #~ docname.keys()}
            #~ if not identifier:
                #~ continue

            #~ match = list(locations.arcgis.find(identifier))
            #~ if not match:
                #~ continue

            #~ constructed = format_placename(match[0])

            #~ if not constructed:
                #~ continue

            #~ db.icews.update_one(
                #~ {'_id': document['_id']},
                #~ {'$set': constructed})


def reformat_database():
	mongo_client = MongoClient(host='localhost', port=27017)  # Default port
	db = mongo_client.event_data

	#~ partitions = [{"TwoRavens_country": country} for country in db.icews.distinct('TwoRavens_country') if country is not None]
	partitions = []
	step = 45
	for latitude in range(-90, 90, step):
		for longitude in range(-180, 180, step):
			part = {}
			#~ if latitude != 45:
				#~ part["latitude"] = {"$and": [{"$gte": latitude}, {"$lt": latitude + 45}]}
			#~ else:
				#~ part["latitude"] = {"$and": [{"$gte": latitude}, {"$lte": latitude + 45}]}
			#~ if longitude != 180-45:
				#~ part["longitude"] = {"$and": [{"$gte": longitude}, {"$lt": longitude + 45}]}
			#~ else:
				#~ part["longitude"] = {"$and": [{"$gte": longitude}, {"$lte": longitude + 45}]}
			if latitude != 90-step:
				part["$and"] = [{"LATITUDE": {"$gte": latitude}}, {"LATITUDE": {"$lt": latitude + step}}]
			else:
				part["$and"] = [{"LATITUDE": {"$gte": latitude}}, {"LATITUDE": {"$lte": latitude + step}}]
			if longitude != 180-step:
				part["$and"].append({"LONGITUDE": {"$gte": longitude}})
				part["$and"].append({"LONGITUDE": {"$lt": longitude + step}})
			else:
				part["$and"].append({"LONGITUDE": {"$gte": longitude}})
				part["$and"].append({"LONGITUDE": {"$lte": longitude + step}})
			partitions.append(part)
	#~ for collection in ["ged"]:#, "gtd", "terrier"]:
		#~ if collection == "ged":
			#~ partitions.append([{"TwoRavens_country": country} for country in db.ged.distinct("country") if country is not None])
		#~ elif collection == "gtd":
			#~ country_txt
		#~ elif collection == "terrier":
			#~ country_code (iso 3166-1 alpha-2 codes) (see https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)
	shuffle(partitions)
	print(partitions)

	partition_queue = Queue()
	for partition in partitions:
		partition_queue.put(partition)

	total_size = partition_queue.qsize()
	pool = [Process(target=process_wrapper, args=(partition_queue,), name=str(proc))
			for proc in range(8)]

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
	print("ending")
	for proc in pool:
		proc.join()
	print("done")
	#~ for proc in pool:
		#~ proc.terminate()


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

	#~ print("testing arcgis2: ", locations.arcgis2.find({'$and': [{'Longitude': 155.817388}, {'Latitude': -6.363394}]})[0])


# Only call when invoked from main. This prevents forked processes from calling it
if __name__ == '__main__':
    reformat_database()
