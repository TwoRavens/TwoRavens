from os.path import isfile, getsize
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
