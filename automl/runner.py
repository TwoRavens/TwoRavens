import os
import uuid

import traceback
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, TimeoutError

import requests
import flask

from model import (
    RECEIVE_ENDPOINT,
    KEY_SUCCESS,
    KEY_DATA,
    KEY_MSG_TYPE,
    KEY_MESSAGE,
    KEY_WEBSOCKET_ID,
    RECEIVE_SOLVE_MSG,
    RECEIVE_SEARCH_MSG,
    RECEIVE_DESCRIBE_MSG,
    RECEIVE_SCORE_MSG,
    RECEIVE_PRODUCE_MSG)

from util_solve import Solve
from util_model import Model
from util_search import Search


NUM_PROCESSES = 4

TIMEOUT_MAX = 60 * 5
TIMEOUT_DEFAULT = 2

flask_app = flask.Flask(__name__)

production = os.getenv('FLASK_USE_PRODUCTION_MODE', 'no') == 'yes'
flask_app.debug = not production


def send_result(data):
    try:
        requests.post(
            url=RECEIVE_ENDPOINT,
            json=data)
    except Exception:
        # mainly to catch non-serializable data, but a generic except is necessary to collect all traces
        print("caught traceback when posting failure message:", flush=True)
        print(traceback.format_exc())


# when a handle for a future/process is lost, it cannot be killed, unless spawned inside a thread with a timeout
def abortable_worker(msg_type, websocket_id, data, timeout, func, *args, **kwargs):
    future = executor_processes.submit(func, *args, **kwargs)

    try:
        return future.result(timeout)  # Wait timeout seconds for func to completed
    except TimeoutError:
        print(f"cancelled '{msg_type}' due to timeout", flush=True)
        future.cancel()
        send_result({
            KEY_WEBSOCKET_ID: websocket_id,
            KEY_MSG_TYPE: msg_type,
            KEY_DATA: data,
            KEY_MESSAGE: f"aborted due to timeout",
            KEY_SUCCESS: False
        })
    except Exception as err:
        print("caught traceback when running future:", flush=True)
        print(err)
        print(traceback.format_exc())
        send_result({
            KEY_WEBSOCKET_ID: websocket_id,
            KEY_MSG_TYPE: msg_type,
            KEY_DATA: data,
            KEY_MESSAGE: f"aborted due to exception: {err}",
            KEY_SUCCESS: False
        })


def solve_async(websocket_id, solver):
    solver.run()
    requests.post(
        url=RECEIVE_ENDPOINT,
        json={
            KEY_SUCCESS: True,
            KEY_MESSAGE: "solve successfully completed",
            KEY_DATA: {'search_id': solver.search.search_id},
            KEY_WEBSOCKET_ID: websocket_id,
            KEY_MSG_TYPE: RECEIVE_SOLVE_MSG
        })


def search_async(websocket_id, search):
    search.run()
    requests.post(
        url=RECEIVE_ENDPOINT,
        json={
            KEY_SUCCESS: True,
            KEY_MESSAGE: "search successfully completed",
            KEY_DATA: {'search_id': search.search_id},
            KEY_WEBSOCKET_ID: websocket_id,
            KEY_MSG_TYPE: RECEIVE_SEARCH_MSG
        })


def describe_async(websocket_id, model, model_id=None):
    if model_id:
        model = Model.load(model_id)

    requests.post(
        url=RECEIVE_ENDPOINT,
        json={
            KEY_SUCCESS: True,
            KEY_MESSAGE: "describe successfully completed",
            KEY_DATA: model.describe(),
            KEY_WEBSOCKET_ID: websocket_id,
            KEY_MSG_TYPE: RECEIVE_DESCRIBE_MSG
        })


def score_async(websocket_id, model, spec):
    requests.post(
        url=RECEIVE_ENDPOINT,
        json={
            KEY_SUCCESS: True,
            KEY_MESSAGE: "score successfully completed",
            KEY_DATA: model.score(spec),
            KEY_WEBSOCKET_ID: websocket_id,
            KEY_MSG_TYPE: RECEIVE_SCORE_MSG
        })


def produce_async(websocket_id, model, spec, model_id=None):
    if model_id:
        model = Model.load(model_id)

    produce_data = model.produce(spec)
    requests.post(
        url=RECEIVE_ENDPOINT,
        json={
            KEY_SUCCESS: True,
            KEY_MESSAGE: "produce successfully completed",
            KEY_DATA: produce_data,
            KEY_WEBSOCKET_ID: websocket_id,
            KEY_MSG_TYPE: RECEIVE_PRODUCE_MSG
        })


# called when a new model is discovered while searching
def solve_found_async(model, params):
    specification = params['specification']
    websocket_id = params['websocket_id']

    describe_async(websocket_id, model)

    for score_spec in specification['score']:
        score_async(websocket_id, model, score_spec)

    for produce_spec in specification['produce']:
        produce_async(websocket_id, model, produce_spec)


def search_found_async(model, params):
    websocket_id = params['websocket_id']
    timeout = params['timeout']

    executor_threads.submit(
        abortable_worker,
        RECEIVE_DESCRIBE_MSG,
        websocket_id,
        {'model_id': model.model_id},
        timeout,

        describe_async,
        websocket_id,
        model)


@flask_app.route('/solve', methods=['POST'])
def app_solve():

    data = flask.request.json

    # sanity check timeout
    if isinstance(data.get('timeout', None), (int, float)):
        timeout = min(max(data.get('timeout'), 0), TIMEOUT_MAX)
    else:
        timeout = TIMEOUT_DEFAULT

    data['timeout'] = timeout
    websocket_id = data['websocket_id']
    specification = data['specification']

    solver = Solve(
        system=data['system'],
        specification=specification,
        system_params=data.get('system_params'),
        callback_found=solve_found_async,
        callback_params={
            KEY_WEBSOCKET_ID: websocket_id,
            'timeout': timeout,
            'specification': specification
        })

    executor_threads.submit(
        abortable_worker,
        RECEIVE_SOLVE_MSG,
        websocket_id,
        {'search_id': solver.search.search_id},
        timeout,

        solve_async,
        websocket_id,
        solver)

    return {
        KEY_SUCCESS: True,
        KEY_MESSAGE: "solve successfully started",
        KEY_DATA: {"search_id": solver.search.search_id}
    }


@flask_app.route('/search', methods=['POST'])
def app_search():

    data = flask.request.json

    # sanity check timeout
    if isinstance(data.get('timeout', None), (int, float)):
        timeout = min(max(data.get('timeout'), 0), TIMEOUT_MAX)
    else:
        timeout = TIMEOUT_DEFAULT

    data['timeout'] = timeout
    websocket_id = data['websocket_id']

    search = Search.load(
        system=data['system'],
        specification=data['specification'],
        system_params=data.get('system_params'),
        callback_found=search_found_async)

    executor_threads.submit(
        abortable_worker,
        RECEIVE_SEARCH_MSG,
        websocket_id,
        {'search_id': search.search_id},
        timeout,

        search_async,
        websocket_id,
        search)

    return {
        KEY_SUCCESS: True,
        KEY_MESSAGE: "search successfully started",
        KEY_DATA: {"search_id": search.search_id}
    }


@flask_app.route('/describe', methods=['POST'])
def app_describe():

    data = flask.request.json

    # sanity check timeout
    if isinstance(data.get('timeout', None), (int, float)):
        timeout = min(max(data.get('timeout'), 0), TIMEOUT_MAX)
    else:
        timeout = TIMEOUT_DEFAULT

    data['timeout'] = timeout
    websocket_id = data['websocket_id']

    executor_threads.submit(
        abortable_worker,
        RECEIVE_DESCRIBE_MSG,
        websocket_id,
        {'model_id': data['model_id']},
        timeout,

        describe_async,
        websocket_id,
        None,
        model_id=data['model_id'])

    return {
        KEY_SUCCESS: True,
        KEY_MESSAGE: "describe successfully started"
    }


@flask_app.route('/produce', methods=['POST'])
def app_produce():

    data = flask.request.json

    # sanity check timeout
    if isinstance(data.get('timeout', None), (int, float)):
        timeout = min(max(data.get('timeout'), 0), TIMEOUT_MAX)
    else:
        timeout = TIMEOUT_DEFAULT

    data['timeout'] = timeout
    websocket_id = data['websocket_id']

    executor_threads.submit(
        abortable_worker,
        RECEIVE_PRODUCE_MSG,
        websocket_id,
        {'model_id': data['model_id']},
        timeout,

        produce_async,
        websocket_id,
        None,
        data['specification'],
        model_id=data['model_id'])

    return {
        KEY_SUCCESS: True,
        KEY_MESSAGE: "produce successfully started"
    }


@flask_app.route('/score', methods=['POST'])
def app_score():
    data = flask.request.json

    # sanity check timeout
    if isinstance(data.get('timeout', None), (int, float)):
        timeout = min(max(data.get('timeout'), 0), TIMEOUT_MAX)
    else:
        timeout = TIMEOUT_DEFAULT

    data['timeout'] = timeout
    websocket_id = data['websocket_id']

    executor_threads.submit(
        abortable_worker,
        RECEIVE_SCORE_MSG,
        websocket_id,
        {'model_id': data['model_id']},
        timeout,

        score_async,
        websocket_id,
        None,
        data['specification'],
        model_id=data['model_id'])

    return {
        KEY_SUCCESS: True,
        KEY_MESSAGE: "score successfully started"
    }


if __name__ == '__main__':

    # the server process is threaded
    executor_threads = ThreadPoolExecutor()

    # the abortable workers are given processes
    executor_processes = ProcessPoolExecutor(max_workers=NUM_PROCESSES)

    try:
        flask_app.run(port=8001, threaded=True)
    finally:
        executor_threads.shutdown()
        executor_processes.shutdown()


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

# for solver_backend in system_params:
#     solver = Solve(
#         solver_backend,
#         specification,
#         system_params[solver_backend])
#     solver.run()
#
