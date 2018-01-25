import json
from collections import OrderedDict
from django.conf import settings
from google.protobuf.json_format import MessageToJson,\
    Parse, ParseError

import grpc
import core_pb2
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.ta2_util import get_grpc_test_json,\
    get_failed_precondition_response,\
    get_reply_exception_response,\
    get_predict_file_info_dict
from tworaven_apps.configurations.utils import get_latest_d3m_config,\
    write_data_for_execute_pipeline
from tworaven_apps.ta2_interfaces.util_embed_results import FileEmbedUtil
from tworaven_apps.ta2_interfaces.util_message_formatter import MessageFormatter
from tworaven_apps.ta2_interfaces.models import \
    (KEY_DATA, KEY_DATASET_URI, VAL_DATA_URI)


def get_test_info_str():
    """Test data for update_problem_schema call"""
    return '''{"context": {"sessionId": "session_1"}'''

def execute_pipeline(info_str=None, includes_data=True):
    """Ask a TA2 to ListPipelines via gRPC

    This call is a bit different. If includes_data is True,
    it writes part of the data to a file
    and places that file uri into the original request

    Success:  (updated request str, grpc json response)
    Failure: (None, error message)
    """
    if info_str is None:
        info_str = get_test_info_str()

    if info_str is None:
        err_msg = 'UI Str for PipelineListResult is None'
        return None, get_failed_precondition_response(err_msg)

    d3m_config = get_latest_d3m_config()
    if not d3m_config:
        err_msg = ('The D3M configuration is not available.'
                   ' Therefore, there is no "temp_storage_root" directory to'
                   ' write the data.')
        return None, get_failed_precondition_response(err_msg)

    # --------------------------------
    # Is this valid JSON?
    # --------------------------------
    try:
        info_dict = json.loads(info_str, object_pairs_hook=OrderedDict)
    except json.decoder.JSONDecodeError as err_obj:
        err_msg = 'Failed to convert UI Str to JSON: %s' % (err_obj)
        return None, get_failed_precondition_response(err_msg)

    # includes_data, some error checks
    #
    if includes_data:
        # Make sure a "data" key exists
        #
        if not KEY_DATA in info_dict:
            err_msg = ('The JSON request did not contain a "%s" key.') % KEY_DATA
            return None, get_failed_precondition_response(err_msg)

        # There shouldn't be a "dataset_uri" key
        #
        if KEY_DATASET_URI in info_dict:
            err_msg = ('If you are sending data, do not include'
                       ' a %s" key.') % KEY_DATASET_URI
            return None, get_failed_precondition_response(err_msg)


    # ------------------------------------------------
    # For "includes_data":
    #   - Write data and retrieve a file_uri
    # ------------------------------------------------
    if includes_data is False:
        # just use the request directly..
        #
        info_str_formatted = info_str
    else:
        # write the data and create a new file uri
        #
        file_uri, err_msg = write_data_for_execute_pipeline(\
                                        d3m_config,
                                        info_dict[KEY_DATA])

        # Did it work?
        #
        if err_msg is not None:
            # .. nope
            return None, get_failed_precondition_response(err_msg)

        # ------------------------------------------------
        # Reformat the original content
        # ------------------------------------------------
        # (1) remove the data key
        if KEY_DATA in info_dict:
            del info_dict[KEY_DATA]

        # (2) Add the file_uri and convert it back to a JSON string
        info_dict[KEY_DATASET_URI] = file_uri
        info_str_formatted = json.dumps(info_dict)


    # ------------------------------------------------
    # At this point, there should be a 'dataset_uri' key, either:
    #   - created from newly written data or
    #   - sent directly from the UI
    # ------------------------------------------------
    if info_str_formatted.find(KEY_DATASET_URI) == -1:
        err_msg = ('The request does not contain a "%s" key.') % KEY_DATASET_URI
        return None, get_failed_precondition_response(err_msg)


    # --------------------------------
    # convert the JSON string to a gRPC request
    # --------------------------------
    try:
        req = Parse(info_str_formatted, core_pb2.PipelineExecuteRequest())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        return None, get_failed_precondition_response(err_msg)

    if settings.TA2_STATIC_TEST_MODE:

        #return info_str_formatted,\
        #       get_grpc_test_json('test_responses/execute_results_1pipe_ok.json',
        #                          dict())
        #---
        template_info = get_predict_file_info_dict()

        template_str = get_grpc_test_json('test_responses/execute_results_1pipe_ok.json',
                                          template_info)

        # These next lines embed file uri content into the JSON
        embed_util = FileEmbedUtil(template_str)
        if embed_util.has_error:
            return get_failed_precondition_response(embed_util.error_message)

        if includes_data:
            test_note = ('Test.  An actual result would be the test JSON with'
                     ' the "data" section removed and a dataset_uri added'
                     ' with a file path to where the "data" section was'
                     ' written.')
        else:
            test_note = ('Message sent directly to TA2')

        return json.dumps(dict(note=test_note)), embed_util.get_final_results()
        #---
        #return info_str_formatted,\
        #       get_grpc_test_json('test_responses/execute_results_1pipe_ok.json',
        #                          dict())

    # --------------------------------
    # Get the connection, return an error if there are channel issues
    # --------------------------------
    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        return None, get_failed_precondition_response(err_msg)

    # --------------------------------
    # Send the gRPC request - returns a stream
    # --------------------------------
    messages = []
    try:
        for reply in core_stub.ExecutePipeline(req):
            user_msg = MessageToJson(reply, including_default_value_fields=True)
            messages.append(user_msg)
            print('msg received #%d' % len(messages))
    except grpc.RpcError as ex:
        return None, get_reply_exception_response(str(ex))
    except Exception as ex:
        return None, get_reply_exception_response(str(ex))

    success, return_str = MessageFormatter.format_messages(\
                                    messages,
                                    embed_data=True)

    if success is False:
        return None, get_reply_exception_response(return_str)

    return info_str_formatted, return_str
