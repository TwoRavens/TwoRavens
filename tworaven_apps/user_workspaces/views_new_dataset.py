"""Views for User Workspaces"""
from django.shortcuts import render

from django.http import HttpResponse, Http404, JsonResponse, HttpResponseRedirect
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect

from django.urls import reverse

from tworaven_apps.utils.view_helper import \
    (get_request_body_as_json,
     get_json_error,
     get_json_success)

from tworaven_apps.configurations.models_d3m import D3MConfiguration
from tworaven_apps.configurations.utils import clear_output_directory

from tworaven_apps.user_workspaces.utils import get_latest_user_workspace

from tworaven_apps.utils.view_helper import \
    (get_authenticated_user,)
from tworaven_apps.ta2_interfaces.stored_data_util import StoredRequestUtil

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

    ws_info = get_latest_user_workspace(request)
    if not ws_info.success:
        # TODO: Need a better error here!
        #
        user_msg = 'User workspace not found: %s' % ws_info.err_msg
        return JsonResponse(get_json_error(user_msg))

    user_workspace = ws_info.result_obj

    # New, chosen config to switch to
    #
    new_d3m_config = D3MConfiguration.objects.filter(id=config_id).first()
    if not new_d3m_config:
        raise Http404(f'D3MConfiguration not found for id {config_id}')


    # Don't switch to config you already have!
    #
    if user_workspace.d3m_config.id == new_d3m_config.id:
        # TODO: Need a better error here!
        #
        user_msg = (f'The dataset was not switched!'
                    f' You are already analyzing dataset:'
                    f' {user_workspace.d3m_config.name}')
        return JsonResponse(get_json_error(user_msg))

    # (1) stop searches.... Should happen with UI or with UserWorkspace
    #
    # drastic.., e.g. stop all searches in request history
    StoredRequestUtil.stop_search_requests(**dict(user=user_workspace.user))

    return HttpResponse((f'config_id: {config_id}<br />'
                         f' user_workspace {user_workspace}'))
    # (2) Clear TA2/TA3 output directory
    #
    clear_output_directory(user_workspace.d3m_config)

    # (3) Clear StoredRequest/StoredResponse objects for current user
    #
    StoredRequestUtil.clear_saved_requests_responses(user_id=user_workspace.user)


    # (4) Clear behavioral logs for current user
    #
    # See: view_clear_logs_for_user

    # (5) Clear user workspaces
    #
    # See:


    # (6) Set new default config
    #

    # (6a) Mongo?
    #

    # (7) Redirect to pebbles page
    #

    return HttpResponse('blah: ' + config_id)
    #info = dict(title='hi',
    #            config_id=config_id)

    return render(request,
                  'user_workspaces/view_list_dataset_choices.html',
                  info)
