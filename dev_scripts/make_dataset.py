import os, sys
import csv
from os.path import abspath, dirname, join

sys.path.append(dirname(dirname(abspath(__file__))))
#FAB_BASE_DIR = os.path.dirname(os.path.abspath(__file__))

os.environ.setdefault('TA2_STATIC_TEST_MODE',
                      'False')
os.environ.setdefault('DJANGO_SETTINGS_MODULE',
                      'tworavensproject.settings.local_settings')

import django
try:
    django.setup()
except Exception as e:
    print("WARNING: Can't configure Django. %s" % e)

from tworaven_apps.data_prep_utils.new_dataset_util import NewDatasetUtil


def make_dataset(user_workspace_id, source_file):
    """test"""
    ndu = NewDatasetUtil(user_workspace_id, source_file)
    if ndu.has_error():
        print(ndu.get_error_message())
        return

    ndu.show_info()

if __name__ == '__main__':
    user_workspace_id = 1
    source_file = '../ravens_volume/test_data/01_TEST_SOURCE/baseball_learningData.csv'
    make_dataset(user_workspace_id, source_file)
