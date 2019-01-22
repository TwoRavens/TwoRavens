from pymongo import MongoClient
import json
import os
import sys
import pandas as pd
from datetime import *

# fill in any records that weren't matched by arcgis with alignments from existing fields
# also fills in historical information about the location by taking into account for the date field
# arcgis returns ISO standard, so this will be the modern day standard
# COW has historical stasndards, so this will the historical standard
# TwoRavens_country:	modern
# TwoRavens_country_historic:	historic

mongo_client = MongoClient(host='localhost', port=27017)  # Default port
db = mongo_client.event_data

batch = 100

#~ query = [{"$match": {"TwoRavens_country": {"$exists": 0}}}]
#~ query = {"TwoRavens_country": {"$exists": 0}}
query = {"TwoRavens_country_historic": {"$exists": 0}}
#~ query = {}

#~ with open(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'alignments', 'country_cow_aligned.json'))) as locfile:
	#~ alignment = json.load(locfile)

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
		#~ print(start, " ", end)


#~ print(alignment)

#dataset: the dataset in mongo
#datasetAlign: the alignment in country_cow_aligned.json to refer to for conversion of datasetCountry
#datasetCountry: name of column that contains the country info to convert
def fillData(dataset, datasetAlign, datasetCountry):
	notAdded = set()
	coords = set()		#only for terrier
	docIDs = set()		#used to store docs without datasetCountry
	for doc in db[dataset].find(query):
		update = False
		if "TwoRavens_country" not in doc.keys():
			#add column for modern (ISO)
			try:
				if (doc[datasetCountry] is None or doc[datasetCountry] == ""):
					coords.add((doc["longitude"], doc["latitude"], doc["_id"]))
					continue
				modern = alignment.loc[alignment[datasetAlign] == doc[datasetCountry], "ISO-3"].values[0]
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
			if doc["TwoRavens_country"] in alignment["ISO-3"].values:
				modern = doc["TwoRavens_country"]
			else:
				try:
					if (doc[datasetCountry] is None or doc[datasetCountry] == ""):
						coords.add((doc["longitude"], doc["latitude"], doc["_id"]))
						continue
					modern = alignment.loc[alignment[datasetAlign] == doc[datasetCountry], "ISO-3"].values[0]
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
			if doc["TwoRavens_start date"].date() >= conv["start"] and doc["TwoRavens_end date"].date() <= conv["end"]:
				historic = conv["COW"]
			else:
				historic = alignment.loc[alignment["ISO-3"] == modern, "cState"].values[0]
		else:
			historic = alignment.loc[alignment["ISO-3"] == modern, "cState"].values[0]
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
	print(len(coords))
	with open("notadded" + dataset, "w") as out1:
		for item in notAdded: out1.write("%s\n" % item)
	#~ with open("coords" + dataset, "w") as out2:
		#~ for item in coords: out2.write("%s	%s	%s\n" % str(x) for x in item)
	#~ with open("docID" + dataset, "w") as out3:
		#~ for item in docIDs: out3.write("%s\n" % item)

for collection in []: #["terrier"]:
	print("processing ", collection)
	if collection == "ged":
		fillData("ged", "gwcode", "country_id")		#must add conversion to int() for doc[country_id]
	elif collection == "gtd":
		fillData("gtd", "gtdcode", "country")
	elif collection == "terrier":
		fillData("terrier", "ISO-2", "country_code")

locQuery = {"TwoRavens_country_src": {"$exists": 0}}
#only use this for GED - can have multiple countries in src/tgt
def fillLoc(dataset, datasetAlign, datasetCountryA, datasetCountryB):
	def getLocs(doc, val):
		ctryModern = alignment.loc[alignment[datasetAlign] == val, "ISO-3"].values[0]
		if ctryModern in dateLoc.keys():
			conv = dateLoc[ctryModern]
			if doc["TwoRavens_start date"].date() >= conv["start"] and doc["TwoRavens_end date"].date() <= conv["end"]:
				ctryHistoric = conv["COW"]
			else:
				ctryHistoric = alignment.loc[alignment["ISO-3"] == ctryModern, "cState"].values[0]
		else:
			ctryHistoric = alignment.loc[alignment["ISO-3"] == ctryModern, "cState"].values[0]
		return (ctryModern, ctryHistoric)
		
	for doc in db[dataset].find(locQuery):
		#~ print(doc)
		multA = False
		multB = False
		if datasetCountryA not in doc.keys() or doc[datasetCountryA] is None or doc[datasetCountryA] == "":
			ctryAModern = ""
			ctryAHistoric = ""
		else:
			#~ print(alignment[datasetAlign].to_string())
			#~ print(type(alignment[datasetAlign].iloc[0]))
			#~ print(doc[datasetCountryA])
			#~ print(type(doc[datasetCountryA]))
			#~ print(alignment[datasetAlign] == doc[datasetCountryA])
			ctryA = doc[datasetCountryA].split(",")
			if len(ctryA) == 1:
				ctryAModern, ctryAHistoric = getLocs(doc, int(ctryA[0]))
			else:
				multA = True
				ctryAList = []
				for cty in ctryA:
					ctryAList.append(getLocs(doc, int(cty)))

		if datasetCountryB not in doc.keys() or doc[datasetCountryB] is None or doc[datasetCountryB] == "":
			ctryBModern = ""
			ctryBHistoric = ""
		else:
			ctryB = doc[datasetCountryA].split(",")
			if len(ctryB) == 1:
				ctryBModern, ctryBHistoric = getLocs(doc, int(ctryB[0]))
			else:
				multB = True
				ctryBList = []
				for cty in ctryB:
					ctryBList.append(getLocs(doc, int(cty)))
			ctryBModern = alignment.loc[alignment[datasetAlign] == int(doc[datasetCountryB]), "ISO-3"].values[0]

		if not multA and not multB:
			db[dataset].update_one(
				{'_id': doc['_id']},
				{'$set': {"TwoRavens_country_src": ctryAModern, "TwoRavens_country_historic_src": ctryAHistoric,
							"TwoRavens_country_tgt": ctryBModern, "TwoRavens_country_historic_tgt": ctryBHistoric}})
		else:
			if multA and multB:
				for sideA in ctryAList:
					for sideB in ctryBList:
						tempDoc = doc
						tempDoc.pop("_id")
						tempDoc["TwoRavens_country_src"] = sideA[0]
						tempDoc["TwoRavens_country_historic_src"] = sideA[1]
						tempDoc["TwoRavens_country_tgt"] = sideB[0]
						tempDoc["TwoRavens_country_historic_tgt"] = sideB[1]
						db[dataset].insert_one(tempDoc)
				db[dataset].delete_one({"_id": doc["_id"]})
			elif multA:
				for sideA in ctryAList:
					tempDoc = doc
					tempDoc.pop("_id")
					tempDoc["TwoRavens_country_src"] = sideA[0]
					tempDoc["TwoRavens_country_historic_src"] = sideA[1]
					tempDoc["TwoRavens_country_tgt"] = ctryBModern
					tempDoc["TwoRavens_country_historic_tgt"] = ctryBHistoric
					db[dataset].insert_one(tempDoc)
				db[dataset].delete_one({"_id": doc["_id"]})
			elif multB:
				for sideB in ctryBlist:
					tempDoc = doc
					tempDoc.pop("_id")
					tempDoc["TwoRavens_country_src"] = ctryAModern
					tempDoc["TwoRavens_country_historic_src"] = ctryAHistoric
					tempDoc["TwoRavens_country_tgt"] = sideB[0]
					tempDoc["TwoRavens_country_historic_tgt"] = sideB[1]
					db[dataset].insert_one(tempDoc)
				db[dataset].delete_one({"_id": doc["_id"]})
		
for collection in []:#["ged"]:
	if collection == "ged":
		fillLoc("ged", "gwcode", "gwnoa", "gwnob")

for collection in ["acled_africa", "acled_asia", "acled_middle_east"]:
	print(collection)
	missing = set()
	for doc in db[collection].find({"TwoRavens_country": {"$exists": 0}}):
		try:
			modern = alignment.loc[alignment["ICEWS"] == doc["COUNTRY"], "ISO-3"].values[0]
			if modern is not None:
				db[collection].update_one(
					{'_id': doc['_id']},
					{'$set': {"TwoRavens_country": modern}})
			else:
				missing.add(doc["COUNTRY"])
		except:
			if doc["COUNTRY"] == "Palestine":
				db[collection].update_one(
					{'_id': doc['_id']},
					{'$set': {"TwoRavens_country": "PSE"}})
			else:
				missing.add(doc["COUNTRY"])
	print(missing)
	print()

'''
frame = pd.read_json(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'alignments', 'country2.json')))
frame = frame.fillna("-1")
#~ print(frame["ICEWS"])
#~ print(frame["cowcode"])

for collection in ['ged']:#, 'gtd']:
	print(collection)

	countrySet = set()
	missingTxt = set()
	missingCodes = set()
	if 'ged' == collection:
		for doc in db[collection].find(query):
			countrySet.add((doc["country_id"], doc["country"]))
			for equiv in frame["gwcode"].values:
				if doc["country_id"] == equiv:
					missingCodes.add((doc["country_id"], doc["country"]))
			#~ for equiv in frame["ICEWS"].values:
				#~ if doc["country"] in equiv:
					#~ missingTxt.add((doc["country_id"], doc["country"]))
			#~ for equiv in frame["cowcode"].values:
				#~ if doc["country_id"] == equiv:
					#~ missingCodes.add((doc["country_id"], doc["country"]))
	elif 'gtd' == collection:
		for doc in db[collection].find(query):
			countrySet.add((doc["country"], doc["country_txt"]))
			for equiv in frame["ICEWS"].values:
				if doc["country_txt"] in equiv:
					missingTxt.add((doc["country"], doc["country_txt"]))
			for equiv in frame["cowcode"].values:
				if doc["country"] == equiv:
					missingCodes.add((doc["country"], doc["country_txt"]))
	print("collection ", collection)
	print(countrySet)
	#~ print("missingTxt")
	#~ print(countrySet-missingTxt)
	print("missingCodes")
	print(countrySet-missingCodes)
	#~ print("diff")
	#~ print(missingTxt-missingCodes)

    #~ if 'cline_speed' == collection: 
        #~ cowcodes = {}
        #~ for equivalency in alignment:
            #~ if 'cowcode' in equivalency:
                #~ cowcodes[equivalency['cowcode']] = equivalency['ISO-3']

        #~ for document in db[collection].aggregate(query).batch_size(batch):
            #~ if 'cowcode' in document and document['cowcode'] in cowcodes:
                #~ db[collection].update_one(
                    #~ {'_id': document['_id']},
                    #~ {'$set': {"TwoRavens_country": cowcodes[document['cowcode']]}})

    #~ elif 'cline' in collection:
        #~ for document in db[collection].aggregate(query).batch_size(batch):
            #~ if 'countryname' in document:
                #~ db[collection].update_one(
                    #~ {'_id': document['_id']},
                    #~ {'$set': {'TwoRavens_country': document['countryname']}})

    #~ elif 'acled' in collection:
        #~ UNM49 = {}
        #~ for equivalency in alignment:
            #~ if 'UN M.49' in equivalency:
                #~ UNM49[equivalency['UN M.49']] = equivalency['ISO-3']

        #~ for document in db[collection].aggregate(query).batch_size(batch):
            #~ if 'ISO' in document and document['ISO'].zfill(3) in UNM49:
                #~ db[collection].update_one(
                    #~ {'_id': document['_id']},
                    #~ {'$set': {"TwoRavens_country": UNM49[document['ISO'].zfill(3)]}})

    #~ elif 'icews' == collection:
        #~ placename = {}

        #~ for equivalency in alignment:
            #~ if 'ICEWS' in equivalency:
                #~ placename[equivalency['ICEWS']] = equivalency['ISO-3']
        #~ count = 0
        #~ for document in db[collection].aggregate(query).batch_size(batch):
            #~ # Show status
            #~ count += 1
            #~ sys.stdout.write("\r\x1b[KRecord: " + str(count))
            #~ sys.stdout.flush()

            #~ if 'Country' in document and document['Country'] in placename:
                #~ db[collection].update_one(
                    #~ {'_id': document['_id']},
                    #~ {'$set': {"TwoRavens_country": placename[document['Country']]}})
'''
