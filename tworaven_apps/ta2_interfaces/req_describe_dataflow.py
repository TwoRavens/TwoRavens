"""
Code based on sample by Matthias Grabmair
    - https://gitlab.datadrivendiscovery.org/mgrabmair/ta3ta2-proxy
"""
import json
from google.protobuf.json_format import MessageToJson,\
    Parse, ParseError

from django.conf import settings

from tworaven_apps.utils import random_info
import dataflow_ext_pb2

from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.ta2_util import get_grpc_test_json,\
    get_failed_precondition_sess_response
from tworaven_apps.ta2_interfaces.models import KEY_USER_AGENT_FROM_UI

ERR_MSG_NO_USER_AGENT = 'A "%s" must be included in the request.' % KEY_USER_AGENT_FROM_UI

def describe_data_flow(raven_json_str=None):
    """
    Send a PipelineReference to the DescribeDataflow command
    """
    if raven_json_str is None:
        err_msg = 'No data found for the PipelineReference'
        return get_failed_precondition_sess_response(err_msg)

    # --------------------------------
    # The UI has sent JSON in string format that contains the PipelineReference
    # Make sure it's valid JSON
    # --------------------------------
    try:
        raven_dict = json.loads(raven_json_str)
    except json.decoder.JSONDecodeError as err_obj:
        err_msg = 'Failed to convert UI Str to JSON: %s' % (err_obj)
        return get_failed_precondition_sess_response(err_msg)

    # --------------------------------
    # convert the JSON string to a gRPC request
    # --------------------------------
    try:
        req = Parse(raven_json_str, dataflow_ext_pb2.PipelineReference())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        return get_failed_precondition_sess_response(err_msg)

    # In test mode, return canned response
    #
    if settings.TA2_STATIC_TEST_MODE:
        info_dict = dict(pipelineId=raven_dict.get('pipelineId'))
        return get_grpc_test_json('test_responses/describe_data_flow_ok.json',
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
        reply = dataflow_stub.DataflowDescription(req)
    except Exception as ex:
        return get_failed_precondition_sess_response(str(ex))


    # --------------------------------
    # Convert the reply to JSON and send it back
    # --------------------------------
    return MessageToJson(reply)



"""
python manage.py shell
from tworaven_apps.ta2_interfaces.ta2_proxy import *
start_session()
"""
