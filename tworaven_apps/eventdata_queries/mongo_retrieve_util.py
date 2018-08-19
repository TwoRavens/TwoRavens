"""
Used to query a mongo database using a direct connection
"""
import bson
from datetime import datetime
from pprint import pprint
from urllib.parse import quote_plus
from pymongo import MongoClient
from pymongo.errors import \
    (ConfigurationError, ConnectionFailure)

from django.conf import settings
from tworaven_apps.utils.basic_err_check import BasicErrCheck

from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp,
                                                err_resp_with_data)
from tworaven_apps.eventdata_queries.models import METHOD_CHOICES


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
    def __init__(self, collection_name, query, method):
        """
        dbname: name of the mongo database
        query: query to run
        method: function to use (find, aggregate, count)
        """

        # replace extended query operators like $oid, $date and $numberLong with objects
        def reformat(query):
            if type(query) is list:
                for stage in query:
                    reformat(stage)
                return

            if not issubclass(type(query), dict):
                return

            for key in query:
                if issubclass(type(query[key]), dict):
                    # Convert strict oid tags into ObjectIds to allow id comparisons
                    if '$oid' in query[key]:
                        query[key] = ObjectId(query[key]['$oid'])
                    # Convert date strings to datetime objects
                    elif '$date' in query[key]:
                        if type(query[key]['$date']) is dict and '$numberLong' in query[key]['$date']:
                            query[key] = datetime.fromtimestamp(Int64(query[key]['$numberLong']))
                        else:
                            query[key] = parser.parse(query[key]['$date'])
                    elif '$numberLong' in query[key]:
                        query[key] = Int64(query[key]['$numberLong'])
                    else:
                        reformat(query[key])

        try:
            reformat(query)
        except Exception as e:
            self.add_err_msg("Error reformatting query: %s" % (str(e),))


        self.collection_name = collection_name
        self.query = query
        self.method = method

        self.mongo_client = None

        self.basic_check()

    def basic_check(self):
        """Run some basic checks"""
        if not self.collection_name:
            self.add_err_msg('No collection name specified.')
            return

        if self.query is None:
            self.add_err_msg('No query specified.')
            return

        if self.method not in METHOD_CHOICES:
            self.add_err_msg('%s is not a valid method.\nAvailable methods: %s' % (self.method, str(METHOD_CHOICES)))

        cli = self.get_mongo_client()


    def run_query(self, distinct=None):
        """run the query"""
        if self.has_error():
            return err_resp(self.get_error_message())

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
            return err_resp(user_msg)

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
            return err_resp(user_msg)

        # agg_query = [{"$match":{"$and":[{"$and":[{"INTERACTION":{"$not":{"$in":["12","13","20","27","28","35","37"]}}},{"EVENT_DATE_constructed":{"$gte":{"$date":{"$numberLong":"1122304320000"}},"$lte":{"$date":{"$numberLong":"1428072507000"}}}}]},{}]}},{"$project":{"_id":0,"ISO":1,"EVENT_ID_CNTY":1,"EVENT_ID_NO_CNTY":1,"EVENT_DATE":1,"YEAR":1,"TIME_PRECISION":1,"EVENT_TYPE":1,"ACTOR1":1,"ASSOC_ACTOR_1":1,"INTER1":1,"ACTOR2":1,"ASSOC_ACTOR_2":1,"INTER2":1,"INTERACTION":1,"REGION":1,"COUNTRY":1,"ADMIN1":1,"ADMIN2":1,"ADMIN3":1,"LOCATION":1,"LATITUDE":1,"LONGITUDE":1,"GEO_PRECISION":1,"SOURCE":1,"SOURCE_SCALE":1,"NOTES":1,"FATALITIES":1,"TIMESTAMP":1}}]
        # agg_query = [{"$match":{"year": 1998, "target_root" : "RUS", "target_agent":"GOV"}}, {"$count": "year_1998"}]

        if self.method == 'find':
            cursor = db[self.collection_name].find(self.query)
        if self.method == 'aggregate':
            cursor = db[self.collection_name].aggregate(self.query)
        if self.method == 'count':
            return ok_resp(db[self.collection_name].count(self.query))

        if distinct:
            cursor = cursor.distinct(distinct)

        # serialize dates manually
        def serialized(data):
            if type(data) is datetime:
                return str(data)[:10]
            if issubclass(type(data), dict):
                return {key: serialized(data[key]) for key in data}
            if issubclass(type(data), list):
                return [serialized(element) for element in data]
            else:
                return data

        return ok_resp(serialized(list(cursor)))


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
