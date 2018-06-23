from django.shortcuts import render
import json
from collections import OrderedDict
from django.shortcuts import render
from django.http import \
    (JsonResponse, HttpResponse,
     Http404, HttpResponseRedirect,
     QueryDict)
from django.template.loader import render_to_string
from django.views.decorators.csrf import csrf_exempt
from tworaven_apps.utils.view_helper import \
    (get_request_body_as_json,
     get_json_error,
     get_json_success)
from tworaven_apps.eventdata_queries.event_job_util import EventJobUtil

# Create your views here.

@csrf_exempt
def api_add_query(request):
    """add query to the db
    Json input :
    { "name":"query1",
      "description":"query1 desc",
      "username":"two ravens",
      "query":" set data",
      "result_count":"4"
      }
    """
    success, json_req_obj = get_request_body_as_json(request)
    # if json is not valid
    if not success:
        usr_msg = dict(success=False,
                       error=get_json_error(json_req_obj))
        return JsonResponse(usr_msg)

    # json is valid
    print("input json : ", json.dumps(json_req_obj))
    success, addquery_obj_err = EventJobUtil.add_query_db(json_req_obj)

    if not success:
        return JsonResponse(addquery_obj_err)

    return JsonResponse(addquery_obj_err)







