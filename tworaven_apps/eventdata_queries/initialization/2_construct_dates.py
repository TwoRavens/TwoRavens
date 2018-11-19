from pymongo import MongoClient
import datetime

mongo_client = MongoClient(host='localhost', port=27017)  # Default port
db = mongo_client.event_data


# remove header lines
def remove_header():
    print(db.cline_phoenix_nyt.remove({'story_date': 'story_date'}))
    print(db.cline_phoenix_swb.remove({'story_date': 'story_date'}))
    print(db.cline_phoenix_fbis.remove({'story_date': 'story_date'}))
    print(db.cline_speed.remove({'cowcode': 'cowcode'}))
    print(db.acled_africa.remove({'EVENT_ID_CNTY': 'EVENT_ID_CNTY'}))
    print(db.acled_middle_east.remove({'EVENT_ID_CNTY': 'EVENT_ID_CNTY'}))
    print(db.acled_asia.remove({'EVENT_ID_CNTY': 'EVENT_ID_CNTY'}))
    print(db.icews.remove({'Event ID': 'Event ID'}))


def date_cline_phoenix():
    for collection in ['cline_phoenix_nyt', 'cline_phoenix_swb', 'cline_phoenix_fbis']:
        print('Processing: ' + collection)
        for document in db[collection].find({'TwoRavens_story_date': {"$exists": 0}}):
            try:
                db[collection].update(
                    {'_id': document['_id']},
                    {'$set': {'TwoRavens_story_date': datetime.datetime.strptime(document['story_date'], '%m/%d/%Y')}}
                )
            except KeyError:
                pass


def date_cline_speed():
    origin = datetime.datetime.strptime('01/01/1945', "%m/%d/%Y")  # taken from footer note 1 within codebook
    for document in db.cline_speed.find({'TwoRavens_AVERAGE_DATE': {"$exists": 0}}):
        fields = {
            'TwoRavens_CODE_DATE': datetime.datetime(document['CODE_YEAR'], document['CODE_MONTH'], document['CODE_DAY']),
            'TwoRavens_PUB_DATE': datetime.datetime(document['PUB_YEAR'], document['PUB_MON'], document['PUB_DATE'])
        }

        for column in ['JUL_END_DATE', 'JUL_START_DATE', 'JUL_PED', 'JUL_PSD', 'JUL_EED', 'JUL_LED']:
            if column in document:
                fields['TwoRavens_' + column] = origin + datetime.timedelta(days=document[column])

        day = 1 if 'day' not in document else document['day']
        month = 1 if 'month' not in document else document['month']
        if 'year' in document:
            fields['TwoRavens_AVERAGE_DATE'] = datetime.datetime(document['year'], month, day)

        db.cline_speed.update(
            {'_id': document['_id']},
            {'$set': fields}
        )


def date_acled():
    for collection in ['acled_africa', 'acled_middle_east', 'acled_asia']:
        print('Processing: ' + collection)
        for document in db[collection].find({'TwoRavens_EVENT_DATE': {"$exists": 0}}):
            db[collection].update(
                {'_id': document['_id']},
                {'$set': {
                    'TwoRavens_EVENT_DATE': datetime.datetime.strptime(document['EVENT_DATE'], '%m/%d/%Y') ,
                    'TwoRavens_TIMESTAMP': datetime.datetime.fromtimestamp(document['TIMESTAMP'])
                }
            })


def date_icews():
    for document in db.icews.find({'TwoRavens_Event Date': {"$exists": 0}}):
        try:
            db.icews.update(
                {'_id': document['_id']},
                {'$set': {'TwoRavens_Event Date': datetime.datetime.strptime(document['Event Date'], '%Y-%m-%d')}}
            )
        except Exception as err:
            print(err)
            print(document['_id'])


#remove_header()

# add constructed date fields
date_cline_phoenix()
date_cline_speed()
date_acled()
date_icews()
