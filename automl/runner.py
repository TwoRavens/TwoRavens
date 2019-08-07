from automl.solver_auto_sklearn import solve_auto_sklearn
from automl.solver_tpot import solve_tpot

import sklearn.metrics

import json
import os
import sys

import flask
from multiprocessing import Pool
import uuid

NUM_PROCESSES = 4

TIMEOUT_MAX = 60 * 5
TIMEOUT_DEFAULT = 2

KEY_SUCCESS = 'success'
KEY_DATA = 'data'

flask_app = flask.Flask(__name__)

production = os.getenv('FLASK_USE_PRODUCTION_MODE', 'no') == 'yes'
flask_app.debug = not production


# multiprocessing.Process is buffered, stdout must be flushed manually
def debug(*values):
    print(*values)
    sys.stdout.flush()


def score(metric, actual, fitted):
    return {
        'accuracy': sklearn.metrics.accuracy_score,
        'recall': sklearn.metrics.recall_score,
        'precision': sklearn.metrics.precision_score
    }[metric](actual, fitted)


def task_handler(task):
    return task['app'](task['problem'])


@flask_app.route('/<solver_app>', methods=['POST'])
def app_general(solver_app):

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
        'app': solver_app,
        'data': data
    }])

    try:
        resp = flask.Response(handler.get(timeout=timeout))
        resp.headers['Content-Type'] = 'application/json'
        return resp
    except TimeoutError:
        return json.dumps({KEY_SUCCESS: False, KEY_DATA: 'Timeout exceeded'})


if __name__ == '__main__':
    pool = Pool(processes=NUM_PROCESSES)

    try:
        flask_app.run(port=8000, threaded=True)
    finally:
        pool.close()
        pool.join()


# ~~~~~ USAGE ~~~~~~

print(task_handler({
    'app': 'tpot',
    'specification': {
        # parameters specific for fitting the solver
        'fit': {
            'generations': 5
        },

        # describe the search
        'search': {
            'id': uuid.uuid4(),
            'dataset_path': 'file:///ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv',
            'problem': {
                "target": "Doubles",
                "predictors": ["At_bats", "Triples"],
                "task": "regression"
            }
        },

        # how to score a model
        'score': [{
            'dataset_path': 'file:///ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv',
            'metrics': [{'metric': 'accuracy'}]
        }],

        # produce on a list of datasets
        'produce': [{
            'dataset_path': 'file:///ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv',
            'results_path': 'file:///ravens_volume/test_output_auto_sklearn/185_baseball/',
        }]
    }
}))
