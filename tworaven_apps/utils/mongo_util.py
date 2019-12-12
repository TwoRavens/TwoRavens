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


python_caster = {
    'boolean': bool,
    'string': str,
    'int32': int,
    'double': float,
    'date': parser.parse
}


def infer_type(value, value_type=None):
    """Used when loading data into a Mongo collection"""

    if value_type in python_caster:
        try:
            return python_caster[value_type](value)
        except Exception:
            return

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
    except Exception:
        pass

    if not len(value):
        return None

    return value


def encode_variable(name):
    return name\
        .replace("\\.", "escaped_dot_symbol")\
        .replace("\\", "\\\\")\
        .replace("\$", "\\u0024")\
        .replace(".", "\\u002e")\
        .replace("escaped_dot_symbol", ".")


def decode_variable(name):
    return name\
        .replace("\\u002e", ".")\
        .replace("\\u0024", "\$")\
        .replace("\\\\", "\\")
