"""
Scratch work to figure out/test JSON that converts to gRPC
"""

import os, sys, django
from os.path import abspath, dirname, realpath

proj_dir = dirname(dirname(dirname(realpath(__file__))))
print(proj_dir)
sys.path.append(proj_dir) #here store is root folder(means parent).

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tworavensproject.settings.local_settings")
django.setup()

import json
from django.conf import settings
from tworaven_apps.ta2_interfaces import core_pb2
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.ta2_util import get_failed_precondition_response
from google.protobuf.json_format import MessageToJson,\
    Parse, ParseError


def msg_and_back(msg_obj, CORE_OBJ):

    content = MessageToJson(msg_obj)
    print('content as JSON:\n', content)

    req = Parse(content, CORE_OBJ())
    print('\n\nJSON back to request:\n', req)

def json_parse(json_str, CORE_OBJ):

    req = Parse(json_str, CORE_OBJ())
    print('req', req)

def pipeline_create_parse():
    session_context = core_pb2.SessionContext()
    session_context.session_id = 'abc123'

    req = core_pb2.PipelineCreateRequest()
    req.context.session_id = 'session_0'

    req.train_features.add(feature_id='cylinders',
                           data_uri='data/d3m/o_196seed/data/trainDatamerged.tsv')

    req.train_features.add(feature_id='cylinders',
                           data_uri='data/d3m/o_196seed/data/trainDatamerged.tsv')

    req.task = core_pb2.REGRESSION

    req.task_subtype = core_pb2.UNIVARIATE

    req.output = core_pb2.REAL

    req.metrics.append(core_pb2.ROOT_MEAN_SQUARED_ERROR)

    req.target_features.add(feature_id='class',
                            data_uri='data/d3m/o_196seed/data/trainDatamerged.tsv')

    req.max_pipelines = 10

    msg_and_back(req, core_pb2.PipelineCreateRequest)

    print('-' * 40)
    content = MessageToJson(req)
    print(content)
    print('-' * 40)
    json_parse(content, core_pb2.PipelineCreateRequest)
    print('-' * 40)

def pipeline_execute_parse():

    req = core_pb2.PipelineExecuteResultsRequest()

    req.context.session_id = 'session_1'
    req.pipeline_ids.append('pipeline_1')

    print('-' * 40)
    content = MessageToJson(req)
    print(content)
    print('-' * 40)

    content = content.replace('pipelineIds', 'pipeline_ids').replace('sessionId', 'session_id')
    print(content)

    print('-' * 40)
    json_parse(content, core_pb2.PipelineExecuteResultsRequest)
    print('-' * 40)
    #,"pipelineid":"id1"

    '''
    message PipelineExecuteResultsRequest {
    SessionContext context = 1;
    repeated string pipeline_ids = 2;
    }'''

def pipeline_exec_result():

    req = core_pb2.PipelineExecuteResult()

    req.response_info.status.code = core_pb2.OK
    req.response_info.status.details = "(static test response)"

    req.progress_info = core_pb2.COMPLETED

    req.pipeline_id = 'pipline_1'

    req.result_uris.append('file://results/output/file_001.txt')
    req.result_uris.append('file://results/output/file_002.txt')

    print('-' * 40)
    content = MessageToJson(req)
    print(content)
    print('-' * 40)

    content = content.replace('pipelineIds', 'pipeline_ids').replace('sessionId', 'session_id')
    print(content)

    print('-' * 40)
    json_parse(content, core_pb2.PipelineExecuteResult)
    print('-' * 40)
    """
    message PipelineExecuteResult {
        Response response_info = 1;
        Progress progress_info = 2;
        string pipeline_id = 3;
        // Will be set if progress info value is UPDATED or COMPLETED
        repeated string result_uris = 4;  // output path to predicted results on eval data
    }
    """


if __name__ == '__main__':
    pipeline_exec_result()
    #pipeline_execute_parse()
    #pipeline_create_parse()
#"taskType":"REGRESSION","taskSubtype":"UNIVARIATE","taskDescription":"problemDescription.txt","outputType":"REAL","metric":"MEAN_SQUARED_ERROR","targetFeatures":[{"class":"data/d3m/o_196seed/data/trainDatamerged.tsv"}],"maxPipelines":10}

#json_parse("""{  "context": {
#    "session_id": "abc123"
# }}""", core_pb2.PipelineCreateRequest)
#content = MessageToJson(session_context)
#print(content)

#req = Parse(content, core_pb2.SessionContext())
#print(req)
