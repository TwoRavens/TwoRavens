# renames fields from [NAME]_constructed -> TwoRavens_[name]
from pymongo import MongoClient
mongo_client = MongoClient(host='localhost', port=27017)  # Default port
db = mongo_client.event_data

for collection in db.collection_names():
    print(collection)
    db[collection].update({}, { "$rename": {
        "CODE_DATE_constructed": "TwoRavens_CODE_DATE",
        "PUB_DATE_constructed": "TwoRavens_PUB_DATE",
        "AVERAGE_DATE_constructed": "TwoRavens_AVERAGE_DATE",
        "JUL_END_DATE_constructed": "TwoRavens_JUL_END_DATE",
        "JUL_START_DATE_constructed": "TwoRavens_JUL_START_DATE",
        "JUL_PED_constructed": "TwoRavens_JUL_PED",
        "JUL_PSD_constructed": "TwoRavens_JUL_PSD",
        "JUL_EED_constructed": "TwoRavens_JUL_EED",
        "JUL_LED_constructed": "TwoRavens_JUL_LED",
        "country_constructed": "TwoRavens_country",
        "address_constructed": "TwoRavens_address",
        "city_constructed": "TwoRavens_city",
        "postal_constructed": "TwoRavens_postal",
        "postal_ext_constructed": "TwoRavens_postal_ext",
        "region_constructed": "TwoRavens_region",
        "subregion_constructed": "TwoRavens_subregion",
        "Event Date_constructed": "TwoRavens_Event Date",
        "story_date_constructed": "TwoRavens_story_date",
        "EVENT_DATE_constructed": "TwoRavens_EVENT_DATE",
        "TIMESTAMP_constructed": "TwoRavens_TIMESTAMP",
        "score_constructed": "TwoRavens_score",
        "territory_constructed": "TwoRavens_territory"
    }}, multi=True)