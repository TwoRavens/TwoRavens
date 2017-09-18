"""
Code is courtesy of Matthias Grabmair
    - https://gitlab.datadrivendiscovery.org/mgrabmair/ta3ta2-proxy
"""
from tworaven_apps.ta2_interfaces import core_pb2
from google.protobuf.json_format import MessageToJson

def get_failed_precondition_error(err_msg):

    grpc_resp = get_non_server_session_response_error(\
                core_pb2.FAILED_PRECONDITION,
                err_msg)

    return MessageToJson(grpc_resp)

def get_non_server_session_response_error(grpc_status_code, err_msg):
    """Do we want to do this?"""

    return core_pb2.SessionResponse(\
                response_info=core_pb2.Response(\
                    status=core_pb2.Status(\
                        code=grpc_status_code,
                        details=err_msg)))
