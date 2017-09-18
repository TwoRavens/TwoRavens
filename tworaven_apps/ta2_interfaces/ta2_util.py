"""
Code is courtesy of Matthias Grabmair
    - https://gitlab.datadrivendiscovery.org/mgrabmair/ta3ta2-proxy
"""
from tworaven_apps.ta2_interfaces import core_pb2
from google.protobuf.json_format import MessageToJson

def get_failed_precondition_response(err_msg):
    """Return a SessionResponse object in JSON format
        with status FAILED_PRECONDITION"""
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
