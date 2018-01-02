import json
from collections import OrderedDict

from django.conf import settings
from google.protobuf.json_format import MessageToJson,\
    Parse, ParseError

import dataflow_ext_pb2
from tworaven_apps.ta2_interfaces.models import VAL_GRPC_STATE_CODE_NONE
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.ta2_util import get_grpc_test_json,\
    get_failed_precondition_response
#from tworaven_apps.ta2_interfaces.util_embed_results import FileEmbedUtil


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
    try:
        reply = dataflow_stub.GetDataflowResults(req)
    except Exception as ex:
        return get_failed_precondition_response(str(ex))


    if reply and str(reply) == VAL_GRPC_STATE_CODE_NONE:
        err_msg = ('Unkown gRPC state.'
                   ' (Was an GetDataflowResults request sent?)')
        return get_failed_precondition_response(err_msg)

    # --------------------------------
    # Convert the reply to JSON and send it on
    # --------------------------------
    results = map(MessageToJson, reply)
    result_str = '['+', '.join(results)+']'

    return result_str



"""
python manage.py shell
#from tworaven_apps.ta2_interfaces.ta2_proxy import *
from tworaven_apps.ta2_interfaces.update_problem_schema import update_problem_schema

updateproblemschema()
"""
