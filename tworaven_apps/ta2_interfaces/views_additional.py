"""
Functions for when the UI sends JSON requests to route to TA2s as gRPC calls
    - Right now this code is quite redundant. Wait for integration to factor it out,
     e.g. lots may change--including the "req_" files being part of a separate service
"""
from urllib import parse
from django.shortcuts import render
from django.conf import settings
from django.http import JsonResponse, HttpResponse  # , Http404
from django.views.decorators.cache import cache_page
from django.views.decorators.csrf import csrf_exempt

from tworaven_apps.rook_services.views import create_destination_directory
from tworaven_apps.ta2_interfaces.util_results_importance_EFD import ImportanceEFDUtil
from tworaven_apps.ta2_interfaces.util_results_confusion import ConfusionUtil
from tworaven_apps.ta2_interfaces.grpc_util import TA3TA2Util
from tworaven_apps.ta2_interfaces.static_vals import KEY_DATA_POINTER, KEY_INDICES
from tworaven_apps.ta2_interfaces.util_embed_results import FileEmbedUtil
from tworaven_apps.ta2_interfaces.util_pipeline_check import PipelineInfoUtil
from tworaven_apps.utils.view_helper import \
    (get_request_body_as_json,
     get_json_error,
     get_json_success)
from tworaven_apps.utils.view_helper import \
    (get_authenticated_user,)
from tworaven_apps.user_workspaces.utils import get_latest_user_workspace

import shutil
from os import path
import os
import json
from d3m.container.dataset import Dataset

from sklearn.model_selection import train_test_split


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

    data_pointer = parse.unquote(data_pointer)

    if not path.exists(data_pointer):
        user_msg = ('No file found: "%s"' % KEY_DATA_POINTER)
        return JsonResponse(get_json_error(user_msg))

    with open(data_pointer, 'r', encoding="ISO-8859-1") as file_download:
        return HttpResponse(
            file_download,
            content_type=content_type)

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

    statistics_util = ConfusionUtil(req_info[KEY_DATA_POINTER],
                                         metadata=req_info['metadata'],
                                         user=user_info.result_obj)
    if statistics_util.has_error:
        return JsonResponse(get_json_error(statistics_util.error_message))

    return JsonResponse(statistics_util.get_final_results())


@csrf_exempt
def view_retrieve_d3m_EFD_data(request):
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

    statistics_util = ImportanceEFDUtil(req_info[KEY_DATA_POINTER],
                                         metadata=req_info['metadata'],
                                         user=user_info.result_obj)
    if statistics_util.has_error:
        return JsonResponse(get_json_error(statistics_util.error_message))

    return JsonResponse(statistics_util.get_final_results())


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

    dataset_schema = json.load(open(req_info['dataset_schema'], 'r'))
    resource_schema = next(i for i in dataset_schema['dataResources'] if i['resType'] == 'table')

    dataset = Dataset.load(f'file://{req_info["dataset_schema"]}')
    dataframe = dataset[resource_schema['resID']]
    dataframe_train, dataframe_test = train_test_split(dataframe, train_size=req_info.get('train_test_ratio', .7))

    datasetDocs = {}
    for role, dataframe_partition in (('train', dataframe_train), ('test', dataframe_test)):
        dest_dir_info = create_destination_directory(user_workspace, role=role)
        if not dest_dir_info.success:
            return JsonResponse(get_json_error(dest_dir_info.err_msg))

        dest_directory = dest_dir_info.result_obj
        csv_path = os.path.join(dest_directory, resource_schema['resPath'])
        shutil.rmtree(dest_directory)
        shutil.copytree(user_workspace.d3m_config.training_data_root, dest_directory)
        os.remove(csv_path)
        dataframe_partition.to_csv(csv_path)

        datasetDoc_path = path.join(dest_directory, 'datasetDoc.json')
        datasetDocs[role] = datasetDoc_path

    sample_test_indices = dataframe_test['d3mIndex'].astype('int32')\
        .sample(n=req_info.get("sampleCount", min(1000, len(dataframe_test)))).tolist()

    return JsonResponse({
        "success": True, "data": {
            'dataset_schemas': datasetDocs,
            'sample_test_indices': sample_test_indices
        },
        "message": "data partitioning successful"
    })
