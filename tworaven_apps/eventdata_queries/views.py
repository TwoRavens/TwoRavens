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
from tworaven_apps.eventdata_queries.forms import (EventDataSavedQueryForm, EventDataQueryFormSearch)
from tworaven_apps.eventdata_queries.models import (SEARCH_PARAMETERS)


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
        print(" frm error ")
        user_msg = dict(success=False,
                        message='Invalid input',
                        errors=frm.errors)
        return JsonResponse(user_msg)

    # print('frm.cleaned_data', frm.cleaned_data)
    success, addquery_obj_err = EventJobUtil.add_query_db(frm.cleaned_data)

    if not success:
        return JsonResponse(get_json_error(addquery_obj_err))

    return JsonResponse(addquery_obj_err)


@csrf_exempt
def api_get_list(request):
    """ return all the list"""
    success, jobs = EventJobUtil.get_list_all()
    # print(jobs)
    if not success:
        usr_msg = dict(success=False,
                       message=get_json_error(jobs))
        return JsonResponse(usr_msg)

    else:
        job_list = []
        for job in jobs:
            # print("list : ",job)
            job_list.append(job)

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
                       message=get_json_error(jobs))
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

    # check if json is empty
    count = 0
    for key in json_req_obj:
        if count > 1:
            # avoid a long running loop
            break
        count += 1
    if count == 0:
        user_msg = dict(success=False,
                        message='Invalid Input',
                        errors='zero parameters given')
        return JsonResponse(user_msg)

    # check if input contains correct search parameters
    for key in json_req_obj:
        if key not in SEARCH_PARAMETERS:
            user_msg = dict(success=False,
                            message='Invalid Input',
                            errors=' %s in not valid input, Valid input is among %s' % (key, SEARCH_PARAMETERS))
            return JsonResponse(user_msg)

    # check if the form is valid
    frm = EventDataQueryFormSearch(json_req_obj)

    if not frm.is_valid():
        print(" frm error ")
        user_msg = dict(success=False,
                        message='Invalid input',
                        errors=frm.errors)
        return JsonResponse(user_msg)

    if 'name' not in frm.cleaned_data:
        name = None
    else:
        name = frm.cleaned_data['name']

    if 'description' not in frm.cleaned_data:
        description = None
    else:
        description = frm.cleaned_data['description']

    if 'username' not in frm.cleaned_data:
        username = None
    else:
        username = frm.cleaned_data['username']

    filters = {'description__icontains': description,
               'name__icontains': name,
               'username': username}

    success, get_list_obj = EventJobUtil.search_object(**filters)
    job_list = []
    if success:
        for job in get_list_obj:
            job_list.append(job)
        user_msg = dict(success=True,
                        message='list retrieved',
                        data=job_list)
        return JsonResponse(user_msg)
    else:
        user_msg = dict(success=False,
                        message='list not retrieved',
                        error=get_json_error(get_list_obj))
        return JsonResponse(user_msg)


@csrf_exempt
def api_upload_to_dataverse(request, query_id):
    """ get query id to upload to dataverse"""

    success, res_obj = EventJobUtil.get_query_from_object(query_id)
    if success:
        user_msg = dict(data=res_obj)
        return JsonResponse(user_msg)
    else:
        user_msg = dict(error=get_json_error(res_obj))
        return JsonResponse(user_msg)


@csrf_exempt
def api_publish_dataset(request, dataset_id):
    """ Get the dataset Id from the response"""
    success, res = EventJobUtil.publish_dataset(dataset_id)
    if not success:
        usr_msg = dict(success=False,
                       message=get_json_error(res))
        return JsonResponse(usr_msg)

    else:
        usr_msg = dict(success=True,
                       message='published to dataverse',
                       data=res)

        return JsonResponse(usr_msg)

@csrf_exempt
def api_get_archive_list(request):
    """ get list"""
    success, jobs = EventJobUtil.get_all_archive_query_objects()
    # print(jobs)
    if not success:
        usr_msg = dict(success=False,
                       message=get_json_error(jobs))
        return JsonResponse(usr_msg)

    else:
        job_list = []
        for job in jobs:
            job_list.append(job.as_dict())

        usr_msg = dict(success=True,
                       message='archive list retrieved',
                       data=job_list)

        return JsonResponse(usr_msg)

@csrf_exempt
def api_get_archive_query_object(request, datafile_id):
    """ get object by id"""
    success, jobs = EventJobUtil.get_archive_query_object(datafile_id)

    if not success:
        usr_msg = dict(success=False,
                       message=get_json_error(jobs))
        return JsonResponse(usr_msg)

    else:
        usr_msg = dict(success=True,
                       message='object retrieved',
                       data=jobs.as_dict())

        return JsonResponse(usr_msg)





