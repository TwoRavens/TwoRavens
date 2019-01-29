from django.views.decorators.csrf import csrf_exempt
from tworaven_apps.utils.view_helper import \
    (get_request_body_as_json,
     get_json_error,
     get_json_success,
     get_common_view_info)
from tworaven_common_apps.datamart_endpoints.datamart_job_util import (DatamartJobUtilISI,
                                                                       DatamartJobUtilNYU)
from tworaven_common_apps.datamart_endpoints.forms import (DatamartSearchForm,
                                                           DatamartAugmentForm,
                                                           DatamartMaterializeForm,
                                                           DatamartUploadForm)
from django.http import \
    (JsonResponse, HttpResponse)

import json


# Create your views here.


@csrf_exempt
def api_upload(request):
    success, json_req_obj = get_request_body_as_json(request)

    if not success:
        return JsonResponse({"success": False, "error": get_json_error(json_req_obj)})

    # check if data is valid
    form = DatamartUploadForm(json_req_obj)
    if not form.is_valid():
        return JsonResponse({"success": False, "message": "invalid input", "errors": form.errors})

    DatamartJobUtil = {
        'ISI': DatamartJobUtilISI,
        'NYU': DatamartJobUtilNYU
    }[json_req_obj['source']]

    success, results_obj_err = DatamartJobUtil.datamart_upload(json_req_obj['data'])

    return JsonResponse({
        "success": success,
        "data": results_obj_err
    })


@csrf_exempt
def api_search(request):
    success, json_req_obj = get_request_body_as_json(request)

    if not success:
        return JsonResponse({"success": False, "error": get_json_error(json_req_obj)})

    # check if data is valid
    form = DatamartSearchForm(json_req_obj)
    if not form.is_valid():
        return JsonResponse({"success": False, "message": "invalid input", "errors": form.errors})

    DatamartJobUtil = {
        'ISI': DatamartJobUtilISI,
        'NYU': DatamartJobUtilNYU
    }[json_req_obj['source']]

    data_path = json_req_obj['data_path'] if 'data_path' in json_req_obj else None
    success, results_obj_err = DatamartJobUtil.datamart_search(json_req_obj['query'], data_path)

    return JsonResponse({
        "success": success,
        "data": results_obj_err
    })


@csrf_exempt
def api_augment(request):
    success, json_req_obj = get_request_body_as_json(request)

    if not success:
        return JsonResponse({"success": False, "error": get_json_error(json_req_obj)})

    # check if data is valid
    form = DatamartAugmentForm(json_req_obj)
    if not form.is_valid():
        return JsonResponse({"success": False, "message": "invalid input", "errors": form.errors})

    if json_req_obj['source'] == 'ISI':
        success, results_obj_err = DatamartJobUtilISI.datamart_augment(
            json_req_obj['data_path'],
            json.loads(json_req_obj['search_result']),
            json.loads(json_req_obj['left_columns']),
            json.loads(json_req_obj['right_columns']))

    if json_req_obj['source'] == 'NYU':
        success, results_obj_err = DatamartJobUtilNYU.datamart_augment(
            json_req_obj['data_path'],
            json_req_obj['search_result'])

    return JsonResponse({
        "success": success,
        "data": results_obj_err
    })


@csrf_exempt
def api_materialize(request):
    success, json_req_obj = get_request_body_as_json(request)

    if not success:
        return JsonResponse({"success": False, "error": get_json_error(json_req_obj)})

    # check if data is valid
    form = DatamartMaterializeForm(json_req_obj)
    if not form.is_valid():
        return JsonResponse({"success": False, "message": "invalid input", "errors": form.errors})

    DatamartJobUtil = {
        'ISI': DatamartJobUtilISI,
        'NYU': DatamartJobUtilNYU
    }[json_req_obj['source']]

    success, results_obj_err = DatamartJobUtil.datamart_materialize(
        json.loads(json_req_obj['search_result']))

    return JsonResponse({
        "success": success,
        "data": results_obj_err
    })
