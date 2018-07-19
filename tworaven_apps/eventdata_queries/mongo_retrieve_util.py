"""
Used to query a mongo database using a direct connection
"""
import bson
from pprint import pprint
from tworaven_apps.utils.basic_err_check import BasicErrCheck
from urllib.parse import quote_plus
from pymongo import MongoClient
from pymongo.errors import \
    (ConfigurationError, ConnectionFailure)

from django.conf import settings


QUERY_THRESHOLD_SIZE = 1 * (1024 * 1024 * 1024) # 1GB

ERR_NO_DB_SPECIFIED = 'No database name specified.'
ERR_NO_QUERY_SPECIFIED = 'No query specified.'

ERR_FAILED_CLIENT_CONN = 'Could not start a Mongo client.'
ERR_FAILED_DB_CONN = 'Could not connect to the Mongo database.'

ERR_TOO_MANY_RESULTS = 'The query results were above the threshold to save to a file.'


class MongoRetrieveUtil(BasicErrCheck):
    """
    Used for querying mongo
    """
    def __init__(self, collection_name, query):
        """
        dbname: name of the mongo database
        query: query to run
        """
        self.collection_name = collection_name
        self.query = query

        self.mongo_client = None

        self.basic_check()
        self.run_query()

    def basic_check(self):
        """Run some basic checks"""
        if not self.collection_name:
            self.add_err_msg('No collection name specified.')
            return

        if not self.query:
            self.add_err_msg('No query specified.')
            return

        cli = self.get_mongo_client()


    def run_query(self):
        """run the query"""
        if self.has_error():
            return

        # ----------------------
        # get the client
        # ----------------------
        mongo_client = self.get_mongo_client()

        # ----------------------
        # choose the database
        # ----------------------
        if not settings.EVENTDATA_DB_NAME in mongo_client.database_names():
            user_msg = ('The database "%s" was not found'
                        ' on the Mongo server.'
                        '\nAvailable databases: %s') % \
                        (settings.EVENTDATA_DB_NAME,
                         mongo_client.database_names())
            self.add_err_msg(user_msg)
            return

        # set the database
        db = mongo_client[settings.EVENTDATA_DB_NAME]
        print('db chosen: ', settings.EVENTDATA_DB_NAME)

        # ----------------------
        # choose the collection
        # ----------------------
        if not self.collection_name in db.collection_names():
            user_msg = ('The collection "%s" was not found'
                        ' in database: "%s"'
                        '\nAvailable collections: %s') % \
                        (self.collection_name,
                         settings.EVENTDATA_DB_NAME,
                         db.collection_names())
            self.add_err_msg(user_msg)
            return

        collection = db[self.collection_name]
        print('collection chosen: ', self.collection_name)


        print('collection record count: ', collection.count())


        agg_query = [{"$match":{"$and":[{"$and":[{"INTERACTION":{"$not":{"$in":["12","13","20","27","28","35","37"]}}},{"EVENT_DATE_constructed":{"$gte":{"$date":{"$numberLong":"1122304320000"}},"$lte":{"$date":{"$numberLong":"1428072507000"}}}}]},{}]}},{"$project":{"_id":0,"ISO":1,"EVENT_ID_CNTY":1,"EVENT_ID_NO_CNTY":1,"EVENT_DATE":1,"YEAR":1,"TIME_PRECISION":1,"EVENT_TYPE":1,"ACTOR1":1,"ASSOC_ACTOR_1":1,"INTER1":1,"ACTOR2":1,"ASSOC_ACTOR_2":1,"INTER2":1,"INTERACTION":1,"REGION":1,"COUNTRY":1,"ADMIN1":1,"ADMIN2":1,"ADMIN3":1,"LOCATION":1,"LATITUDE":1,"LONGITUDE":1,"GEO_PRECISION":1,"SOURCE":1,"SOURCE_SCALE":1,"NOTES":1,"FATALITIES":1,"TIMESTAMP":1}}]

        print('agg query->')
        pprint(list(collection.aggregate(agg_query)))

        #print('size: ', Object.bsonsize(doc))

        #var cursor = db.collection.find(...); //Add your query here.

        #import ipdb; ipdb.set_trace()
        # run the query
        #
        #num_results = db.find(self.query).count()


    def get_mongo_client(self):
        """
        Return a mongo client; initiate one if needed
        """
        if self.mongo_client:
            return self.mongo_client

        username = quote_plus(settings.EVENTDATA_MONGO_USERNAME)
        password = quote_plus(settings.EVENTDATA_MONGO_PASSWORD)

        if not username and not password:
            mongo_url = 'mongodb://%s/' % settings.EVENTDATA_MONGO_DB_ADDRESS
        else:
            mongo_url = 'mongodb://%s:%s@%s/' % \
                                 (username,
                                  password,
                                  settings.EVENTDATA_MONGO_DB_ADDRESS)

        try:
            print('mongo_url', mongo_url)
            self.mongo_client = MongoClient(mongo_url)
        except ConfigurationError as err_obj:
            #
            # Failed configuration, e.g. could be credentials, etc
            #
            self.add_err_msg('Failed to connect to Mongo (configuration): %s' % err_obj)
            return
        except ConnectionFailure as err_obj:
            #
            # Failed connection
            #
            self.add_err_msg('Failed to connect to Mongo: %s' % err_obj)
            return

        print(self.mongo_client.database_names())

        return self.mongo_client
"""
export EVENTDATA_MONGO_PASSWORD=some-pass

python manage.py shell

from tworaven_apps.eventdata_queries.mongo_retrieve_util import MongoRetrieveUtil
mr = MongoRetrieveUtil('icews')
"""
