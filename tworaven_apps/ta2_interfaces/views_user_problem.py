import json
from django.shortcuts import render
from django.conf import settings
from django.http import JsonResponse    #, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from tworaven_apps.utils.view_helper import \
    (get_request_body_as_json,
     get_authenticated_user)

from tworaven_apps.ta2_interfaces.user_problem_helper import UserProblemHelper
from tworaven_apps.ta2_interfaces.util_data_writer import UtilDataWriter
from tworaven_apps.ta2_interfaces.basic_problem_writer import BasicProblemWriter
from tworaven_apps.ta2_interfaces.forms import \
    (SaveProblemForm,
     PROBLEM_REQ_FILENAME, PROBLEM_REQ_DATA)
from datetime import datetime
from tworaven_apps.utils.view_helper import \
    (get_request_body,
     get_json_error,
     get_json_success)
from tworaven_apps.utils.view_helper import \
    (get_authenticated_user,)


@login_required
def view_save_problem_form(request):
    """View test form"""
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    info_dict = dict()
    if request.POST:
        save_problem_form = SaveProblemForm(request.POST)
        if save_problem_form.is_valid():
            content = save_problem_form.cleaned_data

            bpw = BasicProblemWriter(user_info.result_obj,
                                     content[PROBLEM_REQ_FILENAME],
                                     content[PROBLEM_REQ_DATA])

            if bpw.has_error():
                return JsonResponse(get_json_error(bpw.error_message))


            data_info = dict(filename=bpw.new_filepath,
                             timestamp=datetime.now())

            info = get_json_success('file created!',
                                    data=data_info)
            return JsonResponse(info)
        else:
            info_dict['form_errs'] = save_problem_form.errors
            save_problem_form = SaveProblemForm()
    else:
        save_problem_form = SaveProblemForm()

    info_dict['cform'] = save_problem_form

    return render(request,
                  'ta2_interfaces/view_save_problem_form.html',
                  info_dict)


@csrf_exempt
def view_store_ta2ta3_data(request):
    """Initial step, store a file to the /output/temp_storage_root directory

    (1) Data is sent as JSON
    (2) Converted to .csv
    (3) Saved in the "temp_storage_root" as specified in the search_config.json
    """
    req_info = get_request_body_as_json(request)
    if not req_info.success:
        user_msg = ('The request did not contain problem data')
        return JsonResponse(get_json_error(user_msg))

    req_json = req_info.result_obj

    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))
    user_obj = user_info.result_obj

    if not PROBLEM_REQ_DATA in req_json:
        user_msg = ('The request did not a "%s" value') % PROBLEM_REQ_DATA
        return JsonResponse(get_json_error(user_msg))

    filename = None
    if PROBLEM_REQ_FILENAME in req_json:
        filename = req_json[PROBLEM_REQ_FILENAME]

    udw = UtilDataWriter(user_obj,
                         req_json[PROBLEM_REQ_DATA],
                         filename)

    if udw.has_error():
        return JsonResponse(get_json_error(udw.error_message))

    info = get_json_success('file created!',
                            data=udw.get_final_info())

    return JsonResponse(info)


@csrf_exempt
def view_store_basic_problem(request):
    """Initial step, store a file to the /output directory

    (1) Try: "output/problems" + ....
    (2) Try: config.temp_storage_root  + "problems" + .....
    """
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    req_info = get_request_body_as_json(request)
    if not req_info.success:
        #user_msg = ('The request did not contain problem data')
        return JsonResponse(get_json_error(req_info.err_msg))

    req_json = req_info.result_obj

    if not PROBLEM_REQ_FILENAME in req_json:
        user_msg = ('The request did not a "%s" value') % PROBLEM_REQ_FILENAME
        return JsonResponse(get_json_error(user_msg))

    if not PROBLEM_REQ_DATA in req_json:
        user_msg = ('The request did not a "%s" value') % PROBLEM_REQ_DATA
        return JsonResponse(get_json_error(user_msg))

    bpw = BasicProblemWriter(user_info.result_obj,
                             req_json[PROBLEM_REQ_FILENAME],
                             req_json[PROBLEM_REQ_DATA])

    if bpw.has_error():
        return JsonResponse(get_json_error(bpw.error_message))


    data_info = dict(filename=bpw.new_filepath,
                     timestamp=datetime.now())

    info = get_json_success('file created!',
                            data=data_info)

    return JsonResponse(info)



@csrf_exempt
def view_write_user_problem(request):
    """Format the user problem and write it to a file
    - Pull the current D3M config and update it based on the info
      provided
    """
    success, dict_info_or_err = get_request_body_as_json(request)
    if not success:
        return JsonResponse(dict(success=False,
                                 message=dict_info_or_err))

    problem_updates = dict_info_or_err

    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))


    problem_helper = UserProblemHelper(user_info.result_obj, problem_updates)
    if problem_helper.has_error:
        return JsonResponse(\
                dict(success=False,
                     message=problem_helper.error_message))

    return JsonResponse(dict(success=True,
                             message=problem_helper.get_success_message(),
                             data=dict(\
                                filepath=problem_helper.problem_filepath,
                                fileuri=problem_helper.problem_file_uri)))



@csrf_exempt
def view_format_retrieve_user_problem(request):
    """Format the user problem and return the doc (instead of writing to file)
    """
    success, dict_info_or_err = get_request_body_as_json(request)
    if not success:
        return JsonResponse(get_json_error(dict_info_or_err))

    problem_updates = dict_info_or_err

    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))

    problem_helper = UserProblemHelper(user_info.result_obj,
                                       problem_updates,
                                       save_schema_to_file=False)

    if problem_helper.has_error:
        return JsonResponse(\
                dict(success=False,
                     message=problem_helper.error_message))

    return JsonResponse(\
                dict(success=True,
                     message=problem_helper.get_success_message(),
                     data=dict(\
                        new_problem_doc=problem_helper.new_problem_doc)))




"""
Need to write some tests.

http://127.0.0.1:8080/d3m-service/write-user-problem

{"target":"Home_runs",
    "predictors":["Walks","RBIs"],
    "task":"regression",
    "rating":5,
    "description": "Home_runs is predicted by Walks and RBIs",
    "metric": "meanSquaredError"
}



[1: {target:"Home_runs",
            predictors:["Walks","RBIs"],
            task:"regression",
            rating:5,
            description: "Home_runs is predicted by Walks and RBIs",
            metric: "meanSquaredError"
    }, 2:{...}]
"""
