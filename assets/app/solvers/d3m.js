import m from "mithril";

import * as app from '../app.js';
import * as results from "../results";

import {alertError, alertWarn, debugLog} from "../app";

import {locationReload, setModal} from "../../common/views/Modal";
import * as queryMongo from "../manipulations/queryMongo";
import {isKeyDefined} from "../utils";
import Table from "../../common/views/Table";

// functions to extract information from D3M response format
export let getSolutionAdapter = (problem, solution) => ({
    getName: () => solution.pipelineId,
    getSource: () => solution.source,
    getVariable: predictor => {
        loadVariable(problem, predictor);
    },
    getActualValues: target => {
        // lazy data loading
        loadActualValues(problem);

        let problemData = resultsData.actuals;
        // cached data is current, return it
        return problemData && problemData.map(point => point[target]);
    },
    getFittedValues: target => {
        // lazy data loading
        loadFittedValues(problem, solution);

        if (!resultsData.actuals) return;
        if (!resultsData.fitted[solution.pipelineId]) return;


        // cached data is current, return it
        return resultsData.actuals.map(point => point.d3mIndex)
            .map(sample => resultsData.fitted[solution.pipelineId][sample][target])
    },
    getConfusionMatrix: target => {
        loadConfusionData(problem, solution);
        if (solution.pipelineId in resultsData.confusion)
            return resultsData.confusion[solution.pipelineId][target];
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
        loadImportanceEFDData(problem, solution);

        if (resultsData.importanceEFD)
            return resultsData.importanceEFD[predictor];
    },
    getImportancePartials: predictor => {
        loadImportancePartialsFittedData(problem, solution);

        if (!resultsData.importancePartialsActual) return;
        if (!resultsData.importancePartialsFitted[solution.pipelineId]) return;

        return app.melt(
            resultsData.importancePartialsActual[predictor]
                .map((x, i) => Object.assign({[predictor]: x},
                    resultsData.importancePartialsFitted[solution.pipelineId][predictor][i])),
            [predictor],
            results.valueLabel, results.variableLabel);
    },
});

// these variables hold indices, predictors, predicted and actual data
export let resultsData = {
    actuals: undefined,
    actualsLoading: false,

    // cached data is specific to the problem
    fitted: {},
    fittedLoading: {},

    // cached data is specific to the problem
    confusion: {},
    confusionLoading: {},

    // cached data is specific to the solution (tends to be larger)
    importanceEFD: undefined,
    importanceEFDLoading: false,

    // this has melted data for both actual and fitted values
    importancePartialsFitted: {},
    importancePartialsFittedLoading: {},

    // this has only the essential predictor data that the dataset was fit with
    importancePartialsActual: undefined,
    importancePartialsActualLoading: false,

    id: {
        query: [],
        problemID: undefined,
        solutionID: undefined
    }
};
export let resultsQuery = [];

export let recordLimit = 1000;


export let loadProblemData = async problem => {
    if (resultsData.id.problemID === problem.problemID && JSON.stringify(resultsData.id.query) === JSON.stringify(resultsQuery))
        return;

    resultsData.id.query = resultsQuery;
    resultsData.id.problemID = problem.problemID;
    resultsData.id.solutionID = undefined;

    // problem specific, one problem stored
    resultsData.indices = undefined;
    resultsData.indicesLoading = false;

    // problem specific, one problem stored
    resultsData.actuals = undefined;
    resultsData.actualsLoading = false;

    // solution specific, all solutions stored
    resultsData.fitted = {};
    resultsData.fittedLoading = {};

    // solution specific, all solutions stored
    resultsData.confusion = {};
    resultsData.confusionLoading = {};

    // solution specific, one solution stored
    resultsData.importanceEFD = undefined;
    resultsData.importanceEFDLoading = false;

    // solution specific, all solution stored
    resultsData.importancePartialsFitted = {};
    resultsData.importancePartialsFittedLoading = {};

    // problem specific, one problem scored
    resultsData.importancePartialsActual = undefined;
    resultsData.importancePartialsActualLoading = false;
};

export let loadSolutionData = async (problem, solution) => {
    await loadProblemData(problem);

    if (resultsData.id.solutionID === solution.pipelineId)
        return;

    resultsData.id.solutionID = solution.pipelineId;

    // solution specific, one solution stored
    resultsData.importanceEFD = undefined;
    resultsData.importanceEFDLoading = false;
};

export let loadActualValues = async problem => {

    // reset if id is different
    await loadProblemData(problem);

    // don't load if systems are already in loading state
    if (resultsData.actualsLoading)
        return;

    // don't load if already loaded
    if (resultsData.actuals)
        return;

    // begin blocking additional requests to load
    resultsData.actualsLoading = true;

    let tempQuery = JSON.stringify(resultsData.id.query);
    let response;
    try {
        response = await app.getData({
            method: 'aggregate',
            query: JSON.stringify(queryMongo.buildPipeline(
                [
                    ...workspace.raven_config.hardManipulations,
                    ...problem.manipulations,
                    {
                        type: "subset",
                        abstractQuery: [
                            {
                                column: "d3mIndex",
                                children: problem.indices.map(index => ({value: index})),
                                subset: 'discrete',
                                type: 'rule'
                            }
                        ]
                    },
                    {
                        type: 'menu',
                        metadata: {
                            type: 'data',
                            variables: ['d3mIndex', ...problem.targets],
                            sample: recordLimit
                        }
                    },
                ],
                workspace.raven_config.variablesInitial)['pipeline'])
        })
    } catch (err) {
        app.alertWarn('Dependent variables have not been loaded. Some plots will not load.')
    }

    // don't accept if problemID changed
    if (resultsData.id.problemID !== problem.problemID)
        return;

    // don't accept if query changed
    if (JSON.stringify(resultsData.id.query) !== tempQuery)
        return;

    resultsData.actuals = response;
    resultsData.actualsLoading = false;

    m.redraw()
};

export let loadFittedValues = async (problem, solution) => {
    // load dependencies, which can clear loading state if problem, etc. changed
    await loadSolutionData(problem, solution);

    // don't attempt to load if there is no data
    if (!solution.data_pointer) return;

    // don't load if systems are already in loading state
    if (resultsData.fittedLoading[solution.pipelineId])
        return;

    // don't load if already loaded
    if (solution.pipelineId in resultsData.fitted)
        return;

    // don't load if dependencies are not loaded
    if (!resultsData.actuals)
        return;

    // begin blocking additional requests to load
    resultsData.fittedLoading[solution.pipelineId] = true;

    let tempQuery = JSON.stringify(resultsData.id.query);
    let response;
    try {
        response = await app.makeRequest(D3M_SVC_URL + `/retrieve-output-data`, {
            data_pointer: solution.data_pointer,
            indices: resultsData.actuals.map(point => String(point.d3mIndex))
        });

        if (!response.success) {
            console.warn(response.data);
            throw response.data;
        }
    } catch (err) {
        app.alertWarn('Solution data has not been loaded. Some plots will not load.');
        return;
    }

    // don't accept response if current problem has changed
    if (resultsData.id.problemID !== problem.problemID)
        return;

    // don't accept if query changed
    if (JSON.stringify(resultsData.id.query) !== tempQuery)
        return;

    resultsData.fitted[solution.pipelineId] = response.data
        .reduce((out, point) => Object.assign(out, {[point['d3mIndex'] || point['']]: problem.targets
                .reduce((out, target) => Object.assign(out, {[target]: parseNumeric(point[target])}), {})}), {});
    resultsData.fittedLoading[solution.pipelineId] = false;
    m.redraw();
};

export let loadImportancePartialsActualData = async problem => {
    await loadProblemData(problem);

    // don't attempt to load if there is no data
    if (!problem.partialsDatasetPath) return;

    // don't load if systems are already in loading state
    if (resultsData.importancePartialsActualLoading)
        return;

    // don't load if already loaded
    if (resultsData.importancePartialsActual)
        return;

    // begin blocking additional requests to load
    resultsData.importancePartialsActualLoading = true;

    let tempQuery = JSON.stringify(resultsData.id.query);
    let response;
    try {
        response = await app.makeRequest(D3M_SVC_URL + `/retrieve-output-data`, {
            data_pointer: problem.partialsDatasetPath,
        });

        if (!response.success) {
            console.warn(response.data);
            throw response.data;
        }
    } catch (err) {
        app.alertWarn('Partials actual data has not been loaded. Some plots will not load.');
        return;
    }

    // don't accept response if current problem has changed
    if (resultsData.id.problemID !== problem.problemID)
        return;

    // don't accept if query changed
    if (JSON.stringify(resultsData.id.query) !== tempQuery)
        return;

    // convert to structure:
    // {predictor1: [values along domain], predictor2: ...}
    resultsData.importancePartialsActual = Object.keys(response.data)
        .reduce((out, predictor) => Object.assign(out,
            {[predictor]: response.data[predictor].map(point => point[predictor])}),
            {});
    resultsData.importancePartialsActualLoading = false;

    m.redraw();
};

export let loadImportancePartialsFittedData = async (problem, solution) => {

    // load dependencies, which can clear loading state if problem, etc. changed
    await loadImportancePartialsActualData(problem);

    // don't attempt to load if there is no data
    if (!solution.data_pointer_partials) return;

    // don't load if systems are already in loading state
    if (resultsData.importancePartialsFittedLoading[solution.pipelineId])
        return;

    // don't load if already loaded
    if (resultsData.importancePartialsFitted[solution.pipelineId])
        return;

    // don't load if dependencies are not loaded
    if (!resultsData.importancePartialsActual)
        return;

    // begin blocking additional requests to load
    resultsData.importancePartialsFittedLoading[solution.pipelineId] = true;

    let tempQuery = JSON.stringify(resultsData.id.query);
    let response;
    try {
        response = await app.makeRequest(D3M_SVC_URL + `/retrieve-output-data`, {
            data_pointer: solution.data_pointer_partials,
        });

        if (!response.success) {
            console.warn(response.data);
            throw response.data;
        }
    } catch (err) {
        app.alertWarn('Partials data has not been loaded. Some plots will not load.');
        return;
    }

    // don't accept response if current problem has changed
    if (resultsData.id.problemID !== problem.problemID)
        return;

    // don't accept if query changed
    if (JSON.stringify(resultsQuery) !== tempQuery)
        return;

    // convert unlabeled string table to predictor format
    let offset = 0;
    resultsData.importancePartialsFitted[solution.pipelineId] = Object.keys(resultsData.importancePartialsActual).reduce((out, predictor) => {
        let nextOffset = offset + resultsData.importancePartialsActual[predictor].length;
        // for each point along the domain of the predictor
        out[predictor] = response.data.slice(offset, nextOffset)
            // for each target specified in the problem
            .map(point => problem.targets.reduce((out, target, i) =>
                Object.assign(out, {[target]: parseNumeric(point[i])}), {}))
            // for only the first target specified in the problem
            .map(point => ({[problem.targets[0]]: parseNumeric(point['0'])}));
        offset = nextOffset;
        return out;
    }, {});
    resultsData.importancePartialsFittedLoading[solution.pipelineId] = false;

    m.redraw();
};

export let loadConfusionData = async (problem, solution) => {
    // load dependencies, which can clear loading state if problem, etc. changed
    await loadSolutionData(problem, solution);

    // don't load if data is not available
    if (!solution.data_pointer)
        return;

    // confusion matrices don't apply for non-classification problems
    if (!['classification', 'semisupervisedclassification', 'vertexclassification'].includes(problem.task.toLowerCase()))
        return;

    // don't load if systems are already in loading state
    if (resultsData.confusionLoading[solution.pipelineId])
        return;

    // don't load if already loaded
    if (solution.pipelineId in resultsData.confusion)
        return;

    // begin blocking additional requests to load
    resultsData.confusionLoading[solution.pipelineId] = true;

    // how to construct actual values after manipulation
    let compiled = queryMongo.buildPipeline([
        ...app.workspace.raven_config.hardManipulations,
        ...problem.manipulations,
        ...resultsQuery
    ], app.workspace.raven_config.variablesInitial)['pipeline'];

    let tempQuery = JSON.stringify(resultsData.id.query);
    let response;
    try {
        response = await m.request(D3M_SVC_URL + `/retrieve-output-confusion-data`, {
            method: 'POST',
            data: {
                data_pointer: solution.data_pointer,
                metadata: {
                    targets: problem.targets,
                    collectionName: app.workspace.d3m_config.name,
                    collectionPath: app.workspace.datasetPath,
                    query: compiled,
                    solutionId: solution.pipelineId
                }
            }
        });

        if (!response.success) {
            console.warn(response);
            throw response.data;
        }
    } catch (err) {
        console.warn("retrieve-output-confusion-data error");
        console.log(err);
        app.alertWarn('Confusion matrix data has not been loaded. Some plots will not load.');
        return;
    }

    // don't accept response if current problem has changed
    if (resultsData.id.problemID !== problem.problemID)
        return;

    // don't accept response if query changed
    if (JSON.stringify(resultsQuery) !== tempQuery)
        return;

    // TODO: this is only index zero if there is one target
    // TODO: multilabel problems will have d3mIndex collisions
    resultsData.confusion[solution.pipelineId] = response.data;
    resultsData.confusionLoading[solution.pipelineId] = false;

    // apply state changes to the page
    m.redraw();
};

// importance from empirical first differences
export let loadImportanceEFDData = async (problem, solution) => {
    // load dependencies, which can clear loading state if problem, etc. changed
    await loadSolutionData(problem, solution);

    // don't load if data is not available
    if (!solution.data_pointer)
        return;

    // don't load if systems are already in loading state
    if (resultsData.importanceEFDLoading)
        return;

    // don't load if already loaded
    if (resultsData.importanceEFD)
        return;

    // begin blocking additional requests to load
    resultsData.importanceEFDLoading = true;

    // how to construct actual values after manipulation
    let compiled = queryMongo.buildPipeline([
        ...app.workspace.raven_config.hardManipulations,
        ...problem.manipulations,
        ...resultsQuery
    ], app.workspace.raven_config.variablesInitial)['pipeline'];

    let tempQuery = JSON.stringify(resultsData.id.query);

    let response;
    try {
        response = await m.request(D3M_SVC_URL + `/retrieve-output-EFD-data`, {
            method: 'POST',
            data: {
                data_pointer: solution.data_pointer,
                metadata: {
                    solutionId: solution.pipelineId,
                    levels: app.getNominalVariables(problem)
                        .map(variable => {
                            if (app.variableSummaries[variable].nature === 'nominal')
                                return {[variable]: Object.keys(app.variableSummaries[variable].plotvalues)}
                        }).reduce((out, variable) => Object.assign(out, variable), {}),
                    targets: problem.targets,
                    predictors: problem.predictors,
                    collectionName: app.workspace.d3m_config.name,
                    collectionPath: app.workspace.datasetPath,
                    query: compiled
                }
            }
        });

        if (!response.success)
            throw response.data;

    } catch (err) {
        console.warn("retrieve-output-confusion-data error");
        console.log(err);
        // app.alertWarn('Variable importance EFD data has not been loaded. Some plots will not load.');
        return;
    }

    // don't accept response if current problem has changed
    if (resultsData.id.problemID !== problem.problemID)
        return;

    // don't accept if query changed
    if (JSON.stringify(resultsQuery) !== tempQuery)
        return;

    let nominals = app.getNominalVariables(problem);

    // melt predictor data once, opposed to on every redraw
    Object.keys(response.data)
        .forEach(predictor => response.data[predictor] = app.melt(
            nominals.includes(predictor)
                ? app.sample(response.data[predictor], 20, false, true)
                : response.data[predictor],
            [predictor], results.valueLabel, results.variableLabel));

    resultsData.importanceEFD = response.data;
    resultsData.importanceEFDLoading = false;

    // apply state changes to the page
    m.redraw();
};

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
        .find(problem => problem.d3mSearchId === String(searchId));

    if (solvedProblem)
        delete solvedProblem.d3mSolverState;

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

export function GRPC_SearchSolutionsRequest(problem) {
    return {
        userAgent: TA3_GRPC_USER_AGENT, // set on django
        version: TA3TA2_API_VERSION, // set on django
        timeBoundSearch: problem.timeBound || 0,
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

    let problems = ((app.workspace || {}).raven_config || {}).problems || {};
    let solvedProblemId = Object.keys(problems)
        .find(problemId => problems[problemId].d3mSearchId === response.stored_request.search_id);
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
        .find(problemId => problems[problemId].d3mSearchId === response.searchId);
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
        .find(problemId => problems[problemId].d3mSearchId === response.stored_request.search_id);
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
export async function handleGetProduceSolutionResultsResponse(response, type) {

    if (response === undefined) {
        debugLog('handleGetProduceSolutionResultsResponse: Error.  "response" undefined');
        return;
    }

    let problems = ((app.workspace || {}).raven_config || {}).problems || {};
    let solvedProblemId = Object.keys(problems)
        .find(problemId => problems[problemId].d3mSearchId === response.stored_request.search_id);
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

    if (type === 'fittedValues') {
        solvedProblem.solutions.d3m[response.pipelineId].data_pointer = pointer;
        // console.warn("#debug produce results pointer");
        // console.log(pointer);
    }
    else if (type === 'partialsValues')
        solvedProblem.solutions.d3m[response.pipelineId].data_pointer_partials = pointer;

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

        setModal(m('div', {}, [
                m('p', 'Finished! The problem is marked as complete.'),
                // m('p', ''),
            ]),
            "Task complete",
            true,
            "Restart",
            false,
            locationReload);
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

    let response = await app.makeRequest(D3M_SVC_URL + '/SolutionExport3', {
        solutionId,
        rank: 1.01 - 0.01 * exportCount,
        searchId: app.getResultsProblem().d3mSearchId
    });

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

let parseNumeric = value => isNaN(parseFloat(value)) ? value : parseFloat(value);
