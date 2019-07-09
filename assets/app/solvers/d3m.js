import m from "mithril";

import * as app from '../app.js';
import * as results from "../results";
import * as queryMongo from '../manipulations/queryMongo';

import {alertError, alertWarn, buildDatasetUrl, debugLog} from "../app";

import {locationReload, setModal} from "../../common/views/Modal";

// functions to extract information from D3M response format
export let getName = (problem, solution) => solution.pipelineId;
export let getActualValues = (problem, solution, target) => problem.actualValues && problem.actualValues.map(point => point[target]);
export let getFittedValues = (problem, solution, target) => {
    if (!solution.predictedValues) return;
    let samples = problem.actualValues.map(point => point.d3mIndex);
    return samples.map(sample => solution.predictedValues[sample]);
};
export let getScore = (problem, solution, target) => solution.score;
export let getDescription = (problem, solution) => solution.description;
export let getTask = (problem, solution) => solution.status;
export let getModel = (problem, solution) => `${(solution.steps || []).length} steps`;


// no new pipelines will be found under searchId
// pipelines under searchId are also wiped/no longer accessible
export let endSearch = async searchId => app.makeRequest(D3M_SVC_URL + '/EndSearchSolutions', {searchId})
    .then(response => {
        console.warn("#debug response endSearch");
        console.log(response);
    });

// no new pipelines will be found under searchId
// discovered pipelines will remain accessible for produce calls
export let stopSearch = async searchId => app.makeRequest(D3M_SVC_URL + '/StopSearchSolutions', {searchId})
    .then(response => {
        console.warn("#debug response stopSearch");
        console.log(response);
    });

export let endAllSearches = async () => Object.keys(app.workspace.raven_config.problems)
    .map(problemId => app.workspace.raven_config.problems[problemId].d3mSearchId)
    .forEach(endSearch);
export let stopAllSearches = async () => Object.keys(app.workspace.raven_config.problems)
    .map(problemId => app.workspace.raven_config.problems[problemId].d3mSearchId)
    .forEach(stopSearch);

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
let asList = value => ({list: value.map(elem => asType(elem))});

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
    let keep = [...app.getPredictorVariables(problem), ...problem.targets, "d3mIndex"];

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
                outputs: [{id: "produce"}],
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

    return step.flatMap((constraint, ravenIndex) => {
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

// noop until a recoding/imputer primitive is found
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
export function GRPC_ProblemDescription(problem) {
    let GRPC_Problem = {
        taskType: app.d3mTaskType[problem.task],
        taskSubtype: problem.taskSubtype || app.d3mTaskSubtype.subtypeNone,
        performanceMetrics: [{metric: app.d3mMetrics[problem.metric]}]
    };
    if (GRPC_Problem.taskSubtype === 'taskSubtypeUndefined') delete GRPC_Problem.taskSubtype;

    let GRPC_ProblemInput = [
        {
            datasetId: app.workspace.d3m_config.name,
            targets: problem.targets.map(target => ({
                resourceId: app.workspace.raven_config.resourceId,
                columnIndex: Object.keys(app.variableSummaries).indexOf(target),  // Adjusted to match dataset doc
                columnName: target
            }))
        }
    ];

    return {
        problem: GRPC_Problem,
        inputs: GRPC_ProblemInput,
        description: app.getDescription(problem),
        name: problem.problemID
    };
}

export function GRPC_SearchSolutionsRequest(problem) {
    return {
        userAgent: TA3_GRPC_USER_AGENT, // set on django
        version: TA3TA2_API_VERSION, // set on django
        timeBoundSearch: problem.timeBound || 5,
        timeBoundRun: problem.timeBoundRun || 0,
        rankSolutionsLimit: problem.solutionsLimit || 0,
        priority: problem.priority || 0,
        allowedValueTypes: ['DATASET_URI', 'CSV_URI'],
        problem: GRPC_ProblemDescription(problem),
        template: GRPC_PipelineDescription(problem),
        inputs: [{dataset_uri: 'file://' + app.workspace.d3m_config.dataset_schema}]
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
            {id: 'TwoRavens', chosen: false, reason: ''}
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
        inputs: [{dataset_uri: 'file://' + datasetDocUrl}],
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
        users: [{id: 'TwoRavens', chosen: false, reason: ""}],
        // note: FL only using KFOLD in latest iteration (3/8/2019)
        configuration: {
            method: app.d3mEvaluationMethods[problem.evaluationMethod] || "K_FOLD",
            folds: problem.folds || 0,
            trainTestRatio: problem.trainTestRatio || 0,
            shuffle: problem.shuffle || false,
            randomSeed: problem.shuffleRandomSeed || 0,
            stratified: problem.stratified || false
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

    let problems = app.workspace.raven_config.problems;
    let solvedProblemId = Object.keys(problems)
        .find(problemId => problems[problemId].d3mSearchId === response.stored_request.search_id);
    let solvedProblem = problems[solvedProblemId];

    // end the search if it doesn't match any problem
    if (!solvedProblem) {
        console.warn('Attempting to end search ' + response.stored_request.search_id);
        endSearch(response.stored_request.search_id);
        return;
    }
    if (response.id === undefined) {
        console.warn('GetSearchSolutionResultsResponse: Error.  "response.id" undefined');
        return;
    }
    if (response.is_error) return;

    // ----------------------------------------
    // (2) Update or Create the Pipeline
    // ----------------------------------------

    response.source = 'd3m';
    delete response.response;
    delete response.response_as_json;
    delete response.stored_request;
    delete response.pipeline_id;

    // save the problem
    Object.assign(solvedProblem.solutions.d3m, {[response.id]: response});

    // this will NOT report the pipeline to user if pipeline has failed, if pipeline is still running, or if it has not completed
    // if(solutions[key].responseInfo.status.details == "Pipeline Failed")  {
    //     continue;
    // }
    // if(solutions[key].progressInfo == "RUNNING")  {
    //     continue;
    // }

    // VJD: this is a third core API call that is currently unnecessary
    //let pipelineid = PipelineCreateResult.pipelineid;
    // getexecutepipelineresults is the third to be called
    //  app.makeRequest(D3M_SVC_URL + '/getexecutepipelineresults', {context, pipeline_ids: Object.keys(solutions)});

    let selectedSolutions = results.getSolutions(solvedProblem);

    if (selectedSolutions.length === 0) results.setSelectedSolution(solvedProblem, 'd3m', response.id);

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

    let problems = app.workspace.raven_config.problems;
    let solvedProblemId = Object.keys(problems)
        .find(problemId => problems[problemId].d3mSearchId === response.searchId);
    let solvedProblem = problems[solvedProblemId];

    // end the search if it doesn't match any problem
    if (!solvedProblem) {
        console.warn('Attempting to end search ' + response.searchId);
        endSearch(response.searchId);
        return;
    }

    if (response.pipelineId === undefined) {
        console.log('handleDescribeSolutionResponse: Error.  "pipelineId" undefined');
        return;
    }
    debugLog('---- handleDescribeSolutionResponse -----');
    debugLog(JSON.stringify(response));

    // the pipeline template is the only useful information
    solvedProblem.solutions.d3m[response.pipelineId].pipeline = response.pipeline;
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

    let problems = app.workspace.raven_config.problems;
    let solvedProblemId = Object.keys(problems)
        .find(problemId => problems[problemId].d3mSearchId === response.stored_request.search_id);
    let solvedProblem = problems[solvedProblemId];

    // end the search if it doesn't match any problem
    if (!solvedProblem) {
        console.warn('Attempting to end search ' + response.stored_request.search_id);
        endSearch(response.stored_request.search_id);
        return;
    }

    if (response.is_finished === undefined) {
        debugLog('handleGetScoreSolutionResultsResponse: Error.  "response.data.is_finished" undefined');
        return;
    }
    if (!response.is_finished) return;
    if (response.is_error) return;

    solvedProblem.solutions.d3m[response.pipelineId].scores = response.response.scores;
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

    let problems = app.workspace.raven_config.problems;
    let solvedProblemId = Object.keys(problems)
        .find(problemId => problems[problemId].d3mSearchId === response.stored_request.search_id);
    let solvedProblem = problems[solvedProblemId];

    // end the search if it doesn't match any problem
    if (!solvedProblem) {
        console.warn('Attempting to end search ' + response.stored_request.search_id);
        endSearch(response.stored_request.search_id);
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

    let data_pointer = Object.values(response.response.exposedOutputs)[0].csvUri;

    let reducedProblem = Object.assign({}, solvedProblem);
    delete reducedProblem.solutions;

    // TODO: check if String cast necessary
    let d3mIndices = solvedProblem.actualValues.map(point => String(point.d3mIndex));
    app.makeRequest(D3M_SVC_URL + `/retrieve-output-data`, {data_pointer, indices: d3mIndices})
        .then(responseOutputData =>
            // TODO: this is only index zero if there is one target
            // TODO: multilabel problems will have d3mIndex collisions
            solvedProblem.solutions.d3m[response.pipelineId].predictedValues = responseOutputData.data
                .reduce((out, point) => Object.assign(out, {[point['']]: parseFloat(point['0']) || point['0']}), {}));

    // let problemMetadata = {
    //     dataset: app.workspace.d3m_config.name,
    //     task: solvedProblem.task,
    //     subTask: solvedProblem.subTask,
    //     predictors: solvedProblem.predictors,
    //     targets: solvedProblem.targets,
    //     nominal: app.getNominalVariables(solvedProblem),
    //     summaries: app.variableSummaries,
    //     manipulations: queryMongo.buildPipeline([
    //         ...solvedProblem.hardManipulations,
    //         ...solvedProblem.manipulations
    //     ]).pipeline
    // };
    //
    // app.makeRequest(D3M_SVC_URL + `/retrieve-output-statistics`, {data_pointer, metadata: problemMetadata})
    //     .then(responseStatistics =>
    //         solvedProblem.solutions.d3m[response.pipelineId].statistics = responseStatistics.data)
}

export async function handleENDGetSearchSolutionsResults() {

    // stop spinner
    app.buttonLadda.btnEstimate = false;
    // change status of buttons for estimating problem and marking problem as finished
    app.buttonClasses.btnEstimate = 'btn-secondary';

    app.setTask2_finished(true);
    m.redraw();
}

/**
 EndSession(SessionContext) returns (Response) {}
 */
export async function endsession() {
    let resultsProblem = app.getResultsProblem();

    let solutions = resultsProblem.solutions;
    if (Object.keys(solutions.d3m).length === 0) {
        alertError("No pipelines exist. Cannot mark problem as complete.");
        return;
    }

    let selectedPipelines = results.getSolutions(resultsProblem, 'd3m');
    if (selectedPipelines.length === 0) {
        alertWarn("No pipelines exist. Cannot mark problem as complete");
        return;
    }
    if (selectedPipelines.length > 1) {
        alertWarn("More than one pipeline selected. Please select one discovered pipeline");
        return;
    }

    let chosenSolutionId = selectedPipelines[0].response.solutionId;

    // calling exportSolution
    //
    let end = await exportSolution(chosenSolutionId);

    // app.makeRequest(D3M_SVC_URL + '/endsession', apiSession(zparams.zsessionid));
    //let res = await app.makeRequest(D3M_SVC_URL + '/endsession', apiSession(zparams.zsessionid));
    endAllSearches();
    //let mystatus = res.status.code.toUpperCase();
    //if(mystatus == "OK") {
    end_ta3_search(true, "Problem marked as complete.");
    setModal("Your selected pipeline has been submitted.", "Task Complete", true, false, true, locationReload);
    //}
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

    let response = await app.makeRequest(D3M_SVC_URL + '/SolutionExport3', {
        solutionId,
        rank: 1.01 - 0.01 * exportCount,
        searchId: app.getResultsProblem().d3mSearchId
    });

    console.warn("#debug response exportSolution");
    console.log(response);

    if (response === undefined)
        console.log('Failed to write executable for solutionId ' + solutionId);

    if (response.success === false)
        setModal(response.message,"Solution export failed", true, false, false, locationReload);

    return response;
}
