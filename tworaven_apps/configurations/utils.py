from os.path import isfile, getsize, join
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
        return None

    if not file_attr in D3M_FILE_ATTRIBUTES:
        return None, 'unknown file attribute.  Use one of %s' % D3M_FILE_ATTRIBUTES

    filepath = d3m_config.__dict__.get(file_attr, '')
    if not isfile(filepath):
        return None, 'file not found: %s' % filepath

    return filepath, None
