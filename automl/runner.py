import sklearn.metrics

import os
import sys
import uuid

import flask
from multiprocessing import Pool, TimeoutError
from multiprocessing.dummy import Pool as ThreadPool

from automl.base import Solve, Search, Model

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


def abortable_worker(func, *args, **kwargs):
    timeout = kwargs.get('timeout', None)
    p = ThreadPool(1)
    res = p.apply_async(func, args=args)
    try:
        out = res.get(timeout)  # Wait timeout seconds for func to complete.
        return out
    except TimeoutError:
        print("Aborting due to timeout")
        p.terminate()
        raise


@flask_app.route('/solve', methods=['POST'])
def app_solve():

    data = flask.request.json

    debug('data')
    debug(data)

    # sanity check timeout
    if isinstance(data.get('timeout', None), (int, float)):
        timeout = min(max(data.get('timeout'), 0), TIMEOUT_MAX)
    else:
        timeout = TIMEOUT_DEFAULT

    data['timeout'] = timeout

    solver = Solve(
        system=data['system'],
        specification=data['specification'],
        system_params=data['system_params'])

    # kick off solver, without awaiting, with a max timeout
    pool.apply_async(lambda: abortable_worker(solver.run, timeout=timeout))

    return {"search_id": solver.search.search_id}


@flask_app.route('/search', methods=['POST'])
def app_search():

    data = flask.request.json

    # sanity check timeout
    if isinstance(data.get('timeout', None), (int, float)):
        timeout = min(max(data.get('timeout'), 0), TIMEOUT_MAX)
    else:
        timeout = TIMEOUT_DEFAULT

    data['timeout'] = timeout

    search = Search.load(data['system'], data['specification'], data.get('system_params'))

    # kick off solver, without awaiting, with a max timeout
    pool.apply_async(lambda: abortable_worker(search.run, timeout=timeout))

    return {"search_id": search.search_id}


@flask_app.route('/describe', methods=['POST'])
def app_describe():

    data = flask.request.json

    model = Model.load(data['model_id'])
    return {
        KEY_SUCCESS: True,
        KEY_DATA: {
            "search_id": model.search_id,
            "model_id": model.model_id,
            "description": model.describe()
        }
    }


@flask_app.route('/produce', methods=['POST'])
def app_produce():

    data = flask.request.json

    model = Model.load(data['model_id'])
    return {
        KEY_SUCCESS: True,
        KEY_DATA: {
            "search_id": model.search_id,
            "model_id": model.model_id,
            "produce": model.produce(data['specification'])
        }
    }


@flask_app.route('/score', methods=['POST'])
def app_score():

    data = flask.request.json

    model = Model.load(data['model_id'])
    return {
        KEY_SUCCESS: True,
        KEY_DATA: {
            "search_id": model.search_id,
            "model_id": model.model_id,
            "produce": model.score(data['specification'])
        }
    }


if __name__ == '__main__':
    pool = Pool(processes=NUM_PROCESSES)

    try:
        flask_app.run(port=8000, threaded=True)
    finally:
        pool.close()
        pool.join()


# ~~~~~ USAGE ~~~~~~

# similar to D3M, but simplified
specification = {
    'search': {
        "input": {
            "resource_uri": 'file:///ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv'
        },
        'problem': {
            "name": "problem 0",
            "targets": ["Doubles"],
            "predictors": ["At_bats", "Triples"],
            "taskSubtype": "NONE",
            "taskType": "CLASSIFICATION"
        },
        "performanceMetric": {
            "metric": "F1_MACRO"
        },
        "configuration": {
            "folds": 0,
            "method": "K_FOLD",
            "randomSeed": 0,
            "shuffle": False,
            "stratified": True,
            "trainTestRatio": 0
        },
        "timeBoundSearch": 0,
        "timeBoundRun": 0,
        "rankSolutionsLimit": 0
    },


    'produce': [{
        'input': {
            'name': 'data_test',
            "resource_uri": 'file:///ravens_volume/test_data/185_baseball/TEST/dataset_TEST/tables/learningData.csv'
        },
        'output': {
            'resource_uri': 'file:///ravens_volume/test_output_auto_sklearn/185_baseball/'
        }
    }],

    'score': [{
        "input": {
            "name": "data_test",
            "resource_uri": 'file:///ravens_volume/test_data/185_baseball/TEST/dataset_TEST/tables/learningData.csv'
        },
        "performanceMetrics": [
            {
                "metric": "F1_MACRO"
            }
        ]
    }]
}

sklearn_temp_path = '/ravens_volume/solvers/auto_sklearn/temporary/' + str(uuid.uuid4())
tmp_folder = os.path.join(*sklearn_temp_path.split('/'), 'temp')
output_folder = os.path.join(*sklearn_temp_path.split('/'), 'output')

system_params = {
    'auto_sklearn': {
        'delete_tmp_folder_after_terminate': False,
        'tmp_folder': tmp_folder,
        'output_folder': output_folder
    },
    'tpot': {'generations': 5},
    'h2o': {}
}

for solver_backend in system_params:
    solver = Solve(
        solver_backend,
        specification,
        system_params[solver_backend])
    solver.run()

