"""
send a gRPC SearchSolutions command
"""
import json

from django.conf import settings

from tworaven_apps.utils.basic_response import (ok_resp, err_resp)
from tworaven_apps.utils.random_info import get_alphanumeric_string
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection

import core_pb2
import core_pb2_grpc

from google.protobuf.json_format import \
    (MessageToJson, Parse, ParseError)

def search_solutions(raven_json_str=None):
    """
    Send a SearchSolutionsRequest to the SearchSolutions command
    """
    if raven_json_str is None:
        err_msg = 'No data found for the SearchSolutionsRequest'
        return err_resp(err_msg)

    # --------------------------------
    # The UI has sent JSON in string format that contains the PipelineReference
    # Make sure it's valid JSON
    # --------------------------------
    try:
        json.loads(raven_json_str)
    except json.decoder.JSONDecodeError as err_obj:
        err_msg = 'Failed to convert UI Str to JSON: %s' % (err_obj)
        return err_resp(err_msg)

    # --------------------------------
    # convert the JSON string to a gRPC request
    # --------------------------------
    try:
        req = Parse(raven_json_str, core_pb2.SearchSolutionsRequest())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        return err_resp(err_msg)

    # In test mode, return canned response
    #
    if settings.TA2_STATIC_TEST_MODE:
        search_id = 'search_id_%s' % get_alphanumeric_string(6)
        resp = core_pb2.SearchSolutionsResponse(search_id=search_id)

        print('MessageToJson(req)', MessageToJson(resp))

        return ok_resp(MessageToJson(resp))

    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        return err_resp(err_msg)

    # --------------------------------
    # Send the gRPC request
    # --------------------------------
    try:
        reply = core_stub.SearchSolutions(\
                            req,
                            timeout=settings.TA2_GPRC_SHORT_TIMEOUT)
    except Exception as err_obj:
        return err_resp(str(err_obj))

    # --------------------------------
    # Convert the reply to JSON and send it back
    # --------------------------------
    return ok_resp(MessageToJson(reply, including_default_value_fields=True))
