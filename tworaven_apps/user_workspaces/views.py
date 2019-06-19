"""Views for User Workspaces"""
import re
from django.shortcuts import render

from django.http import HttpResponse, JsonResponse, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from django.urls import reverse

from tworaven_apps.utils.view_helper import \
    (get_request_body_as_json,
     get_json_error,
     get_json_success)
from tworaven_apps.utils.json_helper import format_pretty_from_dict

from tworaven_apps.user_workspaces import static_vals as uw_static

from tworaven_apps.user_workspaces.utils import \
    (duplicate_user_workspace,
     # get_user_workspaces,
     get_user_workspaces_as_dict,
     get_user_workspace_config,
     get_saved_workspace_by_request_and_id,
     is_existing_workspace_name,
     delete_user_workspaces,)

from tworaven_apps.utils.view_helper import \
    (get_authenticated_user,)



@csrf_exempt
def view_shared_workspace_by_hash_id(request, hash_id):
    """Set a shared workspace to the user's current workspace and
    redirecto to the pebbles home page.
    Basic sequence:
    - Is it a public workspace?
    - Does the shared workspace.user match the logged in user?
      - Yes: Proceed as if loading a regular workspace
    - No:
        - Does the logged in user already have this workspace?  (e.g. as an original)
            - Yes: Load the workspace
            - No: Create a new workspace, copying the data from the shared workspaces
    """
    return JsonResponse(get_json_success('ok'))

@csrf_exempt
def save_raven_config_as_new_workspace(request, workspace_id):
    """Save a new raven config to an existing workspace
    POST request containing JSON with new request
    """

    # Get the workspace, checking if the user in the request
    #   is the one in the workspace
    #
    ws_info = get_saved_workspace_by_request_and_id(request, workspace_id)
    if not ws_info.success:
        return JsonResponse(get_json_error(ws_info.err_msg))
    user_workspace = ws_info.result_obj

    # Get the Ravens config from the POST
    #
    update_info = get_request_body_as_json(request)
    if not update_info.success:
        return JsonResponse(get_json_error(update_info.err_msg))

    update_dict = update_info.result_obj

    # Check for the 'new_workspace_name' key
    #   and make sure it's not a duplicate
    #
    if (not uw_static.KEY_NEW_WORKSPACE_NAME in update_dict) or \
        (not update_dict[uw_static.KEY_NEW_WORKSPACE_NAME]):
        user_msg = (f'The workspace could not be saved.'
                    f' (The update information did not contain a'
                    f' "{uw_static.KEY_NEW_WORKSPACE_NAME}" key)')

        #print('user_msg', user_msg)
        return JsonResponse(get_json_error(user_msg))

    new_workspace_name = update_dict[uw_static.KEY_NEW_WORKSPACE_NAME].strip()
    fmt_workspace_name = re.sub(r"[^a-zA-Z0-9 _\-]+", '', new_workspace_name)

    if new_workspace_name != fmt_workspace_name:
        user_msg = (f'The workspace name can only use letters, numbers,'
                    f' hyphens ("-"), or underscores ("_").')
        return JsonResponse(get_json_error(user_msg))


    if len(new_workspace_name) < uw_static.MIN_WORKSPACE_NAME_LENGTH:
        user_msg = (f'The workspace name must be at least'
                    f' {uw_static.MIN_WORKSPACE_NAME_LENGTH} characters long.')
        return JsonResponse(get_json_error(user_msg))


    if len(new_workspace_name) > uw_static.MAX_WORKSPACE_NAME_LENGTH:
        user_msg = (f'The workspace name cannot be more than'
                    f' {uw_static.MAX_WORKSPACE_NAME_LENGTH}  characters long.')
        return JsonResponse(get_json_error(user_msg))

    if is_existing_workspace_name(user_workspace.user, new_workspace_name):
        user_msg = (f'The workspace name "{new_workspace_name}" is'
                    f' already being used. Please choose another.')
        return JsonResponse(get_json_error(user_msg))


    # Check for the 'raven_config' key
    #
    if (not uw_static.KEY_RAVEN_CONFIG in update_dict) or \
        (not update_dict[uw_static.KEY_RAVEN_CONFIG]):
        user_msg = (f'The workspace could not be saved.'
                    f' (Please include Raven Config information'
                    f' using the key "{uw_static.KEY_RAVEN_CONFIG}")')

        return JsonResponse(get_json_error(user_msg))

    new_ws_info = duplicate_user_workspace(\
                        new_workspace_name,
                        user_workspace,
                        raven_config=update_dict[uw_static.KEY_RAVEN_CONFIG])

    if not new_ws_info.success:
        return JsonResponse(get_json_error(new_ws_info.err_msg))

    user_msg = f'New workspace saved. (id: {new_ws_info.result_obj.id})'

    json_msg = get_json_success(user_msg,
                                data=new_ws_info.result_obj.to_dict())

    #print('save_raven_config_to_existing_workspace 4', json_msg)

    return JsonResponse(json_msg)


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
        return JsonResponse(get_json_error(ws_info.err_msg))
    user_workspace = ws_info.result_obj

    # Get the Ravens config from the POST
    #
    update_info = get_request_body_as_json(request)
    if not update_info.success:
        return JsonResponse(get_json_error(update_info.err_msg))

    update_dict = update_info.result_obj


    # Check for the 'raven_config' key
    #
    if (not uw_static.KEY_RAVEN_CONFIG in update_dict) or \
        (not update_dict[uw_static.KEY_RAVEN_CONFIG]):
        user_msg = (f'The workspace could not be saved.'
                    f' (Please include Raven Config information'
                    f' using the key "{uw_static.KEY_RAVEN_CONFIG}")')

        # print('user_msg', user_msg)
        return JsonResponse(get_json_error(user_msg))

    user_workspace.raven_config = update_dict[uw_static.KEY_RAVEN_CONFIG]
    user_workspace.save()

    ws_dict = user_workspace.to_dict()

    json_msg = get_json_success('Workspace saved.',
                                data=ws_dict)

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
def view_deactivate_shared_workspace(request, user_workspace_id):
    """Set the UserWorkspace to private (NOT is_public)"""
    # Get the user
    #
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    user = user_info.result_obj

    ws_info = get_saved_workspace_by_request_and_id(request, user_workspace_id)
    if not ws_info.success:
        user_msg = 'No active workspaces found for user: %s and id: %d' % \
                    (user.username, user_workspace_id)
        return JsonResponse(get_json_error(user_msg))

    workspace = ws_info.result_obj

    if not workspace.is_public:
        # Consider it a success if the workspace is already public
        #
        user_msg = 'Workspace is already private'
    else:
        user_msg = 'Workspace is now private'
        workspace.is_public = False
        workspace.save()

    return JsonResponse(\
                get_json_success(user_msg,
                                 data=workspace.to_dict()))


@csrf_exempt
def view_activate_shared_workspace(request, user_workspace_id):
    """Set the UserWorkspace to public"""
    # Get the user
    #
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    user = user_info.result_obj

    ws_info = get_saved_workspace_by_request_and_id(request, user_workspace_id)
    if not ws_info.success:
        user_msg = 'No active workspaces found for user: %s and id: %d' % \
                    (user.username, user_workspace_id)
        return JsonResponse(get_json_error(user_msg))

    workspace = ws_info.result_obj

    if workspace.is_public:
        # Consider it a success if the workspace is already public
        #
        user_msg = 'Workspace is already public'
    else:
        user_msg = 'Workspace is now public'
        workspace.is_public = True
        workspace.save()

    return JsonResponse(\
                get_json_success(user_msg,
                                 data=workspace.to_dict()))




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
def view_latest_raven_configs(request, summary_only=False):
    """View config list with d3mconfig as separate object"""
    # Get the user
    #
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    user = user_info.result_obj

    params = dict(summary_only=summary_only)
    workspace_info = get_user_workspaces_as_dict(user, **params)

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
def view_latest_raven_config_summaries(request):
    """View summary config list with names/ids"""

    return view_latest_raven_configs(request, summary_only=True)


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
    return view_latest_raven_configs(request)
