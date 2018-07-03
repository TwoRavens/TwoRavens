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
from tworaven_apps.eventdata_queries.dataverse.named_temporary_file import NamedTemporaryFile
from tworaven_apps.eventdata_queries.dataverse.dataverse_publish_dataset import DataversePublishDataset


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
        success, get_list_obj = job.get_all_objects()

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
        succ, res = job.return_status()
        if succ:
            return ok_resp(res)

        else:
            return err_resp(res)






