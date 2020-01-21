
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from tworaven_apps.ta2_interfaces.tasks import create_destination_directory
from tworaven_apps.utils.view_helper import (
    get_authenticated_user, get_request_body_as_json,
    get_json_error)

import json
import os

from tworaven_apps.solver_interfaces.models import (
    KEY_SUCCESS,
    KEY_DATA,
    KEY_MESSAGE,
    SAVED_MODELS_PATH,
    EXPORTED_MODELS_PATH, DEBUG_MODE)

from tworaven_apps.solver_interfaces.util_search import Search

from tworaven_apps.solver_interfaces import tasks
import zipfile

from tworaven_apps.user_workspaces.utils import get_latest_user_workspace

NUM_PROCESSES = 4

# 8 hours
TIMEOUT_MAX = 60 * 60 * 8
TIMEOUT_DEFAULT = 60 * 5


@csrf_exempt
def view_solve(request):

    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))
    user_obj = user_info.result_obj

    raven_data_info = get_request_body_as_json(request)
    if not raven_data_info.success:
        err_msg = f"request.body not found for solve"
        return JsonResponse(get_json_error(err_msg))
    data = raven_data_info.result_obj

    # workspace
    user_workspace_info = get_latest_user_workspace(request)
    if not user_workspace_info.success:
        return JsonResponse(get_json_error(user_workspace_info.err_msg))
    user_workspace = user_workspace_info.result_obj

    websocket_id = user_obj.username
    specification = data['specification']
    system_id = data['system']
    system_params = data.get('system_params', {})

    # create a location where the solver may write to disk
    dest_dir_info = create_destination_directory(user_workspace, name='solver_scratch_space')
    if not dest_dir_info[KEY_SUCCESS]:
        return JsonResponse(get_json_error(dest_dir_info.err_msg))
    dest_directory = dest_dir_info[KEY_DATA]
    specification['temp_directory'] = dest_directory

    # TODO: timeout on celery worker
    # sanity check timeout
    if isinstance(data.get('timeout', None), (int, float)):
        timeout = min(max(data.get('timeout'), 0), TIMEOUT_MAX)
    else:
        timeout = TIMEOUT_DEFAULT

    search_id = Search.get_search_id()

    task_handle = tasks.solve_task
    if not DEBUG_MODE:
        task_handle = task_handle.delay
    task_handle(websocket_id, system_id, specification, system_params, search_id)

    return JsonResponse({
        KEY_SUCCESS: True,
        KEY_MESSAGE: "solve successfully started",
        KEY_DATA: {"search_id": search_id}
    })


@csrf_exempt
def view_search(request):

    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))
    user_obj = user_info.result_obj

    raven_data_info = get_request_body_as_json(request)
    if not raven_data_info.success:
        err_msg = f"request.body not found for solve"
        return JsonResponse(get_json_error(err_msg))
    data = raven_data_info.result_obj

    websocket_id = user_obj.username
    specification = data['specification']
    system_id = data['system']
    system_params = data.get('system_params', {})

    # sanity check timeout
    if isinstance(data.get('timeout', None), (int, float)):
        timeout = min(max(data.get('timeout'), 0), TIMEOUT_MAX)
    else:
        timeout = TIMEOUT_DEFAULT

    print("timeout:", timeout)
    print(json.dumps(specification))
    print(json.dumps(system_params))

    search_id = Search.get_search_id()
    tasks.search_task.delay(websocket_id, system_id, specification, system_params, search_id)

    return JsonResponse({
        KEY_SUCCESS: True,
        KEY_MESSAGE: "search successfully started",
        KEY_DATA: {"search_id": search_id}
    })


@csrf_exempt
def view_describe(request):

    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))
    user_obj = user_info.result_obj

    raven_data_info = get_request_body_as_json(request)
    if not raven_data_info.success:
        err_msg = f"request.body not found for solve"
        return JsonResponse(get_json_error(err_msg))
    data = raven_data_info.result_obj

    websocket_id = user_obj.username
    model_id = data['model_id']

    # sanity check timeout
    if isinstance(data.get('timeout', None), (int, float)):
        timeout = min(max(data.get('timeout'), 0), TIMEOUT_MAX)
    else:
        timeout = TIMEOUT_DEFAULT

    tasks.describe_task.delay(websocket_id, model_id)

    return JsonResponse({
        KEY_SUCCESS: True,
        KEY_MESSAGE: "describe successfully started"
    })


@csrf_exempt
def view_produce(request):

    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))
    user_obj = user_info.result_obj

    raven_data_info = get_request_body_as_json(request)
    if not raven_data_info.success:
        err_msg = f"request.body not found for solve"
        return JsonResponse(get_json_error(err_msg))
    data = raven_data_info.result_obj

    websocket_id = user_obj.username
    model_id = data['model_id']
    specification = data['specification']

    # sanity check timeout
    if isinstance(data.get('timeout', None), (int, float)):
        timeout = min(max(data.get('timeout'), 0), TIMEOUT_MAX)
    else:
        timeout = TIMEOUT_DEFAULT

    task_handle = tasks.produce_task
    if not DEBUG_MODE:
        task_handle = task_handle.delay
    task_handle(websocket_id, model_id, specification)

    return JsonResponse({
        KEY_SUCCESS: True,
        KEY_MESSAGE: "produce successfully started"
    })


@csrf_exempt
def view_score(request):

    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))
    user_obj = user_info.result_obj

    raven_data_info = get_request_body_as_json(request)
    if not raven_data_info.success:
        err_msg = f"request.body not found for solve"
        return JsonResponse(get_json_error(err_msg))
    data = raven_data_info.result_obj

    websocket_id = user_obj.username
    model_id = data['model_id']
    specification = data['specification']

    # sanity check timeout
    if isinstance(data.get('timeout', None), (int, float)):
        timeout = min(max(data.get('timeout'), 0), TIMEOUT_MAX)
    else:
        timeout = TIMEOUT_DEFAULT

    task_handle = tasks.score_task
    if not DEBUG_MODE:
        task_handle = task_handle.delay
    task_handle(websocket_id, model_id, specification)

    return JsonResponse({
        KEY_SUCCESS: True,
        KEY_MESSAGE: "score successfully started"
    })


@csrf_exempt
def view_download(request):

    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))
    user_obj = user_info.result_obj

    raven_data_info = get_request_body_as_json(request)
    if not raven_data_info.success:
        err_msg = f"request.body not found for solve"
        return JsonResponse(get_json_error(err_msg))
    data = raven_data_info.result_obj
    model_id = data.get('model_id')

    if model_id:
        return JsonResponse({
            KEY_SUCCESS: False,
            KEY_MESSAGE: '"model_id" is a required field'
        })

    save_path = os.path.join(SAVED_MODELS_PATH, model_id)
    export_path = os.path.join(EXPORTED_MODELS_PATH, model_id + '.zip')

    if not os.path.exists(save_path):
        return JsonResponse({
            KEY_SUCCESS: False,
            KEY_MESSAGE: f'model "{model_id}" does not exist'
        })

    if not os.path.exists(EXPORTED_MODELS_PATH):
        os.makedirs(EXPORTED_MODELS_PATH)

    if not os.path.exists(export_path):
        with zipfile.ZipFile(export_path, 'w', zipfile.ZIP_DEFLATED) as zfile:
            for root, dirs, files in os.walk(save_path):
                for file in files:
                    zfile.write(os.path.join(root, file),
                                os.path.relpath(os.path.join(root, file), os.path.join(save_path, '..')))

    return JsonResponse({
        KEY_SUCCESS: True,
        KEY_DATA: {'model_pointer': 'file://' + export_path}
    })
