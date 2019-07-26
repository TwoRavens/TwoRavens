import sklearn.model_selection
import sklearn.datasets
import sklearn.metrics

import pandas

import os
import shutil
import uuid


def score(metric, actual, fitted):
    return {
        'accuracy': sklearn.metrics.accuracy_score,
        'recall': sklearn.metrics.recall_score,
        'precision': sklearn.metrics.precision_score
    }[metric](actual, fitted)


def fit_tpot(specification, fit_parameters):
    import tpot

    output_folder = os.path.join(*specification['results_path'].split('/'), 'output')

    # if os.path.exists(output_folder):
    #     shutil.rmtree(output_folder)

    data = pandas.read_csv(specification['dataset_path'])
    X = data[specification['problem']['predictors']]
    y = data[specification['problem']['target']]

    automl = {
        'regression': tpot.TPOTRegressor,
        'classification': tpot.TPOTClassifier
    }[specification['problem']['task']](**fit_parameters)

    automl.fit(X, y)

    responses = []
    # selected models along the cost-complexity vs accuracy frontier
    for model_str in automl.pareto_front_fitted_pipelines_:
        model = automl.pareto_front_fitted_pipelines_[model_str]

        actual_values = X[specification['problem']['target']]
        fitted_values = model.predict(X)

        data_pointer = os.path.join(output_folder, str(uuid.uuid4()) + '.csv')

        pandas.DataFrame(
            list(zip(range(len(X)), fitted_values)),
            columns=['index', specification['problem']['target']]) \
            .to_csv(data_pointer)

        summary = {
            'data_pointer': data_pointer,
            'scores': {
                metric: score(metric, fitted_values, actual_values) for metric in specification['metrics']
            },
            'description': model_str
        }

        responses.append(summary)

    return responses


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
        'dataset_path': '/ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv',
        'problem': {
            "target": "Doubles",
            "predictors": ["At_bats", "Triples"],
            "task": "regression"
        },
        'results_path': '/ravens_volume/test_output_auto_sklearn/185_baseball/',
        'data_stub': '185_baseball',
        'metrics': ['accuracy']
    }

    # specific to tpot
    fit_specification_tpot = {
        'generations': 5
    }

    results = fit_tpot(model_specification, fit_specification_tpot)
    print(results)
