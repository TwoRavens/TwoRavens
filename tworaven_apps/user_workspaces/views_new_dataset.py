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

from tworaven_apps.user_workspaces import utils as ws_util

from tworaven_apps.user_workspaces.reset_util import ResetUtil

from tworaven_apps.utils.view_helper import \
    (get_authenticated_user,)
from tworaven_apps.configurations.utils import \
    (get_latest_d3m_config,)


@login_required
def view_list_dataset_choices(request):
    """List datasets for a user to examine"""

    params = dict(is_selectable_dataset=True)
    configs = D3MConfiguration.objects.filter(**params\
                    ).order_by('-is_default', 'name')

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

    if not new_d3m_config.is_selectable_dataset:
        user_msg = (f'This dataset is not available for'
                    f' selection {new_d3m_config}')
        return JsonResponse(get_json_error(user_msg))

    # Tries to fetch the UserWorkspace and is ready to "reset"
    #   by clearing logs, stopping searches, etc.
    #
    reset_util = ResetUtil(user=user, **dict(request_obj=request))
    if reset_util.has_error():
        return JsonResponse(get_json_error(reset_util.get_err_msg()))

    current_d3m_config = reset_util.get_d3m_config()

    # Don't switch to config you already have!
    #
    if current_d3m_config and current_d3m_config.id == new_d3m_config.id:
        # TODO: Need a better error here!
        #
        user_msg = (f'The dataset was not switched!'
                    f' You are already analyzing dataset:'
                    f' {current_d3m_config.name}')
        return JsonResponse(get_json_error(user_msg))

    # Now really stop searches, clears logs, etc, etc
    #
    reset_util.start_the_reset()

    # Set new default config
    #
    check_build_output_directories(new_d3m_config)

    set_info = D3MConfiguration.set_as_default(new_d3m_config)
    if set_info.success:
        print('New config set!')
    else:
        print(set_info.err_msg)

    # (7) Redirect to pebbles page
    #
    return HttpResponseRedirect(reverse('home'))
