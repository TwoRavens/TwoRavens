from django.db import models

# ---------------------------------
# keys to results in JSON
# (mostly JSON sent from the UI)
# ---------------------------------

# form name
KEY_GRPC_JSON = 'grpcrequest'

# json keys
KEY_PIPELINE_ID = 'pipelineId'
KEY_DATA = 'data'

KEY_PIPELINE_EXEC_URI_FROM_UI = 'pipelineExecUri'
KEY_PIPELINE_EXEC_URI = 'pipeline_exec_uri'

# values
VAL_DATA_URI = '<<DATA_URI>>'
VAL_EXECUTABLE_URI = '<<EXECUTABLE_URI>>'

VAL_FAILED_PRECONDITION = 'FAILED_PRECONDITION'
