# don't forget to install rpy2

import rpy2.robjects as robjects
import rpy2.rlike.container as rlc
import json

robjects.r.source("rookconfig.R")
robjects.r.source('rooksolver.R')
robjects.r.source('rookpreprocess.R')
robjects.r.source('preprocess/preprocess.R')


# convert nested python objects to nested R objects
def r_cast(content):
    # cast named lists
    if issubclass(dict, type(content)):
        return rlc.TaggedList(r_cast(list(content.values())), list(content.keys()))

    # cast typed lists
    if issubclass(list, type(content)):
        types = {type(value) for value in content}
        if len(types) == 1:
            return {
                str: robjects.vectors.StrVector,
                int: robjects.vectors.IntVector,
                float: robjects.vectors.FloatVector,
                bool: robjects.vectors.BoolVector
            }[next(iter(types))](content)
        return rlc.TaggedList([r_cast(i) for i in content], range(1, len(content) + 1))

    return content


def call_r_app(function, content):
    # R returns a singleton list of a json string
    return json.loads(robjects.globalenv[function](r_cast(content))[0])


# ~~~~~ USAGE ~~~~~~

# call preprocess app (call the rookPreprocess function in the global R environment)
print(call_r_app('rookPreprocess', {
    'data': '/ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv',
    'datastub': '185_baseball'
}))


# call solver app
print(call_r_app('rookSolver', {
    'dataset_path': '/ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv',
    'problem': {
        "targets": ["Doubles", "RBIs"],
        "predictors": ["At_bats", "Triples"],
        "task": "regression"
    },
    'method': 'lm'
}))
