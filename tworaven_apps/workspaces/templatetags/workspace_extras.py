from django import template
from tworaven_apps.utils.json_helper import format_pretty_from_dict

register = template.Library()


@register.filter(name='jsonpretty')
def jsonpretty(value):
    """Turn python dict into JSON formatted string"""
    if not value:
        return '(n/a)'

    success, pretty_json = format_pretty_from_dict(value)

    if success:
        return pretty_json

    return value

@register.filter(name='dictsize')
def dictsize(value):
    """Turn python dict into JSON formatted string"""
    if not value:
        return '(n/a)'

    return len(str(value))
