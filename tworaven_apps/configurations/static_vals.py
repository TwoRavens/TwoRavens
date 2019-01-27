
# For the winter 2019 config
#   Based on 1/2019 version of https://datadrivendiscovery.org/wiki/display/work/Evaluation+Workflow
#
D3M_VARIABLE_LIST = (\
                'D3MRUN',
                'D3MINPUTDIR',
                'D3MPROBLEMPATH',
                'D3MOUTPUTDIR',
                'D3MLOCALDIR',
                'D3MSTATICDIR',
                'D3MCPU',
                'D3MRAM',
                'D3MTIMEOUT')
                
D3M_DIRECTORY_VARIABLES = (\
                'D3MINPUTDIR',
                #'D3MPROBLEMPATH',
                'D3MOUTPUTDIR',
                'D3MLOCALDIR',
                'D3MSTATICDIR',)

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

        'additional_inputs', # additional_inputs - a directory where TA2 system
        # can store any additional datasets to be provided during training and
        # testing to their pipelines; each dataset should be provided in a
        # sub-directory in a D3M dataset format; all datasets here should
        # have an unique ID; in the case that additional datasets are provided,
        # TA2 should output also pipeline run documents for their ranked pipe)
                            )
