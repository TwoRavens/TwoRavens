"""
Code based on sample by Matthias Grabmair
    - https://gitlab.datadrivendiscovery.org/mgrabmair/ta3ta2-proxy
"""
import json
import random, string
from google.protobuf.json_format import MessageToJson,\
    Parse, ParseError

from django.conf import settings
from tworaven_apps.ta2_interfaces import core_pb2
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.ta2_util import get_grpc_test_json,\
    get_failed_precondition_sess_response
from tworaven_apps.ta2_interfaces.models import KEY_USER_AGENT_FROM_UI

ERR_MSG_NO_USER_AGENT = 'A "%s" must be included in the request.' % KEY_USER_AGENT_FROM_UI

def start_session(raven_json_str=None):
    """Start session command
    This command sends a UserAgent and the protocol version
    to the TA2 service
    """
    if raven_json_str is None:
        err_msg = 'No data found.  Please send a "user_agent"'
        return get_failed_precondition_sess_response(err_msg)
        # Default if the user_agent is not from the UI
        #raven_dict = dict(user_agent=settings.TA2_GPRC_USER_AGENT)

    # The UI has sent JSON in string format that contains the user_agent
    try:
        raven_dict = json.loads(raven_json_str)
    except json.decoder.JSONDecodeError as err_obj:
        err_msg = 'Failed to convert UI Str to JSON: %s' % (err_obj)
        return get_failed_precondition_sess_response(err_msg)

    # check for a user_agent
    #
    if not KEY_USER_AGENT_FROM_UI in raven_dict:
        return get_failed_precondition_sess_response(ERR_MSG_NO_USER_AGENT)

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


    # In test mode, check if the incoming JSON is legit (in line above)
    # -- then return canned response
    #
    if settings.TA2_STATIC_TEST_MODE:
        rnd_session_id = ''.join(random.choice(string.ascii_lowercase + string.digits)
                         for _ in range(7))
        d = dict(session_id=rnd_session_id)
        return get_grpc_test_json('test_responses/startsession_ok.json', d)

        #if random.randint(1,10) == 3:
        #    return get_grpc_test_json('test_responses/startsession_badassertion.json')
        #else:
        #    return get_grpc_test_json('test_responses/startsession_ok.json', d)


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
