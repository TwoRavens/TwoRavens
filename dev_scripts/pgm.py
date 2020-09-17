import os
from dev_scripts.d3m_wrap_dataset import d3m_wrap_dataset

data_input_dir = os.path.abspath('./pgm/')
os.makedirs(data_input_dir, exist_ok=True)

data_output_dir = os.path.abspath('/ravens_volume/test_data')
os.makedirs(data_output_dir, exist_ok=True)


def wrap_pgm_grid_samp():
    d3m_wrap_dataset(
        data_output_dir,
        dataPaths=[os.path.join(data_input_dir, 'pgm_grid_samp.csv')],
        about={
            'datasetName': 'TR92_pgm_grid_samp',
        },
        problem={
            'targets': ['any_violence'],
            'time': ['year'],
            'metrics': ['rocAuc', 'accuracy', 'precision', 'recall', 'f1'],
            'taskKeywords': ['classification', 'binary']
        })


def wrap_pgm_quarterly():
    d3m_wrap_dataset(
        data_output_dir,
        dataPaths=[os.path.join(data_input_dir, 'pgm_quarterly.csv')],
        about={
            'datasetName': 'TR93_pgm_quarterly',
        },
        problem={
            'targets': ['lead_log_violence'],
            'time': ['month'],
            'metrics': ['meanSquaredError'],
            'taskKeywords': ['regression']
        })

wrap_pgm_grid_samp()
wrap_pgm_quarterly()
