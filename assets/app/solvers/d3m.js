import {
    alertError,
    allsearchId,
    buttonClasses,
    buttonLadda,
    makeRequest,
    ROOKPIPE_FROM_REQUEST,
    setSelectedSolution,
} from "../app";
import m from "mithril";

import * as app from '../app.js';


export let getName = (problem, solution) => solution.pipelineId;
export let getActualValues = (problem, solution, target) => problem.dvvalues && problem.dvvalues.map(point => point[target]);
export let getFittedValues = (problem, solution, target) => {
    if (!(solution.predictedValues || {}).success) return;
    let samples = problem.dvvalues.map(point => point.d3mIndex);
    let fittedMap = solution.predictedValues.data.reduce((out, point) => Object.assign(out, {[point.d3mIndex || point['']]: point[target] || point['0']}), {})
    return samples.map(sample => fittedMap[sample]).map(datum => parseFloat(datum) || datum);
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


/**
 *  Function takes as input the pipeline template information (currently problem) and returns a valid pipline template in json. This json is to be inserted into SearchSolutions. e.g., problem = {...}, template = {...}, inputs = [dataset_uri]
 */
export function makePipelineTemplate(problem) {
    console.log('makePipelineTemplate problem:', problem);

    let inputs = [];
    let outputs = [];
    let steps = [];

    // if (problem) {
    //     inputs = [{name: "dataset"}];
    //     outputs = [{name: "dataset", data: "produce"}];
    //     // write the primitive object to remove columns, then generic step to be filled in
    //     steps = [primitiveStepRemoveColumns(problem), placeholderStep()];
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
    let keep = [...problem.predictors, ...problem.targets, "d3mIndex"];

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

    let argdata = {data: "inputs.0"};
    let argcontainer = {container: argdata};
    let parguments = {inputs: argcontainer};
    return {
        primitive: {
            primitive: primitive,
            arguments: parguments,
            outputs: [{id: "produce"}],
            hyperparams: hyperparams,
            users: []
        }
    };
}

/**
 Handle a websocket sent GetSearchSolutionResultsResponse
 wrapped in a StoredResponse object
 */
export async function handleGetSearchSolutionResultsResponse(response1) {
    if (response1 === undefined) {
        console.log('GetSearchSolutionResultsResponse: Error.  "response1" undefined');
        return;
    }

    // ----------------------------------------
    // (1) Pull the solutionId
    // ----------------------------------------
    console.log('(1) Pull the solutionId');

    // Note: the response.id becomes the Pipeline id
    //
    //
    if (response1.id === undefined) {
        console.warn('GetSearchSolutionResultsResponse: Error.  "response1.id" undefined');
        return;
    }
    if (response1.response.solutionId === undefined) {
        console.warn('GetSearchSolutionResultsResponse: Error.  "response1.response.solutionId" undefined');
        return;
    }
    // let solutionId = response1.response.solutionId;

    // ----------------------------------------
    // (2) Update or Create the Pipeline
    // ----------------------------------------
    // if (!ROOKPIPE_FROM_REQUEST) {
    //     console.warn('---------- ERROR: ROOKPIPE_FROM_REQUEST not set!!!');
    // }

    response1.source = 'd3m';

    let solverProblem = app.solverProblem.d3m;
    if (!solverProblem) {
        alertError('TA2 solution arrived for an unknown problem. Please end the TA2 solution search.');
        return;
    }
    let solutions = solverProblem.solutions.d3m;

    // Need to deal with (exclude) pipelines that are reported, but failed.  For approach, see below.
    if (response1.id in solutions)
        Object.assign(solutions[response1.id], response1);
    else {
        solutions[response1.id] = response1;
        solutions[response1.id].score = 'scoring';
    }

    // this will NOT report the pipeline to user if pipeline has failed, if pipeline is still running, or if it has not completed
    // if(solutions[key].responseInfo.status.details == "Pipeline Failed")  {
    //     continue;
    // }
    // if(solutions[key].progressInfo == "RUNNING")  {
    //     continue;
    // }

    //adding rookpipe to the set of d3m solutions for the problem
    // solutions.rookpipe = Object.assign({}, ROOKPIPE_FROM_REQUEST);                // This is setting rookpipe for the entire table, but when there are multiple CreatePipelines calls, this is only recording latest values

    // VJD: this is a third core API call that is currently unnecessary
    //let pipelineid = PipelineCreateResult.pipelineid;
    // getexecutepipelineresults is the third to be called
    //  makeRequest(D3M_SVC_URL + '/getexecutepipelineresults', {context, pipeline_ids: Object.keys(solutions)});

    let selectedSolutions = app.getSolutions(solverProblem);

    if (selectedSolutions.size === 0) setSelectedSolution(solverProblem, 'd3m', response1.id);

    // Add pipeline descriptions
    // TODO: this is redundant, check if can be deleted
    Object.assign(solutions[response1.id], response1.data);

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
    console.log('---- handleDescribeSolutionResponse -----');
    console.log(JSON.stringify(response));

    // -------------------------------
    // Update pipeline info....
    // -------------------------------
    let pipelineId = response.pipelineId;
    let solverProblem = app.solverProblem.d3m;
    if (!solverProblem) {
        alertError('TA2 solution arrived for an unknown problem. Please end the TA2 solution search.');
        return;
    }

    let solutions = solverProblem.solutions.d3m;

    Object.assign(solutions[pipelineId], response);
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

    let myscore;

    try {
        // This is very specific, the potential responses may vary greatly
        //
        myscore = response.response.scores[0].value.raw.double.toPrecision(3);
    } catch (error) {
        console.log(JSON.stringify(response));
        alertError('Error in "handleGetScoreSolutionResultsResponse": ' + error);
        return;
    }
    // Note: what's now the "res4DataId" needs to be sent to this function
    //
    let solverProblem = app.solverProblem.d3m;
    if (!solverProblem) {
        alertError('TA2 solution arrived for an unknown problem. Please end the TA2 solution search.');
        return;
    }

    let solutions = solverProblem.solutions.d3m;
    solutions[response.pipelineId].score = myscore;
    m.redraw();
}

/**
 Handle a GetProduceSolutionResultsResponse sent via websockets
 -> parse response, retrieve data, plot data
 */
export async function handleGetProduceSolutionResultsResponse(response) {

    if (response === undefined) {
        console.log('handleGetProduceSolutionResultsResponse: Error.  "response" undefined');
        return;
    }
    if (response.pipelineId === undefined) {
        console.log('handleGetProduceSolutionResultsResponse: Error.  "pipelineId" undefined');
        return;
    }
    console.log('---- handleGetProduceSolutionResultsResponse -----');
    console.log(JSON.stringify(response));

    // Note: UI update logic moved from generatePredictions
    if (!response.is_finished) {
        console.log('-- GetProduceSolutionResultsResponse not finished yet... (returning) --');
        return;
    } else if (response.is_error) {
        console.log('-- GetProduceSolutionResultsResponse has error --')
        console.log('response: ' + JSON.stringify(response));
        console.log('----------------------------------------------');
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
    let solutions = solverProblem.solutions.d3m;
    solutions[response.pipelineId].predictedValues = responseOutputData;

}

export async function handleENDGetSearchSolutionsResults() {

    // stop spinner
    buttonLadda.btnEstimate = false;
    // change status of buttons for estimating problem and marking problem as finished
    buttonClasses.btnEstimate = 'btn-secondary';

    app.solverProblem.d3m = undefined;

    m.redraw();

    app.setTask2_finished(true);
}