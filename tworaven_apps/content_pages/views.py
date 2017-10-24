from django.shortcuts import render
from django.urls import reverse
from django.http import HttpResponse, JsonResponse, Http404, HttpResponseRedirect
from tworaven_apps.configurations.models import AppConfiguration
from tworaven_apps.configurations.utils import get_latest_d3m_config

def view_pebbles_home(request):
    """Serve up the workspace, the current home page.
    Include global js settings"""
    app_config = AppConfiguration.get_config()

    dinfo = dict(title='welcome',
                 app_config=app_config.convert_to_dict())

    # Is this D3M Mode?  If so, make sure there is D3M config information
    if app_config.d3m_mode:
        d3m_config = get_latest_d3m_config()
        if not d3m_config:
            return HttpResponseRedirect(\
                    reverse('view_d3m_config_error'))

    return render(request,
                  'index.html',
                  dinfo)

def view_d3m_config_error(request):
    """Show this when the app is in D3M mode
    but there's no config info available"""

    # Only show this if:
    # (a) in D3M mode
    #
    app_config = AppConfiguration.get_config()
    if not app_config.d3m_mode:
        return HttpResponseRedirect(reverse('home'))

    # and (b) not D3M config info is in the db
    #
    d3m_config = get_latest_d3m_config()
    if d3m_config:
        return HttpResponseRedirect(reverse('home'))

    dinfo = dict(title='D3M configuration error')

    return render(request,
                  'no_config_error.html',
                  dinfo)


def view_monitoring_alive(request):
    """For kubernetes liveness check"""
    return JsonResponse(dict(status="ok",
                             message="TwoRavens python server up"))
