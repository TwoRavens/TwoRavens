"""
Code is courtesy of Matthias Grabmair
    - https://gitlab.datadrivendiscovery.org/mgrabmair/ta3ta2-proxy
"""
import json

from django.conf import settings
from tworaven_apps.ta2_interfaces import core_pb2
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.ta2_util import get_failed_precondition_response
from google.protobuf.json_format import MessageToJson,\
    Parse, ParseError


def end_session(raven_json_str):
    """end session command
    This command needs a session id from the start_session cmd
    e.g. string: '{"session_id" : "123556"}'
    """
    # The UI has sent JSON in string format that contains the session_id
    try:
        raven_dict = json.loads(raven_json_str)
    except json.decoder.JSONDecodeError as err_obj:
        err_msg = 'Failed to convert UI Str to JSON for end_session: %s' % (err_obj)
        return get_failed_precondition_response(err_msg)

    # The protocol version always comes from the latest
    # version we have in the repo (just copied in for now)
    #
    if not 'session_id' in raven_dict:
        err_msg = 'No session_id found: %s' % (raven_json_str)
        return get_failed_precondition_response(err_msg)

    # --------------------------------
    # Convert back to string for TA2 call
    # --------------------------------
    content = json.dumps(raven_dict)

    # --------------------------------
    # convert the JSON string to a gRPC request
    # --------------------------------
    try:
        req = Parse(content, core_pb2.SessionContext())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        return get_failed_precondition_response(err_msg)


    # --------------------------------
    # Get the connection, return an error if there are channel issues
    # --------------------------------
    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        return get_failed_precondition_response(err_msg)

        #return dict(status=core_pb2.FAILED_PRECONDITION,
        #            details=err_msg)

    # --------------------------------
    # Send the gRPC request
    # --------------------------------
    try:
        reply = core_stub.EndSession(req)
    except Exception as ex:
        return get_failed_precondition_response(str(ex))


    # --------------------------------
    # Convert the reply to JSON and send it back
    # --------------------------------
    return MessageToJson(reply)



"""
python manage.py shell
from tworaven_apps.ta2_interfaces.ta2_proxy import *
start_session()
"""
