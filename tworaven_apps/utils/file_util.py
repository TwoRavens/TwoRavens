"""Wrap file/dir functions for error checks"""
import os
from os.path import join, isdir, isfile
import shutil
from tworaven_apps.utils.json_helper import json_loads
from tworaven_apps.utils.random_info import get_timestamp_string
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

def create_directory_add_timestamp(new_dir, exist_ok=True):
    """Create a directory structure with the final folder being a timestamp """

    new_dir_with_timestamp = join(new_dir, get_timestamp_string())
    try:
        os.makedirs(new_dir_with_timestamp, exist_ok=exist_ok)
    except OSError as err_obj:
        user_msg = ('Failed create directory: %s. \n%s' % (new_dir, err_obj))
        return err_resp(user_msg)

    return ok_resp(new_dir_with_timestamp)


def create_directory(new_dir, exist_ok=True):
    """Create a directory"""
    try:
        os.makedirs(new_dir, exist_ok=exist_ok)
    except OSError as err_obj:
        user_msg = ('Failed create directory: %s. \n%s' % (new_dir, err_obj))
        return err_resp(user_msg)

    return ok_resp(new_dir)

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

def remove_directory(dir_path):
    """Delete a directory"""
    if isdir(dir_path):

        try:
            shutil.rmtree(dir_path)
            return ok_resp(f'Directory removed {dir_path}')
        except TypeError as err_obj:
            return err_resp(f'Failed to remove directory. {err_obj}')
        except FileNotFoundError as err_obj:
            return err_resp(f'Directory not found: {err_obj}')

    return ok_resp(f'Not a directory {dir_path}')


def read_file_contents(fpath, as_dict=True):
    """Given a valid filepath, read the file and return it.
    Used for smaller files"""
    if not isfile(fpath):
        return err_resp(f'File doesn\'t exist: {fpath}')

    try:
        with open(fpath, "r") as fh:
            contents = fh.read()
    except IOError as err_obj:
        user_msg = 'Failed to read file: %s\n%s' % \
                    (fpath, err_obj)
        return err_resp(user_msg)

    if not as_dict:
        return ok_resp(contents)

    return json_loads(contents)


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
