"""
Used to query a mongo database using a direct connection
"""
import bson
import json
import logging
import requests
from dateutil import parser
from datetime import datetime
from pprint import pprint
from urllib.parse import quote_plus
from bson.objectid import ObjectId
from bson.int64 import Int64
from pymongo import MongoClient
from pymongo.errors import \
    (ConfigurationError, ConnectionFailure, InvalidName,
     OperationFailure, PyMongoError,
     ServerSelectionTimeoutError)
from django.conf import settings
from tworaven_apps.utils.basic_err_check import BasicErrCheck

from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp,
                                                err_resp_with_data)
from tworaven_apps.eventdata_queries.models import METHOD_CHOICES
from tworaven_apps.utils.mongo_util import encode_variable, decode_variable

LOGGER = logging.getLogger(__name__)


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
    def __init__(self, database_name, collection_name=None, host='TwoRavens'):
        """
        dbname: name of the mongo database
        query: query to run
        method: function to use (find, aggregate, count)
        """
        self.database_name = database_name
        self.collection_name = collection_name
        self.host = host

        self.mongo_client = None

        self.basic_check()

    @staticmethod
    def run_tworavens_healthcheck():
        """Healthcheck which runs a server_info() check against the Mongo server
        e.g. It simply instantiates a MongoRetrieveUtil, which itself
        does a server_info check.
        """
        util = MongoRetrieveUtil(settings.TWORAVENS_MONGO_DB_NAME)
        if util.has_error():
            return err_resp(util.get_error_message())

        cli = util.get_mongo_client().result_obj # assuming ok b/c no error

        server_info = cli.server_info()

        mongo_attrs_to_share = ['version', 'gitVersion',
                                'system', 'ok',
                                'bits', 'maxBsonObjectSize']

        # only return some of th server information
        #
        [server_info.pop(k)
         for k in list(server_info.keys())
         if not k in mongo_attrs_to_share]

        return ok_resp(server_info)

    def basic_check(self):
        """Run some basic checks"""
        #if not self.collection_name:
        #    self.add_err_msg('No collection name specified.')
        #    return

        cli = self.get_mongo_client()
        if not cli.success:
            self.add_err_msg(cli.err_msg)

    def run_query(self, query, method, distinct=None):
        """Run the query.
        """
        if self.has_error():
            return err_resp(self.get_error_message())

        def encode(value):
            if type(value) is str and value[0] == '$':
                return f'${encode_variable(value[1:])}'
            return value

        # replace extended query operators like $oid, $date and $numberLong with objects
        # change column names to avoid $, ., /
        def reformat(query):
            # ---------------------------
            if issubclass(type(query), list):
                query = [encode(value) for value in query]
                for stage in query:
                    reformat(stage)
                return

            if issubclass(type(query), dict):
                # mutate query in-place
                query_temp = {encode_variable(key): encode(query[key]) for key in query}
                query.clear()
                query.update(query_temp)

                for key in query:
                    if issubclass(type(query[key]), list):
                        for stage in query[key]:
                            reformat(stage)
                        return
                    if not issubclass(type(query[key]), dict):
                        continue

                    # Convert strict oid tags into ObjectIds to allow id comparisons
                    if '$oid' in query[key]:
                        query[key] = ObjectId(query[key]['$oid'])
                    # Convert date strings to datetime objects
                    elif '$date' in query[key]:
                        if isinstance(query[key]['$date'], dict) \
                            and self.host == 'UTDallas':
                            query[key]['$date'] = '$date(%s)' % (query[key]['$date'],) # attempt to work with this: https://github.com/Sayeedsalam/spec-event-data-server/blob/920c6b83f121587cfeedbb34516a1b8213ec6092/app_v2.py#L125
                        if type(query[key]['$date']) is dict \
                            and '$numberLong' in query[key]['$date']:
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

        if query is None:
            self.add_err_msg('No query specified.')

        if method not in METHOD_CHOICES:
            self.add_err_msg('%s is not a valid method.\nAvailable methods: %s' % (method, str(METHOD_CHOICES)))

        if self.has_error():
            return err_resp(self.get_error_message())

        if self.host == 'UTDallas':
            url = settings.EVENTDATA_PRODUCTION_SERVER_ADDRESS + settings.EVENTDATA_SERVER_API_KEY + '&datasource=' + self.collection_name

            if method == 'count':
                query = json.dumps([{'$match': query}, {'$count': "total"}])
                return ok_resp(requests.get(url + '&aggregate=' + query).json()['data'][0]['total'])
            elif method == 'find':
                unique = '&unique=' + distinct if distinct else ''
                return ok_resp(requests.get(url + '&query=' + json.dumps(query) + unique).json()['data'])
            elif method == 'aggregate':
                return ok_resp(requests.get(url + '&aggregate=' + json.dumps(query)).json()['data'])

        # ----------------------
        # get the mongo database
        # ----------------------
        db_info = self.get_mongo_db(self.database_name)
        if not db_info.success:
            LOGGER.error(db_info.err_msg)
            return err_resp(db_info.err_msg)

        mongo_db = db_info.result_obj

        # ----------------------
        # choose the collection
        # ----------------------
        if not self.collection_name in mongo_db.collection_names():
            user_msg = ('The collection "%s" was not found'
                        ' in database: "%s"'
                        '\nAvailable collections: %s') % \
                        (self.collection_name,
                         self.database_name,
                         mongo_db.collection_names())
            LOGGER.error(user_msg)
            self.add_err_msg(user_msg)
            return err_resp(user_msg)

        try:
            if method == 'find':
                cursor = mongo_db[self.collection_name].find(query)
            if method == 'aggregate':
                cursor = mongo_db[self.collection_name].aggregate(query)
            if method == 'count':
                # Return value immediately
                return ok_resp(mongo_db[self.collection_name].count(query))

            if distinct:
                cursor = cursor.distinct(distinct)

            # serialize dates manually
            def serialized(data):
                if type(data) is datetime:
                    return str(data)[:10]
                if issubclass(type(data), dict):
                    return {decode_variable(key): serialized(data[key]) for key in data}
                if issubclass(type(data), list):
                    return [serialized(element) for element in data]
                else:
                    return data

            return ok_resp(serialized(list(cursor)))

        except PyMongoError as err_obj:
            return err_resp(str(err_obj))
        except Exception as err_obj:
            return err_resp(str(err_obj))


    def get_mongo_url(self):
        """Using the Django settings,
        retrieve/construct the mongo connection string"""

        # Is the full connection string available?
        #
        if settings.MONGO_CONNECTION_STRING:
            return settings.MONGO_CONNECTION_STRING

        # Format the username and password, if available...
        #
        username = quote_plus(settings.EVENTDATA_MONGO_USERNAME)
        password = quote_plus(settings.EVENTDATA_MONGO_PASSWORD)

        # If no username/password, use address only
        #  (e.g. localhost)
        #
        if not username and not password:
            #
            # No username
            #
            mongo_url = 'mongodb://%s/' % settings.EVENTDATA_MONGO_DB_ADDRESS
            #
        else:
            #
            # Format mongo url with username/password
            #
            mongo_url = 'mongodb://%s:%s@%s/' % \
                             (username,
                              password,
                              settings.EVENTDATA_MONGO_DB_ADDRESS)

        return mongo_url

    def get_mongo_db(self, db_name, existing_only=False):
        """Return a Mongo db client for a specific database
        existing_only -  if True, only return an existing database
        """
        if self.has_error():
            return err_resp(self.get_error_message())

        if not db_name:
            return err_resp('"db_name" must be specified')

        client_info = self.get_mongo_client()
        if not client_info.success:
            return err_resp(client_info.err_msg) # a big redundant/easier to read

        # Mongo client
        mongo_client = client_info.result_obj

        # Flag to only return existing databases
        #
        if existing_only:
            if not db_name in mongo_client.database_names():
                user_msg = ('The database "%s" was not found'
                            ' on the Mongo server.'
                            '\nAvailable databases: %s') % \
                            (db_name,
                             mongo_client.database_names())
                return err_resp(user_msg)

        try:
            db = mongo_client[db_name]
        except InvalidName as err_obj:
            #
            return err_resp(self.get_conn_error_msg(err_obj))
        except PyMongoError as err_obj:
            #
            return err_resp(self.get_conn_error_msg(err_obj))

        return ok_resp(db)


    def get_mongo_client(self, conn_timeout_ms=1000):
        """
        Return a mongo client; initiate one if needed
        """
        if self.has_error():
            return err_resp(self.get_error_message())

        if self.mongo_client:
            return ok_resp(self.mongo_client)

        # Retrieve the Mongo url
        #
        mongo_url = self.get_mongo_url()

        # Connect!
        #
        try:
            self.mongo_client = MongoClient(\
                    mongo_url,
                    serverSelectionTimeoutMS=conn_timeout_ms)
            self.mongo_client.server_info() # to prompt connection errors
        except ConfigurationError as err_obj:
            #
            return err_resp(self.get_conn_error_msg(err_obj))
        except OperationFailure as err_obj:
            #
            return err_resp(self.get_conn_error_msg(err_obj))
        except ServerSelectionTimeoutError as err_obj:
            #
            return err_resp(self.get_conn_error_msg(err_obj))
        except ConnectionFailure as err_obj:
            #
            return err_resp(self.get_conn_error_msg(err_obj))
        except PyMongoError as err_obj:
            #
            return err_resp(self.get_conn_error_msg(err_obj))
        #print(self.mongo_client.database_names())

        return ok_resp(self.mongo_client)


    def get_conn_error_msg(self, err_obj):
        """Format and log a server connection error"""
        user_msg = ('Error: Failed to connect to Mongo'
                    ' (configuration): %s') % err_obj
        LOGGER.error(user_msg)
        self.add_err_msg(user_msg)
        return user_msg

"""
export EVENTDATA_MONGO_PASSWORD=some-pass

python manage.py shell

from tworaven_apps.eventdata_queries.mongo_retrieve_util import MongoRetrieveUtil
mr = MongoRetrieveUtil('icews')

from tworaven_apps.eventdata_queries.mongo_retrieve_util import MongoRetrieveUtil
mr = MongoRetrieveUtil('test-it')
db = mr.get_mongo_db('hello')
"""
