import json
import sys
import os
from pymongo import MongoClient

mongo_client = MongoClient(host='localhost', port=27017)  # Default port
db = mongo_client.locations

for latitude in range(-90, 91, 45):
	for longitude in range(-180, 181, 45):
		query = db.arcgis2.find({"$or": [{"Latitude": latitude}, {"Longitude": longitude}]})
		#~ for res in query:
			#~ print("Lat {} Long {}: {}".format(latitude, longitude, res))
		print(latitude, longitude, query.count())
