"""This class calls is used to handle the SearchSolutions
process which involves multiple calls to TA2s, including
both streaming and non-streaming calls.

In addition, certain points in the process will send messages
back to the UI via websockets.

Usage example:

search_info = SearchSolutionsHelper.make_initial_call(search_params, websocket_id)
if search_info.success:
    return


"""
from django.conf import settings

from tworaven_apps.ta2_interfaces.websocket_message import WebsocketMessage
from tworaven_apps.raven_auth.models import User
from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.utils.basic_response import (ok_resp, err_resp)
from tworaven_apps.utils.json_helper import json_loads, json_dumps
from tworaven_apps.utils.proto_util import message_to_json
from tworaven_apps.ta2_interfaces.models import \
        (StoredRequest, StoredResponse,
         KEY_SEARCH_ID)
from tworaven_apps.ta2_interfaces.stored_data_util import StoredRequestUtil
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.stored_data_util import StoredRequestUtil
import core_pb2
import grpc
from google.protobuf.json_format import \
    (Parse, ParseError)




class SearchSolutionsHelper(BasicErrCheck):
    """Server-side process for SearchSolutions calls to a TA2"""

    def __init__(self, search_id, websocket_id, user_id):
        """Start the process with params for a SearchSolutions call"""
        assert user_id, "user_id must be set"
        assert search_id, "search_id must be set"
        assert websocket_id, "websocket_id must be set"

        self.search_id = search_id  # string format; parsable as JSON
        self.websocket_id = websocket_id
        self.user_id = user_id  # string format; parsable as JSON
        self.user_object = None

        self.get_user()
        self.run_process()


    def get_user(self):
        """Fetch the user"""
        if self.has_error():
            return

        try:
            self.user_object = User.objects.get(pk=self.user_id)
        except User.DoesNotExist:
            self.add_err_msg('No user found for id: %s' % self.user_id)


    def run_process(self):
        """Run through the various steps"""
        if self.has_error():
            return

        self.run_get_search_solution_results()


    def run_get_search_solution_results(self):
        """Run SearchSolutions against a TA2"""

        # -----------------------------------
        # (1) make GRPC request object
        # -----------------------------------
        params_dict = dict(searchId=self.search_id)
        params_info = json_dumps(params_dict)
        if not params_info.success:
            self.add_err_msg(params_info.err_msg)
            return

        try:
            grpc_req = Parse(params_info.result_obj,
                             core_pb2.GetSearchSolutionsResultsRequest())
        except ParseError as err_obj:
            err_msg = ('GetSearchSolutionsResultsRequest: Failed to'
                       ' convert JSON to gRPC: %s') % (err_obj)
            self.add_err_msg(err_msg)
            return

        # --------------------------------
        # (2) Save the request to the db
        # --------------------------------
        stored_request = StoredRequest(\
                        user=self.user_object,
                        workspace='(not specified)',
                        request_type='GetSearchSolutionsResults',
                        is_finished=False,
                        request=params_dict)
        stored_request.save()

        # --------------------------------
        # (3) Make the gRPC request
        # --------------------------------
        core_stub, err_msg = TA2Connection.get_grpc_stub()
        if err_msg:
            return err_resp(err_msg)

        msg_cnt = 0
        grpc_call_name = 'GetSearchSolutionsResults'
        try:
            # -----------------------------------------
            # Iterate through the streaming responses
            # Note: The StoredResponse.id becomes the pipeline id
            # -----------------------------------------
            for reply in core_stub.GetSearchSolutionsResults(\
                    grpc_req, timeout=settings.TA2_GRPC_LONG_TIMEOUT):

                msg_cnt += 1

                stored_resp = None  # to hold a StoredResponse object

                # -----------------------------------------------
                # Parse the response into JSON + store response
                # -----------------------------------------------
                msg_json_str = message_to_json(reply)
                msg_json_info = json_loads(msg_json_str)

                if not msg_json_info.success:
                    user_msg = 'Failed to convert response to JSON: %s' % \
                               msg_json_info.err_msg
                    ws_msg = WebsocketMessage.get_fail_message(\
                                grpc_call_name, user_msg, msg_cnt=msg_cnt)
                    ws_msg.send_message(self.websocket_id)

                    # Wait for next response....
                    continue

                # -----------------------------------------
                # Looks good, save the response
                # -----------------------------------------
                stored_resp_info = StoredResponse.add_response(\
                                stored_request.id,
                                response=msg_json_info.result_obj)

                # -----------------------------------------
                # Make sure the response was saved (probably won't happen)
                # -----------------------------------------
                if not stored_resp_info.success:
                    # Not good but probably won't happen
                    # send a message to the user...
                    #
                    user_msg = 'Failed to store response from %s: %s' % \
                                (grpc_call_name, msg_json_info.err_msg)

                    ws_msg = WebsocketMessage.get_fail_message(\
                            grpc_call_name, user_msg, msg_cnt=msg_cnt)

                    ws_msg.send_message(self.websocket_id)

                    # Wait for the next response...
                    continue

                # ---------------------------------------------
                # Looks good!  Get the StoredResponse
                # - This id will be used as the pipeline id
                # ---------------------------------------------
                stored_response = stored_resp_info.result_obj
                stored_response.use_id_as_pipeline_id()

                # -----------------------------------------------
                # send responses back to WebSocket
                # ---------------------------------------------
                ws_msg = WebsocketMessage.get_success_message(\
                            grpc_call_name,
                            'it worked',
                            msg_cnt=msg_cnt,
                            data=stored_response.as_dict())

                print('ws_msg: %s' % ws_msg)
                #print('ws_msg', ws_msg.as_dict())

                ws_msg.send_message(self.websocket_id)

                stored_response.mark_as_sent_to_user()
                # -----------------------------------------------

                print('msg received #%d' % msg_cnt)

        except grpc.RpcError as err_obj:
            stored_request.set_error_status(str(err_obj))
            return

        except Exception as err_obj:
            stored_request.set_error_status(str(err_obj))
            return


        StoredRequestUtil.set_finished_ok_status(stored_request.id)
