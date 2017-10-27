from django.http import HttpResponseRedirect
from django.urls import reverse

from django.contrib.auth import login, authenticate
from django.contrib.auth.forms import UserCreationForm
from django.shortcuts import render, redirect

from tworaven_apps.raven_auth.forms import SignUpForm
from tworaven_apps.utils.view_helper import get_common_view_info

KEY_ADD_CNT = 'ADD_CNT'

def test_state(request):
    """test form"""
    django_session_key = request.session._get_or_create_session_key()

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
                session_key=django_session_key,
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
