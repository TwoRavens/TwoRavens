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
from tworaven_apps.ta2_interfaces.req_start_session import start_session
from tworaven_apps.ta2_interfaces.req_end_session import end_session
from tworaven_apps.ta2_interfaces.req_set_problem_doc import \
    set_problem_doc
from tworaven_apps.ta2_interfaces.req_create_pipeline import \
    pipeline_create
from tworaven_apps.ta2_interfaces.req_create_pipeline_get_results import \
    get_create_pipeline_results
from tworaven_apps.ta2_interfaces.req_execute_pipeline_get_results import \
    get_execute_pipeline_results
from tworaven_apps.ta2_interfaces.req_list_pipelines import \
    list_pipelines
from tworaven_apps.ta2_interfaces.req_export_pipeline import \
    export_pipeline
from tworaven_apps.ta2_interfaces.req_describe_dataflow import \
    describe_data_flow
from tworaven_apps.ta2_interfaces.req_get_dataflow_results import \
    get_data_flow_results
from tworaven_apps.ta2_interfaces.req_cancel_pipelines import \
    cancel_pipelines
from tworaven_apps.ta2_interfaces.req_delete_pipelines import \
    delete_pipelines
from tworaven_apps.utils.view_helper import get_request_body
from tworaven_apps.call_captures.models import ServiceCallEntry
from tworaven_apps.utils.view_helper import get_session_key


@csrf_exempt
def view_startsession(request):
    """gRPC: Call from UI to start session

    user_agent = can come from UI.
    Version id will originate on the server
    """
    session_key = get_session_key(request)

    success, raven_data_or_err = get_request_body(request)
    if not success:
        return JsonResponse(dict(status=False,
                                 message=raven_data_or_err))

    # Begin to log D3M call
    #
    call_entry = None
    if ServiceCallEntry.record_d3m_call():
        call_entry = ServiceCallEntry.get_dm3_entry(\
                        request_obj=request,
                        call_type='start_session',
                        request_msg=raven_data_or_err)

    # Let's call the TA2 and start the session!
    #
    json_str = start_session(raven_data_or_err)

    # Convert JSON str to python dict - err catch here
    #  - let it blow up for now--should always return JSON
    json_dict = json.loads(json_str, object_pairs_hook=OrderedDict)

    # Save D3M log
    #
    if call_entry:
        call_entry.save_d3m_response(json_dict)

    return JsonResponse(json_dict, safe=False)


@csrf_exempt
def view_endsession(request):
    """gRPC: Call from UI to END session

    session_id = from UI; originally from startsession commmand

    example string: '{"session_id":"1x3551"}'
    """
    session_key = get_session_key(request)

    success, raven_data_or_err = get_request_body(request)
    if not success:
        return JsonResponse(dict(status=False,
                                 message=raven_data_or_err))

    # Begin to log D3M call
    #
    call_entry = None
    if ServiceCallEntry.record_d3m_call():
        call_entry = ServiceCallEntry.get_dm3_entry(\
                        request_obj=request,
                        call_type='end_session',
                        request_msg=raven_data_or_err)

    # Let's call the TA2 and start the session!
    #
    json_str = end_session(raven_data_or_err)

    # Convert JSON str to python dict - err catch here
    #
    json_dict = json.loads(json_str, object_pairs_hook=OrderedDict)

    # Save D3M log
    #
    if call_entry:
        call_entry.save_d3m_response(json_dict)

    return JsonResponse(json_dict, safe=False)



@csrf_exempt
def view_set_problem_doc(request):
    """gRPC: Call from UI to SetProblemDoc"""
    session_key = get_session_key(request)

    success, raven_data_or_err = get_request_body(request)
    if not success:
        return JsonResponse(dict(status=False,
                                 message=raven_data_or_err))

    # Begin to log D3M call
    #
    call_entry = None
    if ServiceCallEntry.record_d3m_call():
        call_entry = ServiceCallEntry.get_dm3_entry(\
                        request_obj=request,
                        call_type='SetProblemDoc',
                        request_msg=raven_data_or_err)

    # Let's call the TA2!
    #
    json_str = set_problem_doc(raven_data_or_err)

    # Convert JSON str to python dict - err catch here
    #
    json_dict = json.loads(json_str, object_pairs_hook=OrderedDict)

    # Save D3M log
    #
    if call_entry:
        call_entry.save_d3m_response(json_dict)

    return JsonResponse(json_dict, safe=False)


@csrf_exempt
def view_create_pipeline(request):
    """gRPC: Call from UI to CreatePipelines"""
    session_key = get_session_key(request)

    success, raven_data_or_err = get_request_body(request)
    if not success:
        return JsonResponse(dict(status=False,
                                 message=raven_data_or_err))

    # Begin to log D3M call
    #
    call_entry = None
    if ServiceCallEntry.record_d3m_call():
        call_entry = ServiceCallEntry.get_dm3_entry(\
                        request_obj=request,
                        call_type='create_pipeline',
                        request_msg=raven_data_or_err)

    # Let's call the TA2!
    #
    json_str = pipeline_create(raven_data_or_err)

    #print('json_str', json_str)
    # Convert JSON str to python dict - err catch here
    #
    json_dict = json.loads(json_str, object_pairs_hook=OrderedDict)

    # Save D3M log
    #
    if call_entry:
        call_entry.save_d3m_response(json_dict)

    return JsonResponse(json_dict, safe=False)


@csrf_exempt
def view_get_create_pipeline_results(request):
    """gRPC: Call from UI to GetCreatePipelineResults"""
    session_key = get_session_key(request)

    success, raven_data_or_err = get_request_body(request)
    if not success:
        return JsonResponse(dict(status=False,
                                 message=raven_data_or_err))

    # Begin to log D3M call
    #
    call_entry = None
    if ServiceCallEntry.record_d3m_call():
        call_entry = ServiceCallEntry.get_dm3_entry(\
                        request_obj=request,
                        call_type='create_pipeline',
                        request_msg=raven_data_or_err)

    # Let's call the TA2!
    #
    json_str = get_create_pipeline_results(raven_data_or_err)

    #print('json_str', json_str)
    # Convert JSON str to python dict - err catch here
    #
    json_dict = json.loads(json_str, object_pairs_hook=OrderedDict)

    # Save D3M log
    #
    if call_entry:
        call_entry.save_d3m_response(json_dict)

    return JsonResponse(json_dict, safe=False)


@csrf_exempt
def view_get_execute_pipeline_results(request):
    """view for GetExecutePipelineResults"""
    session_key = get_session_key(request)

    success, raven_data_or_err = get_request_body(request)
    if not success:
        return JsonResponse(dict(status=False,
                                 message=raven_data_or_err))

    # Begin to log D3M call
    #
    call_entry = None
    if ServiceCallEntry.record_d3m_call():
        call_entry = ServiceCallEntry.get_dm3_entry(\
                        request_obj=request,
                        call_type='get_execute_pipeline_results',
                        request_msg=raven_data_or_err)

    # Let's call the TA2!
    #
    json_str = get_execute_pipeline_results(raven_data_or_err)

    # Convert JSON str to python dict - err catch here
    #
    json_dict = json.loads(json_str, object_pairs_hook=OrderedDict)

    # Save D3M log
    #
    if call_entry:
        call_entry.save_d3m_response(json_dict)

    return JsonResponse(json_dict, safe=False)


@csrf_exempt
def view_list_pipelines(request):
    """gRPC: Call from UI to list pipelines

    session_id = from UI; originally from startsession commmand

    example string: '{
                          "context": {
                            "session_id": "session_01"
                          }
                        }'
    """
    session_key = get_session_key(request)


    success, raven_data_or_err = get_request_body(request)
    if not success:
        return JsonResponse(dict(status=False,
                                 message=raven_data_or_err))

    # Begin to log D3M call
    #
    call_entry = None
    if ServiceCallEntry.record_d3m_call():
        call_entry = ServiceCallEntry.get_dm3_entry(\
                        request_obj=request,
                        call_type='list_pipelines',
                        request_msg=raven_data_or_err)

    # Let's call the TA2 and start the session!
    #
    json_str = list_pipelines(raven_data_or_err)

    # Convert JSON str to python dict - err catch here
    #
    json_dict = json.loads(json_str, object_pairs_hook=OrderedDict)

    # Save D3M log
    #
    if call_entry:
        call_entry.save_d3m_response(json_dict)

    return JsonResponse(json_dict, safe=False)


@csrf_exempt
def view_cancel_pipelines(request):
    """gRPC: Call from UI to delete pipelines

    session_id = from UI; originally from startsession commmand

    example string: '{
                      "context": {
                        "session_id": "session_0"
                      },
                      "cancel_pipeline_ids" : ["pipeline_01",
                                               "pipeline_02"]
                    };'
    """
    session_key = get_session_key(request)


    success, raven_data_or_err = get_request_body(request)
    if not success:
        return JsonResponse(dict(status=False,
                                 message=raven_data_or_err))

    # Begin to log D3M call
    #
    call_entry = None
    if ServiceCallEntry.record_d3m_call():
        call_entry = ServiceCallEntry.get_dm3_entry(\
                        request_obj=request,
                        call_type='CancelPipelines',
                        request_msg=raven_data_or_err)

    # Let's call the TA2 and start the session!
    #
    json_str = cancel_pipelines(raven_data_or_err)

    # Convert JSON str to python dict - err catch here
    #
    json_dict = json.loads(json_str, object_pairs_hook=OrderedDict)

    # Save D3M log
    #
    if call_entry:
        call_entry.save_d3m_response(json_dict)

    return JsonResponse(json_dict, safe=False)


@csrf_exempt
def view_delete_pipelines(request):
    """gRPC: Call from UI to delete pipelines

    session_id = from UI; originally from startsession commmand

    example string: '{
                      "context": {
                        "session_id": "session_0"
                      },
                      "delete_pipeline_ids" : ["pipeline_01",
                                               "pipeline_02"]
                    };'
    """
    session_key = get_session_key(request)


    success, raven_data_or_err = get_request_body(request)
    if not success:
        return JsonResponse(dict(status=False,
                                 message=raven_data_or_err))

    # Begin to log D3M call
    #
    call_entry = None
    if ServiceCallEntry.record_d3m_call():
        call_entry = ServiceCallEntry.get_dm3_entry(\
                        request_obj=request,
                        call_type='DeletePipelines',
                        request_msg=raven_data_or_err)

    # Let's call the TA2 and start the session!
    #
    json_str = delete_pipelines(raven_data_or_err)

    # Convert JSON str to python dict - err catch here
    #
    json_dict = json.loads(json_str, object_pairs_hook=OrderedDict)

    # Save D3M log
    #
    if call_entry:
        call_entry.save_d3m_response(json_dict)

    return JsonResponse(json_dict, safe=False)


@csrf_exempt
def view_export_pipeline(request):
    """gRPC: Call from UI to export pipeline

    session_id = from UI; originally from startsession commmand

    example string: {
                       "context":{
                          "session_id":"session_0"
                       },
                       "pipelineId":"pipe1",
                       "pipelineExecUri":"<<EXECUTABLE_URI>>"
                    }
    """
    session_key = get_session_key(request)


    success, raven_data_or_err = get_request_body(request)
    if not success:
        return JsonResponse(dict(status=False,
                                 message=raven_data_or_err))

    # Begin to log D3M call
    #
    call_entry = None
    if ServiceCallEntry.record_d3m_call():
        call_entry = ServiceCallEntry.get_dm3_entry(\
                        request_obj=request,
                        call_type='export_pipeline',
                        request_msg=raven_data_or_err)

    # Let's call the TA2 and start the session!
    #
    json_str = export_pipeline(raven_data_or_err, call_entry)

    #print('json_str: [%s]' % json_str)
    # Convert JSON str to python dict - err catch here
    #
    json_dict = json.loads(json_str, object_pairs_hook=OrderedDict)

    # Save D3M log
    #
    if call_entry:
        call_entry.save_d3m_response(json_dict)

    return JsonResponse(json_dict, safe=False)


@csrf_exempt
def view_describe_dataflow(request):
    """gRPC: Call from UI to DescribeDataflow"""
    success, raven_data_or_err = get_request_body(request)
    if not success:
        return JsonResponse(dict(status=False,
                                 message=raven_data_or_err))

    # Begin to log D3M call
    #
    call_entry = None
    if ServiceCallEntry.record_d3m_call():
        call_entry = ServiceCallEntry.get_dm3_entry(\
                        request_obj=request,
                        call_type='DescribeDataflow',
                        request_msg=raven_data_or_err)

    # Let's call the TA2 and start the session!
    #
    json_str = describe_data_flow(raven_data_or_err)

    # Convert JSON str to python dict - err catch here
    #  - let it blow up for now--should always return JSON
    json_dict = json.loads(json_str, object_pairs_hook=OrderedDict)

    # Save D3M log
    #
    if call_entry:
        call_entry.save_d3m_response(json_dict)

    return JsonResponse(json_dict, safe=False)


@csrf_exempt
def view_get_dataflow_results(request):
    """gRPC: Call from UI to GetDataflowResults"""
    success, raven_data_or_err = get_request_body(request)
    if not success:
        return JsonResponse(dict(status=False,
                                 message=raven_data_or_err))

    # Begin to log D3M call
    #
    call_entry = None
    if ServiceCallEntry.record_d3m_call():
        call_entry = ServiceCallEntry.get_dm3_entry(\
                        request_obj=request,
                        call_type='DescribeDataflow',
                        request_msg=raven_data_or_err)

    # Let's call the TA2 and start the session!
    #
    json_str = get_data_flow_results(raven_data_or_err)

    # Convert JSON str to python dict - err catch here
    #  - let it blow up for now--should always return JSON
    json_dict = json.loads(json_str, object_pairs_hook=OrderedDict)

    # Save D3M log
    #
    if call_entry:
        call_entry.save_d3m_response(json_dict)

    return JsonResponse(json_dict, safe=False)


@csrf_exempt
def view_test_call(request):
    """gRPC: Capture other calls to D3M"""
    if request.POST:
        post_str = str(request.POST)
    else:
        post_str = '(no post)'

    info = dict(status='ok',
                post_str=post_str,
                message='test message to path: %s' % request.path)


    return JsonResponse(info)
