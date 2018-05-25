"""URLs for the UI to initiate TA2 calls"""
from django.urls import path
from tworaven_apps.ta2_interfaces import (\
        views_additional,
        views_ta2_req1)

urlpatterns = (

    path(r'^get-problem-schema$',
         views_additional.view_get_problem_schema,
         name='get_problem_schema'),

    path(r'^hello$',
         views_ta2_req1.view_hello,
         name='Hello'),

    )
