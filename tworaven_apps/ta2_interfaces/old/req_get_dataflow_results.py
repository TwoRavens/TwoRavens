import json
from collections import OrderedDict

from django.conf import settings
from google.protobuf.json_format import MessageToJson,\
    Parse, ParseError

import grpc
import dataflow_ext_pb2
from tworaven_apps.ta2_interfaces.models import VAL_GRPC_STATE_CODE_NONE
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.ta2_util import \
    (get_grpc_test_json,
     get_reply_exception_response,
     get_failed_precondition_response)
from tworaven_apps.ta2_interfaces.util_message_formatter import MessageFormatter


def get_data_flow_results(info_str=None):
    """Ask a TA2 to GetDataflowResults via gRPC"""
    if info_str is None:
        err_msg = 'UI Str for PipelineReference is None'
        return get_failed_precondition_response(err_msg)

    # --------------------------------
    # Is this valid JSON?
    # --------------------------------
    try:
        raven_dict = json.loads(info_str, object_pairs_hook=OrderedDict)
    except json.decoder.JSONDecodeError as err_obj:
        err_msg = 'Failed to convert UI Str to JSON: %s' % (err_obj)
        return get_failed_precondition_response(err_msg)

    # --------------------------------
    # convert the JSON string to a gRPC request
    # --------------------------------
    try:
        req = Parse(info_str, dataflow_ext_pb2.PipelineReference())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        return get_failed_precondition_response(err_msg)


    # In test mode, return canned response
    #
    if settings.TA2_STATIC_TEST_MODE:
        info_dict = dict(pipelineId=raven_dict.get('pipelineId'))
        return get_grpc_test_json('test_responses/get_dataflow_results_ok.json',
                                  info_dict)

    # --------------------------------
    # Get the connection, return an error if there are channel issues
    # --------------------------------
    dataflow_stub, err_msg = TA2Connection.get_grpc_dataflow_stub()
    if err_msg:
        return get_failed_precondition_sess_response(err_msg)

    # --------------------------------
    # Send the gRPC request
    # --------------------------------
    messages = []
    try:
        for reply in dataflow_stub.GetDataflowResults(req):
            user_msg = MessageToJson(reply, including_default_value_fields=True)
            messages.append(user_msg)
            print('msg received #%d' % len(messages))
    except grpc.RpcError as ex:
        return get_reply_exception_response(str(ex))
    except Exception as ex:
        return get_reply_exception_response(str(ex))

    success, return_str = MessageFormatter.format_messages(\
                                    messages,
                                    embed_data=False)

    if success is False:
        return get_reply_exception_response(return_str)

    return return_str


"""
python manage.py shell
#from tworaven_apps.ta2_interfaces.ta2_proxy import *
from tworaven_apps.ta2_interfaces.update_problem_schema import update_problem_schema

updateproblemschema()
"""
