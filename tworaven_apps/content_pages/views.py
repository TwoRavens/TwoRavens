from django.shortcuts import render
from django.urls import reverse

from django.http import HttpResponse, JsonResponse, Http404, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.conf import settings

from tworaven_apps.configurations.models import AppConfiguration
from tworaven_apps.configurations.utils import get_latest_d3m_config
from tworaven_apps.utils.view_helper import get_session_key
from tworaven_apps.ta2_interfaces.grpc_util import TA3TA2Util

def view_pebbles_home(request):
    """Serve up the workspace, the current home page.
    Include global js settings"""
    app_config = AppConfiguration.get_config()
    if app_config is None:
        return HttpResponseRedirect(reverse('view_no_domain_config_error'))

    # Is this D3M Mode?  If so, make sure:
    #  (1) there is D3M config information
    #  (2) user is logged in
    #
    if app_config.is_d3m_domain():
        # (1) Is there a valid D3M config?
        d3m_config = get_latest_d3m_config()
        if not d3m_config:
            return HttpResponseRedirect(\
                    reverse('view_d3m_config_error'))

        # (2) Is the user authenticated?
        if not request.user.is_authenticated():
            return HttpResponseRedirect(\
                    reverse('login'))

        session_key = get_session_key(request)

    else:

        session_key = '(event-data-no-session-key)'

    dinfo = dict(title='TwoRavens',
                 session_key=session_key,
                 app_config=app_config.convert_to_dict(),
                 TA2_STATIC_TEST_MODE=settings.TA2_STATIC_TEST_MODE,
                 TA2_TEST_SERVER_URL=settings.TA2_TEST_SERVER_URL,
                 TA3TA2_API_VERSION=TA3TA2Util.get_api_version())

    return render(request,
                  'index.html',
                  dinfo)


def view_dev_raven_links(request):
    """Dev homepage (other than pebble page)"""

    dinfo = dict(title="dev links")

    return render(request,
                  'dev_raven_links.html',
                  dinfo)


def view_no_domain_config_error_test(request):
    """View error test page, show even if there isn't an error"""
    return view_no_domain_config_error(request, is_test_page=True)


def view_no_domain_config_error(request, is_test_page=False):
    """The UI config defining the domain is not available
    Rare error in that init_db populates this info"""

    # double checke to make sure it doesn't exist
    #
    app_config = AppConfiguration.get_config()
    if app_config and not is_test_page:
        return HttpResponseRedirect(reverse('home'))

    dinfo = dict(title='Two Ravens configuration error',
                 IS_TEST_PAGE=is_test_page)

    return render(request,
                  'content_pages/no_domain_config_error.html',
                  dinfo)

def view_d3m_config_error(request):
    """Show this when the app is in D3M mode
    but there's no config info available"""
    # Only show this if:
    # (a) in D3M mode
    #
    app_config = AppConfiguration.get_config()
    if app_config is None:
        return HttpResponseRedirect(reverse('view_no_domain_config_error'))

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


@csrf_exempt
@login_required
def view_test_callback(request):
    """for callback testing"""
    if not request.POST:
        return JsonResponse(dict(status="ok",
                                 message="no post"))


    return JsonResponse(dict(status="ok",
                             message="post found",
                             data=dict(request.POST)))
