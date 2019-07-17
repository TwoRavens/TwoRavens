import json
import csv
from datetime import datetime as dt
from os.path import isdir, isfile, getsize, join
from collections import OrderedDict
from tworaven_apps.utils.json_helper import json_loads
from tworaven_apps.utils.basic_response import (ok_resp, err_resp)
from django.views.decorators.csrf import csrf_exempt
from tworaven_apps.utils import random_info
from tworaven_apps.configurations.models_d3m import D3MConfiguration,\
    D3M_FILE_ATTRIBUTES


def get_latest_d3m_config():
    """
    - See if there's a config with "is_default=True"
    - NEW: Exclude "is_user_config"
    - Look for the most recently modified config
    - No configs? Return None
    """

    # Is there a default?
    #
    params = dict(is_default=True,
                  is_user_config=False)
    d3m_config = D3MConfiguration.objects.filter(**params).first()
    if not d3m_config:
        return None
        # nope, get the most recently modified config
        #
        """
        d3m_config = D3MConfiguration.objects.order_by('-modified').first()
        if not d3m_config:
            # there is no config!
            #
            return None
        """
    return d3m_config


def get_path_to_source_data(d3m_config):
    """Direct path to the data file"""
    if not d3m_config:
        return err_resp('d3m_config is None (get_source_data_path)')

    train_data_info = get_train_data_info(d3m_config)
    if not train_data_info.success:
        return train_data_info

    for k, v in train_data_info.result_obj.items():
        print(v)
        if v['exists']:
            return ok_resp(v['path'])

    return err_resp('path to source data not found: %s' % \
                    train_data_info.result_obj)


def get_train_data_info(d3m_config):
    """Pull info for train data and train info files.
    {
        "learningData.csv": {
            "exists": true,
            "size": 2353,
            "fullpath": "thefullpath/learningData.csv"
        }
    }"""
    if not d3m_config:
        return err_resp('d3m_config is None (get_train_data_info)')

    file_info = OrderedDict()
    fnames = ['learningData.csv',
              'learningData.csv.gz']

    source_data_path = None

    for fname in fnames:
        # For each file, does it exist? size? path?
        fpath = join(d3m_config.training_data_root,
                     #'dataset_TRAIN',
                     'tables',
                     fname)

        one_file_info = OrderedDict()

        if isfile(fpath):
            # file found
            one_file_info['exists'] = True
            one_file_info['size'] = getsize(fpath)
            source_data_path = fpath
        else:
            # no file found
            one_file_info['exists'] = False
            one_file_info['size'] = -1

        one_file_info['path'] = fpath

        file_info[fname] = one_file_info

    file_info['source_data_path'] = source_data_path

    return ok_resp(file_info)

def get_dataset_size(d3m_config):
    """Make a guess at the data file name and attempt to get the size"""
    if not d3m_config:
        return None, 'd3m_config is None'

    data_filename = 'trainData.csv'
    data_filename_zipped = 'trainData.csv.gz'

    data_filepath = join(d3m_config.training_data_root,
                         data_filename)
    data_filepath_zipped = join(d3m_config.training_data_root,
                                data_filename_zipped)

    info_dict = {}
    info_found = False
    if isfile(data_filepath):
        info_dict[data_filename] = getsize(data_filepath)
        info_found = True
    else:
        info_dict[data_filename] = -1

    if isfile(data_filepath_zipped):
        info_dict[data_filename_zipped] = getsize(data_filepath_zipped)
        info_found = True
    else:
        info_dict[data_filename_zipped] = -1

    if info_found:
        return info_dict, None

    return None, 'Default data files not found: [%s], [%s]' % \
                 (data_filepath, data_filepath_zipped)

def get_d3m_filepath(d3m_config, file_attr):
    """
    Example from: https://datadrivendiscovery.org/wiki/display/gov/TA2+Configuration+file+syntax
    {
    "problem_schema": "/baseball/problemSchema.json",
    "dataset_schema": "/baseball/data/dataSchema.json",
    "training_data_root": "/baseball/data",
    "pipeline_logs_root": "/outputs/logs",
    "executables_root": "/outputs/executables",
    }
    return:
        success -> (filepath, None)
        err -> (None, err_msg)
    """
    if not d3m_config:
        return err_resp('No D3MConfiguration specified.')

    if not file_attr in D3M_FILE_ATTRIBUTES:
        user_msg = 'unknown file attribute.  Use one of %s' % D3M_FILE_ATTRIBUTES
        return err_resp(user_msg)

    filepath = d3m_config.__dict__.get(file_attr, '')
    if not isfile(filepath):
        return err_resp('file not found: %s' % filepath)

    return ok_resp(filepath)

def get_config_file_contents(d3m_config, config_key, as_dict=True):
    """Get contents of a file specified in the config"""
    if not isinstance(d3m_config, D3MConfiguration):
        return err_resp('d3m_config must be a D3MConfiguration object')

    if not config_key in D3M_FILE_ATTRIBUTES:
        return err_resp('config_key not found!')

    filepath_info = get_d3m_filepath(d3m_config, config_key)
    if not filepath_info.success:
        return err_resp(filepath_info.err_msg)

    fpath = filepath_info.result_obj

    try:
        with open(fpath, "r") as fh:
            contents = fh.read()
    except IOError as err_obj:
        user_msg = 'Failed to read file: %s\n%s' % \
                    (fpath, err_obj)
        return err_resp(user_msg)

    if not as_dict:
        return ok_resp(contents)

    doc_info = json_loads(contents)
    if not doc_info.success:
        return err_resp(doc_info.err_msg)

    return ok_resp(doc_info.result_obj)
