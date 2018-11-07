"""
send a gRPC command that has streaming results
capture the results in the db as StoredResponse objects
"""
from datetime import datetime
from django.conf import settings

from tworaven_apps.utils.json_helper import json_loads
from tworaven_apps.utils.proto_util import message_to_json
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.models import \
    (StoredRequest, StoredResponse)
from tworaven_apps.ta2_interfaces.websocket_message import WebsocketMessage
from tworavensproject.celery import celery_app


import grpc
import core_pb2

from google.protobuf.json_format import \
    (Parse, ParseError)



@celery_app.task
def stream_and_store_results(raven_json_str, stored_request_id,
                             grpc_req_obj_name, grpc_call_name, **kwargs):
    """Make the grpc call which has a streaming response

    grpc_req_obj_name: "core_pb2.GetSearchSolutionsResultsRequest", etc
    grpc_call_name: "GetSearchSolutionsResults", etc
    """
    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        StoredRequest.set_error_status(stored_request_id, err_msg)
        return

    # optional: used to stream messages back to client via channels
    #
    websocket_id = kwargs.get('websocket_id', None)


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
        # -----------------------------------------
        # Iterate through the streaming responses
        # -----------------------------------------
        for reply in grpc_rpc_call_function(\
                req, timeout=settings.TA2_GRPC_LONG_TIMEOUT):

            msg_cnt += 1

            stored_resp = None  # to hold a StoredResponse object

            # -----------------------------------------
            # parse the response
            # -----------------------------------------
            msg_json_str = message_to_json(reply)

            msg_json_info = json_loads(msg_json_str)

            # -----------------------------------------
            # does it look ok?
            # -----------------------------------------
            if not msg_json_info.success:
                print('PROBLEM HERE TO LOG!')

                user_msg = 'failed to store response: %s' % \
                           msg_json_info.err_msg
                ws_msg = WebsocketMessage.get_fail_message(\
                            grpc_call_name, user_msg, msg_cnt=msg_cnt)
                ws_msg.send_message(websocket_id)

                continue

            # -----------------------------------------
            # Looks good, save the response
            # -----------------------------------------
            stored_resp_info = StoredResponse.add_response(\
                            stored_request_id,
                            response=msg_json_info.result_obj)

            # -----------------------------------------
            # Make sure the response was saved (probably won't happen)
            # -----------------------------------------
            if not stored_resp_info.success:
                # Not good but probably won't happen
                # send a message to the user...
                #
                user_msg = 'failed to store response: %s' % \
                            msg_json_info.err_msg
                ws_msg = WebsocketMessage.get_fail_message(\
                        grpc_call_name, user_msg, msg_cnt=msg_cnt)

                ws_msg.send_message(websocket_id)

                # Wait for the next response...
                continue


            # -----------------------------------------------
            # send responses back to any open WebSockets
            # ---------------------------------------------
            if websocket_id:
                stored_resp = stored_resp_info.result_obj

                ws_msg = WebsocketMessage.get_success_message(\
                                    grpc_call_name,
                                    'it worked',
                                    msg_cnt=msg_cnt,
                                    data=stored_resp.as_dict())

                print('ws_msg: %s' % ws_msg)
                #print('ws_msg', ws_msg.as_dict())

                ws_msg.send_message(websocket_id)

                StoredResponse.mark_as_read(stored_resp)
            # -----------------------------------------------

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
