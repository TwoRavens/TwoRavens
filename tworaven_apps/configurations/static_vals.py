from os.path import join

# For the winter 2019 config
#   Based on 1/2019 version of https://datadrivendiscovery.org/wiki/display/work/Evaluation+Workflow
#
KEY_TA2TA3 = 'ta2ta3'
KEY_D3MINPUTDIR = 'D3MINPUTDIR'
KEY_D3MPROBLEMPATH = 'D3MPROBLEMPATH'
D3M_VARIABLE_LIST = (\
                'D3MRUN',
                KEY_D3MINPUTDIR,
                KEY_D3MPROBLEMPATH,
                'D3MOUTPUTDIR',
                'D3MLOCALDIR',
                'D3MSTATICDIR',
                'D3MCPU',
                'D3MRAM',
                'D3MTIMEOUT')

D3M_REQUIRED_VARIABLES = list(D3M_VARIABLE_LIST)
D3M_REQUIRED_VARIABLES.remove(KEY_D3MPROBLEMPATH)

KEY_D3MLOCALDIR = 'D3MLOCALDIR'
KEY_D3MSTATICDIR = 'D3MSTATICDIR'

D3M_DIRECTORY_VARIABLES = (\
                'D3MINPUTDIR',
                #'D3MPROBLEMPATH',
                'D3MOUTPUTDIR',
                'D3MLOCALDIR',
                'D3MSTATICDIR',)


KEY_D3M_DIR_ADDITIONAL_INPUTS = 'additional_inputs'

KEY_D3M_USER_PROBLEMS_ROOT = 'user_problems_root'
USER_PROBLEMS_ROOT_DIR_NAME = 'problems'  # for /output/problems

D3M_OUTPUT_SUBDIRECTORIES = (\
        'pipelines_ranked', # a directory with ranked pipelines to be evaluated,
        # named <pipeline id>.json; these files should have additional
        #field pipeline_rank

        'pipelines_scored', # a directory with successfully scored pipelines
        #during the search, named <pipeline id>.json

        'pipelines_searched', #a directory of full pipelines which have not
        #been scored or ranked for any reason, named <pipeline id>.json

        'subpipelines', # a directory with any subpipelines referenced
        #from pipelines in pipelines_* directories, named <pipeline id>.json

        'pipeline_runs', # a directory with pipeline run records in YAML format,
        # multiple can be stored in the same file, named <pipeline run id>.yml

        KEY_D3M_DIR_ADDITIONAL_INPUTS, # additional_inputs - a directory where TA2 system
        # can store any additional datasets to be provided during training and
        # testing to their pipelines; each dataset should be provided in a
        # sub-directory in a D3M dataset format; all datasets here should
        # have an unique ID; in the case that additional datasets are provided,
        # TA2 should output also pipeline run documents for their ranked pipe)

        USER_PROBLEMS_ROOT_DIR_NAME, # self-added to coincide with user_problems_root
                            )
