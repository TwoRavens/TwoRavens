"""
Convenience methods related to MongoDB
"""
from dateutil import parser


def quote_val(value):
    """Double quote a string value, if it's a string"""
    quote_char = '"'
    if isinstance(value, str):
        # Is it already quoted?
        if len(value) >= 2:
            if value[0] == quote_char and value[-1] == quote_char:
                # Yes, already quoted
                return value
        # Nope, quote it
        return quote_char + value + quote_char

    return value


def infer_type(value):
    """Used when loading data into a Mongo collection"""

    try:
        return int(value)
    except ValueError:
        pass

    try:
        return float(value)
    except ValueError:
        pass

    try:
        return parser.parse(value)
    except ValueError:
        pass

    return value
