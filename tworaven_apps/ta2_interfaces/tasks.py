"""
send a gRPC command that has streaming results
capture the results in the db as StoredResponse objects
"""
from datetime import datetime
from django.conf import settings

from tworaven_apps.utils.json_helper import json_loads
from tworaven_apps.utils.proto_util import message_to_json
from tworaven_apps.utils.basic_response import (ok_resp, err_resp)

from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.models import \
    (StoredRequest, StoredResponse)
from tworaven_apps.ta2_interfaces.stored_data_util import StoredRequestUtil

from tworaven_apps.ta2_interfaces.websocket_message import WebsocketMessage
from tworaven_apps.ta2_interfaces.search_solutions_helper import \
    SearchSolutionsHelper
from tworaven_apps.ta2_interfaces.req_search_solutions import \
        (search_solutions)
from tworaven_apps.ta2_interfaces.models import KEY_SEARCH_ID
from tworavensproject.celery import celery_app


import grpc
import core_pb2

from google.protobuf.json_format import \
    (Parse, ParseError)



@celery_app.task(ignore_result=True)
def kick_off_solution_results(search_id, websocket_id, user_id):
    assert search_id, "search_id must be set"
    assert websocket_id, "websocket_id must be set"

    solutions_helper = SearchSolutionsHelper(search_id, websocket_id, user_id)


def make_search_solutions_call(search_params, websocket_id, user_id):
    """Return the result of a SearchSolutions call.
    If successful, an async process is kicked off"""
    if not websocket_id:
        return err_resp('websocket_id must be set')

    # Run SearchSolutions against the TA2
    #
    search_info = search_solutions(search_params)
    if not search_info.success:
        return search_info

    search_info_json = json_loads(search_info.result_obj)
    if not search_info_json.success:
        return search_info_json
    search_info_data = search_info_json.result_obj
    print('search_info_data', search_info_data)

    if not KEY_SEARCH_ID in search_info_data:
        return err_resp('searchId not found in the SearchSolutionsResponse')

    search_id = search_info_data['searchId']

    # Async task to run GetSearchSolutionsResults
    #
    kick_off_solution_results.delay(search_id, websocket_id, user_id)

    # Back to the UI, looking good
    #
    return ok_resp(search_info_data)


@celery_app.task(ignore_result=True)
def stream_and_store_results(raven_json_str, stored_request_id,
                             grpc_req_obj_name, grpc_call_name, **kwargs):
    """Make the grpc call which has a streaming response

    grpc_req_obj_name: "core_pb2.GetSearchSolutionsResultsRequest", etc
    grpc_call_name: "GetSearchSolutionsResults", etc
    """
    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        StoredRequestUtil.set_error_status(stored_request_id, err_msg)
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
        StoredRequestUtil.set_error_status(stored_request_id, err_msg)
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
        StoredRequestUtil.set_error_status(\
                        stored_request_id,
                        str(err_obj))
        return

    #except Exception as err_obj:
    #    StoredRequestUtil.set_error_status(\
    #                    stored_request_id,
    #                    str(err_obj))
    #    return


    StoredRequestUtil.set_finished_ok_status(stored_request_id)
