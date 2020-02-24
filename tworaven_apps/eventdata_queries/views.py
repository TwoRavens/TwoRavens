import json
import logging

from django.conf import settings
from django.shortcuts import render
from django.db import IntegrityError
from django.http import \
    (JsonResponse, HttpResponse)
from django.views.decorators.csrf import csrf_exempt
from tworaven_apps.utils.msg_helper import msg, msgt
from tworaven_apps.R_services.make_datadocs_util import MakeDatadocsUtil
from tworaven_apps.utils.view_helper import \
    (get_request_body_as_json,
     get_json_error,
     get_json_success,
     get_common_view_info)
from tworaven_apps.utils.json_helper import format_pretty_from_dict, json_comply
from tworaven_apps.utils.view_helper import \
    (get_authenticated_user,)
from tworaven_apps.eventdata_queries.event_job_util import EventJobUtil
from tworaven_apps.eventdata_queries.forms import \
    (EventDataSavedQueryForm,
     EventDataGetDataForm,
     EventDataGetMetadataForm,
     EventDataGetManipulationForm)
from tworaven_apps.eventdata_queries.models import \
    (EventDataSavedQuery,
     SEARCH_PARAMETERS, SEARCH_KEY_NAME, SEARCH_KEY_DESCRIPTION)
from tworaven_apps.eventdata_queries.mongo_retrieve_util import \
    MongoRetrieveUtil
from tworaven_apps.eventdata_queries.static_vals import \
    (KEY_INCLUDE_EVENTDATA_COLLECTION_NAMES,)
from tworaven_apps.user_workspaces.utils import get_latest_user_workspace

LOGGER = logging.getLogger(__name__)


def api_mongo_healthcheck(request, **kwargs):
    """Mongo healthcheck"""
    print('api_mongo_healthcheck kwargs', kwargs)
    mongo_check = MongoRetrieveUtil.run_tworavens_healthcheck(**kwargs)

    if mongo_check.success:
        return JsonResponse(get_json_success(\
                            'Mongo is running',
                            data=mongo_check.result_obj))

    return JsonResponse(get_json_error(mongo_check.err_msg))

def api_list_eventdata_collections(request):
    print('api_list_eventdata_collections')
    return api_mongo_healthcheck(\
                    request,
                    **{KEY_INCLUDE_EVENTDATA_COLLECTION_NAMES: True})

def view_eventdata_api_info(request):
    """List some API info, for developers"""
    if not request.user.is_authenticated:
        pass
        # user_msg = 'You must be logged in.'
        # return HttpResponse(user_msg)

    info = get_common_view_info(request)

    # For showing an actual EventDataSavedQuery
    #   ... if one is available
    #
    sample_saved_query = None
    if request.user.is_authenticated:
        sample_saved_query = EventDataSavedQuery.objects.filter(user=request.user).first()
    info['sample_saved_query'] = sample_saved_query
    info['SEARCH_PARAMETERS'] = SEARCH_PARAMETERS
    info['SEARCH_KEY_NAME'] = SEARCH_KEY_NAME
    info['SEARCH_KEY_DESCRIPTION'] = SEARCH_KEY_DESCRIPTION
    info['CSRF_COOKIE_NAME'] = settings.CSRF_COOKIE_NAME

    return render(request,
                  'eventdata/view_event_data_api_info.html',
                  info)


@csrf_exempt
def api_add_event_data_query(request):
    """
    Add an EventDataSavedQuery to the database
    Example Json included in the body of th request:
        {
           "name":"User entered query name",
           "description":"In this query I am ...."
           "query":[ "... mongo query, either list or dict ..." ],
           "collection_name":"acled_africa",
           "collection_type":"subset",
           "result_count":161939,
        }
    """
    if not request.user.is_authenticated:
        user_msg = 'You must be logged in.'
        return JsonResponse(get_json_error(user_msg),
                            status=403)

    json_info = get_request_body_as_json(request)
    # if json is not valid
    if not json_info.success:
        return JsonResponse(get_json_error(json_info.err_msg))

    # Validate form results
    #
    event_data_info = json_info.result_obj
    event_data_info['user'] = request.user.id
    frm = EventDataSavedQueryForm(event_data_info)

    if not frm.is_valid():
        user_msg = dict(success=False,
                        message='Invalid input',
                        errors=frm.errors)
        return JsonResponse(user_msg)

    # Save the object
    #
    saved_query = EventDataSavedQuery(**frm.cleaned_data)

    try:
        saved_query.save()
    except IntegrityError:
        # rare to get here--maybe simultaneous saves...
        user_msg = EventDataSavedQueryForm.get_duplicate_record_error_msg()
        return JsonResponse(get_json_error(user_msg))

    ok_info = get_json_success('Query saved!', data=saved_query.as_dict())

    return JsonResponse(ok_info)


@csrf_exempt
def api_get_event_data_queries(request):
    """Return a list of queries for the current user"""
    if not request.user.is_authenticated:
        user_msg = 'You must be logged in.'
        return JsonResponse(get_json_error(user_msg),
                            status=403)

    query_info = EventDataSavedQuery.get_query_list_for_user(request.user)
    if not query_info.success:
        return JsonResponse(get_json_error(query_info.err_msg))

    user_msg = dict(success=True,
                    message='list retrieved',
                    data=query_info.result_obj)

    if 'pretty' in request.GET:
        fmt_info = format_pretty_from_dict(user_msg)
        if not fmt_info.success:
            return JsonResponse(get_json_error(fmt_info.err_msg))

        return HttpResponse('<pre>%s</pre>' % fmt_info.result_obj)

    return JsonResponse(user_msg)


@csrf_exempt
def api_delete_event_data_query(request, query_id=None):
    """Delete a EventDataSavedQuery.
    Checks that the logged in user owns the query"""
    if not request.user.is_authenticated:
        user_msg = 'You must be logged in.'
        return JsonResponse(get_json_error(user_msg),
                            status=403)

    if not query_id:
        # shouldn't happen, just used to show plain url ...
        user_msg = 'You must specify a query_id in the url.'
        return JsonResponse(get_json_error(user_msg))

    query_info = EventJobUtil.get_by_id_and_user(query_id, request.user)

    if not query_info.success:
        return JsonResponse(get_json_error(query_info.err_msg))

    saved_query = query_info.result_obj
    try:
        saved_query.delete()
    except IntegrityError as ex_obj:
        user_obj = 'Failed to delete query. Error: %s' % ex_obj
        return JsonResponse(get_json_error(user_obj))

    return JsonResponse(get_json_success('Query deleted'))


@csrf_exempt
def api_retrieve_event_data_query(request, query_id=None):
    """Retrieve a specific EventDataSavedQuery"""
    if not request.user.is_authenticated:
        user_msg = 'You must be logged in.'
        return JsonResponse(get_json_error(user_msg),
                            status=403)

    if not query_id:
        # shouldn't happen, just used to show plain url ...
        user_msg = 'You must specify a query_id in the url.'
        return JsonResponse(get_json_error(user_msg))

    query_info = EventJobUtil.get_by_id_and_user(query_id, request.user)

    if not query_info.success:
        return JsonResponse(get_json_error(query_info.err_msg))

    user_info = get_json_success('Query found!',
                                 data=query_info.result_obj.as_dict())

    if 'pretty' in request.GET:
        fmt_info = format_pretty_from_dict(user_info)
        if not fmt_info.success:
            return JsonResponse(get_json_error(fmt_info.err_msg))

        return HttpResponse('<pre>%s</pre>' % fmt_info.result_obj)

    return JsonResponse(user_info)


@csrf_exempt
def api_search_event_data_queries(request):
    """Search about models data ( query data )
    sample input : {
    "name":"query1",
    "description":"query desc",
    "username":"tworavens"
    }
    """
    if not request.user.is_authenticated:
        user_msg = 'You must be logged in.'
        return JsonResponse(get_json_error(user_msg),
                            status=403)

    json_info = get_request_body_as_json(request)
    if not json_info.success:
        return JsonResponse(get_json_error(json_info.err_msg))

    # check if json is empty
    #
    json_data = json_info.result_obj

    search_results = EventJobUtil.search_objects(request.user, json_data)
    if not search_results.success:
        return JsonResponse(get_json_error(search_results.err_msg))

    user_info = get_json_success('results found!',
                                 data=search_results.result_obj)
    if 'pretty' in request.GET:
        fmt_info = format_pretty_from_dict(user_info)
        if not fmt_info.success:
            return JsonResponse(get_json_error(fmt_info.err_msg))

        return HttpResponse('<pre>%s</pre>' % fmt_info.result_obj)

    return JsonResponse(user_info)


@csrf_exempt
def api_upload_to_dataverse(request, query_id):
    """ get query id to upload to dataverse"""
    return JsonResponse(get_json_error('temporarily disabled'))
    """
    success, res_obj = EventJobUtil.get_query_from_object(query_id)
    if success:
        user_msg = dict(data=res_obj)
        return JsonResponse(user_msg)
    else:
        user_msg = dict(error=get_json_error(res_obj))
        return JsonResponse(user_msg)
    """


@csrf_exempt
def api_publish_dataset(request, dataset_id):
    """ Get the dataset Id from the response"""
    success, res = EventJobUtil.publish_dataset(dataset_id)
    if not success:
        usr_msg = dict(success=False,
                       message=get_json_error(res))
        return JsonResponse(usr_msg)

    else:
        usr_msg = dict(success=True,
                       message='published to dataverse',
                       data=res)

        return JsonResponse(usr_msg)


@csrf_exempt
def api_get_archive_list(request):
    """ get list"""
    success, jobs = EventJobUtil.get_all_archive_query_objects()
    # print(jobs)
    if not success:
        usr_msg = dict(success=False,
                       message=get_json_error(jobs))
        return JsonResponse(usr_msg)

    else:
        job_list = []
        for job in jobs:
            job_list.append(job.as_dict())

        usr_msg = dict(success=True,
                       message='archive list retrieved',
                       data=job_list)

        return JsonResponse(usr_msg)


@csrf_exempt
def api_get_archive_query_object(request, datafile_id):
    """ get object by id"""
    success, jobs = EventJobUtil.get_archive_query_object(datafile_id)

    if not success:
        usr_msg = dict(success=False,
                       message=get_json_error(jobs))
        return JsonResponse(usr_msg)

    else:
        usr_msg = dict(success=True,
                       message='object retrieved',
                       data=jobs.as_dict())

        return JsonResponse(usr_msg)


@csrf_exempt
def api_get_files_list(request, version_id):
    """ get dataverse files list"""

    success, jobs = EventJobUtil.get_dataverse_files(version_id)

    if not success:
        usr_msg = dict(success=False,
                       message=get_json_error(jobs))
        return JsonResponse(usr_msg)

    else:
        usr_msg = dict(success=True,
                       message='dataverse files object retrieved',
                       data=jobs)

        return JsonResponse(usr_msg)


@csrf_exempt
def api_get_archive_list(request):
    """ get list"""
    success, jobs = EventJobUtil.get_all_archive_query_objects()
    # print(jobs)
    if not success:
        usr_msg = dict(success=False,
                       message=get_json_error(jobs))
        return JsonResponse(usr_msg)

    else:
        job_list = []
        for job in jobs:
            job_list.append(job.as_dict())

        usr_msg = dict(success=True,
                       message='archive list retrieved',
                       data=job_list)

        return JsonResponse(usr_msg)


@csrf_exempt
def api_get_archive_query_object(request, datafile_id):
    """ get object by id"""
    success, jobs = EventJobUtil.get_archive_query_object(datafile_id)

    if not success:
        usr_msg = dict(success=False,
                       message=get_json_error(jobs))
        return JsonResponse(usr_msg)

    else:
        usr_msg = dict(success=True,
                       message='object retrieved',
                       data=jobs.as_dict())

        return JsonResponse(usr_msg)


@csrf_exempt
def api_get_files_list(request, version_id):
    """ get dataverse files list"""

    success, jobs = EventJobUtil.get_dataverse_files(version_id)

    if not success:
        usr_msg = dict(success=False,
                       message=get_json_error(jobs))
        return JsonResponse(usr_msg)

    else:
        usr_msg = dict(success=True,
                       message='dataverse files object retrieved',
                       data=jobs)

        return JsonResponse(usr_msg)


@csrf_exempt
def create_evtdata_file(request):
    """Similar to api_get_eventdata, except that the Mongo result is
    written to a faile"""
    LOGGER.info('--- create_evtdata_file: write query results to file ---')
    success, json_req_obj = get_request_body_as_json(request)

    if not success:
        return JsonResponse(get_json_error(json_req_obj))

    return JsonResponse(get_json_error('TESTING! %s' % json.dumps(json_req_obj)))

    # check if data is valid
    form = EventDataGetDataForm(json_req_obj)
    if not form.is_valid():
        return JsonResponse({"success": False, "message": "invalid input", "errors": form.errors})

    success, addquery_obj_err = EventJobUtil.get_data(
        settings.EVENTDATA_DB_NAME,
        json_req_obj['collection_name'],
        json_req_obj['method'],
        json.loads(json_req_obj['query']),
        json_req_obj.get('distinct', None),
        json_req_obj.get('host', None))


    if success:
        return JsonResponse(get_json_success(\
                                 'it worked',
                                 data=json_comply(list(addquery_obj_err))))

    return JsonResponse(get_json_error(addquery_obj_err))


@csrf_exempt
def api_get_eventdata(request):
    """ general api to get event data"""
    LOGGER.info('--- api_get_eventdata: Retrieve data from MongoDB ---')
    msgt('--- api_get_eventdata: Retrieve data from MongoDB ---')

    success, json_req_obj = get_request_body_as_json(request)

    if not success:
        return JsonResponse(get_json_error(json_req_obj))

    # check if data is valid
    form = EventDataGetDataForm(json_req_obj)
    if not form.is_valid():
        return JsonResponse({"success": False, "message": "invalid input", "errors": form.errors})

    success, addquery_obj_err = EventJobUtil.get_data(
        settings.EVENTDATA_DB_NAME,
        json_req_obj['collection_name'],
        json_req_obj['method'],
        json.loads(json_req_obj['query']),
        json_req_obj.get('distinct', None),
        json_req_obj.get('host', None))


    if success:
        return JsonResponse(get_json_success(\
                                 'it worked',
                                 data=json_comply(list(addquery_obj_err))))

    return JsonResponse(get_json_error(addquery_obj_err))


@csrf_exempt
def api_get_metadata(request):
    """ get metadata (configs/formats/alignments)"""

    success, json_req_obj = get_request_body_as_json(request)

    if not success:
        return JsonResponse({"success": False, "error": get_json_error(json_req_obj)})

    # check if data is valid
    form = EventDataGetMetadataForm(json_req_obj)
    if not form.is_valid():
        return JsonResponse({"success": False, "message": "invalid input", "errors": form.errors})

    return JsonResponse({name: EventJobUtil.get_metadata(name, json_req_obj[name])
                         for name in ['collections', 'formats', 'alignments'] if name in json_req_obj})


@csrf_exempt
def api_get_data(request):
    """Retrieve data from MongoDB
    Example input:
      {
        "datafile": "/ravens_volume/test_data/196_autoMpg/TRAIN/dataset_TRAIN/tables/learningData.csv",
        "collection_name": "196_ag_dataset_TRAIN",
        "method": "aggregate",
        "query": "[{\"$count\":\"total\"}]"
      }

    """
    LOGGER.info('--- api_get_data: Retrieve data from MongoDB ---')
    user_workspace_info = get_latest_user_workspace(request)
    if not user_workspace_info.success:
        return JsonResponse(get_json_error(user_workspace_info.err_msg))
    user_workspace = user_workspace_info.result_obj

    success, json_req_obj = get_request_body_as_json(request)

    #import json; print('json_req_obj', json.dumps(json_req_obj, indent=4))
    if not success:
        return JsonResponse({"success": False, "error": get_json_error(json_req_obj)})

    # check if data is valid
    #
    try:
        form = EventDataGetManipulationForm(json_req_obj)
        if not form.is_valid():
            err_info = get_json_error("invalid_input",
                                      errors=form.errors.as_json())
            return JsonResponse(err_info)
    except json.decoder.JSONDecodeError as err_obj:
        return JsonResponse(get_json_error('JSONDecodeError: %s' % (err_obj)))

    # ensure the dataset is present
    #
    LOGGER.info('--- api_get_data: ensure the dataset is present ---')
    #
    EventJobUtil.import_dataset(
        settings.TWORAVENS_MONGO_DB_NAME,
        json_req_obj['collection_name'],
        data_path=json_req_obj.get('datafile', None),
        reload=json_req_obj.get('reload', None))

    # apply the manipulations
    #
    LOGGER.info('--- api_get_data: apply any manipulations ---')
    #
    success, results_obj_err = EventJobUtil.get_data(
        settings.TWORAVENS_MONGO_DB_NAME,
        settings.MONGO_COLLECTION_PREFIX + json_req_obj['collection_name'],
        json_req_obj['method'],
        json.loads(json_req_obj['query']),
        distinct=json_req_obj.get('distinct', None))

    if not success:
        return JsonResponse(get_json_error(results_obj_err))

    # export single data file
    if json_req_obj.get('export') == 'csv':
        success, results_obj_err = EventJobUtil.export_csv(\
            user_workspace,
            settings.MONGO_COLLECTION_PREFIX + json_req_obj['collection_name'],
            results_obj_err)

    # export single data file in problem format
    elif json_req_obj.get('export') == 'dataset':
        success, results_obj_err = EventJobUtil.export_dataset(\
            user_workspace,
            results_obj_err,
            json.loads(json_req_obj['metadata']))

    # since we aren't exporting to files, exhaust the mongo cursor
    else:
        results_obj_err = list(results_obj_err)

    if not success:
        return JsonResponse(get_json_error(results_obj_err))

    LOGGER.info('--- api_get_data: returning data... ---')
    return JsonResponse(\
                get_json_success('it worked',
                                 data=json_comply(results_obj_err)))
