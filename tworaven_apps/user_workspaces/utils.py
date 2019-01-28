"""
Some utils for UserWorkspace calls
"""
from django.conf import settings
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)

from tworaven_apps.utils.view_helper import \
    (get_request_body, get_request_body_as_json,
     get_json_error,
     get_json_success)
from tworaven_apps.configurations.utils import get_latest_d3m_config
from tworaven_apps.raven_auth.models import User

from tworaven_apps.user_workspaces.models import \
    (UserWorkspace,)
from tworaven_apps.configurations.models_d3m import D3MConfiguration
from tworaven_apps.utils.view_helper import \
    (get_authenticated_user,)


def get_latest_d3m_user_config_by_request(request):
    """Find the lastest UserWorkspace and return the attached d3m_config"""
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    user = user_info.result_obj
    return get_latest_d3m_user_config(user)


def get_latest_d3m_user_config(user, create_if_not_found=True):
    """Find the lastest UserWorkspace and return the attached d3m_config"""
    if not isinstance(user, User):
        return err_resp('user must be a "User" object, not: "%s"' % user)

    d3m_config = get_latest_d3m_config()
    if not d3m_config:
        return err_resp('No default D3MConfiguration set.')

    params = dict(user=user,
                  orig_dataset_id=d3m_config.orig_dataset_id,
                  is_active=True)

    latest_workspace = UserWorkspace.objects.filter(**params).first()
    if latest_workspace:
        return ok_resp(latest_workspace.d3m_config)

    if create_if_not_found:
        params['d3m_config'] = d3m_config
        new_workspace = UserWorkspace(**params)
        new_workspace.save()
        return ok_resp(latest_workspace.d3m_config)

    return err_resp('No workspace found for the User and default config')



def get_user_workspaces_as_dict(user, create_if_not_found=True):
    """Get UserWorkspace list based on the active D3M config, as dicts"""
    ws_info = get_user_workspaces(user, create_if_not_found)
    if not ws_info.success:
        return ws_info

    ws_list = ws_info.result_obj

    ws_list_fmt = [ws.to_dict() for ws in ws_list]

    return ok_resp(ws_list_fmt)

def get_user_workspaces(user, create_if_not_found=True):
    """Get UserWorkspace list based on the active D3M config"""
    if not isinstance(user, User):
        return err_resp('user must be a "User" object, not: "%s"' % user)

    d3m_config = get_latest_d3m_config()
    if not d3m_config:
        return err_resp('No default D3MConfiguration set.')

    params = dict(user=user,
                  orig_dataset_id=d3m_config.orig_dataset_id,
                  is_active=True)

    workspaces = UserWorkspace.objects.filter(**params)

    if workspaces.count() == 0:
        if create_if_not_found:
            params['d3m_config'] = d3m_config
            new_workspace = UserWorkspace(**params)
            new_workspace.save()
            return ok_resp([new_workspace])
        return err_resp('No workspaces found for the User and default config')

    return ok_resp(list(workspaces))

def delete_user_workspaces(user):
    """Used to reset UserWorkspace objects based on a user/problem"""
    if not isinstance(user, User):
        return err_resp('user must be a "User" object, not: "%s"' % user)

    d3m_config = get_latest_d3m_config()
    if not d3m_config:
        return err_resp('No default D3MConfiguration set.')

    params = dict(user=user,
                  orig_dataset_id=d3m_config.orig_dataset_id)

    workspaces = UserWorkspace.objects.filter(**params)
    cnt = workspaces.count()
    workspaces.delete()

    return ok_resp('Workspaces cleared. %d deleted' % cnt)
