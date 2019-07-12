"""
Constants used to track the app names and url between the frontend and rook
"""

SOLA_JSON_KEY = 'solaJSON'
HEALTH_CHECK_APP = 'HEALTH_CHECK_APP'
MKDOCS_APP = 'MKDOCS_APP'

MKDOCS_ROOK_APP_NAME = 'mkdocsapp'
PREPROCESS_ROOK_APP_NAME = 'preprocessapp'
PARTIALS_ROOK_APP_NAME = 'partialsapp'

EXPLORE_APP = 'EXPLORE_APP'
PLOTDATA_APP = 'PLOTDATA_APP'
PARTIALS_APP = 'PARTIALS_APP'

# Used for tracking rook routing.
#
# Example ZELIG_APP is the constant used in logs
#
# format:  (app name, frontend url suffix, rook url suffix)
#
# example: ('ZELIG_APP', 'zeligapp', 'zeligapp')
#
#                   standard     frontend   backend
ROOK_APP_NAMES = [('DATA_APP', 'dataapp', 'dataapp'),       # session id?
                  (MKDOCS_APP, MKDOCS_ROOK_APP_NAME, MKDOCS_ROOK_APP_NAME), # subset file
                  ('SUBSET_APP', 'subsetapp', 'subsetapp'), # subset file
                  ('TRANSFORM_APP', 'transformapp', 'transformapp'), # transfor file

                  # preprocess
                  ('PREPROCESS_APP',
                   PREPROCESS_ROOK_APP_NAME,
                   PREPROCESS_ROOK_APP_NAME),

                  ('PIPELINE_APP', 'pipelineapp', 'pipelineapp'), # format pipeline
                  (EXPLORE_APP, 'exploreapp', 'exploreapp'),
                  ('SOLVER_APP', 'solverapp', 'solverapp'),
                  (PLOTDATA_APP, 'plotdataapp', 'plotdataapp'),
                  ('TREE_APP', 'treeapp', 'treeapp'),
                  ('ROOK_REPORT_APP', 'reportGeneratorApp', 'reportGeneratorApp'),
                  ('ROOK_FILES_APP', 'rook-files', 'rook-files'),
                  (HEALTH_CHECK_APP, 'healthcheckapp', 'healthcheckapp'), # healthcheckapp
                  #('ZELIG_APP', 'zeligapp', 'zeligapp'),    # run models
                  (PARTIALS_APP, PARTIALS_ROOK_APP_NAME, PARTIALS_ROOK_APP_NAME),  # construct partials dataset
                 ]

ROOK_APP_NAMES += [\
        ('PRIVATE_STATISTICS_APP',
         'privateStatisticsapp',
         'privateStatisticsapp'), # privacy 1
        ('PRIVATE_ACCURACIES_APP',
         'privateAccuraciesapp',
         'privateAccuraciesapp'),] # privacy 2

# Look up by frontend name, 2nd entry in triple
#
ROOK_APP_FRONTEND_LU = {info[1]: info for info in ROOK_APP_NAMES}

# Look up by name name, 1st entry in triple
#
ROOK_APP_NAME_LOOKUP = {info[0]: info for info in ROOK_APP_NAMES}

"""
Temp notes until new front end is integrated

zeligapp
 - app_ddi.js -> "function estimate(btn)"

subsetapp
 - app_ddi.js -> "subsetSelect(btn)"



"""
