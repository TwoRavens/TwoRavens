
from django.shortcuts import render
#from django.conf import settings
from django.http import HttpResponse #JsonResponse, Http404
from tworaven_apps.configurations.models import AppConfiguration

def view_pebbles_home(request):
    """Serve up the workspace, the current home page.
    Include global js settings"""

    dinfo = dict(title='welcome',
                 app_config=AppConfiguration.get_config_for_js())

    return render(request,
                  'index.html',
                  dinfo)

def view_monitoring_alive(request):
    """For kubernetes liveness check"""
    return HttpResponse('TwoRavens python server up')
