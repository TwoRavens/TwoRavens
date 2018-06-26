"""
Code based on sample by Matthias Grabmair
    - https://gitlab.datadrivendiscovery.org/mgrabmair/ta3ta2-proxy
"""
import json
from google.protobuf.json_format import MessageToJson,\
    Parse, ParseError

from django.conf import settings

from tworaven_apps.utils.basic_response import (ok_resp, err_resp)
from tworaven_apps.utils import random_info
import core_pb2
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
#from tworaven_apps.ta2_interfaces.ta2_util import get_grpc_test_json,\
#    get_failed_precondition_sess_response
from tworaven_apps.ta2_interfaces.grpc_util import TA3TA2Util
from tworaven_apps.ta2_interfaces.ta2_util import get_grpc_test_json
from tworaven_apps.ta2_interfaces.static_vals import KEY_USER_AGENT_FROM_UI

ERR_MSG_NO_USER_AGENT = 'A "%s" must be included in the request.' % KEY_USER_AGENT_FROM_UI

def ta2_hello():
    """Hello. This is a "heartbeat" request for the TA2"""

    # --------------------------------
    # convert the JSON string to a gRPC request
    # for this call,this step is un-needed, just keeping it
    # in case things change...
    # --------------------------------
    try:
        req = Parse("{}", core_pb2.HelloRequest())
        #req = core_pb2.HelloRequest()
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        return err_resp(err_msg)

    content = MessageToJson(req, including_default_value_fields=True)
    print('content as JSON:\n', content)

    # In test mode, check if the incoming JSON is legit (in line above)
    # -- then return canned response
    #
    if settings.TA2_STATIC_TEST_MODE:

        info = dict(TA3TA2_API_VERSION=TA3TA2Util.get_api_version())
        resp_str = get_grpc_test_json(\
                        'test_responses/Hello_ok.json',
                        info)
        return ok_resp(resp_str)

    # --------------------------------
    # Get the connection, return an error if there are channel issues
    # --------------------------------
    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        return err_resp(err_msg)

    # --------------------------------
    # Send the gRPC request
    # --------------------------------
    try:
        reply = core_stub.Hello(req,
                                timeout=settings.TA2_GPRC_SHORT_TIMEOUT)
    except Exception as ex:
        return err_resp(str(ex))


    # --------------------------------
    # Convert the reply to JSON and send it back
    # --------------------------------
    user_msg_json = MessageToJson(reply, including_default_value_fields=True)

    return ok_resp(user_msg_json)


"""
python manage.py shell
from tworaven_apps.ta2_interfaces.ta2_proxy import *
start_session()
"""
