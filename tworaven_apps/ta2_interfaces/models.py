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

# values
VAL_DATA_URI = '<<DATA_URI>>'
VAL_EXECUTABLE_URI = '<<EXECUTABLE_URI>>'

VAL_FAILED_PRECONDITION = 'FAILED_PRECONDITION'
