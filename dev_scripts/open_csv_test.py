"""
Test script to load a .csv and save a D3M-style dataset
ref: https://gitlab.com/datadrivendiscovery/d3m/-/blob/devel/d3m/container/dataset.py#L1704
"""
import shutil

from d3m.container.dataset import CSVLoader
import os
from urllib import parse
loader = CSVLoader()

# Western Sahel Grid, 2010-2020
#
dataset = loader.load(\
    dataset_uri="file:///Users/ramanprasad/Desktop/pgm_grid.csv",
    dataset_id='western_sahel_grid_2010_2020',
    dataset_name='Western Sahel Grid, 2010-2020')

dataset.save(f"file:/Users/ramanprasad/Documents/github-rp/tworavens-test-datasets/Western_Sahel_Grid-2010_2020/TRAIN/dataset_TRAIN/datasetDoc.json")

# Western Sahel Grid Quarter, 2010-2020
#
dataset = loader.load(\
    dataset_uri="file:///Users/ramanprasad/Desktop/pgm_quarterly.csv",
    dataset_id='western_sahel_grid_quarter_2010_2020',
    dataset_name='Western Sahel Grid Quarter, 2010-2020')

dataset.save(f"file:/Users/ramanprasad/Documents/github-rp/tworavens-test-datasets/Western_Sahel_Grid-Quarter-2010_2020/TRAIN/dataset_TRAIN/datasetDoc.json")

#shutil.rmtree("/Users/michael/temp_dataset/", ignore_errors=True)
#
#uri = "file:/Users/michael/temp_dataset/datasetDoc.json"
#parsed = parse.urlparse(uri, allow_fragments=False)

#print(parsed.netloc)
#dataset.save(uri)
#print(dir(dataset.metadata))
#print(dataset.metadata.to_simple_structure()[0]['metadata']['name'])
