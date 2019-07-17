from django.utils.safestring import mark_safe
import os, errno
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

def format_bad_path_msg(d3m_config, attr_name, with_html=False):
    if d3m_config is None:
        return None

    path_val = d3m_config.__dict__.get(attr_name, None)
    if not path_val:
        path_val = '(blank)'

    if with_html:
        msg = '<b>%s</b>: %s' % (attr_name, path_val)
    else:
        msg = '  - %s: %s' % (attr_name, path_val)
    return mark_safe(msg)


def get_bad_paths_for_admin(d3m_config):
    path_list = get_bad_paths(d3m_config, with_html=True)

    return mark_safe('<br />'.join(path_list))

def get_bad_paths(d3m_config, with_html=False):
    """Get a list of bad paths.
    This should be in some util but speed needed"""
    from tworaven_apps.configurations import static_vals as cstatic
    from tworaven_apps.configurations.models_d3m import \
            (D3M_FILE_ATTRIBUTES,
             D3M_DIR_ATTRIBUTES,
             D3M_DIR_USER_PROBLEMS_ROOT,
             )

    bad_paths = []
    for fpath in D3M_FILE_ATTRIBUTES:
        print('fpath', fpath)
        if not isfile(d3m_config.__dict__.get(fpath, None)):
            fmt_line = format_bad_path_msg(d3m_config, fpath, with_html)
            bad_paths.append(fmt_line)

    for dpath in D3M_DIR_ATTRIBUTES:
        dpath_val = d3m_config.__dict__.get(dpath, None)
        print('dpath', dpath)
        print('dpath_val', dpath_val)
        print('D3M_DIR_USER_PROBLEMS_ROOT', D3M_DIR_USER_PROBLEMS_ROOT)
        if not isdir(dpath_val):
            if dpath_val and dpath in [D3M_DIR_USER_PROBLEMS_ROOT,]:
                # for these directories, try to create them...
                try:
                    os.makedirs(dpath_val, exist_ok=True)
                except OSError as err_obj:
                    if err_obj.errno != errno.EEXIST:
                        fmt_line = format_bad_path_msg(d3m_config, dpath, with_html)
                        bad_paths.append(fmt_line)
                except:
                    fmt_line = format_bad_path_msg(d3m_config, dpath, with_html)
                    bad_paths.append(fmt_line)
            else:
                fmt_line = format_bad_path_msg(d3m_config, dpath, with_html)
                bad_paths.append(fmt_line)

    return bad_paths
