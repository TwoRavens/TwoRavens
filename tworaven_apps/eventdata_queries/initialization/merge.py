#this is used to bring remote dbs up to date with standardizations

from pymongo import MongoClient
import datetime
import pandas as pd

mongo_client = MongoClient(host='localhost', port=27017)  # Default port
db = mongo_client.remote

#TwoRavens_start date
#TwoRavens_end date
#TwoRavens_date info: 0 = all, 1 = day missing, 2 = month missing, 3 = day and month missing

def dateSTD_cline_phoenix():
	for collection in ['cline_phoenix_nyt', 'cline_phoenix_swb', 'cline_phoenix_fbis']:
		print('Processing: ' + collection)
		for document in db[collection].find({"TwoRavens_story_date": {"$exists": 1}}):
			try:
				db[collection].update(
					{'_id': document['_id']},
					{'$set': {
						'TwoRavens_start date': document['TwoRavens_story_date'],
						'TwoRavens_end date': document['TwoRavens_story_date'],
						'TwoRavens_date info': 0
						}
					}
				)
			except Exception as err:
				print(err)
				print(document['_id'])

def dateSTD_cline_speed():
	print("Processing: cline_speed")
	for document in db.cline_speed.find({'TwoRavens_AVERAGE_DATE': {"$exists": 1}}):
		try:
			day = 1 if 'day' not in document else 0
			month = 2 if 'month' not in document else 0
			db.cline_speed.update(
					{'_id': document['_id']},
					{'$set': {
						'TwoRavens_start date': document['TwoRavens_AVERAGE_DATE'],
						'TwoRavens_end date': document['TwoRavens_AVERAGE_DATE'],
						'TwoRavens_date info': day + month
						}
					}
				)
		except Exception as err:
			print(err)
			print(document['_id'])

def dateSTD_acled():
	for collection in ['acled_africa', 'acled_middle_east', 'acled_asia']:
		print('Processing: ' + collection)
		for document in db[collection].find({'TwoRavens_EVENT_DATE': {"$exists": 1}}):
			try:
				db[collection].update(
					{'_id': document['_id']},
					{'$set': {
						'TwoRavens_start date': document['TwoRavens_EVENT_DATE'],
						'TwoRavens_end date': document['TwoRavens_EVENT_DATE'],
						'TwoRavens_date info': 0
						}
					}
				)
			except Exception as err:
				print(err)
				print(document['_id'])

def dateSTD_icews():
	print("Processing ICEWS")
	for document in db.icews.find({'TwoRavens_Event Date': {"$exists": 1}}):
		try:
			db.icews.update(
				{'_id': document['_id']},
				{'$set': {
					'TwoRavens_start date': document['TwoRavens_Event Date'],
					'TwoRavens_end date': document['TwoRavens_Event Date'],
					'TwoRavens_date info': 0
					}
				}
			)
		except Exception as err:
			print(err)
			print(document['_id'])

#~ dateSTD_cline_phoenix()
#~ dateSTD_cline_speed()
#~ dateSTD_acled()
#~ dateSTD_icews()

from datetime import *

db = mongo_client.remote

query = {"TwoRavens_country_historic": {"$exists": 0}}

alignment = pd.read_json("../alignments/country_cow_aligned.json")

dateLoc = {}
with open("locationDates") as dateFile:
	x = 0
	for line in dateFile:
		if x == 0:
			x += 1
			continue
		i = line.strip().split("\t")
		start = datetime.strptime(i[4], "%B %d, %Y").date() if i[4] != "na" else date.min
		end = datetime.strptime(i[3], "%B %d, %Y").date()
		dateLoc[i[2]] = {"start": start, "end": end, "COW": i[1]}

def fillData(dataset, datasetAlign, datasetCountry):
	tempAlign = alignment.copy()
	if "acled" in dataset:
		tempAlign[datasetAlign] = tempAlign[datasetAlign].astype(str)
	notAdded = set()
	docIDs = set()		#used to store docs without datasetCountry
	#~ coords = set()
	for doc in db[dataset].find(query):
		update = False
		if "TwoRavens_country" not in doc.keys():
			#add column for modern (ISO)
			try:
				#~ if (doc[datasetCountry] is None or doc[datasetCountry] == ""):
					#~ coords.add((doc["longitude"], doc["latitude"], doc["_id"]))
					#~ continue
				modern = tempAlign.loc[tempAlign[datasetAlign] == doc[datasetCountry], "ISO-3"].values[0]
				update = True
			except:
				if datasetCountry not in doc.keys():
					if doc["_id"] not in docIDs:
						print(datasetCountry, "not in document", doc["_id"])
						docIDs.add(doc["_id"])
					continue
					
				if (doc[datasetCountry] not in notAdded):
					print(doc[datasetCountry], "not found in alignment")
					notAdded.add(doc[datasetCountry])
				continue
		#add column for historic (COW)
		if not update:
			if doc["TwoRavens_country"] in tempAlign["ISO-3"].values:
				modern = doc["TwoRavens_country"]
			else:
				try:
					modern = tempAlign.loc[tempAlign[datasetAlign] == doc[datasetCountry], "ISO-3"].values[0]
				except:
					if datasetCountry not in doc.keys():
						if doc["_id"] not in docIDs:
							print(datasetCountry, "not in document", doc["_id"])
							docIDs.add(doc["_id"])
						continue
					if (doc[datasetCountry] not in notAdded):
						print(doc[datasetCountry], "not found in alignment")
						notAdded.add(doc[datasetCountry])
					continue
		if modern in dateLoc.keys():
			conv = dateLoc[modern]
			if "TwoRavens_start date" not in doc.keys() or "TwoRavens_end date" not in doc.keys():
				historic = tempAlign.loc[tempAlign["ISO-3"] == modern, "cState"].values[0]
			elif doc["TwoRavens_start date"].date() >= conv["start"] and doc["TwoRavens_end date"].date() <= conv["end"]:
				historic = conv["COW"]
			else:
				historic = tempAlign.loc[tempAlign["ISO-3"] == modern, "cState"].values[0]
		else:
			historic = tempAlign.loc[tempAlign["ISO-3"] == modern, "cState"].values[0]
		#~ print(update, "|", modern, "|", historic)
		if update:
			db[dataset].update_one(
				{'_id': doc['_id']},
				{'$set': {"TwoRavens_country": modern, "TwoRavens_country_historic": historic}})
		else:
			db[dataset].update_one(
				{'_id': doc['_id']},
				{'$set': {"TwoRavens_country_historic": historic}})
	print("the following are missing in the alignment:")
	print(notAdded)
	#~ print(len(coords))
	with open("notaddedMerge" + dataset, "w") as out1:
		for item in notAdded: out1.write("%s\n" % item)
	#~ with open("coords", "w") as out2:
		#~ out2.write(coords)

#~ print(alignment["UN M.49"].to_string())

for collection in ["icews", "cline_phoenix_swb"]:	#cline_phoenix_swb",
	print("processing ", collection)
	if "acled" in collection:
		fillData(collection, "UN M.49", "ISO")
	elif collection in ["cline_phoenix_fbis", "cline_phoenix_nyt", "cline_phoenix_swb"]:
		fillData(collection, "ISO-3", "countryname")
	elif collection == "cline_speed":
		fillData(collection, "ISO-3", "TwoRavens_country")
	elif collection == "icews":
		fillData(collection, "ICEWS", "Country")
