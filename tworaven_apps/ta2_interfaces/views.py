import random, string
import json
from django.conf import settings
from django.shortcuts import render
from django.views.decorators.http import require_POST, require_GET
from django.template.loader import render_to_string
from django.http import JsonResponse, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from tworaven_apps.ta2_interfaces.req_start_session import start_session
from tworaven_apps.ta2_interfaces.req_end_session import end_session
from tworaven_apps.ta2_interfaces.req_update_problem_schema import \
    update_problem_schema
from tworaven_apps.ta2_interfaces.req_pipeline_create import \
    pipeline_create
from tworaven_apps.ta2_interfaces.ta2_util import get_grpc_content
from tworaven_apps.ta2_interfaces.models import GRPC_JSON_KEY


def get_grpc_test_json(request, grpc_json_file, info_dict={}):
    """Return gRPC JSON response"""
    json_str = render_to_string(grpc_json_file, info_dict)

    return JsonResponse(json.loads(json_str), safe=False)


def view_grpc_test_links(request):
    """Show an existing list of gRPC related urls"""
    return render(request,
                  'grpc_list.html')

@csrf_exempt
def view_startsession(request):
    """gRPC: Call from UI to start session

    user_agent = can come from UI.
    Version id will originate on the server
    """
    django_session_key = request.session._get_or_create_session_key()

    # Test mode, return hardcoded message
    #
    if settings.TA2_STATIC_TEST_MODE:
        rnd_session_id = ''.join(random.choice(string.ascii_lowercase + string.digits)
                         for _ in range(7))
        d = dict(session_id=rnd_session_id)
        if random.randint(1,10) == 3:
            return get_grpc_test_json(request, 'test_responses/startsession_badassertion.json')
        else:
            return get_grpc_test_json(request, 'test_responses/startsession_ok.json', d)

    success, raven_data_or_err = get_grpc_content(request)
    if not success:
        return JsonResponse(dict(status=False,
                                 message=raven_data_or_err))

    # Let's call the TA2 and start the session!
    #
    json_str = start_session(raven_data_or_err)

    # Convert JSON str to python dict - err catch here
    #  - let it blow up for now--should always return JSON
    json_dict = json.loads(json_str)


    return JsonResponse(json_dict, safe=False)



@csrf_exempt
def view_endsession(request):
    """gRPC: Call from UI to END session

    session_id = from UI; originally from startsession commmand

    example string: '{"session_id":"1x3551"}'
    """
    django_session_key = request.session._get_or_create_session_key()

    # Test mode, return hardcoded message
    #
    if settings.TA2_STATIC_TEST_MODE:
        rnd_session_id = ''.join(random.choice(string.ascii_lowercase + string.digits)
                         for _ in range(7))
        tinfo = dict(session_id=rnd_session_id)
        if random.randint(1, 3) == 3:
            return get_grpc_test_json(request, 'test_responses/endsession_badassertion.json')

        return get_grpc_test_json(request,
                                  'test_responses/endsession_ok.json',
                                  tinfo)

    success, raven_data_or_err = get_grpc_content(request)
    if not success:
        return JsonResponse(dict(status=False,
                                 message=raven_data_or_err))

    # Let's call the TA2 and start the session!
    #
    json_str = end_session(raven_data_or_err)

    # Convert JSON str to python dict - err catch here
    #
    json_dict = json.loads(json_str)

    return JsonResponse(json_dict, safe=False)



@csrf_exempt
def view_update_problem_schema(request):
    """gRPC: Call from UI to update the problem schema"""
    django_session_key = request.session._get_or_create_session_key()

    if settings.TA2_STATIC_TEST_MODE:
        return get_grpc_test_json(\
            request,
            'test_responses/updateproblemschema_ok.json',
            dict())

    success, raven_data_or_err = get_grpc_content(request)
    if not success:
        return JsonResponse(dict(status=False,
                                 message=raven_data_or_err))

    # Let's call the TA2!
    #
    json_str = update_problem_schema(raven_data_or_err)

    # Convert JSON str to python dict - err catch here
    #
    json_dict = json.loads(json_str)

    return JsonResponse(json_dict, safe=False)


@csrf_exempt
def view_create_pipeline(request):
    """gRPC: Call from UI to update the problem schema"""
    django_session_key = request.session._get_or_create_session_key()

    if settings.TA2_STATIC_TEST_MODE:
        return get_grpc_test_json(\
            request,
            'test_responses/createpipeline_ok.json')

    success, raven_data_or_err = get_grpc_content(request)
    if not success:
        return JsonResponse(dict(status=False,
                                 message=raven_data_or_err))

    # Let's call the TA2!
    #
    json_str = pipeline_create(raven_data_or_err)

    # Convert JSON str to python dict - err catch here
    #
    json_dict = json.loads(json_str)

    return JsonResponse(json_dict, safe=False)

@csrf_exempt
def view_test_call(request):
    """gRPC: Capture other calls to D3M"""
    if request.POST:
        post_str = str(request.POST)
    else:
        post_str = '(no post)'

    info = dict(status='ok',
                post_str=post_str,
                message='test message to path: %s' % request.path)


    return JsonResponse(info)
