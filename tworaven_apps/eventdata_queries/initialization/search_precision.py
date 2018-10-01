from pymongo import MongoClient
import datetime
import decimal
import json
import glob

path_files = './arcgis_filtered/*_rev.json'

mongo_client = MongoClient(host='localhost', port=27017)  # Default port
db = mongo_client.event_data
loc = mongo_client.locations.arcgis

locCount = []
allLoc = loc.find({"Longitude": {"$exists": 1}})
allLocDict = []
for doc in allLoc:
	allLocDict.append((doc["Longitude"], doc["Latitude"]))
	if abs(decimal.Decimal(str(doc["Longitude"])).as_tuple().exponent) > 6:
		locCount.append(doc)
#~ print locCount
print "locations from arcgis greater that 6: " + str(len(locCount))

fileCount = 0
missing = []
for file in glob.glob(path_files):
    with open(file, 'r') as infile:
        rawData = (json.load(infile)['features'])
        fileCount += len(rawData)
        for location in rawData:
			#~ print location
			if (location["attributes"]["Longitude"], location["attributes"]["Latitude"]) not in allLocDict:
				missing.append(location)
print "total locations provided: " + str(fileCount)
print "missing: " + str(len(missing))
