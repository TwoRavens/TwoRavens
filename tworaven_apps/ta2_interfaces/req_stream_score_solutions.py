"""
send a gRPC GetScoreSolutionResultsRequest command
capture the streaming results in the db as StoredResponse objects
"""
import json

from django.conf import settings

from tworaven_apps.utils.basic_response import (ok_resp, err_resp)
from tworaven_apps.utils.random_info import get_alphanumeric_string
from tworaven_apps.utils.json_helper import json_loads
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.ta2_util import get_grpc_test_json
from tworaven_apps.ta2_interfaces.util_message_formatter import MessageFormatter
from tworaven_apps.utils.proto_util import message_to_json

from tworaven_apps.ta2_interfaces.models import \
    (StoredRequest, StoredResponse)
from tworavensproject.celery import celery_app

import grpc

import core_pb2
#import core_pb2_grpc

from google.protobuf.json_format import \
    (Parse, ParseError)

def get_score_solutions_results(raven_json_str, user_obj):
    """
    Send a GetScoreSolutionResultsRequest to the GetScoreSolutionResults command
    """
    if user_obj is None:
        return err_resp("The user_obj cannot be None")
    if not raven_json_str:
        err_msg = 'No data found for the GetScoreSolutionResultsRequest'
        return err_resp(err_msg)

    # --------------------------------
    # Make sure it's valid JSON
    # --------------------------------
    raven_json_info = json_loads(raven_json_str)
    if not raven_json_info.success:
        return err_resp(raven_json_info.err_msg)

    # --------------------------------
    # convert the JSON string to a gRPC request
    #   Done for error checking; call repeated in celery task
    # --------------------------------
    try:
        req = Parse(raven_json_str, core_pb2.GetScoreSolutionResultsRequest())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        return err_resp(err_msg)

    # --------------------------------
    # Save the request to the db
    # --------------------------------
    stored_request = StoredRequest(\
                    user=user_obj,
                    workspace='(not specified)',
                    request_type='GetScoreSolutionResults',
                    is_finished=False,
                    request=raven_json_info.result_obj)
    stored_request.save()

    # In test mode, return canned response
    #
    if settings.TA2_STATIC_TEST_MODE:
        resp_str = get_grpc_test_json(\
                        'test_responses/GetScoreSolutionResultsResponse_ok.json',
                        dict())

        resp_info = json_loads(resp_str)
        if not resp_info.success:
            return err_resp(resp_info.err_msg)

        # Save the stored response
        #
        StoredResponse.add_response(\
                        stored_request.id,
                        response=resp_info.result_obj)

        StoredRequest.set_finished_ok_status(stored_request.id)
        # Return the stored **request** (not response)
        #
        return ok_resp(stored_request.as_dict())

    stream_score_solutions_results.delay(raven_json_str, stored_request.id)

    return ok_resp(stored_request.as_dict())


@celery_app.task
def stream_score_solutions_results(raven_json_str, stored_request_id):
    """Make the grpc call which has a streaming response"""

    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        StoredRequest.set_error_status(stored_request_id, err_msg)
        return


    # --------------------------------
    # convert the JSON string to a gRPC request
    #  Yes: done for the 2nd time
    # --------------------------------
    try:
        req = Parse(raven_json_str,
                    core_pb2.GetScoreSolutionResultsRequest())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        StoredRequest.set_error_status(stored_request_id, err_msg)
        return

    # --------------------------------
    # Send the gRPC request
    # --------------------------------
    msg_cnt = 0
    try:
        for reply in core_stub.GetScoreSolutionResults(\
                req, timeout=settings.TA2_GPRC_LONG_TIMEOUT):


            # Save the stored response
            #
            msg_json_str = message_to_json(reply)

            msg_json_info = json_loads(msg_json_str)
            if not msg_json_info.success:
                print('PROBLEM HERE TO LOG!')

            else:
                StoredResponse.add_response(\
                                stored_request_id,
                                response=msg_json_info.result_obj)
            msg_cnt += 1

            print('msg received #%d' % msg_cnt)

    except grpc.RpcError as err_obj:
        StoredRequest.set_error_status(\
                        stored_request_id,
                        str(err_obj))
        return

    except Exception as err_obj:
        StoredRequest.set_error_status(\
                        stored_request_id,
                        str(err_obj))
        return


    StoredRequest.set_finished_ok_status(stored_request_id)
