import json
from collections import OrderedDict
from django.shortcuts import render
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, HttpResponse, Http404, HttpResponseRedirect
from tworaven_apps.workspaces.workspace_util import WorkspaceUtil
#from tworaven_apps.workspaces.models import \
#    SESSION_KEY_ZPARAMS, SESSION_KEY_ALL_NODES, SESSION_KEY_LIST,\
#    UI_KEY_ZDATA
from tworaven_apps.workspaces.session_display_helper import SessionDisplayList

def view_session_info(request):
    """test to show session info, zdata, etc"""

    # pull some session info, if there are any
    #
    #import ipdb; ipdb.set_trace()
    display_info = SessionDisplayList(request)

    info = dict(title='test session info',
                display_info_list=display_info.get_list())

    return render(request, 'view_session_info.html', info)


@csrf_exempt
def record_user_metadata(request):
    """Record user metadata"""

    success, err_msg = WorkspaceUtil.record_state(request)

    if success is True:
        info = dict(success=True,
                    message='session recorded')
    else:
        info = dict(success=False,
                    message=err_msg)

    return JsonResponse(info)


def clear_user_metadata(request):
    """clear user metadata"""
    WorkspaceUtil.clear_session_data(request)

    return HttpResponseRedirect(reverse('view_session_info'))
