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


@csrf_exempt
def view_register_listener(request):
    """register a web url for messages related to ta3_search"""

    if request.method == 'GET':
        ml_form = MessageListenerForm(request.GET)
        if ml_form.is_valid():
            new_listener = ml_form.save()
            user_msg = 'Listener url registered: %s' % new_listener.web_url
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
