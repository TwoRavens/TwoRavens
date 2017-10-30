from django.conf.urls import url
from django.contrib import admin
from django.contrib.auth import views as auth_views
from tworaven_apps.raven_auth import views

urlpatterns = [
    #url(r'^login/$', auth_views.login, name='login'),
    url(r'^signup/$', views.signup, name='signup'),

    url(r'^login/$', auth_views.login, {'template_name': 'registration/login.html'}, name='login'),

    url(r'^logout/$', auth_views.logout, {'next_page': '/auth/login'}, name='logout'),

    url(r'^test-state/$', views.test_state, name='test_state'),

    url(r'^password_reset/$', auth_views.password_reset, name='password_reset'),

    url(r'^password_reset/done/$', auth_views.password_reset_done, name='password_reset_done'),

    url(r'^reset/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,20})/$',
        auth_views.password_reset_confirm, name='password_reset_confirm'),

    url(r'^reset/done/$', auth_views.password_reset_complete, name='password_reset_complete'),


]
