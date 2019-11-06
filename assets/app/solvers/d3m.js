import m from "mithril";

import * as app from '../app.js';
import * as results from "../results";

import {alertError, alertWarn, debugLog, swandive} from "../app";

import {locationReload, setModal} from "../../common/views/Modal";
import {isKeyDefined} from "../utils";
import Table from "../../common/views/Table";

export let getSolverSpecification = async problem => {

    problem.datasetSchemas = {
        all: app.workspace.d3m_config.dataset_schema
    };
    problem.datasetPaths = {
        all: app.workspace.datasetPath
    };

    problem.solverState.d3m = {thinking: true};
    problem.solverState.d3m.message = 'preparing partials data';
    m.redraw();
    if (!app.materializePartialsPromise[problem.problemID])
        app.materializePartialsPromise[problem.problemID] = app.materializePartials(problem);
    await app.materializePartialsPromise[problem.problemID];

    problem.solverState.d3m.message = 'preparing train/test splits';
    m.redraw();
    if (!app.materializeTrainTestPromise[problem.problemID])
        app.materializeTrainTestPromise[problem.problemID] = app.materializeTrainTest(problem, problem.datasetSchemas.all);
    await app.materializeTrainTestPromise[problem.problemID];

    problem.solverState.d3m.message = 'initiating the search for solutions';
    m.redraw();

    let trainDatasetSchema = problem.datasetSchemas[problem.outOfSampleSplit ? 'train' : 'all'];

    let allParams = {
        searchSolutionParams: GRPC_SearchSolutionsRequest(problem, trainDatasetSchema),
        fitSolutionDefaultParams: GRPC_GetFitSolutionRequest(trainDatasetSchema),
        scoreSolutionDefaultParams: GRPC_ScoreSolutionRequest(problem, problem.datasetSchemas.all),
        produceSolutionDefaultParams: {}
    };

    if (problem.outOfSampleSplit) {
        allParams.produceSolutionDefaultParams.test = GRPC_ProduceSolutionRequest(problem.datasetSchemas.test);
        allParams.produceSolutionDefaultParams.train = GRPC_ProduceSolutionRequest(problem.datasetSchemas.train);
    } else
        allParams.produceSolutionDefaultParams.all = GRPC_ProduceSolutionRequest(problem.datasetSchemas.all);

    if (problem.datasetSchemas.partials)
        allParams.produceSolutionDefaultParams.partials = GRPC_ProduceSolutionRequest(problem.datasetSchemas.partials);

    return allParams;
};

export let getD3MAdapter = problem => ({
    solve: async () => {
        // return if current problem is already being solved
        if ('d3m' in problem.solverState) return;
        console.log("solving:", problem);

        problem.solverState.d3m = {thinking: true};

        if (!IS_D3M_DOMAIN) return;

        if (swandive) {
            alertError('estimate() function. Check app.js error with swandive (err: 003)');
            return;
        }

        m.redraw();

        let allParams = await getSolverSpecification(problem);

        console.warn("#debug allParams");
        console.log(JSON.stringify(allParams));

        let res = await m.request(D3M_SVC_URL + '/SearchDescribeFitScoreSolutions', {method: 'POST', data: allParams});

        if (!res || !res.success) {
            handleENDGetSearchSolutionsResults();
            alertError('SearchDescribeFitScoreSolutions request Failed! ' + res.message);
            m.redraw();
            return;
        }

        // sort resulting pipelines by the primary metric by default
        results.resultsPreferences.selectedMetric = problem.metric;

        // route streamed responses with this searchId to this problem
        problem.solverState.d3m.searchId = res.data.searchId;
        problem.solverState.d3m.message = 'searching for solutions';
        problem.selectedSolutions.d3m = [];
        m.redraw();
    },
    search: () => {
        throw 'Search not implemented for D3M.';
    },
    describe: solutionId => {
        throw 'Describe not implemented for D3M.';
    },
    produce: (solutionId, specification) => {
        throw 'Produce not implemented for D3M.';
    },
    score: (solutionId, specification) => {
        throw 'Score not implemented for D3M.';
    },
    stop: stopSearch
});

// functions to extract information from D3M response format
export let getSolutionAdapter = (problem, solution) => ({
    getName: () => String(solution.pipelineId),
    getSystemId: () => 'd3m',
    getSolutionId: () => String(solution.pipelineId),
    getDataPointer: pointerId => (solution.produce || {})[pointerId],
    getActualValues: target => {
        // lazy data loading
        results.loadActualValues(problem);

        let problemData = results.resultsData.actuals;
        // cached data is current, return it
        return problemData && problemData.map(point => point[target]);
    },
    getFittedValues: target => {
        let adapter = getSolutionAdapter(problem, solution);
        // lazy data loading
        results.loadFittedValues(problem, adapter);

        if (!results.resultsData.actuals) return;
        if (!results.resultsData.fitted[solution.pipelineId]) return;


        // cached data is current, return it
        return results.resultsData.actuals.map(point => point.d3mIndex)
            .map(sample => results.resultsData.fitted[solution.pipelineId][sample][target])
    },
    getConfusionMatrix: target => {
        let adapter = getSolutionAdapter(problem, solution);
        results.loadConfusionData(problem, adapter);
        if (solution.pipelineId in results.resultsData.confusion)
            return results.resultsData.confusion[solution.pipelineId][target];
    },
    getScore: metric => {
        if (!solution.scores) return;
        let evaluation = solution.scores.find(score => app.d3mMetricsInverted[score.metric.metric] === metric);
        return evaluation && evaluation.value.raw.double
    },
    getDescription: () => solution.description,
    getTask: () => solution.status,
    getModel: () => solution.pipeline !== undefined
        ? solution.pipeline.steps
            .filter(step => ['regression', 'classification'].includes(step.primitive.primitive.pythonPath.split('.')[2]))
            .map(step => step.primitive.primitive.pythonPath.replace(new RegExp('d3m\\.primitives\\.(regression|classification|semisupervised_classification|semisupervised_regression)\\.'), ''))
            .join()
        : '',
    getImportanceEFD: predictor => {
        let adapter = getSolutionAdapter(problem, solution);
        results.loadImportanceEFDData(problem, adapter);

        if (results.resultsData.importanceEFD)
            return results.resultsData.importanceEFD[predictor];
    },
    getImportancePartials: predictor => {
        let adapter = getSolutionAdapter(problem, solution);
        results.loadImportancePartialsFittedData(problem, adapter);

        if (!results.resultsData.importancePartialsActual) return;
        if (!results.resultsData.importancePartialsFitted[solution.pipelineId]) return;

        return app.melt(
            results.resultsData.importancePartialsActual[predictor]
                .map((x, i) => Object.assign({[predictor]: x},
                    results.resultsData.importancePartialsFitted[solution.pipelineId][predictor][i])),
            [predictor],
            results.valueLabel, results.variableLabel);
    },
});

// no new pipelines will be found under searchId
// pipelines under searchId are also wiped/no longer accessible
export let endSearch = async searchId => {

  if (searchId === undefined) return;

  app.makeRequest(D3M_SVC_URL + '/EndSearchSolutions', {searchId})
      .then(handleCompletedSearch(searchId));
}
// no new pipelines will be found under searchId
// discovered pipelines will remain accessible for produce calls
export let stopSearch = async searchId =>{

  if (searchId === undefined) return;

  app.makeRequest(D3M_SVC_URL + '/StopSearchSolutions', {searchId})
    .then(handleCompletedSearch(searchId));
}

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
    let solvedProblem = Object.values(app.workspace.raven_config.problems)
        .find(problem => problem.solverState.d3m.searchId === String(searchId));

    if (solvedProblem) {
        solvedProblem.solverState.d3m.thinking = false;
        solvedProblem.solverState.d3m.message = 'search complete';
    }

    m.redraw()
};

/*
 * Iterate through the problems and end any ongoing searches
 *
 * Note: not all problems have a d3mSearchId
 */
export let endAllSearches = async () => {
    Object.keys(app.workspace.raven_config.problems)
    .map(problemId => app.workspace.raven_config.problems[problemId].d3mSearchId)
    .forEach(searchId => searchId && endSearch(searchId));
}

/*
 * Iterate through the problems and stop any ongoing searches
 *
 *  Note: not all problems have a d3mSearchId
 */
export let stopAllSearches = async () => Object.keys(app.workspace.raven_config.problems)
    .map(problemId => app.workspace.raven_config.problems[problemId].d3mSearchId)
    .forEach(searchId => searchId && stopSearch(searchId));

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
export function GRPC_ProblemDescription(problem) {
    let GRPC_Problem = {
        taskType: app.d3mTaskType[problem.task],
        taskSubtype: problem.taskSubtype || app.d3mTaskSubtype.subtypeNone,
        performanceMetrics: [{metric: app.d3mMetrics[problem.metric]}]
    };
    if (GRPC_Problem.taskSubtype === 'taskSubtypeUndefined') delete GRPC_Problem.taskSubtype;

    let GRPC_ProblemInput = [
        {
            datasetId: app.workspace.datasetDoc.about.datasetID,
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

export function GRPC_SearchSolutionsRequest(problem, datasetDocUrl) {
    return {
        userAgent: TA3_GRPC_USER_AGENT, // set on django
        version: TA3TA2_API_VERSION, // set on django
        timeBoundSearch: problem.timeBoundSearch || 0,
        timeBoundRun: problem.timeBoundRun || 0,
        rankSolutionsLimit: problem.solutionsLimit || 0,
        priority: problem.priority || 0,
        allowedValueTypes: ['DATASET_URI', 'CSV_URI'],
        problem: GRPC_ProblemDescription(problem),
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

    let problems = ((app.workspace || {}).raven_config || {}).problems || {};
    let solvedProblemId = Object.keys(problems)
        .filter(problemId => ((problems[problemId].solverState || {}).d3m || {}).searchId)
        .find(problemId => problems[problemId].solverState.d3m.searchId === response.stored_request.search_id);
    let solvedProblem = problems[solvedProblemId];

    // end the search if it doesn't match any problem
    if (!solvedProblem) {
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

    // ----------------------------------------
    // (2) Update or Create the Pipeline
    // ----------------------------------------

    response.systemId = 'd3m';
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

    let selectedSolutions = results.getSelectedSolutions(solvedProblem);
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

    let problems = ((app.workspace || {}).raven_config || {}).problems || {};
    let solvedProblemId = Object.keys(problems)
        .filter(problemId => ((problems[problemId].solverState || {}).d3m || {}).searchId)
        .find(problemId => problems[problemId].solverState.d3m.searchId === response.searchId);
    let solvedProblem = problems[solvedProblemId];

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

    // the pipeline template is the only useful information

    solvedProblem.solutions.d3m[response.pipelineId].pipeline = response.pipeline;
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

    let problems = ((app.workspace || {}).raven_config || {}).problems || {};
    let solvedProblemId = Object.keys(problems)
        .filter(problemId => ((problems[problemId].solverState || {}).d3m || {}).searchId)
        .find(problemId => problems[problemId].solverState.d3m.searchId === response.stored_request.search_id);
    let solvedProblem = problems[solvedProblemId];

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

    let problems = ((app.workspace || {}).raven_config || {}).problems || {};
    let solvedProblemId = Object.keys(problems)
        .filter(problemId => ((problems[problemId].solverState || {}).d3m || {}).searchId)
        .find(problemId => problems[problemId].solverState.d3m.searchId === response.stored_request.search_id);
    let solvedProblem = problems[solvedProblemId];

    if (!solvedProblem) {
        results.otherSearches[response.stored_request.search_id] = results.otherSearches[response.stored_request.search_id] || {};
        if (results.otherSearches[response.stored_request.search_id].running === undefined)
            results.otherSearches[response.stored_request.search_id].running = true;
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

    let pointer = Object.values(response.response.exposedOutputs)[0].csvUri.replace('file://', '');

    let pipeline = solvedProblem.solutions.d3m[response.pipelineId];
    pipeline.produce = pipeline.produce || {};
    pipeline.produce[response.produce_dataset_name] = pointer;
    // console.warn("#debug produce results pointer");
    // console.log(response.produce_dataset_name, pointer);

    m.redraw();
}

export async function handleENDGetSearchSolutionsResults(response) {

    console.warn("#debug response end get search solutions results");
    console.log(response);

    m.redraw();
}

/**
 EndSession(SessionContext) returns (Response) {}
 */
export async function endsession() {
    app.taskPreferences.isSubmittingPipelines = true;
    let resultsProblem = app.getResultsProblem();

    let solutions = resultsProblem.solutions;
    if (Object.keys(solutions.d3m).length === 0) {
        alertError("No pipelines exist. Cannot mark problem as complete.");
        return;
    }

    let selectedPipelines = results.getSelectedSolutions(resultsProblem, 'd3m');
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

    let plineId = isKeyDefined(selectedSolution, 'pipelineId');
    if (plineId === undefined){
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

    let selectedSolutionId = isKeyDefined(selectedSolution, 'pipeline.id');
    if (selectedSolutionId === undefined){
      setModal(m('div', {}, [
              m('p', 'Sorry!  The solutionId for the selected pipeline could not be found.'),
              m('p', 'The solution was not exported.'),
              ]),
               `Pipeline ${plineId}: Failed to Export Solution`,
               true,
               "Close",
               true);
      return;
    }
    m.redraw();

    // calling exportSolution
    //
    let status = await exportSolution(String(selectedSolutionId));

    if (status.success) {
        app.taskPreferences.isSubmittingPipelines = false;
        app.taskPreferences.task2_finished = true;
        // more descriptive solution modal that doesn't lock the page
        // selectedSolution.chosen = true;
        // results.setShowFinalPipelineModal(true);

        // we don't need to wait for the backend to spin down before telling the user, no await used
        endAllSearches();

        let resetTheApp = () => {
            window.location.pathname = clear_user_workspaces_url;
        }

        setModal(m('div', {}, [
                m('p', 'Finished! The problem is marked as complete.'),
                // m('p', ''),
            ]),
            "Task complete",
            true,
            "Restart",
            false,
            resetTheApp);
        m.redraw()
    } else {
        status.name = 'Error from pipeline submission.';
        alertError(m(Table, {data: status}))
    }
}

/*
 * End any running searches and display message
 */
export let endAllSearches2 = async () => {
  console.log('--- Stop any running searches ---');
  Object.keys(app.workspace.raven_config.problems).map(problemId => {
    //
    // For problems with a 'd3mSearchId', send a EndSearchSolutions call
    //
    let yeProblem = app.workspace.raven_config.problems[problemId];
    let d3mSearchIdToStop = isKeyDefined(yeProblem, 'd3mSearchId');
    console.log('endAllSearches2: ' + d3mSearchIdToStop);

    if (d3mSearchIdToStop !== undefined){
      console.log(`end search: ${d3mSearchIdToStop}`);
      let endResp = app.makeRequest(D3M_SVC_URL + '/EndSearchSolutions',
                                         {searchId: d3mSearchIdToStop});
      console.log(JSON.stringify(endResp))
    }
  })
} // end: endAllSearches2

/*
 *  Given a problem, check if it has a d3mSearchId.
 *  If it does, then send an EndSearchSolutions call
 */
export let endSearch2 = async problem => {
  let d3mSearchIdToStop = isKeyDefined(problem, 'd3mSearchId');
  console.log('endSearch2: ' + d3mSearchIdToStop);

  if (d3mSearchIdToStop !== undefined){
    console.log(`stop search: ${d3mSearchIdToStop}`);
    let endResp = await app.makeRequest(D3M_SVC_URL + '/EndSearchSolutions',
                                       {searchId: d3mSearchIdToStop});
    console.log(JSON.stringify(endResp))
  }
} // end: endSearch2

/*
let endAllSearches2 = async () => Object.keys(app.workspace.raven_config.problems).map(problemId => {
   let problemInfo = app.workspace.raven_config.problems[problemId];
   console.log(problemId);
   let d3mSearchIdToStop = isKeyDefined(problemInfo, 'd3mSearchId');
   if (d3mSearchIdToStop !== undefined){
     console.log('stop it: ' + d3mSearchIdToStop);
     let endResp = await app.makeRequest(D3M_SVC_URL + '/EndSearchSolutions',
                                        {searchId: d3mSearchIdToStop});
     console.log(JSON.stringify(endResp))

   }else{
     console.log('nuthing running');
   }
})
*/

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

    let response = await m.request(D3M_SVC_URL + '/SolutionExport3', {method: 'POST', data: {
        solutionId,
        rank: 1.01 - 0.01 * exportCount,
        searchId: app.getResultsProblem().solverState.d3m.searchId
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
