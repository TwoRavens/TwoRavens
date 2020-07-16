import requests
import json
from urllib.parse import quote

# dataset_path = "/Users/michael/TwoRavens/ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv"
dataset_path = "/Users/michael/TwoRavens/ravens_volume/test_data/10_state_immigration/TRAIN/dataset_TRAIN/tables/learningData.csv"
nyu_datamart_api_url = "https://auctus.vida-nyu.org/api/v1"
nyu_datamart_url = "https://auctus.vida-nyu.org"

# profile the data and get a data_token
token = requests.post(
    nyu_datamart_api_url + '/profile',
    files={"data": open(dataset_path, 'r')}).json()['token']

# start a new session
session = requests.post(
    nyu_datamart_api_url + '/session/new',
    json={
        "data_token": token,
        "format": "d3m",
        "system_name": "TwoRavens"
    }).json()

print("Follow this link to conduct an augmentation/merge:")
query = {"relatedFile": {"kind": "localFile", "token": token}}
print(f"{nyu_datamart_url}{session['link_url']}")

input("Press Enter after merging.")

print("All datasets available in the session:")
print(requests.get(f"{nyu_datamart_api_url}/session/{session['session_id']}").json())
