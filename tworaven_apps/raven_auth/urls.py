from django.conf.urls import url
from django.contrib import admin
from django.contrib.auth import views as auth_views
from tworaven_apps.raven_auth import views

urlpatterns = [
    #url(r'^login/$', auth_views.login, name='login'),
    url(r'^signup/$', views.signup, name='signup'),

    url(r'^login/$', auth_views.login, {'template_name': 'registration/login.html'}, name='login'),

    url(r'^logout/$', auth_views.logout, {'next_page': '/auth/login'}, name='logout'),

]
