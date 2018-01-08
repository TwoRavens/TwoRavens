import json
from collections import OrderedDict

from django.conf import settings
from google.protobuf.json_format import MessageToJson,\
    Parse, ParseError

import core_pb2
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.ta2_util import get_grpc_test_json,\
    get_failed_precondition_response

def get_test_info_str():
    """Test data for update_problem_schema call"""
    return '''{"context": {"sessionId": "session_1"}'''

def list_pipelines(info_str=None):
    """Ask a TA2 to ListPipelines via gRPC"""
    if info_str is None:
        info_str = get_test_info_str()

    if info_str is None:
        err_msg = 'UI Str for PipelineListResult is None'
        return get_failed_precondition_response(err_msg)

    # --------------------------------
    # Is this valid JSON?
    # --------------------------------
    try:
        info_dict = json.loads(info_str, object_pairs_hook=OrderedDict)
    except json.decoder.JSONDecodeError as err_obj:
        err_msg = 'Failed to convert UI Str to JSON: %s' % (err_obj)
        return get_failed_precondition_response(err_msg)

    # --------------------------------
    # convert the JSON string to a gRPC request
    # --------------------------------
    try:
        req = Parse(info_str, core_pb2.PipelineListRequest())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        return get_failed_precondition_response(err_msg)

    if settings.TA2_STATIC_TEST_MODE:
        return get_grpc_test_json('test_responses/list_pipelines_ok.json',
                                  dict())

    # --------------------------------
    # Get the connection, return an error if there are channel issues
    # --------------------------------
    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        return get_failed_precondition_response(err_msg)

    # --------------------------------
    # Send the gRPC request - returns a stream
    # --------------------------------
    try:
        reply = core_stub.ListPipelines(req)
    except Exception as ex:
        return get_failed_precondition_response(str(ex))

    # --------------------------------
    # Convert the reply to JSON and send it back
    # --------------------------------
    return MessageToJson(reply)



"""
python manage.py shell
#from tworaven_apps.ta2_interfaces.ta2_proxy import *
from tworaven_apps.ta2_interfaces.update_problem_schema import update_problem_schema

updateproblemschema()
"""
