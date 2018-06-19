
# --------------------------------
import json
import time
from os.path import join
from collections import OrderedDict

from google.protobuf.json_format import MessageToJson,\
    Parse, ParseError
from django.conf import settings

import grpc
import core_pb2
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.ta2_util import get_grpc_test_json,\
    get_failed_precondition_response,\
    get_reply_exception_response,\
    get_predict_file_info_dict
from tworaven_apps.ta2_interfaces.util_embed_results import FileEmbedUtil
from tworaven_apps.ta2_interfaces.util_message_formatter import MessageFormatter
from tworaven_apps.ta2_interfaces.static_vals import \
    (KEY_CONTEXT_FROM_UI, KEY_SESSION_ID_FROM_UI)
from tworaven_apps.ta2_interfaces.models import \
    (StoredResponseTest)

PIPELINE_CREATE_REQUEST = 'PipelineCreateRequest'

ERR_NO_CONTEXT = 'A "%s" must be included in the request.' % KEY_CONTEXT_FROM_UI
ERR_NO_SESSION_ID = ('A "%s" must be included in the request,'
                     ' within the "%s".') %\
                     (KEY_CONTEXT_FROM_UI, KEY_SESSION_ID_FROM_UI)
# --------------------------------
#@celery_app.task(bind=True)

"""
from tworavensproject.celery import debug_task
debug_task()
debug_task.delay()

from tworaven_apps.ta2_interfaces.tasks import hi_there
hi_there('hi')
hi_there.delay('working via celery...')
"""



def stream_pipeline_create(info_str=None):
    """Send the pipeline create request via gRPC"""
    print('stream_pipeline_create 1')

    if info_str is None:
        print('stream_pipeline_create 1a')
        err_msg = 'UI Str for %s is None' % PIPELINE_CREATE_REQUEST
        return get_failed_precondition_response(err_msg)

    print('stream_pipeline_create 1b')
    # --------------------------------
    # Convert info string to dict
    # --------------------------------
    try:
        info_dict = json.loads(info_str, object_pairs_hook=OrderedDict)
    except json.decoder.JSONDecodeError as err_obj:
        err_msg = 'Failed to convert UI Str to JSON: %s' % (err_obj)
        return get_failed_precondition_response(err_msg)

    if KEY_CONTEXT_FROM_UI not in info_dict:
        return get_failed_precondition_response(ERR_NO_CONTEXT)

    if KEY_SESSION_ID_FROM_UI not in info_dict[KEY_CONTEXT_FROM_UI]:
        return get_failed_precondition_response(ERR_NO_SESSION_ID)

    print('stream_pipeline_create 1c')

    # --------------------------------
    # convert the JSON string to a gRPC request
    # --------------------------------
    try:
        req = Parse(info_str, core_pb2.PipelineCreateRequest())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        return get_failed_precondition_response(err_msg)

    if settings.TA2_STATIC_TEST_MODE:
        print('stream_pipeline_create 2: NO!! test mode')
        template_info = get_predict_file_info_dict(info_dict.get('task'))

        template_str = get_grpc_test_json('test_responses/createpipeline_ok.json',
                                          template_info)

        # These next lines embed file uri content into the JSON
        embed_util = FileEmbedUtil(template_str)
        if embed_util.has_error:
            return get_failed_precondition_response(embed_util.error_message)

        return embed_util.get_final_results()
        #return get_grpc_test_json('test_responses/createpipeline_ok.json',
        #                          template_info)

    # --------------------------------
    # Get the connection, return an error if there are channel issues
    # --------------------------------
    print('stream_pipeline_create 3')
    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        return get_failed_precondition_response(err_msg)

    # --------------------------------
    # Send the gRPC request
    # --------------------------------
    messages = []
    print('stream_pipeline_create 4')

    try:
        from tworaven_apps.ta2_interfaces.models import StoredResponseTest
        for reply in core_stub.CreatePipelines(req, timeout=60):
            user_msg = MessageToJson(reply, including_default_value_fields=True)
            print('stream_pipeline_create 4a: got a message')

            # Attempt to save....
            # ----------------------------
            success, return_str = MessageFormatter.format_messages(\
                                            [user_msg],
                                            embed_data=True)
            if success:
                stored_resp = StoredResponseTest(resp=return_str)
            else:
                stored_resp = StoredResponseTest(resp=user_msg)

            stored_resp.save()
            # ----------------------------
            messages.append(user_msg)
            print('msg received #%d' % len(messages))

    except grpc.RpcError as err_obj:
        # we're purposely breaking here as new grpc svc being built
        if str(err_obj).find('StatusCode.DEADLINE_EXCEEDED') > -1:
            pass
        else:
            return get_reply_exception_response(str(err_obj))
    except Exception as err_obj:
        return get_reply_exception_response(str(err_obj))


    print('ALL DONE! WITH STREAMING!!!')

    success, return_str = MessageFormatter.format_messages(\
                                    messages,
                                    embed_data=True)

    if success is False:
        return get_reply_exception_response(return_str)

    return return_str
