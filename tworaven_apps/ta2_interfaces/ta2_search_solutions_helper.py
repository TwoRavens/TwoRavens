"""This class calls is used to handle the SearchSolutions
process which involves multiple calls to TA2s, including
both streaming and non-streaming calls.

In addition, certain points in the process will send messages
back to the UI via websockets.

Usage example:

search_info = SearchSolutionsHelper.make_initial_call(search_params, websocket_id)
if search_info.success:
    return

Note: This makes the following calls:
    - SearchSolutions
        - GetSearchSolutionsResults - for each result:
            - DescribeSolution (async)
            - FitSolution (async)
            - ScoreSolution (async)

"""
import logging
from django.conf import settings

from tworaven_apps.ta2_interfaces.websocket_message import WebsocketMessage
from tworaven_apps.raven_auth.models import User
from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.utils.basic_response import (ok_resp, err_resp)
from tworaven_apps.utils.json_helper import json_loads, json_dumps
from tworaven_apps.utils.proto_util import message_to_json
from tworaven_apps.utils.view_helper import SESSION_KEY

from tworaven_apps.ta2_interfaces import static_vals as ta2_static
from tworaven_apps.ta2_interfaces.models import \
        (StoredRequest, StoredResponse)

from tworaven_apps.ta2_interfaces.req_search_solutions import \
        (search_solutions, describe_solution)


from tworaven_apps.ta2_interfaces.stored_data_util import StoredRequestUtil
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.stored_data_util import StoredRequestUtil
#
from tworaven_apps.ta2_interfaces.ta2_fit_solution_helper import FitSolutionHelper
from tworaven_apps.ta2_interfaces.ta2_score_solution_helper import ScoreSolutionHelper
#
from tworaven_apps.behavioral_logs.log_entry_maker import LogEntryMaker
from tworaven_apps.behavioral_logs import static_vals as bl_static
#
import core_pb2
import grpc
from google.protobuf.json_format import \
    (Parse, ParseError)
from tworavensproject.celery import celery_app

LOGGER = logging.getLogger(__name__)

class SearchSolutionsHelper(BasicErrCheck):
    """Server-side process for SearchSolutions calls to a TA2"""

    def __init__(self, search_id, websocket_id, user_id, **kwargs):
        """Start the process with params for a SearchSolutions call"""
        assert user_id, "user_id must be set"
        assert search_id, "search_id must be set"
        assert websocket_id, "websocket_id must be set"

        self.search_id = search_id  # string format; parsable as JSON
        self.websocket_id = websocket_id
        self.user_id = user_id  # string format; parsable as JSON
        self.user_object = None

        self.all_search_params = kwargs.get('all_search_params', {})
        self.session_key = kwargs.get(SESSION_KEY)

        self.get_user()
        self.run_process()


    @staticmethod
    def check_params(all_params):
        """Check that "all_params" has all of the required sections"""
        if not isinstance(all_params, dict):
            return err_resp('all_params must be a python dict')

        for req_key, grpc_call in ta2_static.REQUIRED_INPUT_KEYS:

            if not req_key in all_params:
                user_msg = ('"all_params" must contain the key %s for'
                            ' the %s parameters.') % \
                            (req_key, grpc_call)
                return err_resp(user_msg)

        return ok_resp('looks good')


    @staticmethod
    @celery_app.task(ignore_result=True)
    def kick_off_solution_results(search_id, websocket_id, user_id, **kwargs):
        assert search_id, "search_id must be set"
        assert websocket_id, "websocket_id must be set"

        solutions_helper = SearchSolutionsHelper(search_id, websocket_id, user_id, **kwargs)


    @staticmethod
    def make_search_solutions_call(all_params, websocket_id, user_id, **kwargs):
        """Return the result of a SearchSolutions call.
        If successful, an async process is kicked off"""
        if not websocket_id:
            return err_resp('websocket_id must be set')

        print('make_search_solutions_call 1')

        param_check = SearchSolutionsHelper.check_params(all_params)
        if not param_check.success:
            return param_check

        print('make_search_solutions_call 2')

        try:
            user_obj = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            user_msg = 'No user found for id: %s' % user_id
            return err_resp(user_msg)

        search_solution_params = all_params[ta2_static.KEY_SEARCH_SOLUTION_PARAMS]

        # --------------------------------
        # (2) Logging
        # --------------------------------
        stored_request = StoredRequest(\
                        user=user_obj,
                        # search_id=self.search_id,
                        workspace='(not specified)',
                        request_type=ta2_static.SEARCH_SOLUTIONS,
                        is_finished=False,
                        request=search_solution_params)
        stored_request.save()

        # --------------------------------
        # (2a) Behavioral logging
        # --------------------------------
        session_key = kwargs.get(SESSION_KEY, None)

        log_data = dict(session_key=session_key,
                        feature_id=ta2_static.SEARCH_SOLUTIONS,
                        activity_l1=bl_static.L1_MODEL_SELECTION,
                        activity_l2=bl_static.L2_MODEL_SEARCH,
                        other=search_solution_params)

        LogEntryMaker.create_ta2ta3_entry(user_obj, log_data)


        # 11/6/2019 - late night hack, these variables shouldn't be here
        #    - introduced somewhere in the .js when setting a  problem
        #
        search_solution_params.pop('id', None)
        search_solution_params.pop('session_key', None)

        # Run SearchSolutions against the TA2
        #
        search_info = search_solutions(search_solution_params)
        if not search_info.success:
            StoredResponse.add_err_response(stored_request,
                                            search_info.err_msg)
            return search_info

        print('make_search_solutions_call 2')

        search_info_json = json_loads(search_info.result_obj)
        if not search_info_json.success:
            StoredResponse.add_err_response(stored_request,
                                            search_info_json.err_msg)
            return search_info_json
        search_info_data = search_info_json.result_obj
        print('search_info_data', json_dumps(search_info_data)[1])

        print('make_search_solutions_call 3')

        if not ta2_static.KEY_SEARCH_ID in search_info_data:
            user_msg = 'searchId not found in the SearchSolutionsResponse'
            StoredResponse.add_err_response(stored_request,
                                            user_msg)
            return err_resp(user_msg)

        search_id = search_info_data['searchId']

        StoredResponse.add_success_response(stored_request,
                                            search_info_data,
                                            search_id=search_id)
        # Async task to run GetSearchSolutionsResults
        #
        extra_params = {SESSION_KEY: session_key}

        SearchSolutionsHelper.kick_off_solution_results.delay(\
                        search_id, websocket_id, user_id,
                        all_search_params=all_params,
                        **extra_params)

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

    def send_websocket_err_msg(self, grpc_call, user_msg='', pipeline_id=None):
        """Send an error messsage over websockets"""
        assert grpc_call, 'grpc_call is required'

        if pipeline_id:
            user_msg = '%s error; pipeline %s: %s' % \
                           (grpc_call,
                            pipeline_id,
                            user_msg)
        else:
            user_msg = '%s error: %s' % \
                           (grpc_call,
                            user_msg)


        # Send Websocket message
        #
        ws_msg = WebsocketMessage.get_fail_message(grpc_call, user_msg)
        ws_msg.send_message(self.websocket_id)

        # Log it
        #
        #LOGGER.info('SearchSolutionsHelper: %s', user_msg)

        # Add error to class
        #
        self.add_err_msg(user_msg)


    def run_get_search_solution_results(self):
        """Run SearchSolutions against a TA2"""

        # -----------------------------------
        # (1) make GRPC request object
        # -----------------------------------
        params_dict = dict(searchId=self.search_id)
        params_info = json_dumps(params_dict)
        if not params_info.success:
            self.send_websocket_err_msg(\
                    ta2_static.GET_SEARCH_SOLUTIONS_RESULTS,
                    params_info.err_msg)
            return

        try:
            grpc_req = Parse(params_info.result_obj,
                             core_pb2.GetSearchSolutionsResultsRequest())
        except ParseError as err_obj:
            err_msg = ('GetSearchSolutionsResultsRequest: Failed to'
                       ' convert JSON to gRPC: %s') % (err_obj)
            self.send_websocket_err_msg(\
                    ta2_static.GET_SEARCH_SOLUTIONS_RESULTS,
                    params_info.err_msg)
            return

        # --------------------------------
        # (2) Save the request to the db
        # --------------------------------
        stored_request = StoredRequest(\
                        user=self.user_object,
                        search_id=self.search_id,
                        workspace='(not specified)',
                        request_type=ta2_static.GET_SEARCH_SOLUTIONS_RESULTS,
                        is_finished=False,
                        request=params_dict)
        stored_request.save()

        # --------------------------------
        # (2a) Behavioral logging
        # --------------------------------
        log_data = dict(session_key=self.session_key,
                        feature_id=ta2_static.GET_SEARCH_SOLUTIONS_RESULTS,
                        activity_l1=bl_static.L1_MODEL_SELECTION,
                        activity_l2=bl_static.L2_MODEL_SEARCH,
                        other=params_dict)

        LogEntryMaker.create_ta2ta3_entry(self.user_object, log_data)

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
            for reply in core_stub.GetSearchSolutionsResults(\
                    grpc_req, timeout=settings.TA2_GRPC_LONG_TIMEOUT):

                msg_cnt += 1

                # -----------------------------------------------
                # Parse the response into JSON + store response
                # -----------------------------------------------
                msg_json_str = message_to_json(reply)
                msg_json_info = json_loads(msg_json_str)

                if not msg_json_info.success:
                    user_msg = 'Failed to convert response to JSON: %s' % \
                               msg_json_info.err_msg

                    self.send_websocket_err_msg(\
                                    ta2_static.GET_SEARCH_SOLUTIONS_RESULTS,
                                    user_msg)

                    StoredResponse.add_stream_err_response(\
                                        stored_response, user_msg)
                    # Wait for next response....
                    continue

                result_json = msg_json_info.result_obj

                # TA2s (specifically NYU) responds once when trying a new pipeline, with a message missing a solutionId
                # the same process responds again once the solution contains a solutionId
                print('results json from TA2')
                print(result_json)
                
                if not result_json.get('solutionId'):
                    continue

                if ta2_static.KEY_SOLUTION_ID not in result_json:
                    user_msg = '"%s" not found in response to JSON: %s' % \
                               (ta2_static.KEY_SOLUTION_ID, result_json)

                    StoredResponse.add_stream_err_response(\
                                        stored_response, user_msg)

                    self.send_websocket_err_msg(\
                                    ta2_static.GET_SEARCH_SOLUTIONS_RESULTS,
                                    user_msg)

                    # Wait for next response....
                    continue

                # Solution id used for DescribeSolution...
                #
                solution_id = result_json[ta2_static.KEY_SOLUTION_ID]

                # -----------------------------------------
                # Looks good, save the response
                # -----------------------------------------
                stored_resp_info = StoredResponse.add_stream_success_response(\
                                    stored_request, result_json)


                # -----------------------------------------
                # Tracking this in the behavioral log,
                #  e.g. checking time lapse between creation
                #   of solution and if user investigates this model,
                #  later, if at all
                # -----------------------------------------
                log_data = dict(session_key=self.session_key,
                                feature_id=ta2_static.GET_SEARCH_SOLUTIONS_RESULTS_RESPONSE,
                                activity_l1=bl_static.L1_MODEL_SELECTION,
                                activity_l2=bl_static.L2_MODEL_SEARCH,
                                other=result_json)

                LogEntryMaker.create_ta2ta3_entry(self.user_object, log_data)


                # -----------------------------------------
                # Make sure the response was saved (probably won't happen)
                # -----------------------------------------
                if not stored_resp_info.success:
                    # Not good but probably won't happen
                    # send a message to the user...
                    #
                    user_msg = 'Failed to store response from %s: %s' % \
                                (ta2_static.GET_SEARCH_SOLUTIONS_RESULTS,
                                 msg_json_info.err_msg)

                    StoredResponse.add_stream_err_response(\
                                        stored_response, user_msg)

                    self.send_websocket_err_msg(\
                                    ta2_static.GET_SEARCH_SOLUTIONS_RESULTS,
                                    user_msg)

                    # Wait for the next response...
                    continue

                # ---------------------------------------------
                # Looks good!  Get the StoredResponse
                # - This id will be used as the pipeline id
                # ---------------------------------------------
                stored_response = stored_resp_info.result_obj
                stored_response.use_id_as_pipeline_id()

                StoredResponse.add_stream_success_response(\
                                    stored_response, stored_response)

                # HACK: discard solutions with ranks
                # solutions with ranks are duplicates of streamed solutions that come after the search is complete... that are ranked
                stored_response_dict = stored_response.as_dict()
                # all_scores = [score for score_data in stored_response_dict['response']['scores'] for score in score_data['scores']]
                # if any(score['metric']['metric'] == "RANK" for score in all_scores):
                #     continue
                # -----------------------------------------------
                # send responses back to WebSocket
                # ---------------------------------------------
                ws_msg = WebsocketMessage.get_success_message(\
                            ta2_static.GET_SEARCH_SOLUTIONS_RESULTS,
                            'it worked',
                            msg_cnt=msg_cnt,
                            data=stored_response_dict)

                print('ws_msg: %s' % ws_msg)
                #print('ws_msg', ws_msg.as_dict())

                ws_msg.send_message(self.websocket_id)

                stored_response.mark_as_sent_to_user()
                print('msg received #%d' % msg_cnt)
                # -----------------------------------------------
                # continue the process describe/score/etc
                # -----------------------------------------------

                # DescribeSolution - run sync
                #
                self.run_describe_solution(stored_response.pipeline_id,
                                           solution_id,
                                           msg_cnt)


                # FitSolution - run async
                #
                print('PRE run_fit_solution')
                self.run_fit_solution(stored_response.pipeline_id,
                                      solution_id)
                print('POST run_fit_solution')

                print('PRE run_score_solution')
                self.run_score_solution(stored_response.pipeline_id,
                                        solution_id)
                print('POST run_score_solution')


            # -----------------------------------------------
            # All results arrived, send message to UI
            # -----------------------------------------------
            ws_msg = WebsocketMessage.get_success_message( \
                ta2_static.ENDGetSearchSolutionsResults,
                {'searchId': self.search_id, 'message': 'it worked'})

            print('ws_msg: %s' % ws_msg)
            ws_msg.send_message(self.websocket_id)


        except grpc.RpcError as err_obj:
            stored_request.set_error_status(str(err_obj))
            return

        except Exception as err_obj:
            stored_request.set_error_status(str(err_obj))
            return


        StoredRequestUtil.set_finished_ok_status(stored_request.id)


    def run_score_solution(self, pipeline_id, solution_id):
        """async: Run ScoreSolutionHelper"""

        if ta2_static.KEY_SCORE_SOLUTION_DEFAULT_PARAMS not in self.all_search_params:
            return
        # ----------------------------------
        # Create the input
        # ----------------------------------
        score_params = self.all_search_params[ta2_static.KEY_SCORE_SOLUTION_DEFAULT_PARAMS]
        score_params[ta2_static.KEY_SOLUTION_ID] = solution_id

        # ----------------------------------
        # Start the async process
        # ----------------------------------
        print('---- run_score_solution -----')
        ScoreSolutionHelper.make_score_solutions_call.delay(\
                                    pipeline_id,
                                    self.websocket_id,
                                    self.user_id,
                                    score_params,
                                    search_id=self.search_id,
                                    session_key=self.session_key)

    def run_fit_solution(self, pipeline_id, solution_id):
        """async: Run FitSolution and GetFitSolutionResults"""
        # ----------------------------------
        # Create the input
        # ----------------------------------
        fit_params = self.all_search_params[ta2_static.KEY_FIT_SOLUTION_DEFAULT_PARAMS]
        fit_params[ta2_static.KEY_SOLUTION_ID] = solution_id
        #fit_params.move_to_end(KEY_SOLUTION_ID, last=False)

        produce_params = self.all_search_params[ta2_static.KEY_PRODUCE_SOLUTION_DEFAULT_PARAMS]

        # ----------------------------------
        # Start the async process
        # ----------------------------------

        FitSolutionHelper.make_fit_solutions_call.delay(\
                            pipeline_id,
                            self.websocket_id,
                            self.user_id,
                            fit_params,
                            search_id=self.search_id,
                            produce_params=produce_params,
                            session_key=self.session_key
                            )


    def run_describe_solution(self, pipeline_id, solution_id, msg_cnt=-1):
        """sync: Run a DescribeSolution call for each solution_id"""
        print(f'run_describe_solution 1. pipeline_id: {pipeline_id}')
        # ----------------------------------
        # Create the input
        # ----------------------------------
        req_params = {ta2_static.KEY_SOLUTION_ID: solution_id}
        json_str_info = json_dumps(req_params)
        if not json_str_info.success:
            self.add_err_msg(json_str_info.err_msg)
            return

        json_str_input = json_str_info.result_obj

        # --------------------------------
        # (2) Save request
        # --------------------------------
        stored_request = StoredRequest(\
                        user=self.user_object,
                        search_id=self.search_id,
                        pipeline_id=pipeline_id,
                        workspace='(not specified)',
                        request_type=ta2_static.DESCRIBE_SOLUTION,
                        is_finished=False,
                        request=req_params)
        stored_request.save()

        # --------------------------------
        # (2a) Behavioral logging
        # --------------------------------
        log_data = dict(session_key=self.session_key,
                        feature_id=ta2_static.DESCRIBE_SOLUTION,
                        activity_l1=bl_static.L1_MODEL_SELECTION,
                        activity_l2=bl_static.L2_MODEL_SUMMARIZATION,
                        other=req_params)

        LogEntryMaker.create_ta2ta3_entry(self.user_object, log_data)


        print(f'run_describe_solution 2. stored_request.pipeline_id: {stored_request.pipeline_id}')

        # ----------------------------------
        # Run Describe Solution
        # ----------------------------------
        describe_info = describe_solution(json_str_input)
        if not describe_info.success:
            self.add_err_msg(describe_info.err_msg)
            StoredResponse.add_err_response(\
                                stored_request,
                                describe_info.err_msg)
            return

        # ----------------------------------
        # Parse the DescribeSolutionResponse
        # ----------------------------------
        describe_data_info = json_loads(describe_info.result_obj)
        if not describe_data_info.success:
            self.add_err_msg(describe_data_info.err_msg)
            StoredResponse.add_err_response(\
                                stored_request,
                                describe_data_info.err_msg)
            return

        # -----------------------------------------------
        # Add the pipline id to the result
        # -----------------------------------------------
        describe_data = describe_data_info.result_obj

        describe_data[ta2_static.KEY_PIPELINE_ID] = pipeline_id
        describe_data[ta2_static.KEY_SEARCH_ID] = self.search_id
        describe_data[ta2_static.KEY_SOLUTION_ID] = solution_id
        describe_data.move_to_end(ta2_static.KEY_PIPELINE_ID, last=False)

        # params = dict()
        # if not stored_request.pipeline_id:
        #    params['pipeline_id'] = describe_data[KEY_PIPELINE_ID]

        stored_info = StoredResponse.add_success_response(\
                                            stored_request,
                                            describe_data,
                                            pipeline_id=pipeline_id)

        if not stored_info.success:
            print('stored info fail!', stored_info.err_msg)

        print(f'run_describe_solution 3. stored_info.result_obj.pipeline_id: {stored_info.result_obj.pipeline_id}')

        print(f'run_describe_solution 4. stored_request.pipeline_id: {stored_request.pipeline_id}')


        # -----------------------------------------
        # Tracking this in the behavioral log,
        #  e.g. checking time lapse between creation
        #   of solution and if user investigates this model,
        #  later, if at all
        # -----------------------------------------
        log_data = dict(session_key=self.session_key,
                        feature_id=ta2_static.DESCRIBE_SOLUTION_RESPONSE,
                        activity_l1=bl_static.L1_MODEL_SELECTION,
                        activity_l2=bl_static.L2_MODEL_SEARCH,
                        other=describe_data)

        LogEntryMaker.create_ta2ta3_entry(self.user_object, log_data)


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
