import json
from collections import OrderedDict
from django.shortcuts import render
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.cache import never_cache

from django.http import JsonResponse, HttpResponse, Http404, HttpResponseRedirect
from django.contrib.auth.decorators import login_required

from tworaven_apps.workspaces.workspace_util import WorkspaceUtil
from tworaven_apps.workspaces.workspace_recorder import WorkspaceRecorder
from tworaven_apps.workspaces.session_display_helper import SessionDisplayList
from tworaven_apps.workspaces.models import SavedWorkspace
from tworaven_apps.utils.view_helper import get_session_key


@login_required
def view_workspace_info(request):
    """View current workspace and/or other saved workspaces"""
    # Look for a workspace matching the session key
    session_key = get_session_key(request)
    current_workspace = SavedWorkspace.objects.filter(session_key=session_key\
                            ).order_by('-modified'\
                            ).first()

    # pull some session info, if there are any
    #
    if request.user.is_authenticated():
        other_workspaces = SavedWorkspace.objects.filter(user=request.user)
        if current_workspace:
            other_workspaces = other_workspaces.exclude(id=current_workspace.id)
    else:
        other_workspaces = None

    info = dict(title='test session info',
                current_workspace=current_workspace,
                other_workspaces=other_workspaces,
                session_key=request.session.session_key)

    return render(request, 'view_workspace_info.html', info)


def view_current_workspace_json(request, app_domain):
    """View the latest workspace (if it exsists)"""




@never_cache
def view_session_info(request):
    """test to show session info, zdata, etc"""

    # pull some session info, if there are any
    #
    display_info = SessionDisplayList(request)

    info = dict(title='test session info',
                display_info_list=display_info.get_list(),
                session_key=request.session.session_key)

    return render(request, 'view_session_info.html', info)


@csrf_exempt
def record_user_metadata(request):
    """Record user metadata"""

    success, user_msg = WorkspaceUtil.record_state(request)

    info = dict(success=success,
                message=user_msg)

    return JsonResponse(info)


def clear_user_metadata(request):
    """clear user metadata"""
    WorkspaceUtil.clear_session_data(request)

    return HttpResponseRedirect(reverse('view_session_info'))


@csrf_exempt
def record_user_workspace(request):
    """Record a user's workspace"""

    # Temporarily disable this...rework it post Jan
    return JsonResponse(dict(success=False,
                             message='temporarily disabled'))


    success, user_msg = WorkspaceRecorder.record_workspace(request)

    info = dict(success=success,
                message=user_msg)

    return JsonResponse(info)
