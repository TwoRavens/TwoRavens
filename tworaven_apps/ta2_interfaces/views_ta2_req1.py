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

    # Let's call the TA2 and start the session!
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

    return JsonResponse(get_json_success(json_dict), safe=False)
