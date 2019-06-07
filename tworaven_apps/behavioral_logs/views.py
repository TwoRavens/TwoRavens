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


def view_new_log_entry(request):
    """Make log entry endpoint"""

    # ----------------------------------------
    # Get the user
    # ----------------------------------------
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    user = user_info.result_obj

    # ----------------------------------------
    # Get the log data
    # ----------------------------------------
    json_info = get_request_body_as_json(request)
    if not json_info.success:
        return JsonResponse(get_json_error(json_info.err_msg))

    log_data = json_info.result_obj

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

    return JsonResponse(get_json_success('log entry saved!'))
