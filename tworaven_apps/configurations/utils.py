import json
import random, string
from datetime import datetime as dt
from os.path import isdir, isfile, getsize, join

from tworaven_apps.configurations.models_d3m import D3MConfiguration,\
    D3M_FILE_ATTRIBUTES

def get_latest_d3m_config():
    """
    - See if there's a config with "is_default=True"
    - Look for the most recently modified config
    - No configs? Return None
    """

    # Is there a default?
    #
    d3m_config = D3MConfiguration.objects.filter(is_default=True).first()
    if not d3m_config:
        # nope, get the most recently modified config
        #
        d3m_config = D3MConfiguration.objects.order_by('-modified').first()
        if not d3m_config:
            # there is no config!
            #
            return None
    return d3m_config

def get_dataset_size(d3m_config):
    """Make a guess at the data file name and attempt to get the size"""
    if not d3m_config:
        return None, 'd3m_config is None'

    data_filename = 'testData.csv'
    data_filename_zipped = 'testData.csv.gz'

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

def write_data_for_execute_pipeline(d3m_config, data_info):
    """Part of the ExecutePipeline, write data to 'temp_storage_root'
    and return an associated file url"""
    if not d3m_config:
        return None, 'No D3MConfiguration specified.'

    if not data_info:
        return None, 'No data_info specified.'

    try:
        data_str = json.dumps(data_info)
    except TypeError:
        return None, 'Failed to convert to data_info to string'

    if not isdir(d3m_config.temp_storage_root):
        return None, 'temp_storage_root not accessible: [%s]' % \
                     d3m_config.temp_storage_root

    rand_str = ''.join(random.choice(string.ascii_lowercase + string.digits)
               for _ in range(4))

    # create a file name based on
    #
    fname = '%s_data_%s_%s.json' % (d3m_config.slug[:6],
                                    rand_str,
                                    dt.now().strftime('%Y-%m-%d_%H-%M-%S'))

    filepath = join(d3m_config.temp_storage_root, fname)

    # write the file
    try:
        open(filepath, 'w').write(data_str)
    except:
        return None, 'Failed to write file to: [%s]' % filepath

    # return file uri
    file_uri = 'file://%s' % filepath
    return file_uri, None

def get_d3m_filepath(d3m_config, file_attr):
    """
    Example from: https://datadrivendiscovery.org/wiki/display/gov/TA2+Configuration+file+syntax
    {
    "problem_schema": "/baseball/problemSchema.json",
    "dataset_schema": "/baseball/data/dataSchema.json",
    "training_data_root": "/baseball/data",
    "pipeline_logs_root": "/outputs/logs",
    "executables_root": "/outputs/executables",
    "temp_storage_root": "/temp"
    }
    return:
        success -> (filepath, None)
        err -> (None, err_msg)
    """
    if not d3m_config:
        return None, 'No D3MConfiguration specified.'

    if not file_attr in D3M_FILE_ATTRIBUTES:
        return None, 'unknown file attribute.  Use one of %s' % D3M_FILE_ATTRIBUTES

    filepath = d3m_config.__dict__.get(file_attr, '')
    if not isfile(filepath):
        return None, 'file not found: %s' % filepath

    return filepath, None
