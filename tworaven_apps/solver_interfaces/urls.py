"""URLs for the UI to initiate TA2 calls"""
from django.conf.urls import url
from tworaven_apps.solver_interfaces import solver_interfaces

urlpatterns = (
    url(r'^Solve$',
        solver_interfaces.view_send_factory('solve'),
        name='Solve'),

    url(r'^Search$',
        solver_interfaces.view_send_factory('search'),
        name='Search'),

    url(r'^Describe$',
        solver_interfaces.view_send_factory('describe'),
        name='Describe'),

    url(r'^Score$',
        solver_interfaces.view_send_factory('score'),
        name='Score'),

    url(r'^Produce$',
        solver_interfaces.view_send_factory('produce'),
        name='Produce'),

    url(r'^Download',
        solver_interfaces.view_send_factory('download'),
        name='Download'),

    url(r'^Receive$',
        solver_interfaces.view_receive,
        name='Receive'),
)
