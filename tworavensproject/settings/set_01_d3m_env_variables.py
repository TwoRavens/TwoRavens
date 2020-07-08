"""
D3M environment variables
 - Imported by the base.py settings file
 - Reference: https://datadrivendiscovery.org/wiki/display/work/Evaluation+Workflow

# NOTE: Datamart urls are loaded from env variables in datamart_info_util.load_from_env_variables()
"""
import os
from distutils.util import strtobool
from tworaven_apps.configurations import static_vals as cstatic

# D3MRUN - A label what is the setting under which the pod is being run; possible values: ta2, ta2ta3; this variable is available only for informative purposes but it is not used anymore to change an overall mode of operation of TA2 system because now TA2 evaluation will happen through TA2-TA3 API as well
D3MRUN = os.environ.get(cstatic.KEY_D3MRUN, 'ta2ta3')

# Currently unused by TwoRavens
# - TESTING (default, if DMC just tests pod configuration)
# - EVALUATION (during real evaluation)
# - PRODUCTION (if pod configuration is being used for demonstrations and other use by partners)
#
D3MCONTEXT = os.environ.get(cstatic.KEY_D3MCONTEXT, 'TESTING')

# D3MINPUTDIR - a location of dataset(s), can contain multiple datasets in arbitrary directory structure, read-only
#
D3MINPUTDIR = os.environ.get(cstatic.KEY_D3MINPUTDIR, None)

KEY_D3MSTATICDIR = 'D3MSTATICDIR'

# D3MPROBLEMPATH - a location to problem description to use (should be under D3MINPUTDIR), datasets are linked from the problem description using IDs, those datasets should exist inside D3MINPUTDIR
#
D3MPROBLEMPATH = os.environ.get(cstatic.KEY_D3MPROBLEMPATH, None)

# D3MOUTPUTDIR - a location of output files, shared by TA2 and TA3 pods (and probably data mart)
#
D3MOUTPUTDIR = os.environ.get(cstatic.KEY_D3MOUTPUTDIR, None)

# D3MLOCALDIR - a local-to-host directory provided; used by memory sharing mechanisms
#
D3MLOCALDIR = os.environ.get(cstatic.KEY_D3MLOCALDIR, None)

# D3MSTATICDIR - a path to the volume with primitives' static files
#
D3MSTATICDIR = os.environ.get(cstatic.KEY_D3MSTATICDIR, None)

# D3MCPU - available CPU units in Kubernetes specification
#
D3MCPU = os.environ.get('D3MCPU', None)

# D3MRAM - available memory units in Kubernetes specification
#
D3MRAM = os.environ.get('D3MRAM', None)

# D3MTIMEOUT - time limit for the search phase (available to the pod), in seconds
#
D3MTIMEOUT = os.environ.get('D3MTIMEOUT', None)
