"""URLs for the UI to initiate TA2 calls"""
from django.conf.urls import url
from tworaven_apps.solver_interfaces import solver_interfaces

urlpatterns = (
    url(r'^Solve$',
        solver_interfaces.view_solve,
        name='Solve'),

    url(r'^Search$',
        solver_interfaces.view_search,
        name='Search'),

    url(r'^ReceiveSolution$',
        solver_interfaces.view_receive_solution,
        name='ReceiveSolution'),

    url(r'^Describe$',
        solver_interfaces.view_describe,
        name='Describe'),

    url(r'^Score$',
        solver_interfaces.view_score,
        name='Score'),

    url(r'^ReceiveScore$',
        solver_interfaces.view_receive_score,
        name='ReceiveScore'),

    url(r'^Produce$',
        solver_interfaces.view_produce,
        name='Produce'),

    url(r'^ReceiveProduce$',
        solver_interfaces.view_receive_produce,
        name='ReceiveProduce'),
)
