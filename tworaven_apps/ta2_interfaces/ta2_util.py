"""
Code is courtesy of Matthias Grabmair
    - https://gitlab.datadrivendiscovery.org/mgrabmair/ta3ta2-proxy
"""
from google.protobuf.json_format import MessageToJson
from django.conf import settings

from tworaven_apps.ta2_interfaces import core_pb2
from tworaven_apps.ta2_interfaces.models import GRPC_JSON_KEY


def get_grpc_content(request):
    """"Retrieve the GRPC content from the POST

    Returns either:
        (True, content text)
        (Fales, error message)
    """
    if not (request.POST and GRPC_JSON_KEY in request.POST):
        return False, 'Key "%s" not found' % GRPC_JSON_KEY

    return True, request.POST[GRPC_JSON_KEY]



def get_failed_precondition_response(err_msg):
    """Return a SessionResponse object in JSON format
        with status FAILED_PRECONDITION"""

    err_msg = '%s (ta2 server: %s)' % (err_msg, settings.TA2_TEST_SERVER_URL)

    grpc_resp = core_pb2.Response(\
                    status=core_pb2.Status(\
                        code=core_pb2.FAILED_PRECONDITION,
                        details=err_msg))

    return MessageToJson(grpc_resp)


def get_failed_precondition_sess_response(err_msg):
    """Return a SessionResponse object in JSON format
        with status FAILED_PRECONDITION"""

    grpc_resp = core_pb2.SessionResponse(\
                    response_info=core_pb2.Response(\
                        status=core_pb2.Status(\
                            code=core_pb2.FAILED_PRECONDITION,
                            details=err_msg)))

    return MessageToJson(grpc_resp)
