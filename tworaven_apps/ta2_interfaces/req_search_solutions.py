"""
send a gRPC SearchSolutions command
"""
import json

from django.conf import settings

from tworaven_apps.raven_auth.models import User

from tworaven_apps.utils.basic_response import (ok_resp, err_resp)
from tworaven_apps.utils.random_info import get_alphanumeric_string
from tworaven_apps.utils.json_helper import json_dumps, json_loads
from tworaven_apps.utils.view_helper import SESSION_KEY
from tworaven_apps.utils.proto_util import message_to_json

from tworaven_apps.ta2_interfaces.models import StoredRequest, StoredResponse
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.ta2_util import get_grpc_test_json


from tworaven_apps.ta2_interfaces import static_vals as ta2_static
from tworaven_apps.behavioral_logs.log_entry_maker import LogEntryMaker
from tworaven_apps.behavioral_logs import static_vals as bl_static

import core_pb2
#import core_pb2_grpc


from google.protobuf.json_format import \
    (Parse, ParseError)

def search_solutions(raven_json_str=None):
    """
    Send a SearchSolutionsRequest to the SearchSolutions command
    """
    print('raven_json_str', raven_json_str)
    if raven_json_str is None:
        err_msg = 'No data found for the SearchSolutionsRequest'
        return err_resp(err_msg)

    # This is a dict or OrderedDict, make it a json string
    #
    if isinstance(raven_json_str, dict):
        json_str_info = json_dumps(raven_json_str)
        if not json_str_info.success:
            return json_str_info

        raven_json_str = json_str_info.result_obj

    else:
        # Make sure the string is valid JSON
        #
        raven_json_info = json_loads(raven_json_str)
        if not raven_json_info.success:
            return err_resp(raven_json_info.err_msg)

    print('SearchSolutionsRequest (string)', raven_json_str)

    # --------------------------------
    # convert the JSON string to a gRPC request
    # --------------------------------
    try:
        req = Parse(raven_json_str, core_pb2.SearchSolutionsRequest())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        return err_resp(err_msg)

    print('req', req)
    print('-' * 40)
    print('raven_json_str', raven_json_str)
    print('-' * 40)

    # In test mode, return canned response
    #
    if settings.TA2_STATIC_TEST_MODE:
        search_id = 'search_id_%s' % get_alphanumeric_string(6)
        resp = core_pb2.SearchSolutionsResponse(search_id=search_id)

        # print('message_to_json(req)', message_to_json(resp))

        return ok_resp(message_to_json(resp))

    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        return err_resp(err_msg)

    # --------------------------------
    # Send the gRPC request
    # --------------------------------
    try:
        reply = core_stub.SearchSolutions(\
                            req,
                            timeout=settings.TA2_GRPC_SHORT_TIMEOUT)
    except Exception as err_obj:
        return err_resp(str(err_obj))

    # --------------------------------
    # Convert the reply to JSON and send it back
    # --------------------------------
    return ok_resp(message_to_json(reply))


def end_search_solutions(raven_json_str=None, **kwargs):
    """
    Send a EndSearchSolutionsRequest to the EndSearchSolutions command

    optional kwargs:

    user = User object for logging
    """
    if raven_json_str is None:
        err_msg = 'No data found for the EndSearchSolutionsRequest'
        return err_resp(err_msg)

    # --------------------------------
    # Make sure it's valid JSON
    # --------------------------------
    raven_json_info = json_loads(raven_json_str)
    if not raven_json_info.success:
        return err_resp(raven_json_info.err_msg)

    if not ta2_static.KEY_SEARCH_ID in raven_json_info.result_obj:
        err_msg = (f'The send solutions request did not include'
                   f' a "{ta2_static.KEY_SEARCH_ID}" key')
        return err_resp(err_msg)

    search_id = raven_json_info.result_obj[ta2_static.KEY_SEARCH_ID]

    # --------------------------------
    # optional logging
    # --------------------------------
    user = kwargs.get('user')
    stored_request = None
    # Begin to log D3M call
    #
    if user:
        stored_request = StoredRequest(\
                            user=user,
                            request_type=ta2_static.END_SEARCH_SOLUTIONS,
                            search_id=search_id,
                            is_finished=False,
                            request=raven_json_info.result_obj)

        stored_request.save()


    # --------------------------------
    # convert the JSON string to a gRPC request
    # --------------------------------
    try:
        req = Parse(raven_json_str, core_pb2.EndSearchSolutionsRequest())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        return err_resp(err_msg)

    # In test mode, return canned response
    #
    if settings.TA2_STATIC_TEST_MODE:
        resp = core_pb2.EndSearchSolutionsResponse()

        # print('message_to_json(req)', message_to_json(resp))

        return ok_resp(message_to_json(resp))

    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        return err_resp(err_msg)

    # --------------------------------
    # Send the gRPC request
    # --------------------------------
    try:
        reply = core_stub.EndSearchSolutions(\
                            req,
                            timeout=settings.TA2_GRPC_SHORT_TIMEOUT)
    except Exception as err_obj:
        return err_resp(str(err_obj))

    # --------------------------------
    # Convert the reply to JSON and send it back
    # --------------------------------

    # This returns a JSON string
    reply_json_str = message_to_json(reply)

    # Double-check, make sure it converts back to a python dict
    #
    json_format_info = json_loads(reply_json_str)
    if not json_format_info.success:
        if user:
            StoredResponse.add_err_response(stored_request,
                                            json_format_info.err_msg)
        return err_resp(json_format_info.err_msg)

    # Looks good, save response and return value
    #
    if user:
        StoredResponse.add_success_response(stored_request,
                                            json_format_info.result_obj)

    return ok_resp(json_format_info.result_obj)




def stop_search_solutions(raven_json_str=None, **kwarg):
    """
    Send a StopSearchSolutionsRequest to the StopSearchSolutions command
    """
    if raven_json_str is None:
        err_msg = 'No data found for the StopSearchSolutionsRequest'
        return err_resp(err_msg)

    # --------------------------------
    # Make sure it's valid JSON
    # --------------------------------
    raven_json_info = json_loads(raven_json_str)
    if not raven_json_info.success:
        return err_resp(raven_json_info.err_msg)

    # --------------------------------
    # convert the JSON string to a gRPC request
    # --------------------------------
    try:
        req = Parse(raven_json_str,
                    core_pb2.StopSearchSolutionsRequest())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        return err_resp(err_msg)

    # In test mode, return canned response
    #
    if settings.TA2_STATIC_TEST_MODE:
        resp = core_pb2.StopSearchSolutionsResponse()
        return ok_resp(message_to_json(resp))

    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        return err_resp(err_msg)

    # --------------------------------
    # Send the gRPC request
    # --------------------------------
    try:
        reply = core_stub.StopSearchSolutions(\
                            req,
                            timeout=settings.TA2_GRPC_SHORT_TIMEOUT)
    except Exception as err_obj:
        return err_resp(str(err_obj))

    # --------------------------------
    # Convert the reply to JSON and send it back
    # --------------------------------
    return ok_resp(message_to_json(reply))



def describe_solution(raven_json_str=None):
    """
    Send a DescribeSolutionRequest to the DescribeSolution command
    """
    if raven_json_str is None:
        err_msg = 'No data found for the DescribeSolutionRequest'
        return err_resp(err_msg)

    # --------------------------------
    # Make sure it's valid JSON
    # --------------------------------
    raven_json_info = json_loads(raven_json_str)
    if not raven_json_info.success:
        return err_resp(raven_json_info.err_msg)

    # --------------------------------
    # convert the JSON string to a gRPC request
    # --------------------------------
    try:
        req = Parse(raven_json_str,
                    core_pb2.DescribeSolutionRequest())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        return err_resp(err_msg)

    # In test mode, return canned response
    #
    if settings.TA2_STATIC_TEST_MODE:
        resp_str = get_grpc_test_json(\
                        'test_responses/DescribeSolutionResponse_ok.json',
                        dict())
        return ok_resp(resp_str)

    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        return err_resp(err_msg)

    # --------------------------------
    # Send the gRPC request
    # --------------------------------
    try:
        reply = core_stub.DescribeSolution(\
                            req,
                            timeout=settings.TA2_GRPC_FAST_TIMEOUT)
    except Exception as err_obj:
        return err_resp(str(err_obj))

    # --------------------------------
    # Convert the reply to JSON and send it back
    # --------------------------------
    return ok_resp(message_to_json(reply))


def score_solution(raven_json_str=None):
    """
    Send a ScoreSolutionRequest to the ScoreSolution command
    """
    if raven_json_str is None:
        err_msg = 'No data found for the ScoreSolutionRequest'
        return err_resp(err_msg)

    # --------------------------------
    # Make sure it's valid JSON
    # --------------------------------
    raven_json_info = json_loads(raven_json_str)
    if not raven_json_info.success:
        return err_resp(raven_json_info.err_msg)

    print('ScoreSolutionRequest', raven_json_str)
    # --------------------------------
    # convert the JSON string to a gRPC request
    # --------------------------------
    try:
        req = Parse(raven_json_str,
                    core_pb2.ScoreSolutionRequest())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        return err_resp(err_msg)

    # In test mode, return canned response
    #
    if settings.TA2_STATIC_TEST_MODE:
        resp = core_pb2.ScoreSolutionResponse(\
                    request_id='requestId_%s' % get_alphanumeric_string(6))

        return ok_resp(message_to_json(resp))

    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        return err_resp(err_msg)

    # --------------------------------
    # Send the gRPC request
    # --------------------------------
    try:
        reply = core_stub.ScoreSolution(\
                            req,
                            timeout=settings.TA2_GRPC_SHORT_TIMEOUT)
    except Exception as err_obj:
        return err_resp(str(err_obj))

    # --------------------------------
    # Convert the reply to JSON and send it back
    # --------------------------------
    return ok_resp(message_to_json(reply))


def fit_solution(raven_json_str=None):
    """
    Send a FitSolutionRequest to the FitSolution command
    """
    if raven_json_str is None:
        err_msg = 'No data found for the FitSolutionRequest'
        return err_resp(err_msg)

    # --------------------------------
    # Make sure it's valid JSON
    # --------------------------------
    raven_json_info = json_loads(raven_json_str)
    if not raven_json_info.success:
        return err_resp(raven_json_info.err_msg)

    # --------------------------------
    # convert the JSON string to a gRPC request
    # --------------------------------
    try:
        req = Parse(raven_json_str,
                    core_pb2.FitSolutionRequest())
    except ParseError as err_obj:
        err_msg = ('Failed to convert JSON to gRPC: %s'
                   ' (req_search_solutions)'
                   '\nraven_json_str: %s') % \
                   (err_obj, raven_json_str)
        print('-' * 40)
        print(err_msg)
        return err_resp(err_msg)

    # In test mode, return canned response
    #
    if settings.TA2_STATIC_TEST_MODE:
        resp = core_pb2.FitSolutionResponse(\
                    request_id='requestId_%s' % get_alphanumeric_string(6))

        return ok_resp(message_to_json(resp))

    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        return err_resp(err_msg)

    # --------------------------------
    # Send the gRPC request
    # --------------------------------
    try:
        reply = core_stub.FitSolution(\
                            req,
                            timeout=settings.TA2_GRPC_SHORT_TIMEOUT)
    except Exception as err_obj:
        return err_resp(str(err_obj))

    # --------------------------------
    # Convert the reply to JSON and send it back
    # --------------------------------
    return ok_resp(message_to_json(reply))


def produce_solution(raven_json_str=None, **kwargs):
    """
    Send a ProduceSolutionRequest to the ProduceSolution command
    """
    if raven_json_str is None:
        err_msg = 'No data found for the ProduceSolutionRequest'
        return err_resp(err_msg)

    is_partials_call = kwargs.get('is_partials_call', False)

    # --------------------------------
    # Make sure it's valid JSON
    # --------------------------------
    raven_json_info = json_loads(raven_json_str)
    if not raven_json_info.success:
        return err_resp(raven_json_info.err_msg)

    # --------------------------------
    # convert the JSON string to a gRPC request
    # --------------------------------
    try:
        req = Parse(raven_json_str,
                    core_pb2.ProduceSolutionRequest())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        return err_resp(err_msg)

    # In test mode, return canned response
    #
    if settings.TA2_STATIC_TEST_MODE:
        resp = core_pb2.ProduceSolutionResponse(\
                    request_id='requestId_%s' % get_alphanumeric_string(6))

        return ok_resp(message_to_json(resp))

    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        return err_resp(err_msg)

    # --------------------------------
    # Send the gRPC request
    # --------------------------------
    try:
        reply = core_stub.ProduceSolution(\
                            req,
                            timeout=settings.TA2_GRPC_SHORT_TIMEOUT)
    except Exception as err_obj:
        return err_resp(str(err_obj))

    # --------------------------------
    # Convert the reply to JSON and send it back
    # --------------------------------
    return ok_resp(message_to_json(reply))


def solution_export_with_saved_response(raven_json):
    """
    Send a SolutionExportRequest to the SolutionExport command
    example input: {"piplineId ": 3990, "rank": 3}
        piplineId - SavedResponse.pipeline_id, used to get the fittedSolutionId
        rank - Used for a call to a TA2
    """
    if not isinstance(raven_json, dict):
        err_msg = ('"raven_json" for the SolutionExportRequest must'
                   ' be a dict')
        return err_resp(err_msg)

    if not ta2_static.KEY_PIPELINE_ID in raven_json:
        err_msg = ('The key "%s" must be included for the'
                   ' SolutionExportRequest--in order to find'
                   ' the SavedResponse') % (ta2_static.KEY_PIPELINE_ID,)
        return err_resp(err_msg)

    if not ta2_static.KEY_RANK in raven_json:
        err_msg = ('The key "%s" must be included for the'
                   ' SolutionExportRequest') % (ta2_static.KEY_RANK,)
        return err_resp(err_msg)

    # Filtering params
    # - decision here not to use 'sent_to_user' which would id the right
    #   entry but may be changed in the future
    #
    params = dict(pipeline_id=raven_json[ta2_static.KEY_PIPELINE_ID],
                  stored_request__request_type=ta2_static.GET_FIT_SOLUTION_RESULTS,
                  is_finished=True)

    # Go through the results, looking for one with a fittedSolutionId
    #
    fitted_solution_id = None
    for saved_resp in StoredResponse.objects.filter(**params):
        info = saved_resp.get_value_by_key(ta2_static.KEY_FITTED_SOLUTION_ID)
        if info.success:
            fitted_solution_id = info.result_obj
            break

    # Nothing found
    #
    if not fitted_solution_id:
        user_msg = ('A StoredResponse containing a "%s"'
                    ' was not found for %s "%s".') % \
                    (ta2_static.KEY_FITTED_SOLUTION_ID,
                     ta2_static.KEY_PIPELINE_ID,
                     raven_json[ta2_static.KEY_PIPELINE_ID])

        return err_resp(user_msg)

    # Got it, prepare info for the TA2 call
    #
    params = {ta2_static.KEY_FITTED_SOLUTION_ID: fitted_solution_id,
              ta2_static.KEY_RANK: raven_json[ta2_static.KEY_RANK]}

    json_info = json_dumps(params)
    if not json_info.success:
        user_msg = ('Failed to convert params dict to JSON to string: %s') % \
                    (json_info.err_msg,)
        return err_resp(user_msg)

    return solution_export(json_info.result_obj)



def solution_export(raven_json_str=None):
    """
    Send a SolutionExportRequest to the SolutionExport command
    """
    if raven_json_str is None:
        err_msg = 'No data found for the SolutionExportRequest'
        return err_resp(err_msg)

    # --------------------------------
    # Make sure it's valid JSON
    # --------------------------------
    raven_json_info = json_loads(raven_json_str)
    if not raven_json_info.success:
        return err_resp(raven_json_info.err_msg)

    # --------------------------------
    # convert the JSON string to a gRPC request
    # --------------------------------
    try:
        req = Parse(raven_json_str,
                    core_pb2.SolutionExportRequest())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        return err_resp(err_msg)

    # In test mode, return canned response
    #
    if settings.TA2_STATIC_TEST_MODE:
        resp = core_pb2.SolutionExportResponse()

        return ok_resp(message_to_json(resp))

    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        return err_resp(err_msg)

    # --------------------------------
    # Send the gRPC request
    # --------------------------------
    try:
        reply = core_stub.SolutionExport(\
                            req,
                            timeout=settings.TA2_GRPC_SHORT_TIMEOUT)
    except Exception as err_obj:
        return err_resp(str(err_obj))

    # --------------------------------
    # Convert the reply to JSON and send it back
    # --------------------------------
    return ok_resp(message_to_json(reply))



def solution_export3(user, raven_json, **kwargs):
    """
    Send a SolutionExportRequest to the SolutionExport command
    """
    if not isinstance(user, User):
        err_msg = '"user" must be a User object'
        return err_resp(err_msg)

    if not isinstance(raven_json, dict):
        err_msg = 'raven_dict must be a python dict'
        return err_resp(err_msg)

    if not ta2_static.KEY_SEARCH_ID in raven_json:
        err_msg = (f'Key: "{ta2_static.KEY_SEARCH_ID}" not found in the'
                   f' "raven_json" dict.  (solution_export3)')
        return err_resp(err_msg)

    search_id = raven_json.pop(ta2_static.KEY_SEARCH_ID)   # not needed for GRPC call

    session_key = kwargs.get(SESSION_KEY, '')

    # --------------------------------
    # Convert dict to string
    # --------------------------------
    raven_json_info = json_dumps(raven_json)
    if not raven_json_info.success:
        return err_resp(raven_json_info.err_msg)

    raven_json_str = raven_json_info.result_obj

    # --------------------------------
    # convert the JSON string to a gRPC request
    # --------------------------------
    try:
        req = Parse(raven_json_str,
                    core_pb2.SolutionExportRequest())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        return err_resp(err_msg)

    # In test mode, return canned response
    #
    if settings.TA2_STATIC_TEST_MODE:
        resp = core_pb2.SolutionExportResponse()

        return ok_resp(message_to_json(resp))

    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        return err_resp(err_msg)

    # --------------------------------
    # Save the request to the db
    # --------------------------------
    stored_request = StoredRequest(\
                    user=user,
                    search_id=search_id,
                    workspace='(not specified)',
                    request_type=ta2_static.SOLUTION_EXPORT,
                    is_finished=False,
                    request=raven_json)
    stored_request.save()

    # --------------------------------
    # Behavioral logging
    # --------------------------------
    log_data = dict(session_key=session_key,
                    feature_id=ta2_static.SOLUTION_EXPORT,
                    activity_l1=bl_static.L1_MODEL_SELECTION,
                    activity_l2=bl_static.L2_MODEL_EXPORT,
                    other=raven_json)

    LogEntryMaker.create_ta2ta3_entry(user, log_data)


    # --------------------------------
    # Send the gRPC request
    # --------------------------------
    try:
        reply = core_stub.SolutionExport(\
                            req,
                            timeout=settings.TA2_GRPC_SHORT_TIMEOUT)
    except Exception as err_obj:
        user_msg = f'Error: {err_obj}'
        StoredResponse.add_err_response(stored_request,
                                        user_msg)

        return err_resp(user_msg)

    # --------------------------------
    # Convert the reply to JSON and send it back
    # --------------------------------
    resp_json_str = message_to_json(reply)

    resp_json_dict_info = json_loads(resp_json_str)
    if not resp_json_dict_info.success:
        user_msg = (f'Failed to convert GRPC response to JSON:'
                    f' {resp_json_dict_info.err_msg}')
        StoredResponse.add_err_response(stored_request,
                                        user_msg)
        return err_resp(user_msg)


    StoredResponse.add_success_response(stored_request,
                                        resp_json_dict_info.result_obj)

    return ok_resp(resp_json_str)


def update_problem(raven_json_str=None):
    """
    Send a UpdateProblemRequest to the UpdateProblem command
    """
    if raven_json_str is None:
        err_msg = 'No data found for the UpdateProblemRequest'
        return err_resp(err_msg)

    # --------------------------------
    # Make sure it's valid JSON
    # --------------------------------
    raven_json_info = json_loads(raven_json_str)
    if not raven_json_info.success:
        return err_resp(raven_json_info.err_msg)

    # --------------------------------
    # convert the JSON string to a gRPC request
    # --------------------------------
    try:
        req = Parse(raven_json_str,
                    core_pb2.UpdateProblemRequest())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        return err_resp(err_msg)

    # In test mode, return canned response
    #
    if settings.TA2_STATIC_TEST_MODE:
        resp = core_pb2.UpdateProblemResponse()

        return ok_resp(message_to_json(resp))

    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        return err_resp(err_msg)

    # --------------------------------
    # Send the gRPC request
    # --------------------------------
    try:
        reply = core_stub.UpdateProblem(\
                            req,
                            timeout=settings.TA2_GRPC_SHORT_TIMEOUT)
    except Exception as err_obj:
        return err_resp(str(err_obj))

    # --------------------------------
    # Convert the reply to JSON and send it back
    # --------------------------------
    return ok_resp(message_to_json(reply))



def list_primitives():
    """
    Send a ListPrimitivesRequest to the ListPrimitives command
    """
    # --------------------------------
    # convert the JSON string to a gRPC request
    # --------------------------------
    try:
        req = Parse("{}", core_pb2.ListPrimitivesRequest())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        return err_resp(err_msg)

    # In test mode, return canned response
    #
    if settings.TA2_STATIC_TEST_MODE:
        resp_str = get_grpc_test_json(\
                        'test_responses/ListPrimitivesResponse_ok.json',
                        dict())
        return ok_resp(resp_str)

    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        return err_resp(err_msg)

    # --------------------------------
    # Send the gRPC request
    # --------------------------------
    try:
        reply = core_stub.ListPrimitives(\
                            req,
                            timeout=settings.TA2_GRPC_SHORT_TIMEOUT)
    except Exception as err_obj:
        return err_resp(str(err_obj))

    # --------------------------------
    # Convert the reply to JSON and send it back
    # --------------------------------
    return ok_resp(message_to_json(reply))
