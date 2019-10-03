import requests

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from tworaven_apps.ta2_interfaces.websocket_message import WebsocketMessage

from tworaven_apps.solver_interfaces.model import (FLASK_SOLVER_SERVICE)
from tworaven_apps.utils.view_helper import (
    get_authenticated_user, get_request_body_as_json,
    get_json_error, get_json_success)


def view_send_factory(app):

    @csrf_exempt
    def generated(request):
        user_info = get_authenticated_user(request)
        if not user_info.success:
            return JsonResponse(get_json_error(user_info.err_msg))

        raven_data_info = get_request_body_as_json(request)
        if not raven_data_info.success:
            err_msg = f"request.body not found for {app}"
            return JsonResponse(get_json_error(err_msg))

        req_data = raven_data_info.result_obj

        user_obj = user_info.result_obj
        websocket_id = user_obj.username

        try:
            response = requests.post(FLASK_SOLVER_SERVICE + app, json={
                "websocket_id": websocket_id,
                **req_data
            })
        except requests.exceptions.ConnectionError:
            return JsonResponse(get_json_error("solver service is not available"))

        if response.status_code != 200:
            err_msg = "flask search error"
            return JsonResponse(get_json_error(err_msg))

        return JsonResponse(response.json())

    return generated


@csrf_exempt
def view_receive(request):
    """ receive requests from flask, to django, to forward data to frontend """

    raven_data_info = get_request_body_as_json(request)
    if not raven_data_info.success:
        err_msg = "request.body not found for receive"
        return JsonResponse(get_json_error(err_msg))

    req_data = raven_data_info.result_obj

    msg_type = req_data.get('msg_type')
    websocket_id = req_data.get('websocket_id')

    if req_data.get('success'):
        ws_msg = WebsocketMessage.get_success_message(
            msg_type,
            req_data.get('message'),
            data=req_data.get('data'))
    else:
        ws_msg = WebsocketMessage.get_fail_message_with_data(
            msg_type,
            req_data.get('message'),
            data=req_data.get('data'))

    ws_msg.send_message(websocket_id)

    return JsonResponse(get_json_success('data received'))
