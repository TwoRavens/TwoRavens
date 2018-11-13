"""This class calls is used to handle the SearchSolutions
process which involves multiple calls to TA2s, including
both streaming and non-streaming calls.

In addition, certain points in the process will send messages
back to the UI via websockets."""
from django.conf import settings

from tworaven_apps.ta2_interfaces.websocket_message import WebsocketMessage

from tworaven_apps.raven_auth.models import User
from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.utils.basic_response import (ok_resp, err_resp)
from tworaven_apps.utils.json_helper import json_loads
from tworaven_apps.ta2_interfaces.models import \
        (StoredRequest, StoredResponse)
import core_pb2
#from google.protobuf.json_format import \
#    (Parse, ParseError)
from tworaven_apps.ta2_interfaces.req_search_solutions import \
        (search_solutions, end_search_solutions)
        """stop_search_solutions, describe_solution,
         score_solution, fit_solution,
         produce_solution, solution_export,
         update_problem, list_primitives)"""
from tworavensproject.celery import celery_app


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


    @staticmethod
    def make_initial_call(search_params, websocket_id):
        """Return the result of a SearchSolutions call.
        If successful, an async process is kicked off"""
        if not websocket_id:
            return err_resp('websocket_id must be set')

        # Run SearchSolutions against the TA2
        #
        search_info = search_solutions(search_params)
        if not search_info.success:
            return search_info

        try:
            search_id = search_info.result_obj['data']['searchId']
        except KeyError:
            return err_resp('searchId not found in the SearchSolutionsResponse')

        # Async task to run GetSearchSolutionsResults
        #
        second_kick_off_solution_results.delay(search_id, websocket_id)

        # Back to the UI, looking good
        #
        return search_info.result_obj


    @staticmethod
    @celery_app.task(ignore_result=True)
    def second_kick_off_solution_results(search_id, websocket_id):
        assert search_id, "search_id must be set"
        assert websocket_id, "websocket_id must be set"

        solutions_helper = SearchSolutionsHelper(search_id, websocket_id)

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
        params_str = json.dumps(params_dict)
        try:
            grpc_req = Parse(params_str, core_pb2.GetSearchSolutionsResultsRequest())
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
        msg_cnt = 0
        grpc_call_name = 'GetSearchSolutionsResults'
        try:
            # -----------------------------------------
            # Iterate through the streaming responses
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

                # over here........
                stored_resp_info.add_pipeline_id(....)
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

                    ws_msg.send_message(websocket_id)

                    # Wait for the next response...
                    continue


                # -----------------------------------------------
                # send responses back to WebSocket
                # ---------------------------------------------
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
