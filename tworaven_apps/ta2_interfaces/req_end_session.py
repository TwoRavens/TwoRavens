"""
"""
import json
import random, string

from google.protobuf.json_format import MessageToJson,\
    Parse, ParseError

from django.conf import settings
from tworaven_apps.ta2_interfaces import core_pb2
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.ta2_util import get_grpc_test_json,\
    get_failed_precondition_response
from tworaven_apps.ta2_interfaces.models import KEY_SESSION_ID_FROM_UI

ERR_NO_SESSION_ID = 'A "%s" must be included in the request.' % KEY_SESSION_ID_FROM_UI

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
    if not KEY_SESSION_ID_FROM_UI in raven_dict:
        return get_failed_precondition_response(ERR_NO_SESSION_ID)

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


    # In test mode, check if the incoming JSON is legit (in line above)
    # -- then return canned response below
    #
    if settings.TA2_STATIC_TEST_MODE:
        rnd_session_id = ''.join(random.choice(string.ascii_lowercase + string.digits)
                         for _ in range(7))
        tinfo = dict(session_id=rnd_session_id)
        #if random.randint(1, 3) == 3:
        #    return get_grpc_test_json('test_responses/endsession_badassertion.json')

        return get_grpc_test_json('test_responses/endsession_ok.json',
                                  tinfo)

    if settings.TA2_STATIC_TEST_MODE:
        rnd_session_id = ''.join(random.choice(string.ascii_lowercase + string.digits)
                         for _ in range(7))
        tinfo = dict(session_id=rnd_session_id)
        if random.randint(1, 3) == 3:
            return get_grpc_test_json(request, 'test_responses/endsession_badassertion.json')

        return get_grpc_test_json(request,
                                  'test_responses/endsession_ok.json',
                                  tinfo)

    # --------------------------------
    # Get the connection, return an error if there are channel issues
    # --------------------------------
    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        return get_failed_precondition_response(err_msg)

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
