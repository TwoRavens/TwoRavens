"""URLs for the UI to initiate TA2 calls"""
from django.conf.urls import url
from tworaven_apps.ta3_search import views

urlpatterns = (

    # We're listing each call here for now but may change in the future
    #
    url(r'^register-listener/?$',
        views.view_register_listener,
        name='view_register_listener'),

)
