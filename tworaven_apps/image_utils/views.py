from django.shortcuts import render
from django.conf import settings
from django.http import JsonResponse
from tworaven_apps.user_workspaces.utils import get_latest_user_workspace
from django.contrib.auth.decorators import login_required

from tworaven_apps.image_utils.markup_image_helper import \
    (markup_image,
     create_image_output_dir)
from tworaven_apps.utils.view_helper import \
    (get_json_error,
     get_json_success,
     get_request_body_as_json)

from tworaven_apps.solver_interfaces.models import (
    KEY_SUCCESS,
    KEY_DATA,
    KEY_MESSAGE)

def view_markup_image(request):
    """Markup an image based on a spec"""

    # Make sure the user has a workspace--workspace is used for
    # creating the output directory
    #
    # removed for test
    """user_workspace_info = get_latest_user_workspace(request)
    if not user_workspace_info.success:
        return JsonResponse(get_json_error(user_workspace_info.err_msg))
    user_workspace = user_workspace_info.result_obj
    """
    user_workspace = None

    # Convert the image spec to a python OrderedDict
    #
    req_info = get_request_body_as_json(request, login_required=False)
    if not req_info.success:
        #user_msg = ('The request did not contain problem data')
        return JsonResponse(get_json_error(req_info.err_msg))

    image_spec_json = req_info.result_obj

    # Create the output directory
    #
    dir_info = create_image_output_dir(user_workspace)
    if dir_info.get(KEY_SUCCESS) is False:
        return JsonResponse(dir_info)

    # Mark up the image
    #
    markup_info = markup_image(image_spec_json, dir_info.get(KEY_DATA))

    return JsonResponse(markup_info)
