import pandas as pd
import shutil
import os
import json
import numpy as np
from dev_scripts.d3m_wrap_dataset import d3m_wrap_dataset

data_input_path = os.path.abspath('./germany_state.csv')

data_output_dir = os.path.abspath('/ravens_volume/test_data')
os.makedirs(data_output_dir, exist_ok=True)

d3m_wrap_dataset(
    data_output_dir,
    dataPaths=[data_input_path],
    about={
        'datasetName': 'TR103_germany_state',
    },
    problem={
        'targets': 'Robbery_Rate',
        'taskType': 'regression',
        'taskSubType': 'univariate',
    }
)