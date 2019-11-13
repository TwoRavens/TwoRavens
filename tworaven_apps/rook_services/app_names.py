"""
Constants used to track the app names and url between the frontend and rook
"""

HEALTH_CHECK_APP = 'HEALTH_CHECK_APP'



PREPROCESS_ROOK_APP_NAME = 'preprocess.app'
PARTIALS_ROOK_APP_NAME = 'partials.app'
CARET_APP_NAME = 'caret.app'
PLOTDATA_APP_NAME = 'plotdata.app'
REPORT_APP_NAME = 'report.app'

EXPLORE_APP = 'EXPLORE_APP'
PLOTDATA_APP = 'PLOTDATA_APP'
PARTIALS_APP = 'PARTIALS_APP'

DATA_KEY = 'arguments'

# Used for tracking rook routing.
#
# Example ZELIG_APP is the constant used in logs
#
# format:  (app name, frontend url suffix, rook url suffix)
#
# example: ('ZELIG_APP', 'zeligapp', 'zeligapp')
#
ROOK_APP_NAMES = [
    # (standard     frontend   backend )

    ('PREPROCESS_APP', PREPROCESS_ROOK_APP_NAME, PREPROCESS_ROOK_APP_NAME),
    ('CARET_APP', CARET_APP_NAME, CARET_APP_NAME),
    (PLOTDATA_APP, PLOTDATA_APP_NAME, PLOTDATA_APP_NAME),
    ('ROOK_REPORT_APP', REPORT_APP_NAME, REPORT_APP_NAME),
    (HEALTH_CHECK_APP, 'healthCheck.app', 'healthCheck.app'),
    (PARTIALS_APP, PARTIALS_ROOK_APP_NAME, PARTIALS_ROOK_APP_NAME),  # construct partials dataset
]

# Look up by frontend name, 2nd entry in triple
#
ROOK_APP_FRONTEND_LU = {info[1]: info for info in ROOK_APP_NAMES}

# Look up by name name, 1st entry in triple
#
ROOK_APP_NAME_LOOKUP = {info[0]: info for info in ROOK_APP_NAMES}
