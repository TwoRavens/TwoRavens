from load_django_settings import load_local_settings
load_local_settings()

from tworaven_apps.data_prep_utils.dataset_doc_maker import DatasetDocMaker


def test_datast_doc_maker(input_file, output_dir):

    ddm = DatasetDocMaker(input_file, output_dir)

    if ddm.has_error():
        print(ddm.error_message)
    else:
        print('it worked')
        print(ddm.dataset_doc_path)
        print(ddm.final_data_file_path)


if __name__ == '__main__':
    test_file = ('/ravens_volume/test_data/185_baseball/TRAIN/'
                 'dataset_TRAIN/tables/learningData.csv')
    test_output_dir = '~/Desktop/user_test'

    test_datast_doc_maker(test_file, test_output_dir)
