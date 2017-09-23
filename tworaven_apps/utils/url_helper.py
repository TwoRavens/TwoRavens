

def add_trailing_slash(la_url):
    """Add a trailing slash to a url"""
    if la_url and not la_url[-1] == '/':
        la_url = '%s/' % la_url

    return la_url

def remove_trailing_slash(ze_url):
    """Remove the trailing slash"""
    if ze_url and ze_url[-1] == '/':
        ze_url = ze_url[:-1]

    return ze_url
