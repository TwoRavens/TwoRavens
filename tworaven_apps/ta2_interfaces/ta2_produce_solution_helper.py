"""
Used to assist with TA2 calls, specifically:

(1) ProduceSolution (input: fittedSolutionId)
(2) GetProduceSolutionResults
    -> Results from the final call are passed back to the UI via websockets
"""
import logging
from django.conf import settings

from tworaven_apps.ta2_interfaces.websocket_message import WebsocketMessage
from tworaven_apps.raven_auth.models import User
from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.utils.basic_response import (ok_resp, err_resp)
from tworaven_apps.utils.json_helper import \
    (json_loads, json_dumps, get_dict_value)
from tworaven_apps.utils.proto_util import message_to_json
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.stored_data_util import StoredRequestUtil
from tworaven_apps.ta2_interfaces.req_search_solutions import produce_solution
from tworaven_apps.ta2_interfaces.static_vals import \
        (KEY_FITTED_SOLUTION_ID, KEY_PIPELINE_ID,
         KEY_PROGRESS, KEY_PROGRESS_STATE, KEY_PROGRESS_COMPLETED,
         KEY_REQUEST_ID, KEY_SEARCH_ID, KEY_SOLUTION_ID)
from tworaven_apps.ta2_interfaces.models import \
        (StoredRequest, StoredResponse)
import core_pb2
import grpc
from google.protobuf.json_format import \
    (Parse, ParseError)
from tworavensproject.celery import celery_app

LOGGER = logging.getLogger(__name__)

class ProduceSolutionHelper(BasicErrCheck):
    """Helper class to run TA2 call sequence"""
    GRCP_PRODUCE_SOLUTION = 'ProduceSolution'
    GRPC_GET_PRODUCE_SOLUTION_RESULTS = 'GetProduceSolutionResults'

    def __init__(self, pipeline_id, websocket_id, user_id, produce_params, **kwargs):
        """initial params"""
        self.pipeline_id = pipeline_id
        self.websocket_id = websocket_id
        self.user_id = user_id
        self.user_object = None

        self.produce_params = produce_params

        self.get_user()
        self.check_produce_params()


    def get_user(self):
        """Fetch the user"""
        if self.has_error():
            return

        try:
            self.user_object = User.objects.get(pk=self.user_id)
        except User.DoesNotExist:
            self.add_err_msg('No user found for id: %s' % self.user_id)


    def check_produce_params(self):
        """Check that "produce_params" has all of the required sections
          Except for 'fittedSolutionId', params set at:
            file: app.js
            function: getProduceSolutionDefaultParameters
        """
        if self.has_error():
            return False

        if not isinstance(self.produce_params, dict):
            self.add_err_msg('produce_params must be a python dict')
            return False

        # Iterate through the expectd keys
        #
        expected_keys = [KEY_FITTED_SOLUTION_ID, 'inputs',
                         'exposeOutputs', 'exposeValueTypes']

        for key in expected_keys:
            if not key in self.produce_params:
                user_msg = ('produce_params is missing key: %s') % \
                            (self.pipeline_id, key)
                self.send_websocket_err_msg(self.GRCP_PRODUCE_SOLUTION, user_msg)
                return False

        return True

    @staticmethod
    @celery_app.task(ignore_result=True)
    def make_produce_solution_call(pipeline_id, websocket_id, user_id, produce_params, **kwargs):
        """Celery task to make TA2 calls for:
         ProduceSolution and GetProduceSolutionResults"""
        print('make_produce_solution_call 1')
        assert pipeline_id, "pipeline_id must be set"
        assert websocket_id, "websocket_id must be set"
        assert user_id, "user_id must be set"
        assert produce_params, "produce_params must be set"
        print('make_produce_solution_call 2')

        produce_helper = ProduceSolutionHelper(\
                                pipeline_id, websocket_id,
                                user_id, produce_params, **kwargs)

        if produce_helper.has_error():
            user_msg = ('ProduceSolution failure for pipeline (%s): %s') % \
                        (pipeline_id, produce_helper.get_error_message())

            ws_msg = WebsocketMessage.get_fail_message(\
                        ProduceSolutionHelper.GRCP_PRODUCE_SOLUTION, user_msg)

            ws_msg.send_message(websocket_id)
            LOGGER.info('ProduceSolutionHelper: %s', user_msg)
            return

        LOGGER.info('ProduceSolutionHelper: OK!')

        produce_helper.run_process()



    def run_process(self):
        """(1) Run ProduceSolution"""
        LOGGER.info('ProduceSolutionHelper.run_process 1')

        if self.has_error():
            return
        # ----------------------------------
        # Create the input
        # ----------------------------------
        LOGGER.info('ProduceSolutionHelper.run_process 2')
        json_str_info = json_dumps(self.produce_params)
        if not json_str_info.success:
            self.add_err_msg(json_str_info.err_msg)
            return

        json_str_input = json_str_info.result_obj

        # ----------------------------------
        # Run FitSolution
        # ----------------------------------
        LOGGER.info('ProduceSolutionHelper.run_process 3')
        produce_info = produce_solution(json_str_input)
        if not produce_info.success:
            self.send_websocket_err_msg(self.GRCP_PRODUCE_SOLUTION,
                                        produce_info.err_msg)
            return

        # ----------------------------------
        # Parse the FitSolutionResponse
        # ----------------------------------
        LOGGER.info('ProduceSolutionHelper.run_process 4')
        response_info = json_loads(produce_info.result_obj)
        if not response_info.success:
            self.send_websocket_err_msg(self.GRCP_PRODUCE_SOLUTION,
                                        response_info.err_msg)
            return

        result_json = response_info.result_obj

        # ----------------------------------
        # Get the requestId
        # ----------------------------------
        LOGGER.info('ProduceSolutionHelper.run_process 5')
        if not KEY_REQUEST_ID in result_json:
            user_msg = (' "%s" not found in response to JSON: %s') % \
                        (KEY_REQUEST_ID, result_json)
            self.send_websocket_err_msg(self.GRCP_PRODUCE_SOLUTION, user_msg)
            return

        self.run_get_produce_solution_responses(result_json[KEY_REQUEST_ID])


    def send_websocket_err_msg(self, grpc_call, user_msg=''):
        """Send an error messsage over websockets"""
        assert grpc_call, 'grpc_call is required'

        user_msg = '%s error; pipeline %s: %s' % \
                   (grpc_call,
                    self.pipeline_id,
                    user_msg)

        # ----------------------------------
        # Send Websocket message
        # ----------------------------------
        ws_msg = WebsocketMessage.get_fail_message(grpc_call, user_msg)
        ws_msg.send_message(self.websocket_id)

        # ----------------------------------
        # Log it
        # ----------------------------------
        LOGGER.info('ProduceSolutionHelper: %s', user_msg)

        # ----------------------------------
        # Add error message to class
        # ----------------------------------
        self.add_err_msg(user_msg)


    def run_get_produce_solution_responses(self, request_id):
        """(2) Run GetProduceSolutionResults"""
        LOGGER.info('ProduceSolutionHelper.run_get_produce_solution_responses 1')
        if self.has_error():
            return

        if not request_id:
            self.send_websocket_err_msg(self.GRPC_GET_PRODUCE_SOLUTION_RESULTS,
                                        'request_id must be set')
            return

        LOGGER.info('ProduceSolutionHelper.run_get_produce_solution_responses 3')
        # -----------------------------------
        # (1) make GRPC request object
        # -----------------------------------
        params_dict = {KEY_REQUEST_ID: request_id}
        params_info = json_dumps(params_dict)

        try:
            grpc_req = Parse(params_info.result_obj,
                             core_pb2.GetProduceSolutionResultsRequest())
        except ParseError as err_obj:
            err_msg = ('Failed to convert JSON to gRPC: %s') % (err_obj)
            self.send_websocket_err_msg(self.GRPC_GET_PRODUCE_SOLUTION_RESULTS,
                                        err_msg)
            return

        LOGGER.info('ProduceSolutionHelper.run_get_produce_solution_responses 3')
        # --------------------------------
        # (2) Save the request to the db
        # --------------------------------
        stored_request = StoredRequest(\
                        user=self.user_object,
                        request_type=self.GRPC_GET_PRODUCE_SOLUTION_RESULTS,
                        pipeline_id=self.pipeline_id,
                        is_finished=False,
                        request=params_dict)
        stored_request.save()

        LOGGER.info('ProduceSolutionHelper.run_get_produce_solution_responses 4')
        # --------------------------------
        # (3) Make the gRPC request
        # --------------------------------
        core_stub, err_msg = TA2Connection.get_grpc_stub()
        if err_msg:
            return err_resp(err_msg)

        msg_cnt = 0
        try:
            LOGGER.info('ProduceSolutionHelper.run_get_produce_solution_responses 5')

            # -----------------------------------------
            # Iterate through the streaming responses
            # Note: The StoredResponse.id becomes the pipeline id
            # -----------------------------------------
            for reply in core_stub.GetProduceSolutionResults(\
                    grpc_req, timeout=settings.TA2_GRPC_LONG_TIMEOUT):

                LOGGER.info('ProduceSolutionHelper.run_get_produce_solution_responses 6')

                msg_cnt += 1

                stored_response = None  # to hold a StoredResponse object

                # -----------------------------------------------
                # Parse the response into JSON + store response
                # -----------------------------------------------
                msg_json_str = message_to_json(reply)
                msg_json_info = json_loads(msg_json_str)

                if not msg_json_info.success:
                    err_msg = ('Failed to convert JSON to gRPC: %s') % \
                               (err_obj,)

                    self.send_websocket_err_msg(\
                            self.GRPC_GET_PRODUCE_SOLUTION_RESULTS,
                            err_msg)
                    # Wait for next response....
                    continue

                result_json = msg_json_info.result_obj

                LOGGER.info('ProduceSolutionHelper.run_get_produce_solution_responses 7')

                # -----------------------------------------
                # Looks good, save the response
                # -----------------------------------------
                stored_resp_info = StoredResponse.add_response(\
                                stored_request.id,
                                response=result_json,
                                pipeline_id=self.pipeline_id)

                # -----------------------------------------
                # Make sure the response was saved (probably won't happen)
                # -----------------------------------------
                if not stored_resp_info.success:
                    # Not good but probably won't happen
                    # send a message to the user...
                    #
                    self.send_websocket_err_msg(\
                                    self.GRPC_GET_PRODUCE_SOLUTION_RESULTS,
                                    stored_resp_info.err_msg)
                    continue

                # ---------------------------------------------
                # Looks good!  Get the StoredResponse
                # ---------------------------------------------
                LOGGER.info('ProduceSolutionHelper.run_get_produce_solution_responses 8')

                stored_response = stored_resp_info.result_obj
                stored_response.set_pipeline_id(self.pipeline_id)

                # ---------------------------------------------
                # If progress is complete,
                #  send response back to WebSocket
                # ---------------------------------------------
                progress_val = get_dict_value(\
                                result_json,
                                [KEY_PROGRESS, KEY_PROGRESS_STATE])

                if (not progress_val.success) or \
                   (progress_val.result_obj != KEY_PROGRESS_COMPLETED):
                    user_msg = 'GetProduceSolutionResultsResponse is not yet complete'
                    LOGGER.info(user_msg)
                    # wait for next message...
                    continue

                ws_msg = WebsocketMessage.get_success_message(\
                            self.GRPC_GET_PRODUCE_SOLUTION_RESULTS,
                            'it worked.',
                            msg_cnt=msg_cnt,
                            data=stored_response.as_dict())

                LOGGER.info('ProduceSolutionHelper.run_get_produce_solution_responses 9')

                print('ws_msg: %s' % ws_msg)
                #print('ws_msg', ws_msg.as_dict())

                # ---------------------------------------------
                # Should this be checked for completeness
                # before sending it back?
                # ---------------------------------------------
                ws_msg.send_message(self.websocket_id)
                stored_response.mark_as_sent_to_user()

        except grpc.RpcError as err_obj:
            stored_request.set_error_status(str(err_obj))
            return

        except Exception as err_obj:
            stored_request.set_error_status(str(err_obj))
            return


        StoredRequestUtil.set_finished_ok_status(stored_request.id)
