"""Wrap file/dir functions for error checks"""
import os, join
import shutil

from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)


def create_directory(new_dir, exist_ok=True):
    """Create a directory"""
    try:
        os.makedirs(new_dir, exist_ok=exist_ok)
    except OSError as err_obj:
        user_msg = ('Failed create directory: %s. \n%s' % (new_dir, err_obj))
        return err_resp(user_msg)

    return ok_resp('Directory created: %s' % new_dir)

def move_file(src_file, dest_file):
    """Move a file"""
    if src_file == dest_file:
        return err_resp('The source and destination cannot be the same')

    try:
        shutil.copyfile(src_file, dest_file)
    except IOError as err_obj:
        user_msg = ('Failed to copy file: %s to %s\n%s') % \
                    (src_file, dest_file, err_obj)
        return err_resp(user_msg)

    return ok_resp('File copied to: %s' % dest_file)
