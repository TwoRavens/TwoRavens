"""Wrap file/dir functions for error checks"""
import os
from os.path import join, isfile
import shutil

from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)


def write_file(fpath, doc_content):
    """Create a directory"""
    try:
        fh = open(fpath, 'w')
        fh.write(doc_content)
        fh.close()
    except OSError as err_obj:
        user_msg = ('Failed to write file: %s' % fpath)
        return err_resp(user_msg)

    return ok_resp('File created: %s' % fpath)

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


def read_file_rows(data_filepath, num_rows=100):
    """Initial use is for dataset preview"""
    if not isfile(data_filepath):
        return err_resp(f'File doesn\'t exist: {data_filepath}')
    if not isinstance(num_rows, int):
        return err_resp(f'"num_rows" must be an integer.')

    if num_rows < 1:
        return err_resp(f'"num_rows" must be at least 1. Found: "{num_rows}"')

    data_rows = []
    with open(data_filepath, 'r') as datafile:
        for idx, line in enumerate(datafile):
            if idx == num_rows:
                break
            data_rows.append(line)

    return ok_resp(data_rows)
