# multiprocessing.Process is buffered, stdout must be flushed manually
def debug(*values):
    print(*values, flush=True)

SAVED_MODELS_DIRECTORY = '/ravens_volume/solvers/'
DJANGO_SOLVER_SERVICE = 'http://localhost:8080/solver-svc/'
R_SERVICE = 'http://localhost:8000/'

KEY_SUCCESS = 'success'
KEY_DATA = 'data'
