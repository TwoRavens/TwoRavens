"""URLs for the UI to initiate TA2 calls"""
from django.urls import path
from tworaven_apps.ta2_interfaces import (\
        views_additional,
        views_ta2_req1)

urlpatterns = (

    path(r'get-problem-schema',
         views_additional.view_get_problem_schema,
         name='get_problem_schema'),

    path(r'Hello',
         views_ta2_req1.view_hello,
         name='Hello'),

    path(r'SearchSolutions',
         views_ta2_req1.view_search_solutions,
         name='SearchSolutions'),

    path(r'EndSearchSolutions',
         views_ta2_req1.view_end_search_solutions,
         name='EndSearchSolutions'),

    )
