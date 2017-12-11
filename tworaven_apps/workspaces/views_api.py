import json
import http
from collections import OrderedDict
from django.shortcuts import render
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.cache import never_cache
from django.contrib.auth.decorators import login_required

from django.http import JsonResponse, HttpResponse, Http404, HttpResponseRedirect
from tworaven_apps.workspaces.workspace_util import WorkspaceUtil
from tworaven_apps.workspaces.workspace_recorder import WorkspaceRecorder
from tworaven_apps.workspaces.workspace_retriever import WorkspaceRetriever,\
    KW_SESSION_KEY
from tworaven_apps.workspaces.session_display_helper import SessionDisplayList
from tworaven_apps.workspaces.models import SavedWorkspace
from tworaven_apps.utils.view_helper import get_session_key


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

def list_user_workspaces(request):
    """Retrieve a workspace by the currently logged-in user"""
    if not request.user.is_authenticated():
        err_msg = ('Not logged in')
        return JsonResponse(dict(success=False,
                                 message=err_msg),
                            status=http.HTTPStatus.UNAUTHORIZED)

    params = {KW_SESSION_KEY: get_session_key(request)}

    success, ws_list_or_err = WorkspaceRetriever.list_workspaces_by_request(\
                                    request,
                                    as_dict=True,
                                    **params)

    if not success:
        return JsonResponse(dict(success=False,
                                 message=ws_list_or_err),
                            status=http.HTTPStatus.BAD_REQUEST)

    if not ws_list_or_err:
        err_msg = ('No workspaces found for this user.')
        return JsonResponse(dict(success=False,
                                 message=err_msg),
                            status=http.HTTPStatus.NOT_FOUND)

    return JsonResponse(ws_list_or_err,
                        safe=False)



def view_current_workspace(request):
    """Retrieve a workspace by session_key and user"""
    if not request.user.is_authenticated():
        err_msg = ('Not logged in')
        return JsonResponse(dict(success=False,
                                 message=err_msg),
                            status=http.HTTPStatus.UNAUTHORIZED)

    # Look for a workspace by session_key and user
    #
    session_key = get_session_key(request)
    params = dict(user=request.user,
                  session_key=session_key)

    current_workspace = SavedWorkspace.objects.filter(**params).first()
    if not current_workspace:
        err_msg = ('No workspace found'
                   ' for session_key [%s] and the current user') % (session_key,)
        return JsonResponse(dict(success=False,
                                 message=err_msg),
                            status=http.HTTPStatus.BAD_REQUEST)


    return JsonResponse(current_workspace.as_dict())


def view_workspace_by_id_base(request):
    """stub for url"""
    raise Http404('stub url')

def view_workspace_by_id_json(request, workspace_id):
    """Retrieve a workspace, if it exists"""
    if not request.user.is_authenticated():
        err_msg = ('Not logged in')
        return JsonResponse(dict(success=False,
                                 message=err_msg),
                            status=http.HTTPStatus.UNAUTHORIZED)

    success, ws_object_or_err = WorkspaceRetriever.get_by_id_and_request(\
                                workspace_id,
                                request,
                                as_dict=True)

    if not success:
        return JsonResponse(dict(success=False,
                                 message=ws_object_or_err),
                            status=http.HTTPStatus.BAD_REQUEST)

    return JsonResponse(ws_object_or_err)
