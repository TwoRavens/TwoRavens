"""
Initial code courtesy of Matthias Grabmair's example.
    - https://gitlab.datadrivendiscovery.org/mgrabmair/ta3ta2-proxy
"""
from django.conf import settings
import grpc
from tworaven_apps.ta2_interfaces import core_pb2
from tworaven_apps.ta2_interfaces import core_pb2_grpc as cpb_grpc
from tworaven_apps.ta2_interfaces import dataflow_ext_pb2_grpc as dataflow_grpc

## PARAMETERS
# ...to get things going
#settings.TA2_TEST_SERVER_URL = 'localhost:50051'

_GRPC_CORE_STUB = None
_GRPC_DATAFLOW_EXT_STUB = None

class TA2Connection(object):
    """For now, just return the CoreStub for a single TA2 connection"""
    def __init__(self):
        pass

    @staticmethod
    def get_protocol_version():
        """static attribute"""
        return core_pb2.DESCRIPTOR.GetOptions().Extensions[core_pb2.protocol_version]

    @staticmethod
    def get_grpc_stub():
        """Make sure the gRPC channel is initialized and return the CoreStub."""
        global _GRPC_CORE_STUB
        if _GRPC_CORE_STUB is not None:    # channel already initialized
            return _GRPC_CORE_STUB, None

        if not settings.TA2_TEST_SERVER_URL:
            """No server set!!!"""
            return None, ('No TA2 server url was found in'
                          ' the TwoRavens settings (see'
                          ' "TA2_TEST_SERVER_URL")')

        try:
            channel = grpc.insecure_channel(settings.TA2_TEST_SERVER_URL)
        except Exception as ex:
            return None, 'Could not initialize gRPC channel.(1) %s' % ex

        try:
            _GRPC_CORE_STUB = cpb_grpc.CoreStub(channel)
        except Exception as ex:
            return None, 'Could not initialize gRPC channel.(2) %s' % ex

        return _GRPC_CORE_STUB, None

    @staticmethod
    def get_grpc_dataflow_stub():
        """Make sure the gRPC channel is initialized and return the Dataflow CoreStub."""
        global _GRPC_DATAFLOW_EXT_STUB
        if _GRPC_DATAFLOW_EXT_STUB is not None:    # channel already initialized
            return _GRPC_DATAFLOW_EXT_STUB, None

        if not settings.TA2_TEST_SERVER_URL:
            """No server set!!!"""
            return None, ('No TA2 server url was found in'
                          ' the TwoRavens settings (see'
                          ' "TA2_TEST_SERVER_URL")')

        try:
            channel = grpc.insecure_channel(settings.TA2_TEST_SERVER_URL)
        except Exception as ex:
            return None, 'dataflow. Could not initialize gRPC channel.(1) %s' % ex

        try:
            _GRPC_DATAFLOW_EXT_STUB = dataflow_grpc.DataflowExtStub(channel)
        except Exception as ex:
            return None, 'dataflow. Could not initialize gRPC channel.(2) %s' % ex

        return _GRPC_DATAFLOW_EXT_STUB, None
