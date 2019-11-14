"""Utility methods for updating StoredRequest and StoredResponse objects"""
import json
from tworaven_apps.utils.basic_response import (ok_resp, err_resp)
from tworaven_apps.ta2_interfaces.models import \
    (StoredRequest, StoredResponse,
     STATUS_IN_PROGRESS, STATUS_ERROR, STATUS_COMPLETE)
from tworaven_apps.ta2_interfaces import static_vals as ta2_static
from tworaven_apps.ta2_interfaces.req_search_solutions import \
        (end_search_solutions, stop_search_solutions)
from tworaven_apps.utils.json_helper import json_loads

class StoredRequestUtil(object):
    """Contains misc methods for updating StoredRequest objects"""

    @staticmethod
    def __init__(self):
        """pass"""


    @staticmethod
    def set_finished_ok_status(stored_request_id, user_message=None):
        """Retrieve the StoredRequest, set the status and message"""
        try:
            stored_request = StoredRequest.objects.get(pk=stored_request_id)
        except StoredRequest.DoesNotExist:
            return err_resp('Failed to find Stored Request')

        stored_request.status = STATUS_COMPLETE
        stored_request.is_finished = True
        if user_message:
            stored_request.user_message = user_message
        else:
            stored_request.user_message = "Call completed successfully."

        stored_request.save()

        return ok_resp(stored_request)


    @staticmethod
    def get_callback_url_via_id(stored_request_id):
        """For returning the callback url with only the id"""
        assert stored_request_id, 'A stored_request_id is required'

        try:
            stored_request = StoredRequest.objects.get(pk=stored_request_id)
        except StoredRequest.DoesNotExist:
            return err_resp('Failed to find Stored Request')

        return ok_resp(stored_request.get_callback_url())


    @staticmethod
    def set_error_status(stored_request_id, user_message=None, is_finished=True):
        """Retrieve the StoredRequest, set the status and message"""
        try:
            stored_request = StoredRequest.objects.get(pk=stored_request_id)
        except StoredRequest.DoesNotExist:
            return err_resp('Failed to find Stored Request')

        stored_request.status = STATUS_ERROR
        stored_request.is_finished = is_finished
        if user_message:
            stored_request.user_message = user_message

        stored_request.save()

        return ok_resp(None)


    @staticmethod
    def stop_search_requests(**kwargs):
        """Stop search requests where the search_id is saved in a StoredRequest
        By default, stop *all* searches available in StoredRequest objects.
            - retrieve all info for SearchSolutions and EndSearchSolutions
              requests in StoredRequest objects
                - NOTE: doesn't check timestamps here
            - For SearchSolutions requests w/o corresonding EndSearchSolutions,
                send out EndSearchSolutions Requests.

        Optional kwargs to subset the potential searches to stop:

        user = only check a specific user's searches to stop
        """
        filters = dict(request_type__in=[ta2_static.SEARCH_SOLUTIONS,
                                         ta2_static.END_SEARCH_SOLUTIONS])

        # kwargs related to filtering by users
        #
        user = kwargs.get('user')
        if user:
            filters['user'] = user

        req_info = StoredRequest.objects.filter(**filters\
                ).exclude(search_id__isnull=True\
                ).exclude(search_id__exact=''\
                ).values('search_id', 'request_type', 'user__id'\
                ).order_by('search_id', 'request_type')

        ended_searches = [x[ta2_static.SR_SEARCH_ID]
                          for x in req_info
                          if x[ta2_static.SR_REQUEST_TYPE] == ta2_static.END_SEARCH_SOLUTIONS]

        to_end = [x[ta2_static.SR_SEARCH_ID] for x in req_info
                  if x[ta2_static.SR_REQUEST_TYPE] == ta2_static.SEARCH_SOLUTIONS and \
                    x[ta2_static.SR_SEARCH_ID] not in ended_searches]

        print('searches to stop', to_end)

        # Issue EndSearchSolutions requests
        #
        for search_id in to_end:
            end_req = {ta2_static.KEY_SEARCH_ID: search_id}
            end_req_json_str = json.dumps(end_req)

            params = dict(user=user)

            stop_search_info = stop_search_solutions(end_req_json_str, **params)
            # Results are getting logged, so not doing much here
            if stop_search_info.success:
                pass
            else:
                # error message at `search_info.err_msg`
                pass

            end_search_info = end_search_solutions(end_req_json_str, **params)
            # Results are getting logged, so not doing much here
            if end_search_info.success:
                pass
            else:
                # error message at `search_info.err_msg`
                pass
