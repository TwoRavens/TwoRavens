import requests

from django.shortcuts import render
from django.conf import settings
from django.http import JsonResponse, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt, csrf_protect
from tworaven_apps.rook_services.models import TestCallCapture
from tworaven_apps.rook_services.rook_app_info import RookAppInfo

from datetime import datetime as dt


def view_webpack_test(request):

    d = dict(title='welcome')
    return render(request,
                  'index.html',
                  d)


@csrf_exempt
def view_rp_test(request):

    # session test for num clicks
    #
    num_clicks = request.session.get(NUM_CLICKS_KEY, 0)
    num_clicks += 1
    request.session[NUM_CLICKS_KEY] = num_clicks

    print('num_clicks: ', num_clicks)
    print('request.session.session_key: ', request.session.session_key)

    node_length = 'not sent'
    if request.POST:
        node_length = request.POST.get('nodeLength', 'not set by client (err?)')

    if request.user.is_authenticated:
        print ('authenticated')
        # Do something for authenticated users.

    else:
        print ('anonymous')

    user_msg = ('\nnode length: {1}. hello ({0})').format(\
                    dt.now(),
                    node_length)

    d = dict(status='ok',
             data=dict(\
                 num_clicks=num_clicks,
                 node_length=node_length,
                 server_time='%s' % dt.now()),
             message=user_msg)

    return JsonResponse(d)
