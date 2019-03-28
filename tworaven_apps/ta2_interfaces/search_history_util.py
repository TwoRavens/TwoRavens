"""
Utility for retrieving gRPC request/response histories for UI display

Example usage:

search_history_util = SearchHistoryUtil(search_id=2)

if search_history_util.has_error():
    print(f'Error found: f{search_history.get_error()}')
else:
    json_history = self.get_finalized_history()

"""
from collections import defaultdict

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
    """Retrieve history based on a search_id

    - Retrieve StorageRequest objects
    - pull ids for the related StorageResponse objects
    """

    def __init__(self, search_id):
        """Init with a search_id"""
        self.search_id = search_id

        self.request_list = []

        self.retrieve_history()

    def get_finalized_history(self):
        """Retrieve the final history"""
        assert not self.has_error(),\
            "Use self.has_error is False before using this method"

        return self.get_request_list()


    def retrieve_history(self):
        """Run processs to retrieve the gRPC request/response history"""
        if self.has_error():
            return

        if not self.retrieve_requests():
            return

        self.retrieve_responses()


    def retrieve_responses(self):
        """Retrieve related StoredResponse objects"""
        if self.has_error():
            return

        # --------------------------------------
        # Get StoredRequest ids
        # --------------------------------------
        request_ids = self.get_request_ids()
        if not request_ids:
            self.add_err_msg('No StoredRequest objects found.')
            return

        # --------------------------------------
        # Get related Stored*Response* ids
        # --------------------------------------
        resp_list = StoredResponse.objects.filter(\
                        stored_request__id__in=request_ids\
                        ).order_by('id')

        # --------------------------------------
        # {request id: [response JSON, response JSON]}
        # --------------------------------------
        response_dict = defaultdict(list)
        for one_resp in resp_list:
            response_dict[one_resp.stored_request.id].append(\
                                one_resp.as_dict(short_version=True))

        # --------------------------------------
        # Add responses to the request dicts
        # --------------------------------------
        fmt_list = []
        for one_req in self.get_request_list():
            # Take a StoredRequest dict and add a "response_list" key
            #
            one_req['response_list'] = response_dict.get(one_req['id'], [])
            fmt_list.append(one_req)

        self.request_list = fmt_list

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
            return False

        if isinstance(req_list, QuerySet):
            # Convert QuerySet to a list
            req_list = list(req_list)

        if not isinstance(req_list, list):
            self.add_err_msg((f'Expected {req_list} to be a list. Found: '
                              f' {type(req_list)}'))
            return False

        for req in req_list:
            self.request_list.append(req.as_dict(short_version=True))

        return True


    def get_request_list(self):
        """Return the class's request list"""
        return self.request_list

    def get_request_ids(self):
        """Return a list of request ids based
        on the current self.request_list"""
        if self.has_error():
            return None

        req_list = self.get_request_list()
        if not req_list:
            return None

        return [req_dict['id'] for req_dict in req_list]


    @staticmethod
    def get_first_search_soutions_call():
        """For an initial page, look for a StoredRequest kickoff call"""
        return StoredRequest.objects.filter(\
                            request_type=SEARCH_SOLUTIONS\
                            ).order_by('id').first()


    def retrieve_requests(self):
        """Start getting the history"""
        if self.has_error():
            return False

        # -------------------------------------------
        # Initial requests: SEARCH_SOLUTIONS
        # -------------------------------------------
        init_requests = StoredRequest.objects.filter(\
                            search_id=self.search_id,
                            request_type__in=[SEARCH_SOLUTIONS,
                                              GET_SEARCH_SOLUTIONS_RESULTS]\
                            ).order_by('id')
        if init_requests.count() == 0:
            self.add_err_msg((f'Failed to find {SEARCH_SOLUTIONS} request'
                              f' for search_id "{self.search_id}"'))
            return False

        # store them in the list!
        #
        if not self.add_requests(init_requests):
            return False

        # -------------------------------------------
        # The rest of the requests! (except SOLUTION_EXPORT)
        # - exclude init_requests  (initial calls)
        # - exclude SolutionExport (last call, if it exists)
        # -------------------------------------------
        stored_reqs = StoredRequest.objects.filter(\
                        search_id=self.search_id\
                        ).exclude(id__in=self.get_request_ids()\
                        ).exclude(request_type=SOLUTION_EXPORT\
                        ).order_by('-pipeline_id', 'id')

        if stored_reqs.count() > 0:
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

        return True
