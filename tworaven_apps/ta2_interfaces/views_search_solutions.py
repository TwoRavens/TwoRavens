import json
from collections import OrderedDict
from django.http import JsonResponse    #, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from tworaven_apps.utils.view_helper import \
    (get_request_body,
     get_json_error,
     get_json_success)
from tworaven_apps.call_captures.models import ServiceCallEntry
from tworaven_apps.utils.view_helper import \
    (get_session_key, get_authenticated_user)

from tworaven_apps.ta2_interfaces.req_stream_search_solutions import \
 (get_search_solutions_results)


@csrf_exempt
def view_get_search_solutions(request):
    """gRPC: Call from UI with a GetSearchSolutionsResultsRequest"""
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    req_body_info = get_request_body(request)
    if not req_body_info.success:
        return JsonResponse(get_json_error(req_body_info.err_msg))

    # Begin to log D3M call
    #
    call_entry = None
    if ServiceCallEntry.record_d3m_call():
        call_entry = ServiceCallEntry.get_dm3_entry(\
                        request_obj=request,
                        call_type='GetSearchSolutionsResultsRequest',
                        request_msg=req_body_info.result_obj)

    # Let's call the TA2!
    #
    search_info = get_search_solutions_results(\
                                    req_body_info.result_obj,
                                    user_info.result_obj)

    #print('search_info', search_info)
    if not search_info.success:
        return JsonResponse(get_json_error(search_info.err_msg))

    # Convert JSON str to python dict - err catch here
    #  - let it blow up for now--should always return JSON
    json_dict = search_info.result_obj
    #json.loads(search_info.result_obj, object_pairs_hook=OrderedDict)

    # Save D3M log
    #
    if call_entry:
        call_entry.save_d3m_response(json_dict)

    json_info = get_json_success('success!', data=json_dict)
    return JsonResponse(json_info, safe=False)


@csrf_exempt
def xview_get_search_solutions(request):
    """gRPC: Call from UI with a GetSearchSolutionsResultsRequest"""
    req_body_info = get_request_body(request)
    if not req_body_info.success:
        return JsonResponse(get_json_error(req_body_info.err_msg))

    # Begin to log D3M call
    #
    call_entry = None
    if ServiceCallEntry.record_d3m_call():
        call_entry = ServiceCallEntry.get_dm3_entry(\
                        request_obj=request,
                        call_type='GetSearchSolutionsResultsRequest',
                        request_msg=req_body_info.result_obj)

    # Let's call the TA2!
    #
    search_info = get_search_solutions_results(req_body_info.result_obj)
    #print('search_info', search_info)
    if not search_info.success:
        return JsonResponse(get_json_error(search_info.err_msg))

    # Convert JSON str to python dict - err catch here
    #  - let it blow up for now--should always return JSON
    json_dict = json.loads(search_info.result_obj, object_pairs_hook=OrderedDict)

    # Save D3M log
    #
    if call_entry:
        call_entry.save_d3m_response(json_dict)

    json_info = get_json_success('success!', data=json_dict)
    return JsonResponse(json_info, safe=False)
