"""
Utilities for views
"""
import collections
import json

def get_common_view_info(request):
    """For all pages, e.g. is user logged in, etc"""

    info = dict()

    #info = dict(is_authenticated=request.user.is_authenticated,
    #            user=request.user)

    return info


def get_session_key(request):
    """Common method to get the session key"""
    assert request, 'request cannot be None'

    return request.session._get_or_create_session_key()


def get_authenticated_user(request):
    """Return the user from the request"""
    if not request:
        return False, 'request is None'

    if not request.user.is_authenticated:
        return False, 'user is not authenticated'

    return True, request.user


def get_request_body(request):
    """Retrieve the request body
    Returns either:
        (True, content text)
        (Fales, error message)
    """
    if not request:
        return False, 'request is None'

    if not request.body:
        return False, 'request.body not found'

    return True, request.body.decode('utf-8')


def get_request_body_as_json(request):
    """Retrieve the request body converted to JSON (python OrderedDict)
    Returns either:
        (True, content text)
        (Fales, error message)
    """
    if not request:
        return False, 'request is None'

    success, req_body_or_err = get_request_body(request)
    if not success:
        return False, req_body_or_err

    try:
        json_data = json.loads(req_body_or_err,
                               object_pairs_hook=collections.OrderedDict)
    except json.decoder.JSONDecodeError as err_obj:
        err_msg = ('Failed to convert request body to JSON: %s') % err_obj
        return False, err_msg
    except TypeError as err_obj:
        err_msg = ('Failed to convert request body to JSON: %s') % err_obj
        return False, err_msg

    return True, json_data
