from django.shortcuts import render

from django.http import HttpResponse, JsonResponse, Http404, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
#from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.urls import reverse

from tworaven_apps.utils.view_helper import \
    (get_request_body,
     get_request_body_as_json,
     get_json_error,
     get_json_success)
from tworaven_apps.utils.json_helper import format_pretty_from_dict

from tworaven_apps.configurations.utils import get_latest_d3m_config

from tworaven_apps.user_workspaces.models import \
    (UserWorkspace,)
from tworaven_apps.user_workspaces import static_vals as uw_static

from tworaven_apps.user_workspaces.utils import \
    (get_user_workspaces,
     get_user_workspaces_as_dict,
     get_user_workspace_config,
     get_saved_workspace_by_request_and_id,
     delete_user_workspaces,)

from tworaven_apps.configurations.models_d3m import D3MConfiguration
from tworaven_apps.utils.view_helper import \
    (get_authenticated_user,)


@csrf_exempt
def save_raven_config_to_existing_workspace(request, workspace_id):
    """Save a new raven config to an existing workspace
    POST request containing JSON with new request
    """

    # Get the workspace, checking if the user in the request
    #   is the one in the workspace
    #
    ws_info = get_saved_workspace_by_request_and_id(request, workspace_id)
    if not ws_info.success:
        print('save_raven_config_to_existing_workspace 1')
        return JsonResponse(get_json_error(ws_info.err_msg))
    user_workspace = ws_info.result_obj

    # Get the Ravens config from the POST
    #
    raven_config_info = get_request_body_as_json(request)
    if not raven_config_info.success:
        print('save_raven_config_to_existing_workspace 2')
        return JsonResponse(get_json_error(raven_config_info.err_msg))

    raven_config = raven_config_info.result_obj

    # Check for the 'name' key (other checks can be added...)
    #
    if not uw_static.KEY_RAVEN_CONFIG_NAME in raven_config:
        print('save_raven_config_to_existing_workspace 3')
        user_msg = (f'The workspace could not be saved.'
                    f' (The raven_config did not contain a'
                    f' "{uw_static.KEY_RAVEN_CONFIG_NAME}" key)')

        print('user_msg', user_msg)
        return JsonResponse(get_json_error(user_msg))

    user_workspace.raven_config = raven_config
    user_workspace.save()

    ws_dict = user_workspace.to_dict()

    json_msg = get_json_success('Workspace saved.',
                                data=ws_dict)

    print('save_raven_config_to_existing_workspace 4', json_msg)

    return JsonResponse(json_msg)


@csrf_exempt
def clear_user_workspaces(request):
    """Clear the workspaces of the logged in User and return to pebbles page"""

    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    user = user_info.result_obj
    delete_info = delete_user_workspaces(user)
    if not delete_info.success:
        return JsonResponse(get_json_error(delete_info.err_msg))

    return HttpResponseRedirect(reverse('home'))


@csrf_exempt
def view_set_current_config(request, user_workspace_id):
    # Get the user
    #
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    user = user_info.result_obj

    ws_info = get_user_workspace_config(user, user_workspace_id)
    if not ws_info.success:
        user_msg = 'No active workspaces found for user: %s and id: %d' % \
                    (user.username, user_workspace_id)
        return JsonResponse(get_json_error(user_msg))

    user_workspace = ws_info.result_obj
    user_workspace.is_current_workspace = True
    user_workspace.save()

    user_msg = 'New workspace set: %s' % user_workspace

    return JsonResponse(get_json_success(user_msg))
    #                        data=user_workspace.to_dict())
    # user_workspace    ws_dict = ws_info.result_obj.to_dict()

@csrf_exempt
def view_delete_config(request, user_workspace_id):
    """If this is the current dataset"""
    # Get the user
    #
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    user = user_info.result_obj

    ws_info = get_user_workspace_config(user, user_workspace_id)
    if not ws_info.success:
        user_msg = 'No active workspaces found for user: %s and id: %s' % \
                    (user.username, user_workspace_id)
        return JsonResponse(get_json_error(user_msg))

    user_workspace = ws_info.result_obj

    if user_workspace.is_current_workspace:
        user_msg = 'You cannot delete the current workspace from the UI'
        return JsonResponse(get_json_error(user_msg))

    ws_name = '%s' % user_workspace

    user_workspace.delete()
    user_workspace.save()

    user_msg = 'Workspace deleted: %s' % ws_name

    return JsonResponse(get_json_success(user_msg))
    #                        data=user_workspace.to_dict())
    # user_workspace    ws_dict = ws_info.result_obj.to_dict()


@csrf_exempt
def view_user_raven_config(request, user_workspace_id):
    """Retrieve information for a single workspace"""
    # Get the user
    #
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    user = user_info.result_obj

    ws_info = get_user_workspace_config(user, user_workspace_id)
    if not ws_info.success:
        user_msg = 'No active workspaces found for user: %s and id: %s' % \
                    (user.username, user_workspace_id)
        return JsonResponse(get_json_error(user_msg))

    ws_dict = ws_info.result_obj.to_dict_v2()

    json_msg = get_json_success('Workspace found.',
                                data=ws_dict)

    if 'pretty' in request.GET:
        fmt_info = format_pretty_from_dict(json_msg)
        if not fmt_info.success:
            return JsonResponse(get_json_error(fmt_info.err_msg))
        return HttpResponse('<pre>%s</pre>' % fmt_info.result_obj)

    return JsonResponse(json_msg)

@csrf_exempt
def view_user_workspace_config(request, user_workspace_id):
    """Retrieve information for a single workspace"""
    # Get the user
    #
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    user = user_info.result_obj

    ws_info = get_user_workspace_config(user, user_workspace_id)
    if not ws_info.success:
        user_msg = 'No active workspaces found for user: %s and id: %d' % \
                    (user.username)
        return JsonResponse(get_json_error(user_msg))

    ws_dict = ws_info.result_obj.to_dict()

    json_msg = get_json_success('Workspace found.',
                                data=ws_dict)

    if 'pretty' in request.GET:
        fmt_info = format_pretty_from_dict(json_msg)
        if not fmt_info.success:
            return JsonResponse(get_json_error(fmt_info.err_msg))
        return HttpResponse('<pre>%s</pre>' % fmt_info.result_obj)

    return JsonResponse(json_msg)


@csrf_exempt
def view_latest_raven_configs(request):
    """View config list with d3mconfig as separate object"""
    # Get the user
    #
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    user = user_info.result_obj
    workspace_info = get_user_workspaces_as_dict(user, use_version2_json=True)

    if not workspace_info.success:
        return JsonResponse(get_json_error(workspace_info.err_msg))

    json_msg = get_json_success(\
                'Workspaces found: %d' % len(workspace_info.result_obj),
                data=workspace_info.result_obj)

    if 'pretty' in request.GET:
        fmt_info = format_pretty_from_dict(json_msg)
        if not fmt_info.success:
            return JsonResponse(get_json_error(fmt_info.err_msg))

        return HttpResponse('<pre>%s</pre>' % fmt_info.result_obj)

    return JsonResponse(json_msg)


@csrf_exempt
def view_latest_user_configs(request):
    """Return a list of configs based on the default problem and the user"""
    #return JsonResponse(get_json_error('just checking...'))

    # Get the user
    #
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    user = user_info.result_obj
    workspace_info = get_user_workspaces_as_dict(user)

    if not workspace_info.success:
        return JsonResponse(get_json_error(workspace_info.err_msg))

    json_msg = get_json_success(\
                'Workspaces found: %d' % len(workspace_info.result_obj),
                data=workspace_info.result_obj)

    if 'pretty' in request.GET:
        fmt_info = format_pretty_from_dict(json_msg)
        if not fmt_info.success:
            return JsonResponse(get_json_error(fmt_info.err_msg))

        return HttpResponse('<pre>%s</pre>' % fmt_info.result_obj)

    return JsonResponse(json_msg)

@csrf_exempt
def view_reset_user_configs(request):
    """Delete UserWorkspace objects based on the User and base Config"""
    # Get the user
    #
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    # Delete workspaces (if any)
    #
    user = user_info.result_obj
    delete_info = delete_user_workspaces(user)
    if not delete_info.success:
        return JsonResponse(get_json_error(delete_info.err_msg))

    # Now reset them
    #
    return view_latest_user_configs(request)
