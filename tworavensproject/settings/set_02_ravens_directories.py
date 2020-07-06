# -----------------------------------------
# Directory for user contributed datasets
# - This includes uploaded files
# -----------------------------------------
import os
import sys
from os.path import join, isdir

if os.environ.get('D3MOUTPUTDIR'):
    TWORAVENS_USER_DATASETS_DIR = join(os.environ.get('D3MOUTPUTDIR'),
                                       'temp',
                                       'TwoRavens_user_datasets')
else:
    TWORAVENS_USER_DATASETS_DIR = os.environ.get('TWORAVENS_USER_DATASETS_DIR',
                                                 '/ravens_volume/TwoRavens_user_datasets')

if not isdir(TWORAVENS_USER_DATASETS_DIR):
    print((f'WARNING: the USER_ADDED_DATASETS_DIR is not'
           f' available: {TWORAVENS_USER_DATASETS_DIR}'))
    try:
        os.makedirs(TWORAVENS_USER_DATASETS_DIR, exist_ok=True)
        print(f'OK: able to create directory: {TWORAVENS_USER_DATASETS_DIR}')
    except OSError as err_obj:
        if not TWORAVENS_USER_DATASETS_DIR:
            print((f'You must set this env variable to an existing directory'
                   f' {TWORAVENS_USER_DATASETS_DIR}'))
        else:
            print(f'This directory MUST be available {TWORAVENS_USER_DATASETS_DIR}')
        sys.exit(0)
