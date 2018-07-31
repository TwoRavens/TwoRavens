"""
Used to query a mongo database using a direct connection
"""
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


class MongoRetrieveUtil2(BasicErrCheck):
    """
    Used for querying mongo
    """
    def __init__(self, dbname, query):
        """
        dbname: name of the mongo database
        query: query to run
        """
        self.dbname = dbname
        self.query = query

        self.mongo_client = None

    def get_mongo_client(self):
        """
        Return a mongo client; initiate one if needed
        """
        if self.mongo_client:
            return self.mongo_client

        username = quote_plus(settings.EVENTDATA_MONGO_USERNAME)
        password = quote_plus(settings.EVENTDATA_MONGO_PASSWORD)

        try:
            if len(password) < 3:
                self.mongo_client = MongoClient('mongodb://%s/' % settings.EVENTDATA_MONGO_DB_ADDRESS)
            else:
                args = (username, password, settings.EVENTDATA_MONGO_DB_ADDRESS)
                self.mongo_client = MongoClient('mongodb://%s:%s@%s/' % args)

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