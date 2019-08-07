import sklearn.model_selection
import sklearn.datasets
import sklearn.metrics

import pandas

import os
import uuid


def solve_tpot(specification, fit_parameters):
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
