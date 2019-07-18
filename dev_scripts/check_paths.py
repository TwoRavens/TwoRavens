from load_django_settings import load_local_settings
load_local_settings()

from datetime import datetime
from tworaven_apps.configurations.models_d3m import D3MConfiguration
from tworaven_apps.configurations import util_path_check as putil

from tworaven_apps.configurations.env_config_loader import EnvConfigLoader


def config_test(data_input_dir):
    """Make a new config and see if it works"""
    params = dict(delete_if_exists=True,
                  is_default_config=True)

    loader_info = EnvConfigLoader.make_config_from_directory(\
                        data_input_dir,
                        **params)
                        #{delete_if_exists=self.delete_if_exists,
                        #is_default_config=True)

    if not loader_info.success:
        print('Failed:', loader_info.err_msg)
        return

    d3m_config = loader_info.result_obj

    # It worked!!
    #
    success_msg = ('(%s) Successfully loaded new'
                   ' D3M configuration: "%s"') %\
                  (d3m_config, datetime.now())
    print(success_msg)

    info = putil.are_d3m_paths_valid(d3m_config)
    print('are_d3m_paths_valid', info)


    info2 = putil.get_bad_paths(d3m_config)
    print('get_bad_paths', info2)

    info3 = putil.get_bad_paths_for_admin(d3m_config)
    print('get_bad_paths_for_admin', info3)


if __name__ == '__main__':
    data_dir = '/Users/ramanprasad/Documents/github-rp/TwoRavens/ravens_volume/test_data/DA_poverty_estimation'
    config_test(data_dir)
