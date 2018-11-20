"""
Used to assist with TA2 calls, specifically:

(1) FitSolution
(2) GetFitSolutionResults (contains fitted_solution_id)
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
from tworaven_apps.ta2_interfaces.req_search_solutions import fit_solution
from tworaven_apps.ta2_interfaces.ta2_produce_solution_helper import ProduceSolutionHelper
from tworaven_apps.ta2_interfaces.static_vals import \
        (KEY_FITTED_SOLUTION_ID, KEY_PIPELINE_ID,
         KEY_PROGRESS, KEY_PROGRESS_STATE, KEY_PROGRESS_COMPLETED,
         KEY_REQUEST_ID,
         KEY_SEARCH_ID, KEY_SOLUTION_ID)
from tworaven_apps.ta2_interfaces.models import \
        (StoredRequest, StoredResponse)
import core_pb2
import grpc
from google.protobuf.json_format import \
    (Parse, ParseError)
from tworavensproject.celery import celery_app

LOGGER = logging.getLogger(__name__)

class FitSolutionHelper(BasicErrCheck):
    """Helper class to run TA2 call sequence"""
    GRCP_FIT_SOLUTION = 'FitSolution'
    GRPC_GET_FIT_SOLUTION_RESULTS = 'GetFitSolutionResults'

    def __init__(self, pipeline_id, websocket_id, user_id, fit_params, **kwargs):
        """initial params"""
        self.pipeline_id = pipeline_id
        self.websocket_id = websocket_id
        self.user_id = user_id
        self.user_object = None

        self.fit_params = fit_params
        self.produce_params = kwargs.get('produce_params', None)

        self.get_user()
        self.check_fit_params()


    def get_user(self):
        """Fetch the user"""
        if self.has_error():
            return

        try:
            self.user_object = User.objects.get(pk=self.user_id)
        except User.DoesNotExist:
            self.add_err_msg('No user found for id: %s' % self.user_id)


    def check_fit_params(self):
        """Check that "fit_params" has all of the required sections
          Except for 'solutionId', params set at:
            file: app.js
            function: getFitSolutionDefaultParameters
        """
        if self.has_error():
            return False

        if not isinstance(self.fit_params, dict):
            self.add_err_msg('fit params must be a python dict')
            return False

        # Iterate through the expectd keys
        #
        expected_keys = [KEY_SOLUTION_ID, 'inputs', 'exposeOutputs',
                         'exposeValueTypes', 'users']

        for key in expected_keys:
            if not key in self.fit_params:
                user_msg = ('fit_params is missing key: %s') % \
                            (self.pipeline_id, key)
                self.send_websocket_err_msg(self.GRCP_FIT_SOLUTION, user_msg)
                return False

        return True

    @staticmethod
    @celery_app.task(ignore_result=True)
    def make_fit_solutions_call(pipeline_id, websocket_id, user_id, fit_params, **kwargs):
        print('make_fit_solutions_call 1')
        assert pipeline_id, "pipeline_id must be set"
        assert websocket_id, "websocket_id must be set"
        assert user_id, "user_id must be set"
        assert fit_params, "fit_params must be set"
        fit_helper = FitSolutionHelper(pipeline_id, websocket_id,
                                        user_id, fit_params, **kwargs)

        if fit_helper.has_error():
            user_msg = ('FitSolution failure for pipeline (%s): %s') % \
                        (pipeline_id, fit_helper.get_error_message())

            ws_msg = WebsocketMessage.get_fail_message(\
                        FitSolutionHelper.GRCP_FIT_SOLUTION, user_msg)

            ws_msg.send_message(websocket_id)
            LOGGER.error(user_msg)
            return


        fit_helper.run_process()



    def run_process(self):
        """(1) Run FitSolution"""
        if self.has_error():
            return
        # ----------------------------------
        # Create the input
        # ----------------------------------
        LOGGER.info('FitSolutionHelper.run_process 2')
        json_str_info = json_dumps(self.fit_params)
        if not json_str_info.success:
            self.add_err_msg(json_str_info.err_msg)
            return

        json_str_input = json_str_info.result_obj

        # ----------------------------------
        # Run FitSolution
        # ----------------------------------
        fit_info = fit_solution(json_str_input)
        if not fit_info.success:
            self.send_websocket_err_msg(self.GRCP_FIT_SOLUTION,
                                        fit_info.err_msg)
            return

        # ----------------------------------
        # Parse the FitSolutionResponse
        # ----------------------------------
        response_info = json_loads(fit_info.result_obj)
        if not response_info.success:
            self.send_websocket_err_msg(self.GRCP_FIT_SOLUTION, response_info.err_msg)
            return

        result_json = response_info.result_obj

        # ----------------------------------
        # Get the requestId
        # ----------------------------------
        if not KEY_REQUEST_ID in result_json:
            user_msg = (' "%s" not found in response to JSON: %s') % \
                        (KEY_REQUEST_ID, result_json)
            self.send_websocket_err_msg(self.GRCP_FIT_SOLUTION, user_msg)
            return

        self.run_get_fit_solution_responses(result_json[KEY_REQUEST_ID])


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
        LOGGER.info('FitSolutionHelper: %s', user_msg)

        # ----------------------------------
        # Add error message to class
        # ----------------------------------
        self.add_err_msg(user_msg)


    def run_get_fit_solution_responses(self, request_id):
        """(2) Run GetFitSolutionResults"""
        if self.has_error():
            return

        if not request_id:
            self.send_websocket_err_msg(self.GRPC_GET_FIT_SOLUTION_RESULTS,
                                        'request_id must be set')
            return

        # -----------------------------------
        # (1) make GRPC request object
        # -----------------------------------
        params_dict = {KEY_REQUEST_ID: request_id}
        params_info = json_dumps(params_dict)

        try:
            grpc_req = Parse(params_info.result_obj,
                             core_pb2.GetFitSolutionResultsRequest())
        except ParseError as err_obj:
            err_msg = ('Failed to convert JSON to gRPC: %s') % (err_obj)
            self.send_websocket_err_msg(self.GRPC_GET_FIT_SOLUTION_RESULTS,
                                        err_msg)
            return

        # --------------------------------
        # (2) Save the request to the db
        # --------------------------------
        stored_request = StoredRequest(\
                        user=self.user_object,
                        request_type=self.GRPC_GET_FIT_SOLUTION_RESULTS,
                        pipeline_id=self.pipeline_id,
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
        try:
            # -----------------------------------------
            # Iterate through the streaming responses
            # Note: The StoredResponse.id becomes the pipeline id
            # -----------------------------------------
            for reply in core_stub.GetFitSolutionResults(\
                    grpc_req, timeout=settings.TA2_GRPC_LONG_TIMEOUT):

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
                            self.GRPC_GET_FIT_SOLUTION_RESULTS,
                            err_msg)
                    # Wait for next response....
                    continue

                result_json = msg_json_info.result_obj

                if not KEY_FITTED_SOLUTION_ID in result_json:
                    user_msg = '"%s" not found in response to JSON: %s' % \
                               (KEY_FITTED_SOLUTION_ID, result_json)
                    self.send_websocket_err_msg(\
                            self.GRPC_GET_FIT_SOLUTION_RESULTS,
                            err_msg)
                    # Wait for next response....
                    continue

                fitted_solution_id = result_json[KEY_FITTED_SOLUTION_ID]

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
                                    self.GRPC_GET_FIT_SOLUTION_RESULTS,
                                    stored_resp_info.err_msg)
                    continue

                # ---------------------------------------------
                # Looks good!  Get the StoredResponse
                # - send responses back to WebSocket
                # ---------------------------------------------
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
                    user_msg = 'GetFitSolutionResultsResponse is not yet complete'
                    LOGGER.info(user_msg)
                    # wait for next message...
                    continue


                ws_msg = WebsocketMessage.get_success_message(\
                            self.GRPC_GET_FIT_SOLUTION_RESULTS,
                            'it worked',
                            msg_cnt=msg_cnt,
                            data=stored_response.as_dict())

                LOGGER.info('ws_msg: %s' % ws_msg)
                #print('ws_msg', ws_msg.as_dict())

                ws_msg.send_message(self.websocket_id)
                stored_response.mark_as_sent_to_user()

                # if GetFitSolutionResultsResponse is COMPLETE,
                #  then trigger ProduceSolution
                #
                if fitted_solution_id:
                    self.check_fit_progress(fitted_solution_id, result_json)


        except grpc.RpcError as err_obj:
            stored_request.set_error_status(str(err_obj))
            return

        except Exception as err_obj:
            stored_request.set_error_status(str(err_obj))
            return


        StoredRequestUtil.set_finished_ok_status(stored_request.id)


    def check_fit_progress(self, fitted_solution_id, result_json):
        """if GetFitSolutionResultsResponse is COMPLETED,
           then trigger ProduceSolution"""
        assert isinstance(result_json, dict), 'result_json must be a dict'
        assert fitted_solution_id, 'fitted_solution_id must be set'

        # --------------------------------------------
        # Check if the progress.state == 'COMPLETED'
        # --------------------------------------------
        progress_val = get_dict_value(\
                        result_json,
                        [KEY_PROGRESS, KEY_PROGRESS_STATE])

        if (not progress_val.success) or \
           (progress_val.result_obj != KEY_PROGRESS_COMPLETED):
            user_msg = 'FitSolutionResultsResponse is not yet complete'
            LOGGER.info(user_msg)
            return

        # --------------------------------------------
        # Format ProduceSolution parameters
        # --------------------------------------------
        if not self.produce_params:
            user_msg = 'No default params available for ProduceSolution'
            self.send_websocket_err_msg(\
                            self.GRPC_GET_FIT_SOLUTION_RESULTS,
                            user_msg)
            LOGGER.error(user_msg)
            return

        prod_params = dict(self.produce_params)
        prod_params[KEY_FITTED_SOLUTION_ID] = fitted_solution_id

        ProduceSolutionHelper.make_produce_solution_call.delay(\
                                    self.pipeline_id,
                                    self.websocket_id,
                                    self.user_id,
                                    prod_params)
