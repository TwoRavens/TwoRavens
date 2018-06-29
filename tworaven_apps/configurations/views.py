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
from tworaven_apps.configurations.utils import get_latest_d3m_config,\
    get_d3m_filepath, get_train_data_info

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
def view_d3m_details_json_latest(request):
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
                        (json.dumps(d3m_config.to_dict(),
                                    indent=4))
        return HttpResponse(config_str)

    # return as JSON!
    return JsonResponse(d3m_config.to_dict())

@csrf_exempt
def view_get_problem_schema(request, d3m_config_id=None):
    """Return the problem_schema file"""
    return view_get_config_file(request, KEY_PROBLEM_SCHEMA, d3m_config_id)

@csrf_exempt
def view_get_dataset_schema(request, d3m_config_id=None):
    """Return the dataset_schema file"""
    return view_get_config_file(request, KEY_DATASET_SCHEMA, d3m_config_id)

@csrf_exempt
def view_get_config_file(request, config_key, d3m_config_id=None):
    """Get contents of a file specified in the config"""
    if not config_key in D3M_FILE_ATTRIBUTES:
        raise Http404('config_key not found!')

    if d3m_config_id is None:
        d3m_config = get_latest_d3m_config()
    else:
        d3m_config = D3MConfiguration.objects.filter(id=d3m_config_id).first()

    if d3m_config is None:
        raise Http404('Config not found!')

    filepath, err_msg_or_None = get_d3m_filepath(d3m_config, config_key)
    if err_msg_or_None is not None:
        return JsonResponse(dict(success=False,
                                 message=err_msg_or_None))

    response = FileResponse(open(filepath, 'rb'))

    return response

@csrf_exempt
def view_get_problem_data_info(request, d3m_config_id=None):
    """Get info on train data and target files, if they exist"""
    if d3m_config_id is None:
        d3m_config = get_latest_d3m_config()
    else:
        d3m_config = D3MConfiguration.objects.filter(id=d3m_config_id).first()

    if d3m_config is None:
        raise Http404('Config not found!')

    is_pretty = request.GET.get('pretty', False)

    info_dict, err_msg = get_train_data_info(d3m_config)

    if err_msg:
        resp_dict = dict(success=False,
                         message=err_msg)

    else:
        resp_dict = dict(success=True,
                         data=info_dict)

    if is_pretty is not False:   # return this as a formatted string?
        config_str = '<pre>%s<pre>' % \
                    (json.dumps(resp_dict,
                                indent=4))
        return HttpResponse(config_str)

    return JsonResponse(resp_dict)
