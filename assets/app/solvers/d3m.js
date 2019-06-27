import {
    alertError,
    alertWarn,
    allsearchId,
    buttonClasses,
    buttonLadda,
    d3mMetrics,
    d3mTaskSubtype,
    d3mTaskType,
    debugLog,
    getPredictorVariables,
    getResultsProblem,
    getSolutions,
    makeRequest,
    setSelectedSolution,
    variableSummaries,
    workspace
} from "../app";
import m from "mithril";

import * as app from '../app.js';
import {locationReload, setModal} from "../../common/views/Modal";

export let getName = (problem, solution) => solution.pipelineId;
export let getActualValues = (problem, solution, target) => problem.dvvalues && problem.dvvalues.map(point => point[target]);
export let getFittedValues = (problem, solution, target) => {
    if (!(solution.predictedValues || {}).success) return;
    let samples = problem.dvvalues.map(point => point.d3mIndex);
    return samples.map(sample => solution.predictedValues[sample]).map(datum => parseFloat(datum) || datum);
};
export let getScore = (problem, solution, target) => solution.score;
export let getDescription = (problem, solution) => solution.description;
export let getTask = (problem, solution) => solution.status;
export let getModel = (problem, solution) => `${(solution.steps || []).length} steps`;


export async function stopAllSearches() {
    let res = await makeRequest(D3M_SVC_URL + '/StopSearchSolutions', {searchId: allsearchId[0]});
    if (allsearchId.length > 1) {
        for (let i = 1; i < allsearchId.length; i++) {
            res = await makeRequest(D3M_SVC_URL + '/StopSearchSolutions', {searchId: allsearchId[i]});
        }
    }
}


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
    //     inputs = [{name: "dataset"}];
    //     outputs = [{name: "dataset", data: "produce"}];
    //     // TODO: debug primitive calls
    //     steps = [
    //         ...buildPipeline(problem.manipulations),
    //         primitiveStepRemoveColumns(problem),
    //         placeholderStep()
    //     ];
    // }
    return {inputs, outputs, steps};

    // example template: leave here for reference
    /*
"template": {
    "inputs": [
                {
                    "name": "dataset"
                }
            ],
    "outputs": [
                {
                    "name": "dataset",
                    "data": "produce"
                }
            ],
    "steps": [
    {
                    "primitive": {
                    "primitive": {
                        "id": "2eeff053-395a-497d-88db-7374c27812e6",
                    "version": "0.2.0",
                    "python_path": "d3m.primitives.datasets.RemoveColumns",
                    "name": "Column remover",
                    "digest": "85b946aa6123354fe51a288c3be56aaca82e76d4071c1edc13be6f9e0e100144"
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
                        "users": []
                }},{
                    "placeholder": {
                        "inputs": [{"data":"steps.0.produce"}],
                        "outputs": [{"id":"produce"}]
                    }
                }]}
                    */
}/*
  Triggered at the end of GetSearchSolutionsResults
*/
// function builds a step in a pipeline to remove indices
// function builds a placeholder step for pipeline
/**
 *  Send a status message to the TA3 console
 */
export function ta3_search_message(user_msg) {
    /*
    let ta3_search_message = {'message': user_msg}

    const end_search_url = 'ta3-search/send-reviewer-message';

    try {
        let res = m.request(end_search_url,
                            {method: 'POST', data: ta3_search_message});
        console.log('ta3_search_message succeeded:' + res);
    } catch (err) {
        console.log('ta3_search_message failed: ' + err);
    }
    */
}

export function test_msg_ta3_search() {
    //end_ta3_search(true, 'it worked!');
    //end_ta3_search(false, 'it failed!');
    //ta3_search_message('just sending a message!');
}

/**
 *  End the TA3 search.  This sends a message
 *  to the ta3_search console as well as message
 *  for the console to exit with a:
 *  - return code 0 for success
 *  - return code -1 for failure
 *
 *  > is_success - boolean
 *  > user_msg - string sent to the console
 */
export function end_ta3_search(is_success, user_msg) {

    // 6/21/2018 - removed from eval
    /*
    let end_search_msg = {'is_success': is_success,
                          'message': user_msg}

    const end_search_url = 'ta3-search/end-search';

    try {
        let res = m.request(end_search_url,
                            {method: 'POST', data: end_search_msg});
        console.log('end_ta3_search succeeded:' + res);
    } catch (err) {
        console.log('end_ta3_search failed: ' + err);
    }
    */
}

export async function endAllSearches() {
    console.log("Attempting to End All Searches");
    console.log(allsearchId);
    console.log(allsearchId[0]);
    let res = await makeRequest(D3M_SVC_URL + '/EndSearchSolutions', {searchId: allsearchId[0]});
    if (allsearchId.length > 1) {
        for (let i = 1; i < allsearchId.length; i++) {
            res = await makeRequest(D3M_SVC_URL + '/EndSearchSolutions', {searchId: allsearchId[i]});
        }
    }
    //allsearchId = [];
}

function placeholderStep() {
    let step = {inputs: [{data: "steps.0.produce"}], outputs: [{id: "produce"}]};
    return {placeholder: step};
}

function primitiveStepRemoveColumns(problem) {
    // looks like some TA2s need "d3mIndex"
    let keep = [...app.getPredictorVariables(problem), ...problem.targets, "d3mIndex"];

    let indices = [];
    Object.keys(variableSummaries).forEach((variable, i) => keep.includes(variable) && indices.push(i));

    let primitive = {
        id: "2eeff053-395a-497d-88db-7374c27812e6",
        version: "0.2.0",
        python_path: "d3m.primitives.datasets.RemoveColumns",
        name: "Column remover",
        digest: "85b946aa6123354fe51a288c3be56aaca82e76d4071c1edc13be6f9e0e100144"
    };

    let hpitems = {items: indices.map(index => ({int64: index.toString()}))};
    let hplist = {list: hpitems};
    let hpraw = {raw: hplist};
    let hpdata = {data: hpraw};
    let hpvalue = {value: hpdata};
    let hyperparams = {columns: hpvalue};

    return {
        primitive: {
            primitive,
            arguments: {inputs: {container: {data: "inputs.0"}}},
            outputs: [{id: "produce"}],
            hyperparams,
            users: []
        }
    };
}


// ------------------------------------------
//      create search request
// ------------------------------------------

// create problem definition for SearchSolutions call
function GRPC_ProblemDescription(problem) {
    let GRPC_Problem = {
        taskType: d3mTaskType[problem.task],
        taskSubtype: problem.taskSubtype || d3mTaskSubtype.subtypeNone,
        performanceMetrics: [{metric: d3mMetrics[problem.metric]}]
    };
    if (GRPC_Problem.taskSubtype === 'taskSubtypeUndefined') delete GRPC_Problem.taskSubtype;

    let GRPC_ProblemInput = [
        {
            datasetId: workspace.d3m_config.name,
            targets: problem.targets.map(target => ({
                resourceId: workspace.raven_config.resourceId,
                columnIndex: Object.keys(variableSummaries).indexOf(target),  // Adjusted to match dataset doc
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
        inputs: [{dataset_uri: 'file://' + workspace.d3m_config.dataset_schema}]
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
        performanceMetrics: problem.metrics.map(metric => ({metric: d3mMetrics[metric]})),
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
 */
export async function handleGetSearchSolutionResultsResponse(response) {
    if (response === undefined) {
        console.log('GetSearchSolutionResultsResponse: Error.  "response1" undefined');
        return;
    }

    // ----------------------------------------
    // (1) Pull the solutionId
    // ----------------------------------------
    debugLog('(1) Pull the solutionId');

    console.warn('handleGetSearchSolutionResultsResponse');
    console.log(JSON.stringify(response));

    // Note: the response.id becomes the Pipeline id
    //
    //
    if (response.id === undefined) {
        console.warn('GetSearchSolutionResultsResponse: Error.  "response1.id" undefined');
        return;
    }
    if (response.response.solutionId === undefined) {
        console.warn('GetSearchSolutionResultsResponse: Error.  "response1.response.solutionId" undefined');
        return;
    }
    // let solutionId = response1.response.solutionId;

    // ----------------------------------------
    // (2) Update or Create the Pipeline
    // ----------------------------------------
    response.source = 'd3m';

    let solverProblem = app.solverProblem.d3m;
    if (!solverProblem) {
        endAllSearches();
        alertError('Solution arrived for an unknown problem. Ending the previous search.');
        return;
    }
    let solutions = solverProblem.solutions.d3m;
    console.log(JSON.stringify(response));
    // Need to deal with (exclude) pipelines that are reported, but failed.  For approach, see below.
    if (response.id in solutions)
        Object.assign(solutions[response.id], response);
    else {
        solutions[response.id] = response;
        solutions[response.id].score = 'scoring';
    }

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
    //  makeRequest(D3M_SVC_URL + '/getexecutepipelineresults', {context, pipeline_ids: Object.keys(solutions)});

    let selectedSolutions = app.getSolutions(solverProblem);

    if (selectedSolutions.length === 0) setSelectedSolution(solverProblem, 'd3m', response.id);

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
    if (response.pipelineId === undefined) {
        console.log('handleDescribeSolutionResponse: Error.  "pipelineId" undefined');
        return;
    }
    debugLog('---- handleDescribeSolutionResponse -----');
    debugLog(JSON.stringify(response));

    // -------------------------------
    // Update pipeline info....
    // -------------------------------
    let pipelineId = response.pipelineId;
    let solverProblem = app.solverProblem.d3m;
    if (!solverProblem) {
        alertError('TA2 solution arrived for an unknown problem. Please end the TA2 solution search.');
        return;
    }

    // this steps seems to be a useless copy with missing information. The steps are really stored in 'response.pipeline.steps'
    delete response.steps;


    Object.assign(solverProblem.solutions.d3m[pipelineId], response);
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
    if (response.is_finished === undefined) {
        console.log('handleGetScoreSolutionResultsResponse: Error.  "response.data.is_finished" undefined');
        return;
    }
    if (!response.is_finished) return;
    if (response.is_error) return;

    // Note: what's now the "res4DataId" needs to be sent to this function
    //
    let solverProblem = app.solverProblem.d3m;
    if (!solverProblem) {
        alertError('TA2 solution arrived for an unknown problem. Please end the TA2 solution search.');
        return;
    }

    let solution = solverProblem.solutions.d3m[response.pipelineId];
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

    let hold = response.response.exposedOutputs;
    let hold2 = hold[Object.keys(hold)[0]];  // There's an issue getting ."outputs.0".csvUri directly.
    let hold3 = hold2.csvUri;


    let solverProblem = app.solverProblem.d3m;
    if (!solverProblem)  {
        alertError('TA2 solution arrived for an unknown problem. Please end the TA2 solution search.');
        return;
    }

    let responseOutputData = await makeRequest(D3M_SVC_URL + `/retrieve-output-data`, {data_pointer: hold3});

    let predictedValues = responseOutputData.data
        .reduce((out, point) => Object.assign(out, {[point['']]: point['0']}), {});

    solverProblem.solutions.d3m[response.pipelineId].predictedValues = predictedValues;
}

export async function handleENDGetSearchSolutionsResults() {

    // stop spinner
    buttonLadda.btnEstimate = false;
    // change status of buttons for estimating problem and marking problem as finished
    buttonClasses.btnEstimate = 'btn-secondary';

    app.solverProblem.d3m = undefined;
    app.setTask2_finished(true);
    m.redraw();
}

/**
 EndSession(SessionContext) returns (Response) {}
 */
export async function endsession() {
    let resultsProblem = getResultsProblem();

    let solutions = resultsProblem.solutions;
    if (Object.keys(solutions.d3m).length === 0) {
        alertError("No pipelines exist. Cannot mark problem as complete.");
        return;
    }

    let selectedPipelines = getSolutions(resultsProblem, 'd3m');
    if (selectedPipelines.size === 0) {
        alertWarn("No pipelines exist. Cannot mark problem as complete");
        return;
    }
    if (selectedPipelines.size > 1) {
        alertWarn("More than one pipeline selected. Please select one discovered pipeline");
        return;
    }

    let chosenSolutionId = [...selectedPipelines][0].response.solutionId;

    // calling exportSolution
    //
    let end = await exportSolution(chosenSolutionId);

    // makeRequest(D3M_SVC_URL + '/endsession', apiSession(zparams.zsessionid));
    //let res = await makeRequest(D3M_SVC_URL + '/endsession', apiSession(zparams.zsessionid));
    endAllSearches()
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
export async function exportSolution(solutionId) {
    exportCount++;
    let res;
    let my_rank = 1.01 - 0.01 * exportCount;   // ranks always gets smaller each call

    let params = {solutionId: solutionId,
        rank: my_rank,
        searchId: (allsearchId.length) ? allsearchId[0] : null};
    res = await makeRequest(D3M_SVC_URL + '/SolutionExport3', params);

    console.log(res);
    if (typeof res === 'undefined') {
        console.log('Failed to write executable for solutionId:' + solutionId);
        return res;
    }

    if (res.success === false) {
        // console.log('Successful Augment.  Try to reload now!!');
        console.log(msg_data.message);
        setModal(res.message,
            "Solution export failed", true, false, false, locationReload);
    }

    return res;
}

/** needs doc */
export function deletepipeline() {
    console.log("DELETE CALLED");
}

/**
 D3M API HELPERS
 because these get built in various places, pulling them out for easy manipulation
 */
function apiFeature (vars, uri) {
    let out = [];
    for(let i = 0; i < vars.length; i++) {
        out.push({featureId:vars[i],dataUri:uri});
    }
    return out;
}

/** needs doc */
function apiFeatureShortPath (vars, uri) {
    let out = [];
    let shortUri = uri.substring(0, uri.lastIndexOf("/"));
    for(let i = 0; i < vars.length; i++) {
        out.push({featureId:vars[i],dataUri:shortUri});
    }
    return out;
}

/**
 silly but perhaps useful if in the future SessionContext requires more things (as suggest by core)
 */
function apiSession(context) {
    return {session_id: context};
}
