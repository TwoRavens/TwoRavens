"""
Utilities for views
"""

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
