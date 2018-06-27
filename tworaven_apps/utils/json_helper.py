"""Convenience methods for JSON strings"""
import json
from collections import OrderedDict

from django.utils.safestring import mark_safe
from tworaven_apps.utils.raven_json_encoder import RavenJSONEncoder
from tworaven_apps.utils.basic_response import \
    (ok_resp, err_resp)

def json_loads(json_str):
    """wrapper for json.loads with OrderedDict"""
    try:
        json_dict = json.loads(json_str,
                               object_pairs_hook=OrderedDict)
    except json.decoder.JSONDecodeError as err_obj:
        err_msg = 'Failed to convert string to JSON: %s' % (err_obj)
        return err_resp(err_msg)
    except TypeError as err_obj:
        err_msg = 'Failed to convert string to JSON: %s' % (err_obj)
        return err_resp(err_msg)

    return ok_resp(json_dict)


def json_dumps(data_dict, indent=None):
    """Dump JSON to a string w/o indents"""
    if indent is not None and \
        not isinstance(indent, int):
        # quick sanity check
        return err_resp('indent must be None or an integer')

    try:
        # dump it to a string
        jstring = json.dumps(data_dict,
                             indent=indent,
                             cls=RavenJSONEncoder)
        return ok_resp(jstring)

    except TypeError as err_obj:
        # uh oh
        user_msg = ('Failed to convert to JSON: %s'
                    ' (json_util)\n\n%s') % \
                    (err_obj, str(data_dict)[:200])
        return err_resp(user_msg)


def format_pretty_from_dict(info_dict, indent=4):
    """Load a string into JSON"""

    try:
        return True, json.dumps(info_dict, indent=indent)
    except TypeError as ex_obj:
        return False, '(Invalid JSON) ' + ex_obj


def format_pretty(json_string, indent=4):
    """Load a string into JSON"""

    try:
        d = json.loads(json_string)
    except TypeError:
        return False, '(Invalid JSON) ' + json_string

    return True, json.dumps(d, indent=indent)


def format_jsonfield_for_admin(json_dict, indent=4):

    if not json_dict:
        return 'n/a'

    d_pretty = '<pre>%s</pre>' % json.dumps(json_dict, indent=indent)

    return mark_safe(d_pretty)


def format_json_for_admin(json_string, indent=4):
    """Format the JSON for viewing in the admin"""
    #print('format_json_for_admin: ', json_string)
    if not json_string:
        return 'n/a'

    try:
        d = json.loads(json_string)
    except TypeError:
        return mark_safe('(not JSON)')
    except json.decoder.JSONDecodeError:
        return mark_safe('(not JSON)')

    d_pretty = '<pre>%s</pre>' % json.dumps(d, indent=indent)

    return mark_safe(d_pretty)

def format_link_for_admin(source_url):
    if not source_url:
        return 'n/a'

    lnk = '<a href="{0}" target="_blank">{0}</a>'.format(source_url)

    return mark_safe(lnk)
