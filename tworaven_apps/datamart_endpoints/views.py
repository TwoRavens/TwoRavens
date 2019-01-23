from django.views.decorators.csrf import csrf_exempt
from tworaven_apps.utils.view_helper import \
    (get_request_body_as_json,
     get_json_error,
     get_json_success,
     get_common_view_info)
from tworaven_apps.datamart_endpoints.datamart_job_util import DatamartJobUtil
from tworaven_apps.datamart_endpoints.forms import (DatamartSearchForm,
                                                    DatamartJoinForm,
                                                    DatamartMaterializeForm)

from django.http import \
    (JsonResponse, HttpResponse)

# Create your views here.


@csrf_exempt
def api_search(request):

    success, json_req_obj = get_request_body_as_json(request)

    if not success:
        return JsonResponse({"success": False, "error": get_json_error(json_req_obj)})

    # check if data is valid
    form = DatamartSearchForm(json_req_obj)
    if not form.is_valid():
        return JsonResponse({"success": False, "message": "invalid input", "errors": form.errors})

    success, results_obj_err = DatamartJobUtil.datamart_search(json_req_obj['query'])

    return JsonResponse({
        "success": success,
        "data": results_obj_err
    })

@csrf_exempt
def api_join(request):
    success, json_req_obj = get_request_body_as_json(request)

    if not success:
        return JsonResponse({"success": False, "error": get_json_error(json_req_obj)})

    # check if data is valid
    form = DatamartJoinForm(json_req_obj)
    if not form.is_valid():
        return JsonResponse({"success": False, "message": "invalid input", "errors": form.errors})

    success, results_obj_err = DatamartJobUtil.datamart_search(json_req_obj['query'])

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

    success, results_obj_err = DatamartJobUtil.datamart_materialize(
        json_req_obj['index'],
        json_req_obj['datamart_id'])

    return JsonResponse({
        "success": success,
        "data": results_obj_err
    })
