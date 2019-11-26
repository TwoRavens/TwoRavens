"""
Constants used to track the app names and url between the frontend and rook
"""

DISCOVERY_R_APP_NAME = 'discovery.app'
PARTIALS_R_APP_NAME = 'partials.app'
CARET_R_NAME = 'caret.app'
PLOTDATA_R_NAME = 'plotdata.app'
REPORT_R_NAME = 'report.app'
EFD_IMPORTANCE_R_NAME = 'efdimportance.app'

EXPLORE_APP = 'EXPLORE_APP'
PLOTDATA_APP = 'PLOTDATA_APP'
HEALTH_CHECK_APP = 'HEALTH_CHECK_APP'
PARTIALS_APP = 'PARTIALS_APP'
EFD_IMPORTANCE_APP = 'EFD_IMPORTANCE_APP'

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

    ('DISCOVERY_APP', DISCOVERY_R_APP_NAME, DISCOVERY_R_APP_NAME),
    ('CARET_APP', CARET_R_NAME, CARET_R_NAME),
    (PLOTDATA_APP, PLOTDATA_R_NAME, PLOTDATA_R_NAME),
    ('ROOK_REPORT_APP', REPORT_R_NAME, REPORT_R_NAME),
    (EFD_IMPORTANCE_APP, EFD_IMPORTANCE_R_NAME, EFD_IMPORTANCE_R_NAME),
    (HEALTH_CHECK_APP, 'healthCheck.app', 'healthCheck.app'),
    (PARTIALS_APP, PARTIALS_R_APP_NAME, PARTIALS_R_APP_NAME),  # construct partials dataset
]

# Look up by frontend name, 2nd entry in triple
#
ROOK_APP_FRONTEND_LU = {info[1]: info for info in ROOK_APP_NAMES}

# Look up by name name, 1st entry in triple
#
ROOK_APP_NAME_LOOKUP = {info[0]: info for info in ROOK_APP_NAMES}
