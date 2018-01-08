import json
from os.path import join
from collections import OrderedDict

from django.conf import settings
from django.template.defaultfilters import slugify

from google.protobuf.json_format import MessageToJson,\
    Parse, ParseError

import core_pb2
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.ta2_util import get_grpc_test_json,\
    get_failed_precondition_response
from tworaven_apps.configurations.utils import get_latest_d3m_config
from tworaven_apps.ta2_interfaces.models import VAL_EXECUTABLE_URI,\
    KEY_PIPELINE_ID,\
    KEY_PIPELINE_EXEC_URI, KEY_PIPELINE_EXEC_URI_FROM_UI

def get_test_info_str():
    """Test data for update_problem_schema call"""
    return '''{"context":{"session_id":"session_0"},"pipelineId":"pipe1","pipelineExecUri":"<<EXECUTABLE_URI>>"}'''

def export_pipeline(info_str=None, call_entry=None):
    """Ask a TA2 to ExportPipeline via gRPC"""
    if info_str is None:
        info_str = get_test_info_str()

    if info_str is None:
        err_msg = 'UI Str for ExportPipeline is None'
        return get_failed_precondition_response(err_msg)

    if info_str.find(VAL_EXECUTABLE_URI) == -1:
        err_msg = ('Expected to see place holder for executable uri.'
                   ' Placeholder is "%s"') % VAL_EXECUTABLE_URI
        return None, get_failed_precondition_response(err_msg)


    d3m_config = get_latest_d3m_config()
    if not d3m_config:
        err_msg = ('The D3M configuration is not available.'
                   ' Therefore, there is no "executables_root" directory to'
                   ' write the data.')
        return None, get_failed_precondition_response(err_msg)

    # --------------------------------
    # Is this valid JSON?
    # --------------------------------
    try:
        info_dict = json.loads(info_str, object_pairs_hook=OrderedDict)
    except json.decoder.JSONDecodeError as err_obj:
        err_msg = 'Failed to convert UI Str to JSON: %s' % (err_obj)
        return get_failed_precondition_response(err_msg)

    # --------------------------------
    # Construct and set a write directory for the executable
    # --------------------------------

    # get the pipeline id
    pipeline_id, err_msg = get_pipeline_id(info_dict)
    if err_msg:
        return get_failed_precondition_response(err_msg)

    # dir = d3m_config.executables_root + pipeline_id
    executable_write_dir = join('file://%s' % d3m_config.executables_root,
                                pipeline_id)

    # update the dict + info_str
    info_dict[KEY_PIPELINE_EXEC_URI] = executable_write_dir
    if KEY_PIPELINE_EXEC_URI_FROM_UI in info_dict:
        del info_dict[KEY_PIPELINE_EXEC_URI_FROM_UI]


    try:
        info_str = json.dumps(info_dict)
    except TypeError as ex_obj:
        err_msg = 'Failed to PipelineExportRequest info to JSON: %s' % ex_obj
        return get_failed_precondition_response(err_msg)

    #print('info_str', info_str)
    if call_entry:
        call_entry.request_msg = info_str
        
    # --------------------------------
    # convert the JSON string to a gRPC request
    # --------------------------------
    try:
        req = Parse(info_str, core_pb2.PipelineExportRequest())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        return get_failed_precondition_response(err_msg)

    if settings.TA2_STATIC_TEST_MODE:
        return get_grpc_test_json('test_responses/export_pipeline_ok.json',
                                  dict())

    # --------------------------------
    # Get the connection, return an error if there are channel issues
    # --------------------------------
    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        return get_failed_precondition_response(err_msg)

    # --------------------------------
    # Send the gRPC request - returns a stream
    # --------------------------------
    try:
        reply = core_stub.ExportPipeline(req)
    except Exception as ex:
        return get_failed_precondition_response(str(ex))

    # --------------------------------
    # Convert the reply to JSON and send it back
    # --------------------------------
    return MessageToJson(reply)


def get_pipeline_id(info_dict):
    if not info_dict:
        return None, 'No JSON available to look for pipeline id.'

    pipeline_id = info_dict.get(KEY_PIPELINE_ID)
    if not pipeline_id:
        err_msg = ('Could not find a pipeline id.  Value missing for: %s') \
                   % KEY_PIPELINE_ID
        return None, err_msg

    fmt_pipeline_id = pipeline_id.strip().replace(' ', '')
    if pipeline_id != fmt_pipeline_id:
        pipeline_id = slugify(pipeline_id)
        #err_msg = ('Spaces found in the pipeline id: %s') % pipeline_id
        #return None, err_msg

    return pipeline_id, None

"""
python manage.py shell
#from tworaven_apps.ta2_interfaces.ta2_proxy import *
from tworaven_apps.ta2_interfaces.update_problem_schema import update_problem_schema

updateproblemschema()
"""
