import os
from django.shortcuts import render
from django.urls import reverse

from django.http import HttpResponse, JsonResponse, Http404, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.conf import settings

from tworaven_apps.utils.view_helper import \
    (get_request_body,
     get_json_error,
     get_json_success)

from tworaven_apps.configurations.models import AppConfiguration
from tworaven_apps.utils.view_helper import get_session_key
from tworaven_apps.ta2_interfaces.grpc_util import TA3TA2Util
from tworaven_apps.configurations.utils import get_latest_d3m_config
from tworaven_apps.behavioral_logs import static_vals as bl_static
from tworaven_apps.behavioral_logs.log_entry_maker import LogEntryMaker
from tworaven_apps.utils.view_helper import get_authenticated_user

def view_pebbles_home(request):
    """Serve up the workspace, the current home page.
    Include global js settings"""
    if not request.user.is_authenticated:
        return HttpResponseRedirect(reverse('login'))

    app_config = AppConfiguration.get_config()
    if app_config is None:
        return HttpResponseRedirect(reverse('view_no_domain_config_error'))

    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))
    user = user_info.result_obj

    # Is this D3M Mode?  If so, make sure:
    #  (1) there is D3M config information
    #  (2) user is logged in
    #
    if app_config.is_d3m_domain():
        # (1) Is there a valid D3M config?
        d3m_config_info = get_latest_d3m_config()
        if not d3m_config_info:
            return HttpResponseRedirect(reverse('view_list_dataset_choices_html'))
            # return HttpResponseRedirect(reverse('view_d3m_config_error'))

        session_key = get_session_key(request)

    else:
        session_key = '(event-data-no-session-key)'

    dinfo = dict(title='TwoRavens',
                 session_key=session_key,
                 DEBUG=settings.DEBUG,
                 ALLOW_SOCIAL_AUTH=settings.ALLOW_SOCIAL_AUTH,
                 CSRF_COOKIE_NAME=settings.CSRF_COOKIE_NAME,
                 app_config=app_config.convert_to_dict(),
                 TA2_STATIC_TEST_MODE=settings.TA2_STATIC_TEST_MODE,
                 TA2_TEST_SERVER_URL=settings.TA2_TEST_SERVER_URL,
                 TA3_GRPC_USER_AGENT=settings.TA3_GRPC_USER_AGENT, TA3TA2_API_VERSION=TA3TA2Util.get_api_version(),
                 DISPLAY_DATAMART_UI=settings.DISPLAY_DATAMART_UI,
                 WEBSOCKET_PREFIX=settings.WEBSOCKET_PREFIX,
                 GIT_BRANCH_INFO=settings.GIT_BRANCH_INFO)



    log_data = dict(session_key=session_key,
                    feature_id=bl_static.FID_START_RAVENS_PEBBLES_PAGE,
                    activity_l1=bl_static.L1_DATA_PREPARATION,
                    activity_l2=bl_static.L2_DATA_OPEN)

    LogEntryMaker.create_system_entry(user, log_data)
    #print('-' * 40)
    #print(dinfo['app_config'])

    return render(request,
                  'index.html',
                  dinfo)


def view_env_variables(request):
    """List env variables"""

    # get env variable keys
    env_names = list(os.environ.keys())
    env_names.sort()
    d3m_names = [x for x in env_names
                 if x.find('D3M') > -1 or\
                    x.find('DATAMART') > -1]

    all_vars = [(key, os.getenv(key))
                for key in env_names
                if key not in d3m_names]
    d3m_vars = [(key, os.getenv(key)) for key in d3m_names]

    # print(all_vars)
    dinfo = dict(d3m_vars=d3m_vars,
                 all_vars=all_vars)



    return render(request,
                  'content_pages/view_env_variables.html',
                  dinfo)

def view_dev_raven_links(request):
    """Dev homepage (other than pebble page)"""

    dinfo = dict(title="dev links")

    return render(request,
                  'content_pages/dev_raven_links.html',
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
    d3m_config_info = get_latest_d3m_config()
    #get_latest_d3m_user_config_by_request(request)
    if d3m_config_info:
        return HttpResponseRedirect(reverse('home'))

    dinfo = dict(title='D3M configuration error')

    return render(request,
                  'content_pages/no_config_error.html',
                  dinfo)

def view_general_error(request, err_msg, err_title='Error'):
    """Used to pass general errors to a page. Doesn't have a related url"""
    dinfo = dict(title=err_title,
                 err_msg=err_msg)

    return render(request,
                  'content_pages/view_general_error.html',
                  dinfo)

def view_d3m_config_error_test(request):
    """Show the error page w/o an actual check"""

    dinfo = dict(title='D3M configuration error',
                 IS_TEST_PAGE=True)

    return render(request,
                  'content_pages/no_config_error.html',
                  dinfo)

def view_privacy_policy(request):
    """Privacy policy"""
    dinfo = dict(title='TwoRavens: Privacy Policy')

    return render(request,
                  'content_pages/privacy-policy.html',
                  dinfo)

def view_err_500_test(request):
    """Purposely create a 500 error"""
    # div by 0
    x = 1/0

def view_monitoring_alive(request):
    """For kubernetes liveness check"""
    return JsonResponse(dict(status="ok",
                             message="TwoRavens python server up"))


def view_test_csrf_required(request):
    """for testing csrf call"""
    req_body_info = get_request_body(request)
    if not req_body_info.success:
        return JsonResponse(get_json_error(req_body_info.err_msg))

    # user info
    #
    user_msg = 'Sending back info from request body...'
    user_info = dict(is_authenticated=request.user.is_authenticated,
                     username='%s' % request.user)

    # full data returned
    #
    data_info = dict(user_info=user_info,
                     orig_data_as_text=req_body_info.result_obj)

    return JsonResponse(get_json_success(\
                            user_msg,
                            data=data_info))


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
