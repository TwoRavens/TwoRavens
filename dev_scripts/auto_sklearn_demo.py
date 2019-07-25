import sklearn.model_selection
import sklearn.datasets
import sklearn.metrics

import pandas

import os
import shutil


def fit_tpot(specification):
    import tpot

    data = pandas.read_csv(specification['dataset_path'])
    X = data[specification['problem']['predictors']]
    y = data[specification['problem']['target']]

    X_train, X_test, y_train, y_test = \
        sklearn.model_selection.train_test_split(X, y, random_state=1)

    fit_parameters = {
        'generations': 5,

    }

    automl = {
        'regression': tpot.TPOTRegressor,
        'classification': tpot.TPOTClassifier
    }[specification['problem']['task']](**fit_parameters)

    automl.fit(X_train, y_train)

    return automl


def fit_auto_sklearn(specification):
    import autosklearn.classification
    import autosklearn.regression

    data = pandas.read_csv(specification['dataset_path'])
    X = data[specification['problem']['predictors']]
    y = data[specification['problem']['target']]

    X_train, X_test, y_train, y_test = \
        sklearn.model_selection.train_test_split(X, y, random_state=1)

    tmp_folder = os.path.join(*specification['results_path'].split('/'), 'temp')
    output_folder = os.path.join(*specification['results_path'].split('/'), 'output')

    if os.path.exists(tmp_folder):
        shutil.rmtree(tmp_folder)
    if os.path.exists(output_folder):
        shutil.rmtree(output_folder)

    fit_parameters = {
        'time_left_for_this_task': 30,
        'per_run_time_limit': 20,
        'delete_tmp_folder_after_terminate': False,
        'tmp_folder': tmp_folder,
        'output_folder': output_folder
    }

    automl = {
        'regression': autosklearn.regression.AutoSklearnRegressor,
        'classification': autosklearn.classification.AutoSklearnClassifier
    }[specification['problem']['task']](**fit_parameters)

    automl.fit(X_train, y_train, dataset_name=specification['data_stub'])

    return automl


if __name__ == '__main__':
    model_specification = {
        'dataset_path': 'ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv',
        'problem': {
            "target": "Doubles",
            "predictors": ["At_bats", "Triples"],
            "task": "regression"
        },
        'results_path': 'ravens_volume/test_output_auto_sklearn/185_baseball/',
        'data_stub': '185_baseball'
    }

    automl = fit_auto_sklearn(model_specification)
