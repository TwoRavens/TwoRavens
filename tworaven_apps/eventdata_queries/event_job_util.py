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


class EventJobUtil(object):
    """Convinence class for the eventdata queries """


    @staticmethod
    def add_query_db(input):
        """ add the query to db"""

        #need to be checked by raman sir
        job = EventDataSavedQuery(name=input['name'],
      description=input['description'],
      username=input['username'],
      query=input['query'],
      result_count=input['result_count'],
      saved_to_dataverse=input['saved_to_dataverse'],
      dataverse_url=input['dataverse_url'])
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





