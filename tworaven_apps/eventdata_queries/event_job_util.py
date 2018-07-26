import json
import pandas as pd
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
from tworaven_apps.eventdata_queries.mongo_retrieve_util import MongoRetrieveUtil
from tworaven_apps.eventdata_queries.generate_readme import GenerateReadMe


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

        # print("event data obj ", event_obj.as_dict()['query'])

        # make readme file and upload

        success_readme, readme_ob = EventJobUtil.upload_query_readme(event_obj.as_dict())
        if not success_readme:
            return get_json_error(readme_ob)

        print("Generated read me uploaded to dataverse",readme_ob)

        # send query_file to dataverse:
        success_query, query_obj = EventJobUtil.upload_query_result(event_obj.as_dict()['collection_name'], event_obj.as_dict()['query'])
        if not success_query:
            return get_json_error(query_obj)

        return ok_resp('Queries with readme Uploaded to dataverse')

        # print(""" files has been successfully uploaded to dataverse, saving to database  EventDataSavedQuery""")
        # NOW UPLOAD TO EventDataSavedQuery
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
    def publish_dataset(query_id):
        """ publish dataset
        might be using dataset_id later according to actual API request
        """
        job = DataversePublishDataset()
        job2 = GetDataSetFileInfo()
        succ, res = job.return_status()
        if succ:
            success, res_info = job2.return_status()
            # print("Res : ********* : ", res_info)
            if success:
                job_archive = ArchiveQueryJob()
                for d in res_info['data']['latestVersion']['files']:
                    # print("*******")
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
    def upload_query_result(collection_name, json_obj):
        """ upload query result to dataverse"""

        obj = MongoRetrieveUtil(collection_name, json_obj)
        success, mongo_obj = obj.run_query()

        if not success:
            return err_resp(mongo_obj)

        json_dump = json.dumps(mongo_obj)
        temp_file_obj = TemporaryFileMaker(json_dump)

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

        temp_file_obj = TemporaryFileMaker(readme_obj)

        succ, res_obj = temp_file_obj.return_status()
        print("query_readme result upload : ", res_obj)
        # res_obj = readme_obj
        # succ = True
        if succ:
            return ok_resp(res_obj)

        else:
            return err_resp(res_obj)





