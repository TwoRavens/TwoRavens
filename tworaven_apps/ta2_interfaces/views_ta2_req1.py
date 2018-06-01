"""
Functions for when the UI sends JSON requests to route to TA2s as gRPC calls
    - Right now this code is quite redundant. Wait for integration to factor it out,
     e.g. lots may change--including the "req_" files being part of a separate service
"""
import json
from collections import OrderedDict
from django.shortcuts import render
from django.http import JsonResponse    #, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from tworaven_apps.ta2_interfaces.req_hello import ta2_hello
from tworaven_apps.ta2_interfaces.req_search_solutions import \
        (search_solutions, end_search_solutions,
         stop_search_solutions, describe_solution)
from tworaven_apps.utils.view_helper import \
    (get_request_body,
     get_json_error,
     get_json_success)
from tworaven_apps.call_captures.models import ServiceCallEntry
from tworaven_apps.utils.view_helper import get_session_key



@csrf_exempt
def view_hello(request):
    """gRPC: Call from UI as a hearbeat"""
    session_key = get_session_key(request)

    # note: this is just a heartbeat, so no params are sent
    #

    # Begin to log D3M call
    #
    call_entry = None
    if ServiceCallEntry.record_d3m_call():
        call_entry = ServiceCallEntry.get_dm3_entry(\
                        request_obj=request,
                        call_type='Hello',
                        request_msg=('no params for this call'))

    # Let's call the TA2!
    #
    resp_info = ta2_hello()
    if not resp_info.success:
        return JsonResponse(get_json_error(resp_info.err_msg))

    json_str = resp_info.result_obj

    # Convert JSON str to python dict - err catch here
    #  - let it blow up for now--should always return JSON
    json_dict = json.loads(json_str, object_pairs_hook=OrderedDict)

    # Save D3M log
    #
    if call_entry:
        call_entry.save_d3m_response(json_dict)

    json_info = get_json_success('success!', data=json_dict)
    return JsonResponse(json_info, safe=False)

@csrf_exempt
def view_search_solutions(request):
    """gRPC: Call from UI with a SearchSolutionsRequest"""
    req_body_info = get_request_body(request)
    if not req_body_info.success:
        return JsonResponse(get_json_error(req_body_info.err_msg))

    # Begin to log D3M call
    #
    call_entry = None
    if ServiceCallEntry.record_d3m_call():
        call_entry = ServiceCallEntry.get_dm3_entry(\
                        request_obj=request,
                        call_type='SearchSolutionsRequest',
                        request_msg=req_body_info.result_obj)

    # Let's call the TA2!
    #
    search_info = search_solutions(req_body_info.result_obj)
    print('search_info', search_info)
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

@csrf_exempt
def view_end_search_solutions(request):
    """gRPC: Call from UI with a EndSearchSolutionsRequest"""
    req_body_info = get_request_body(request)
    if not req_body_info.success:
        return JsonResponse(get_json_error(req_body_info.err_msg))

    # Begin to log D3M call
    #
    call_entry = None
    if ServiceCallEntry.record_d3m_call():
        call_entry = ServiceCallEntry.get_dm3_entry(\
                        request_obj=request,
                        call_type='EndSearchSolutionsRequest',
                        request_msg=req_body_info.result_obj)

    # Let's call the TA2 and start the session!
    #
    search_info = end_search_solutions(req_body_info.result_obj)
    print('search_info', search_info)
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


@csrf_exempt
def view_stop_search_solutions(request):
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
    search_info = stop_search_solutions(req_body_info.result_obj)
    print('search_info', search_info)
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



@csrf_exempt
def view_describe_solution(request):
    """gRPC: Call from UI with a DescribeSolutionRequest"""
    req_body_info = get_request_body(request)
    if not req_body_info.success:
        return JsonResponse(get_json_error(req_body_info.err_msg))

    # Begin to log D3M call
    #
    call_entry = None
    if ServiceCallEntry.record_d3m_call():
        call_entry = ServiceCallEntry.get_dm3_entry(\
                        request_obj=request,
                        call_type='DescribeSolutionRequest',
                        request_msg=req_body_info.result_obj)

    # Let's call the TA2!
    #
    search_info = describe_solution(req_body_info.result_obj)
    print('search_info', search_info)
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