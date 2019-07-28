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

from os import path

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
    if not KEY_DATA_POINTER in req_info:
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

def view_show_pipeline_steps(request):
    """If any are available, lists the pipeline steps in StoredResponse objects"""
    putil = PipelineInfoUtil()

    view_info = dict(pipeline_util=putil)

    return render(request,
                  'ta2_interfaces/view_show_pipeline_steps.html',
                  view_info)
