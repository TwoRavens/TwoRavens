"""
Code is courtesy of Matthias Grabmair
    - https://gitlab.datadrivendiscovery.org/mgrabmair/ta3ta2-proxy
"""
import random
import json
from collections import OrderedDict

from os.path import dirname, isfile, join, abspath

from google.protobuf.json_format import MessageToJson
from django.conf import settings
from django.template.loader import render_to_string

from tworaven_apps.ta2_interfaces import core_pb2
from tworaven_apps.ta2_interfaces.models import TEST_KEY_FILE_URI
from tworaven_apps.ta2_interfaces.models import KEY_GRPC_JSON
from django.template.loader import render_to_string



def get_grpc_test_json(grpc_json_file, info_dict={}):
    """Return gRPC JSON response"""
    json_str = render_to_string(grpc_json_file, info_dict)

    return json_str
    #return JsonResponse(json.loads(json_str), safe=False)

def format_info_for_request(info_dict):
    """For tests, TwoRavens info is sent from the UI as
    a JSON string under the key 'grpcrequest'"""
    return {KEY_GRPC_JSON: json.dumps(info_dict)}

def load_template_as_dict(template_name, info_dict={}):
    """For tests, load a template and load it as JSON"""
    json_string = render_to_string(template_name, info_dict)

    return json.loads(json_string, object_pairs_hook=OrderedDict)


def get_grpc_content(request):
    """"Retrieve the GRPC content from the POST

    Returns either:
        (True, content text)
        (False, error message)
    """
    if not (request.POST and KEY_GRPC_JSON in request.POST):
        return False, 'Key "%s" not found' % KEY_GRPC_JSON

    return True, request.POST[KEY_GRPC_JSON]


def get_failed_precondition_response(err_msg):
    """Return a SessionResponse object in JSON format
        with status FAILED_PRECONDITION"""

    err_msg = '%s (ta2 server: %s)' % (err_msg, settings.TA2_TEST_SERVER_URL)

    grpc_resp = core_pb2.Response(\
                    status=core_pb2.Status(\
                        code=core_pb2.FAILED_PRECONDITION,
                        details=err_msg))

    return MessageToJson(grpc_resp)


def get_failed_precondition_sess_response(err_msg):
    """Return a SessionResponse object in JSON format
        with status FAILED_PRECONDITION"""

    grpc_resp = core_pb2.SessionResponse(\
                    response_info=core_pb2.Response(\
                        status=core_pb2.Status(\
                            code=core_pb2.FAILED_PRECONDITION,
                            details=err_msg)))

    return MessageToJson(grpc_resp)


def get_predict_file_info_dict(task_type=None, cnt=1):
    """Create the file uri and embed the file content"""
    if not task_type:
        task_type = random.choice(['REGRESSION', 'CLASSIFICATION'])

    test_dirpath = join(dirname(abspath(__file__)),
                        'templates',
                        'test_responses',
                        'files')

    err_found = False
    if task_type == 'REGRESSION':
        fpath = join(test_dirpath, 'samplePredReg.csv')

    elif task_type == 'CLASSIFICATION':
        fpath = join(test_dirpath, 'models.csv')

    else:
        err_found = True
        fpath = '(no sample file for this task type: %s)' % task_type

    if not isfile(fpath):
        if not err_found:
            fpath = 'Error creating uri.  File not found: %s' % fpath


    dinfo = {TEST_KEY_FILE_URI : fpath}

    return dinfo
