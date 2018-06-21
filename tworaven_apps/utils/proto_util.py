"""wrapping some grpc calls with common options"""
from google.protobuf.json_format import MessageToJson, Parse, ParseError


def message_to_json(grpc_msg):
    """Wrap the grpc MessageToJson"""
    return MessageToJson(grpc_msg,
                         including_default_value_fields=True)
