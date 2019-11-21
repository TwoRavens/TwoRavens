import time
import traceback

from tworaven_apps.ta2_interfaces.websocket_message import WebsocketMessage
from tworavensproject.celery import celery_app

from tworaven_apps.solver_interfaces.models import (
    KEY_DATA,
    RECEIVE_SOLVE_MSG,
    RECEIVE_SEARCH_MSG,
    RECEIVE_DESCRIBE_MSG,
    RECEIVE_SCORE_MSG,
    RECEIVE_PRODUCE_MSG)

from tworaven_apps.solver_interfaces.util_solve import Solve
from tworaven_apps.solver_interfaces.util_search import Search
from tworaven_apps.solver_interfaces.util_model import Model

from celery.utils.log import get_task_logger
logger = get_task_logger(__name__)


@celery_app.task(ignore_result=True)
def solve_task(websocket_id, system_id, specification, system_params=None, search_id=None):

    system_params = system_params or {}

    # called when a new model is discovered while searching
    def solve_found_async(model: Model):
        model.save()

        describe_task.delay(websocket_id, model.model_id)

        for score_spec in specification['score']:
            score_task.delay(websocket_id, model.model_id, score_spec)

        for produce_spec in specification['produce']:
            produce_task.delay(websocket_id, model.model_id, produce_spec)

    solver = Solve(
        system=system_id,
        specification=specification,
        system_params=system_params,
        callback_found=solve_found_async,
        search_id=search_id)

    start_time = time.time()
    try:
        result = solver.run()
    except Exception:
        logger.info("caught traceback when running solver:")
        logger.info(traceback.format_exc())
        ws_msg = WebsocketMessage.get_fail_message_with_data( \
            RECEIVE_SOLVE_MSG,
            'solve failed due to exception',
            data={
                'search_id': solver.search.search_id,
                'system': solver.system
            })
        ws_msg.send_message(websocket_id)
        return

    stop_time = time.time()
    if KEY_DATA not in result:
        result[KEY_DATA] = {}
    result[KEY_DATA]['elapsed_time'] = stop_time - start_time

    ws_msg = WebsocketMessage.get_success_message(
        RECEIVE_SOLVE_MSG,
        result.get('message'),
        data=result.get('data'))
    ws_msg.send_message(websocket_id)


@celery_app.task(ignore_result=True)
def search_task(websocket_id, system_id, specification, system_params=None, search_id=None):

    system_params = system_params or {}

    def search_found_async(model: Model):
        model.save()
        describe_task.delay(websocket_id, model.model_id)

    search = Search.load(
        system=system_id,
        specification=specification,
        system_params=system_params,
        callback_found=search_found_async,
        search_id=search_id)

    start_time = time.time()
    try:
        result = search.run()
    except Exception:
        logger.info("caught traceback when running search:")
        logger.info(traceback.format_exc())
        ws_msg = WebsocketMessage.get_fail_message_with_data( \
            RECEIVE_SEARCH_MSG,
            'search failed due to exception',
            data={
                'search_id': search.search_id,
                'system': search.system
            })
        ws_msg.send_message(websocket_id)
        return

    stop_time = time.time()
    if KEY_DATA not in result:
        result[KEY_DATA] = {}
    result[KEY_DATA]['elapsed_time'] = stop_time - start_time

    ws_msg = WebsocketMessage.get_success_message(
        RECEIVE_SEARCH_MSG,
        result.get('message'),
        data=result.get('data'))
    ws_msg.send_message(websocket_id)


@celery_app.task(ignore_result=True)
def describe_task(websocket_id, model_id):

    model = load_model_helper(websocket_id, model_id)
    if not model:
        return

    try:
        result = model.describe()
    except Exception:
        logger.info("caught traceback when running describe:")
        logger.info(traceback.format_exc())

        ws_msg = WebsocketMessage.get_fail_message_with_data( \
            RECEIVE_DESCRIBE_MSG,
            'describe failed due to exception',
            data={
                'model_id': model.model_id,
                'search_id': model.search_id,
                'system': model.system
            })
        ws_msg.send_message(websocket_id)
        return

    ws_msg = WebsocketMessage.get_success_message(
        RECEIVE_DESCRIBE_MSG,
        "describe successfully completed",
        data=result)
    ws_msg.send_message(websocket_id)


@celery_app.task(ignore_result=True)
def score_task(websocket_id, model_id, spec):

    model = load_model_helper(websocket_id, model_id)
    if not model:
        return

    try:
        result = model.score(spec)
    except Exception:
        logger.info("caught traceback when running score:")
        logger.info(traceback.format_exc())

        ws_msg = WebsocketMessage.get_fail_message_with_data( \
            RECEIVE_SCORE_MSG,
            'score failed due to exception',
            data={
                'model_id': model.model_id,
                'search_id': model.search_id,
                'system': model.system
            })
        ws_msg.send_message(websocket_id)
        return

    ws_msg = WebsocketMessage.get_success_message(
        RECEIVE_SCORE_MSG,
        "score successfully completed",
        data=result)
    ws_msg.send_message(websocket_id)


@celery_app.task(ignore_result=True)
def produce_task(websocket_id, model_id, spec):

    model = load_model_helper(websocket_id, model_id)
    if not model:
        return

    try:
        produce_data = model.produce(spec)
    except Exception:
        logger.info("caught traceback when running produce:")
        logger.info(traceback.format_exc())

        ws_msg = WebsocketMessage.get_fail_message_with_data( \
            RECEIVE_PRODUCE_MSG,
            'produce failed due to exception',
            data={
                'model_id': model.model_id,
                'search_id': model.search_id,
                'system': model.system
            })
        ws_msg.send_message(websocket_id)
        return

    ws_msg = WebsocketMessage.get_success_message(
        RECEIVE_PRODUCE_MSG,
        "produce successfully completed",
        data=produce_data)
    ws_msg.send_message(websocket_id)


def load_model_helper(websocket_id, model_id):
    """ utility for loading a model with websocket error handling """
    try:
        return Model.load(model_id)
    except Exception:
        logger.info("caught traceback when running describe:")
        logger.info(traceback.format_exc())

        ws_msg = WebsocketMessage.get_fail_message_with_data( \
            RECEIVE_DESCRIBE_MSG,
            f'describe failed loading model: could not find model {model_id}',
            data={
                'model_id': model_id
            })
        ws_msg.send_message(websocket_id)
