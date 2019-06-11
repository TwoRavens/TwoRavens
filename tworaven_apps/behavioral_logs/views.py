from django.shortcuts import render

from django.http import HttpResponse, JsonResponse, Http404, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt

from django.conf import settings
from django.urls import reverse

from tworaven_apps.utils.view_helper import \
    (get_request_body,
     get_request_body_as_json,
     get_json_error,
     get_json_success)
from tworaven_apps.utils.json_helper import format_pretty_from_dict

from tworaven_apps.utils.view_helper import \
    (get_authenticated_user,)

from tworaven_apps.behavioral_logs.forms import BehavioralLogEntryForm
from tworaven_apps.behavioral_logs.models import BehavioralLogEntry

from tworaven_apps.utils.view_helper import get_session_key


def view_show_log_onscreen(request):
    """View a log base on the user's session_id, or just username"""
    # ----------------------------------------
    # Get the user and session_key
    # ----------------------------------------
    user_info = get_authenticated_user(request)
    if not user_info.success:
        # If not logged in, you end up on the log in page
        return HttpResponseRedirect(reverse('home'))

    user = user_info.result_obj
    session_key = get_session_key(request)


    dinfo = dict(user=user,
                 session_key=session_key,
                 log_entries=None)

    # Try to retrieve logs by session_key
    # If none, exist, try by user object
    #
    log_entries = None
    if session_key:
        log_entries = BehavioralLogEntry.objects.filter(session_key=session_key)

    if not log_entries:
        log_entries = BehavioralLogEntry.objects.filter(user=user)

    dinfo['log_entries'] = log_entries

    return render(request,
                  'behavioral_logs/view_user_log.html',
                  dinfo)

def view_create_log_entry_verbose(request):
    """Create a new BehavioralLogEntry.  Return the JSON version of the entry"""
    return view_create_log_entry(request, is_verbose=True)


def view_create_log_entry(request, is_verbose=False):
    """Make log entry endpoint"""

    # ----------------------------------------
    # Get the user and session_key
    # ----------------------------------------
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    user = user_info.result_obj
    session_key = get_session_key(request)

    # ----------------------------------------
    # Get the log data
    # ----------------------------------------
    json_info = get_request_body_as_json(request)
    if not json_info.success:
        return JsonResponse(get_json_error(json_info.err_msg))

    log_data = json_info.result_obj
    log_data.update(dict(session_key=session_key))

    # ----------------------------------------
    # Validate the data
    # ----------------------------------------
    log_form = BehavioralLogEntryForm(log_data)

    if not log_form.is_valid():
        msg = 'There were errors in the log entry'

        # Example dict(log_form.errors) value:
        #
        # {'activity_l1': ['Select a valid choice.
        #                   bleh is not one of the available choices.']}
        #
        json_err = get_json_error(msg, errors=dict(log_form.errors))

        return JsonResponse(json_err)

    # ----------------------------------------
    # Save it!
    # ----------------------------------------
    new_entry = BehavioralLogEntry(**log_data)
    new_entry.user = user

    new_entry.save()

    user_msg = 'Log entry saved!'

    if is_verbose:
        return JsonResponse(get_json_success(\
                                user_msg,
                                data=new_entry.to_dict()))

    return JsonResponse(get_json_success(user_msg))
