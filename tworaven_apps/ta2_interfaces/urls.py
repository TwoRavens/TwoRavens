"""URLs for the UI to initiate TA2 calls"""
from django.urls import path, re_path
from tworaven_apps.ta2_interfaces import (\
        views_additional,
        views_search_solutions,
        views_saved_requests,
        views_non_streaming_requests)

urlpatterns = (

    path(r'get-problem-schema',
         views_additional.view_get_problem_schema,
         name='get_problem_schema'),

    re_path((r'stored-request/(?P<hash_id>[\w]{40,200})$'),
            views_saved_requests.view_stored_request,
            name='view_stored_request'),

    re_path((r'stored-response/(?P<hash_id>[\w]{40,200})$'),
            views_saved_requests.view_stored_response,
            name='view_stored_response'),

    path(r'Hello',
         views_non_streaming_requests.view_hello,
         name='Hello'),

    path(r'SearchSolutions',
         views_non_streaming_requests.view_search_solutions,
         name='SearchSolutions'),

    path(r'GetSearchSolutionsResults',
         views_search_solutions.view_get_search_solutions,
         name='GetSearchSolutionsResults'),

    path(r'EndSearchSolutions',
         views_non_streaming_requests.view_end_search_solutions,
         name='EndSearchSolutions'),

    path(r'StopSearchSolutions',
         views_non_streaming_requests.view_stop_search_solutions,
         name='StopSearchSolutions'),

    path(r'DescribeSolution',
         views_non_streaming_requests.view_describe_solution,
         name='DescribeSolution'),

    path(r'ScoreSolution',
         views_non_streaming_requests.view_score_solution,
         name='ScoreSolution'),

    path(r'FitSolution',
         views_non_streaming_requests.view_fit_solution,
         name='FitSolution'),

    path(r'ProduceSolution',
         views_non_streaming_requests.view_produce_solution,
         name='ProduceSolution'),

    path(r'SolutionExport',
         views_non_streaming_requests.view_solution_export,
         name='SolutionExport'),
)
