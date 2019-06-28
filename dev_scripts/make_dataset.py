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
from tworaven_apps.datamart_endpoints import static_vals as dm_static


def make_dataset(user_workspace_id, source_file, **kwargs):
    """test"""

    ndu_info = NewDatasetUtil.make_new_dataset_call(\
                         user_workspace_id,
                         source_file,
                         **kwargs)
    if not ndu_info.success:
        print('Nope')
    else:
        print('it is running')
    return
    ndu = NewDatasetUtil(user_workspace_id, source_file, **kwargs)
    if ndu.has_error():
        print(ndu.get_error_message())
        return

    ndu.show_info()

if __name__ == '__main__':
    user_workspace_id = 119
    websocket_id = 'test_user'
    #source_file = '../ravens_volume/test_data/01_TEST_SOURCE/baseball_learningData.csv'
    source_file = '/Users/ramanprasad/Documents/github-rp/TwoRavens/ravens_volume/test_output/DA_fifa2018_manofmatch/additional_inputs/augment/datamart.upload.8733eed7d5844bc990d1153b6957cf90/tables/learningData.csv'

    datasetdoc_path = '/Users/ramanprasad/Documents/github-rp/TwoRavens/ravens_volume/test_output/DA_fifa2018_manofmatch/additional_inputs/augment/datamart.upload.8733eed7d5844bc990d1153b6957cf90/datasetDoc.json'

    make_dataset(user_workspace_id,
                 source_file,
                 **{'websocket_id': websocket_id,
                    dm_static.KEY_DATASET_DOC_PATH: datasetdoc_path})
