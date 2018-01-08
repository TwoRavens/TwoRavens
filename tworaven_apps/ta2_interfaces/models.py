from django.db import models

# ---------------------------------
# keys to results in JSON
# (mostly JSON sent from the UI)
# ---------------------------------

# form name
KEY_GRPC_JSON = 'grpcrequest'

# json keys
#
KEY_PIPELINE_ID = 'pipelineId'
KEY_PIPELINE_INFO = 'pipelineInfo'
KEY_PREDICT_RESULT_URI = 'predictResultUri'
KEY_PREDICT_RESULT_DATA = 'predictResultData'
KEY_DATA = 'data'


KEY_PIPELINE_EXEC_URI_FROM_UI = 'pipelineExecUri'
KEY_PIPELINE_EXEC_URI = 'pipeline_exec_uri'

KEY_USER_AGENT_FROM_UI = 'user_agent'
KEY_SESSION_ID_FROM_UI = 'session_id'
KEY_CONTEXT_FROM_UI = 'context'

# values
#
VAL_DATA_URI = '<<DATA_URI>>'
VAL_EXECUTABLE_URI = '<<EXECUTABLE_URI>>'

STATUS_VAL_OK = 'OK'
STATUS_VAL_COMPLETED = 'COMPLETED'
STATUS_VAL_FAILED_PRECONDITION = 'FAILED_PRECONDITION'

# Test keys
# - used in tests but not actual code
TEST_KEY_FILE_URI = 'FILE_URI'

#
#
# src: https://github.com/grpc/grpc/blob/master/src/python/grpcio/grpc/_channel.py
# > 10/18/2017
VAL_GRPC_STATE_CODE_NONE = '<_Rendezvous object of in-flight RPC>'
