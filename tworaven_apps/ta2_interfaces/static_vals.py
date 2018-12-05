"""
Static values used within ta2_interfaces.

Many are keys sent from the UI
"""
# form name

GRPC_GET_FIT_SOLUTION_RESULTS = 'GetFitSolutionResults'


KEY_GRPC_JSON = 'grpcrequest'

STATUS_VAL_OK = 'OK'
STATUS_VAL_COMPLETED = 'COMPLETED'
STATUS_VAL_FAILED_PRECONDITION = 'FAILED_PRECONDITION'

KEY_DATA = 'data' # Used for the TA3 UI to retrieve data
KEY_DATA_POINTER = 'data_pointer' # Used for the TA3 UI to retrieve data
KEY_DATASET_URI = 'dataset_uri'

KEY_FITTED_SOLUTION_ID = 'fittedSolutionId'

KEY_NEW_DATASET_URI = 'new_dataset_uri'

KEY_PIPELINE = 'pipeline'   # DescribeSolutionResponse
KEY_PIPELINE_ID = 'pipelineId'

# used within progress.state for GetFitSolutionResults and other results
#
KEY_PROGRESS = 'progress'
KEY_PROGRESS_STATE = 'state'
KEY_PROGRESS_COMPLETED = 'COMPLETED'

KEY_RANK = 'rank'
KEY_REQUEST_ID = 'requestId'

KEY_SEARCH_ID = 'searchId'
KEY_SOLUTION_ID = 'solutionId'  # DescribeSolutionRequest
KEY_STEPS = 'steps'     # DescribeSolutionResponse

DETAILS_URL = 'details_url'
CALLBACK_URL = 'callback_url'

KEY_USER_AGENT_FROM_UI = 'user_agent'

# Test keys
# - used in tests but not actual code
TEST_KEY_FILE_URI = 'FILE_URI'

D3M_OUTPUT_DIR = '/output'

# ------------------------------------------
# params sent from the UI
# ------------------------------------------
ENDGetSearchSolutionsResults = 'ENDGetSearchSolutionsResults'

KEY_SEARCH_SOLUTION_PARAMS = 'searchSolutionParams'
KEY_FIT_SOLUTION_DEFAULT_PARAMS = 'fitSolutionDefaultParams'
KEY_SCORE_SOLUTION_DEFAULT_PARAMS = 'scoreSolutionDefaultParams'
KEY_PRODUCE_SOLUTION_DEFAULT_PARAMS = 'produceSolutionDefaultParams'

REQUIRED_INPUT_KEYS = [(KEY_SEARCH_SOLUTION_PARAMS, 'SearchSolutions'),
                       (KEY_FIT_SOLUTION_DEFAULT_PARAMS, 'FitSolution'),
                       (KEY_PRODUCE_SOLUTION_DEFAULT_PARAMS, 'ProduceSolution'),
                       (KEY_SCORE_SOLUTION_DEFAULT_PARAMS, 'ScoreSolution')]

# ---------------------------------
# Used in tests
# ---------------------------------
#KEY_PIPELINE_INFO = 'pipelineInfo'
#KEY_PREDICT_RESULT_URI = 'predictResultUri'
#KEY_PREDICT_RESULT_DATA = 'predictResultData'


#
#
# src: https://github.com/grpc/grpc/blob/master/src/python/grpcio/grpc/_channel.py
# > 10/18/2017
VAL_GRPC_STATE_CODE_NONE = '<_Rendezvous object of in-flight RPC>'
