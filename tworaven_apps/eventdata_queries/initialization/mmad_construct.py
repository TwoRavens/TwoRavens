#this script converts NA to -1, and all other values to integer equivalent

from pymongo import MongoClient

mongo_client = MongoClient(host='localhost', port=27017)  # Default port
db = mongo_client.event_data

for doc in db["mmad"].find():
    if doc["mean_avg_numparticipants"] == "NA":
        db["mmad"].update_one(
            {
                "_id": doc["_id"],
            },
            {
                "$set": {"mean_avg_numparticipants": -1}
            }
        )
    else:
        db["mmad"].update_one(
            {
                "_id": doc["_id"],
            },
            {
                "$set": {"mean_avg_numparticipants": float(doc["mean_avg_numparticipants"])}
            }
        )
print("done")
