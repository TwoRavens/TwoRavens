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
        try:
            dict_val = dict_val[key]
        except KeyError:
            return err_resp('Key not found: %s' % ', '.join(keys))

    return ok_resp(dict_val)


def is_list_empty(in_list):
    """Check if a list is empty
    ref: https://stackoverflow.com/questions/1593564/python-how-to-check-if-a-nested-list-is-essentially-empty"""
    if isinstance(in_list, list): # Is a list
        in_list = [x for x in in_list \
                   if x != ''] # remove empty strings
        return all(map(is_list_empty, in_list))
    #
    return False

def clear_dict(query_dict):
    """Recursively clear any empty values from a dict
    Note: works on the dict "in place", doesn't return a dict
    e.g
    d = {'a': 1, 'b': None, 'c': {'a': {}}, 'd': ['dog'], 'e': [[]]}
    clear_dict(d)
    print(d)    # {'a': 1, 'd': ['dog']}
    """
    assert isinstance(query_dict, dict), \
        '"query_dict" must be a dict object'
    #
    keys_to_dicts = [key for key in query_dict.keys()
                     if isinstance(query_dict[key], dict)]
    for key in keys_to_dicts:
        clear_dict(query_dict.get(key))
    #
    keys_to_go = [key for key in query_dict.keys()
                  if not query_dict[key] or \
                     (isinstance(query_dict[key], list) and
                      is_list_empty(query_dict[key]))
                 ]
    for key in keys_to_go:
        del query_dict[key]



def column_uniquify(column_names):
    """Check for duplicate names in a list and fix them"""
    if not isinstance(column_names, list):
        return err_resp('"column_names" must be a list')
    #
    new_columns = []
    num_cols_renamed = 0
    for item in column_names:
        counter = 0
        newitem = item
        while newitem in new_columns:
            counter += 1
            newitem = f"{item}_{counter}"
            num_cols_renamed += 1
        new_columns.append(newitem)
    #
    return ok_resp(dict(new_columns=new_columns,
                        num_cols_renamed=num_cols_renamed))
