import os
import json
import pandas as pd
from django.conf import settings
from collections import OrderedDict

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from tworaven_apps.utils.view_helper import \
    (get_request_body_as_json,
     get_json_error,
     get_json_success)
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp,
                                                err_resp_with_data)
from tworaven_apps.eventdata_queries.models import (EventDataSavedQuery, ArchiveQueryJob, UserNotificationModel, IN_PROCESS, ERROR, COMPLETE)
from tworaven_apps.eventdata_queries.dataverse.temporary_file_maker import TemporaryFileMaker
from tworaven_apps.eventdata_queries.dataverse.dataverse_publish_dataset import DataversePublishDataset
from tworaven_apps.eventdata_queries.dataverse.dataverse_list_files_dataset import ListFilesInDataset
from tworaven_apps.eventdata_queries.dataverse.get_dataset_file_info import GetDataSetFileInfo
from tworaven_apps.eventdata_queries.mongo_retrieve_util import MongoRetrieveUtil
from tworaven_apps.eventdata_queries.generate_readme import GenerateReadMe
from tworaven_apps.eventdata_queries.dataverse.routine_dataverse_check import RoutineDataverseCheck
from tworaven_apps.raven_auth.models import User

from bson.json_util import (loads, dumps)

# query reformatting
from bson.objectid import ObjectId
from bson.int64 import Int64
from datetime import datetime
from dateutil import parser


class EventJobUtil(object):
    """Convinence class for the eventdata queries """
    dataverse_server = settings.DATAVERSE_SERVER  # no trailing slash
    api_key = settings.DATAVERSE_API_KEY  # generated from kripanshu's account
    persistentId = settings.DATASET_PERSISTENT_ID  # doi or hdl of the dataset

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
        # print("event util obj", get_list_obj)

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
        print('-' * 40)
        print('getting object for query_id %s' % query_id)
        print('-' * 40)
        success, event_obj = EventJobUtil.get_object_by_id(query_id)

        if not success:
            return get_json_error(event_obj)

        # print("event data obj ", event_obj.as_dict()['query'])
        # check if the entry is allowed to be saved on dataverse
        if not event_obj.as_dict()['save_to_dataverse']:
            return err_resp('save to dataverse is set to False')

        print('-' * 40)
        print('Routine Dataverse Check')
        print('-' * 40)

        # run dataverse check :
        success_dataverse_check, check_obj = EventJobUtil.run_dataverse_check()
        if not success_dataverse_check:
            # add to user notification model
            EventJobUtil.add_to_user_model('test_user', query_id, check_obj)
            return err_resp(check_obj)

        print('-' * 40)
        print('Uploading query file')
        print('-' * 40)
        # send query_file to dataverse:
        success_query, query_obj = EventJobUtil.upload_query_result(event_obj)
        if not success_query:
            return get_json_error(query_obj)

        # make readme file and upload
        print('-' * 40)
        print('Uploading query result')
        print('-' * 40)
        success_readme, readme_ob = EventJobUtil.upload_query_readme(event_obj.as_dict())
        if not success_readme:
            return get_json_error(readme_ob)

        print("Generated read me uploaded to dataverse", readme_ob)

        # publish dataset
        print('-' * 40)
        print('publishing dataset')
        print('-' * 40)
        success_publish_dataset, published_dataset_obj = EventJobUtil.publish_dataset()
        if not success_publish_dataset:
            # add to user notification model
            EventJobUtil.add_to_user_model('test_user', query_id, published_dataset_obj)
            return err_resp(published_dataset_obj)

        print('-' * 40)
        print('Adding Query Object')
        print('-' * 40)
        # add to query obj
        # first get the dataset file info of latest version
        job_file_info = GetDataSetFileInfo()
        success_file_info, res_info = job_file_info.return_status()

        if not success_file_info:
            return err_resp(res_info)
        latest_version = res_info['data']['latestVersion']['versionNumber']
        has_error = False
        error_list = []
        ok_response = []
        for d in res_info['data']['latestVersion']['files']:
            file_id = d['dataFile']['id']
            file_url = EventJobUtil.dataverse_server + '/file.xhtml?fileId=' + str(
                file_id) + '&version=' + str(latest_version)
            try:
                saved_query = EventDataSavedQuery.objects.get(id=query_id)

            except ValueError:
                return err_resp('Could not retrieve query for id %s' % query_id)

            try:
                search_obj = ArchiveQueryJob.objects.get(datafile_id=file_id)
            except ArchiveQueryJob.DoesNotExist:
                search_obj = None
            if search_obj is None:
                succ, add_archive = EventJobUtil.add_archive_query_job(datafile_id=file_id,
                                                                       saved_query=saved_query,
                                                                       status=COMPLETE,
                                                                       is_finished=True,
                                                                       is_success=True,
                                                                       message='query result successfully created',
                                                                       dataverse_response=d,
                                                                       archive_url=file_url)
                if not succ:
                    has_error = True
                    error_list.append('Could not add the object with file id %s' % file_id)
            else:
                has_error = True
                error_list.append('Object with file ID %s already exists' % file_id)

        if has_error:
            # save to user notification
            return err_resp(error_list)

        else:
            return ok_resp(ok_response)

        # print(""" files has been successfully uploaded to dataverse, saving to database  EventDataSavedQuery""")
        # now upload to ARCHIVE
        # succ, res_obj = temp_file_obj.return_status()
        # print("res po", res_obj)
        # if not succ:
        #     return err_resp(res_obj)
        # else:
        #
        # try:
        #     saved_query = EventDataSavedQuery.objects.get(id=query_id)
        #
        # except ValueError:
        #     return err_resp('Could not retrieve query for id %s' % query_id)
        #
        # try:
        #     datafile_id = res_status['data']['files'][0]['dataFile']['id']
        #
        # except ValueError:
        #     return err_resp('Could not retrieve datafile id for query_id %s' % query_id)
        #
        # url_input = 'https://dataverse.harvard.edu/file.xhtml?fileId=' + str(datafile_id) + '&version=DRAFT'
        #
        # succ, add_archive = EventJobUtil.add_archive_query_job(datafile_id=int(datafile_id),
        #                                                        saved_query=saved_query,
        #                                                        status='complete',
        #                                                        is_finished=True,
        #                                                        is_success=True,
        #                                                        message='query result successfully created',
        #                                                        dataverse_response=r,
        #                                                        archive_url=url_input)
        #
        # if not succ:
        #     return err_resp(add_archive)
        # else:
        #     return ok_resp(add_archive)

    @staticmethod
    def add_archive_query_job(**kwargs):
        """ add to the database of archive jobs"""
        job = ArchiveQueryJob(**kwargs)

        job.save()
        # return True,"All good"
        # print("job :", job.as_dict())
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
        # print("event util obj", get_list_obj)

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
    def publish_dataset():
        """ publish dataset
        might be using dataset_id later according to actual API request
        """
        job = DataversePublishDataset()
        # job2 = GetDataSetFileInfo()
        succ, res = job.return_status()
        if not succ:
            print("message from dataverse publish fail ", res)
            return err_resp(res)
        else:
            print("message from dataverse publish success ", res)
            return ok_resp(res)
        #     success, res_info = job2.return_status()
        #     # print("Res : ********* : ", res_info)
        #     if success:
        #         job_archive = ArchiveQueryJob()
        #         for d in res_info['data']['latestVersion']['files']:
        #             # print("*******")
        #             file_id = d['dataFile']['id']
        #             file_url = d['dataFile']['pidURL']
        #             success, archive_job = job_archive.get_objects_by_id(file_id)
        #             if success:
        #                 archive_job.archive_url = file_url
        #                 archive_job.save()
        #                 return ok_resp(res)
        #             else:
        #                 return err_resp(archive_job)
        #     else:
        #         return err_resp(res_info)
        #
        # else:
        #     return err_resp(res)

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

        retrieve_util = MongoRetrieveUtil(collection, query, method, host)
        success, data = retrieve_util.run_query(distinct)
        return ok_resp(data) if success else err_resp(data)

    @staticmethod
    def get_metadata(folder, names=None):
        # `folder` is not a user-defined value
        directory = os.path.join(os.getcwd(), 'tworaven_apps', 'eventdata_queries', folder)

        if names:
            # make sure name is in directory and has file extension
            names = [name + '.json' for name in names if name + '.json' in os.listdir(directory)]
        else:
            names = sorted(os.listdir(directory))

        return {
            filename.replace('.json', ''): json.load(open(directory + os.sep + filename, 'r'), object_pairs_hook=OrderedDict) for filename in names
        }

    @staticmethod
    def upload_query_result(event_obj):
        """ upload query result to dataverse"""
        collection_name = event_obj.as_dict()['collection_name']
        query_obj = event_obj.as_dict()['query']
        query_id = event_obj.as_dict()['id']
        filename = '%s_%s.txt' % (str(query_id), str(collection_name))
        obj = MongoRetrieveUtil(collection_name, query_obj, 'aggregate')
        success, mongo_obj = obj.run_query()

        if not mongo_obj:
            return err_resp(mongo_obj)

        json_dump = json.dumps(mongo_obj)
        temp_file_obj = TemporaryFileMaker(filename, json_dump)

        succ, res_obj = temp_file_obj.return_status()
        print("query result upload : ", res_obj)

        if succ:
            return ok_resp(res_obj)

        else:
            return err_resp(res_obj)


    @staticmethod
    def upload_query_readme(kwargs):
        """upload query_readme result to dataverse """
        obj = GenerateReadMe(kwargs)
        success, readme_obj = obj.generate_readme()

        if not success:
            return err_resp(readme_obj)

        return ok_resp(readme_obj)


    @staticmethod
    def run_dataverse_check():
        """ check dataverse"""

        check_obj = RoutineDataverseCheck()
        success_check, check = check_obj.check_result_status()
        if not success_check:
            return err_resp(check)

        else:
            return ok_resp(check)

    @staticmethod
    def add_to_user_model(user_name, query_id, message):
        """ add to user notification model """
        user_object = User.objects.get(username=user_name)

        if not user_object:
            return err_resp('could not find user with name %s' % user_name)

        try:
            saved_query = EventDataSavedQuery.objects.get(id=query_id)

        except ValueError:
            return err_resp('Could not retrieve query for id %s' % query_id)

        query = saved_query.as_dict()['query']
        input_data = dict(user=user_object,
                          message=message,
                          read=False,
                          archived_query=query)
        user_notify = UserNotificationModel(**input_data)
        user_notify.save()

        if user_notify.id:
            """no error"""
            usr_dict = dict(success=True,
                            message="query saved",
                            data=user_notify.as_dict())
            return ok_resp(usr_dict)
        else:
            """error"""
            usr_dict = dict(success=False,
                            message="failed to save query",
                            id=user_notify.id)
            return err_resp(usr_dict)
