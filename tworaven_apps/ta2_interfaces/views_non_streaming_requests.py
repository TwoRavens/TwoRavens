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

from tworaven_apps.raven_auth.models import User
from tworaven_apps.ta2_interfaces.models import StoredRequest, StoredResponse

from tworaven_apps.ta2_interfaces.req_hello import ta2_hello
from tworaven_apps.ta2_interfaces.req_search_solutions import \
        (search_solutions, end_search_solutions,
         stop_search_solutions, describe_solution,
         score_solution, fit_solution,
         produce_solution,
         solution_export, solution_export_with_saved_response,
         solution_export3,
         update_problem, list_primitives)

from tworaven_apps.utils.json_helper import json_loads
from tworaven_apps.utils.view_helper import \
    (get_request_body,
     get_request_body_as_json,
     get_authenticated_user,
     get_json_error,
     get_json_success)
from tworaven_apps.call_captures.models import ServiceCallEntry
from tworaven_apps.utils.view_helper import SESSION_KEY, get_session_key

from tworaven_apps.ta2_interfaces.ta2_search_solutions_helper import \
        SearchSolutionsHelper

from tworaven_apps.ta2_interfaces import static_vals as ta2_static
from tworaven_apps.behavioral_logs.log_entry_maker import LogEntryMaker
from tworaven_apps.behavioral_logs import static_vals as bl_static


@csrf_exempt
def view_hello_heartbeat(request):
    """Hello to TA2 with no logging.  Used for testing"""
    # Let's call the TA2!
    #
    resp_info = ta2_hello()
    if not resp_info.success:
        return JsonResponse(get_json_error(resp_info.err_msg))

    json_str = resp_info.result_obj

    # Convert JSON str to python dict - err catch here
    #  - let it blow up for now--should always return JSON
    json_format_info = json_loads(json_str)
    if not json_format_info.success:
        return JsonResponse(get_json_error(json_format_info.err_msg))

    json_info = get_json_success('success!',
                                 data=json_format_info.result_obj)

    return JsonResponse(json_info)


@csrf_exempt
def view_hello(request):
    """gRPC: Call from UI as a hearbeat"""
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))


    # --------------------------------
    # Behavioral logging
    # --------------------------------
    log_data = dict(session_key=get_session_key(request),
                    feature_id=ta2_static.HELLO,
                    activity_l1=bl_static.L1_SYSTEM_ACTIVITY,
                    activity_l2=bl_static.L2_LAUNCH_TA3)

    LogEntryMaker.create_ta2ta3_entry(user_info.result_obj, log_data)


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
    json_format_info = json_loads(json_str)
    if not json_format_info.success:
        return JsonResponse(get_json_error(json_format_info.err_msg))


    # Save D3M log
    #
    if call_entry:
        call_entry.save_d3m_response(json_format_info.result_obj)

    json_info = get_json_success('success!',
                                 data=json_format_info.result_obj)

    return JsonResponse(json_info, safe=False)


@csrf_exempt
def view_search_describe_fit_score_solutions(request):
    """gRPC: Call from UI with params to
    Search, Describe, Fit, and Score solutions"""

    # ------------------------------------
    # Retrieve the User
    # ------------------------------------
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    user_obj = user_info.result_obj
    websocket_id = user_obj.username  # websocket pushes currently based on username
    user_id = user_obj.id

    # ------------------------------------
    # Parse the JSON request
    # ------------------------------------
    req_json_info = get_request_body_as_json(request)
    if not req_json_info.success:
        return JsonResponse(get_json_error(req_json_info.err_msg))

    extra_params = {SESSION_KEY: get_session_key(request)}

    search_info = SearchSolutionsHelper.make_search_solutions_call(\
                            req_json_info.result_obj,
                            websocket_id,
                            user_id,
                            **extra_params)

    if not search_info.success:
        return JsonResponse(get_json_error(search_info.err_msg))

    json_info = get_json_success('success!', data=search_info.result_obj)
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
                        call_type=ta2_static.SEARCH_SOLUTIONS,
                        request_msg=req_body_info.result_obj)

    # Let's call the TA2!
    #
    search_info = search_solutions(req_body_info.result_obj)
    #print('search_info', search_info)
    if not search_info.success:
        return JsonResponse(get_json_error(search_info.err_msg))

    # Convert JSON str to python dict - err catch here
    #  - let it blow up for now--should always return JSON
    #json_dict = json.loads(search_info.result_obj, object_pairs_hook=OrderedDict)
    json_format_info = json_loads(search_info.result_obj)
    if not json_format_info.success:
        return JsonResponse(get_json_error(json_format_info.err_msg))


    # Save D3M log
    #
    if call_entry:
        call_entry.save_d3m_response(json_format_info.result_obj)

    json_info = get_json_success('success!', data=json_format_info.result_obj)
    return JsonResponse(json_info, safe=False)

@csrf_exempt
def view_end_search_solutions(request):
    """gRPC: Call from UI with a EndSearchSolutionsRequest"""
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    req_body_info = get_request_body(request)
    if not req_body_info.success:
        return JsonResponse(get_json_error(req_body_info.err_msg))

    # Begin to log D3M call
    #
    stored_request = StoredRequest(\
                    user=user_info.result_obj,
                    request_type=ta2_static.END_SEARCH_SOLUTIONS,
                    # pipeline_id=self.pipeline_id,
                    # search_id=req_body_info.result_obj.get(ta2_static.KEY_SEARCH_ID),
                    is_finished=False,
                    request=req_body_info.result_obj)

    stored_request.save()

    # --------------------------------
    # Behavioral logging
    # --------------------------------
    log_data = dict(session_key=get_session_key(request),
                    feature_id=ta2_static.END_SEARCH_SOLUTIONS,
                    activity_l1=bl_static.L1_SYSTEM_ACTIVITY,
                    activity_l2=bl_static.L2_ACTIVITY_BLANK)

    LogEntryMaker.create_ta2ta3_entry(user_info.result_obj, log_data)


    # Let's call the TA2 and end the session!
    #
    search_info = end_search_solutions(req_body_info.result_obj)
    if not search_info.success:
        StoredResponse.add_err_response(stored_request,
                                        search_info.err_msg)

        return JsonResponse(get_json_error(search_info.err_msg))

    # Convert JSON str to python dict - err catch here
    #
    json_format_info = json_loads(search_info.result_obj)
    if not json_format_info.success:
        StoredResponse.add_err_response(stored_request,
                                        json_format_info.err_msg)
        return JsonResponse(get_json_error(json_format_info.err_msg))


    StoredResponse.add_success_response(stored_request,
                                        json_format_info.result_obj)

    json_info = get_json_success('success!', data=json_format_info.result_obj)
    return JsonResponse(json_info, safe=False)


@csrf_exempt
def view_stop_search_solutions(request):
    """gRPC: Call from UI with a StopSearchSolutions"""
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
                        call_type=ta2_static.STOP_SEARCH_SOLUTIONS,
                        request_msg=req_body_info.result_obj)

    # --------------------------------
    # Behavioral logging
    # --------------------------------
    log_data = dict(session_key=get_session_key(request),
                    feature_id=ta2_static.STOP_SEARCH_SOLUTIONS,
                    activity_l1=bl_static.L1_SYSTEM_ACTIVITY,
                    activity_l2=bl_static.L2_ACTIVITY_BLANK)

    LogEntryMaker.create_ta2ta3_entry(user_info.result_obj, log_data)

    # Let's call the TA2!
    #
    search_info = stop_search_solutions(req_body_info.result_obj)
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
                        call_type='DescribeSolution',
                        request_msg=req_body_info.result_obj)

    # Let's call the TA2!
    #
    search_info = describe_solution(req_body_info.result_obj)
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


@csrf_exempt
def view_score_solution(request):
    """gRPC: Call from UI with a ScoreSolutionRequest"""
    req_body_info = get_request_body(request)
    if not req_body_info.success:
        return JsonResponse(get_json_error(req_body_info.err_msg))

    # Begin to log D3M call
    #
    call_entry = None
    if ServiceCallEntry.record_d3m_call():
        call_entry = ServiceCallEntry.get_dm3_entry(\
                        request_obj=request,
                        call_type='ScoreSolution',
                        request_msg=req_body_info.result_obj)

    # Let's call the TA2!
    #
    search_info = score_solution(req_body_info.result_obj)
    #print('search_info', search_info)
    if not search_info.success:
        return JsonResponse(get_json_error(search_info.err_msg))

    # Convert JSON str to python dict - err catch here
    #
    json_format_info = json_loads(search_info.result_obj)
    if not json_format_info.success:
        return JsonResponse(get_json_error(json_format_info.err_msg))

    # Save D3M log
    #
    if call_entry:
        call_entry.save_d3m_response(json_format_info.result_obj)

    json_info = get_json_success('success!',
                                 data=json_format_info.result_obj)
    return JsonResponse(json_info, safe=False)


@csrf_exempt
def view_fit_solution(request):
    """gRPC: Call from UI with a FitSolutionRequest"""
    req_body_info = get_request_body(request)
    if not req_body_info.success:
        return JsonResponse(get_json_error(req_body_info.err_msg))

    # Begin to log D3M call
    #
    call_entry = None
    if ServiceCallEntry.record_d3m_call():
        call_entry = ServiceCallEntry.get_dm3_entry(\
                        request_obj=request,
                        call_type='FitSolution',
                        request_msg=req_body_info.result_obj)

    # Let's call the TA2!
    #
    search_info = fit_solution(req_body_info.result_obj)
    #print('search_info', search_info)
    if not search_info.success:
        return JsonResponse(get_json_error(search_info.err_msg))

    # Convert JSON str to python dict - err catch here
    #
    json_format_info = json_loads(search_info.result_obj)
    if not json_format_info.success:
        return JsonResponse(get_json_error(json_format_info.err_msg))

    # Save D3M log
    #
    if call_entry:
        call_entry.save_d3m_response(json_format_info.result_obj)

    json_info = get_json_success('success!', data=json_format_info.result_obj)

    return JsonResponse(json_info, safe=False)


@csrf_exempt
def view_produce_solution(request):
    """gRPC: Call from UI with a ProduceSolutionRequest"""
    req_body_info = get_request_body(request)
    if not req_body_info.success:
        return JsonResponse(get_json_error(req_body_info.err_msg))

    # Begin to log D3M call
    #
    call_entry = None
    if ServiceCallEntry.record_d3m_call():
        call_entry = ServiceCallEntry.get_dm3_entry(\
                        request_obj=request,
                        call_type='ProduceSolution',
                        request_msg=req_body_info.result_obj)

    # Let's call the TA2!
    #
    search_info = produce_solution(req_body_info.result_obj)
    #print('search_info', search_info)
    if not search_info.success:
        return JsonResponse(get_json_error(search_info.err_msg))

    # Convert JSON str to python dict - err catch here
    #
    json_format_info = json_loads(search_info.result_obj)
    if not json_format_info.success:
        return JsonResponse(get_json_error(json_format_info.err_msg))

    # Save D3M log
    #
    if call_entry:
        call_entry.save_d3m_response(json_format_info.result_obj)

    json_info = get_json_success('success!', data=json_format_info.result_obj)

    return JsonResponse(json_info, safe=False)



@csrf_exempt
def view_solution_export3(request):
    """gRPC: Call from UI with a SolutionExportRequest"""
    # Retrieve the User
    #
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    user = user_info.result_obj

    req_body_info = get_request_body_as_json(request)
    if not req_body_info.success:
        return JsonResponse(get_json_error(req_body_info.err_msg))

    session_key = get_session_key(request)

    # Let's call the TA2!
    #
    search_info = solution_export3(user,
                                   req_body_info.result_obj,
                                   session_key=session_key)

    # print('search_info', search_info)
    if not search_info.success:
        return JsonResponse(get_json_error(search_info.err_msg))

    # Convert JSON str to python dict - err catch here
    #
    json_format_info = json_loads(search_info.result_obj)
    if not json_format_info.success:
        return JsonResponse(get_json_error(json_format_info.err_msg))


    json_info = get_json_success('success!', data=json_format_info.result_obj)

    return JsonResponse(json_info, safe=False)



@csrf_exempt
def view_update_problem(request):
    """gRPC: Call from UI with a UpdateProblemRequest"""
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
                        call_type=ta2_static.UPDATE_PROBLEM,
                        request_msg=req_body_info.result_obj)

    # --------------------------------
    # Behavioral logging
    # --------------------------------
    log_data = dict(session_key=get_session_key(request),
                    feature_id=ta2_static.UPDATE_PROBLEM,
                    activity_l1=bl_static.L1_PROBLEM_DEFINITION,
                    activity_l2=bl_static.L2_PROBLEM_SPECIFICATION)

    LogEntryMaker.create_ta2ta3_entry(user_info.result_obj, log_data)


    # Let's call the TA2!
    #
    search_info = update_problem(req_body_info.result_obj)
    #print('search_info', search_info)
    if not search_info.success:
        return JsonResponse(get_json_error(search_info.err_msg))

    # Convert JSON str to python dict - err catch here
    #
    json_format_info = json_loads(search_info.result_obj)
    if not json_format_info.success:
        return JsonResponse(get_json_error(json_format_info.err_msg))

    # Save D3M log
    #
    if call_entry:
        call_entry.save_d3m_response(json_format_info.result_obj)

    json_info = get_json_success('success!', data=json_format_info.result_obj)

    return JsonResponse(json_info, safe=False)



@csrf_exempt
def view_list_primitives(request):
    """gRPC: Call from UI with a ListPrimitivesRequest"""
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))


    # --------------------------------
    # (2) Begin to log D3M call
    # --------------------------------
    call_entry = None
    if ServiceCallEntry.record_d3m_call():
        call_entry = ServiceCallEntry.get_dm3_entry(\
                        request_obj=request,
                        call_type='ListPrimitives',
                        request_msg='no params for this call')


    # --------------------------------
    # (2a) Behavioral logging
    # --------------------------------
    log_data = dict(session_key=get_session_key(request),
                    feature_id=ta2_static.LIST_PRIMITIVES,
                    activity_l1=bl_static.L1_SYSTEM_ACTIVITY,
                    activity_l2=bl_static.L2_ACTIVITY_BLANK)

    LogEntryMaker.create_ta2ta3_entry(user_info.result_obj, log_data)


    # Let's call the TA2!
    #
    search_info = list_primitives()
    #print('search_info', search_info)
    if not search_info.success:
        return JsonResponse(get_json_error(search_info.err_msg))

    # Convert JSON str to python dict - err catch here
    #
    json_format_info = json_loads(search_info.result_obj)
    if not json_format_info.success:
        return JsonResponse(get_json_error(json_format_info.err_msg))

    # Save D3M log
    #
    if call_entry:
        call_entry.save_d3m_response(json_format_info.result_obj)

    json_info = get_json_success('success!', data=json_format_info.result_obj)

    return JsonResponse(json_info, safe=False)
