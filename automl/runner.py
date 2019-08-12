import os
import uuid

import traceback
import asyncio

import requests
import flask
from multiprocessing import TimeoutError
from multiprocessing.dummy import Pool as ThreadPool

from model import (
    RECEIVE_ENDPOINT,
    KEY_SUCCESS,
    KEY_DATA,
    KEY_MSG_TYPE,
    KEY_WEBSOCKET_ID,
    RECEIVE_SOLVE_MSG,
    RECEIVE_SEARCH_MSG,
    RECEIVE_DESCRIBE_MSG,
    RECEIVE_SCORE_MSG,
    RECEIVE_PRODUCE_MSG,
    RECEIVE_END_SEARCH, KEY_MESSAGE)

from util_solve import Solve
from util_model import Model
from util_search import Search


NUM_PROCESSES = 4

TIMEOUT_MAX = 60 * 5
TIMEOUT_DEFAULT = 2

flask_app = flask.Flask(__name__)

production = os.getenv('FLASK_USE_PRODUCTION_MODE', 'no') == 'yes'
flask_app.debug = not production


def abortable_worker(msg_type, websocket_id, data, timeout, func, *args, **kwargs):
    p = ThreadPool(1)
    res = p.apply_async(func, args=args, kwargs=kwargs)

    try:
        out = res.get(timeout)  # Wait timeout seconds for func to complete.
        return out
    except TimeoutError:
        print(f"aborted '{msg_type}' due to timeout", flush=True)
        p.terminate()

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
        print("CAUGHT TRACEBACK", flush=True)
        print(traceback.format_exc(), flush=True)

        if msg_type and websocket_id:
            try:
                requests.post(
                    url=RECEIVE_ENDPOINT,
                    json={
                        KEY_WEBSOCKET_ID: websocket_id,
                        KEY_MSG_TYPE: msg_type,
                        KEY_DATA: data,
                        KEY_MESSAGE: str(err),
                        KEY_SUCCESS: False
                    })
            except Exception:
                print("CAUGHT TRACEBACK WHEN SENDING", flush=True)
                print(traceback.format_exc())


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

    def found(model):
        # TODO: thread to avoid (slight) block

        describe_data = catch_traceback(
            RECEIVE_DESCRIBE_MSG,
            websocket_id,
            {'model_id': model.model_id},
            model.describe)

        requests.post(
            url=RECEIVE_ENDPOINT,
            json={
                KEY_SUCCESS: True,
                KEY_MESSAGE: "solve describe successfully completed",
                KEY_DATA: describe_data,
                KEY_WEBSOCKET_ID: websocket_id,
                KEY_MSG_TYPE: RECEIVE_DESCRIBE_MSG
            })

        for score_spec in specification['score']:
            score_data = catch_traceback(
                RECEIVE_SCORE_MSG,
                websocket_id,
                {'model_id': model.model_id},
                model.score,
                score_spec)

            requests.post(
                url=RECEIVE_ENDPOINT,
                json={
                    KEY_SUCCESS: True,
                    KEY_MESSAGE: "solve score successfully completed",
                    KEY_WEBSOCKET_ID: websocket_id,
                    KEY_DATA: score_data,
                    KEY_MSG_TYPE: RECEIVE_SCORE_MSG
                })

        for produce_spec in specification['produce']:
            produce_data = catch_traceback(
                RECEIVE_PRODUCE_MSG,
                websocket_id,
                {'model_id': model.model_id},
                model.produce,
                produce_spec)

            requests.post(
                url=RECEIVE_ENDPOINT,
                json={
                    KEY_SUCCESS: True,
                    KEY_MESSAGE: "solve produce successfully completed",
                    KEY_DATA: produce_data,
                    KEY_WEBSOCKET_ID: websocket_id,
                    KEY_MSG_TYPE: RECEIVE_PRODUCE_MSG
                })

    solver = Solve(
        system=data['system'],
        specification=specification,
        system_params=data['system_params'],
        callback_found=found)

    def solve_async():
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

    # kick off solver, without awaiting, with a max timeout
    def task():
        abortable_worker(
            RECEIVE_SOLVE_MSG,
            websocket_id,
            {'search_id': solver.search.search_id},
            timeout,
            catch_traceback(
                RECEIVE_SOLVE_MSG,
                websocket_id,
                {'search_id': solver.search.search_id},
                solve_async))

    loop.run_in_executor(None, task)

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

    def found(model):
        describe_data = catch_traceback(
            RECEIVE_DESCRIBE_MSG,
            websocket_id,
            {'model_id': model.model_id},
            model.describe)

        requests.post(
            url=RECEIVE_ENDPOINT,
            json={
                KEY_SUCCESS: True,
                KEY_MESSAGE: "search describe successfully completed",
                KEY_DATA: describe_data,
                KEY_WEBSOCKET_ID: websocket_id,
                KEY_MSG_TYPE: RECEIVE_DESCRIBE_MSG
            })

    search = Search.load(
        system=data['system'],
        specification=data['specification'],
        system_params=data.get('system_params'),
        callback_found=found)

    def run_async():
        search.run()
        requests.post(
            url=RECEIVE_ENDPOINT,
            json={
                KEY_SUCCESS: True,
                KEY_MESSAGE: "solve successfully completed",
                KEY_DATA: {'search_id': search.search_id},
                KEY_WEBSOCKET_ID: websocket_id,
                KEY_MSG_TYPE: RECEIVE_SEARCH_MSG
            })

    # kick off solver, without awaiting, with a max timeout
    def task():
        abortable_worker(
            RECEIVE_SEARCH_MSG,
            websocket_id,
            {'search_id': search.search_id},
            timeout,
            catch_traceback(
                RECEIVE_SEARCH_MSG,
                websocket_id,
                {'search_id': search.search_id},
                run_async))

    loop.run_in_executor(None, task)

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

    def describe_async(model_id):
        model = Model.load(model_id=model_id)
        requests.post(
            url=RECEIVE_ENDPOINT,
            json={
                KEY_SUCCESS: True,
                KEY_MESSAGE: "describe successfully completed",
                KEY_DATA: model.describe(),
                KEY_WEBSOCKET_ID: websocket_id,
                KEY_MSG_TYPE: RECEIVE_DESCRIBE_MSG
            })

    # kick off, without awaiting, with a max timeout
    def task():
        abortable_worker(
            RECEIVE_DESCRIBE_MSG,
            websocket_id,
            {'model_id': data['model_id']},
            timeout,
            catch_traceback(
                RECEIVE_DESCRIBE_MSG,
                websocket_id,
                {'model_id': data['model_id']},
                describe_async,
                data['model_id']))

    loop.run_in_executor(None, task)

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

    def produce_async():
        model = Model.load(data['model_id'])
        requests.post(RECEIVE_ENDPOINT, json={
            KEY_SUCCESS: True,
            KEY_MSG_TYPE: RECEIVE_PRODUCE_MSG,
            KEY_WEBSOCKET_ID: websocket_id,
            KEY_MESSAGE: "produce successfully completed",
            KEY_DATA: {
                "search_id": model.search_id,
                "model_id": model.model_id,
                "produce": model.produce(data['specification'])
            }
        })

    # kick off solver, without awaiting, with a max timeout
    def task():
        abortable_worker(
            RECEIVE_PRODUCE_MSG,
            websocket_id,
            {'model_id': data['model_id']},
            timeout,
            catch_traceback(
                RECEIVE_PRODUCE_MSG,
                websocket_id,
                {'model_id': data['model_id']},
                produce_async))

    loop.run_in_executor(None, task)

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

    def score_async():
        model = Model.load(data['model_id'])
        requests.post(RECEIVE_ENDPOINT, json={
            KEY_SUCCESS: True,
            KEY_MSG_TYPE: RECEIVE_SCORE_MSG,
            KEY_WEBSOCKET_ID: websocket_id,
            KEY_MESSAGE: "score successfully completed",
            KEY_DATA: {
                "search_id": model.search_id,
                "model_id": model.model_id,
                "score": model.score(data['specification'])
            }
        })

    # kick off solver, without awaiting, with a max timeout
    def task():
        abortable_worker(
            RECEIVE_SCORE_MSG,
            websocket_id,
            {'model_id': data['model_id']},
            timeout,
            catch_traceback(
                RECEIVE_SCORE_MSG,
                websocket_id,
                {'model_id': data['model_id']},
                score_async))

    loop.run_in_executor(None, task)

    return {
        KEY_SUCCESS: True,
        KEY_MESSAGE: "score successfully started"
    }


if __name__ == '__main__':

    # executor = concurrent.futures.ThreadPoolExecutor(max_workers=NUM_PROCESSES)
    loop = asyncio.get_event_loop()
    loop.set_debug(True)

    try:
        flask_app.run(port=8001, threaded=True)
    finally:
        loop.stop()


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
