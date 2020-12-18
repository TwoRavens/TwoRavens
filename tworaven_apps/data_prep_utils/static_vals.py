
DATAMART_AUGMENT_PROCESS = 'DATAMART_AUGMENT_PROCESS'

# ----------------------------------------------
# Related to the "Add User Dataset" process
# ----------------------------------------------
ADD_USER_DATASET_PROCESS = 'ADD_USER_DATASET_PROCESS'
ADD_USER_DATASET_PROCESS_NO_WORKSPACE = 'ADD_USER_DATASET_PROCESS_NO_WORKSPACE'
NEW_DATASET_DOC_PATH = 'new_dataset_doc_path'

DATASET_NAME_FROM_UI = 'name'   # from dataset.js
DATASET_NAME = 'dataset_name'   # from dataset.js

SKIP_CREATE_NEW_CONFIG = 'SKIP_CREATE_NEW_CONFIG'

# ----------------------------------------------
# Extensions
# ----------------------------------------------
EXT_CSV = '.csv'
EXT_TAB = '.tab'
EXT_TSV = '.tsv'
EXT_XLS = '.xls'
EXT_XLSX = '.xlsx'

VALID_EXTENSIONS = (EXT_CSV,
                    EXT_TAB, EXT_TSV,
                    EXT_XLS, EXT_XLSX)

# ----------------------------------------------
# For creating a datasetDoc
# ----------------------------------------------
DATASET_SCHEMA_VERSION = '4.0.0'    # create a datasetDoc
PROBLEM_SCHEMA_VERSION = '4.0.0'

# Map Pandas types to the types used in the datasetDoc
# mapping from: https://pbpython.com/pandas_dtypes.html
#   -> https://gitlab.datadrivendiscovery.org/MIT-LL/d3m_data_supply/blob/shared/schemas/datasetSchema.json
DTYPES = {
    'int64': 'integer',
    'float64': 'real',
    'bool': 'boolean',
    'object': 'string',
    'datetime64': 'dateTime',
    'category': 'categorical'
}
