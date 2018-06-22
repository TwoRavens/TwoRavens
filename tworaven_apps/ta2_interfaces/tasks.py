"""
send a gRPC command that has streaming results
capture the results in the db as StoredResponse objects
"""
from django.conf import settings

from tworaven_apps.utils.json_helper import json_loads
from tworaven_apps.utils.proto_util import message_to_json
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.models import \
    (StoredRequest, StoredResponse)
from tworavensproject.celery import celery_app

import grpc
import core_pb2

from google.protobuf.json_format import \
    (Parse, ParseError)


@celery_app.task
def stream_and_store_results(raven_json_str, stored_request_id,
                             grpc_req_obj_name, grpc_call_name):
    """Make the grpc call which has a streaming response

    grpc_req_obj_name: "core_pb2.GetSearchSolutionsResultsRequest", etc
    grpc_call_name: "GetSearchSolutionsResults", etc
    """
    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        StoredRequest.set_error_status(stored_request_id, err_msg)
        return

    #
    grpc_req_obj = eval(grpc_req_obj_name)

    grpc_rpc_call_function = eval('core_stub.%s' % grpc_call_name)

    # --------------------------------
    # convert the JSON string to a gRPC request
    #  Yes: done for the 2nd time
    # --------------------------------
    try:
        req = Parse(raven_json_str,
                    grpc_req_obj())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        StoredRequest.set_error_status(stored_request_id, err_msg)
        return

    # --------------------------------
    # Send the gRPC request
    # --------------------------------
    msg_cnt = 0
    try:
        for reply in grpc_rpc_call_function(\
                req, timeout=settings.TA2_GPRC_LONG_TIMEOUT):

            # Save the stored response
            #
            msg_json_str = message_to_json(reply)

            msg_json_info = json_loads(msg_json_str)
            if not msg_json_info.success:
                print('PROBLEM HERE TO LOG!')
                #StoredRequest.set_error_status(\
                #            stored_request_id,
                #            msg_json_info.err_msg,
                #            is_finished=False)
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
