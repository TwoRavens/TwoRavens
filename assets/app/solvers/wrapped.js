// import * as jStat from "jstat";
import m from 'mithril';

import * as app from '../app';
import * as results from "../modes/results";
import * as utils from '../utils';
import {
    getLocationVariables,
    getCategoricalVariables,
    getOrderingVariable,
    getPredictorVariables,
    getTargetVariables,
    isProblemValid
} from "../problem";

export let SOLVER_SVC_URL = '/solver-service/';


export let getSolverSpecification = async (problem, systemId) => {
    await results.prepareResultsDatasets(problem, systemId);
    if (!problem.results.solverState[systemId].thinking)
        return;

    let allParams = {
        'search': SPEC_search(problem),
        'produce': [], // SPEC_produce(problem),
        'score': [SPEC_score(problem)].filter(_=>_)
    };

    console.groupCollapsed(`Initiating Search on ${systemId}`);
    console.log("allParams");
    console.log(JSON.stringify(allParams));
    console.groupEnd();

    return allParams;
};

// GRPC_SearchSolutionsRequest
let SPEC_search = problem => ({
    "input": {
        // search with 'all' if no out of sample split
        "resource_uri": 'file://' + problem.results.datasetPaths[problem.splitOptions.outOfSampleSplit ? 'train' : 'all']
    },
    'problem': SPEC_problem(problem),
    "timeBoundSearch": (problem.searchOptions.timeBoundSearch || .5) * 60,
    "timeBoundRun": problem.searchOptions.timeBoundRun && problem.searchOptions.timeBoundRun * 60,
    "rankSolutionsLimit": problem.searchOptions.solutionsLimit,
    "priority": problem.searchOptions.priority,

    // pass the same criteria the models will be scored on to the search phase
    "performanceMetric": SPEC_metric(problem.positiveLabel, problem.metric),
    "configuration": SPEC_configuration(problem)
});

let SPEC_metric = (positiveLabel, metric) => {
    let value = {metric: app.d3mMetrics[metric]};
    if (metric in ['precision', 'recall', 'f1'] && positiveLabel !== undefined)
        value.positiveLabel = positiveLabel;
    return value;
};

// GRPC_ProblemDescription
export let SPEC_problem = problem => {
    let predictors = getPredictorVariables(problem);

    if (problem.task === 'forecasting') {
        // ensure problem is valid
        if (!problem.forecastingHorizon)
            problem.forecastingHorizon = 10;
    }

    return {
        "name": problem.problemId,
        "taskSubtype": app.d3mTaskSubtype[problem.subTask],
        "forecasting": problem.task === "forecasting",
        "taskType": problem.task === "forecasting" ? "REGRESSION" : app.d3mTaskType[problem.task],
        "timeGranularity": problem.timeGranularity,
        'forecastingHorizon': {
            column: getOrderingVariable(problem),
            value: problem.forecastingHorizon
        },

        'date_format': Object.values(app.variableSummaries)
            .filter(summary => summary.timeUnit)
            .reduce((out, summary) => Object.assign(out, {[summary.name]: summary.timeUnit}), {}),
        'location_unit': Object.values(app.variableSummaries)
            .filter(summary => summary.locationUnit)
            .reduce((out, summary) => Object.assign(out, {[summary.name]: summary.locationUnit}), {}),
        'location_format': Object.values(app.variableSummaries)
            .filter(summary => summary.locationUnit)
            .reduce((out, summary) => Object.assign(out, {[summary.name]: summary.locationFormat}), {}),

        // structural variables
        "indexes": problem.tags.indexes,
        "crossSection": problem.tags.crossSection.filter(variable => predictors.includes(variable)),
        "location": getLocationVariables(problem),
        "boundary": problem.tags.boundary.filter(variable => predictors.includes(variable)),
        "weights": problem.tags.weights.filter(variable => predictors.includes(variable)), // singleton list
        "privileged": problem.tags.privileged.filter(variable => predictors.includes(variable)),
        "exogenous": problem.tags.exogenous.filter(variable => predictors.includes(variable)),

        "targets": getTargetVariables(problem),
        "predictors": predictors,

        // data types
        "categorical": getCategoricalVariables(problem)
    };
}

let SPEC_configuration = problem => ({
    "folds": problem.scoreOptions.folds || 10,
    "method": app.d3mEvaluationMethods[problem.scoreOptions.evaluationMethod],
    "randomSeed": problem.scoreOptions.randomSeed,
    "shuffle": problem.scoreOptions.shuffle,
    "stratified": problem.scoreOptions.stratified,
    "trainTestRatio": problem.scoreOptions.trainTestRatio,
    "forecastingHorizon": {
        column: getOrderingVariable(problem),
        value: problem.forecastingHorizon
    }
});

let SPEC_produce = problem => {
    // TODO time-series produces

    let train_split = problem.splitOptions.outOfSampleSplit ? 'train' : 'all';
    let predict_types = ['RAW'];
    // TODO: re-add probabilities when there are tools that use them?
    // if (problem.task === 'classification') predict_types.push('PROBABILITIES');

    let dataset_types = problem.splitOptions.outOfSampleSplit ? ['test', 'train'] : ['all'];
    // if (['classification', 'regression'].includes(problem.task) && problem.results.datasetPaths.partials) dataset_types.push('partials');

    let produces = [];

    // train/test splits
    if (problem.splitOptions.outOfSampleSplit)
        produces.push(...dataset_types.flatMap(dataset_type => predict_types.flatMap(predict_type => ({
            'train': {
                'name': 'train',
                "resource_uri": 'file://' + problem.results.datasetPaths?.[train_split]
            },
            'input': {
                'name': dataset_type,
                "resource_uri": 'file://' + problem.results.datasetPaths?.[dataset_type]
            },
            'configuration': {
                'predict_type': predict_type
            },
            'output': {
                'resource_uri': 'file:///ravens_volume/solvers/produce/'
            }
        }))));

    // all split
    predict_types.forEach(predict_type => produces.push({
        'train': {
            'name': 'all',
            'resource_uri': 'file://' + problem.results.datasetPaths?.all
        },
        'input': {
            'name': 'all',
            'resource_uri': 'file://' + problem.results.datasetPaths?.all
        },
        'configuration': {
            'predict_type': predict_type
        },
        'output': {
            'resource_uri': 'file:///ravens_volume/solvers/produce/'
        }
    }));

    // add ice datasets
    // TODO: remove. This is not done lazily
    // if (problem.task !== 'forecasting') {
    //     getPredictorVariables(problem).forEach(predictor => produces.push({
    //         'train': {
    //             'name': 'all',
    //             'resource_uri': 'file://' + problem.results.datasetPaths?.all
    //         },
    //         'input': {
    //             'name': 'ICE_synthetic_' + predictor,
    //             'resource_uri': 'file://' + problem.results.datasetPaths['ICE_synthetic_' + predictor]
    //         },
    //         'configuration': {
    //             'predict_type': "RAW"
    //         },
    //         'output': {
    //             'resource_uri': 'file:///ravens_volume/solvers/produce/'
    //         }
    //     }));
    // }


    return produces
};


let SPEC_score = problem => {
    let spec = {
        "configuration": SPEC_configuration(problem),
        "performanceMetrics": [problem.metric, ...problem.metrics]
            .map(metric => SPEC_metric(problem.positiveLabel, metric))
    };

    // forecasting needs to know in-sample data
    if (problem.task === 'forecasting') {
        if (!problem.splitOptions.outOfSampleSplit) return;
        spec.train = {
            'name': 'train',
            'resource_uri': 'file://' + problem.results.datasetPaths?.train
        };
        spec.input = {
            'name': 'test',
            'resource_uri': 'file://' + problem.results.datasetPaths?.test
        }
    } else spec.input = {
        "name": "all",
        "resource_uri": 'file://' + problem.results.datasetPaths?.all
    };

    return spec;
};

let systemParams = {
    'tpot': {"generations": 100, 'population_size': 100},
    'auto_sklearn': {},
    'h2o': {},
    'caret': {
        trControlParams: {},
        models: [
            {method: 'glm'}
        ]
    },
    'mlbox': {},
    'mljar-supervised': {},
    'ludwig': {}
};

export let getSystemAdapterWrapped = (systemId, problem) => ({
    solve: async () => {
        if (!isProblemValid(problem)) return;
        problem.system = 'solved';

        m.request(SOLVER_SVC_URL + 'Solve', {
            method: 'POST',
            body: {
                system: systemId,
                specification: await getSolverSpecification(problem, systemId),
                system_params: systemParams[systemId],
                timeout: (problem.searchOptions.timeBoundSearch || .5) * 60 * 2
            }
        }).then(response => {
            if (!response.success) {
                app.alertWarn(response.message);
                return;
            }
            problem.results.solutions = problem.results.solutions || {};
            problem.results.solverState = problem.results.solverState || {};

            problem.results.solutions[systemId] = problem.results.solutions[systemId] || {};
            problem.results.solverState[systemId].message = 'searching for solutions';
            problem.results.solverState[systemId].searchId = response.data.search_id;
            problem.results.selectedSolutions[systemId] = [];
            results.resultsPreferences.selectedMetric = problem.metric;
            m.redraw()
        })
    },
    search: async () => m.request(SOLVER_SVC_URL + 'Search', {
        method: 'POST',
        body: {
            system: systemId,
            specification: await getSolverSpecification(problem, systemId),
            system_params: systemParams[systemId],
            timeout: (problem.searchOptions.timeBoundSearch || .5) * 60 * 2
        }
    }),
    describe: solutionId => m.request(SOLVER_SVC_URL + 'Describe', {
        method: 'POST',
        body: {
            system: systemId,
            model_id: solutionId
        }
    }),
    produce: (solutionId, specification) => m.request(SOLVER_SVC_URL + 'Produce', {
        method: 'POST',
        body: {
            system: systemId,
            model_id: solutionId,
            specification: specification
        }
    }),
    score: (solutionId, specification) => m.request(SOLVER_SVC_URL + 'Score', {
        method: 'POST',
        body: {
            system: systemId,
            model_id: solutionId,
            specification: specification
        }
    }),
    stop: endStopWrappedSearch(problem, systemId),
    end: endStopWrappedSearch(problem, systemId)
});

let endStopWrappedSearch = (problem, systemId) => searchId => {
    // TODO: implement end search
    console.log("end is not implemented for " + systemId);
    let solvedProblem = Object.values(app.workspace.raven_config.problems)
        .find(problem => problem?.results?.solverState?.[systemId]?.searchId === String(searchId));

    if (solvedProblem) {
        solvedProblem.results.solverState[systemId].thinking = false;
        solvedProblem.results.solverState[systemId].message = 'search complete';
    }
}

// TODO: determine why django sometimes fails to provide a model id
export let handleDescribeResponse = response => {
    let data = response.data;
    let solvedProblem = results.findProblem(data);
    if (!solvedProblem) {
        console.warn('description arrived for unknown problem', data);
        return;
    }

    if (response.success) {
        if (!data.model_id) {
            console.error('invalid data', data);
            return;
        }

        utils.setStructure(solvedProblem.results.solutions, [data.system, data.model_id]);
        Object.assign(solvedProblem.results.solutions[data.system][data.model_id], {
            name: data.model,
            all_parameters: data.all_parameters,
            description: data.description,
            solutionId: data.model_id,
            searchId: data.search_id,
            systemId: data.system
        });

        // let selectedSolutions = results.getSelectedSolutions(solvedProblem);
        // if (selectedSolutions.length === 0) results.setSelectedSolution(solvedProblem, data.system, data.model_id);
        if (!solvedProblem.results.userSelectedSolution) {
            let bestSolution = results.getBestSolution(solvedProblem);
            if (bestSolution) {
                results.setSelectedSolution(solvedProblem, bestSolution.getSystemId(), bestSolution.getSolutionId())
            }
        }

        m.redraw()
    }
};

export let handleProduceResponse = response => {
    let data = response.data;
    let solvedProblem = results.findProblem(data);
    if (!solvedProblem) {
        console.warn('produce arrived for unknown problem', data);
        return;
    }

    if (response.success) {
        // save produce path to resultsCache
        utils.setStructure(solvedProblem.results, ['solutions', data.system, data.model_id]);
        let solution = solvedProblem.results.solutions[data.system][data.model_id];
        solution.solutionId = data.model_id;
        solution.systemId = data.system;

        results.checkResultsCache(solvedProblem);

        utils.setDeep(results.resultsCache,
            [solvedProblem.problemId, 'producePaths', data.model_id, data.produce.input.name], data.produce.data_pointer)
        utils.setDeep(results.resultsCache,
            [solvedProblem.problemId, 'producePathsLoading', data.model_id, data.produce.input.name], false)
        m.redraw()
    }
};

export let handleScoreResponse = response => {
    let data = response.data;
    let solvedProblem = results.findProblem(data);
    if (!solvedProblem) {
        console.warn('scores arrived for unknown problem', data);
        return;
    }

    if (response.success) {
        utils.setDefaultDeep(solvedProblem.results, ['solutions', data.system, data.model_id, 'scores'], []);
        let solution = solvedProblem.results.solutions[data.system][data.model_id];
        solution.solutionId = data.model_id;
        solution.systemId = data.system;
        solution.scores.push(...data.scores);
        m.redraw()
    }
};

export let handleSolveCompleteResponse = response => {
    let data = response.data;
    let solvedProblem = results.findProblem(data);
    if (!solvedProblem) {
        console.warn('solve complete arrived for unknown problem', data);
        return;
    }
    if (!solvedProblem?.results?.solverState) return;

    solvedProblem.results.solverState[data.system].thinking = false;
    solvedProblem.results.solverState[data.system].message = response.additional_info.message;
    solvedProblem.results.solverState[data.system].elapsed_time = response.data.elapsed_time;
    m.redraw()
};

export let downloadModel = async solution => m.request(SOLVER_SVC_URL + 'Download', {
    method: 'POST',
    body: {model_id: solution.solutionId}
}).then(response => {
    if (!response.success) {
        app.alertWarn("Unable to prepare model for downloading.");
        console.warn(response.message);
        return;
    }
    console.log("Downloading model: ", response.data);
    app.downloadFile(response.data.model_pointer, 'application/octet-stream');
});

/* Generates confusion table data and labels, given the expected and predicted values*/
/* if a factor is passed, the resultant table will be 2x2 with respect to the factor */
export function generateConfusionData(Y_true, Y_pred, factor = undefined) {
    if (!Y_true || !Y_pred) return;

    Y_true = Y_true.map(String);
    Y_pred = Y_pred.map(String);

    // combine actuals and predicted, and get all unique elements
    let classes = [...new Set([...Y_true, ...Y_pred])].sort();
    let allClasses = classes;

    if (factor !== undefined) {
        factor = String(factor);
        Y_true = Y_true.map(obs => factor === obs ? factor : 'not ' + factor);
        Y_pred = Y_pred.map(obs => factor === obs ? factor : 'not ' + factor);
        classes = [...new Set([...Y_true, ...Y_pred])].sort()
    }

    // create a matrix of zeros
    let data = Array.from({length: classes.length}, () => new Array(classes.length).fill(0));

    // linearize the coordinate assignment stage
    let indexOf = classes.reduce((out, clss, i) => {
        out[clss] = i;
        return out
    }, {});
    // increment the data matrix at the class coordinates of true and pred
    Y_true.forEach((_, i) => data[indexOf[Y_true[i]]][indexOf[Y_pred[i]]]++);

    return {data, classes, allClasses};
}

