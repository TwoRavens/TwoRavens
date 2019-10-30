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

from tworaven_apps.user_workspaces import utils as ws_util

from tworaven_apps.utils.view_helper import \
    (get_authenticated_user,)

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

    d3m_config = D3MConfiguration.objects.filter(id=config_id).first()
    if not d3m_config:
        raise Http404(f'D3MConfiguration not found for id {config_id}')

    # Get current config
    #
    current_config = get_latest_d3m_config()
    if not current_config:
        raise Http404(f'current_config not found!')

    # (1) stop searches.... Should happen with UI or with UserWorkspace
    #

    # (2) Clear TA2/TA3 output directory
    #
    clear_output_directory(current_config)

    # (3) Clear gRPC logs for current user
    #
    # See: view_clear_grpc_stored_history(request):

    # (4) Clear behavioral logs for current user
    #
    # See: view_clear_logs_for_user

    # (5) Clear user workspaces
    #
    # See:


    # (6) Set new default config
    #


    # (7) Redirect to pebbles page
    #

    return HttpResponse('blah: ' + config_id)
    #info = dict(title='hi',
    #            config_id=config_id)

    return render(request,
                  'user_workspaces/view_list_dataset_choices.html',
                  info)
