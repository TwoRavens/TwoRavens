from django.shortcuts import render
import json
from collections import OrderedDict
from django.shortcuts import render
from django.http import \
    (JsonResponse, HttpResponse,
     Http404, HttpResponseRedirect,
     QueryDict)
from django.template.loader import render_to_string


# Create your views here.


def api_add_query(request):
    """add query to the db"""
    usr_msg = dict(success=True,
                   message='check')

    return JsonResponse(usr_msg)
