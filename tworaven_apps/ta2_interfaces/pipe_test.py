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

#"taskType":"REGRESSION","taskSubtype":"UNIVARIATE","taskDescription":"problemDescription.txt","outputType":"REAL","metric":"MEAN_SQUARED_ERROR","targetFeatures":[{"class":"data/d3m/o_196seed/data/trainDatamerged.tsv"}],"maxPipelines":10}

#json_parse("""{  "context": {
#    "session_id": "abc123"
# }}""", core_pb2.PipelineCreateRequest)
#content = MessageToJson(session_context)
#print(content)

#req = Parse(content, core_pb2.SessionContext())
#print(req)
