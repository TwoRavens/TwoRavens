"""
Functions for when the UI sends JSON requests to route to TA2s as gRPC calls
    - Right now this code is quite redundant. Wait for integration to factor it out,
     e.g. lots may change--including the "req_" files being part of a separate service
"""
import http
import json
from collections import OrderedDict
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from tworaven_apps.ta3_search.forms import MessageListenerForm
from tworaven_apps.ta3_search.message_util import MessageUtil, KEY_MESSSAGE
from tworaven_apps.utils.view_helper import get_session_key
from django.contrib.auth.decorators import login_required
from tworaven_apps.utils.view_helper import get_request_body_as_json

@login_required
@csrf_exempt
def view_end_ta3_search(request):
    """End the D3M search via the UI"""

    success, info_dict = get_request_body_as_json(request)
    if not success:
        return JsonResponse(dict(success=False,
                                 message="No JSON info found in request."))

    if not KEY_MESSSAGE in info_dict:
        return JsonResponse(\
                dict(success=False,
                     message="No '%s' found in request." % KEY_MESSSAGE))

    if not 'is_success' in info_dict:
        return JsonResponse(dict(success=False,
                                 message="No 'is_success' found in request."))

    is_success = info_dict['is_success']
    if not is_success in [True, False]:
        return JsonResponse(dict(success=False,
                                 message="'is_success' must be a boolean (true/false)"))


    MessageUtil.send_shutdown_message(info_dict[KEY_MESSSAGE],
                                      is_success=is_success)

    # open post commands + message
    # send appropriate message to the listeners
    return JsonResponse(dict(success=True,
                             message='shutdown message sent'))


@login_required
@csrf_exempt
def view_send_reviewer_message(request):
    """Send a message to the console"""
    success, info_dict = get_request_body_as_json(request)
    if not success:
        return JsonResponse(dict(success=False,
                                 message="No JSON info found in request."))

    if not KEY_MESSSAGE in info_dict:
        return JsonResponse(\
                        dict(success=False,
                             message="No '%s' found in request." % KEY_MESSSAGE))

    msg_to_send = info_dict.get(KEY_MESSSAGE)
    MessageUtil.send_message(msg_to_send)

    return JsonResponse(dict(success=True,
                             message='message sent: %s' % msg_to_send))



@csrf_exempt
def view_register_listener(request):
    """register a web url for messages related to ta3_search"""

    if request.method == 'GET':
        # validate the request
        ml_form = MessageListenerForm(request.GET)
        if ml_form.is_valid():
            # Looks good, get the listener
            #
            new_listener, created = ml_form.get_listener()

            # create user message
            #
            user_msg = 'Listener url registered: %s' % new_listener.web_url
            if not created:
                user_msg = '%s. Note: this listener already existed.' % \
                           user_msg

            user_msg = '%s (updated: %s)' % (user_msg, new_listener.modified)

            # send message to listener--to print to console
            #
            MessageUtil.send_message_to_listener(\
                            user_msg,
                            new_listener)

            # respond to view request
            #
            return JsonResponse(dict(success=True,
                                     message=user_msg))
        else:
            user_msg = 'Listener not registered.  Errors found.'
            return JsonResponse(dict(success=False,
                                     message=user_msg,
                                     details=ml_form.errors),
                                status=http.HTTPStatus.BAD_REQUEST)

    user_msg = ('Listener not registered.  Please submit'
                ' a GET with a "web_url" attribute.')

    return JsonResponse(dict(success=False,
                             message=user_msg),
                        status=http.HTTPStatus.BAD_REQUEST)
