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
from tworaven_apps.behavioral_logs.log_entry_maker import LogEntryMaker
from tworaven_apps.behavioral_logs.log_formatter \
    import BehavioralLogFormatter
from tworaven_apps.behavioral_logs import static_vals as bl_static

from tworaven_apps.utils.view_helper import get_session_key
from tworaven_apps.utils.random_info import get_timestamp_string


def view_clear_logs_for_user(request):
    """Delete logs for the current user"""
    user_info = get_authenticated_user(request)
    if not user_info.success:
        # If not logged in, you end up on the log in page
        return JsonResponse(get_json_error("Not logged in"))

    log_entry_info = BehavioralLogFormatter.get_log_entries(user_info.result_obj)
    if not log_entry_info.success:
        return JsonResponse(get_json_error(log_entry_info.err_msg))

    log_entries = log_entry_info.result_obj

    num_entries = log_entries.count()

    if num_entries > 0:
        log_entries.delete()
        user_msg = 'count of deleted log entries: %s' % num_entries
    else:
        user_msg = 'No log entries to delete'

    return JsonResponse(get_json_success(user_msg))


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

    log_entry_info = BehavioralLogFormatter.get_log_entries(user, session_key)
    if not log_entry_info.success:
        return HttpResponse(log_entry_info.err_msg)

    dinfo = dict(user=user,
                 session_key=session_key,
                 log_entries=log_entry_info.result_obj)

    return render(request,
                  'behavioral_logs/view_user_log.html',
                  dinfo)

@csrf_exempt
def view_export_log_csv(request):
    """Export the behavioral log as a .csv"""
    # ----------------------------------------
    # Get the user and session_key
    # ----------------------------------------
    user_info = get_authenticated_user(request)
    if not user_info.success:
        # If not logged in, you end up on the log in page
        return HttpResponseRedirect(reverse('home'))

    user = user_info.result_obj
    session_key = get_session_key(request)

    log_entry_info = BehavioralLogFormatter.get_log_entries(user, session_key)
    if not log_entry_info.success:
        return HttpResponse(log_entry_info.err_msg)


    # Create the HttpResponse object with the appropriate CSV header.
    #
    response = HttpResponse(content_type='text/csv')
    log_fname = f'behavioral_log_{get_timestamp_string()}.csv'
    response['Content-Disposition'] = f'attachment; filename="{log_fname}"'

    blf = BehavioralLogFormatter(csv_output_object=response,
                                 log_entries=log_entry_info.result_obj)

    if blf.has_error():
        user_msg = 'Error: %s' % blf.get_error_message()
        return HttpResponse(user_msg)

    #writer = csv.writer(response)
    #writer.writerow(['First row', 'Foo', 'Bar', 'Baz'])
    #writer.writerow(['Second row', 'A', 'B', 'C', '"Testing"', "Here's a quote"])

    return blf.get_csv_output_object()


@csrf_exempt
def view_create_log_entry_verbose(request):
    """Create a new BehavioralLogEntry.  Return the JSON version of the entry"""
    return view_create_log_entry(request, is_verbose=True)


@csrf_exempt
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

    # Default L2 to unkown
    #
    if not bl_static.KEY_L2_ACTIVITY in log_data:
        log_data[bl_static.KEY_L2_ACTIVITY] = bl_static.L2_ACTIVITY_BLANK

    if not 'type' in log_data:
        user_msg = 'Log entry error. The "type" must be included.'
        return JsonResponse(get_json_error(user_msg))

    log_create_info = LogEntryMaker.create_log_entry(user, log_data['type'], log_data)
    if not log_create_info.success:
        return JsonResponse(get_json_error(log_create_info.err_msg))

    user_msg = 'Log entry saved!'

    if is_verbose:
        return JsonResponse(get_json_success(\
                                user_msg,
                                data=log_create_info.result_obj.to_dict()))

    return JsonResponse(get_json_success(user_msg))
