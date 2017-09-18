"""
Code is courtesy of Matthias Grabmair
    - https://gitlab.datadrivendiscovery.org/mgrabmair/ta3ta2-proxy
"""
import json

from django.conf import settings
from tworaven_apps.ta2_interfaces import core_pb2
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.ta2_util import get_failed_precondition_sess_response
from google.protobuf.json_format import MessageToJson,\
    Parse, ParseError


def start_session(raven_json_str=None):
    """Start session command
    This command sends a UserAgent and the protocol version
    to the TA2 service
    """
    if raven_json_str is None:
        # Default if the user_agent is not from the UI
        raven_dict = dict(user_agent=settings.TA2_GPRC_USER_AGENT)
    else:
        # The UI has sent JSON in string format that contains the user_agent
        try:
            raven_dict = json.loads(raven_json_str)
        except json.decoder.JSONDecodeError as err_obj:
            err_msg = 'Failed to convert UI Str to JSON: %s' % (err_obj)
            return get_failed_precondition_sess_response(err_msg)

    # The protocol version always comes from the latest
    # version we have in the repo (just copied in for now)
    #
    raven_dict['version'] = TA2Connection.get_protocol_version()

    # --------------------------------
    # Convert back to string for TA2 call
    # --------------------------------
    content = json.dumps(raven_dict)

    # --------------------------------
    # convert the JSON string to a gRPC request
    # --------------------------------
    try:
        req = Parse(content, core_pb2.SessionRequest())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        return get_failed_precondition_sess_response(err_msg)


    # --------------------------------
    # Get the connection, return an error if there are channel issues
    # --------------------------------
    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        return get_failed_precondition_sess_response(err_msg)

        #return dict(status=core_pb2.FAILED_PRECONDITION,
        #            details=err_msg)

    # --------------------------------
    # Send the gRPC request
    # --------------------------------
    try:
        reply = core_stub.StartSession(req)
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
