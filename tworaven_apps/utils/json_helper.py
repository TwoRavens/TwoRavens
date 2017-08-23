import json
from django.utils.safestring import mark_safe


def format_pretty(json_string, indent=4):
    """Load a string into JSON"""

    try:
        d = json.loads(json_string)
    except TypeError:
        return '(Invalid JSON) ' + json_string

    return json.dumps(d, indent=indent)


def format_jsonfield_for_admin(json_dict, indent=4):

    if not json_dict:
        return 'n/a'

    d_pretty = '<pre>%s</pre>' % json.dumps(json_dict, indent=indent)

    return mark_safe(d_pretty)


def format_json_for_admin(json_string, indent=4):

    if not json_string:
        return 'n/a'

    d = json.loads(json_string)

    d_pretty = '<pre>%s</pre>' % json.dumps(d, indent=indent)

    return mark_safe(d_pretty)

def format_link_for_admin(source_url):
    if not source_url:
        return 'n/a'

    lnk = '<a href="{0}" target="_blank">{0}</a>'.format(source_url)

    return mark_safe(lnk)
