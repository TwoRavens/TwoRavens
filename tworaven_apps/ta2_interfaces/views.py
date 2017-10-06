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
from tworaven_apps.ta2_interfaces.req_update_problem_schema import \
    update_problem_schema
from tworaven_apps.ta2_interfaces.req_pipeline_create import \
    pipeline_create
from tworaven_apps.ta2_interfaces.req_get_execute_pipeline import \
    get_execute_pipeline_results
from tworaven_apps.ta2_interfaces.req_list_pipelines import \
    list_pipelines
from tworaven_apps.ta2_interfaces.req_export_pipeline import \
    export_pipeline
from tworaven_apps.ta2_interfaces.ta2_util import get_grpc_content
from tworaven_apps.call_captures.models import ServiceCallEntry

from tworaven_apps.ta2_interfaces.models import KEY_GRPC_JSON


def view_grpc_test_links(request):
    """Show an existing list of gRPC related urls"""
    return render(request,
                  'grpc_list.html')

@csrf_exempt
def view_startsession(request):
    """gRPC: Call from UI to start session

    user_agent = can come from UI.
    Version id will originate on the server
    """
    django_session_key = request.session._get_or_create_session_key()

    success, raven_data_or_err = get_grpc_content(request)
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
    django_session_key = request.session._get_or_create_session_key()

    success, raven_data_or_err = get_grpc_content(request)
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
def view_update_problem_schema(request):
    """gRPC: Call from UI to update the problem schema"""
    django_session_key = request.session._get_or_create_session_key()

    success, raven_data_or_err = get_grpc_content(request)
    if not success:
        return JsonResponse(dict(status=False,
                                 message=raven_data_or_err))

    # Begin to log D3M call
    #
    call_entry = None
    if ServiceCallEntry.record_d3m_call():
        call_entry = ServiceCallEntry.get_dm3_entry(\
                        request_obj=request,
                        call_type='update_problem_schema',
                        request_msg=raven_data_or_err)

    # Let's call the TA2!
    #
    json_str = update_problem_schema(raven_data_or_err)

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
    """gRPC: Call from UI to update the problem schema"""
    django_session_key = request.session._get_or_create_session_key()

    success, raven_data_or_err = get_grpc_content(request)
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

    print('json_str', json_str)
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
    django_session_key = request.session._get_or_create_session_key()

    success, raven_data_or_err = get_grpc_content(request)
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
    django_session_key = request.session._get_or_create_session_key()


    success, raven_data_or_err = get_grpc_content(request)
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
    django_session_key = request.session._get_or_create_session_key()


    success, raven_data_or_err = get_grpc_content(request)
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
    json_str = export_pipeline(raven_data_or_err)

    print('json_str', json_str)
    # Convert JSON str to python dict - err catch here
    #
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
