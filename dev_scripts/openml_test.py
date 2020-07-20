import shutil

from d3m.container.dataset import OpenMLDatasetLoader
import os
from urllib import parse
loader = OpenMLDatasetLoader()
dataset = loader.load(dataset_uri="https://www.openml.org/d/31")
shutil.rmtree("/Users/michael/temp_dataset/", ignore_errors=True)

uri = "file:/Users/michael/temp_dataset/datasetDoc.json"
parsed = parse.urlparse(uri, allow_fragments=False)

print(parsed.netloc)
dataset.save(uri)
print(dir(dataset.metadata))
print(dataset.metadata.to_simple_structure()[0]['metadata']['name'])
