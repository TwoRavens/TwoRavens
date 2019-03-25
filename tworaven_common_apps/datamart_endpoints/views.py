from django.views.decorators.csrf import csrf_exempt
from tworaven_apps.utils.json_helper import json_loads
from tworaven_apps.utils.view_helper import \
    (get_request_body_as_json,
     get_json_error,
     get_json_success,
     get_common_view_info)
from tworaven_apps.user_workspaces.utils import get_latest_user_workspace
from tworaven_apps.utils.json_helper import json_loads #(json_dumps, json_loads)

from tworaven_common_apps.datamart_endpoints.static_vals import \
    (DATAMART_ISI_NAME, DATAMART_NYU_NAME)
from tworaven_common_apps.datamart_endpoints.datamart_util_isi import \
    (DatamartJobUtilISI,)

from tworaven_common_apps.datamart_endpoints.datamart_util_nyu import \
    (DatamartJobUtilNYU,)
from tworaven_common_apps.datamart_endpoints.datamart_util import \
    (get_datamart_job_util,)
from tworaven_common_apps.datamart_endpoints.forms import (DatamartSearchForm,
                                                           DatamartAugmentForm,
                                                           DatamartMaterializeForm,
                                                           DatamartIndexForm,
                                                           DatamartScrapeForm,
                                                           DatamartUploadForm, DatamartCustomForm)

from tworaven_common_apps.datamart_endpoints.tasks import \
    (make_materialize_call,
     make_augment_call)

from django.http import \
    (JsonResponse, HttpResponse)

import json


@csrf_exempt
def api_scrape(request):
    success, json_req_obj = get_request_body_as_json(request)

    if not success:
        return JsonResponse(get_json_error(json_req_obj))

    # check if data is valid
    form = DatamartScrapeForm(json_req_obj)
    if not form.is_valid():
        return JsonResponse(\
                    get_json_error("invalid input",
                                   errors=form.errors.as_json()))

    success, results_obj_err = DatamartJobUtilISI.datamart_scrape(
        json_req_obj['url'])

    if not success:
        json_resp = get_json_error(results_obj_err)
    else:
        json_resp = get_json_success('it worked', data=results_obj_err)

    return JsonResponse(json_resp)


@csrf_exempt
def api_get_metadata(request):
    """Get metadata using the ISI Datamart"""
    req_info = get_request_body_as_json(request)
    if not req_info.success:
        return JsonResponse(get_json_error(req_info.err_msg))

    json_req_obj = req_info.result_obj

        # check if data is valid
    form = DatamartCustomForm(json_req_obj)
    if not form.is_valid():
        return JsonResponse(\
                get_json_success('invalid input',
                                 errors=form.errors.as_json()))

    metadata_info = DatamartJobUtilISI.datamart_get_metadata(json_req_obj['custom'])

    if not metadata_info.success:
        json_resp = get_json_error(metadata_info.err_msg)
    else:
        json_resp = get_json_success('it worked', data=metadata_info.result_obj)

    return JsonResponse(json_resp)


@csrf_exempt
def api_upload_metadata(request):
    """NOT TESTED - Use get metadata endpoint from ISI"""
    success, json_req_obj = get_request_body_as_json(request)
    if not success:
        return JsonResponse(get_json_error(json_req_obj))

    #     # check if data is valid
    # form = DatamartUploadForm(json_req_obj)
    # if not form.is_valid():
    #     return JsonResponse({"success": False, "message": "invalid input", "errors": form.errors})

    success, results_obj_err = DatamartJobUtilISI.datamart_get_metadata(json_req_obj['data'])

    if not success:
        json_resp = get_json_error(results_obj_err)
    else:
        json_resp = get_json_success('it worked', data=results_obj_err)

    return JsonResponse(json_resp)



@csrf_exempt
def api_index(request):
    success, json_req_obj = get_request_body_as_json(request)

    if not success:
        return JsonResponse({"success": False, "error": get_json_error(json_req_obj)})

    # check if data is valid
    form = DatamartIndexForm(json_req_obj)
    if not form.is_valid():
        return JsonResponse({"success": False, "message": "invalid input", "errors": form.errors})

    # Retrieve the appropriate DatamartJobUtil
    #
    job_util_info = get_datamart_job_util(form.cleaned_data['source'])
    if not job_util_info.success:
        return JsonResponse(get_json_error(job_util_info.err_msg))
    else:
        DatamartJobUtil = job_util_info.result_obj # e.g. DatamartJobUtilISI, DatamartJobUtilNYU

    success, results_obj_err = DatamartJobUtil.datamart_upload(json_req_obj['index'])

    return JsonResponse({
        "success": success,
        "data": results_obj_err
    })


@csrf_exempt
def api_search(request):
    success, json_req_obj = get_request_body_as_json(request)

    if not success:
        return JsonResponse(get_json_error(json_req_obj))

    # check if data is valid
    form = DatamartSearchForm(json_req_obj)
    if not form.is_valid():
        #print('form.errors', form.errors.as_json())
        print('\ntype form.errors', type(form.errors.as_json()))
        json_errs = json.loads(form.errors.as_json())
        err_msgs = [dal['message']
                    for dval_list in json_errs.values()
                    for dal in dval_list
                    if 'message' in dal]
        print('\nerr_msgs', err_msgs)

        json_err = get_json_error('Input error: %s' % ('. '.join(err_msgs)))
        return JsonResponse(json_err)

    # Retrieve the appropriate DatamartJobUtil
    #
    job_util_info = get_datamart_job_util(form.cleaned_data['source'])
    if not job_util_info.success:
        return JsonResponse(get_json_error(job_util_info.err_msg))
    else:
        DatamartJobUtil = job_util_info.result_obj # e.g. DatamartJobUtilISI, DatamartJobUtilNYU

    data_path = json_req_obj['data_path'] if 'data_path' in json_req_obj else None

    success, results_obj_err = DatamartJobUtil.datamart_search(\
                                    json_req_obj['query'],
                                    data_path)
    if not success:
        return JsonResponse(get_json_error(results_obj_err))

    return JsonResponse(get_json_success('it worked',
                                         data=results_obj_err))


@csrf_exempt
def api_augment_async(request):
    """Run steps of augment, create new dataset folder structure, etc"""

    # Get the latest UserWorkspace
    #
    ws_info = get_latest_user_workspace(request)
    if not ws_info.success:
        user_msg = 'User workspace not found: %s' % ws_info.err_msg
        return JsonResponse(get_json_error(user_msg))

    user_workspace = ws_info.result_obj

    # Request as python dict
    #
    json_req_info = get_request_body_as_json(request)
    if not json_req_info.success:
        return JsonResponse(get_json_error(json_req_info.err_msg))

    augment_params = json_req_info.result_obj

    augment_info = make_augment_call(user_workspace,
                                     augment_params)

    if not augment_info.success:
        return JsonResponse(get_json_error(augment_info.err_msg))

    return JsonResponse(get_json_success(augment_info.result_obj))



@csrf_exempt
def xapi_augment(request):
    """removed for async version: api_augment_async"""
    success, json_req_obj = get_request_body_as_json(request)

    if not success:
        return JsonResponse({"success": False, "error": get_json_error(json_req_obj)})

    # check if data is valid
    form = DatamartAugmentForm(json_req_obj)
    if not form.is_valid():
        return JsonResponse({"success": False, "message": "invalid input", "errors": form.errors})

    # Get the latest UserWorkspace
    #
    ws_info = get_latest_user_workspace(request)
    if not ws_info.success:
        user_msg = 'User workspace not found: %s' % ws_info.err_msg
        return JsonResponse(get_json_error(user_msg))

    user_workspace = ws_info.result_obj

    if json_req_obj['source'] == DATAMART_ISI_NAME:
        success, results_obj_err = DatamartJobUtilISI.datamart_augment(
            user_workspace,
            json_req_obj['data_path'],
            form.cleaned_data['search_result'],
            json_req_obj['left_columns'],
            json_req_obj['right_columns'],
            json_req_obj['exact_match'])

    if json_req_obj['source'] == DATAMART_NYU_NAME:
        success, results_obj_err = DatamartJobUtilNYU.datamart_augment(
            json_req_obj['data_path'],
            form.cleaned_data['search_result'],)

    return JsonResponse({
        "success": success,
        "data": results_obj_err
    })


@csrf_exempt
def api_materialize(request):
    """Run materialize using either ISI or NYU"""
    success, json_req_obj = get_request_body_as_json(request)

    if not success:
        return JsonResponse(get_json_error(json_req_obj))

    # Get the latest UserWorkspace
    #
    ws_info = get_latest_user_workspace(request)
    if not ws_info.success:
        user_msg = 'User workspace not found: %s' % ws_info.err_msg
        return JsonResponse(get_json_error(user_msg))

    user_workspace = ws_info.result_obj

    # check if data is valid
    #print('materialize input: ', json_req_obj)
    form = DatamartMaterializeForm(json_req_obj)
    if not form.is_valid():
        print('form.errors.as_json()', form.errors.as_json())
        return JsonResponse(\
                get_json_error("invalid input",
                               errors=form.errors.as_json()))

    job_util_info = get_datamart_job_util(form.cleaned_data['source'])
    if not job_util_info.success:
        return JsonResponse(get_json_error(job_util_info.err_msg))

    DatamartJobUtil = job_util_info.result_obj # e.g. DatamartJobUtilISI, DatamartJobUtilNYU

    # Run datamart_materialize
    #
    materialize_result = DatamartJobUtil.datamart_materialize(\
                                user_workspace,
                                form.cleaned_data['search_result'])
    if not materialize_result.success:
        return JsonResponse(get_json_error(materialize_result.err_msg))

    return JsonResponse(\
            get_json_success('it worked',
                             data=materialize_result.result_obj))


@csrf_exempt
def api_materialize_async(request):
    """Run async materialize with ISI"""
    success, json_req_obj = get_request_body_as_json(request)

    if not success:
        return JsonResponse(get_json_error(json_req_obj))

    # Get the latest UserWorkspace
    #
    ws_info = get_latest_user_workspace(request)
    if not ws_info.success:
        user_msg = 'User workspace not found: %s' % ws_info.err_msg
        return JsonResponse(get_json_error(user_msg))

    user_workspace = ws_info.result_obj

    # check if data is valid
    #print('materialize input: ', json_req_obj)
    form = DatamartMaterializeForm(json_req_obj)
    if not form.is_valid():
        print('form.errors.as_json()', form.errors.as_json())
        return JsonResponse(\
                get_json_error("invalid input",
                               errors=form.errors.as_json()))

    # job_util_info = get_datamart_job_util(form.cleaned_data['source'])
    # if not job_util_info.success:
    #    return JsonResponse(get_json_error(job_util_info.err_msg))

    # DatamartJobUtil = job_util_info.result_obj # e.g. DatamartJobUtilISI, DatamartJobUtilNYU


    mu_info = make_materialize_call(\
                 form.cleaned_data['source'],
                 user_workspace.id,
                 form.cleaned_data,
                 **dict(websocket_id=user_workspace.user.username))

    if not mu_info.success:
        return JsonResponse(get_json_error(mu_info.err_msg))
    else:
        return JsonResponse(\
                    get_json_success('in process',
                                     data=mu_info.result_obj))


    """
    # Run datamart_materialize
    #
    materialize_result = DatamartJobUtil.datamart_materialize(\
                                user_workspace,
                                form.cleaned_data['search_result'])
    if not materialize_result.success:
        return JsonResponse(get_json_error(materialize_result.err_msg))

    return JsonResponse(\
            get_json_success('it worked',
                             data=materialize_result.result_obj))
    """
