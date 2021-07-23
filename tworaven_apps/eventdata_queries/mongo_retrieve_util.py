"""
Used to query a mongo database using a direct connection
"""
import json
import logging
from datetime import datetime
from urllib.parse import quote_plus

import requests
from bson.int64 import Int64
from bson.objectid import ObjectId
from dateutil import parser
from django.conf import settings
from pymongo import MongoClient
from pymongo.errors import \
    (ConfigurationError, ConnectionFailure, InvalidName,
     OperationFailure, PyMongoError,
     ServerSelectionTimeoutError)

from tworaven_apps.eventdata_queries.models import METHOD_CHOICES
from tworaven_apps.eventdata_queries.static_vals import \
    (KEY_INCLUDE_EVENTDATA_COLLECTION_NAMES, )
from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)
from tworaven_apps.utils.mongo_util import encode_variable, decode_variable
from tworaven_apps.utils.random_info import get_timestamp_string_readable

LOGGER = logging.getLogger(__name__)

QUERY_THRESHOLD_SIZE = 1 * (1024 * 1024 * 1024)  # 1GB

ERR_NO_DB_SPECIFIED = 'No database name specified.'
ERR_NO_QUERY_SPECIFIED = 'No query specified.'

ERR_FAILED_CLIENT_CONN = 'Could not start a Mongo client.'
ERR_FAILED_DB_CONN = 'Could not connect to the Mongo database.'

ERR_TOO_MANY_RESULTS = 'The query results were above the threshold to save to a file.'


class MongoRetrieveUtil(BasicErrCheck):
    """
    Used for querying mongo
    """
    def __init__(self, database_name, collection_name=None, host='TwoRavens', user=None):
        """
        dbname: name of the mongo database
        query: query to run
        method: function to use (find, aggregate, count)
        """
        self.database_name = database_name
        self.collection_name = collection_name
        self.host = host
        self.user = user

        self.mongo_client = None

        self.basic_check()

    @staticmethod
    def run_tworavens_healthcheck(**kwargs):
        """Healthcheck which runs a server_info() check against the Mongo server
        e.g. It simply instantiates a MongoRetrieveUtil, which itself
        does a server_info check.

        include_eventdata_collection_names - default False.
            if True add event data collection names and record counts.
        """
        print('kwargs: ', kwargs)
        util = MongoRetrieveUtil(settings.TWORAVENS_MONGO_DB_NAME)
        if util.has_error():
            return err_resp(util.get_error_message())

        mongo_client = util.get_mongo_client().result_obj  # assuming ok b/c no error

        server_info = mongo_client.server_info()

        mongo_attrs_to_share = ['version', 'gitVersion',
                                'system', 'ok',
                                'bits', 'maxBsonObjectSize']

        # only return some of th server information
        #
        [server_info.pop(k)
         for k in list(server_info.keys())
         if k not in mongo_attrs_to_share]

        server_info['timestamp'] = get_timestamp_string_readable(time_only=False)

        if kwargs.get(KEY_INCLUDE_EVENTDATA_COLLECTION_NAMES) is True:
            db_info = {}
            for cname in sorted(mongo_client[settings.EVENTDATA_DB_NAME].collection_names()):
                db_info[cname] = mongo_client[settings.EVENTDATA_DB_NAME][cname].count()
            server_info.update(dict(collections=db_info))

        return ok_resp(server_info)

    def basic_check(self):
        """Run some basic checks"""
        # if not self.collection_name:
        #    self.add_err_msg('No collection name specified.')
        #    return

        cli = self.get_mongo_client()
        if not cli.success:
            self.add_err_msg(cli.err_msg)

    def current_op_summary(self):
        """
        returns a summary of current ops for current user
        :return:
        """
        db_info = self.get_mongo_db(self.database_name)
        if not db_info.success:
            LOGGER.error(db_info.err_msg)
            return err_resp(db_info.err_msg)
        current_ops = db_info.result_obj.current_op()

        print(json.dumps(current_ops, default=lambda o: f"<<non-serializable: {type(o).__qualname__}>>"))

        summaries = []
        for op in current_ops.get('inprog', []):
            comment = op.get('command', {}).get('comment')
            if not comment:
                continue

            comment = json.loads(comment)
            if self.user != comment['user']:
                continue

            summaries.append({
                "comment": comment['message'],
                "active": op['active'],
                "currentOpTime": op['currentOpTime'],
                "secs_running": op['secs_running'],
                "microsecs_running": op['microsecs_running'],
            })

        return summaries

    def run_query(self, query, method, distinct=None, comment=None):
        """Run the query.
        """
        if self.has_error():
            return err_resp(self.get_error_message())

        def encode(value):
            if type(value) is str and value.startswith('$'):
                return f'${encode_variable(value[1:])}'
            return value

        # replace extended query operators like $oid, $date and $numberLong with objects
        # change column names to avoid $, ., /
        def reformat(query_):
            # ---------------------------
            if issubclass(type(query_), list):
                # mutate query in-place
                query_temp = [encode(value) for value in query_]
                query_.clear()
                query_.extend(query_temp)
                for stage in query_:
                    reformat(stage)
                return

            if issubclass(type(query_), dict):
                # mutate query in-place
                query_temp = {encode_variable(key): encode(query_[key]) for key in query_}
                query_.clear()
                query_.update(query_temp)

                for key in query_:
                    if issubclass(type(query_[key]), list):
                        reformat(query_[key])
                        continue
                    if not issubclass(type(query_[key]), dict):
                        continue

                    # Convert strict oid tags into ObjectIds to allow id comparisons
                    if '$oid' in query_[key]:
                        query_[key] = ObjectId(query_[key]['$oid'])
                    # Convert date strings to datetime objects
                    elif '$date' in query_[key]:
                        if isinstance(query_[key]['$date'], dict) and self.host == 'UTDallas':
                            # attempt to work with this:
                            # https://github.com/Sayeedsalam/spec-event-data-server/blob/920c6b83f121587cfeedbb34516a1b8213ec6092/app_v2.py#L125
                            query_[key]['$date'] = '$date(%s)' % (query_[key]['$date'],)
                        if type(query_[key]['$date']) is dict and '$numberLong' in query_[key]['$date']:
                            query_[key] = datetime.fromtimestamp(int(Int64(query_[key]['$numberLong'])))
                        else:
                            query_[key] = parser.parse(query_[key]['$date'])
                    elif '$numberLong' in query_[key]:
                        query_[key] = Int64(query_[key]['$numberLong'])
                    else:
                        reformat(query_[key])

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
            url = settings.EVENTDATA_PRODUCTION_SERVER_ADDRESS + settings.EVENTDATA_SERVER_API_KEY \
                  + '&datasource=' + self.collection_name

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
        if self.collection_name not in mongo_db.collection_names():
            user_msg = ('The collection "%s" was not found'
                        ' in database: "%s"'
                        '\nAvailable collections: %s') % \
                        (self.collection_name,
                         self.database_name,
                         mongo_db.collection_names())
            LOGGER.error(user_msg)
            self.add_err_msg(user_msg)
            return err_resp(user_msg)

        comment = json.dumps({'user': self.user, 'message': comment})
        try:
            if method == 'find':
                cursor = mongo_db[self.collection_name].find(query, comment=comment)
            elif method == 'aggregate':
                cursor = mongo_db[self.collection_name].aggregate(query, allowDiskUse=True, comment=comment)
            elif method == 'count':
                # Return value immediately
                return ok_resp(mongo_db[self.collection_name].count(query, comment=comment))
            else:
                raise ValueError(f'unexpected Mongo method: {method}')

            if distinct:
                cursor = cursor.distinct(distinct)

            # serialize dates manually
            def serialize_fragment(data):
                if type(data) is datetime:
                    return str(data)[:10]
                if issubclass(type(data), dict):
                    return {decode_variable(key): serialize_fragment(data[key]) for key in data}
                if issubclass(type(data), list):
                    return [serialize_fragment(element) for element in data]
                else:
                    return data

            def serialize(data):
                for line in data:
                    yield serialize_fragment(line)

            return ok_resp(serialize(cursor))

        except PyMongoError as err_obj:
            return err_resp(str(err_obj))
        except Exception as err_obj:
            return err_resp(str(err_obj))

    @staticmethod
    def get_mongo_url():
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
            return err_resp(client_info.err_msg)  # a big redundant/easier to read

        # Mongo client
        mongo_client = client_info.result_obj

        # Flag to only return existing databases
        #
        if existing_only:
            if db_name not in mongo_client.database_names():
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
            self.mongo_client = MongoClient(
                mongo_url,
                serverSelectionTimeoutMS=conn_timeout_ms)
            self.mongo_client.server_info()  # to prompt connection errors
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
        # print(self.mongo_client.database_names())

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
