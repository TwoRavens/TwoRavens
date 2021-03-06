"""
Create/set directories on startup:
    - RAVENS_VOLUME_DIR: share data between docker containers

"""
import os
import sys
from os.path import abspath, dirname, join, isdir
from distutils.util import strtobool
from tworaven_apps.configurations import static_vals as cstatic
from tworaven_apps.utils.file_util import create_directory_on_startup

BASE_DIR = dirname(dirname(dirname(abspath(__file__))))

# ---------------------------------------------------------------
# RAVENS_VOLUME: Used to share data between docker containers
#   Note: This has to be on a shared volume available to a TA2
#   Default: /ravens_volume
# ---------------------------------------------------------------
_RAVENS_VOLUME_HARDCODED_DIR = '/ravens_volume'
_RAVENS_VOLUME_DEFAULT_DIR = join(BASE_DIR, _RAVENS_VOLUME_HARDCODED_DIR) # 'RAVENS_VOLUME_TEST'
RAVENS_VOLUME_DIR = os.environ.get(cstatic.KEY_RAVENS_VOLUME_DIR, _RAVENS_VOLUME_DEFAULT_DIR)
create_directory_on_startup(RAVENS_VOLUME_DIR, cstatic.KEY_RAVENS_VOLUME_DIR)

# -----------------------------------------------------
# Directory used for output of test datasets
#   Note: This has to be on a shared volume available to a TA2
#   Default: {RAVENS_VOLUME}/test_output
# -----------------------------------------------------
RAVENS_TEST_OUTPUT_DIR = os.environ.get(\
                            cstatic.KEY_RAVENS_TEST_OUTPUT_DIR,
                            join(RAVENS_VOLUME_DIR, 'test_output'))
create_directory_on_startup(RAVENS_TEST_OUTPUT_DIR, cstatic.KEY_RAVENS_TEST_OUTPUT_DIR)

# -----------------------------------------------------
# RAVENS_TEST_DATA_READONLY_DIR: Test datasets
#  This points to the location of the https://github.com/TwoRavens/tworavens-test-datasets
#
#   Note: Also needs to be on a shared volume available to a TA2
#   Default: {RAVENS_VOLUME}/test_data
# -----------------------------------------------------
RAVENS_TEST_DATA_READONLY_DIR = os.environ.get(\
                            cstatic.KEY_RAVENS_TEST_DATA_READONLY_DIR,
                            join(RAVENS_VOLUME_DIR, 'test_data'))
create_directory_on_startup(RAVENS_TEST_DATA_READONLY_DIR,
                            cstatic.KEY_RAVENS_TEST_DATA_READONLY_DIR)

# -----------------------------------------
# Directory for user contributed datasets
# - This includes uploaded files
# -----------------------------------------
if os.environ.get(cstatic.KEY_D3MOUTPUTDIR):
    # As of July 2020, put this under the KEY_D3MOUTPUTDIR "temp" directory
    TWORAVENS_USER_DATASETS_DIR = join(os.environ.get(cstatic.KEY_D3MOUTPUTDIR),
                                       cstatic.TEMP_DIR_NAME,
                                       'TWORAVENS_USER_DATASETS')
else:
    # For non-D3M, put it under ravens_volume
    TWORAVENS_USER_DATASETS_DIR = os.environ.get(\
                    cstatic.KEY_TWORAVENS_USER_DATASETS_DIR,
                    join(RAVENS_VOLUME_DIR, 'TWORAVENS_USER_DATASETS')
                    )
create_directory_on_startup(TWORAVENS_USER_DATASETS_DIR,
                            cstatic.KEY_TWORAVENS_USER_DATASETS_DIR)

# -------------------------------
# Directory for moving data from
# EventData to TwoRavens
# -------------------------------
#if os.environ.get(cstatic.KEY_D3MOUTPUTDIR):
#    # For D3M environment -- which is actually not used
#    # As of July 2020, put this under the KEY_D3MOUTPUTDIR "temp" directory
#    EVTDATA_2_TWORAVENS_DIR = join(os.environ.get(cstatic.KEY_D3MOUTPUTDIR),
#                                   cstatic.TEMP_DIR_NAME,
#                                   'evtdata_user_datasets')
#else:
#    # For non-D3M, put it under ravens_volume

# Only used on GCE right now!!
if strtobool(os.environ.get('IS_TRAVIS_BUILD', 'False')):
    EVTDATA_2_TWORAVENS_DIR = join(RAVENS_VOLUME_DIR,
                                   'evtdata_user_datasets')
else:
    # Only used on GCE right now!!
    EVTDATA_2_TWORAVENS_DIR = os.environ.get(\
                    cstatic.KEY_EVTDATA_2_TWORAVENS_DIR,
                    join(_RAVENS_VOLUME_HARDCODED_DIR,
                         'evtdata_user_datasets'))

create_directory_on_startup(EVTDATA_2_TWORAVENS_DIR,
                            cstatic.KEY_EVTDATA_2_TWORAVENS_DIR)
