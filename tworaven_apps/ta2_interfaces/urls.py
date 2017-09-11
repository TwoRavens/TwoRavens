from django.conf.urls import url
from tworaven_apps.ta2_interfaces import views

urlpatterns = (


    url(r'^startsession/?$',
        views.view_start_session,
        name='view_start_session'),

    url(r'^',
        views.view_test_call,
        name='view_test_call'),

)
