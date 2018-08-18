import os
import json
import requests
import pandas as pd
from django.conf import settings
from collections import OrderedDict
from django.http import HttpResponse, JsonResponse
from tworaven_apps.utils.view_helper import \
    (get_request_body_as_json,
     get_json_error,
     get_json_success)
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp,
                                                err_resp_with_data)
from tworaven_apps.eventdata_queries.models import (EventDataSavedQuery, ArchiveQueryJob)
from tworaven_apps.eventdata_queries.dataverse.temporary_file_maker import TemporaryFileMaker
from tworaven_apps.eventdata_queries.dataverse.dataverse_publish_dataset import DataversePublishDataset
from tworaven_apps.eventdata_queries.dataverse.dataverse_list_files_dataset import ListFilesInDataset
from tworaven_apps.eventdata_queries.dataverse.get_dataset_file_info import GetDataSetFileInfo

from tworaven_apps.eventdata_queries.mongo_retrieve_util2 import MongoRetrieveUtil2
from bson.json_util import (loads, dumps)

# query reformatting
from bson.objectid import ObjectId
from bson.int64 import Int64
from datetime import datetime
from dateutil import parser


class EventJobUtil(object):
    """Convinence class for the eventdata queries """


    @staticmethod
    def add_query_db(query_info):
        """ add the query to db"""

        job = EventDataSavedQuery(**query_info)

        job.save()
        # return True,"All good"
        print("job :", job.as_dict())
        if job.id:
            """no error"""
            usr_dict = dict(success=True,
                            message="query saved",
                            data=job.as_dict())
            return ok_resp(usr_dict)
        else:
            """error"""
            usr_dict = dict(success=False,
                            message="failed to save query",
                            id=job.id)
            return err_resp(usr_dict)


    @staticmethod
    def get_list_all():
        """get all the jobs"""
        job = EventDataSavedQuery()
        success, get_list_obj = job.get_all_fields_except_query_list()

        if success:
            return ok_resp(get_list_obj)

        else:
            return err_resp(get_list_obj)

    @staticmethod
    def get_object_by_id(job_id):
        """get object by id"""
        job = EventDataSavedQuery()
        success, get_list_obj = job.get_objects_by_id(job_id)
        print("event util obj", get_list_obj)

        if success:
            return ok_resp(get_list_obj)

        else:
            return err_resp(get_list_obj)

    @staticmethod
    def search_object(**kwargs):
        """ return objects on the basis of request json"""

        job = EventDataSavedQuery()
        success, get_filtered_obj = job.get_filtered_objects(**kwargs)
        # print("list of objects", get_filtered_obj)

        if success:
            return ok_resp(get_filtered_obj)

        else:
            return err_resp(get_filtered_obj)

    @staticmethod
    def get_query_from_object(query_id):
        """ return query obj"""
        success, event_obj = EventJobUtil.get_object_by_id(query_id)

        if not success:
            return get_json_error(event_obj)

        else:
            print("event data obj ", event_obj.as_dict()['query'])
            json_dump = json.dumps(event_obj.as_dict()['query'])
            temp_file_obj = NamedTemporaryFile(json_dump)

            succ, res_obj = temp_file_obj.return_status()
            print("res po", res_obj)
            if not succ:
                return err_resp(res_obj)
            else:

                try:
                    saved_query = EventDataSavedQuery.objects.get(id=query_id)

                except ValueError:
                    return err_resp('Could not retrieve query for id %s' % query_id)

                try:
                    datafile_id = res_obj['data']['files'][0]['dataFile']['id']

                except ValueError:
                    return err_resp('Could not retrieve datafile id for query_id %s' % query_id)

                url_input = 'https://dataverse.harvard.edu/file.xhtml?fileId='+str(datafile_id)+'&version=DRAFT'

                succ, add_archive = EventJobUtil.add_archive_query_job(datafile_id=int(datafile_id),
                                                                       saved_query=saved_query,
                                                                       status='complete',
                                                                       is_finished=True,
                                                                       is_success=True,
                                                                       message='query result successfully created',
                                                                       dataverse_response=res_obj,
                                                                       archive_url=url_input)

                if not succ:
                    return err_resp(add_archive)
                else:
                    return ok_resp(add_archive)


    @staticmethod
    def add_archive_query_job(**kwargs):
        """ add to the database of archive jobs"""
        job = ArchiveQueryJob(**kwargs)

        job.save()
        # return True,"All good"
        print("job :", job.as_dict())
        if job.id:
            """no error"""
            usr_dict = dict(success=True,
                            message="query job archived",
                            data=job.as_dict())
            return ok_resp(usr_dict)
        else:
            """error"""
            usr_dict = dict(success=False,
                            message="failed to archive query",
                            id=job.id)
            return err_resp(usr_dict)


    @staticmethod
    def get_archive_query_object(datafile_id):
        """ get the data for datafile_id object"""
        job = ArchiveQueryJob()
        success, get_list_obj = job.get_objects_by_id(datafile_id)
        print("event util obj", get_list_obj)

        if success:
            return ok_resp(get_list_obj)

        else:
            return err_resp(get_list_obj)

    @staticmethod
    def get_all_archive_query_objects():
        """ get list of all objects"""
        job = ArchiveQueryJob()
        success, get_list_obj = job.get_all_objects()

        if success:
            return ok_resp(get_list_obj)

        else:
            return err_resp(get_list_obj)


    @staticmethod
    def publish_dataset(dataset_id):
        """ publish dataset
        might be using dataset_id later according to actual API request
        """
        job = DataversePublishDataset()
        job2 = GetDataSetFileInfo()
        succ, res = job.return_status()
        if succ:
            success, res_info = job2.return_status()
            print("Res : ********* : ", res_info)
            if success:
                job_archive = ArchiveQueryJob()
                for d in res_info['data']['latestVersion']['files']:
                    print("*******")
                    file_id = d['dataFile']['id']
                    file_url = d['dataFile']['pidURL']
                    success, archive_job = job_archive.get_objects_by_id(file_id)
                    if success:
                        archive_job.archive_url = file_url
                        archive_job.save()
                        return ok_resp(res)
                    else:
                        return err_resp(archive_job)
            else:
                return err_resp(res_info)

        else:
            return err_resp(res)

    @staticmethod
    def get_dataverse_files(version_id):
        """ get list"""
        list_obj = ListFilesInDataset(version_id)
        succ, res = list_obj.return_status()
        if succ:
            return ok_resp(res)

        else:
            return err_resp(res)

    @staticmethod
    def add_archive_query_job(**kwargs):
        """ add to the database of archive jobs"""
        job = ArchiveQueryJob(**kwargs)

        job.save()
        # return True,"All good"
        print("job :", job.as_dict())
        if job.id:
            """no error"""
            usr_dict = dict(success=True,
                            message="query job archived",
                            data=job.as_dict())
            return ok_resp(usr_dict)
        else:
            """error"""
            usr_dict = dict(success=False,
                            message="failed to archive query",
                            id=job.id)
            return err_resp(usr_dict)


    @staticmethod
    def get_archive_query_object(datafile_id):
        """ get the data for datafile_id object"""
        job = ArchiveQueryJob()
        success, get_list_obj = job.get_objects_by_id(datafile_id)
        print("event util obj", get_list_obj)

        if success:
            return ok_resp(get_list_obj)

        else:
            return err_resp(get_list_obj)

    @staticmethod
    def get_all_archive_query_objects():
        """ get list of all objects"""
        job = ArchiveQueryJob()
        success, get_list_obj = job.get_all_objects()

        if success:
            return ok_resp(get_list_obj)

        else:
            return err_resp(get_list_obj)


    @staticmethod
    def publish_dataset(dataset_id):
        """ publish dataset
        might be using dataset_id later according to actual API request
        """
        job = DataversePublishDataset()
        job2 = GetDataSetFileInfo()
        succ, res = job.return_status()
        if succ:
            success, res_info = job2.return_status()
            print("Res : ********* : ", res_info)
            if success:
                job_archive = ArchiveQueryJob()
                for d in res_info['data']['latestVersion']['files']:
                    print("*******")
                    file_id = d['dataFile']['id']
                    file_url = d['dataFile']['pidURL']
                    success, archive_job = job_archive.get_objects_by_id(file_id)
                    if success:
                        archive_job.archive_url = file_url
                        archive_job.save()
                        return ok_resp(res)
                    else:
                        return err_resp(archive_job)
            else:
                return err_resp(res_info)

        else:
            return err_resp(res)

    @staticmethod
    def get_dataverse_files(version_id):
        """ get list"""
        list_obj = ListFilesInDataset(version_id)
        succ, res = list_obj.return_status()
        if succ:
            return ok_resp(res)

        else:
            return err_resp(res)

    @staticmethod
    def get_data(host, collection, method, query, distinct=None):
        """ return data from mongo"""

        if method == 'distinct' and not distinct:
            return err_resp("the distinct method requires a 'keys' argument")

        # replace extended query operators like $oid, $date and $numberLong with objects
        def reformat(query):
            # Aggregation formatting
            if type(query) is list:
                for stage in query:
                    reformat(stage)
                return

            # Query formatting
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
            return err_resp(str(e))

        # grab the method from the collection that matches the user query type (safe because it must match the form enum)
        try:
            if host == 'TwoRavens':
                retrieve_util = MongoRetrieveUtil2(collection, query)
                client = retrieve_util.get_mongo_client()

                if retrieve_util.has_error():
                    print("ERR making mongo")
                    return err_resp(retrieve_util.get_error_message())

                if collection not in client['event_data'].collection_names():
                    return err_resp('%s is not a valid collection' % (collection,))

                # execute query
                if method == 'count':
                    data = client['event_data'][collection].count(query)
                elif method == 'find':
                    data = client['event_data'][collection].find(query)
                elif method == 'aggregate':
                    data = client['event_data'][collection].aggregate(query)
                elif method == 'distinct':
                    data = client['event_data'][collection].find(query).distinct(distinct)

                return ok_resp(json.loads(dumps(data)))

            elif host == 'UTDallas':
                url = settings.EVENTDATA_PRODUCTION_SERVER_ADDRESS + settings.EVENTDATA_SERVER_API_KEY + '&datasource=' + collection
                if method == 'count':
                    query = json.dumps([{'$match': query}, {'$count': "total"}])
                    return ok_resp(json.loads(requests.get(url + '&aggregate=' + query))['data']['total'])
                elif method == 'find':
                    data = requests.get(url + '&query=' + query)
                elif method == 'aggregate':
                    data = requests.get(url + '&aggregate=' + query)
                elif method == 'distinct':
                    data = requests.get(url + '&query=' + query + '&unique=' + distinct)

                return ok_resp(json.loads(data))

        except Exception as e:
            return err_resp(str(e))

    @staticmethod
    def get_metadata(folder, names=None):
        # `folder` is not a user-defined value
        directory = os.path.join(os.getcwd(), 'tworaven_apps', 'eventdata_queries', folder)

        if names:
            # make sure name is in directory and has file extension
            names = [name + '.json' for name in names if name + '.json' in os.listdir(directory)]
        else:
            names = os.listdir(directory)

        return {
            filename.replace('.json', ''): json.load(open(directory + os.sep + filename, 'r'), object_pairs_hook=OrderedDict) for filename in names
        }
