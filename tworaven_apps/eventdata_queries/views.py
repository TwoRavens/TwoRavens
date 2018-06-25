from django.shortcuts import render
import json
from collections import OrderedDict
from django.shortcuts import render
from django.http import \
    (JsonResponse, HttpResponse,
     Http404, HttpResponseRedirect,
     QueryDict)
from django.template.loader import render_to_string
from django.views.decorators.csrf import csrf_exempt
from tworaven_apps.utils.view_helper import \
    (get_request_body_as_json,
     get_json_error,
     get_json_success)
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp,
                                                err_resp_with_data)
from tworaven_apps.eventdata_queries.event_job_util import EventJobUtil
from tworaven_apps.eventdata_queries.forms import (EventDataSavedQueryForm)


# Create your views here.

@csrf_exempt
def api_add_query(request):
    """add query to the db
    Json input :
    { "name":"query1",
      "description":"query1 desc",
      "username":"two ravens",
      "query":" set data",
      "result_count":"4"
      }
    """
    success, json_req_obj = get_request_body_as_json(request)
    # if json is not valid
    if not success:
        usr_msg = dict(success=False,
                       error=get_json_error(json_req_obj))
        return JsonResponse(usr_msg)

    # json is valid
    # print("input json : ", json.dumps(json_req_obj))

    frm = EventDataSavedQueryForm(json_req_obj)

    if not frm.is_valid():
        user_msg = dict(success=False,
                        message='Invalid input',
                        errors=frm.errors)
        return JsonResponse(user_msg)

    # print('frm.cleaned_data', frm.cleaned_data)
    success, addquery_obj_err = EventJobUtil.add_query_db(frm.cleaned_data)

    if not success:
        return JsonResponse(addquery_obj_err)

    return JsonResponse(addquery_obj_err)


@csrf_exempt
def api_get_list(request):
    """ return all the list"""
    success, jobs = EventJobUtil.get_list_all()
    # print(jobs)
    if not success:
        usr_msg = dict(success=False,
                       message=jobs)
        return JsonResponse(usr_msg)

    else:
        job_list = []
        for job in jobs:
            job_list.append(job.as_dict())

        usr_msg = dict(success=True,
                       message='list retrieved',
                       data=job_list)

        return JsonResponse(usr_msg)


@csrf_exempt
def api_retrieve_object(request, job_id):
    """ get object by id"""
    success, jobs = EventJobUtil.get_object_by_id(job_id)

    if not success:
        usr_msg = dict(success=False,
                       message=jobs.as_dict())
        return JsonResponse(usr_msg)

    else:
        usr_msg = dict(success=True,
                       message='list retrieved',
                       data=jobs.as_dict())

        return JsonResponse(usr_msg)


@csrf_exempt
def api_search(request):
    """Search about models data ( query data )
    sample input : {
    "name":"query1",
    "description":"query desc",
    "username":"tworavens"
    }

    """
    success, json_req_obj = get_request_body_as_json(request)
    # if json is not valid
    if not success:
        usr_msg = dict(success=False,
                       error=get_json_error(json_req_obj))
        return JsonResponse(usr_msg)

    # print(json_req_obj)
    name = None
    description = None
    username = None

    if 'name' not in json_req_obj:
        name = None
    else:
        name = json_req_obj['name']

    if 'description' not in json_req_obj:
        description = None
    else:
        description = json_req_obj['description']

    if 'username' not in json_req_obj:
        username = None
    else:
        username = json_req_obj['username']

    success, get_list_obj = EventJobUtil.search_object(name=name,
                                                       description=description,
                                                       username=username)
    job_list = []
    if success:
        for job in get_list_obj:
            job_list.append(job.as_dict())
        user_msg = dict(success=True,
                        message='list retrieved',
                        data=job_list)
        return JsonResponse(user_msg)
    else:
        user_msg = dict(success=False,
                        message='list not retrieved',
                        error=get_list_obj)
        return JsonResponse(user_msg)
