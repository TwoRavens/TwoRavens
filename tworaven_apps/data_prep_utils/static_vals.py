
DATAMART_AUGMENT_PROCESS = 'DATAMART_AUGMENT_PROCESS'

# ----------------------------------------------
# Related to the "Add User Dataset" process
# ----------------------------------------------
ADD_USER_DATASET_PROCESS = 'ADD_USER_DATASET_PROCESS'
DATASET_NAME_FROM_UI = 'name'   # from dataset.js
DATASET_NAME = 'dataset_name'   # from dataset.js


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
# For createing a datasetDoc
# ----------------------------------------------
DATASET_SCHEMA_VERSION = '3.2.0'    # create a datasetDoc
PROBLEM_SCHEMA_VERSION = '3.2.0'

# Map Pandas types to the types used in the datasetDoc
#
DTYPES = {
    'int64': 'integer',
    'float64': 'real',
    'bool': 'boolean',
    'object': 'string',
    'datetime64': 'dateTime',
    'category': 'categorical'
}
