import requests
import json

def run_index_step1():

    index_url_01 = 'http://dsbox02.isi.edu:9000' + '/new/get_metadata_single_file'

    input_data = {
                   "title": "Quality of governance indicators",
                   "description": "Quality of governance indicators.  TwoRavens test dataset_004",
                   "materialization_arguments": {
                       "url": "http://metadata.2ravens.org/static/test-files/qog_vdem_indicators.csv",
                       "file_type": "csv"}}

    r = requests.post(\
            index_url_01,
            data=json.dumps(input_data),
            headers={'Content-Type': 'application/json'},
            verify=False)

    print('-' * 40)
    print('r.status_code', r.status_code)
    print('-' * 40)
    print('r.text', r.text)
    print('-' * 40)
    print(r.json())
    print('-' * 40)

def run_index_step2():
    index_url_02 = 'http://dsbox02.isi.edu:9000' + '/new/upload_metadata_list'

    index_data = get_index_data()

    r = requests.post(\
            index_url_02,
            data=index_data.encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            verify=False)

    print('-' * 40)
    print('r.status_code', r.status_code)
    print('-' * 40)
    print('r.text', r.text)
    print('-' * 40)
    print(r.json())
    print('-' * 40)

def get_index_data():
    return """{
    "code": "0000",
    "message": "Success",
    "data": [
        {
            "datamart_id": 0,
            "title": "Quality of governance indicators",
            "description": "Quality of governance indicators.  TwoRavens test dataset_004",
            "url": "http://metadata.2ravens.org/static/test-files/qog_vdem_indicators.csv",
            "materialization": {
                "python_path": "general_materializer",
                "arguments": {
                    "url": "http://metadata.2ravens.org/static/test-files/qog_vdem_indicators.csv",
                    "file_type": "csv",
                    "index": 0
                }
            },
            "variables": [
                {
                    "datamart_id": 1,
                    "semantic_type": [],
                    "name": "vdem_delibdem",
                    "description": "column name: vdem_delibdem, dtype: float64"
                },
                {
                    "datamart_id": 2,
                    "semantic_type": [],
                    "name": "vdem_egaldem",
                    "description": "column name: vdem_egaldem, dtype: float64"
                },
                {
                    "datamart_id": 3,
                    "semantic_type": [],
                    "name": "vdem_gender",
                    "description": "column name: vdem_gender, dtype: float64"
                },
                {
                    "datamart_id": 4,
                    "semantic_type": [],
                    "name": "vdem_libdem",
                    "description": "column name: vdem_libdem, dtype: float64"
                },
                {
                    "datamart_id": 5,
                    "semantic_type": [],
                    "name": "vdem_mecorrpt",
                    "description": "column name: vdem_mecorrpt, dtype: float64"
                },
                {
                    "datamart_id": 6,
                    "semantic_type": [],
                    "name": "vdem_partipdem",
                    "description": "column name: vdem_partipdem, dtype: float64"
                },
                {
                    "datamart_id": 7,
                    "semantic_type": [],
                    "name": "vdem_polyarchy",
                    "description": "column name: vdem_polyarchy, dtype: float64"
                },
                {
                    "datamart_id": 8,
                    "semantic_type": [],
                    "name": "mycode",
                    "description": "column name: mycode, dtype: int64"
                },
                {
                    "datamart_id": 9,
                    "semantic_type": [],
                    "name": "year",
                    "description": "column name: year, dtype: int64",
                    "temporal_coverage": {
                        "start": "1946-05-08T00:00:00",
                        "end": "2017-05-08T00:00:00"
                    }
                }
            ],
            "keywords": [
                "vdem_delibdem",
                "vdem_egaldem",
                "vdem_gender",
                "vdem_libdem",
                "vdem_mecorrpt",
                "vdem_partipdem",
                "vdem_polyarchy",
                "mycode",
                "year",
                "TwoRavensTestDataset"
            ]
        }
    ]
}"""

    return """{"datamart_id":0,"title":"Quality of governance indicators","url":"http://metadata.2ravens.org/static/test-files/qog_vdem_indicators.csv","materialization":{"python_path":"general_materializer","arguments":{"url":"http://metadata.2ravens.org/static/test-files/qog_vdem_indicators.csv","file_type":"csv","index":0}},"variables":[{"datamart_id":1,"semantic_type":[],"name":"vdem_delibdem","description":"column name: vdem_delibdem, dtype: float64"},{"datamart_id":2,"semantic_type":[],"name":"vdem_egaldem","description":"column name: vdem_egaldem, dtype: float64"},{"datamart_id":3,"semantic_type":[],"name":"vdem_gender","description":"column name: vdem_gender, dtype: float64"},{"datamart_id":4,"semantic_type":[],"name":"vdem_libdem","description":"column name: vdem_libdem, dtype: float64"},{"datamart_id":5,"semantic_type":[],"name":"vdem_mecorrpt","description":"column name: vdem_mecorrpt, dtype: float64"},{"datamart_id":6,"semantic_type":[],"name":"vdem_partipdem","description":"column name: vdem_partipdem, dtype: float64"},{"datamart_id":7,"semantic_type":[],"name":"vdem_polyarchy","description":"column name: vdem_polyarchy, dtype: float64"},{"datamart_id":8,"semantic_type":[],"name":"mycode","description":"column name: mycode, dtype: int64"},{"datamart_id":9,"semantic_type":[],"name":"year","description":"column name: year, dtype: int64","temporal_coverage":{"start":"1946-05-08T00:00:00","end":"2017-05-08T00:00:00"}}],"description":"Quality of governance indicators.  TwoRavens test dataset_003","keywords":["Quality","Governance","Indicators","TwoRavensDataset"]}"""

if __name__ == '__main__':
    #run_index_step1()
    run_index_step2()
