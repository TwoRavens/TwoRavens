from pymongo import MongoClient
import os
import csv

mongo_client = MongoClient(host='localhost', port=27017)  # Default port
db = mongo_client.event_data

def icews_locations():
	print ("processing icews")
	with open('locations_icews.csv', 'w') as outfile:
		writer = csv.writer(outfile, delimiter=',', quoting=csv.QUOTE_MINIMAL)
		writer.writerow(['Country', 'Province', 'District', 'City'])

		# for document in db.icews.aggregate([{"$limit": 200},{"$group": {"_id": {"lat": "$Latitude","lon": "$Longitude"}}}]):
		for document in db.icews.aggregate([
		  {
			  "$project": {
			  "country": {"$toLower": "$Country"},
			  "province": {"$toLower": "$Province"},
			  "district": {"$toLower": "$District"},
			  "city": {"$toLower": "$City"}
			}
		  },
		  {
			"$group": {
			  "_id": {
				"Country": "$country",
				"Province": "$province",
				"District": "$district",
				"City": "$city"
			  }
			}
		  }
		]):
			writer.writerow([document['_id'][out].encode('utf-8') for out in ['Country', 'Province', 'District', 'City']])


def cline_locations():
	locations = set()

	for collection in ['cline_phoenix_nyt', 'cline_phoenix_swb', 'cline_phoenix_fbis']:
		print(collection)
		for document in db[collection].aggregate([
		  {
			"$group": {
			  "_id": {
				"Latitude": "$lat",
				"Longitude": "$lon"
			  }
			}
		  }
		]):
			if len(document["_id"]) < 2:
				continue
			locations.add(','.join([str(document['_id'][out]) for out in ['Latitude', 'Longitude']]))

	print("cline_speed")
	for document in db.cline_speed.aggregate([
	  {
		"$group": {
		  "_id": {
			"Latitude": "$GP7",
			"Longitude": "$GP8"
		  }
		}
	  }
	]):
		if 'Latitude' in document['_id']:
			locations.add(','.join([str(document['_id'][out]) for out in ['Latitude', 'Longitude']]))

	with open('locations_cline.csv', 'w') as outfile:
		outfile.write('Latitude,Longitude' + '\n')
		for location in locations:
			outfile.write(location + '\n')


def acled_locations():
    locations = set()
    headers = ['Country', 'Region', 'Subregion', 'City']

    for collection in ['acled_africa', 'acled_middle_east', 'acled_asia']:
        print(collection)
        for document in db[collection].aggregate([
          {
            "$project": {
              "country": {"$toLower": "$COUNTRY"},
              "region": {"$toLower": "$ADMIN1"},
              "subregion": {"$toLower": "$ADMIN2"},
              "city": {"$toLower": "$LOCATION"}
            }
          },
          {
            "$group": {
              "_id": {
                "Country": "$country",
                "Region": "$region",
                "Subregion": "$subregion",
                "City": "$city"
              }
            }
          }
        ]):
            identifier = {**{header: '' for header in headers}, **document['_id']}
            locations.add(','.join([document['_id'][out] for out in headers]))

    with open('locations_acled.csv', 'w') as outfile:
        outfile.write(','.join(headers) + '\n')
        for location in locations:
            outfile.write(location + '\n')

def ged_locations():
	print("processing ged")
	with open("locations_ged.csv", "w") as outfile:
		outfile.write("Latitude,Longitude\n")
		for doc in db["ged"].aggregate([
			{
				"$group": {
					"_id": {
						"Latitude": "$latitude",
						"Longitude": "$longitude"
					}
				}
			}
		]):
			outfile.write(','.join([str(doc['_id'][out]) for out in ['Latitude', 'Longitude']]) + "\n")

def gtd_locations():
	print("processing gtd")
	with open("locations_gtd.csv", "w") as outfile:
		outfile.write("Latitude,Longitude\n")
		for doc in db["gtd"].aggregate([
			{
				"$group": {
					"_id": {
						"Latitude": "$latitude",
						"Longitude": "$longitude"
					}
				}
			}
		]):
			if len(doc["_id"]) < 2:
				continue
			outfile.write(','.join([str(doc['_id'][out]) for out in ['Latitude', 'Longitude']]) + "\n")

def terrier_locations():
	print("processing terrier")
	with open("locations_terrier.csv", "w") as outfile:
		outfile.write("Latitude,Longitude\n")
		for doc in db["terrier"].aggregate([
			{
				"$group": {
					"_id": {
						"Latitude": "$latitude",
						"Longitude": "$longitude"
					}
				}
			}
		]):
			outfile.write(','.join([str(doc['_id'][out]) for out in ['Latitude', 'Longitude']]) + "\n")

icews_locations()
cline_locations()
acled_locations()
ged_locations()
gtd_locations()
terrier_locations()
