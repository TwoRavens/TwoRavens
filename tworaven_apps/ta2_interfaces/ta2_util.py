"""
Code is courtesy of Matthias Grabmair
    - https://gitlab.datadrivendiscovery.org/mgrabmair/ta3ta2-proxy
"""
from google.protobuf.json_format import MessageToJson

from django.conf import settings
from django.template.loader import render_to_string

from tworaven_apps.ta2_interfaces import core_pb2
from tworaven_apps.ta2_interfaces.models import KEY_GRPC_JSON



def get_grpc_test_json(grpc_json_file, info_dict={}):
    """Return gRPC JSON response"""
    json_str = render_to_string(grpc_json_file, info_dict)

    return json_str
    #return JsonResponse(json.loads(json_str), safe=False)


def get_grpc_content(request):
    """"Retrieve the GRPC content from the POST

    Returns either:
        (True, content text)
        (Fales, error message)
    """
    if not (request.POST and KEY_GRPC_JSON in request.POST):
        return False, 'Key "%s" not found' % KEY_GRPC_JSON

    return True, request.POST[KEY_GRPC_JSON]


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
