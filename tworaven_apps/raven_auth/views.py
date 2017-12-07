from django.http import HttpResponseRedirect
from django.urls import reverse

from django.contrib.auth import login, authenticate
from django.contrib.auth.forms import UserCreationForm
from django.shortcuts import render, redirect

from tworaven_apps.raven_auth.forms import SignUpForm
from tworaven_apps.configurations.models import AppConfiguration

from tworaven_apps.utils.view_helper import get_common_view_info,\
    get_session_key

KEY_ADD_CNT = 'ADD_CNT'

def test_state(request):
    """test form"""
    session_key = get_session_key(request)

    if KEY_ADD_CNT in request.session:
        add_cnt = request.session[KEY_ADD_CNT]
    else:
        add_cnt = 0
        request.session[KEY_ADD_CNT] = add_cnt

    if 'add1' in request.GET:
        add_cnt += 1
        request.session[KEY_ADD_CNT] = add_cnt
        return HttpResponseRedirect(reverse('test_state'))


    info = dict(title='test page',
                session_key=session_key,
                add_cnt=add_cnt)

    return render(request, 'test_state.html', info)


def signup(request):
    """Signup form"""
    if request.method == 'POST':
        form = SignUpForm(request.POST)
        if form.is_valid():
            form.save()
            username = form.cleaned_data.get('username')
            raw_password = form.cleaned_data.get('password1')
            user = authenticate(username=username, password=raw_password)
            login(request, user)
            return redirect('home')
    else:
        form = SignUpForm()

    info = get_common_view_info(request)
    info['form'] = form

    return render(request, 'registration/signup.html', info)


def get_extra_context():
    """Extra context used by url defn"""

    app_config = AppConfiguration.get_config()
    print('app_config: %s' % app_config)
    if app_config is None:
        return dict(is_d3m_domain=False)

    print('app_config.is_d3m_domain(): %s' % app_config.is_d3m_domain)
    if app_config.is_d3m_domain():
        return dict(is_d3m_domain=True)

    return dict(is_d3m_domain=False)
