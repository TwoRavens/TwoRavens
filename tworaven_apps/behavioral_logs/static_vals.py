
# Behavioral log values
#

KEY_L1_ACTIVITY = 'activity_l1'
KEY_L2_ACTIVITY = 'activity_l2'

# -------------------------
# "type" values
# -------------------------
ENTRY_TYPE_TA23API = 'TA23API' #'TA23API'
ENTRY_TYPE_DATAMART = 'DATAMART'
ENTRY_TYPE_SYSTEM = 'SYSTEM'
ENTRY_TYPE_UNKNOWN = 'UNKNOWN'

ENTRY_TYPES = (ENTRY_TYPE_TA23API,
               ENTRY_TYPE_DATAMART,
               ENTRY_TYPE_SYSTEM)

ENTRY_TYPE_CHOICES = ((x, x) for x in ENTRY_TYPES)

# -------------------------
# "activity_l1" values
# -------------------------
L1_SYSTEM_ACTIVITY = 'SYSTEM_ACTIVITY'

# -----------------------------------
# DATA_PREPARATION: L1 & L2
# -----------------------------------
L1_DATA_PREPARATION = 'DATA_PREPARATION'

L2_APP_LAUNCH = 'APP_LAUNCH'
L2_DATA_OPEN = 'DATA_OPEN'
L2_DATA_EXPLORE = 'DATA_EXPLORE'
L2_DATA_AUGMENT = 'DATA_AUGMENT'
L2_DATA_TRANSFORM = 'DATA_TRANSFORM'


# -----------------------------------
# PROBLEM_DEFINITION: L1 & L2
# -----------------------------------
L1_PROBLEM_DEFINITION = 'PROBLEM_DEFINITION'

L2_PROBLEM_SPECIFICATION = 'PROBLEM_SPECIFICATION'

# -----------------------------------
# MODEL_SELECTION: L1 & L2
# -----------------------------------
L1_MODEL_SELECTION = 'MODEL_SELECTION'

L2_MODEL_SUMMARIZATION = 'MODEL_SUMMARIZATION'
L2_MODEL_COMPARISON = 'MODEL_COMPARISON'
L2_MODEL_EXPLANATION = 'MODEL_EXPLANATION'
L2_MODEL_EXPORT = 'MODEL_EXPORT'


L1_ACTIVITIES = (L1_SYSTEM_ACTIVITY,
                 L1_DATA_PREPARATION,
                 L1_PROBLEM_DEFINITION,
                 L1_MODEL_SELECTION)

L1_ACTIVITY_CHOICES = ((x, x) for x in L1_ACTIVITIES)

# -------------------------
# "activity_l2" values
# -------------------------
L2_ACTIVITY_BLANK = '(blank)'

L2_DATA_SEARCH = 'DATA_SEARCH'
L2_DATA_DOWNLOAD = 'DATA_DOWNLOAD'


L2_MODEL_SEARCH = 'MODEL_SEARCH'

L2_PROBLEM_SEARCH_SELECTION = 'PROBLEM_SEARCH_SELECTION'

# -------------------------
# "feature_id" values
# -------------------------
# These are no custom: not necessarily in this file
# and don't conform to other D3M systesm
FID_START_RAVENS_PEBBLES_PAGE = 'START_RAVENS_PEBBLES_PAGE'
