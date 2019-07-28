import rpy2.robjects as robjects
import rpy2.rlike.container as rlc
import json
import os

import flask
from multiprocessing import Pool

NUM_PROCESSES = 4

TIMEOUT_MAX = 60 * 5
TIMEOUT_DEFAULT = 2

KEY_SUCCESS = 'success'
KEY_DATA = 'data'

flask_app = flask.Flask(__name__)

production = os.getenv('FLASK_USE_PRODUCTION_MODE', 'no') == 'yes'
flask_app.debug = not production


def task_handler(task):
    robjects.r.source("config.R")
    robjects.r.source('setup.R')
    robjects.r.source('utils.R')

    robjects.r.source('preprocess/preprocess.R')

    for app in os.listdir('apps/'):
        if app.endswith('.R'):
            robjects.r.source(f'apps/{app}')

    data_casted = r_cast(task['data'])

    print('casted success')

    print(data_casted)

    # R returns a singleton list of a json string
    return robjects.globalenv[task['app']](data_casted)[0]


@flask_app.route('/<r_app>', methods=['POST'])
def app_general(r_app):

    data = flask.request.json

    print('data')
    print(data)

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


# convert nested python objects to nested R objects
def r_cast(content):
    # cast named lists
    if issubclass(dict, type(content)):
        return rlc.TaggedList([r_cast(i) for i in content.values()], list(content.keys()))

    # cast typed lists
    if issubclass(list, type(content)):
        types = {type(value) for value in content}
        if len(types) == 1 and next(iter(types)) in [str, int, float, bool]:
            return {
                str: robjects.vectors.StrVector,
                int: robjects.vectors.IntVector,
                float: robjects.vectors.FloatVector,
                bool: robjects.vectors.BoolVector
            }[next(iter(types))](content)
        return rlc.TaggedList([r_cast(i) for i in content], range(1, len(content) + 1))

    return content


if __name__ == '__main__':
    pool = Pool(processes=NUM_PROCESSES)

    try:
        flask_app.run(port=8000, threaded=True)
    finally:
        pool.close()
        pool.join()


# ~~~~~ USAGE ~~~~~~

# # call preprocess app (call the rookPreprocess function in the global R environment)
# print(call_r_app('rookPreprocess', {
#     'data': '/ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv',
#     'datastub': '185_baseball'
# }))
#
#
# # call solver app
# print(call_r_app('rookSolver', {
#     'dataset_path': '/ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv',
#     'problem': {
#         "targets": ["Doubles", "RBIs"],
#         "predictors": ["At_bats", "Triples"],
#         "task": "regression"
#     },
#     'method': 'lm'
# }))
