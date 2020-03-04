

KEY_INCLUDE_EVENTDATA_COLLECTION_NAMES = 'include_eventdata_collection_names'

KEY_EVENTDATA_DATASETS = 'EVENTDATA_DATASETS'

FOLDER_COLLECTIONS = 'collections'

ALL_COLLECTIONS_2019 = ['cline_phoenix_fbis.json',
                        'cline_phoenix_nyt.json',
                        'cline_phoenix_swb.json',
                        'cline_speed.json',
                        'ged.json',
                        'gtd.json',
                        'icews.json',
                        'mid.json',
                        'mmad.json',
                        'phoenix_rt.json',
                        'terrier.json']

ACLED_COLLECTIONS = ['acled_africa.json',
                     'acled_asia.json',
                     'acled_middle_east.json',]

CLINE_COLLECTIONS = ['cline_phoenix_fbis.json',
                     'cline_phoenix_nyt.json',
                     'cline_phoenix_swb.json',
                     'cline_speed.json']

UT_DALLAS_COLLECTIONS = ['icews.json', 'ged.json', 'gtd.json', 'covid_19.json'] \
                        + ACLED_COLLECTIONS \
                        + CLINE_COLLECTIONS

sorted(UT_DALLAS_COLLECTIONS)
                         #'phoenix_rt.json',
                         #'terrier.json'

#import json
#print('UT_DALLAS_COLLECTIONS', json.dumps(UT_DALLAS_COLLECTIONS))
