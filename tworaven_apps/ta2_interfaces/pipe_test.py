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
import random
import json
from django.conf import settings
import core_pb2
# data flow
import dataflow_ext_pb2
import dataflow_ext_pb2_grpc
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

def pipline_list_parse():

    req = core_pb2.PipelineListRequest()

    req.context.session_id = 'session_01'

    content = MessageToJson(req)
    print(content)
    """
    message PipelineListRequest {
    SessionContext context = 1;}
    """
    content = MessageToJson(req)
    print(content)
    print('-' * 40)

def pipeline_results_parse():

    res = core_pb2.PipelineListResult()

    res.response_info.status.code = core_pb2.OK
    res.response_info.status.details = "(static test response)"

    res.pipeline_ids.append('pipeline_01')
    res.pipeline_ids.append('pipeline_02')

    content = MessageToJson(res)

    content = MessageToJson(res)
    print('JSON:\n')
    print(content)
    print('-' * 40)
    #content = content.replace('pipelineIds', 'pipeline_ids').replace('sessionId', 'session_id')
    print(content)

    print('-' * 40)
    print('gRPC:\n')
    json_parse(content, core_pb2.PipelineListResult)
    print('-' * 40)

def execute_pipeline_parse():
    """...PipelineExecuteRequest"""

    req = core_pb2.PipelineExecuteRequest()
    req.context.session_id = 'session_01'

    req.pipeline_id = 'pipeline_01'

    feature_names = ('cylinders displacement horsepower'
                     ' weight acceleration model class').split()

    for feature_name in feature_names:
        req.predict_features.add(feature_id=feature_name,
                                 data_uri='<<DATA_URI>>')

    content = MessageToJson(req)
    print('JSON:\n')
    print(content)
    print('-' * 40)
    #content = content.replace('pipelineIds', 'pipeline_ids').replace('sessionId', 'session_id')
    print(content)

    print('-' * 40)
    print('gRPC:\n')
    json_parse(content, core_pb2.PipelineExecuteRequest)
    print('-' * 40)

def update_parse():

    req = core_pb2.UpdateProblemSchemaRequest()
    req.context.session_id = 'session_01'

    req.updates.add(task_type=core_pb2.CLASSIFICATION)
    req.updates.add(task_type=core_pb2.REGRESSION)

    content = MessageToJson(req)
    print('JSON:\n')
    print(content)
    print('-' * 40)
    #content = content.replace('pipelineIds', 'pipeline_ids').replace('sessionId', 'session_id')
    print(content)

    print('-' * 40)
    print('gRPC:\n')
    json_parse(content, core_pb2.UpdateProblemSchemaRequest)
    print('-' * 40)



def pipeline_export_parse():

    req = core_pb2.PipelineExportRequest()
    req.context.session_id = 'session_01'

    req.pipeline_id = 'pipeline_1'
    req.pipeline_exec_uri = 'file:///ravens_volume/pipeline_1'

    content = MessageToJson(req)
    print('JSON:\n')
    print(content)
    print('-' * 40)
    #content = content.replace('pipelineIds', 'pipeline_ids').replace('sessionId', 'session_id')
    print(content)

    print('-' * 40)
    print('gRPC:\n')
    json_parse(content, core_pb2.PipelineExportRequest)
    print('-' * 40)

    resp = core_pb2.Response()
    resp.status.code = core_pb2.OK
    resp.status.details = 'looking good'

    content = MessageToJson(resp)
    print('JSON:\n')
    print(content)
    print('-' * 40)
    #content = content.replace('pipelineIds', 'pipeline_ids').replace('sessionId', 'session_id')
    print(content)

    print('-' * 40)
    print('gRPC:\n')
    json_parse(content, core_pb2.Response)
    print('-' * 40)

def describe_data_flow():

    req = dataflow_ext_pb2.PipelineReference()

    req.context.session_id = 'session_01'
    req.pipeline_id = 'pipeline_1'

    content = MessageToJson(req)
    print('JSON:\n')
    print(content)
    print('-' * 40)

    json_parse(content, dataflow_ext_pb2.PipelineReference)
    print('-' * 40)

    resp = dataflow_ext_pb2.DataflowDescription()


    resp.response_info.status.code = core_pb2.OK
    resp.response_info.status.details = "(static test response)"
    resp.pipeline_id = 'pipeline_1'

    # Add two modules
    for idx in range(0, 2):

        resp.modules.add(id='module_id %d' % idx,
                         type='module_type %d' % idx,
                         label='module_label %d' % idx)

        # For each module, add 2 inputs and 2 outputs
        for idx2 in range(0, 1):
            resp.modules[idx].inputs.add()
            resp.modules[idx].inputs[idx2].name = 'nome %d' % idx2
            resp.modules[idx].inputs[idx2].type = 'type %d' % idx2
            resp.modules[idx].inputs[idx2].value = 'value %d' % idx2

            resp.modules[idx].outputs.add()
            resp.modules[idx].outputs[idx2].name = 'nome %d' % idx2
            resp.modules[idx].outputs[idx2].type = 'type %d' % idx2

    # Add two connections
    for idx in range(0, 2):
        resp.connections.add()
        resp.connections[idx].from_module_id = 'module %d' % idx
        resp.connections[idx].from_output_name = 'from_output_name %d' % idx
        resp.connections[idx].to_module_id = 'to_module_id %d' % idx
        resp.connections[idx].to_input_name = 'to_input_name %d' % idx

    content = MessageToJson(resp)
    print('JSON:\n')
    print(content)
    print('-' * 40)

    print('-' * 40)
    print('gRPC:\n')
    json_parse(content, dataflow_ext_pb2.DataflowDescription)
    print('-' * 40)


def get_dataflow_results():
    """Figuring out ModuleResult"""

    module_list = []

    for idx in range(0, 4):
        # initialize object
        resp = dataflow_ext_pb2.ModuleResult()

        # module_id
        resp.module_id = 'module_id %d' % idx

        # status
        statuses_with_execution_time = [dataflow_ext_pb2.ModuleResult.DONE,
                                        dataflow_ext_pb2.ModuleResult.ERROR]

        statuses = [dataflow_ext_pb2.ModuleResult.PENDING,
                    dataflow_ext_pb2.ModuleResult.RUNNING] +\
                    statuses_with_execution_time
        new_status = statuses[idx]
        resp.status = new_status

        print('status: %s' % new_status)

        # progress
        resp.progress = round(random.uniform(0.0, 1.0), 1)

        # outputs
        for idx2 in range(1, 3):
            resp.outputs.add(output_name='output_name %d' % idx2,
                             value='value %d' % idx2)

        # execution_time
        if 1:   #new_status in statuses_with_execution_time:
            print('add execution_time')
            resp.execution_time = round(random.uniform(0.1, 75.0), 1) # seconds

        # response info
        resp.response_info.status.code = core_pb2.OK
        resp.response_info.status.details = "we did it, we did it, we really, really did it"

        content = MessageToJson(resp)
        module_list.append(content)
        print('JSON:\n')
        print(content)
        print('-' * 40)

        print('-' * 40)
        print('gRPC:\n')
        json_parse(content, dataflow_ext_pb2.ModuleResult)
        print('-' * 40)
    print('\n'.join(module_list))

if __name__ == '__main__':
    get_dataflow_results()
    #describe_data_flow()

    #update_parse()
    #execute_pipeline_parse()
    #pipeline_results_parse()
    #pipline_list_parse()
    #pipeline_exec_result()
    #pipeline_execute_parse()
    #pipeline_create_parse()
#"taskType":"REGRESSION","taskSubtype":"UNIVARIATE","taskDescription":"problemDescription.txt","outputType":"REAL","metric":"MEAN_SQUARED_ERROR","targetFeatures":[{"class":"data/d3m/o_196seed/data/trainDatamerged.tsv"}],"maxPipelines":10}

#json_parse("""{  "context": {
#    "session_id": "abc123"
# }}""", core_pb2.PipelineCreateRequest)
#content = MessageToJson(session_context)
#print(content)

#req = Parse(content, core_pb2.SessionContext())
#print(re
