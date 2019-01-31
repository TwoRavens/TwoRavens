"""Utility functions for generating random values"""
import random
import string
from datetime import datetime as dt


def get_timestamp_string(no_breaks=False):
    """Return current time as YYYY-MM-DD_HH-MM-S"""
    tstr = dt.now().strftime('%Y-%m-%d_%H-%M-%S')
    if no_breaks:
        return tstr.replace('-', '')
    return tstr


def get_alphanumeric_uppercase(str_length):
    """Get random alpha numeric string, with uppercase letters"""

    params = dict(uppercase_only=True)
    return get_alphanumeric_string(str_length, **params)

def get_alphanumeric_lowercase(str_length):
    """Get random alpha numeric string, with lowercase letters"""

    params = dict(uppercase_only=False)
    return get_alphanumeric_string(str_length, **params)

def get_alphanumeric_mixedcase(str_length):
    """Get random alpha numeric string, with uppercase letters"""

    params = dict(mixed_case=True)
    return get_alphanumeric_string(str_length, **params)

def get_digits_string(str_length):
    """Get random string of numbers"""
    params = dict(digits_only=True)
    return get_alphanumeric_string(str_length, **params)

def get_alpha_string(str_length):
    """Get random string of alpha chars (no digits)"""
    params = dict(alpha_only=True)
    return get_alphanumeric_string(str_length, **params)


def get_alphanumeric_string(str_length, **kwargs):
    """Get random alpha numeric string, default is lowercase ascii chars

    Available kwargs (in order of precedence*):
        alpha_only = default is False
        uppercase_only = default is False
        mixed_case = default is False
        digits_only = default is False

    (* if multiple True values encountered)
    """
    assert str(str_length).isdigit(), 'str_length must be an integer'

    # convert str_length to int
    if not isinstance(str_length, int):
        str_length = int(str_length)

    assert str_length > 0, 'str_length must be greater than 0 (zero)'
    assert str_length < 5000, 'str_length must be <= 5000'

    if kwargs.get('uppercase_only') is True:
        # uppercase + digits
        choice_list = string.ascii_uppercase + string.digits

    elif kwargs.get('alpha_only') is True:
        # alpha lowercase
        choice_list = string.ascii_lowercase

    elif kwargs.get('mixed_case') is True:
        # uppercase + lowercase + digits
        choice_list = string.ascii_lowercase + \
                      string.ascii_uppercase + \
                      string.digits

    elif kwargs.get('digits_only') is True:
        # digits only
        choice_list = string.digits

    else:
        # default is lowercase
        choice_list = string.ascii_lowercase + string.digits

    return ''.join(random.choice(choice_list)
                   for _ in range(str_length))
