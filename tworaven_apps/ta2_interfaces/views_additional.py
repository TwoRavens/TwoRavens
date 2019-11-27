"""
Functions for when the UI sends JSON requests to route to TA2s as gRPC calls
    - Right now this code is quite redundant. Wait for integration to factor it out,
     e.g. lots may change--including the "req_" files being part of a separate service
"""
from urllib import parse
from os.path import basename, isfile
from django.conf import settings
from django.http import JsonResponse, HttpResponse, HttpResponseNotFound

from django.views.decorators.cache import cache_page
from django.views.decorators.csrf import csrf_exempt

from tworaven_apps.ta2_interfaces.tasks import split_dataset, create_ice_datasets
from tworaven_apps.R_services.views import create_destination_directory
from tworaven_apps.ta2_interfaces.util_results_visualizations import (
    util_results_confusion_matrix,
    util_results_importance_efd,
    util_results_importance_ice,
    util_results_real_clustered)
from tworaven_apps.ta2_interfaces.grpc_util import TA3TA2Util
from tworaven_apps.ta2_interfaces.static_vals import KEY_DATA_POINTER, KEY_INDICES
from tworaven_apps.ta2_interfaces.util_embed_results import FileEmbedUtil

from tworaven_apps.utils.view_helper import \
    (get_request_body_as_json,
     get_json_error,
     get_json_success)
from tworaven_apps.utils.view_helper import \
    (get_authenticated_user,)
from tworaven_apps.user_workspaces.utils import get_latest_user_workspace

import pandas as pd
import numpy as np
from os import path

import traceback

from tworaven_apps.utils.static_keys import KEY_SUCCESS, KEY_DATA


@csrf_exempt
@cache_page(settings.PAGE_CACHE_TIME)
def view_get_problem_schema(request):
    """Return gRPC enum info"""

    info_dict = TA3TA2Util.get_problem_schema()
    if not info_dict:
        return JsonResponse(\
            dict(success=False,
                 message='Failed to retrieve problem schema'),
            status=400)

    return JsonResponse(dict(success=True,
                             message='Success!',
                             data=info_dict))

@csrf_exempt
def view_retrieve_d3m_output_data(request):
    """Expects a JSON request containing "data_pointer", and optionally indices
    For example: { "data_pointer": "file:///output/predictions/0001.csv", "indices": [1,2,3,10]}
    """
    req_body_info = get_request_body_as_json(request)
    if not req_body_info.success:
        return JsonResponse(get_json_error(req_body_info.err_msg))

    req_info = req_body_info.result_obj
    if not KEY_DATA_POINTER in req_info:
        user_msg = ('No key found: "%s"' % KEY_DATA_POINTER)
        return JsonResponse(get_json_error(user_msg))

    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    embed_util = FileEmbedUtil(req_info[KEY_DATA_POINTER],
                               indices=req_info[KEY_INDICES] if KEY_INDICES in req_info else None,
                               user=user_info.result_obj)
    if embed_util.has_error:
        return JsonResponse(get_json_error(embed_util.error_message))

    return JsonResponse(embed_util.get_final_results())



@csrf_exempt
def view_download_file(request):
    data_pointer = request.GET.get('data_pointer', None)
    content_type = parse.unquote(request.GET.get('content_type', 'application/force-download'))

    if not data_pointer:
        user_msg = ('No key found: "%s"' % KEY_DATA_POINTER)
        return JsonResponse(get_json_error(user_msg))

    data_pointer = parse.unquote(data_pointer).replace('file://', '')

    if not path.exists(data_pointer):
        user_msg = ('No file found: "%s"' % data_pointer)
        return JsonResponse(get_json_error(user_msg))

    with open(data_pointer, 'r', encoding="ISO-8859-1") as file_download:
        return HttpResponse(
            file_download,
            content_type=content_type)



@csrf_exempt
def view_download_report_file(request):
    """Return the report, which is generally a PDF file"""
    data_pointer = request.GET.get('data_pointer', None)
    content_type = parse.unquote(request.GET.get('content_type', 'application/force-download'))

    # Make sure the file exists
    #
    if not data_pointer:
        user_msg = ('No key found: "%s"' % KEY_DATA_POINTER)
        return JsonResponse(get_json_error(user_msg))

    data_pointer = parse.unquote(data_pointer)

    if not isfile(data_pointer):
        user_msg = ('No file found: "%s"' % data_pointer)
        return JsonResponse(get_json_error(user_msg))

    # Read the report and send it back as an attachment
    #
    report_filename = basename(data_pointer)

    try:
        with open(data_pointer, 'rb') as ze_file:
            file_data = ze_file.read()

        # sending response
        response = HttpResponse(file_data, content_type=content_type)
        # response['Content-Disposition'] = f'attachment; filename="{report_filename}"'

    except IOError:
        # handle file not exist case here
        response = HttpResponseNotFound('<h1>File not exist</h1>')

    return response



    response = HttpResponse(pdf, content_type='application/pdf')

    with open(data_pointer, 'r', encoding="ISO-8859-1") as file_download:
        return HttpResponse(
            file_download,
            content_type=content_type)
"""
filename = "sample_pdf.pdf"

    response = HttpResponse(pdf, content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="' + filename + '"'
    return response
"""

@csrf_exempt
def view_retrieve_fitted_vs_actuals_data(request):

    req_body_info = get_request_body_as_json(request)
    if not req_body_info.success:
        return JsonResponse(get_json_error(req_body_info.err_msg))

    req_info = req_body_info.result_obj
    if not KEY_DATA_POINTER in req_info:
        user_msg = ('No key found: "%s"' % KEY_DATA_POINTER)
        return JsonResponse(get_json_error(user_msg))

    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    return JsonResponse(util_results_real_clustered(
        req_info[KEY_DATA_POINTER],
        metadata=req_info['metadata']))


@csrf_exempt
def view_retrieve_d3m_confusion_data(request):
    """Expects a JSON request containing "data_pointer"
    For example: { "data_pointer": "file:///output/predictions/0001.csv"}
    """
    req_body_info = get_request_body_as_json(request)
    if not req_body_info.success:
        return JsonResponse(get_json_error(req_body_info.err_msg))

    req_info = req_body_info.result_obj
    if not KEY_DATA_POINTER in req_info:
        user_msg = ('No key found: "%s"' % KEY_DATA_POINTER)
        return JsonResponse(get_json_error(user_msg))

    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    return JsonResponse(util_results_confusion_matrix(
        req_info[KEY_DATA_POINTER],
        metadata=req_info['metadata']))


@csrf_exempt
def view_retrieve_d3m_efd_data(request):
    """Expects a JSON request containing "data_pointer"
    For example: { "data_pointer": "file:///output/predictions/0001.csv"}
    """
    req_body_info = get_request_body_as_json(request)
    if not req_body_info.success:
        return JsonResponse(get_json_error(req_body_info.err_msg))

    req_info = req_body_info.result_obj
    if KEY_DATA_POINTER not in req_info:
        user_msg = ('No key found: "%s"' % KEY_DATA_POINTER)
        return JsonResponse(get_json_error(user_msg))

    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    return JsonResponse(util_results_importance_efd(
        req_info[KEY_DATA_POINTER],
        metadata=req_info['metadata']))


@csrf_exempt
def view_retrieve_d3m_ice_data(request):
    req_body_info = get_request_body_as_json(request)
    if not req_body_info.success:
        return JsonResponse(get_json_error(req_body_info.err_msg))

    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    req_info = req_body_info.result_obj
    return JsonResponse({
        KEY_SUCCESS: True,
        KEY_DATA: util_results_importance_ice(
            req_info['data_pointer_predictors'],
            req_info['data_pointer_fitted'],
            req_info['variable'])})


@csrf_exempt
def get_train_test_split(request):
    """Expects a JSON request containing "datasetDoc_path"
    For example: { "datasetDoc_path": "/datasetDoc.json"}
    """
    # request body
    req_body_info = get_request_body_as_json(request)
    if not req_body_info.success:
        return JsonResponse(get_json_error(req_body_info.err_msg))
    req_info = req_body_info.result_obj

    # workspace
    user_workspace_info = get_latest_user_workspace(request)
    if not user_workspace_info.success:
        return JsonResponse(get_json_error(user_workspace_info.err_msg))
    user_workspace = user_workspace_info.result_obj

    # user
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    try:
        response = {
            "success": True,
            "data": split_dataset(req_info, user_workspace),
            "message": "data partitioning successful"
        }

    except Exception:
        print("caught traceback when splitting data:", flush=True)
        print(traceback.format_exc(), flush=True)
        response = {
            "success": False,
            "message": "Internal error while splitting dataset."
        }

    return JsonResponse(response)


@csrf_exempt
def get_ice_partials_datasets(request):
    # request body
    req_body_info = get_request_body_as_json(request)
    if not req_body_info.success:
        return JsonResponse(get_json_error(req_body_info.err_msg))
    req_info = req_body_info.result_obj

    # workspace
    user_workspace_info = get_latest_user_workspace(request)
    if not user_workspace_info.success:
        return JsonResponse(get_json_error(user_workspace_info.err_msg))
    user_workspace = user_workspace_info.result_obj

    # user
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    try:
        response = {
            "success": True,
            "data": create_ice_datasets(req_info, user_workspace),
            "message": "create ICE datasets successful"
        }

    except Exception:
        print("caught traceback when creating ICE datasets:", flush=True)
        print(traceback.format_exc(), flush=True)
        response = {
            "success": False,
            "message": "Internal error while creating ICE datasets."
        }

    return JsonResponse(response)
