from django.shortcuts import render
from django.http import JsonResponse, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt, csrf_protect

@csrf_exempt
def view_start_session(request):
    """Call from UI to start gRPC session"""

    info = dict(status='ok',
                message='Start Session! test message')

    return JsonResponse(info)


@csrf_exempt
def view_test_call(request):
    """Capture other calls to D3M"""
    if request.POST:
        post_str = str(request.POST)
    else:
        post_str = '(no post)'

    info = dict(status='ok',
                post_str=post_str,
                message='test message to path: %s' % request.path)


    return JsonResponse(info)
