# wrap DARPA world modeler's export in DARPA D3M format
import json
import os

import pandas

DTYPES = {
    int: 'integer',
    float: 'real',
    bool: 'boolean',
    str: 'categorical'
}
PD_DTYPES = {
    'int64': 'integer',
    'float64': 'real',
    'bool': 'boolean',
    'object': 'string',
    'datetime64': 'dateTime',
    'category': 'categorical'
}

def d3m_wrap_wm(wm_data_path, output_dir):
    with open(wm_data_path, 'r') as wm_data_file:
        wm_data = json.load(wm_data_file)

    # assign names to each variable
    concepts = {}
    for full_concept_name in wm_data['conceptIndicators']:
        depth = 1
        while True:
            concept_name = '/'.join(full_concept_name.split('/')[-depth:])
            if concept_name not in concepts:
                concepts[concept_name] = wm_data['conceptIndicators'][full_concept_name]
                concepts[concept_name]['full_concept_name'] = full_concept_name
                # rename all that share trailing name to be the same depth
                for other_concept_name in list(concepts):
                    if concept_name == other_concept_name:
                        continue
                    if concept_name.endswith(other_concept_name):
                        other_full_concept_name = concepts[other_concept_name]['full_concept_name']
                        new_concept_name = '/'.join(other_full_concept_name.split('/')[-depth:])
                        concepts[new_concept_name] = concepts[other_concept_name]
                        del concepts[other_concept_name]

                break
            depth += 1

    # construct pandas dataframe
    timestamps = {}
    for concept_name in concepts:
        for row in concepts[concept_name]['values']:
            if row['timestamp'] not in timestamps:
                base_row = dict(row)
                del base_row['value']
                timestamps[row['timestamp']] = base_row
            timestamps[row['timestamp']][concept_name] = row['value']

    data = pandas.DataFrame.from_records(list(timestamps.values()))
    data.index.name = 'd3mIndex'

    output_data_path = os.path.join(output_dir, 'TRAIN', 'dataset_TRAIN', 'tables', 'learningData.csv')
    os.makedirs(os.path.dirname(output_data_path), exist_ok=True)
    data.to_csv(output_data_path)

    columns = []
    columns.append({
        "colIndex": 0,
        "colName": 'd3mIndex',
        "colType": "integer",
        "role": [
            "index"
        ]
    })
    for idx, (column, dtype) in enumerate(zip(data.columns, data.dtypes)):
        if column in concepts:
            col_type = DTYPES.get(type(concepts[column]['values'][0]['value']), None)
            del concepts[column]['values']
            columns.append({
                "colIndex": idx + 1,
                "colName": column,
                "colType": col_type,
                "role": ["attribute"],
                "worldModelers": concepts[column]
            })
        else:
            columns.append({
                "colIndex": idx + 1,
                "colName": column,
                "colType": PD_DTYPES.get(str(dtype), None),
                "role": ["attribute"]
            })

    # make datasetDoc
    dataset_schema = {
        "about": {
            "datasetID": os.path.basename(output_dir),
            "datasetName": "NULL",
            "datasetSchemaVersion": "4.0.0",
            "datasetVersion": "4.0.0"
        },
        "dataResources": [
            {
                "resID": "learningData",
                "resPath": "tables/learningData.csv",
                "resType": "table",
                "resFormat": {
                    "text/csv": [
                        "csv"
                    ]
                },
                "isCollection": False,
                "columns": columns
            }
        ]
    }

    problem_schema_path = os.path.join(output_dir, 'TRAIN', 'dataset_TRAIN', 'datasetDoc.json')
    with open(problem_schema_path, 'w') as problem_schema_file:
        json.dump(dataset_schema, problem_schema_file, indent=4)

    problem_schema = {
        "about": {
            "problemID": wm_data['meta']['modelName'],
            "problemName": wm_data['meta']['modelName'],
            "problemVersion": "4.0.0",
            "problemSchemaVersion": "4.0.0",
            "taskKeywords": []
        },
        "inputs": {
            "data": [
                {
                    "datasetID": os.path.basename(output_dir),
                    "targets": []
                }
            ]
        },
        "statements": wm_data['statements']
    }

    problem_schema_path = os.path.join(output_dir, 'TRAIN', 'problem_TRAIN', 'problemDoc.json')
    os.makedirs(os.path.dirname(problem_schema_path), exist_ok=True)
    with open(problem_schema_path, 'w') as problem_schema_file:
        json.dump(problem_schema, problem_schema_file, indent=4)


d3m_wrap_wm(
    '/Users/michael/TwoRavens/dev_scripts/world_modelers/food.json',
    '/Users/michael/TwoRavens/ravens_volume/test_data/WM_food')
