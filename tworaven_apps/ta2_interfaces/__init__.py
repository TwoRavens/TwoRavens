"""
Note for TA2 search solutions

- /SearchDescribeFitScoreSolutions
    - views_non_streaming_requests.view_search_describe_fit_score_solution
        - search_info = SearchSolutionsHelper.make_search_solutions_call
    - ta2_search_solutions_helper
        - make_search_solutions_call (get search_id)
        - kick_off_solution_results
        - run_describe_solution - DescribeSolution

------------------------------------------------
some dev code for StoredRequest/StoredResponse
------------------------------------------------

# --------------------------
# StoredRequest
# --------------------------
stored_request = StoredRequest(\
                user=user_obj,
                #search_id=self.search_id,
                workspace='(not specified)',
                request_type='SearchSolutions',
                is_finished=False,
                request=all_params[KEY_SEARCH_SOLUTION_PARAMS])
stored_request.save()

# --------------------------
# StoredResponse error
# --------------------------
StoredResponse.add_err_response(stored_request,
                                search_info.err_msg)


# --------------------------
# StoredResponse success (example)
# --------------------------
StoredResponse.add_success_response(stored_request,
                                    search_info_data,
                                    pipeline_id=pipeline_id,
                                    search_id=search_id)
"""
