import json

from django.shortcuts import render
from collections import OrderedDict
from django.shortcuts import render
from django.db import IntegrityError
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
from tworaven_apps.eventdata_queries.forms import (EventDataSavedQueryForm,
                                                   EventDataQueryFormSearch,
                                                   EventDataGetDataForm,
                                                   EventDataGetMetadataForm)
from tworaven_apps.eventdata_queries.models import \
    (EventDataSavedQuery,)


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
    if not request.user.is_authenticated:
        user_msg = 'You must be logged in.'
        return JsonResponse(get_json_error(user_msg),
                            status=403)

    json_info = get_request_body_as_json(request)
    # if json is not valid
    if not json_info.success:
        return JsonResponse(get_json_error(json_info.err_msg))

    # Validate form results
    #
    event_data_info = json_info.result_obj
    event_data_info['user'] = request.user.id
    frm = EventDataSavedQueryForm(event_data_info)

    if not frm.is_valid():
        user_msg = dict(success=False,
                        message='Invalid input',
                        errors=frm.errors)
        return JsonResponse(user_msg)

    # Save the object
    #
    saved_query = EventDataSavedQuery(**frm.cleaned_data)

    try:
        saved_query.save()
    except IntegrityError:
        # rare to get here--maybe simultaneous saves...
        user_msg = EventDataSavedQueryForm.get_duplicate_record_error_msg()
        return JsonResponse(get_json_error(user_msg))

    ok_info = get_json_success(\
                'Query saved!',
                data=saved_query.as_dict())

    return JsonResponse(ok_info)


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


@csrf_exempt
def api_get_files_list(request, version_id):
    """ get dataverse files list"""

    success, jobs = EventJobUtil.get_dataverse_files(version_id)

    if not success:
        usr_msg = dict(success=False,
                       message=get_json_error(jobs))
        return JsonResponse(usr_msg)

    else:
        usr_msg = dict(success=True,
                       message='dataverse files object retrieved',
                       data=jobs)

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


@csrf_exempt
def api_get_files_list(request, version_id):
    """ get dataverse files list"""

    success, jobs = EventJobUtil.get_dataverse_files(version_id)

    if not success:
        usr_msg = dict(success=False,
                       message=get_json_error(jobs))
        return JsonResponse(usr_msg)

    else:
        usr_msg = dict(success=True,
                       message='dataverse files object retrieved',
                       data=jobs)

        return JsonResponse(usr_msg)


@csrf_exempt
def api_get_data(request):
    """ get data from query"""

    success, json_req_obj = get_request_body_as_json(request)

    if not success:
        return JsonResponse({"success": False, "error": get_json_error(json_req_obj)})

    # check if data is valid
    form = EventDataGetDataForm(json_req_obj)
    if not form.is_valid():
        return JsonResponse({"success": False, "message": "invalid input", "errors": form.errors})

    success, addquery_obj_err = EventJobUtil.get_data(
        json_req_obj['host'],
        json_req_obj['collection_name'],
        json_req_obj['method'],
        json.loads(json_req_obj['query']),
        json_req_obj.get('distinct', None))

    return JsonResponse({'success': success, 'data': addquery_obj_err} if success else get_json_error(addquery_obj_err))


@csrf_exempt
def api_get_metadata(request):
    """ get metadata (configs/formats/alignments)"""

    success, json_req_obj = get_request_body_as_json(request)

    if not success:
        return JsonResponse({"success": False, "error": get_json_error(json_req_obj)})

    # check if data is valid
    form = EventDataGetMetadataForm(json_req_obj)
    if not form.is_valid():
        return JsonResponse({"success": False, "message": "invalid input", "errors": form.errors})
    return JsonResponse(
        {name: EventJobUtil.get_metadata(name, json_req_obj[name]) for name in ['collections', 'formats', 'alignments'] if name in json_req_obj})
