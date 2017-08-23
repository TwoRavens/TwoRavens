"""
Constants used to track the app names and url between the frontend and rook
"""
# Used for tracking the routing.
#
# Examplee.g ZELIG_APP is the constant used in logs
#
# format:  (app name, frontend url suffix, rook url suffix)
#
# example: ('ZELIG_APP', 'zeligapp', 'zeligapp')
#
ROOK_APP_NAMES = (('ZELIG_APP', 'zeligapp', 'zeligapp'),    # run models
                  ('DATA_APP', 'dataapp', 'dataapp'),       # ?
                  ('SUBSET_APP', 'subsetapp', 'subsetapp'),) # subset file

# Look up by frontend name
#
ROOK_APP_FRONTEND_LU = {info[1]: info for info in ROOK_APP_NAMES}


"""
Temp notes until new front end is integrated

zeligapp
 - app_ddi.js -> "function estimate(btn)"

subsetapp
 - app_ddi.js -> "subsetSelect(btn)"



"""
