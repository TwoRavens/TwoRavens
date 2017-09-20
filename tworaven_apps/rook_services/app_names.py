"""
Constants used to track the app names and url between the frontend and rook
"""

HEALTH_CHECK_APP = 'HEALTH_CHECK_APP'

# Used for tracking the routing.
#
# Example ZELIG_APP is the constant used in logs
#
# format:  (app name, frontend url suffix, rook url suffix)
#
# example: ('ZELIG_APP', 'zeligapp', 'zeligapp')
#
#                   standard     frontend   backend
ROOK_APP_NAMES = [('ZELIG_APP', 'zeligapp', 'zeligapp'),    # run models
                  ('DATA_APP', 'dataapp', 'dataapp'),       # session id?
                  ('SUBSET_APP', 'subsetapp', 'subsetapp'), # subset file
                  ('TRANSFORM_APP', 'transformapp', 'transformapp'), # transfor file
                  ('PREPROCESS_APP', 'preprocessapp', 'preprocessapp'), # preprocess
                  ('PIPELINE_APP', 'pipelineapp', 'pipelineapp'), # format pipeline
                  (HEALTH_CHECK_APP, 'healthcheckapp', 'healthcheckapp'), # format pipeline
                 ]

ROOK_APP_NAMES += [\
        ('PRIVATE_STATISTICS_APP',
         'privateStatisticsapp',
         'privateStatisticsapp'), # privacy 1
        ('PRIVATE_ACCURACIES_APP',
         'privateAccuraciesapp',
         'privateAccuraciesapp'),] # privacy 2

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
