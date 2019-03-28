"""
Utility for retrieving gRPC request/response histories for UI display
"""
from django.db.models.query import QuerySet

from tworaven_apps.utils.msg_helper import msgt
from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.utils.json_helper import json_loads
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)
from tworaven_apps.ta2_interfaces.models import StoredRequest, StoredResponse
from tworaven_apps.ta2_interfaces.static_vals import \
    (SEARCH_SOLUTIONS,
     GET_SEARCH_SOLUTIONS_RESULTS,
     SOLUTION_EXPORT)

# Ideally the sort order is:
# - SearchSolutions
# - GetSearchSolutionsResults
# (... everything else: sorted by pipeline_id ...)
# - SolutionExport

class SearchHistoryUtil(BasicErrCheck):
    """Retrieve history based on a search_id"""

    def __init__(self, search_id):
        """Init with a search_id"""
        self.search_id = search_id

        self.request_list = []

        self.retrieve_history()


    def get_stored_request(self, **params):
        """Get the StoredRequest using params such as:
        - search_id
        - request_type
        - hash_id
        - etc"""
        return StoredRequest.objects.filter(**params).first()

    def add_requests(self, req_list):
        """Add requests as JSON"""
        if self.has_error():
            return

        if isinstance(req_list, QuerySet):
            # Convert QuerySet to a list
            req_list = list(req_list)

        if isinstance(req_list, list):
            self.add_err_msg(f'Expected {req_list} to be a list')
            return

        for req in req_list:
            self.request_list.append(req.as_dict(short_version=True))

    def get_request_list(self):
        """Return the class's request list"""
        return self.request_list

    def retrieve_history(self):
        """Start getting the history"""
        if self.has_error():
            return

        # -------------------------------------------
        # Initial requests: SEARCH_SOLUTIONS
        # -------------------------------------------
        init_requests = StoredRequest.objects.filter(\
                            search_id=self.search_id,
                            request_type__in=[SEARCH_SOLUTIONS,
                                              GET_SEARCH_SOLUTIONS_RESULTS]\
                            ).order_by('id')
        if init_requests.count() == 0:
            self.add_err_msg((f'Failed to find f{SEARCH_SOLUTIONS} for'
                              f' search_id f{self.search_id}'))
            return

        # store them in the list!
        #
        self.add_requests(init_requests)

        exclude_ids = [req_dict['id']
                       for req_dict in self.get_request_list()]

        # -------------------------------------------
        # The rest of the requests! (except the last one)
        # -------------------------------------------
        stored_reqs = StoredRequest.objects.filter(\
                        search_id=self.search_id\
                        ).exclude(id__in=exclude_ids\
                        ).order_by('-pipeline_id', 'id')

        if stored_reqs.count() == 0:
            return

        # store them in the list!
        #
        self.add_requests(stored_reqs)


        # -------------------------------------------
        # The last request
        # -------------------------------------------
        last_req = self.get_stored_request(search_id=self.search_id,
                                           request_type=SOLUTION_EXPORT)
        if last_req:
            self.add_requests([last_req])
