"""Methods used by AppConfiguration"""
import urllib.parse

FILE_URI_PREFIX = 'file://'

def format_file_uri_to_path(file_uri):
    """Map a file uri to a path
    reference: https://stackoverflow.com/questions/5977576/is-there-a-convenient-way-to-map-a-file-uri-to-os-path"""
    if not file_uri:
        return (None, "The file_uri must be specified")

    if not file_uri.lower().startswith(FILE_URI_PREFIX):
        # no file uri prefix found; assume that this is a file path
        # return "AS IS"
        return (file_uri, None)

    return (urllib.parse.unquote(file_uri)[len(FILE_URI_PREFIX):], None)


def add_file_uri_to_path(filepath):
    """Add the file uri preix: "file://" to the beginning of a path"""
    if not filepath:
        return False, "The filepath must be specified"

    if filepath.lower().startswith(FILE_URI_PREFIX):
        #
        #
        return True, filepath

    updated_fpath = '%s%s' % (FILE_URI_PREFIX, filepath)

    return True, updated_fpath


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
