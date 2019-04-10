from pymongo import MongoClient
import datetime

mongo_client = MongoClient(host='localhost', port=27017)  # Default port
db = mongo_client.event_data

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

def dateSTD_ged():
	print("Processing GED")
	for doc in db["ged"].find({"TwoRavens_Event Start Date": {"$exists": 1}}):
		try:
			db["ged"].update(
				{"_id": doc["_id"]},
				{"$set": {
					"TwoRavens_start date": doc["TwoRavens_Event Start Date"],
					"TwoRavens_end date": doc["TwoRavens_Event End Date"],
					"TwoRavens_date info": 0
					}
				}
			)
		except Exception as err:
			print(err)
			print(doc["_id"])

def dateSTD_gtd():
	print("Processing GTD")
	for doc in db["gtd"].find({"TwoRavens_Event Date": {"$exists": 1}}):
		try:
			month = 2 if doc["imonth"] <= 0 else 0
			day = 1 if doc["iday"] <= 0 else 0
			db["gtd"].update(
				{"_id": doc["_id"]},
				{"$set": {
					"TwoRavens_start date": doc["TwoRavens_Event Date"],
					"TwoRavens_end date": doc["TwoRavens_Event Date"],
					"TwoRavens_date info": day + month
					}
				}
			)
		except Exception as err:
			print(err)
			print(doc["_id"])

def dateSTD_mid():
	for doc in db["mid-basic"].find({"TwoRavens_Event Date": {"$exists": 1}}):
		try:
			day = 1 if doc["StDay"] <= 0 else 0
			month = 2 if doc["StMon"] <= 0 else 0
			db["mid-basic"].update(
				{'_id': doc['_id']},
				{'$set': {
					'TwoRavens_start date': doc["TwoRavens_Event Date"],
					"TwoRavens_end date": doc["TwoRavens_Event Date"],
					"TwoRavens_date info": day + month
					}
				}
            )
		except Exception as err:
			print(err)
			print(doc['_id'])

def dateSTD_terrier():
	print("Processing Terrier")
	for doc in db["terrier"].find({"TwoRavens_Event Date": {"$exists": 1}}):
		try:
			db["terrier"].update(
				{'_id': doc['_id']},
				{'$set': {
					'TwoRavens_start date': doc["TwoRavens_Event Date"],
					"TwoRavens_end date": doc["TwoRavens_Event Date"],
					"TwoRavens_date info": 0
					}
				}
            )
		except Exception as err:
			print(err)
			print(doc['_id'])

def dateSTD_mmad():
    print("Processing MMAD")
    for doc in db["mmad"].find({"TwoRavens_event_date": {"$exists": 1}}):
        try:
            db["mmad"].update(
                {"_id": doc["_id"]},
                {"$set": {
                    "TwoRavens_start date": doc["TwoRavens_event_date"],
                    "TwoRavens_end date": doc["TwoRavens_event_date"],
                    "TwoRavens_date info": 0
                    }
                }
            )
        except Exception as err:
            print(err)
            print(doc['_id'])

#~ dateSTD_cline_phoenix()
#~ dateSTD_cline_speed()
#~ dateSTD_acled()
#~ dateSTD_icews()
#~ dateSTD_ged()
#~ dateSTD_gtd()
#~ dateSTD_mid()
#~ dateSTD_terrier()
dateSTD_mmad()
