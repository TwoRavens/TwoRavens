"""URLs for the UI to initiate TA2 calls"""
from django.urls import path, re_path
from tworaven_apps.ta2_interfaces import (\
        views_user_problem,
        views_additional,
        views_streaming_requests,
        views_saved_requests,
        views_non_streaming_requests,
        views_debug,)

urlpatterns = (

    path(r'store-problem-form',
         views_user_problem.view_save_problem_form,
         name='view_save_problem_form'),

    path(r'store-user-problem',
         views_user_problem.view_store_basic_problem,
         name='view_store_basic_problem'),


    path(r'get-problem-schema',
         views_additional.view_get_problem_schema,
         name='get_problem_schema'),

    path(r'retrieve-output-data',
         views_additional.view_retrieve_d3m_output_data,
         name='view_retrieve_d3m_output_data'),

    path(r'download-file',
         views_additional.view_download_file,
         name='view_download_file'),

    path(r'download-report-file',
         views_additional.view_download_report_file,
         name='view_download_report_file'),

    path(r'retrieve-output-confusion-data',
         views_additional.view_retrieve_d3m_confusion_data,
         name='view_retrieve_d3m_confusion_data'),

    path(r'retrieve-output-EFD-data',
         views_additional.view_retrieve_d3m_efd_data,
         name='view_retrieve_d3m_EFD_data'),

    path(r'retrieve-output-ICE-data',
         views_additional.view_retrieve_d3m_ice_data,
         name='view_retrieve_d3m_ICE_data'),

    path(r'get-train-test-split',
         views_additional.get_train_test_split,
         name='get-train-test-split'),

    path(r'get-ICE-datasets',
         views_additional.get_ice_partials_datasets,
         name='get-ICE-datasets'),

    re_path((r'stored-request/(?P<hash_id>[\w]{40,200})$'),
            views_saved_requests.view_stored_request,
            name='view_stored_request'),

    re_path((r'stored-response/(?P<hash_id>[\w]{40,200})$'),
            views_saved_requests.view_stored_response,
            name='view_stored_response'),

    re_path((r'view-grpc-search-history-json/(?P<search_id>[\d]{1,7})$'),
            views_saved_requests.view_grpc_search_history_json,
            name='view_grpc_search_history_json'),

    re_path((r'view-grpc-search-history-json$'),
            views_saved_requests.view_grpc_search_history_json_no_id,
            name='view_grpc_search_history_json_no_id'),

    #re_path((r'view-grpc-search-history-no-id$'),
    #        views_saved_requests.view_grpc_search_history_no_id,
    #        name='view_grpc_search_history_no_id'),
    re_path((r'view-grpc-stored-history/(?P<search_id>[\d]{1,7})$'),
            views_saved_requests.view_grpc_stored_history,
            name='view_grpc_stored_history'),

    re_path((r'view-grpc-stored-history$'),
            views_saved_requests.view_grpc_stored_history_no_id,
            name='view_grpc_stored_history_no_id'),

    path(r'clear-grpc-stored-history',
         views_saved_requests.view_clear_grpc_stored_history,
         name='view_clear_grpc_stored_history'),

    path(r'Hello',
         views_non_streaming_requests.view_hello,
         name='Hello'),

    path(r'ta2-hello-heartbeat',
         views_non_streaming_requests.view_hello_heartbeat,
         name='view_hello_heartbeat'),


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

    path(r'SolutionExport3',
         views_non_streaming_requests.view_solution_export3,
         name='SolutionExport3'),

    path(r'UpdateProblem',
         views_non_streaming_requests.view_update_problem,
         name='UpdateProblem'),

    path(r'ListPrimitives',
         views_non_streaming_requests.view_list_primitives,
         name='ListPrimitives'),

    path(r'ExportSolutions',
         views_debug.view_export_solutions,
         name='ExportSolutions'),
)
