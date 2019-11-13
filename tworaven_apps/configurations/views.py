"""Views for the D3M configuration module"""
import os
import json
import mimetypes
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
from django.http import FileResponse
from django.http import JsonResponse, HttpResponse, Http404
from tworaven_apps.configurations.models_d3m import D3MConfiguration,\
    KEY_DATASET_SCHEMA, KEY_PROBLEM_SCHEMA, D3M_FILE_ATTRIBUTES
from tworaven_apps.configurations.utils import \
    (get_latest_d3m_config,
     get_d3m_filepath,
     get_train_data_info)
from tworaven_apps.user_workspaces.utils import get_latest_user_workspace
from tworaven_apps.utils.json_helper import json_loads, json_dumps

from tworaven_apps.utils.view_helper import \
    (get_json_error,
     get_json_success)

# Create your views here.
@csrf_exempt
def view_d3m_list(request):
    """List the D3m configurations in the db"""

    configs = D3MConfiguration.objects.all().order_by('-is_default', 'name')

    tinfo = dict(title='D3M configurations',
                 configs=configs)

    return render(request,
                  'd3m_config_list.html',
                  tinfo)


@csrf_exempt
def view_d3m_details_page(request, d3m_config_id):
    """Show the D3m configuration on a web page"""

    return HttpResponse('view_d3m_details_page: %d (to do)' % d3m_config_id)

@csrf_exempt
def view_d3m_details_json(request, d3m_config_id):
    """Return the D3m configuration as JSON"""
    is_pretty = request.GET.get('pretty', False)

    # Is there a default config?
    d3m_config = D3MConfiguration.objects.filter(id=d3m_config_id).first()
    if not d3m_config:
        raise Http404('no config with id: %s' % d3m_config_id)

    if is_pretty is not False:   # return this as a formatted string?
        config_str = '<pre>%s<pre>' % \
                        (json.dumps(d3m_config.to_dict(),
                                    indent=4))
        return HttpResponse(config_str)

    # return as JSON!
    return JsonResponse(d3m_config.to_dict())


@csrf_exempt
def view_d3m_details_json_eval_latest(request):
    """For EVAL: Return the "latest" D3m configuration as JSON.
    "latest" may be most recently added or a "default"
    of some kind"""
    return view_d3m_details_json_latest(request,
                                        as_eval_dict=True)


@csrf_exempt
def view_d3m_details_json_latest(request, as_eval_dict=False):
    """Return the "latest" D3m configuration as JSON.
    "latest" may be most recently added or a "default"
    of some kind"""
    is_pretty = request.GET.get('pretty', False)

    # Is there a default config?
    d3m_config = get_latest_d3m_config()
    if not d3m_config:
        raise Http404('no configs available')

    if is_pretty is not False:   # return this as a formatted string?
        config_str = '<pre>%s<pre>' % \
                        (json.dumps(d3m_config.to_dict(as_eval_dict),
                                    indent=4))
        return HttpResponse(config_str)

    # return as JSON!
    return JsonResponse(d3m_config.to_dict(as_eval_dict))

@csrf_exempt
def view_get_problem_schema(request, d3m_config_id=None):
    """Return the problem_schema file"""
    return view_get_config_file(request, KEY_PROBLEM_SCHEMA, d3m_config_id)

@csrf_exempt
def view_get_dataset_schema(request, d3m_config_id=None):
    """Return the dataset_schema file"""
    return view_get_config_file(request, KEY_DATASET_SCHEMA, d3m_config_id)

    # return view_get_config_file(request, 'KEY_D', d3m_config_id)

@csrf_exempt
def view_get_config_file(request, config_key, d3m_config_id=None):
    """Get contents of a file specified in the config"""
    if not config_key in D3M_FILE_ATTRIBUTES:
        user_msg = (f'Config key "{config_key}" not found!'
                    f' (view_get_config_file)')
        return JsonResponse(get_json_error(user_msg))

    if d3m_config_id is None:
        d3m_config = get_latest_d3m_config()
    else:
        d3m_config = D3MConfiguration.objects.filter(id=d3m_config_id).first()

    if d3m_config is None:
        user_msg = 'Config not found!'
        return JsonResponse(get_json_error(user_msg))

    # Make sure the config has a value.
    # For example the D3MPROBLEMPATH may be blank
    #
    if not getattr(d3m_config, config_key):
        user_msg = f'Sorry! The config does not have a "{config_key}" value!'
        return JsonResponse(get_json_error(user_msg))

    filepath_info = get_d3m_filepath(d3m_config, config_key)
    if not filepath_info.success:
        user_msg = f'{filepath_info.err_msg} (view_get_config_file)'
        return JsonResponse(get_json_error(user_msg))

    # Relatively small files...
    # response = FileResponse(open(filepath_info.result_obj, 'rb'))
    # return response

    fcontent = open(filepath_info.result_obj, 'r').read()

    json_info = json_loads(fcontent)
    if not json_info.success:
        user_msg = f'{json_info.err_msg} (view_get_config_file)'
        return JsonResponse(get_json_error(user_msg))

    return JsonResponse(get_json_success(\
                            'Success!',
                            data=json_info.result_obj))


@csrf_exempt
def view_get_problem_data_info(request, d3m_config_id=None):
    """Get info on train data and target files, if they exist"""
    if d3m_config_id is None:
        d3m_config = get_latest_d3m_config()
    else:
        d3m_config = D3MConfiguration.objects.filter(id=d3m_config_id).first()

    if d3m_config is None:
        user_msg = 'Config not found! (view_get_problem_data_info)'
        return JsonResponse(get_json_error(user_msg))

    is_pretty = request.GET.get('pretty', False)

    train_data_info = get_train_data_info(d3m_config)

    if not train_data_info.success:
        resp_dict = get_json_error(train_data_info.err_msg)

    else:
        resp_dict = get_json_success('It worked',
                                     data=train_data_info.result_obj)

    if is_pretty is not False:   # return this as a formatted string?
        config_str = '<pre>%s<pre>' % \
                    (json.dumps(resp_dict,
                                indent=4))
        return HttpResponse(config_str)

    return JsonResponse(resp_dict)
