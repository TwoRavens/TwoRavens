
import os

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.decomposition import PCA

data_input_path = os.path.abspath('./SBP')
data_output_path = os.path.abspath('./SBP_out')


ROWS = None
STEP = 1
THRESHOLD = 0.2

def get_auxiliary_data(step):
    data_path = os.path.join(data_input_path, 'Ground Truth', 'ground_truth_pgm', f'gt_s{step}.csv')
    aux = pd.read_csv(data_path, nrows=ROWS)
    aux['year-month'] = aux['year'].astype(str) + '-' + aux['month'].astype(str)
    return aux


def get_all_data(solvers, step):
    column_names = ("Ground Truth", *solvers)
    data = get_all_targets(column_names, step=step)
    aux = get_auxiliary_data(step=step)

    data = pd.concat([aux, pd.DataFrame(data, columns=column_names)], axis=1)

    return data


def analyze_correlations_cs(solvers):
    data = []
    for step in range(1, 7):
        step_data = get_all_data(solvers, step)
        # drop zeros
        step_data = step_data.loc[step_data['Ground Truth'] != 0.]
        data.append(step_data)
    data = pd.concat(data)

    for country_name, data_subset in data.groupby("country_name"):
        show_correlations(data_subset[["Ground Truth", *solvers]], title=country_name)


def check_is_auto_sklearn_constant():
    for step in range(1, 7):
        data = get_target("AutoSklearn", step)
        if np.min(data) != np.max(data):
            return False
    return True


def check_pca(data):
    pca = PCA(n_components=2)
    pca.fit(data)
    print("Explained variance", pca.explained_variance_)
    print("Singular values", pca.singular_values_)
    print("Components\n", pca.components_)


def save_error_data(solvers):
    step_data = []
    for step in range(1, 7):
        aux = get_auxiliary_data(step=step)
        errors = get_all_errors(solvers, step=step)

        joined = pd.concat([aux, pd.DataFrame(errors, columns=solvers)], axis=1)
        joined['poor fits'] = np.sum(np.abs(errors) > THRESHOLD, axis=1)

        # only keep errors
        joined = joined.loc[joined['poor fits'] > 0]
        joined['step'] = step

        step_data.append(joined)

    os.makedirs(data_output_path, exist_ok=True)
    pd.melt(
        pd.concat(step_data),
        id_vars=['country_name', 'year-month', 'step'],
        value_vars=solvers
    ).to_csv(os.path.join(data_output_path, "pgm-errors.csv"), index=False)


def cross_tabulate(aux, correct, cs_name):
    agg = pd.DataFrame({cs_name: aux[cs_name], 'correct': correct}) \
        .groupby([cs_name, 'correct']).size().unstack(fill_value=0.).reset_index()

    agg = pd.DataFrame({
        cs_name: agg[cs_name],
        'total': agg[True] + agg[False],
        '% correct': agg[True] / (agg[True] + agg[False]) * 100.
    }).sort_values(by='% correct').reset_index(drop=True)

    return agg


def check_all_cross_section(cs_name):
    cross_tabulations = []
    for step in range(1, 7):
        print('cross-tabulating step', step)
        errors = get_all_errors(solvers, step=step)
        fail_count = np.sum(np.abs(errors) > THRESHOLD, axis=1)

        # (5) what features are common in poorly-fit data?
        aux = get_auxiliary_data(step=step)

        correctly_predicted = fail_count == 0
        cross_tabulation = cross_tabulate(aux, correctly_predicted, cs_name)
        cross_tabulation['step'] = step

        cross_tabulations.append(cross_tabulation)

    cross_tabulations = pd.concat(cross_tabulations)

    # filter down to sections with worst predictive performance
    inaccurate_sections = cross_tabulations[[cs_name, '% correct']].groupby(cs_name) \
        .mean().sort_values(by='% correct').head(10).index.values

    cross_tabulations = cross_tabulations[
        cross_tabulations[cs_name].isin(inaccurate_sections)]

    sns.lineplot(x='step', y='% correct', hue=cs_name, data=cross_tabulations)
    plt.show()


if __name__ == '__main__':

    # check correlations among subsets (each country, each time step)
    # 1 page empirical difference amongst each system
    # plot ground truth on x axis, residuals on y, color by solver
    # drop zeros!
    # libya, nigeria should look different for each solver
    # KDD conference

    # all_data = get_all_data(["CMU", "H2O", "RandomForest", "TPOT"], 1)
    # all_data[all_data['Ground Truth'] > 1.].to_csv(os.path.join(data_output_path, "pgm-data-0.csv"), index=False)
    # analyze_correlations_cs(solvers)



    solvers = ["AutoSklearn", "CMU", "H2O", "RandomForest", "NYU", "TPOT"]

    # (1) NYU is not predicting, we have no data
    solvers.remove("NYU")

    # (2) sklearn is a constant model
    # print("Is AutoSklearn a constant model:", check_is_auto_sklearn_constant())
    solvers.remove("AutoSklearn")

    # (3) check errors
    errors = get_all_errors(solvers, step=STEP)

    # random forest has significantly more poor predictions
    is_poorly_fit = np.abs(errors) > THRESHOLD
    print("number of points poorly fit:\n\t",
          dict(zip(solvers, np.sum(is_poorly_fit, axis=0))))

    # (4) quantify spread between solvers
    fail_count = np.sum(is_poorly_fit, axis=1)
    print("failures to predict each point:\n\t",
          dict(zip(*np.unique(fail_count, return_counts=True))))
    print("number of models that predict two wrong\n\t",
          dict(zip(solvers, np.sum(is_poorly_fit[fail_count == 2], axis=0))))

    aux = get_auxiliary_data(step=STEP)

    correctly_predicted = fail_count == 0

    with pd.option_context('display.max_rows', None, 'display.max_columns', None):
        print('country_name', cross_tabulate(aux, correctly_predicted, 'country_name'))
        print('year-month', cross_tabulate(aux, correctly_predicted, 'year-month'))

    check_all_cross_section('country_name')


    # # (6) fit PCA
    # data = get_all_targets(solvers, step=STEP)
    # print("PCA on data")
    # check_pca(data)
    #
    # errors = get_all_errors(solvers, step=STEP)
    # print("PCA on errors")
    # check_pca(errors)
    #
    # # (7) save errors, load in tworavens
    save_error_data(solvers)
