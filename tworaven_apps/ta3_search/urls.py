"""URLs for the UI to initiate TA2 calls"""
from django.conf.urls import url
from tworaven_apps.ta3_search import views

urlpatterns = (

    #   - This endpoint is for the flask app to register as a listener
    #
    url(r'^register-listener$',
        views.view_register_listener,
        name='view_register_listener'),

    url(r'^end-search$',
        views.view_end_ta3_search,
        name='view_end_ta3_search'),
)
