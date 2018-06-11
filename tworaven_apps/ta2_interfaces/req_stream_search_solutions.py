"""
send a gRPC GetSearchSolutionsResults command
1st pass, get canned response
2nd response, return a callback and this becomes a celery task
"""
import json

from django.conf import settings

from tworaven_apps.utils.basic_response import (ok_resp, err_resp)
from tworaven_apps.utils.random_info import get_alphanumeric_string
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.ta2_util import get_grpc_test_json
from tworaven_apps.ta2_interfaces.util_message_formatter import MessageFormatter
import grpc

import core_pb2
#import core_pb2_grpc

from google.protobuf.json_format import \
    (MessageToJson, Parse, ParseError)

def get_search_solutions_results(raven_json_str=None):
    """
    Send a GetSearchSolutionsResultsRequest to the GetSearchSolutionsResults command
    """
    if raven_json_str is None:
        err_msg = 'No data found for the GetSearchSolutionsResultsRequest'
        return err_resp(err_msg)

    # --------------------------------
    # The UI has sent JSON in string format that contains the PipelineReference
    # Make sure it's valid JSON
    # --------------------------------
    try:
        json.loads(raven_json_str)
    except json.decoder.JSONDecodeError as err_obj:
        err_msg = 'Failed to convert UI Str to JSON: %s' % (err_obj)
        return err_resp(err_msg)

    # --------------------------------
    # convert the JSON string to a gRPC request
    # --------------------------------
    try:
        req = Parse(raven_json_str, core_pb2.GetSearchSolutionsResultsRequest())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        return err_resp(err_msg)

    # In test mode, return canned response
    #
    if settings.TA2_STATIC_TEST_MODE:
        resp_str = get_grpc_test_json(\
                        'test_responses/GetSearchSolutionsResultsResponse_ok.json',
                        dict())
        return ok_resp(resp_str)


    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        return err_resp(err_msg)

    # --------------------------------
    # Send the gRPC request
    # --------------------------------
    messages = []
    try:
        for reply in core_stub.GetSearchSolutionsResults(\
                req, timeout=settings.TA2_GPRC_LONG_TIMEOUT):
            user_msg = MessageToJson(reply, including_default_value_fields=True)
            messages.append(user_msg)
            print('msg received #%d' % len(messages))
    except grpc.RpcError as err_obj:
        # we're purposely breaking here as new grpc svc being built
        if str(err_obj).find('StatusCode.DEADLINE_EXCEEDED') > -1:
            pass
        else:
            return err_resp(str(err_obj))
    except Exception as err_obj:
        return err_resp(str(err_obj))

    success, return_str = MessageFormatter.format_messages(messages)

    if success is False:
        return err_resp(return_str)

    return ok_resp(return_str)
