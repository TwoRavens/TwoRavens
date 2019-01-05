from pymongo import MongoClient

mongo_client = MongoClient(host='localhost', port=27017)  # Default port
db = mongo_client.event_data

#find all source/target and split into single events
#loop through src/tgt and insert into "mid"

for doc in db["mid-basic"].find():
	src = doc["src-actor"]
	tgt = doc["tgt-actor"]

	newDoc = doc
	newDoc.pop("_id")
	newDoc.pop("src-actor")
	newDoc.pop("tgt-actor")
	for sr in src:
		for tg in tgt:
			tempDoc = newDoc.copy()
			tempDoc["src-actor"] = sr
			tempDoc["tgt-actor"] = tg
			db["mid"].insert(tempDoc)
			#~ print(tempDoc)
