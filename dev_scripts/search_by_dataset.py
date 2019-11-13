import os, sys
import json
from os.path import abspath, dirname, isdir, join

CURRENT_DIR = dirname(abspath(__file__))
sys.path.append(CURRENT_DIR)
sys.path.append(dirname(CURRENT_DIR))

os.environ.setdefault('TA2_STATIC_TEST_MODE',
                      'False')
os.environ.setdefault('DJANGO_SETTINGS_MODULE',
                      'tworavensproject.settings.local_settings')

import django
try:
    django.setup()
except Exception as e:
    print("WARNING: Can't configure Django. %s" % e)

from tworaven_apps.datamart_endpoints.tasks import make_search_by_dataset_call
from tworaven_apps.datamart_endpoints import static_vals as dm_static


def test_search_by_dataset(user_workspace_id):
    """Test some basic functions"""

    dataset_path = ('/Users/ramanprasad/Documents/github-rp/TwoRavens'
                    '/ravens_volume/test_data/DA_ny_taxi_demand/TRAIN/'
                    'dataset_TRAIN/tables/learningData.csv')

    xdataset_path = '/Users/ramanprasad/Desktop/screenshot.png'
    
    info = make_search_by_dataset_call(\
                                dm_static.DATAMART_NYU_NAME,
                                user_workspace_id,
                                dataset_path)

    print('info: ', info)


if __name__ == '__main__':
    test_search_by_dataset(user_workspace_id=41)
