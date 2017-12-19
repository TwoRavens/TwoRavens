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
from tworaven_apps.utils.view_helper import get_session_key
from django.contrib.auth.decorators import login_required

@login_required
def view_end_ta3_search(request):
    """End the D3M search"""

    # open post commands + message
    # send appropriate message to the listeners
    return JsonResponse(dict(success=True))


@csrf_exempt
def view_register_listener(request):
    """register a web url for messages related to ta3_search"""

    if request.method == 'GET':
        ml_form = MessageListenerForm(request.GET)
        if ml_form.is_valid():
            new_listener, created = ml_form.get_listener()
            user_msg = 'Listener url registered: %s' % new_listener.web_url
            if not created:
                user_msg = '%s. Note: this listener already existed.' % \
                           user_msg

            user_msg = '%s (updated: %s)' % (user_msg, new_listener.modified)

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
