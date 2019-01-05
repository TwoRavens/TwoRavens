from pymongo import MongoClient
import pprint

mongo_client = MongoClient(host='localhost', port=27017)  # Default port
db = mongo_client.event_data

for doc in db["mid-basic"].find({"src-actors": {"$exists": 0}}):
	# find all entries in mid-actors with the same event id
	events = list(db["mid-actors"].find({"IncidNum3": {"$eq": doc["IncidNum3"]}}))

	updateFields = {
		"src-actor": [],
		"tgt-actor": []
	}

	for ev in events:
		if ev["InSide A"] == 1:
			updateFields["src-actor"].append(ev["StAbb"])
		else:
			updateFields["tgt-actor"].append(ev["StAbb"])

	db["mid-basic"].update(
		{"_id": doc["_id"]},
		{"$set": updateFields}
	)
