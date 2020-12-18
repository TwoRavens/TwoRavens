import m from "mithril";

import * as app from '../app.js';
import * as results from "../modes/results";
import * as utils from '../utils';

import {alertError, alertWarn, debugLog, swandive} from "../app";

import {setModal} from "../../common/views/Modal";
import Table from "../../common/views/Table";
import {
    getDescription,
    getOrderingVariable,
    getPredictorVariables,
    getSelectedProblem, getTargetVariables,
    isProblemValid
} from "../problem";
import {setDefault} from "../utils";


export let getSolverSpecification = async problem => {

    await results.prepareResultsDatasets(problem, 'd3m');

    let datasetSchemaPaths = problem.results.datasetSchemaPaths;
    let datasetSchemas = problem.results.datasetSchemas;

    if (!['classification', 'regression', 'forecasting'].includes(problem.task) || problem.semiSupervised)
        problem.splitOptions.outOfSampleSplit = false;

    let trainDatasetSchema = datasetSchemas[problem.splitOptions.outOfSampleSplit ? 'train' : 'all']
    let trainDatasetSchemaPath = datasetSchemaPaths[problem.splitOptions.outOfSampleSplit ? 'train' : 'all']

    let allParams = {
        searchSolutionParams: GRPC_SearchSolutionsRequest(problem, trainDatasetSchema, trainDatasetSchemaPath),
        fitSolutionDefaultParams: GRPC_GetFitSolutionRequest(trainDatasetSchemaPath),
        scoreSolutionDefaultParams: problem.scoreOptions.userSpecified && GRPC_ScoreSolutionRequest(problem, datasetSchemaPaths.all),
        produceSolutionDefaultParams: {}
            // Object.keys(datasetSchemaPaths) // ['train', 'test', 'all']
            //     .reduce((produces, dataSplit) => Object.assign(produces, {
            //         [dataSplit]: GRPC_ProduceSolutionRequest(datasetSchemaPaths[dataSplit])
            //     }), {})
    };

    return allParams;
};

export let getD3MAdapter = problem => ({
    solve: async () => {
        if (!IS_D3M_DOMAIN) return;

        // return if current problem is already being solved
        problem.results.solverState = problem.results.solverState || {};
        if ('d3m' in problem.results.solverState) return;
        if (!isProblemValid(problem)) return;
        problem.system = 'solved';
        console.log("solving:", problem);

        problem.results.solverState.d3m = {thinking: true};

        // --------------------------------------
        // check that TA2 is accessible
        // --------------------------------------
        let responseTA2 = await m.request(D3M_SVC_URL + '/Hello', {});
        if (responseTA2) {
            if (responseTA2.success !== true) {
              console.log('fyi: TA2 not ready when trying to solve.')
              app.showTA2ConnectError(responseTA2.message);
              problem.results.solverState.d3m = {thinking: false};
              delete problem.results.solverState['d3m'];
              return;
            } else{
              app.showTA2Name(responseTA2);
            }
        }


        if (swandive) {
            alertError('estimate() function. Check app.js error with swandive (err: 003)');
            return;
        }

        m.redraw();

        let allParams = await getSolverSpecification(problem);

        console.groupCollapsed('Initiating Search on D3M');
        console.log("allParams");
        console.log(JSON.stringify(allParams));
        console.groupEnd();

        let res = await m.request(D3M_SVC_URL + '/SearchDescribeFitScoreSolutions', {method: 'POST', body: allParams});

        if (!res || !res.success) {
            problem.results.solverState.d3m.thinking = false;
            problem.results.solverState.d3m.message = 'Search failed.';
            console.error(res.message);
            m.redraw();
            return;
        }

        // sort resulting pipelines by the primary metric by default
        results.resultsPreferences.selectedMetric = problem.metric;

        // route streamed responses with this searchId to this problem
        problem.results.solverState.d3m.searchId = res.data.searchId;
        problem.results.solverState.d3m.message = 'searching for solutions';
        problem.results.selectedSolutions.d3m = problem.results.selectedSolutions.d3m || [];
        problem.results.solutions.d3m = problem.results.solutions.d3m || {};
        m.redraw();
        app.resetPeek();
    },
    search: () => {
        throw 'Search not implemented for D3M.';
    },
    describe: solutionId => {
        throw 'Describe not implemented for D3M.';
    },
    produce: async (solutionId, specification) => m.request("d3m-service/ProduceSolutionEndpoint2", {
        method: 'POST',
        body: {
            produce_solution_request: {
                ...GRPC_ProduceSolutionRequest(specification.input.metadata_uri),
                fittedSolutionId: problem.results.solutions.d3m[solutionId].fittedSolutionId,
            },
            pipeline_id: parseInt(solutionId) || 0,
            search_id: problem.results.solverState.d3m.searchId,
            produce_dataset_name: specification.input.name
        }
    }),
    score: (solutionId, specification) => {
        throw 'Score not implemented for D3M.';
    },
    stop: stopSearch,
    end: endSearch
});

let toFileUri = path => path.startsWith("file://") ? path : "file://" + path;

// no new pipelines will be found under searchId
// pipelines under searchId are also wiped/no longer accessible
export let endSearch = async searchId => searchId !== undefined &&
    m.request(D3M_SVC_URL + '/EndSearchSolutions', {method: 'POST', body: {searchId}})
        .then(handleCompletedSearch(parseInt(searchId)));
// no new pipelines will be found under searchId
// discovered pipelines will remain accessible for produce calls
export let stopSearch = async searchId => searchId !== undefined &&
    m.request(D3M_SVC_URL + '/StopSearchSolutions', {method: 'POST', body: {searchId}})
        .then(handleCompletedSearch(parseInt(searchId)));

let handleCompletedSearch = searchId => response => {
    if (!response.success) {
        console.warn(response.message);
        return;
    }

    if (searchId in results.otherSearches) {
        results.otherSearches[searchId].running = false;
        m.redraw();
        return;
    }
    let solvedProblem = results.findProblem({search_id: String(searchId), system: 'd3m'});
    if (!solvedProblem) return
    solvedProblem.results.solverState.d3m.thinking = false;
    solvedProblem.results.solverState.d3m.message = 'search complete';
    m.redraw()
};

/*
 * Iterate through the problems and end any ongoing searches
 *
 * Note: not all problems have a d3mSearchId
 */
export let endAllSearches = async () => Object.keys(app.workspace.raven_config.problems)
    .filter(problem => 'searchId' in (problem.results.solverState?.d3m || {}))
    .map(problemId => app.workspace.raven_config.problems[problemId].results.solverState.d3m.searchId)
    .forEach(searchId => searchId && endSearch(parseInt(searchId)));

/*
 * Iterate through the problems and stop any ongoing searches
 *
 *  Note: not all problems have a d3mSearchId
 */
export let stopAllSearches = async () => Object.keys(app.workspace.raven_config.problems)
    .filter(problem => 'searchId' in (problem.results.solverState?.d3m || {}))
    .map(problemId => app.workspace.raven_config.problems[problemId].results.solverState.d3m.searchId)
    .forEach(searchId => searchId && stopSearch(parseInt(searchId)));

// ------------------------------------------
//      create pipeline template
// ------------------------------------------

/**
 *  Function takes as input the pipeline template information (currently problem) and returns a valid pipline template in json. This json is to be inserted into SearchSolutions. e.g., problem = {...}, template = {...}, inputs = [dataset_uri]
 */
export function GRPC_PipelineDescription(problem) {
    debugLog('makePipelineTemplate problem:', problem);

    let inputs = [];
    let outputs = [];
    let steps = [];

    // if (problem) {
    //     inputs = [{name: "inputs"}];
    //     steps = buildPipeline([
    //         {type: 'denormalize'},
    //         ...problem.manipulations,
    //         {type: 'remove_columns', problem},
    //         {type: 'placeholder'}
    //     ]);
    //     outputs = [{
    //         name: "output",
    //         data: getContainerId(steps.length)
    //     }];
    // }
    return {inputs, outputs, steps};
}

// example template: leave here for reference
/*
{
  "template": {
    "inputs": [
      {
        "name": "dataset"
      }
    ],
    "outputs": [
      {
        "data": "produce",
        "name": "dataset"
      }
    ],
    "steps": [
      {
        "primitive": {
          "arguments": {
            "inputs": {
              "container": {
                "data": "inputs.0"
              }
            }
          },
          "hyperparams": {
            "columns": {
              "value": {
                "data": {
                  "raw": {
                    "list": {
                      "items": [
                        {
                          "int64": "2"
                        },
                        {
                          "int64": "3"
                        },
                        {
                          "int64": "4"
                        },
                        {
                          "int64": "5"
                        }
                      ]
                    }
                  }
                }
              }
            }
          },
          "outputs": [
            {
              "id": "produce"
            }
          ],
          "primitive": {
            "digest": "85b946aa6123354fe51a288c3be56aaca82e76d4071c1edc13be6f9e0e100144",
            "id": "2eeff053-395a-497d-88db-7374c27812e6",
            "name": "Column remover",
            "python_path": "d3m.primitives.datasets.RemoveColumns",
            "version": "0.2.0"
          },
          "users": []
        }
      },
      {
        "placeholder": {
          "inputs": [
            {
              "data": "steps.0.produce"
            }
          ],
          "outputs": [
            {
              "id": "produce"
            }
          ]
        }
      }
    ]
  }
}
*/

let buildPipeline = abstractSteps => abstractSteps
    // expand abstract steps into primitive pipeline
    .reduce((template, step) => [...template, ...({
        denormalize: stepDenormalize,
        subset: stepSubset,
        impute: stepImpute,
        remove_columns: stepRemoveColumns,
        placeholder: stepPlaceholder
    })[step.type](step, template.length)], []);

let getContainerId = pipelineLength => pipelineLength === 0
    ? 'inputs.0'
    : `steps.${pipelineLength - 1}.produce`;

let stepMapper = (metadata, index) => ({
    primitive: {
        primitive: {
            "id": "5bef5738-1638-48d6-9935-72445f0eecdc",
            "version": "0.1.0",
            "pythonPath": "d3m.primitives.operator.dataset_map.DataFrameCommon",
            "name": "Map DataFrame resources to new resources using provided primitive",
            "digest": "c0758e781e82970035775c84b80632a2fed86338ce6c8709d26c32de32ad4336"
        },
        arguments: {
            inputs: {
                container: {
                    data: getContainerId(index)
                }
            }
        },
        hyperparams: {
            primitive: {
                data: (metadata || {index}).index
            }
        },
        outputs: [{id: "produce"}],
    }
});

let grpcWrap = value => ({value: {data: {raw: asType(value)}}});
let asString = value => ({string: value});
let asBool = value => ({bool: value});
let asInt = value => ({int64: String(value)});
let asDouble = value => ({double: value});
let asList = value => ({list: {items: value.map(elem => asType(elem))}});

let asType = value => {
    if (Array.isArray(value)) return asList(value);
    if (typeof value === 'number') return Number.isInteger(value) ? asInt(value) : asDouble(value);
    if (typeof value === 'string') return asString(value);
    if (typeof value === 'boolean') return asBool(value);

    throw "Invalid type " + typeof value;
};


let stepDenormalize = (metadata, index) => [{
    primitive: {
        primitive: {
            'id': 'f31f8c1f-d1c5-43e5-a4b2-2ae4a761ef2e',
            'version': '0.2.0',
            'name': "Denormalize datasets",
            'python_path': 'd3m.primitives.data_transformation.denormalize.Common'
        },
        arguments: {
            inputs: {
                container: {
                    data: getContainerId(index)
                }
            }
        },
        outputs: [
            {id: 'produce'}
        ]
    }
}];

let stepRemoveColumns = (metadata, index) => {
    let problem = metadata.problem;
    // looks like some TA2s need "d3mIndex"
    let keep = [
        ...getPredictorVariables(problem),
        ...getTargetVariables(problem),
        ...problem.tags.indexes,
        ...problem.tags.crossSection,
        getOrderingVariable(problem)
    ];


    let indices = [];

    app.workspace.raven_config.variablesInitial.forEach((variable, i) => !keep.includes(variable) && indices.push(i));

    if (indices.length === 0) return [];

    return [
        {
            primitive: {
                primitive: {
                    "id": "3b09ba74-cc90-4f22-9e0a-0cf4f29a7e28",
                    "name": "Removes columns",
                    "python_path": "d3m.primitives.data_transformation.remove_columns.DataFrameCommon",
                    "version": "0.1.0"
                },
                // this will be set by the dataset_map primitive; it remains outside of the DAG
                // arguments: {inputs: {container: {data: getContainerId(index)}}},
                // outputs: [{id: "produce"}],
                hyperparams: {columns: grpcWrap(indices)},
                users: []
            }
        },
        stepMapper(undefined, index)
    ];
};

let stepSubset = (step, index) => {
    let primitiveContinuous = {
        "digest": "b373c5ac56b40a0eb80d3e72a63d3f3804e5243024f1a4c535cd9caaa342179d",
        "id": "8c246c78-3082-4ec9-844e-5c98fcc76f9d",
        "name": "Numeric range filter",
        "pythonPath": "d3m.primitives.data_preprocessing.numeric_range_filter.DataFrameCommon",
        "version": "0.1.0"
    };

    let primitiveDiscrete = {
        "id": "a6b27300-4625-41a9-9e91-b4338bfc219b",
        "version": "0.1.0",
        "name": "Term list dataset filter",
        "python_path": "d3m.primitives.data_preprocessing.term_filter.DataFrameCommon",
        "digest": "f24a0a0f5133a21d90eeaeddb7ebb85c5651df16d66f310a257d2e2918274d29"
    };

    let columns = Object.keys(app.variableSummaries);

    return step.abstractQuery.flatMap((constraint, ravenIndex) => {
        let hyperparams;

        if (constraint.subset === 'continuous') hyperparams = {
            column: grpcWrap(columns.indexOf(constraint.column)),
            inclusive: grpcWrap(constraint.negate === 'false'),
            min: grpcWrap((constraint.children.find(child => 'fromLabel' in child) || {}).fromLabel),
            max: grpcWrap((constraint.children.find(child => 'toLabel' in child) || {}).toLabel),
        };
        if (constraint.subset === 'discrete') hyperparams = {
            column: grpcWrap(columns.indexOf(constraint.column)),
            inclusive: grpcWrap(constraint.negate === 'false'),
            terms: grpcWrap(constraint.children.map(child => child.value)),
            match_whole: grpcWrap(true)
        };

        return [
            {
                primitive: {
                    primitive: {
                        continuous: primitiveContinuous,
                        discrete: primitiveDiscrete
                    }[constraint.subset],
                    arguments: {inputs: {container: {data: getContainerId(index + ravenIndex * 2)}}},
                    outputs: [{id: "produce"}],
                    hyperparams,
                    users: []
                }
            },
            stepMapper(undefined, index + ravenIndex * 2)
        ]
    });
};

let stepImpute = (metadata, index) => metadata.imputations.flatMap((imputation, ravenIndex) => {
    let hyperparams = {};
    if (imputation.replacementMode === 'Statistic') {
        hyperparams.strategy = ({
            'Mean': 'mean',
            'Median': 'median',
            'Most Frequent': 'most_frequent'
        })[imputation.statisticMode]
    }
    else if (imputation.replacementMode === 'Custom') {
        hyperparams.strategy = 'constant';
        // all values of the replacementValues object will be the same under these circumstances
        hyperparams.fill_value = imputation.replacementValues[Object.keys(imputation.replacementValues)[0]]
    }
    hyperparams.use_columns = [];
    Object.keys(app.variableSummaries)
        .forEach((keep, name, i) => (name in imputation.replacementValues) && hyperparams.use_columns.push(i), []);

    return [
        {
            primitive: {
                primitive: {
                    "digest": "d6902b0ef72b4cd6fc5f79054f7a534404c708e1244e94a2713a9dd525c78eed",
                    "id": "d016df89-de62-3c53-87ed-c06bb6a23cde",
                    "name": "sklearn.impute.SimpleImputer",
                    "pythonPath": "d3m.primitives.data_cleaning.imputer.SKlearn",
                    "version": "2019.6.7"
                },
                hyperparams
            }
        },
        stepMapper(undefined, index + ravenIndex * 2)
    ]
});

let stepPlaceholder = (metadata, index) => [{
    placeholder: {
        inputs: [{data: getContainerId(index)}],
        outputs: [{id: "produce"}]
    }
}];

// ------------------------------------------
//      create search request
// ------------------------------------------

// create problem definition for SearchSolutions call
export function GRPC_ProblemDescription(problem, datasetDoc) {

    // this is a convention defined in data-supply
    let learningResource = datasetDoc.dataResources
        .find(resource => resource.resID === 'learningData');

    // fallback for if no resource is labeled "learningData"
    if (!learningResource)
        learningResource = datasetDoc.dataResources
            .find(resource => resource.resType === "table");

    let GRPC_ProblemPerformanceMetric = metric => {
        let performanceMetric = {metric: app.d3mMetrics[metric]};
        if (['f1', 'precision', 'recall'].includes(metric))
            performanceMetric.posLabel = problem.positiveLabel || Object.keys((app.variableSummaries[getTargetVariables(problem)[0]].plotValues || {}))[0];
        if (problem.metric === 'precisionAtTopK')
            performanceMetric.k = problem.precisionAtTopK || 5;
        return performanceMetric;
    }

    let getColIndex = colName => learningResource.columns
        .find(column => column.colName === colName)?.colIndex ?? Object.keys(variableSummaries)
        .findIndex(column => column === colName);

    let GRPC_Problem = {
        taskKeywords: [
            // "TABULAR",
            app.d3mTaskType[problem.task],
            app.d3mTaskSubtype[problem.subTask],
            app.d3mSupervision[problem.supervision],
            ...problem.d3mTags.map(tag => app.d3mTags[tag]),
            ...problem.resourceTypes.map(type => app.d3mResourceType[type])
        ].filter(_=>_),
        performanceMetrics: [problem.metric, ...problem.metrics].map(GRPC_ProblemPerformanceMetric)
    };

    let GRPC_ProblemPrivilegedData = problem.tags.privileged.map((variable, i) => ({
        privilegedDataIndex: i,
        resourceId: learningResource.resID,
        columnIndex: getColIndex(variable),
        columnName: variable
    }));

    let GRPC_ForecastingHorizon = {};
    if (problem.task === 'forecasting') {
        let horizonColumn = getOrderingVariable(problem);
        GRPC_ForecastingHorizon = {
            resourceId: learningResource.resID,
            columnIndex: getColIndex(horizonColumn),
            columnName: horizonColumn,
            horizonValue: problem.forecastingHorizon || 10
        };
    }

    let GRPC_ProblemInput = {
        datasetId: datasetDoc.about.datasetID,
        targets: getTargetVariables(problem).map((target, i) => ({
            // targetIndex: i,
            resourceId: learningResource.resID,
            columnIndex: getColIndex(target),
            columnName: target,
            clustersNumber: problem.task === 'clustering' ? problem.numClusters : undefined
        })),
        privilegedData: GRPC_ProblemPrivilegedData,
        forecastingHorizon: GRPC_ForecastingHorizon
    };

    return {
        problem: GRPC_Problem,
        inputs: [GRPC_ProblemInput],
        description: getDescription(problem),
        version: '1.0.0',
        name: problem.problemId,
        id: problem.problemId
    };
}

export function GRPC_SearchSolutionsRequest(problem, datasetDoc, datasetDocUrl) {
    return {
        userAgent: TA3_GRPC_USER_AGENT, // set on django
        version: TA3TA2_API_VERSION, // set on django
        timeBoundSearch: problem.searchOptions.timeBoundSearch || 15,
        timeBoundRun: problem.searchOptions.timeBoundRun || 0,
        rankSolutionsLimit: problem.searchOptions.solutionsLimit || 0,
        priority: problem.searchOptions.priority || 0,
        allowedValueTypes: ['DATASET_URI', 'CSV_URI', 'RAW'],
        problem: GRPC_ProblemDescription(problem, datasetDoc),
        template: GRPC_PipelineDescription(problem),
        inputs: [{dataset_uri: 'file://' + datasetDocUrl}]
    };
}

/**
 Return the default parameters used for a FitSolution call.
 This DOES NOT include the solutionID
 */
export function GRPC_GetFitSolutionRequest(datasetDocUrl) {
    return {
        inputs: [
            {dataset_uri: 'file://' + datasetDocUrl}
        ],
        exposeOutputs: ['outputs.0'],
        exposeValueTypes: ['CSV_URI'],
        users: [
            // {id: 'TwoRavens', chosen: false, reason: ''}
        ]
    };
}

// {
//     "fittedSolutionId": "solutionId_yztf3r",
//     "inputs": [
//         {
//             "csvUri": "file://uri/to-a/csv"
//         },
//         {
//             "datasetUri": "file://uri/to-a/dataset"
//         }
//     ],
//     "exposeOutputs": [
//         "steps.1.steps.4.produce"
//     ],
//     "exposeValueTypes": [
//         "PICKLE_URI",
//         "PLASMA_ID"
//     ],
//     "users": [
//         {
//             "id": "uuid of user",
//             "chosen": true,
//             "reason": "best solution"
//         },
//         {
//             "id": "uuid of user",
//             "chosen": false,
//             "reason": ""
//         }
//     ]
// }

/*
  Return the default parameters used for a ProduceSolution call.
  This DOES NOT include the fittedSolutionId
*/
export function GRPC_ProduceSolutionRequest(datasetDocUrl){
    return {
        inputs: [{dataset_uri: toFileUri(datasetDocUrl)}],
        exposeOutputs: ['outputs.0'],
        exposeValueTypes: ['CSV_URI']
    };
}

/*
  Return the default parameters used for a ProduceSolution call.
  This DOES NOT include the solutionId
*/
export function GRPC_ScoreSolutionRequest(problem, datasetDocUrl) {
    return {
        inputs: [{dataset_uri: 'file://' + datasetDocUrl}],
        performanceMetrics: [problem.metric, ...problem.metrics].map(metric => ({metric: app.d3mMetrics[metric]})),
        users: [
            // {id: 'TwoRavens', chosen: false, reason: ""}
        ],
        // note: FL only using KFOLD in latest iteration (3/8/2019)
        configuration: {
            method: app.d3mEvaluationMethods[problem.scoreOptions.evaluationMethod] || "K_FOLD",
            folds: problem.folds || 0,
            trainTestRatio: problem.scoreOptions.trainTestRatio || 0,
            shuffle: problem.scoreOptions.shuffle || false,
            randomSeed: problem.scoreOptions.randomSeed || 0,
            stratified: problem.scoreOptions.stratified || false
        }
    };
}


// ------------------------------------------
//      websocket response handlers
// ------------------------------------------

/**
 Handle a websocket sent GetSearchSolutionResultsResponse
 wrapped in a StoredResponse object

 contains initial pipeline
 */
export async function handleGetSearchSolutionResultsResponse(response) {

    if (response === undefined) {
        console.warn('GetSearchSolutionResultsResponse: Error.  "response" undefined');
        return;
    }

    let solvedProblem = results.findProblem({system: 'd3m', search_id: response.stored_request.search_id})

    // end the search if it doesn't match any problem
    if (!solvedProblem) {
        console.log("other search found")
        results.otherSearches[response.stored_request.search_id] = results.otherSearches[response.stored_request.search_id] || {};
        if (results.otherSearches[response.stored_request.search_id].running === undefined)
            results.otherSearches[response.stored_request.search_id].running = true;
        m.redraw();
        return;
    }
    if (response.id === undefined) {
        console.warn('GetSearchSolutionResultsResponse: Error.  "response.id" undefined');
        return;
    }
    if (response.is_error) return;

    let d3mSolutionId = response?.response?.solutionId;
    if (Object.values(solvedProblem.results.solutions.d3m).some(solution => solution.d3mSolutionId === d3mSolutionId)) {
        console.log("discarded duplicate solution id")
        return;
    }
    // save the problem
    Object.assign(solvedProblem.results.solutions.d3m, {
        [response.pipelineId]: {
            solutionId: String(response.pipelineId),
            d3mSolutionId,
            systemId: 'd3m',
            description: response.description
        }
    });

    // set the selected solution if none have been selected yet
    // let selectedSolutions = results.getSelectedSolutions(solvedProblem);
    if (!solvedProblem.results.userSelectedSolution) {
        let bestSolution = results.getBestSolution(solvedProblem);
        if (bestSolution) {
            results.setSelectedSolution(solvedProblem, bestSolution.getSystemId(), bestSolution.getSolutionId())
        }
    }

    // if the user has not specified a scoring configuration, then use scores from the TA2
    if (!solvedProblem.scoreOptions.userSpecified && response.response.scores?.length > 0) {
        // standardize scores format (ignore types)
        response.response.scores.forEach(scoreConfigurationData => {
            scoreConfigurationData.scores.forEach(scoreSchema => scoreSchema.value = scoreSchema.value.raw.double)
        });

        // save scores
        let solution = solvedProblem.results.solutions.d3m[response.pipelineId];
        solution.scores = solution.scores || [];
        solution.scores.push(...response.response.scores[0].scores);
    }

    m.redraw();
}

/**
 Handle a describeSolutionResponse sent via websockets
 */
export async function handleDescribeSolutionResponse(response) {

    if (response === undefined) {
        console.log('handleDescribeSolutionResponse: Error.  "response" undefined');
        return;
    }

    let solvedProblem = results.findProblem({system: 'd3m', search_id: response.searchId})

    // end the search if it doesn't match any problem
    if (!solvedProblem) {
        results.otherSearches[response.searchId] = results.otherSearches[response.searchId] || {};
        if (results.otherSearches[response.searchId].running === undefined)
            results.otherSearches[response.searchId].running = true;
        m.redraw();
        return;
    }

    if (response.pipelineId === undefined) {
        console.log('handleDescribeSolutionResponse: Error.  "pipelineId" undefined');
        return;
    }
    debugLog('---- handleDescribeSolutionResponse -----');
    debugLog(JSON.stringify(response));

    let solution = solvedProblem.results.solutions.d3m[response.pipelineId];
    if (!solution) {return}

    // the pipeline template is the only useful information
    solution.pipeline = response.pipeline;
    solution.name = solution.pipeline !== undefined
        ? solution.pipeline.steps
            .filter(step => ['regression', 'classification', 'semisupervised_classification', 'semisupervised_regression']
                .includes(step.primitive.primitive.pythonPath.split('.')[2]))
            .map(step => step.primitive.primitive.pythonPath.replace(new RegExp('d3m\\.primitives\\.(regression|classification|semisupervised_classification|semisupervised_regression)\\.'), ''))
            .join()
        : '';
    m.redraw();
}


/**
 Handle a getScoreFitSolutionResultsResponse send via websocket
 wrapped in a StoredResponse object
 */
export async function handleGetFitSolutionResultsResponse(response) {

    if (response === undefined) {
        console.log('handleGetFitSolutionResultsResponse: Error.  "response" undefined');
        return;
    }

    let solvedProblem = results.findProblem({system: 'd3m', search_id: response.stored_request.search_id})

    if (!solvedProblem) {
        results.otherSearches[response.stored_request.search_id] = results.otherSearches[response.stored_request.search_id] || {};
        if (results.otherSearches[response.stored_request.search_id].running === undefined)
            results.otherSearches[response.stored_request.search_id].running = true;
        m.redraw();
        return;
    }

    if (response.is_finished === undefined) {
        debugLog('handleGetFitSolutionResultsResponse: Error.  "response.is_finished" undefined');
        return;
    }
    if (!response.is_finished) return;
    if (response.is_error) return;

    let solution = solvedProblem.results.solutions.d3m?.[response.pipelineId];
    if (!solution) {return}

    solution.fittedSolutionId = response.response.fittedSolutionId;
    m.redraw();
}

/**
 Handle a getScoreSolutionResultsResponse send via websocket
 wrapped in a StoredResponse object
 */
export async function handleGetScoreSolutionResultsResponse(response) {

    if (response === undefined) {
        console.log('handleGetScoreSolutionResultsResponse: Error.  "response" undefined');
        return;
    }

    let solvedProblem = results.findProblem({system: 'd3m', search_id: response.stored_request.search_id})

    if (!solvedProblem) {
        results.otherSearches[response.stored_request.search_id] = results.otherSearches[response.stored_request.search_id] || {};
        if (results.otherSearches[response.stored_request.search_id].running === undefined)
            results.otherSearches[response.stored_request.search_id].running = true;
        m.redraw();
        return;
    }

    if (response.is_finished === undefined) {
        debugLog('handleGetScoreSolutionResultsResponse: Error.  "response.data.is_finished" undefined');
        return;
    }
    if (!response.is_finished) return;
    if (response.is_error) return;

    // standardize format
    response.response.scores.forEach(scoreSchema => scoreSchema.value = scoreSchema.value.raw.double);

    // save scores
    let solution = solvedProblem.results.solutions.d3m[response.pipelineId];
    if (!solution) return;

    solution.scores = solution.scores || [];
    solution.scores.push(...response.response.scores);
    m.redraw();
}

/**
 Handle a GetProduceSolutionResultsResponse sent via websockets
 -> parse response, retrieve data, plot data
 */
export async function handleGetProduceSolutionResultsResponse(response) {

    if (response === undefined) {
        debugLog('handleGetProduceSolutionResultsResponse: Error.  "response" undefined');
        return;
    }

    let searchId = response.stored_request.search_id;

    let solvedProblem = results.findProblem({system: 'd3m', search_id: searchId})

    if (!solvedProblem) {
        results.otherSearches[searchId] = results.otherSearches[searchId] || {};
        if (results.otherSearches[searchId].running === undefined)
            results.otherSearches[searchId].running = true;
        m.redraw();
        return;
    }

    if (response.pipelineId === undefined) {
        debugLog('handleGetProduceSolutionResultsResponse: Error.  "pipelineId" undefined');
        return;
    }
    debugLog('---- handleGetProduceSolutionResultsResponse -----');
    debugLog(JSON.stringify(response));

    // Note: UI update logic moved from generatePredictions
    if (!response.is_finished) {
        debugLog('-- GetProduceSolutionResultsResponse not finished yet... (returning) --');
        return;
    } else if (response.is_error) {
        debugLog('-- GetProduceSolutionResultsResponse has error --')
        debugLog('response: ' + JSON.stringify(response));
        debugLog('----------------------------------------------');
        return;
    }

    let firstOutput = Object.values(response?.response?.exposedOutputs || {})?.[0]?.csvUri;

    if (!firstOutput) return;
    let pointer = firstOutput.replace('file://', '');

    let solution = solvedProblem.results.solutions.d3m?.[response.pipelineId];
    if (!solution) return

    results.checkResultsCache(solvedProblem);

    // save produce path to resultsCache
    utils.setDeep(results.resultsCache,
        [solvedProblem.problemId, 'producePaths', solution.solutionId, response.produce_dataset_name], pointer)
    utils.setDeep(results.resultsCache,
        [solvedProblem.problemId, 'producePathsLoading', solution.solutionId, response.produce_dataset_name], false)

    m.redraw();
}

export function handleENDGetSearchSolutionsResults(response) {
    // TODO: this is sloppy
    handleCompletedSearch(response?.user_message?.searchId)(response);
}

/**
 EndSession(SessionContext) returns (Response) {}
 */
export async function endSession() {
    app.taskPreferences.isSubmittingPipelines = true;
    let selectedProblem = getSelectedProblem();

    let solutions = selectedProblem.results.solutions;
    if (Object.keys(solutions.d3m).length === 0) {
        alertError("No pipelines exist. Cannot mark problem as complete.");
        return;
    }

    let selectedPipelines = results.getSelectedSolutions(selectedProblem, 'd3m');
    if (selectedPipelines.length === 0) {
        alertWarn("No pipeline is selected. Cannot mark problem as complete");
        return;
    }
    if (selectedPipelines.length > 1) {
        alertWarn("More than one pipeline selected. Please select one pipeline");
        return;
    }

    // console.log('------- end session --------');
    // console.log(JSON.stringify(selectedPipelines, null, 2));

    let selectedSolution = selectedPipelines[0];
    let pipelineId = selectedSolution?.pipeline?.id;

    if (pipelineId === undefined){
      setModal(m('div', {}, [
              m('p', 'Sorry!  The pipelineId for the selected solution could not be found.'),
              m('p', 'The solution was not exported.'),
              ]),
               "Failed to Export Solution",
               true,
               "Close",
               true);
      return;
    }

    m.redraw();

    // calling exportSolution
    //
    let status = await exportSolution(String(pipelineId));

    if (status.success) {
        app.taskPreferences.isSubmittingPipelines = false;
        app.taskPreferences.task2_finished = true;
        // more descriptive solution modal that doesn't lock the page
        selectedSolution.chosen = true;
        results.setShowFinalPipelineModal(true);

        // we don't need to wait for the backend to spin down before telling the user, no await used
        // endAllSearches();

        // app.alertLog('Finished! The problem is marked as complete.')
        // let resetTheApp = () => {
        //     window.location.pathname = clear_user_workspaces_url;
        // };
        // setModal(m('div', {}, [
        //         m('p', 'Finished! The problem is marked as complete.'),
        //         // m('p', ''),
        //     ]),
        //     "Task complete",
        //     true,
        //     "Restart",
        //     true,
        //     resetTheApp);
        m.redraw()
    } else {
        status.name = 'Error from pipeline submission.';
        alertError(m(Table, {data: status}))
    }
}


/**
 rpc SolutionExport (SolutionExportRequest) returns (SolutionExportResponse) {}
 Example call:
 {
       "fittedSolutionId": "solutionId_gtk2c2",
       "rank": 0.122
       "searchId": "17"
  }
 Note: "searchId" is not part of the gRPC call but used for server
 side tracking.
 */
let exportCount = 0;
export async function exportSolution(solutionId) {
    exportCount++;

    let response = await m.request(D3M_SVC_URL + '/SolutionExport3', {method: 'POST', body: {
        solutionId,
        rank: 1.01 - 0.01 * exportCount,
        searchId: getSelectedProblem().solverState.d3m.searchId
    }});

    console.log('--------------------------')
    console.log(' -- SolutionExport3 --')
    console.log(JSON.stringify(response));

    console.log('--------------------------')
    if (response === undefined){
        console.log('Failed to write executable for solutionId ' + solutionId);
    } else if (!response.success){
        setModal(response.message,"Solution export failed", true, 'Close', true,
            () => setModal('',"", false));
    }
    return response;
}
