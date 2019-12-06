import os, sys
import json
from os.path import abspath, dirname, join
import shutil

sys.path.append(dirname(abspath(__file__)))
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


from tworaven_apps.R_services.preprocess_util import PreprocessUtil

def test_preprocess():

    src_file = '/ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv'

    putil = PreprocessUtil(src_file)
    if putil.has_error():
        print('error found: ', putil.get_error_message())
    else:
        return
        #
        # Preprocess data as python dict
        print('preprocess data (python dict)', putil.get_preprocess_data())

        # Preprocess data as JSON string
        #
        print('preprocess data (json string)', putil.get_preprocess_data_as_json())

        # Preprocess data as JSON string indented 4 spaces
        #
        print('preprocess data (json string)', putil.get_preprocess_data_as_json(4))

def test_dupe_cols():

    src_fname = '/Users/ramanprasad/Desktop/learningData.csv'
    dest_fname = '/Users/ramanprasad/Desktop/t2.csv'
    shutil.copy(src_fname, dest_fname)

    PreprocessUtil.remove_duplicate_columns(dest_fname)


if __name__ == '__main__':
    test_dupe_cols()
    # test_preprocess()
