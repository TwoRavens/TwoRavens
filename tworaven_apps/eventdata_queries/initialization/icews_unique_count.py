# returns number of unique records for icews with different filtering:
# -by rounded lat/lon (100,000)
# -by country, district, province, city (100,000)
# -by lat/lon, filtered by 2 or more matches (70,000)

from pymongo import MongoClient
import os

mongo_client = MongoClient(host='localhost', port=27017)  # Default port
db = mongo_client.event_data

def icews_coordinates_rounded():
	print(list(db.icews.aggregate([
	  {
	    "$project": {
	      "_id": 0,
	      "lat_rounded": {
	        "$divide": [
	          {
	            "$subtract": [
	              {
	                "$multiply": [
	                  "$Latitude",
	                  100
	                ]
	              },
	              {
	                "$mod": [
	                  {
	                    "$multiply": [
	                      "$Latitude",
	                      100
	                    ]
	                  },
	                  1
	                ]
	              }
	            ]
	          },
	          100
	        ]
	      },
	      "lon_rounded": {
	        "$divide": [
	          {
	            "$subtract": [
	              {
	                "$multiply": [
	                  "$Longitude",
	                  100
	                ]
	              },
	              {
	                "$mod": [
	                  {
	                    "$multiply": [
	                      "$Longitude",
	                      100
	                    ]
	                  },
	                  1
	                ]
	              }
	            ]
	          },
	          100
	        ]
	      }
	    }
	  },
	  {
	    "$group": {
	      "_id": {
	        "latitude": "$lat_rounded",
	        "longitude": "$lon_rounded"
	      }
	    }
	  },
	  {
	    "$count": "uniques"
	  }
	])))

def icews_coordinates():
	print(list(db.icews.aggregate([
	  {
	    "$group": {
	      "_id": {
	  	    "lat": "$Latitude",
	        "lon": "$Longitude"
	      }
	    }
	  },
	  {
	    "$count": "uniques"
	  }
	])))

def icews_names():
	print(list(db.icews.aggregate([
	  {
	  	"$project": {
		  "country": {"$toLower": "$Country"},
	      "district": {"$toLower": "$District"},
	      "province": {"$toLower": "$Province"},
	      "city": {"$toLower": "$City"}
	    }
	  },
	  {
	    "$group": {
	      "_id": {
	  	    "Country": "$country",
	        "District": "$district",
	        "Province": "$province",
	        "City": "$city"
	      }, 
	      "total": {"$sum": 1}
	    }
	  },
	  {
	  	"$match": {"total": {"$gt": 1}}
	  },
	  {
	    "$count": "uniques"
	  }
	])))

# icews_coordinates_rounded()
icews_coordinates()
# icews_names()