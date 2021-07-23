
import os

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

data_input_path = os.path.abspath('./SBP')
data_output_path = os.path.abspath('./SBP_out')

ROWS = None


def get_target(source, step):
    """Returns target variable from source in a linear scale"""

    if source == "Ground Truth":
        file_name = f"gt_s{step}.csv"
    elif source in ["AutoSklearn", "TPOT"]:
        file_name = f"pred_s{step}.csv"
    else:
        file_name = f"pgm_s{step}_test_pred.csv"
    data_path = os.path.join(data_input_path, source, "DV_only", file_name)

    return np.exp(np.loadtxt(
        data_path,
        skiprows=1 if source in ["CMU", "Ground Truth", "H2O"] else 0,
        max_rows=ROWS)) - 1.


def get_targets(sources, step):
    return np.column_stack([get_target(source, step) for source in sources])


def get_residuals(solvers, step):
    return get_target("Ground Truth", step=step)[:, None] - get_targets(solvers, step=step)


def make_joined_dataset(getter, solvers):
    data = []
    for step in range(1, 7):
        step_data = pd.DataFrame(getter(solvers, step), columns=solvers)
        step_data['Ground Truth'] = get_target("Ground Truth", step)
        # drop zeros
        step_data = step_data.loc[step_data['Ground Truth'] != 0.]
        step_data['step'] = step
        data.append(step_data)
    return pd.concat(data)


def show_correlations(data, title):
    corr = data.corr()
    print(title)
    print(corr)
    print()

    sources = data.columns.values
    sns.heatmap(
        data=corr.loc[sources[1:], sources[:-1]],
        mask=np.triu(np.ones([len(sources) - 1] * 2, dtype=bool), k=1),
        square=True)
    if title:
        ax = plt.axes()
        ax.set_title(title)
    plt.show()


def show_lineplot(data, solvers, value_name, title=None):
    data = pd.melt(
        data,
        id_vars=['Ground Truth'],
        value_vars=solvers,
        var_name="solver",
        value_name=value_name)

    sns.lineplot(x='Ground Truth', y=value_name, hue="solver", data=data)
    if title:
        ax = plt.axes()
        ax.set_title(title)
    plt.show()


if __name__ == '__main__':
    solvers = ["CMU", "H2O", "RandomForest", "TPOT"]
    sources = ["Ground Truth", *solvers]

    print("Building target dataset")
    target_data = make_joined_dataset(get_targets, solvers)

    print("Building residuals dataset")
    residual_data = make_joined_dataset(get_residuals, solvers)

    print("Maximum predictions:")
    print(dict(zip(solvers, np.max(target_data[solvers], axis=0))))

    show_correlations(target_data[sources], title="Union of time steps")

    show_lineplot(residual_data, solvers, value_name="residuals", title="Residuals over union of time steps")
    show_lineplot(target_data.loc[target_data['Ground Truth'] < 10.], solvers, value_name="predicted", title="Predicted vs. actuals over union of time steps")
