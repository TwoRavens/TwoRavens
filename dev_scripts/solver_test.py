import requests
import json


# print(requests.post('http://localhost:8000/custom/solverapp', data={
#     'problem': json.dumps({
#         'targets': ['Hits'],
#         'predictors': ['Doubles', 'Triples', 'Strikeouts'],
#         'task': 'regression',
#     }),
#     'dataset_path': '/ravens_volume/test_data/185_baseball/SCORE/dataset_TEST/tables/learningData.csv',
#     # 'hyperparameters': json.dumps({})
# }).text)



print(requests.post('http://localhost:8000/custom/solverapp', data={
    'problem': json.dumps({
        'targets': ['Hall_of_Fame'],
        'predictors': ['Doubles'],
        'task': 'classification',
    }),
    'dataset_path': '/ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv',
    # 'hyperparameters': json.dumps({})
}).text)
