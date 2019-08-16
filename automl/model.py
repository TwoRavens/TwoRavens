SAVED_MODELS_PATH = '/ravens_volume/solvers/'
DJANGO_SOLVER_SERVICE = 'http://localhost:8080/solver-service/'
RECEIVE_ENDPOINT = DJANGO_SOLVER_SERVICE + 'Receive'

R_SERVICE = 'http://localhost:8000/'

KEY_SUCCESS = 'success'
KEY_DATA = 'data'
KEY_MSG_TYPE = 'msg_type'
KEY_WEBSOCKET_ID = 'websocket_id'
KEY_MESSAGE = 'message'

RECEIVE_SOLVE_MSG = 'receive_solve_msg'
RECEIVE_SEARCH_MSG = 'receive_search_msg'
RECEIVE_DESCRIBE_MSG = 'receive_describe_msg'
RECEIVE_SCORE_MSG = 'receive_score_msg'
RECEIVE_PRODUCE_MSG = 'receive_produce_msg'
RECEIVE_ERROR_MSG = 'receive_error_msg'
