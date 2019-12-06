"""URLs for the UI to initiate TA2 calls"""
from django.conf.urls import url
from tworaven_apps.solver_interfaces import views

urlpatterns = (
    url(r'^Solve$',
        views.view_solve,
        name='Solve'),

    url(r'^Search$',
        views.view_search,
        name='Search'),

    url(r'^Describe$',
        views.view_describe,
        name='Describe'),

    url(r'^Score$',
        views.view_score,
        name='Score'),

    url(r'^Produce$',
        views.view_produce,
        name='Produce'),

    url(r'^Download',
        views.view_download,
        name='Download'),
)
