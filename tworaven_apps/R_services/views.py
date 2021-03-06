from os.path import isfile, join
import requests
import json
import logging
from requests.exceptions import ConnectionError
from tworaven_apps.utils.basic_response import ok_resp, err_resp

from django.http import JsonResponse, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt

from tworaven_apps.user_workspaces.utils import get_latest_user_workspace
from tworaven_apps.user_workspaces.models import UserWorkspace
from tworaven_apps.utils.file_util import move_file
from tworaven_apps.utils.json_helper import json_dumps, json_loads

from tworaven_apps.R_services.R_app_info import RAppInfo
from tworaven_apps.R_services.models import UI_KEY_SOLA_JSON, ROOK_ZESSIONID
from tworaven_apps.R_services import app_names
from tworaven_apps.ta2_interfaces import static_vals as ta2_static

from tworaven_apps.R_services.preprocess_util import \
    (PreprocessUtil,)

from tworaven_apps.utils.view_helper import get_session_key

from tworaven_apps.utils.view_helper import \
    (get_request_body,
     get_request_body_as_json)
from tworaven_apps.utils.view_helper import \
    (get_json_error,
     get_json_success,
     get_authenticated_user)

from tworaven_apps.ta2_interfaces import static_vals as ta2_static
from tworaven_apps.behavioral_logs.log_entry_maker import LogEntryMaker
from tworaven_apps.behavioral_logs import static_vals as bl_static

from tworaven_apps.R_services import static_vals as rook_static
from tworaven_apps.utils.raven_json_encoder import RavenJSONEncoder

LOGGER = logging.getLogger(__name__)


@csrf_exempt
def view_R_preprocess(request):
    """Route to rook preprocess
    Example input:
        {
          "data": "/ravens_volume/test_data/196_autoMpg/TRAIN/dataset_TRAIN/tables/learningData.csv",
          "datastub": "196_ag_problem_TRAIN"
        }
    """
    # used for logging
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))


    json_info = get_request_body_as_json(request)
    if not json_info.success:
        return JsonResponse(get_json_error(json_info.err_msg))

    json_data = json_info.result_obj


    LOGGER.info('view_rook_preprocess input: %s', json_data)
    # print('view_rook_preprocess, json_data', json_data)

    if not rook_static.KEY_DATA in json_data:
        err_msg = (f'The key "{rook_static.KEY_DATA}" was not found'
                   f' in the preprocess request')
        return JsonResponse(get_json_error(err_msg))

    if not rook_static.KEY_DATASTUB in json_data:
        err_msg = (f'The key "{rook_static.KEY_DATASTUB}" was not found'
                   f' in the preprocess request')
        return JsonResponse(get_json_error(err_msg))


    log_preprocess_call(user_info.result_obj,
                        json_data,
                        get_session_key(request))


    putil = PreprocessUtil(json_data[rook_static.KEY_DATA],
                           datastub=json_data[rook_static.KEY_DATASTUB],
			   variables=json_data.get(rook_static.KEY_VARS))
    if putil.has_error():
        return JsonResponse(get_json_error(putil.get_error_message()))

    info = get_json_success('it worked',
                            data=putil.get_preprocess_data())

    return JsonResponse(info, encoder=RavenJSONEncoder)


def log_preprocess_call(user, json_data, session_id=''):
    """Note: The preprocess call also does problem discovery."""
    # --------------------------------
    # Behavioral logging
    # --------------------------------
    # Check the request for an l1_activity, default to DATA_PREPARATION
    #
    activity_l1_val = json_data[bl_static.KEY_L1_ACTIVITY] \
                      if bl_static.KEY_L1_ACTIVITY in json_data \
                      else bl_static.L1_DATA_PREPARATION

    # Check the request for an l1_activity, default to DATA_PREPARATION
    #
    activity_l2_val = json_data[bl_static.KEY_L2_ACTIVITY] \
                      if bl_static.KEY_L2_ACTIVITY in json_data \
                      else bl_static.L2_DATA_EXPLORE

    log_data = dict(session_key=session_id,
                    feature_id=rook_static.PREPROCESS_DATA,
                    activity_l1=activity_l1_val,
                    activity_l2=activity_l2_val)

    LogEntryMaker.create_system_entry(user, log_data)

    # Log the discovery activity
    #
    log_data2 = dict(session_key=session_id,
                     feature_id=rook_static.PROBLEM_DISCOVERY,
                     activity_l1=bl_static.L1_PROBLEM_DEFINITION,
                     activity_l2=activity_l2_val)

    LogEntryMaker.create_system_entry(user, log_data2)

@csrf_exempt
def view_R_healthcheck(request):
    """Ping rook to make sure it's receiving/responding to requests"""
    # get the app info
    #
    rook_app_info = RAppInfo.get_appinfo_from_name(app_names.HEALTH_CHECK_APP)
    if not rook_app_info:
        raise Http404((f'unknown rook app: "{app_names.HEALTH_CHECK_APP}"'
                       f' (please add "{app_names.HEALTH_CHECK_APP}" to '
                       f' "tworaven_apps/R_services/app_names.py")'))

    rook_svc_url = rook_app_info.get_rook_server_url()

    # Call R services
    #
    try:
        rservice_req = requests.post(rook_svc_url)
    except ConnectionError as err_obj:
        err_msg = f'R Server not responding: {rook_svc_url} ({err_obj})'
        resp_dict = dict(message=err_msg)
        return JsonResponse(resp_dict)

    print('status code from rook call: %d' % rservice_req.status_code)

    return HttpResponse(rservice_req.text)

@csrf_exempt
def view_R_route(request, app_name_in_url):
    """Route TwoRavens calls to Rook
        orig: TwoRavens -> Rook
        view: TwoRavens -> Django 2ravens -> Rook

    This is a bit messy.  Still trying to handle two UI calls:
    - old ones, form POSTs sent with solaJSON key
    - new ones, straight JSON requests
    """
    # -----------------------------
    # get the app info
    # -----------------------------
    rook_app_info = RAppInfo.get_appinfo_from_url(app_name_in_url)
    if rook_app_info is None:
        raise Http404(('unknown rook app: "{0}" (please add "{0}" to '
                       ' "tworaven_apps/R_services/app_names.py")').format(\
                       app_name_in_url))

    # -----------------------------
    # Used for logging
    # -----------------------------
    user_workspace_info = get_latest_user_workspace(request)
    if not user_workspace_info.success:
        return JsonResponse(get_json_error(user_workspace_info.err_msg))

    user_workspace = user_workspace_info.result_obj


    # -----------------------------
    # additional params
    # -----------------------------
    raven_data_text = {}    # default
    additional_params = {}  # params to add to a JSON call, e.g. for PARTIALS_APP

    # -----------------------------
    # look for the "solaJSON" variable in the POST
    # -----------------------------
    if request.POST and UI_KEY_SOLA_JSON in request.POST:
        # this is a POST with a JSON string under the key solaJSON key
        raven_data_text = request.POST[UI_KEY_SOLA_JSON]
    else:
        # See if the body is JSON format
        raven_data_info = get_request_body_as_json(request)
        if not raven_data_info.success:
            err_msg = ("Neither key '%s' found in POST"
                       " nor JSON in request.body") % UI_KEY_SOLA_JSON
            return JsonResponse(dict(status="ERROR",
                                     message=err_msg))

        raven_data_text = raven_data_info.result_obj

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
        elif raven_data_text.find(ROOK_ZESSIONID) == -1:
            print('MAJOR ISSUE: NOT SESSION AT ALL (R_services.views.py)')

    elif isinstance(raven_data_text, dict):
        #  We have a dict, make sure it gets a session
        if ROOK_ZESSIONID in raven_data_text:
            if raven_data_text[ROOK_ZESSIONID] in [None, '']:
                raven_data_text[ROOK_ZESSIONID] = session_key
        elif ROOK_ZESSIONID not in raven_data_text:
            raven_data_text[ROOK_ZESSIONID] = session_key

        # Add the additional params
        raven_data_text.update(additional_params)

        try:
            raven_data_text = json.dumps(raven_data_text)
        except TypeError:
            return JsonResponse(\
                        dict(success=False,
                             message='Failed to convert data to JSON'))

    # print('raven_data_text', raven_data_text)

    app_data = json.loads(raven_data_text)

    # --------------------------------
    # Behavioral logging
    # --------------------------------
    print('rook_app_info.name:', rook_app_info.name)
    feature_id = rook_app_info.name
    if rook_app_info.name == app_names.EXPLORE_APP:
        activity_l1 = bl_static.L1_DATA_PREPARATION
        activity_l2 = bl_static.L2_DATA_EXPLORE

    elif rook_app_info.name == app_names.PLOTDATA_APP:
        feature_id = 'EXPLORE_VIEW_PLOTS'
        activity_l1 = bl_static.L1_DATA_PREPARATION
        activity_l2 = bl_static.L2_DATA_EXPLORE
    else:
        activity_l1 = bl_static.L1_PROBLEM_DEFINITION
        activity_l2 = bl_static.L2_ACTIVITY_BLANK

    log_data = dict(session_key=session_key,
                    feature_id=feature_id,
                    activity_l1=activity_l1,
                    activity_l2=activity_l2)

    LogEntryMaker.create_system_entry(user_workspace.user, log_data)

    # Call R services
    #
    rook_svc_url = rook_app_info.get_rook_server_url()
    print('rook_svc_url', rook_svc_url)
    try:
        rservice_req = requests.post(rook_svc_url,
                                     json=app_data)
    except ConnectionError:
        err_msg = 'R Server not responding: %s' % rook_svc_url
        resp_dict = dict(message=err_msg)
        return JsonResponse(resp_dict)

    print('status code from rook call: %s' % rservice_req.status_code)

    # print('rook text: %s' % rservice_req.text)
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
