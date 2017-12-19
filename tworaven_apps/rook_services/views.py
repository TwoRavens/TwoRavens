import requests
import json
from requests.exceptions import ConnectionError

from django.http import JsonResponse, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt

from tworaven_apps.call_captures.models import ServiceCallEntry
from tworaven_apps.rook_services.rook_app_info import RookAppInfo
from tworaven_apps.rook_services.models import UI_KEY_SOLA_JSON, ROOK_ZESSIONID
from tworaven_apps.workspaces.workspace_util import WorkspaceUtil
from tworaven_apps.utils.view_helper import get_session_key
from tworaven_apps.utils.view_helper import get_request_body,\
    get_request_body_as_json

@csrf_exempt
def view_rook_route(request, app_name_in_url):
    """Route TwoRavens calls to Rook
        orig: TwoRavens -> Rook
        view: TwoRavens -> Django 2ravens -> Rook
    """
    # get the app info
    #
    rook_app_info = RookAppInfo.get_appinfo_from_url(app_name_in_url)
    if rook_app_info is None:
        raise Http404(('unknown rook app: "{0}" (please add "{0}" to '
                       ' "tworaven_apps/rook_services/app_names.py")').format(\
                       app_name_in_url))

    # record session metadata, if appropriate
    WorkspaceUtil.record_state(request)

    # look for the "solaJSON" variable in the POST
    #
    if rook_app_info.is_health_check():
        # this is a health check
        raven_data_text = 'healthcheck'
    elif request.POST and UI_KEY_SOLA_JSON in request.POST:
        # this is a POST with a JSON string under the key solaJSON key
        raven_data_text = request.POST[UI_KEY_SOLA_JSON]
    else:
        # See if the body is JSON format
        req_found, raven_data_text = get_request_body_as_json(request)
        if not req_found:   # Nope, send an error
            err_msg = ("Neither key '%s' found in POST"
                       " nor JSON in request.body") % UI_KEY_SOLA_JSON
            return JsonResponse(dict(status="ERROR",
                                     message=err_msg))

    # Retrieve post data and attempt to insert django session id
    # (if none exists)
    #
    # retrieve session key
    session_key = get_session_key(request)
    if isinstance(raven_data_text, str):

        blank_session_str = '%s":""' % ROOK_ZESSIONID
        if raven_data_text.find(blank_session_str) > -1:
            # was converting to JSON, but now just simple text substitution
            #
            updated_session_str = '%s":"%s"' % (ROOK_ZESSIONID, session_key)
            raven_data_text = raven_data_text.replace(blank_session_str, updated_session_str)

    elif ROOK_ZESSIONID in raven_data_text:
        if raven_data_text[ROOK_ZESSIONID] in [None, '']:
            raven_data_text[ROOK_ZESSIONID] = session_key

    if not isinstance(raven_data_text, str):
        try:
            raven_data_text = json.dumps(raven_data_text)
        except TypeError:
            JsonResponse(dict(success=False,
                              message='Failed to convert data to JSON'))

    app_data = dict(solaJSON=raven_data_text)

    rook_svc_url = rook_app_info.get_rook_server_url()

    # Begin object to capture request
    #
    call_entry = None
    if rook_app_info.record_this_call():
        call_entry = ServiceCallEntry.get_rook_entry(\
                        request_obj=request,
                        call_type=rook_app_info.name,
                        outgoing_url=rook_svc_url,
                        request_msg=raven_data_text)

    #print('rook_svc_url: %s' % rook_svc_url)

    # Call R services
    #
    try:
        rservice_req = requests.post(rook_svc_url,
                                     data=app_data)
    except ConnectionError:
        err_msg = 'R Server not responding: %s' % rook_svc_url
        if rook_app_info.record_this_call():
            call_entry.add_error_message(err_msg)
            call_entry.save()
        resp_dict = dict(message=err_msg)
        return JsonResponse(resp_dict)

    # Save request result
    #
    if rook_app_info.record_this_call():
        if rservice_req.status_code == 200:
            call_entry.add_success_message(rservice_req.text,
                                           rservice_req.status_code)
        else:
            call_entry.add_error_message(rservice_req.text,
                                         rservice_req.status_code)
        call_entry.save()

    # Return the response to the user
    #
    #print(40 * '=')
    #print(r.text)
    #d = r.json()
    #print(json.dumps(d, indent=4))
    print('status code from rook call: %d' % rservice_req.status_code)

    return HttpResponse(rservice_req.text)


NUM_CLICKS_KEY = 'NUM_CLICKS_KEY'

@csrf_exempt
def view_rp_test(request):

    d = dict(name='test url',
             status_code=1)
    return JsonResponse(d)

# example of incoming POST from TwoRavens
"""
<QueryDict: {'solaJSON': ['{"zdata":"fearonLaitinData.tab","zedges":[["country","ccode"],["ccode","cname"]],"ztime":[],"znom":["country"],"zcross":[],"zmodel":"","zvars":["ccode","country","cname"],"zdv":["cname"],"zdataurl":"","zsubset":[["",""],[],[]],"zsetx":[["",""],["",""],["",""]],"zmodelcount":0,"zplot":[],"zsessionid":"","zdatacite":"Dataverse, Admin, 2015, \\"Smoke test\\", http://dx.doi.org/10.5072/FK2/WNCZ16,  Root Dataverse,  V1 [UNF:6:iuFERYJSwTaovVDvwBwsxQ==]","zmetadataurl":"http://127.0.0.1:8080/static/data/fearonLaitin.xml","zusername":"rohit","callHistory":[],"allVars":["durest","aim","casename","ended","ethwar","waryrs","pop","lpop","polity2","gdpen","gdptype","gdpenl","lgdpenl1","lpopl1","region"]}']}>
"""
"""
try:
    # try to convert text to JSON
    #
    raven_data_json = json.loads(request.POST['solaJSON'])

    # Doublecheck that the ROOK_ZESSIONID is blank
    #
    if raven_data_json.get(ROOK_ZESSIONID, None) == '':
        #print('blank session id....')
        # blank id found, subsitute the django session key
        #
        raven_data_json[ROOK_ZESSIONID] = session_key
        #
        #
        raven_data_text = json.dumps(raven_data_json)
"""
