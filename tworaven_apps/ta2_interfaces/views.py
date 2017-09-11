from django.shortcuts import render
from django.http import JsonResponse, HttpResponse, Http404

# Create your views here.
def view_start_session(request):
    """Call from UI to start gRPC session"""

    info = dict(status='ok',
                message='Start Session! test message')

    return JsonResponse(info)

def view_test_call(request):
    """Capture other calls to D3M"""
    info = dict(status='ok',
                message='test message to path: %s' % request.path)

    return JsonResponse(info)
