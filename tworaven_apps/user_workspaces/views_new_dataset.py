"""Views for User Workspaces"""
from django.shortcuts import render

from django.http import HttpResponse, Http404, JsonResponse, HttpResponseRedirect
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect

from django.urls import reverse
from tworaven_apps.utils.view_helper import get_authenticated_user

from tworaven_apps.utils.view_helper import \
    (get_request_body_as_json,
     get_json_error,
     get_json_success)

from tworaven_apps.configurations.models_d3m import D3MConfiguration
from tworaven_apps.configurations.utils import \
    (clear_output_directory,
     check_build_output_directories)
from tworaven_apps.behavioral_logs.log_formatter import BehavioralLogFormatter

from tworaven_apps.user_workspaces import utils as ws_util

from tworaven_apps.utils.view_helper import \
    (get_authenticated_user,)
from tworaven_apps.ta2_interfaces.stored_data_util import StoredRequestUtil
from tworaven_apps.ta2_interfaces.search_history_util import SearchHistoryUtil

from tworaven_apps.configurations.utils import \
    (get_latest_d3m_config,)


@login_required
def view_list_dataset_choices(request):
    """List datasets for a user to examine"""

    configs = D3MConfiguration.objects.all().order_by('-is_default', 'name')

    info = dict(title='Available Datasets',
                configs=configs)

    return render(request,
                  'user_workspaces/view_list_dataset_choices.html',
                  info)
    #render('view_list_dataset_choices')

@login_required
def view_select_dataset(request, config_id=None):
    """Clear lots of existing data and switch datasets"""
    if config_id is None:
        raise Http404('"config_id" is required')

    # The user is required...
    #
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))
    user = user_info.result_obj

    # Retrieve the chosen D3M config
    #
    new_d3m_config = D3MConfiguration.objects.filter(id=config_id).first()
    if not new_d3m_config:
        raise Http404(f'D3MConfiguration not found for id {config_id}')

    # If available, try to get the workspace
    #
    user_workspace = None
    current_d3m_config = None

    ws_info = ws_util.get_latest_user_workspace(request)
    if ws_info.success:
        user_workspace = ws_info.result_obj
        current_d3m_config = user_workspace.d3m_config
    else:
        current_d3m_config = get_latest_d3m_config()

    # Don't switch to config you already have!
    #
    if current_d3m_config and current_d3m_config.id == new_d3m_config.id:
        # TODO: Need a better error here!
        #
        user_msg = (f'The dataset was not switched!'
                    f' You are already analyzing dataset:'
                    f' {current_d3m_config.name}')
        return JsonResponse(get_json_error(user_msg))

    # (1) stop searches.... Should happen with UI or with UserWorkspace
    #
    # Stop all searches in request history
    #
    StoredRequestUtil.stop_search_requests(**dict(user=user))

    # (2) Clear TA2/TA3 output directory
    #
    if current_d3m_config:
        clear_output_directory(current_d3m_config)


    # (3) Clear StoredRequest/StoredResponse objects for current user
    #
    clear_info = SearchHistoryUtil.clear_grpc_stored_history(user)
    if clear_info.success:
        print('\n'.join(clear_info.result_obj))
    else:
        print(clear_info.err_msg)

    # (4) Clear behavioral logs for current user
    #
    # See: view_clear_logs_for_user
    log_clear = BehavioralLogFormatter.delete_logs_for_user(user)
    if log_clear.success:
        print('\n'.join(log_clear.result_obj))
    else:
        print(log_clear.err_msg)

    # (5) Clear user workspaces
    #
    delete_info = ws_util.delete_user_workspaces(user)
    if not delete_info.success:
        print(delete_info.err_msg)
    else:
        print('workspaces cleared')


    # (6) Set new default config
    #
    check_build_output_directories(new_d3m_config)

    set_info = D3MConfiguration.set_as_default(new_d3m_config)
    if set_info.success:
        print('New config set!')
    else:
        print(set_info.err_msg)

    # (6a) Mongo?
    #

    # (7) Redirect to pebbles page
    #
    return HttpResponseRedirect(reverse('home'))

    #return HttpResponse('blah: ' + config_id)
    #info = dict(title='hi',
    #            config_id=config_id)

    #return render(request,
    #              'user_workspaces/view_list_dataset_choices.html',
    #              info)
