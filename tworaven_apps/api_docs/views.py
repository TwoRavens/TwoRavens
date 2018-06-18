import requests
from django.urls import reverse

from django.shortcuts import render
from django.conf import settings
from django.http import JsonResponse, HttpResponse, Http404
from django.contrib.auth.decorators import login_required

from tworaven_apps.api_docs.forms import ClientTestForm
from tworaven_apps.ta2_interfaces.static_vals import KEY_GRPC_JSON
from tworaven_apps.ta2_interfaces.grpc_util import TA3TA2Util

@login_required
def view_test_form(request):
    """View test form"""
    info_dict = dict(KEY_GRPC_JSON=KEY_GRPC_JSON,
                     TA2_STATIC_TEST_MODE=settings.TA2_STATIC_TEST_MODE,
                     TA2_TEST_SERVER_URL=settings.TA2_TEST_SERVER_URL,
                     SETTINGS_MODULE=settings.SETTINGS_MODULE,
                     TA3TA2_API_VERSION=TA3TA2Util.get_api_version())

    if request.POST:
        client_form = ClientTestForm(request.POST)
        if client_form.is_valid():
            content = client_form.cleaned_data['content']
            la_url = '%s://%s%s' % \
                    (settings.SERVER_SCHEME,
                     request.get_host(),
                     reverse('view_startsession', args=()))
            resp_text = make_request(la_url, content)
            return HttpResponse(resp_text)
        else:
            info_dict['form_errs'] = client_form.errors
            client_form = ClientTestForm()
    else:
        client_form = ClientTestForm()

    info_dict['cform'] = client_form

    return render(request,
                  'grpc/ta3ta2_api_form.html',
                  info_dict)


def make_request(la_url, content):
    """Make the request, mimicking the UI calling the web server"""
    payload = {KEY_GRPC_JSON : content}

    print('payload', payload)
    resp = requests.post(la_url, data=payload)

    if resp.text:
        print(resp.text[:50] + '...')
    print(resp.status_code)

    return resp.text
