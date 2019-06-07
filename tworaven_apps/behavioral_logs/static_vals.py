
# Behavioral log values
#

# -------------------------
# "type" values
# -------------------------
ENTRY_TYPE_TA23API = 'TA23API'
ENTRY_TYPE_DATAMART = 'DATAMART'
ENTRY_TYPE_SYSTEM = 'SYSTEM'
ENTRY_TYPE_UNKNOWN = 'SYSTEM'

ENTRY_TYPES = (ENTRY_TYPE_TA23API,
               ENTRY_TYPE_DATAMART,
               ENTRY_TYPE_SYSTEM)

ENTRY_TYPE_CHOICES = ((x, x) for x in ENTRY_TYPES)

# -------------------------
# "activity_l1" values
# -------------------------
L1_ACTIVITY_DATA_PREPARATION = 'DATA_PREPARATION'
L1_ACTIVITY_PROBLEM_DEFINITION = 'PROBLEM_DEFINITION'
L1_ACTIVITY_MODEL_SELECTION = 'MODEL_SELECTION'

L1_ACTIVITIES = (L1_ACTIVITY_DATA_PREPARATION,
                 L1_ACTIVITY_PROBLEM_DEFINITION,
                 L1_ACTIVITY_MODEL_SELECTION)

L1_ACTIVITY_CHOICES = ((x, x) for x in L1_ACTIVITIES)

# -------------------------
# "activity_l2" values
# -------------------------
L2_ACTIVITY_BLANK = '(blank)'
