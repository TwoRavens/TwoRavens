import json
import os
import uuid
import time

import traceback
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, TimeoutError
import signal
import atexit

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
    RECEIVE_PRODUCE_MSG,
    SAVED_MODELS_PATH,
    EXPORTED_MODELS_PATH)

from util_solve import Solve
from util_model import Model
from util_search import Search
import zipfile

NUM_PROCESSES = 4

# 8 hours
TIMEOUT_MAX = 60 * 60 * 8
TIMEOUT_DEFAULT = 60 * 5

flask_app = flask.Flask(__name__)

production = os.getenv('FLASK_USE_PRODUCTION_MODE', 'no') == 'yes'
flask_app.debug = not production

from concurrent.futures import ProcessPoolExecutor
from concurrent.futures.process import BrokenProcessPool


class PersistentProcessPoolExecutor(ProcessPoolExecutor):
    def __init__(self, max_workers=10):
        self._max_workers = max_workers
        super().__init__(max_workers)

    def _do_submit_job(self, job, run_times):
        try:
            return super()._do_submit_job(job, run_times)
        except BrokenProcessPool:
            print('Process pool is broken. Restarting executor.')
            self._pool.shutdown(wait=True)
            self._pool = ProcessPoolExecutor(int(self._max_workers))

            return super()._do_submit_job(job, run_times)


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
    except Exception:
        print("caught traceback when running future:", flush=True)
        print(traceback.format_exc())
        send_result({
            KEY_WEBSOCKET_ID: websocket_id,
            KEY_MSG_TYPE: msg_type,
            KEY_DATA: data,
            KEY_MESSAGE: "aborted due to exception",
            KEY_SUCCESS: False
        })


def solve_async(websocket_id, solver: Solve):
    start_time = time.time()
    try:
        result = solver.run()
    except Exception:
        print("caught traceback when running solver:", flush=True)
        print(traceback.format_exc())
        requests.post(
            url=RECEIVE_ENDPOINT,
            json={
                KEY_SUCCESS: False,
                KEY_MESSAGE: 'solve failed due to exception',
                KEY_DATA: {
                    'search_id': solver.search.search_id,
                    'system': solver.system
                },
                KEY_WEBSOCKET_ID: websocket_id,
                KEY_MSG_TYPE: RECEIVE_SOLVE_MSG
            }
        )
        return

    stop_time = time.time()
    result['elapsed_time'] = stop_time - start_time

    requests.post(
        url=RECEIVE_ENDPOINT,
        json={
            **result,
            KEY_WEBSOCKET_ID: websocket_id,
            KEY_MSG_TYPE: RECEIVE_SOLVE_MSG
        })


def search_async(websocket_id, search: Search):
    start_time = time.time()
    try:
        result = search.run()
    except Exception:
        print("caught traceback when running search:", flush=True)
        print(traceback.format_exc())
        requests.post(
            url=RECEIVE_ENDPOINT,
            json={
                KEY_SUCCESS: False,
                KEY_MESSAGE: 'search failed due to exception',
                KEY_DATA: {
                    'search_id': search.search_id,
                    'system': search.system
                },
                KEY_WEBSOCKET_ID: websocket_id,
                KEY_MSG_TYPE: RECEIVE_SEARCH_MSG
            }
        )
        return

    stop_time = time.time()
    result['elapsed_time'] = stop_time - start_time

    requests.post(
        url=RECEIVE_ENDPOINT,
        json={
            **result,
            KEY_WEBSOCKET_ID: websocket_id,
            KEY_MSG_TYPE: RECEIVE_SEARCH_MSG
        })


def describe_async(websocket_id, model, model_id=None):

    try:
        if model_id:
            model = Model.load(model_id)
        result = model.describe()
    except Exception:
        print("caught traceback when running describe:", flush=True)
        print(traceback.format_exc())

        requests.post(
            url=RECEIVE_ENDPOINT,
            json={
                KEY_SUCCESS: False,
                KEY_MESSAGE: "describe failed due to exception",
                KEY_DATA: {
                    'model_id': model.model_id,
                    'search_id': model.search_id,
                    'system': model.system
                },
                KEY_WEBSOCKET_ID: websocket_id,
                KEY_MSG_TYPE: RECEIVE_DESCRIBE_MSG
            })
        return

    requests.post(
        url=RECEIVE_ENDPOINT,
        json={
            KEY_SUCCESS: True,
            KEY_MESSAGE: "describe successfully completed",
            KEY_DATA: result,
            KEY_WEBSOCKET_ID: websocket_id,
            KEY_MSG_TYPE: RECEIVE_DESCRIBE_MSG
        })


def score_async(websocket_id, model, spec):

    try:
        result = model.score(spec)
    except Exception:
        print("caught traceback when running score:", flush=True)
        print(traceback.format_exc())

        requests.post(
            url=RECEIVE_ENDPOINT,
            json={
                KEY_SUCCESS: False,
                KEY_MESSAGE: "score failed due to exception",
                KEY_DATA: {
                    'model_id': model.model_id,
                    'search_id': model.search_id,
                    'system': model.system
                },
                KEY_WEBSOCKET_ID: websocket_id,
                KEY_MSG_TYPE: RECEIVE_SCORE_MSG
            })
        return

    requests.post(
        url=RECEIVE_ENDPOINT,
        json={
            KEY_SUCCESS: True,
            KEY_MESSAGE: "score successfully completed",
            KEY_DATA: result,
            KEY_WEBSOCKET_ID: websocket_id,
            KEY_MSG_TYPE: RECEIVE_SCORE_MSG
        })


def produce_async(websocket_id, model, spec, model_id=None):

    try:
        if model_id:
            model = Model.load(model_id)
        produce_data = model.produce(spec)
    except Exception:
        print("caught traceback when running produce:", flush=True)
        print(traceback.format_exc())
        requests.post(
            url=RECEIVE_ENDPOINT,
            json={
                KEY_SUCCESS: False,
                KEY_MESSAGE: "produce failed due to exception",
                KEY_DATA: {
                    'model_id': model.model_id,
                    'search_id': model.search_id,
                    'system': model.system
                },
                KEY_WEBSOCKET_ID: websocket_id,
                KEY_MSG_TYPE: RECEIVE_PRODUCE_MSG
            })
        return

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
        {
            'model_id': model.model_id,
            'search_id': model.search_id,
            'system': model.system
        },
        timeout,

        describe_async,
        websocket_id,
        model)

        if msg_type and websocket_id:
            try:
                requests.post(
                    url=RECEIVE_ENDPOINT,
                    json={
                        KEY_WEBSOCKET_ID: websocket_id,
                        KEY_MSG_TYPE: msg_type,
                        KEY_DATA: data,
                        KEY_MESSAGE: f"aborted due to timeout",
                        KEY_SUCCESS: False
                    })
            except Exception:
                print("CAUGHT TRACEBACK WHEN SENDING", flush=True)
                print(traceback.format_exc())


def catch_traceback(msg_type, websocket_id, data, func, *args, **kwargs):
    try:
        return func(*args, **kwargs)
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
    result = solver.run()
    print('solve result')
    print(result)
    requests.post(
        url=RECEIVE_ENDPOINT,
        json={
            **result,
            KEY_WEBSOCKET_ID: websocket_id,
            KEY_MSG_TYPE: RECEIVE_SOLVE_MSG
        })


def search_async(websocket_id, search):
    result = search.run()
    requests.post(
        url=RECEIVE_ENDPOINT,
        json={
            **result,
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

    print("timeout:", timeout)
    print(json.dumps(specification))
    print(json.dumps(data.get('system_params')))

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
        {
            'search_id': solver.search.search_id,
            'system': solver.system
        },
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

    print("timeout:", timeout)
    print(json.dumps(specification))
    print(json.dumps(data.get('system_params')))

    search = Search.load(
        system=data['system'],
        specification=data['specification'],
        system_params=data.get('system_params'),
        callback_found=search_found_async)

    executor_threads.submit(
        abortable_worker,
        RECEIVE_SEARCH_MSG,
        websocket_id,
        {
            'search_id': search.search_id,
            'system': search.system
        },
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
        {
            'model_id': data['model_id'],
            'search_id': data['search_id'],
            'system': data['system']
        },
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
        {
            'model_id': data['model_id'],
            'search_id': data['search_id'],
            'system': data['system']
        },
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
        {
            'model_id': data['model_id'],
            'search_id': data['search_id'],
            'system': data['system']
        },
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


@flask_app.route('/download', methods=['POST'])
def app_download():
    data = flask.request.json

    if 'model_id' not in data:
        return {
            KEY_SUCCESS: False,
            KEY_MESSAGE: '"model_id" is a required field'
        }

    model_id = data['model_id']
    save_path = os.path.join(SAVED_MODELS_PATH, model_id)
    export_path = os.path.join(EXPORTED_MODELS_PATH, model_id + '.zip')

    if not os.path.exists(save_path):
        return {
            KEY_SUCCESS: False,
            KEY_MESSAGE: f'model "{model_id}" does not exist'
        }

    if not os.path.exists(EXPORTED_MODELS_PATH):
        os.makedirs(EXPORTED_MODELS_PATH)

    if not os.path.exists(export_path):
        with zipfile.ZipFile(export_path, 'w', zipfile.ZIP_DEFLATED) as zfile:
            for root, dirs, files in os.walk(save_path):
                for file in files:
                    zfile.write(os.path.join(root, file),
                                os.path.relpath(os.path.join(root, file), os.path.join(save_path, '..')))

    return {
        KEY_SUCCESS: True,
        KEY_DATA: {'model_pointer': 'file://' + export_path}
    }


if __name__ == '__main__':

    # the server process is threaded
    executor_threads = ThreadPoolExecutor()

    # the abortable workers are given processes
    executor_processes = PersistentProcessPoolExecutor(max_workers=NUM_PROCESSES)

    def handle_exit():
        executor_threads.shutdown()
        executor_processes.shutdown()

    try:
        flask_app.run(port=8001, threaded=True)
    finally:
        handle_exit()

    # https://stackoverflow.com/questions/57031253/how-to-fix-brokenprocesspool-error-for-concurrent-futures-processpoolexecutor
    atexit.register(handle_exit)
    signal.signal(signal.SIGTERM, handle_exit)
    signal.signal(signal.SIGINT, handle_exit)


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
