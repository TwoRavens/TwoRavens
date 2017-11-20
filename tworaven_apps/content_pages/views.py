from django.shortcuts import render
from django.urls import reverse
from django.http import HttpResponse, JsonResponse, Http404, HttpResponseRedirect
from tworaven_apps.configurations.models import AppConfiguration
from tworaven_apps.configurations.utils import get_latest_d3m_config
from tworaven_apps.utils.view_helper import get_session_key

def view_pebbles_home(request):
    """Serve up the workspace, the current home page.
    Include global js settings"""
    session_key = get_session_key(request)

    app_config = AppConfiguration.get_config()

    dinfo = dict(title='TwoRavens',
                 session_key=session_key,
                 app_config=app_config.convert_to_dict())

    # Is this D3M Mode?  If so, make sure there is D3M config information
    if app_config.is_d3m_domain():
        d3m_config = get_latest_d3m_config()
        if not d3m_config:
            return HttpResponseRedirect(\
                    reverse('view_d3m_config_error'))

    return render(request,
                  'index.html',
                  dinfo)


def view_dev_raven_links(request):
    """Dev homepage (other than pebble page)"""

    dinfo = dict(title="dev links")

    return render(request,
                  'dev_raven_links.html',
                  dinfo)


def view_d3m_config_error(request):
    """Show this when the app is in D3M mode
    but there's no config info available"""
    # Only show this if:
    # (a) in D3M mode
    #
    app_config = AppConfiguration.get_config()
    if not app_config.is_d3m_domain():
        return HttpResponseRedirect(reverse('home'))

    # and (b) not D3M config info is in the db
    #
    d3m_config = get_latest_d3m_config()
    if d3m_config:
        return HttpResponseRedirect(reverse('home'))

    dinfo = dict(title='D3M configuration error')

    return render(request,
                  'content_pages/no_config_error.html',
                  dinfo)

def view_d3m_config_error_test(request):
    """Show the error page w/o an actual check"""

    dinfo = dict(title='D3M configuration error',
                 IS_TEST_PAGE=True)

    return render(request,
                  'content_pages/no_config_error.html',
                  dinfo)

def view_err_500_test(request):
    """Purposely create a 500 error"""
    # div by 0
    x = 1/0

def view_monitoring_alive(request):
    """For kubernetes liveness check"""
    return JsonResponse(dict(status="ok",
                             message="TwoRavens python server up"))
