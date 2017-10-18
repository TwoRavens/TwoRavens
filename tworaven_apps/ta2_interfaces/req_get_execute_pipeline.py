import json
from collections import OrderedDict

from django.conf import settings
from google.protobuf.json_format import MessageToJson,\
    Parse, ParseError

from tworaven_apps.ta2_interfaces import core_pb2
from tworaven_apps.ta2_interfaces.models import VAL_GRPC_STATE_CODE_NONE
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.ta2_util import get_grpc_test_json,\
    get_failed_precondition_response,\
    get_predict_file_info_dict
from tworaven_apps.ta2_interfaces.util_embed_results import FileEmbedUtil

def get_test_info_str():
    """Test data for update_problem_schema call"""
    return '''{"context": {"sessionId": "session_1"}, "pipelineIds": ["pipeline_1"]}'''

def get_execute_pipeline_results(info_str=None):
    """Ask a TA2 to GetExecutePipelineResults via gRPC"""
    if info_str is None:
        info_str = get_test_info_str()

    if info_str is None:
        err_msg = 'UI Str for PipelineExecuteResultsRequest is None'
        return get_failed_precondition_response(err_msg)

    # --------------------------------
    # Is this valid JSON?
    # --------------------------------
    try:
        info_dict = json.loads(info_str, object_pairs_hook=OrderedDict)
    except json.decoder.JSONDecodeError as err_obj:
        err_msg = 'Failed to convert UI Str to JSON: %s' % (err_obj)
        return get_failed_precondition_response(err_msg)

    # --------------------------------
    # convert the JSON string to a gRPC request
    # --------------------------------
    try:
        req = Parse(info_str, core_pb2.PipelineExecuteResultsRequest())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        return get_failed_precondition_response(err_msg)


    if settings.TA2_STATIC_TEST_MODE:

        template_info = get_predict_file_info_dict()

        template_str = get_grpc_test_json('test_responses/execute_results_ok.json',
                                          template_info)

        embed_util = FileEmbedUtil(template_str)
        if embed_util.has_error:
            return get_failed_precondition_response(embed_util.error_message)

        return embed_util.get_final_results()

        #return get_grpc_test_json('test_responses/execute_results_ok.json',
        #                          dict())


    # --------------------------------
    # Get the connection, return an error if there are channel issues
    # --------------------------------
    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        return get_failed_precondition_response(err_msg)

    #print('req: %s' % req)

    # --------------------------------
    # Send the gRPC request - returns a stream
    # --------------------------------
    try:
        reply = core_stub.GetExecutePipelineResults(req)
    except grpc.RpcError as ex:
        return get_failed_precondition_response(str(ex))
    except Exception as ex:
        return get_failed_precondition_response(str(ex))

    if reply and str(reply) == VAL_GRPC_STATE_CODE_NONE:
        err_msg = ('Unkown gRPC state.'
                   ' (Was an ExecutePipeline request sent?)')
        return get_failed_precondition_response(err_msg)

    try:
        print(MessageToJson(reply))
    except:
        print('failed unary convert to JSON')
    #print('reply: %s' % reply)

    # --------------------------------
    # Convert the reply to JSON and send it on
    # --------------------------------
    results = map(MessageToJson, reply)
    result_str = '['+', '.join(results)+']'

    embed_util = FileEmbedUtil(result_str)
    if embed_util.has_error:
        return get_failed_precondition_response(embed_util.error_message)

    return embed_util.get_final_results()



"""
python manage.py shell
#from tworaven_apps.ta2_interfaces.ta2_proxy import *
from tworaven_apps.ta2_interfaces.update_problem_schema import update_problem_schema

updateproblemschema()
"""
