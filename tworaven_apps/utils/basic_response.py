"""Convenience methods for returning namedtuple objects from functions

Error:
- Old "Error" tuple:
    `return (False, 'some error message')`
- New "Error" tuple
    `return err_resp('some error message')`

Success:
- Old "Success" tuple:
    `return (True, some_obj)`
- New "Success" tuple
    `return ok_resp(some_obj)`


"""
from collections import namedtuple


SuccessResponse = namedtuple('SuccessResponse', 'success result_obj')
ErrorResponse = namedtuple('ErrorResponse', 'success err_msg')
ErrorResponseWithData = namedtuple('ErrorResponseWithData', 'success err_msg err_data')

def ok_resp(result_obj):
    """Return a SuccessResponse with success=True and result_obj"""
    return SuccessResponse(True, result_obj)

def err_resp(err_msg):
    """Return a ErrorResponse with success=False and message"""
    return ErrorResponse(False, err_msg)

def err_resp_with_data(err_msg, err_data):
    """Return a ErrorResponse with success=False, a message, and data"""
    return ErrorResponseWithData(False, err_msg, err_data)
