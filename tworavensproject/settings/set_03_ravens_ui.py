"""
Settings for the D3M TA2 solver and wrapped solvers
- Set which solvers are available in the UI
"""
import ast
import os
from distutils.util import strtobool

# -------------------------------------
# Is the D3M TA2 solver enabled?
# -------------------------------------
TA2_D3M_SOLVER_ENABLED = strtobool(os.environ.get('TA2_D3M_SOLVER_ENABLED', 'True'))


# -------------------------------------
# Set the list of Wrapped Solvers
#
# Example of setting by env variable:
#   export TA2_WRAPPED_SOLVERS='["mlbox", "tpot", "two-ravens"]'
#
# -------------------------------------
TA2_WRAPPED_SOLVERS_ALL = [
    #"auto_sklearn",
    # "caret",
    # "h2o",
    #"ludwig",
    "mlbox",
    "tpot",
    "two-ravens"
]
TA2_WRAPPED_SOLVERS = ast.literal_eval(\
                    os.environ.get('TA2_WRAPPED_SOLVERS', str(TA2_WRAPPED_SOLVERS_ALL)))


if not isinstance(TA2_WRAPPED_SOLVERS, list):
    TA2_WRAPPED_SOLVERS = []

# -------------------------
# Dataset Mode
# -------------------------
DATASET_SHOW_TAB_PRESETS = bool(strtobool(os.environ.get('DATASET_SHOW_TAB_PRESETS', 'True')))
DATASET_SHOW_TAB_UPLOAD = bool(strtobool(os.environ.get('DATASET_SHOW_TAB_UPLOAD', 'True')))
DATASET_SHOW_TAB_ONLINE = bool(strtobool(os.environ.get('DATASET_SHOW_TAB_ONLINE', 'True')))

# -------------------------
# Datamart related
# -------------------------
# passed as a boolean to .js
DISPLAY_DATAMART_UI = bool(strtobool(os.environ.get('DISPLAY_DATAMART_UI', 'True')))


DATAMART_SHORT_TIMEOUT = 10 # seconds
DATAMART_LONG_TIMEOUT = 5 * 60 # 5 minutes
DATAMART_VERY_LONG_TIMEOUT = 10 * 60 # 8 minutes

SORT_BY_GATES_DATASETS = strtobool(os.environ.get('SORT_BY_GATES_DATASETS', 'False'))
