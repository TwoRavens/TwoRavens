"""Views for the D3M configuration module"""
import json
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse, Http404
from tworaven_apps.configurations.models_d3m import D3MConfiguration


# Create your views here.
@csrf_exempt
def view_d3m_list(request):
    """List the D3m configurations in the db"""

    tinfo = dict(title='D3M configurations',
                 configs=D3MConfiguration.objects.all())

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
    d3m_config = D3MConfiguration.objects.filter(is_default=True).first()
    if not d3m_config:
        # nope, get the more recently modified config
        d3m_config = D3MConfiguration.objects.order_by('-modified').first()
        if not d3m_config:
            # there is no config!
            raise Http404('no configs available')

    if is_pretty is not False:   # return this as a formatted string?
        config_str = '<pre>%s<pre>' % \
                        (json.dumps(d3m_config.to_dict(),
                                    indent=4))
        return HttpResponse(config_str)

    # return as JSON!
    return JsonResponse(d3m_config.to_dict())
