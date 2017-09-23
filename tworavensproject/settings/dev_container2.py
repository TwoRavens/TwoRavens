from .local_settings import *
import os


R_DEV_SERVER_BASE = os.environ.get('R_DEV_SERVER_BASE',
                                   'http://0.0.0.0:8000/custom/')


WEBPACK_LOADER['DEFAULT'].update(\
    dict(BUNDLE_DIR_NAME='dist/',
         STATS_FILE=join(BASE_DIR, 'webpack-stats-prod.json'))\
    )

TA2_STATIC_TEST_MODE = False    # return canned responses
TA2_TEST_SERVER_URL = os.environ.get('TA2_TEST_SERVER_URL', None) # 'localhost:50051'
TA2_GPRC_USER_AGENT = os.environ.get('TA2_GPRC_USER_AGENT', 'tworavens')
