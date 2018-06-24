import json
import pandas as pd
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
    def add_query_db(json_input):
        """ add the query to db"""
        job = EventDataSavedQuery()
        job.save(json_input)
        # return True,"All good"
        print("job :", job.id)
        if job.id:
            """no error"""
            usr_dict = dict(success=True,
                            id=job.id)
            return ok_resp(usr_dict)
        else:
            """error"""
            usr_dict = dict(success=False,
                            id=job.id)
            return err_resp(usr_dict)
