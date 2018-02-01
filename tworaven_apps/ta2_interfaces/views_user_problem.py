import json
from django.shortcuts import render
from django.conf import settings
from django.http import JsonResponse    #, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from tworaven_apps.utils.view_helper import get_request_body_as_json
from tworaven_apps.ta2_interfaces.user_problem_helper import UserProblemHelper


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

    problem_helper = UserProblemHelper(problem_updates)
    if problem_helper.has_error:
        return JsonResponse(\
                dict(success=False,
                     message=problem_helper.error_message))

    return JsonResponse(dict(success=True,
                             message=problem_helper.get_success_message()))





"""
[1: {target:"Home_runs",
            predictors:["Walks","RBIs"],
            task:"regression",
            rating:5,
            description: "Home_runs is predicted by Walks and RBIs",
            metric: "meanSquaredError"
    }, 2:{...}]
"""
