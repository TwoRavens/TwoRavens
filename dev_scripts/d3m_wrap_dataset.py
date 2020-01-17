import json
import pandas as pd
import hashlib
import os

# mapping from: https://pbpython.com/pandas_dtypes.html
#   -> https://gitlab.datadrivendiscovery.org/MIT-LL/d3m_data_supply/blob/shared/schemas/datasetSchema.json
DTYPES = {
    'int64': 'integer',
    'float64': 'real',
    'bool': 'boolean',
    'object': 'string',
    'datetime64': 'dateTime',
    'category': 'categorical'
}

DSV_EXTENSIONS = ['.csv', '.tsv', '.xlsx', '.xls']

DATASET_SCHEMA_VERSION = '4.0.0'
PROBLEM_SCHEMA_VERSION = '4.0.0'


def d3m_wrap_dataset(outputDir, dataPaths, about, problem):
    problem = problem or {}
    targets = problem.get('targets', [])

    datasetID = about['datasetName'].replace(' ', '_')
    datasetPath = os.path.join(outputDir, datasetID)

    datasetDir = os.path.join(datasetPath, 'TRAIN', 'dataset_TRAIN')
    problemDir = os.path.join(datasetPath, 'TRAIN', 'problem_TRAIN')

    os.makedirs(datasetDir, exist_ok=True)
    os.makedirs(problemDir, exist_ok=True)

    # construct a mapping to output paths
    outDataPaths = {}
    for dataPath in dataPaths:
        offset = 1
        if os.path.splitext(dataPath)[1] in DSV_EXTENSIONS:
            # filename, extension = os.path.splitext(os.path.basename(dataPath))
            # TODO: disable this line once paths aren't hardcoded to 'learningData'
            filename = 'learningData'

            candidateName = os.path.join('tables', filename + '.csv')
            while candidateName in outDataPaths:
                offset += 1
                filename, extension = os.path.splitext(os.path.basename(dataPath))
                candidateName = os.path.join('tables', filename + offset + '.csv')

            outDataPaths[candidateName] = dataPath

    def infer_roles(column_name):
        roles = []
        if column_name == 'd3mIndex':
            roles.append('index')
        elif column_name in targets:
            roles.append('suggestedTarget')
        else:
            roles.append('attribute')

        if column_name in problem.get('time', []):
            roles.append('timeIndicator')
        return roles

    targetConfigs = []
    # individually load, index, analyze, and save each dataset
    resourceConfigs = []
    for resIndex, outDataPath in enumerate(outDataPaths):
        data = d3m_load_resource(outDataPaths[outDataPath])
        if issubclass(type(data), pd.DataFrame):

            resourceID = os.path.splitext(os.path.basename(outDataPath))[0]

            columnConfigs = []
            for colIndex, (colName, colType) in enumerate(zip(data.columns.values, data.dtypes)):
                columnConfig = {
                    'colIndex': colIndex,
                    'colName': colName,
                    'colType': DTYPES.get(str(colType), None) or 'unknown',
                    'role': infer_roles(colName)
                }
                columnConfigs.append(columnConfig)
                if columnConfig['role'][0] == 'suggestedTarget':
                    targetConfigs.append({
                        'resID': resourceID,
                        'colIndex': colIndex,
                        'colName': colName
                    })

            resourceConfigs.append({
                'resID': resourceID,
                'resPath': outDataPath,
                'resType': 'table',
                'resFormat': ['text/csv'],
                'isCollection': False,
                'columns': [
                    {
                        'colIndex': i,
                        'colName': column[0],
                        'colType': DTYPES.get(str(column[1]), None) or 'unknown',
                        'role': infer_roles(column[0])
                    } for i, column in enumerate(zip(data.columns.values, data.dtypes))
                ]
            })

            # TODO: one splitfile is repeatedly overwritten
            with open(os.path.join(problemDir, 'dataSplits.json'), 'w') as splitFile:
                splitFile.write('d3mIndex,type,repeat,fold\n')
                for i in range(len(data)):
                    splitFile.write(str(i) + ',TRAIN,0,0' + '\n')

        fullDataPath = os.path.join(datasetDir, outDataPath)
        os.makedirs(os.path.dirname(fullDataPath), exist_ok=True)
        data.to_csv(fullDataPath, index=False)

    # write dataset config
    with open(os.path.join(datasetDir, 'datasetDoc.json'), 'w') as datasetDoc:
        datasetDoc.write(json.dumps({
            'about': {**{
                'datasetID': datasetID,
                'datasetSchemaVersion': DATASET_SCHEMA_VERSION,
                'redacted': True,
                'digest': hashlib.sha256(about['datasetName'].encode()).hexdigest()
            }, **about},
            'dataResources': resourceConfigs
        }, indent=4))

    # write problem
    with open(os.path.join(problemDir, 'problemDoc.json'), 'w') as problemDoc:
        problemID = problem.get('problemName', datasetID + '_problem_TRAIN')
        problemDoc.write(json.dumps({
            'about': {
                'problemID': problemID,
                'problemName': problem.get('problemName', about['datasetName'] + ' problem'),
                'taskKeywords': problem.get('taskKeywords', ['classification']),
                'problemSchemaVersion': PROBLEM_SCHEMA_VERSION,
                'problemVersion': '1.0'
            },
            'inputs': {
                'data': [{
                    'datasetID': datasetID,
                    'targets': [
                        {**{'targetIndex': targetIndex}, **target} for targetIndex, target in enumerate(targetConfigs)
                    ]
                }],
                'dataSplits': problem.get('dataSplits', {
                    "method": "holdOut",
                    "testSize": 0.35,
                    "stratified": False,
                    "numRepeats": 0,
                    "splitsFile": "dataSplits.csv"
                }),
                'performanceMetrics': [
                    {'metric': metric} for metric in problem.get('metrics', ['rootMeanSquaredError'])
                ],
                "expectedOutputs": {
                    "predictionsFile": "predictions.csv"
                }
            }
        }, indent=4))


def d3m_load_resource(path):
    if path.endswith('.csv'):
        data = pd.read_csv(path, low_memory=False)
    elif path.endswith('.tsv'):
        data = pd.read_csv(path, delimiter='\t', low_memory=False)
    elif os.path.splitext(path)[1] in ['.xlsx', '.xls']:
        data = pd.read_excel(path)
    else:
        return None

    if 'd3mIndex' not in data:
        data.insert(0, 'd3mIndex', range(len(data)))
    return data
