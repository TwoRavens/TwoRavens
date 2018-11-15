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
         KEY_PIPELINE_ID, KEY_SEARCH_ID, KEY_SOLUTION_ID)
from tworaven_apps.ta2_interfaces.req_search_solutions import \
        (search_solutions, describe_solution)
from tworaven_apps.ta2_interfaces.stored_data_util import StoredRequestUtil
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.stored_data_util import StoredRequestUtil
import core_pb2
import grpc
from google.protobuf.json_format import \
    (Parse, ParseError)
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
    @celery_app.task(ignore_result=True)
    def kick_off_solution_results(search_id, websocket_id, user_id):
        assert search_id, "search_id must be set"
        assert websocket_id, "websocket_id must be set"

        solutions_helper = SearchSolutionsHelper(search_id, websocket_id, user_id)


    @staticmethod
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
        SearchSolutionsHelper.kick_off_solution_results.delay(search_id, websocket_id, user_id)

        # Back to the UI, looking good
        #
        return ok_resp(search_info_data)


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

                result_json = msg_json_info.result_obj

                if not KEY_SOLUTION_ID in result_json:
                    user_msg = '"%s" not found in response to JSON: %s' % \
                               (KEY_SOLUTION_ID, result_json)
                    ws_msg = WebsocketMessage.get_fail_message(\
                                grpc_call_name, user_msg, msg_cnt=msg_cnt)
                    ws_msg.send_message(self.websocket_id)
                    # Wait for next response....
                    continue

                # Solution id used for DescribeSolution...
                #
                solution_id = result_json[KEY_SOLUTION_ID]

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
                print('msg received #%d' % msg_cnt)
                # -----------------------------------------------
                # continue the process describe/score/etc
                # -----------------------------------------------
                self.run_describe_solution(stored_response.pipeline_id,
                                           solution_id,
                                           msg_cnt)


        except grpc.RpcError as err_obj:
            stored_request.set_error_status(str(err_obj))
            return

        except Exception as err_obj:
            stored_request.set_error_status(str(err_obj))
            return


        StoredRequestUtil.set_finished_ok_status(stored_request.id)


    def run_describe_solution(self, pipeline_id, solution_id, msg_cnt=-1):
        """Run a DescribeSolution call for each solution_id"""

        # ----------------------------------
        # Create the input
        # ----------------------------------
        json_str_info = json_dumps({KEY_SOLUTION_ID: solution_id})
        if not json_str_info.success:
            self.add_err_msg(json_str_info.err_msg)
            return

        json_str_input = json_str_info.result_obj

        # ----------------------------------
        # Run Describe Solution
        # ----------------------------------
        describe_info = describe_solution(json_str_input)
        if not describe_info.success:
            self.add_err_msg(describe_info.err_msg)
            return

        # ----------------------------------
        # Parse the DescribeSolutionResponse
        # ----------------------------------
        describe_data_info = json_loads(describe_info.result_obj)
        if not describe_data_info.success:
            self.add_err_msg(describe_data_info.err_msg)
            return

        # -----------------------------------------------
        # Add the pipline id to the result
        # -----------------------------------------------
        describe_data = describe_data_info.result_obj
        describe_data[KEY_PIPELINE_ID] = pipeline_id
        describe_data.move_to_end(KEY_PIPELINE_ID, last=False)


        # -----------------------------------------------
        # send responses back to WebSocket
        # ---------------------------------------------
        ws_msg = WebsocketMessage.get_success_message(\
                    'DescribeSolution',
                    'it worked',
                    msg_cnt=msg_cnt,
                    data=describe_data)

        print('ws_msg: %s' % ws_msg)
        #print('ws_msg', ws_msg.as_dict())

        ws_msg.send_message(self.websocket_id)
