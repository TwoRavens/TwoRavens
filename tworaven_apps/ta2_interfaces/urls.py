"""URLs for the UI to initiate TA2 calls"""
from django.urls import path, re_path
from tworaven_apps.ta2_interfaces import (\
        views_user_problem,
        views_additional,
        views_streaming_requests,
        views_saved_requests,
        views_non_streaming_requests)

urlpatterns = (

    path(r'store-problem-form',
         views_user_problem.view_save_problem_form,
         name='view_save_problem_form'),

    path(r'store-user-problem',
         views_user_problem.view_store_basic_problem,
         name='view_store_basic_problem'),

    path(r'store-ta2ta3-data',
         views_user_problem.view_store_ta2ta3_data,
         name='view_store_ta2ta3_data'),

    path(r'get-problem-schema',
         views_additional.view_get_problem_schema,
         name='get_problem_schema'),

    path(r'debug-pipeline-steps',
         views_additional.view_show_pipeline_steps,
         name='view_show_pipeline_steps'),

    path(r'retrieve-output-data',
         views_additional.view_retrieve_d3m_output_data,
         name='view_retrieve_d3m_output_data'),

    re_path((r'stored-request/(?P<hash_id>[\w]{40,200})$'),
            views_saved_requests.view_stored_request,
            name='view_stored_request'),

    re_path((r'stored-response/(?P<hash_id>[\w]{40,200})$'),
            views_saved_requests.view_stored_response,
            name='view_stored_response'),

    path(r'Hello',
         views_non_streaming_requests.view_hello,
         name='Hello'),

    path(r'SearchDescribeFitScoreSolutions',
         views_non_streaming_requests.view_search_describe_fit_score_solutions,
         name='SearchDescribeFitScoreSolutions'),

    path(r'SearchSolutions',
         views_non_streaming_requests.view_search_solutions,
         name='SearchSolutions'),

    path(r'GetSearchSolutionsResults',
         views_streaming_requests.view_get_search_solutions,
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

    path(r'GetScoreSolutionResults',
         views_streaming_requests.view_score_solutions,
         name='GetScoreSolutionResults'),

    path(r'FitSolution',
         views_non_streaming_requests.view_fit_solution,
         name='FitSolution'),

    path(r'GetFitSolutionResults',
         views_streaming_requests.view_fit_solution_results,
         name='GetFitSolutionResults'),

    path(r'ProduceSolution',
         views_non_streaming_requests.view_produce_solution,
         name='ProduceSolution'),

    path(r'GetProduceSolutionResults',
         views_streaming_requests.view_get_produce_solution_results,
         name='GetProduceSolutionResults'),

    #path(r'SolutionExport',
    #     views_non_streaming_requests.view_solution_export,
    #     name='SolutionExport'),

    path(r'SolutionExport2',
         views_non_streaming_requests.view_solution_export2,
         name='SolutionExport2'),

    path(r'UpdateProblem',
         views_non_streaming_requests.view_update_problem,
         name='UpdateProblem'),

    path(r'ListPrimitives',
         views_non_streaming_requests.view_list_primitives,
         name='ListPrimitives'),

)
