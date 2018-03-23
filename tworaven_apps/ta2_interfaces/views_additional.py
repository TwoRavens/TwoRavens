"""
Functions for when the UI sends JSON requests to route to TA2s as gRPC calls
    - Right now this code is quite redundant. Wait for integration to factor it out,
     e.g. lots may change--including the "req_" files being part of a separate service
"""
import json
from django.shortcuts import render
from django.conf import settings
from django.http import JsonResponse    #, HttpResponse, Http404
from django.views.decorators.cache import cache_page
from django.views.decorators.csrf import csrf_exempt
from tworaven_apps.ta2_interfaces.grpc_util import TA3TA2Util

@csrf_exempt
@cache_page(settings.PAGE_CACHE_TIME)
def view_get_problem_schema(request):
    """Return gRPC enum info"""

    info_dict = TA3TA2Util.get_problem_schema()
    if not info_dict:
        return JsonResponse(\
            dict(success=False,
                 message='Failed to retrieve problem schema'),
            status=400)

    return JsonResponse(dict(success=True,
                             message='Success!',
                             data=info_dict))
