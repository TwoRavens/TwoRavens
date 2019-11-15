import rpy2.robjects as robjects
import json
import os
import sys
from distutils.util import strtobool
from datetime import datetime
import flask
from multiprocessing import Pool

NUM_PROCESSES = 4

TIMEOUT_MAX = 60 * 5
TIMEOUT_DEFAULT = 60

KEY_SUCCESS = 'success'
KEY_DATA = 'data'

flask_app = flask.Flask(__name__)

production = strtobool(os.getenv('FLASK_USE_PRODUCTION_MODE', 'False'))

flask_app.debug = not production



# multiprocessing.Process is buffered, stdout must be flushed manually
def debug(*values):
    print(*values)
    sys.stdout.flush()


def task_handler(task):
    robjects.r.source("config.R")
    robjects.r.source('setup.R')
    robjects.r.source('utils.R')

    for app in os.listdir('apps/'):
        if app.endswith('.R'):
            robjects.r.source(f'apps/{app}')

    data_casted = r_cast(task['data'])

    debug('casted success')
    debug(data_casted)

    # R returns a singleton list of a json string. Unwrap it, but don't parse
    # Parsing unnecessary because text can be returned with a json header
    return robjects.globalenv[task['app']](data_casted)[0]

@flask_app.route('/healthCheck.app', methods=['GET', 'POST'])
def healthcheck():
    """legacy root from rook"""
    return 'Health check. Looks good.<br />(%s)' % (datetime.now())


@flask_app.route('/<r_app>', methods=['POST'])
def app_general(r_app):

    data = flask.request.json

    debug('data')
    debug(data)

    # sanity check timeout
    if isinstance(data.get('timeout', None), (int, float)):
        timeout = min(max(data.get('timeout'), 0), TIMEOUT_MAX)
    else:
        timeout = TIMEOUT_DEFAULT

    data['timeout'] = timeout

    handler = pool.apply_async(task_handler, [{
        'app': r_app,
        'data': data
    }])

    try:
        resp = flask.Response(handler.get(timeout=timeout))
        resp.headers['Content-Type'] = 'application/json'
        return resp
    except TimeoutError:
        return json.dumps({KEY_SUCCESS: False, KEY_DATA: 'Timeout exceeded'})


@flask_app.route('/', methods=['GET', 'POST'])
def default():
    """Basic note at root url"""
    return 'TwoRavens R service. Looks good.<br />(%s)' % (datetime.now())


# convert nested python objects to nested R objects
def r_cast(content):
    robjects.r.library('jsonlite')
    return robjects.r['fromJSON'](json.dumps(content))


# convert nested R objects to nested python objects
def python_cast(content):
    return json.loads(robjects.r['toJSON'](content)[0])


if __name__ == '__main__':
    pool = Pool(processes=NUM_PROCESSES)

    try:
        flask_app.run(host='0.0.0.0', port=8000, threaded=True)
    finally:
        pool.close()
        pool.join()


# ~~~~~ USAGE ~~~~~~

# # call preprocess app (call the rookPreprocess function in the global R environment)
# print(task_handler({
#     'app': 'preprocess.app',
#     'data': {
#         'data': '/ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv',
#         'datastub': '185_baseball'
#     }
# }))
#
#
# # call solver app
# print(task_handler({
#     'app': 'rookSolver',
#     'data': {
#         'dataset_path': '/ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv',
#         'problem': {
#             "targets": ["Doubles", "RBIs"],
#             "predictors": ["At_bats", "Triples"],
#             "task": "regression"
#         },
#         'method': 'lm'
#     }
# }))
