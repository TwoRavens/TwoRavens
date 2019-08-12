import json
import requests

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from tworaven_apps.ta2_interfaces.websocket_message import WebsocketMessage

from tworaven_apps.solver_interfaces.model import (
    RECEIVE_SOLUTION_MSG,
    RECEIVE_SCORE_MSG,
    RECEIVE_PRODUCE_MSG,
    FLASK_SOLVER_SERVICE)
from tworaven_apps.utils.view_helper import get_authenticated_user, get_json_error, get_request_body_as_json, \
    get_json_success


@csrf_exempt
def view_solve(request):

    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    raven_data_info = get_request_body_as_json(request)
    if not raven_data_info.success:
        err_msg = "request.body not found for solve"
        return JsonResponse(get_json_error(err_msg))

    req_data = raven_data_info.result_obj

    print(json.dumps(req_data))

    user_obj = user_info.result_obj
    websocket_id = user_obj.username

    response = requests.post(FLASK_SOLVER_SERVICE + 'solve', json={
        "websocket_id": websocket_id,
        **req_data
    })

    if response.status_code != 200:
        err_msg = "flask solve error"
        return JsonResponse(get_json_error(err_msg))

    return JsonResponse(get_json_success(
        'solve started',
        data=response.json()))


@csrf_exempt
def view_search(request):

    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    raven_data_info = get_request_body_as_json(request)
    if not raven_data_info.success:
        err_msg = "request.body not found for search"
        return JsonResponse(get_json_error(err_msg))

    req_data = raven_data_info.result_obj

    user_obj = user_info.result_obj
    websocket_id = user_obj.username

    response = requests.post(FLASK_SOLVER_SERVICE + 'search', json={
        "websocket_id": websocket_id,
        **req_data
    })

    if response.status_code != 200:
        err_msg = "flask search error"
        return JsonResponse(get_json_error(err_msg))

    return JsonResponse(get_json_success(
        'search started',
        data=response.json()))


@csrf_exempt
def view_describe(request):
    raven_data_info = get_request_body_as_json(request)
    if not raven_data_info.success:
        err_msg = "request.body not found for describe"
        return JsonResponse(get_json_error(err_msg))

    req_data = raven_data_info.result_obj
    response = requests.post(FLASK_SOLVER_SERVICE + 'describe', json=req_data)

    if response.status_code != 200:
        err_msg = "flask describe error"
        return JsonResponse(get_json_error(err_msg))

    return JsonResponse(get_json_success(
        'describe successful',
        data=response.json()))


@csrf_exempt
def view_score(request):

    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    raven_data_info = get_request_body_as_json(request)
    if not raven_data_info.success:
        err_msg = "request.body not found for score"
        return JsonResponse(get_json_error(err_msg))

    req_data = raven_data_info.result_obj

    user_obj = user_info.result_obj
    websocket_id = user_obj.username

    response = requests.post(FLASK_SOLVER_SERVICE + 'score', json={
        "websocket_id": websocket_id,
        **req_data
    })

    if response.status_code != 200:
        err_msg = "flask score error"
        return JsonResponse(get_json_error(err_msg))

    return JsonResponse(get_json_success(
        'score started',
        data=response.json()))


@csrf_exempt
def view_produce(request):

    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    raven_data_info = get_request_body_as_json(request)
    if not raven_data_info.success:
        err_msg = "request.body not found for produce"
        return JsonResponse(get_json_error(err_msg))

    req_data = raven_data_info.result_obj

    user_obj = user_info.result_obj
    websocket_id = user_obj.username

    response = requests.post(FLASK_SOLVER_SERVICE + 'produce', json={
        "websocket_id": websocket_id,
        **req_data
    })

    if response.status_code != 200:
        err_msg = "flask produce error"
        return JsonResponse(get_json_error(err_msg))

    return JsonResponse(get_json_success(
        'produce started',
        data=response.json()))

# ~~~~~~~~~~~~~~~~
# begin receive requests from flask, to django, to forward data to frontend
# ~~~~~~~~~~~~~~~~
@csrf_exempt
def view_receive_solution(request):

    raven_data_info = get_request_body_as_json(request)
    if not raven_data_info.success:
        err_msg = "request.body not found for receive solution"
        return JsonResponse(get_json_error(err_msg))

    req_data = raven_data_info.result_obj

    websocket_id = req_data.get('websocket_id')
    solution_description = req_data.get('data')

    ws_msg = WebsocketMessage.get_success_message(
        RECEIVE_SOLUTION_MSG,
        'it worked',
        data=solution_description)

    ws_msg.send_message(websocket_id)


@csrf_exempt
def view_receive_score(request):

    raven_data_info = get_request_body_as_json(request)
    if not raven_data_info.success:
        err_msg = "request.body not found for receive score"
        return JsonResponse(get_json_error(err_msg))

    req_data = raven_data_info.result_obj

    websocket_id = req_data.get('websocket_id')
    solution_description = req_data.get('data')

    ws_msg = WebsocketMessage.get_success_message(
        RECEIVE_SCORE_MSG,
        'it worked',
        data=solution_description)

    ws_msg.send_message(websocket_id)


@csrf_exempt
def view_receive_produce(request):

    raven_data_info = get_request_body_as_json(request)
    if not raven_data_info.success:
        err_msg = "request.body not found for receive produce"
        return JsonResponse(get_json_error(err_msg))

    req_data = raven_data_info.result_obj

    if not req_data['success']:
        return JsonResponse(get_json_error(req_data['message']))

    websocket_id = req_data.get('websocket_id')
    solution_description = req_data.get('data')

    ws_msg = WebsocketMessage.get_success_message(
        RECEIVE_PRODUCE_MSG,
        'it worked',
        data=solution_description)

    ws_msg.send_message(websocket_id)
