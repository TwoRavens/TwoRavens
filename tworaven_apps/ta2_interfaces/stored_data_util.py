"""Utility methods for updating StoredRequest and StoredResponse objects"""
from tworaven_apps.utils.basic_response import (ok_resp, err_resp)
from tworaven_apps.ta2_interfaces.models import \
    (StoredRequest, StoredResponse,
     STATUS_IN_PROGRESS, STATUS_ERROR, STATUS_COMPLETE)


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
