from django.shortcuts import render

from django.http import HttpResponse, JsonResponse, Http404, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
#from django.contrib.auth.decorators import login_required
from django.conf import settings

from tworaven_apps.utils.view_helper import \
    (get_request_body, get_request_body_as_json,
     get_json_error,
     get_json_success)
from tworaven_apps.utils.json_helper import format_pretty_from_dict

from tworaven_apps.configurations.utils import get_latest_d3m_config

from tworaven_apps.user_workspaces.models import \
    (UserWorkspace,)
from tworaven_apps.user_workspaces.utils import \
    (get_user_workspaces,
     get_user_workspaces_as_dict,
     delete_user_workspaces)
from tworaven_apps.configurations.models_d3m import D3MConfiguration
from tworaven_apps.utils.view_helper import \
    (get_authenticated_user,)

@csrf_exempt
def view_user_workspace_config(request, user_workspace_id):
    """Retrieve information for a single workspace"""
    # Get the user
    #
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    user = user_info.result_obj

    try:
        ws = UserWorkspace.objects.get(id=user_workspace_id,
                                       user=user)
    except UserWorkspace.DoesNotExist:
        user_msg = 'No workspaces found for user: %s and id: %d' % \
                    (user.username)
        return JsonResponse(get_json_error(user_msg))

    ws_dict = ws.to_dict()

    json_msg = get_json_success('Workspace found.',
                                data=ws_dict)

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
