"""
Convenience methods related to MongoDB
"""
from dateutil import parser

def infer_type(value):
    """Used when loading data into a Mongo collection"""
    if value.lower() in ['', 'nan', 'null', 'na']:
        return None

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
