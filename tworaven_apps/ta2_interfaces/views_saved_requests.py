import json
from collections import OrderedDict
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from tworaven_apps.utils.view_helper import \
    (get_request_body,
     get_json_error,
     get_json_success)
from tworaven_apps.call_captures.models import ServiceCallEntry
from tworaven_apps.utils.view_helper import \
    (get_session_key, get_authenticated_user)
from tworaven_apps.ta2_interfaces.models import \
    (StoredRequest, StoredResponse)
from tworaven_apps.ta2_interfaces.search_history_util import SearchHistoryUtil
from tworaven_apps.ta2_interfaces.static_vals import \
        (SEARCH_SOLUTIONS,
         GET_SEARCH_SOLUTIONS_RESULTS)

def view_grpc_search_history_json_no_id(request):
    """Pick an existing search history, if it exists"""

    resp = SearchHistoryUtil.get_first_search_soutions_call()

    if not resp:
        err_info = get_json_error('No search_id was found')
        return JsonResponse(get_json_error(err_info))

    return view_grpc_search_history_json(request, resp.search_id)


def view_grpc_search_history_json(request, search_id):
    """View stored request/responses based on search_id"""
    if not search_id:
        err_info = get_json_error('No search_id was found')
        return JsonResponse(get_json_error(err_info))

    search_history_util = SearchHistoryUtil(search_id=search_id)

    if search_history_util.has_error():
        err_info = f'Error found: {search_history_util.get_err_msg()}'
        #print(f'Error found: f{search_history_util.get_error()}')
        return JsonResponse(get_json_error(err_info))

    info_dict = dict(search_id=search_id,
                     json_history=search_history_util.get_finalized_history())

    user_info = get_json_success('History found', data=info_dict)
    return JsonResponse(user_info)


@csrf_exempt
def view_stored_request(request, hash_id):
    """Return a StoredRequest object"""
    user_info = get_authenticated_user(request)
    #if not user_info.success:
    #    return JsonResponse(get_json_error(user_info.err_msg))
    #user = user_info.result_obj

    try:
        req = StoredRequest.objects.get(\
                                hash_id=hash_id)
                                #user=user)
    except StoredRequest.DoesNotExist:
        user_msg = 'StoredRequest not found.'
        return JsonResponse(get_json_error(user_msg))

    if 'pretty' in request.GET:
        json_str = '<pre>%s<pre>' % \
                   (json.dumps(req.as_dict(), indent=4))
        return HttpResponse(json_str)

    resp_info = get_json_success('ok',
                                 data=req.as_dict())
    return JsonResponse(resp_info)



@csrf_exempt
def view_stored_response(request, hash_id):
    """Return a StoredResponse object"""
    user_info = get_authenticated_user(request)
    #if not user_info.success:
    #    return JsonResponse(get_json_error(user_info.err_msg))
    #user = user_info.result_obj

    try:
        resp = StoredResponse.objects.get(\
                                hash_id=hash_id,)
                                # stored_request__user=user)
    except StoredResponse.DoesNotExist:
        user_msg = 'StoredResponse not found.'
        return JsonResponse(get_json_error(user_msg))

    StoredResponse.mark_as_read(resp)

    if 'pretty' in request.GET:
        json_str = '<pre>%s<pre>' % \
                   (json.dumps(resp.as_dict(), indent=4))
        return HttpResponse(json_str)

    resp_info = get_json_success('ok',
                                 data=resp.as_dict())
    return JsonResponse(resp_info)
