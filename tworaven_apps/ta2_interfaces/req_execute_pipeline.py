import json
from collections import OrderedDict
from django.conf import settings
from google.protobuf.json_format import MessageToJson,\
    Parse, ParseError

from tworaven_apps.ta2_interfaces import core_pb2
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.ta2_util import get_grpc_test_json,\
    get_failed_precondition_response
from tworaven_apps.configurations.utils import get_latest_d3m_config,\
    write_data_for_execute_pipeline

KEY_DATA = 'data'
DATA_URI_KEY = '<<DATA_URI>>'

def get_test_info_str():
    """Test data for update_problem_schema call"""
    return '''{"context": {"sessionId": "session_1"}'''

def execute_pipeline(info_str=None):
    """Ask a TA2 to ListPipelines via gRPC

    This call is a bit different b/c it writes part of the data to a file
    and places that file uri into the original request

    Success:  (updated request str, grpc json response)
    Failure: (None, error message)
    """
    if info_str is None:
        info_str = get_test_info_str()

    if info_str is None:
        err_msg = 'UI Str for PipelineListResult is None'
        return None, get_failed_precondition_response(err_msg)

    if info_str.find(DATA_URI_KEY) == -1:
        err_msg = ('Expected to see place holder for file uri.'
                   ' Placeholder is "%s"') % DATA_URI_KEY
        return None, get_failed_precondition_response(err_msg)

    d3m_config = get_latest_d3m_config()
    if not d3m_config:
        err_msg = ('The D3M configuration is not available.'
                   ' Therefore there is no "temp_storage_root" directory to'
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

    if not KEY_DATA in info_dict:
        err_msg = ('The JSON request did not contain a "%s" key.') % KEY_DATA
        return None, get_failed_precondition_response(err_msg)

    file_uri, err_msg = write_data_for_execute_pipeline(d3m_config,
                                                        info_dict[KEY_DATA])

    if err_msg is not None:
        return None, get_failed_precondition_response(err_msg)

    # Reformat the original content
    #
    # (1) remove the data key
    if KEY_DATA in info_dict:
        del info_dict[KEY_DATA]

    # (2) convert it back to a JSON string
    info_str = json.dumps(info_dict)

    # (3) replace the DATA_URI_KEY with the file_uri
    info_str_formatted = info_str.replace(DATA_URI_KEY, file_uri)

    # --------------------------------
    # convert the JSON string to a gRPC request
    # --------------------------------
    try:
        req = Parse(info_str_formatted, core_pb2.PipelineExecuteRequest())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        return None, get_failed_precondition_response(err_msg)

    if settings.TA2_STATIC_TEST_MODE:
        return info_str_formatted,\
               get_grpc_test_json('test_responses/execute_results_1pipe_ok.json',
                                  dict())

    # --------------------------------
    # Get the connection, return an error if there are channel issues
    # --------------------------------
    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        return None, get_failed_precondition_response(err_msg)

    # --------------------------------
    # Send the gRPC request - returns a stream
    # --------------------------------
    try:
        reply = core_stub.ExecutePipeline(req)
    except Exception as ex:
        return None, get_failed_precondition_response(str(ex))

    # --------------------------------
    # Convert the reply to JSON and send it on
    # --------------------------------
    results = map(MessageToJson, reply)
    result_str = '['+', '.join(results)+']'


    return info_str_formatted, result_str


"""
python manage.py shell
#from tworaven_apps.ta2_interfaces.ta2_proxy import *
from tworaven_apps.ta2_interfaces.update_problem_schema import update_problem_schema

updateproblemschema()
"""
