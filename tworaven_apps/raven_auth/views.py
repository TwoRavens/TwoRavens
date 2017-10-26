from django.contrib.auth import login, authenticate
from django.contrib.auth.forms import UserCreationForm
from django.shortcuts import render, redirect
from tworaven_apps.raven_auth.forms import SignUpForm
from tworaven_apps.utils.view_helper import get_common_view_info

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
