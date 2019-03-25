
```python
from io import BytesIO
import json
import os
import pandas as pd
from pprint import pprint
import requests
import zipfile

url = 'https://datamart.d3m.vida-nyu.org/search'
xdata = 'data/ny_taxi_demand_prediction.csv'

data = '/Users/ramanprasad/Documents/github-rp/TwoRavens/ravens_volume/test_data/examples_data_ny_taxi_demand_prediction.csv'


with open(data, 'rb') as data_p:
    response = requests.post(
        url,
        files={
            'data': data_p
        }
    )
response.raise_for_status()
query_results = response.json()['results']
```
