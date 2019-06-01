"""
Utilities for views
"""
from collections import OrderedDict
import json
from tworaven_apps.utils.basic_response import (ok_resp, err_resp)
from tworaven_apps.utils.json_helper import json_loads


def get_common_view_info(request):
    """For all pages, e.g. is user logged in, etc"""

    #info = dict()
    info = dict(is_authenticated=request.user.is_authenticated,
                user=request.user)

    return info


def get_session_key(request):
    """Common method to get the session key"""
    assert request, 'request cannot be None'

    return request.session._get_or_create_session_key()


def get_authenticated_user(request):
    """Return the user from the request"""
    if not request:
        return err_resp('request is None')

    if not request.user.is_authenticated:
        return err_resp('user is not authenticated')

    return ok_resp(request.user)


def get_request_body(request):
    """Retrieve the request body
    Returns either:
        (True, content text)
        (Fales, error message)
    """
    if not request:
        return err_resp('request is None')

    # ----------------------------------
    # Make sure user is authenticated
    # ----------------------------------
    auth_user_info = get_authenticated_user(request)
    #if not auth_user_info.success:
    #    return err_resp(auth_user_info.err_msg)

    if not request.body:
        return err_resp('request.body not found')

    # ----------------------------------
    # Return body, decoded as utf-8
    # ----------------------------------
    return ok_resp(request.body.decode('utf-8'))


def get_request_body_as_json(request):
    """Retrieve the request body converted to JSON (python OrderedDict)
    Returns either:
        (True, content text)
        (Fales, error message)
    """
    if not request:
        return err_resp('request is None')

    # ----------------------------------
    # next call also check if user is authenticated
    # ----------------------------------
    resp_info = get_request_body(request)
    if not resp_info.success:
        return resp_info

    # ----------------------------------
    # Return body loaded as JSON
    # ----------------------------------
    json_info = json_loads(resp_info.result_obj)

    return json_info


def get_json_error(err_msg, errors=None):
    """return an OrderedDict with success=False + message"""
    info = OrderedDict()
    info['success'] = False
    info['message'] = err_msg
    if errors:
        info['errors'] = errors
    return info

def get_json_success(user_msg, **kwargs):
    """return an OrderedDict with success=True + message + optional 'data'"""
    info = OrderedDict()
    info['success'] = True
    info['message'] = user_msg

    if 'data' in kwargs:
        info['data'] = kwargs['data']

    # add on additional data pieces
    for key, val in kwargs.items():
        if key == 'data':
            continue
        info[key] = val

    return info
