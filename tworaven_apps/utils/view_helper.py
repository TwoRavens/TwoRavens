"""
Utilities for views
"""

def get_common_view_info(request):
    """For all pages, e.g. is user logged in, etc"""

    info = dict()

    #info = dict(is_authenticated=request.user.is_authenticated,
    #            user=request.user)

    return info
