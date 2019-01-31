"""
Get value for nested keys in python dict
"""
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)

def get_dict_value(data_dict, *keys):
    '''
    Check if *keys (nested) exists in `data_dict` (dict).

    data = {
        "spam": {
            "egg": {
                "bacon": "Well.."}
            }
        }

    e.g. keys_exists(data, "spam", "egg", "bacon")
    ref: https://stackoverflow.com/questions/43491287/elegant-way-to-check-if-a-nested-key-exists-in-a-python-dict
    '''
    if not isinstance(data_dict, dict):
        return err_resp('keys_exists() expects dict as first argument.')

    if not keys:
        return err_resp(('get_dict_value(data_dict, *keys) expects at least two'
                         ' arguments, one given.'))

    dict_val = data_dict
    for key in keys:
        print('key', key, 'dict_val', type(dict_val))
        try:
            dict_val = dict_val[key]
        except KeyError:
            return err_resp('Key not found: %s' % ', '.join(keys))

    return ok_resp(dict_val)
