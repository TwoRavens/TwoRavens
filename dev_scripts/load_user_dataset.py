from load_django_settings import load_local_settings
load_local_settings()

from pathlib import Path

from tworaven_apps.data_prep_utils.dataset_doc_maker import DatasetDocMaker
from tworaven_apps.data_prep_utils.user_dataset_util import UserDatasetUtil


def test_dataset_doc_maker(input_files, output_dir):

    ddm = DatasetDocMaker(input_files, output_dir)

    if ddm.has_error():
        print(ddm.error_message)
    else:
        print('it worked')
        print(ddm.dataset_doc_path)
        print(ddm.final_data_file_path)

def test_new_dataset_load(user_id, input_files, output_dir):
    """Try it out"""

    udu = UserDatasetUtil(1, input_files, output_dir)
    if udu.has_error():
        print(udu.error_message)
    else:
        print('it worked')


if __name__ == '__main__':
    test_file = ('/ravens_volume/test_data/185_baseball/TRAIN/'
                 'dataset_TRAIN/tables/learningData.csv')
    test_file2 = ('/ravens_volume/test_data/185_baseball/TRAIN/'
                 'dataset_TRAIN/tables/learningData2.csv')
    test_output_dir = '/Users/ramanprasad/Desktop/user_test'

    #test_dataset_doc_maker([test_file, test_file2], test_output_dir)

    test_output_dir2 = '/ravens_volume/test_data/00_testit'

    test_new_dataset_load(1, [test_file, test_file2], test_output_dir2)
