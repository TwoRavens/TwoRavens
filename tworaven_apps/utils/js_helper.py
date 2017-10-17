"""Convert a python boolean to a javascript boolean"""

def get_js_boolean(bool_val):
    """Convenience method for converting
    (python boolean value) -> (javascript boolean string)"""
    if bool_val is True:
        return 'true'
    else:
        return 'false'
