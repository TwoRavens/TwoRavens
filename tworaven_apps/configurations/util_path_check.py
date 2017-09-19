from django.utils.safestring import mark_safe
from os.path import isdir, isfile


def are_d3m_paths_valid(d3m_config):
    """Check if the files and directories exist and are reachable"""
    if d3m_config is None:
        return False

    from tworaven_apps.configurations.models_d3m import \
        D3M_FILE_ATTRIBUTES, D3M_DIR_ATTRIBUTES

    for fpath in D3M_FILE_ATTRIBUTES:
        if not isfile(d3m_config.__dict__.get(fpath, None)):
            return False

    for dpath in D3M_DIR_ATTRIBUTES:
        if not isdir(d3m_config.__dict__.get(dpath, None)):
            return False

    return True

def format_bad_path_msg(d3m_config, attr_name):
    if d3m_config is None:
        return None

    msg = '<b>%s</b>: %s' % \
           (attr_name, d3m_config.__dict__.get(attr_name, None))

    return mark_safe(msg)

def get_bad_paths(d3m_config):
    """Get a list of bad paths.
    This should be in some util but speed needed"""
    from tworaven_apps.configurations.models_d3m import \
            D3M_FILE_ATTRIBUTES, D3M_DIR_ATTRIBUTES

    bad_paths = []
    for fpath in D3M_FILE_ATTRIBUTES:
        if not isfile(d3m_config.__dict__.get(fpath, None)):
            fmt_line = format_bad_path_msg(d3m_config, fpath)
            bad_paths.append(fmt_line)

    for dpath in D3M_DIR_ATTRIBUTES:
        if not isdir(d3m_config.__dict__.get(dpath, None)):
            fmt_line = format_bad_path_msg(d3m_config, dpath)
            bad_paths.append(fmt_line)

    return bad_paths
