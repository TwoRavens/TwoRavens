
- Requests from the TA3 running against the poverty seed dataset:   
  - https://gitlab.datadrivendiscovery.org/d3m/datasets/tree/master/seed_datasets_data_augmentation/DA_poverty_estimation (edited)

- Please see the related TA2 output: https://gist.github.com/raprasad/40361f4dc7de71a19fc3fc4a76712dd1

## 1 - Search

- Request

```json
{
    "userAgent": "TwoRavens",
    "version": "2019.2.27",
    "timeBound": 5,
    "priority": 1,
    "allowedValueTypes": [
        "DATASET_URI",
        "CSV_URI"
    ],
    "problem": {
        "problem": {
            "id": "problem 4",
            "version": "2.0",
            "name": "",
            "description": "Socioeconomic indicators like poverty rates, population change, unemployment rates, and education levels vary geographically across U.S. States and counties. This dataset includes poverty indicators across different counties across all states of the US. The task is to estimate the number of people living in poverty in 2016 across counties in the US. This is a regression problem.",
            "taskType": "REGRESSION",
            "taskSubtype": "NONE",
            "performanceMetrics": [
                {
                    "metric": "MEAN_ABSOLUTE_ERROR"
                }
            ]
        },
        "inputs": [
            {
                "datasetId": "DA_poverty_estimation_dataset_TRAIN",
                "targets": [
                    {
                        "resourceId": "0",
                        "columnIndex": 5,
                        "columnName": "POVALL_2016"
                    }
                ]
            }
        ]
    },
    "template": {
        "inputs": [],
        "outputs": [],
        "steps": []
    },
    "inputs": [
        {
            "dataset_uri": "file:///ravens_volume/test_data/DA_poverty_estimation/TRAIN/dataset_TRAIN/datasetDoc.json"
        }
    ]
}
```

- Response

```json
{
    "searchId": "41b25dd9-ac90-4519-8f55-a77a65000bde"
}
```


## 2 - GetSearchSolutionsResults

- Request

```json
{
    "searchId": "41b25dd9-ac90-4519-8f55-a77a65000bde"
}
```

- Response
  - This is the first returned response, solutionId: **6e5b2e09-654d-4afa-9b5b-b4ae2d7242b7**

```json
{
    "progress": {
        "state": "RUNNING",
        "start": "2019-03-14T22:19:39.796250Z",
        "status": ""
    },
    "solutionId": "6e5b2e09-654d-4afa-9b5b-b4ae2d7242b7",
    "doneTicks": 0.0,
    "allTicks": 0.0,
    "internalScore": 0.0,
    "scores": []
}
```

## 3 - DescribeSolution

- Request

```json
{
    "solutionId": "6e5b2e09-654d-4afa-9b5b-b4ae2d7242b7"
}
```

- Response

```json
{
    "pipelineId": 1973,
    "pipeline": {
        "id": "6e5b2e09-654d-4afa-9b5b-b4ae2d7242b7",
        "created": "2019-03-14T22:19:40.495579Z",
        "context": "PRODUCTION",
        "inputs": [
            {
                "name": "inputs"
            }
        ],
        "outputs": [
            {
                "name": "output predictions",
                "data": "steps.5.produce"
            }
        ],
        "steps": [
            {
                "primitive": {
                    "primitive": {
                        "id": "f31f8c1f-d1c5-43e5-a4b2-2ae4a761ef2e",
                        "version": "0.2.0",
                        "pythonPath": "d3m.primitives.data_transformation.denormalize.Common",
                        "name": "Denormalize datasets",
                        "digest": "7079ab320038cee885edd13ab7613c42063969b4d5c2af7ab19ed681b2ff28e9"
                    },
                    "arguments": {
                        "inputs": {
                            "container": {
                                "data": "inputs.0"
                            }
                        }
                    },
                    "outputs": [
                        {
                            "id": "produce"
                        }
                    ],
                    "hyperparams": {},
                    "users": []
                }
            },
            {
                "primitive": {
                    "primitive": {
                        "id": "4b42ce1e-9b98-4a25-b68e-fad13311eb65",
                        "version": "0.3.0",
                        "pythonPath": "d3m.primitives.data_transformation.dataset_to_dataframe.Common",
                        "name": "Extract a DataFrame from a Dataset",
                        "digest": "f399b299f15daed778a53bd13b0dbf0841ce53cfbcd71c141947f34d7dc29ac3"
                    },
                    "arguments": {
                        "inputs": {
                            "container": {
                                "data": "steps.0.produce"
                            }
                        }
                    },
                    "outputs": [
                        {
                            "id": "produce"
                        }
                    ],
                    "hyperparams": {},
                    "users": []
                }
            },
            {
                "primitive": {
                    "primitive": {
                        "id": "d510cb7a-1782-4f51-b44c-58f0236e47c7",
                        "version": "0.5.0",
                        "pythonPath": "d3m.primitives.data_transformation.column_parser.DataFrameCommon",
                        "name": "Parses strings into their types",
                        "digest": "44390ad614ffd62169cdf7958ddaf291e49c92cc7a967ae965f1c1b628063784"
                    },
                    "arguments": {
                        "inputs": {
                            "container": {
                                "data": "steps.1.produce"
                            }
                        }
                    },
                    "outputs": [
                        {
                            "id": "produce"
                        }
                    ],
                    "hyperparams": {},
                    "users": []
                }
            },
            {
                "primitive": {
                    "primitive": {
                        "id": "d016df89-de62-3c53-87ed-c06bb6a23cde",
                        "version": "v2019.2.27",
                        "pythonPath": "d3m.primitives.data_cleaning.imputer.SKlearn",
                        "name": "sklearn.preprocessing.imputation.Imputer",
                        "digest": "d2e5ae2cb8532287e5c905b56839c56047445e8911cf7e828a0ecb94cc437b57"
                    },
                    "arguments": {
                        "inputs": {
                            "container": {
                                "data": "steps.2.produce"
                            }
                        }
                    },
                    "outputs": [
                        {
                            "id": "produce"
                        }
                    ],
                    "hyperparams": {
                        "use_semantic_types": {
                            "data": {
                                "data": "True"
                            }
                        },
                        "return_result": {
                            "data": {
                                "data": "replace"
                            }
                        },
                        "strategy": {
                            "data": {
                                "data": "mean"
                            }
                        }
                    },
                    "users": []
                }
            },
            {
                "primitive": {
                    "primitive": {
                        "id": "2a031907-6b2c-3390-b365-921f89c8816a",
                        "version": "v2019.2.27",
                        "pythonPath": "d3m.primitives.regression.gradient_boosting.SKlearn",
                        "name": "sklearn.ensemble.gradient_boosting.GradientBoostingRegressor",
                        "digest": "854e6eb330324e62836f61c353339ab2e271c4849ef2fd0c439268bbf5490743"
                    },
                    "arguments": {
                        "inputs": {
                            "container": {
                                "data": "steps.3.produce"
                            }
                        },
                        "outputs": {
                            "container": {
                                "data": "steps.3.produce"
                            }
                        }
                    },
                    "outputs": [
                        {
                            "id": "produce"
                        }
                    ],
                    "hyperparams": {
                        "n_estimators": {
                            "data": {
                                "data": "100"
                            }
                        },
                        "min_samples_leaf": {
                            "data": {
                                "data": "1"
                            }
                        },
                        "criterion": {
                            "data": {
                                "data": "friedman_mse"
                            }
                        },
                        "max_depth": {
                            "data": {
                                "data": "3"
                            }
                        },
                        "learning_rate": {
                            "data": {
                                "data": "0.1"
                            }
                        },
                        "return_result": {
                            "data": {
                                "data": "replace"
                            }
                        },
                        "min_samples_split": {
                            "data": {
                                "data": "2"
                            }
                        },
                        "use_semantic_types": {
                            "data": {
                                "data": "True"
                            }
                        },
                        "loss": {
                            "data": {
                                "data": "ls"
                            }
                        }
                    },
                    "users": []
                }
            },
            {
                "primitive": {
                    "primitive": {
                        "id": "8d38b340-f83f-4877-baaa-162f8e551736",
                        "version": "0.3.0",
                        "pythonPath": "d3m.primitives.data_transformation.construct_predictions.DataFrameCommon",
                        "name": "Construct pipeline predictions output",
                        "digest": "6358eb9962708eeb875c044ca115511cff97717d39914c1cdc7cd9d453c118cd"
                    },
                    "arguments": {
                        "reference": {
                            "container": {
                                "data": "steps.2.produce"
                            }
                        },
                        "inputs": {
                            "container": {
                                "data": "steps.4.produce"
                            }
                        }
                    },
                    "outputs": [
                        {
                            "id": "produce"
                        }
                    ],
                    "hyperparams": {},
                    "users": []
                }
            }
        ],
        "name": "",
        "description": "",
        "users": [],
        "digest": ""
    },
    "steps": []
}
```

## 4 - FitSolution

- Request

```json
{
    "inputs": [
        {
            "dataset_uri": "file:///ravens_volume/test_data/DA_poverty_estimation/TRAIN/dataset_TRAIN/datasetDoc.json"
        }
    ],
    "exposeOutputs": [
        "outputs.0"
    ],
    "exposeValueTypes": [
        "CSV_URI"
    ],
    "users": [
        {
            "id": "TwoRavens",
            "chosen": false,
            "reason": ""
        }
    ],
    "solutionId": "6e5b2e09-654d-4afa-9b5b-b4ae2d7242b7"
}
```

- Response

```json
{
    "requestId": "6e5b2e09-654d-4afa-9b5b-b4ae2d7242b7"
}
```

## 5 - GetFitSolutionResults

- Request

```json
{
    "requestId": "6e5b2e09-654d-4afa-9b5b-b4ae2d7242b7"
}
```

- Response

```json
{
    "progress": {
        "state": "ERRORED",
        "status": "PipelineRunError: Pipeline run failed.",
        "start": "2019-03-14T22:19:42.278145Z",
        "end": "2019-03-14T22:19:45.305007Z"
    },
    "exposedOutputs": {
        "outputs.0": {
            "csvUri": "file:///ravens_volume/test_output/DA_poverty_estimation/predictions/6e5b2e09-654d-4afa-9b5b-b4ae2d7242b7/6e5b2e09-654d-4afa-9b5b-b4ae2d7242b7.outputs.0.csv"
        }
    },
    "fittedSolutionId": "6e5b2e09-654d-4afa-9b5b-b4ae2d7242b7",
    "steps": []
}
```

## 6 - ScoreSolution

- Request

```json
{
    "inputs": [
        {
            "dataset_uri": "file:///ravens_volume/test_data/DA_poverty_estimation/TRAIN/dataset_TRAIN/datasetDoc.json"
        }
    ],
    "performanceMetrics": [
        {
            "metric": "MEAN_ABSOLUTE_ERROR"
        }
    ],
    "users": [
        {
            "id": "TwoRavens",
            "chosen": false,
            "reason": ""
        }
    ],
    "configuration": {
        "method": "K_FOLD",
        "folds": 0,
        "trainTestRatio": 0,
        "shuffle": false,
        "randomSeed": 0,
        "stratified": false
    },
    "solutionId": "6e5b2e09-654d-4afa-9b5b-b4ae2d7242b7"
}
```

- Response

```json
"<_Rendezvous of RPC that terminated with (StatusCode.UNKNOWN, Exception calling application: 'session')>"
```
