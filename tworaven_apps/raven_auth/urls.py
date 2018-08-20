from django.conf.urls import url
from django.contrib import admin
from django.urls import reverse
from django.contrib.auth import views as auth_views
from tworaven_apps.raven_auth import views, view_login #, get_extra_context

urlpatterns = [
    #url(r'^login/$', auth_views.login, name='login'),
    url(r'^signup/$', views.signup, name='signup'),

    #url(r'^login/$', view_login.login, {'template_name': 'registration/login.html'}, name='login'),

    #url(r'^login/$', view_login.login, {'template_name': 'registration/login.html'}, name='signin'),

    url(r'^login/$',
        view_login.LoginViewExtraContext.as_view(),
        #view_login.login,
        #auth_views.login,
        {'template_name': 'registration/login.html'},
        name='login'),

    url(r'^login/$',
        view_login.LoginViewExtraContext.as_view(),
        {'template_name': 'registration/login.html'},
        name='signin'),

    url(r'^logout/$',
        auth_views.LogoutView.as_view(\
            **dict(next_page='/auth/login?just_logged_out')),
        name='logout'),

    url(r'^test-state/$', views.test_state, name='test_state'),

    url(r'^password_reset/$',
        auth_views.PasswordResetView.as_view(),
        name='password_reset'),

    url(r'^password_reset/done/$',
        auth_views.PasswordResetDoneView.as_view(),
        name='password_reset_done'),

    url(r'^reset/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,20})/$',
        auth_views.PasswordResetConfirmView.as_view(),
        name='password_reset_confirm'),

    url(r'^reset/done/$',
        auth_views.PasswordResetCompleteView.as_view(),
        name='password_reset_complete'),


]
