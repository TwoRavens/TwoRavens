import * as jStat from "jstat";
import m from 'mithril';

import * as app from '../app';
import * as results from "../modes/results";
import {alertWarn} from "../app";

export let SOLVER_SVC_URL = '/solver-service/';


export let getSolverSpecification = async (problem, systemId) => {

    problem.datasetSchemas = problem.datasetSchemas || {
        all: app.workspace.d3m_config.dataset_schema
    };
    problem.datasetPaths = problem.datasetPaths || {
        all: app.workspace.datasetPath
    };
    problem.datasetSchemasManipulated = {};
    problem.datasetPathsManipulated = {};
    if (!problem.selectedSolutions[systemId])
        problem.selectedSolutions[systemId] = [];

    problem.solverState[systemId] = {thinking: true};

    // add partials dataset to to datasetSchemas and datasetPaths
    problem.solverState[systemId].message = 'preparing partials data';
    m.redraw();
    if (!app.materializePartialsPromise[problem.problemID])
        app.materializePartialsPromise[problem.problemID] = app.materializePartials(problem);
    await app.materializePartialsPromise[problem.problemID];

    // add ICE datasets to to datasetSchemas and datasetPaths
    problem.solverState[systemId].message = 'preparing ICE data';
    m.redraw();
    if (!app.materializeICEPromise[problem.problemID])
        app.materializeICEPromise[problem.problemID] = app.materializeICE(problem);
    await app.materializeICEPromise[problem.problemID];

    // add train/test datasets to datasetSchemas and datasetPaths
    problem.solverState[systemId].message = 'preparing train/test splits';
    m.redraw();
    if (!app.materializeTrainTestPromise[problem.problemID])
        app.materializeTrainTestPromise[problem.problemID] = app.materializeTrainTest(problem, problem.datasetSchemas.all);
    await app.materializeTrainTestPromise[problem.problemID];

    problem.solverState[systemId].message = 'applying manipulations to data';
    m.redraw();
    await app.materializeManipulations(problem, ['train', 'test', 'partials']);

    problem.solverState[systemId].message = 'initiating the search for solutions';
    m.redraw();

    let allParams = {
        'search': SPEC_search(problem),
        'produce': SPEC_produce(problem),
        'score': SPEC_score(problem)
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
        "resource_uri": 'file://' + (problem.splitOptions.outOfSampleSplit
            ? ((problem.datasetPathsManipulated || {}).train || problem.datasetPaths.train)
            : ((problem.datasetPathsManipulated || {}).all || problem.datasetPaths.all))
    },
    'problem': SPEC_problem(problem),
    "timeBoundSearch": (problem.searchOptions.timeBoundSearch || .5) * 60,
    "timeBoundRun": problem.searchOptions.timeBoundRun && problem.searchOptions.timeBoundRun * 60,
    "rankSolutionsLimit": problem.searchOptions.solutionsLimit,
    "priority": problem.searchOptions.priority,

    // pass the same criteria the models will be scored on to the search phase
    "performanceMetric": {"metric": app.d3mMetrics[problem.metric]},
    "configuration": SPEC_configuration(problem)
});

// GRPC_ProblemDescription
let SPEC_problem = problem => ({
    "name": problem.problemID,
    "targets": problem.targets,
    "predictors": app.getPredictorVariables(problem),
    "categorical": app.getNominalVariables(problem),
    "taskSubtype": app.d3mTaskSubtype[problem.subTask],
    "taskType": app.d3mTaskType[problem.task]
});

let SPEC_configuration = problem => ({
    "folds": problem.scoreOptions.folds || 10,
    "method": app.d3mEvaluationMethods[problem.scoreOptions.evaluationMethod],
    "randomSeed": problem.scoreOptions.randomSeed,
    "shuffle": problem.scoreOptions.shuffle,
    "stratified": problem.scoreOptions.stratified,
    "trainTestRatio": problem.scoreOptions.trainTestRatio
});

let SPEC_produce = problem => {
    let train_split = problem.splitOptions.outOfSampleSplit ? 'train' : 'all';
    let predict_types = ['RAW', 'PROBABILITIES'];
    let dataset_types = problem.splitOptions.outOfSampleSplit ? ['test', 'train'] : ['all'];
    if (problem.datasetPaths.partials) dataset_types.push('partials');

    let produces = [];

    if (problem.splitOptions.outOfSampleSplit)
        produces.push(...dataset_types.flatMap(dataset_type => predict_types.flatMap(predict_type => ({
            'train': {
                'name': 'train',
                "resource_uri": 'file://' +
                    ((problem.datasetPathsManipulated || {})[train_split] || problem.datasetPaths[train_split])
            },
            'input': {
                'name': dataset_type,
                "resource_uri": 'file://' + (
                    (problem.datasetPathsManipulated || {})[dataset_type] || problem.datasetPaths[dataset_type])
            },
            'configuration': {
                'predict_type': predict_type
            },
            'output': {
                'resource_uri': 'file:///ravens_volume/solvers/produce/'
            }
        }))));

    predict_types.forEach(predict_type => produces.push({
        'train': {
            'name': 'all',
            'resource_uri': 'file://' + ((problem.datasetPathsManipulated || {}).all || problem.datasetPaths.all)
        },
        'input': {
            'name': 'all',
            'resource_uri': 'file://' + ((problem.datasetPathsManipulated || {}).all || problem.datasetPaths.all)
        },
        'configuration': {
            'predict_type': predict_type
        },
        'output': {
            'resource_uri': 'file:///ravens_volume/solvers/produce/'
        }
    }));

    // add ice datasets
    app.getPredictorVariables(problem).forEach(predictor => produces.push({
        'train': {
            'name': 'all',
            'resource_uri': 'file://' + ((problem.datasetPathsManipulated || {}).all || problem.datasetPaths.all)
        },
        'input': {
            'name': 'ICE_synthetic_' + predictor,
            'resource_uri': 'file://' + problem.datasetPaths['ICE_synthetic_' + predictor]
        },
        'configuration': {
            'predict_type': "RAW"
        },
        'output': {
            'resource_uri': 'file:///ravens_volume/solvers/produce/'
        }
    }));


    return produces
};


let SPEC_score = problem => [{
    "input": {
        "name": "all",
        "resource_uri": 'file://' + ((problem.datasetPathsManipulated || {}).all || problem.datasetPaths.all)
    },
    "configuration": SPEC_configuration(problem),
    "performanceMetrics": [problem.metric, ...problem.metrics]
        .map(metric => ({metric: app.d3mMetrics[metric]}))
}];

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

export let getSystemAdapterWrapped = systemId => problem => ({
    solve: async () => {
        if (!app.isProblemValid(problem)) return;

        m.request(SOLVER_SVC_URL + 'Solve', {
            method: 'POST',
            data: {
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
            problem.solutions[systemId] = problem.solutions[systemId] || {};
            problem.solverState[systemId].message = 'searching for solutions';
            problem.solverState[systemId].searchId = response.data.search_id;
            problem.selectedSolutions[systemId] = [];
            results.resultsPreferences.selectedMetric = problem.metric;
            m.redraw()
        })
    },
    search: async () => m.request(SOLVER_SVC_URL + 'Search', {
        method: 'POST',
        data: {
            system: systemId,
            specification: await getSolverSpecification(problem, systemId),
            system_params: systemParams[systemId],
            timeout: (problem.searchOptions.timeBoundSearch || .5) * 60 * 2
        }
    }),
    describe: solutionId => m.request(SOLVER_SVC_URL + 'Describe', {
        method: 'POST',
        data: {
            system: systemId,
            model_id: solutionId
        }
    }),
    produce: (solutionId, specification) => m.request(SOLVER_SVC_URL + 'Produce', {
        method: 'POST',
        data: {
            system: systemId,
            model_id: solutionId,
            specification: specification
        }
    }),
    score: (solutionId, specification) => m.request(SOLVER_SVC_URL + 'Score', {
        method: 'POST',
        data: {
            system: systemId,
            model_id: solutionId,
            specification: specification
        }
    }),
    stop: searchId => {
        throw "stop is not implemented for " + systemId
    }
});

let findProblem = data => {
    let problems = ((app.workspace || {}).raven_config || {}).problems || {};
    let solvedProblemId = Object.keys(problems)
        .find(problemId =>
            ((problems[problemId].solverState || {})[data.system] || {}).searchId === data.search_id);
    return problems[solvedProblemId];
};

let setDefault = (obj, id, value) => obj[id] = id in obj ? obj[id] : value;
let setRecursiveDefault = (obj, map) => map
    .reduce((obj, pair) => setDefault(obj, pair[0], pair[1]), obj);

// TODO: determine why django sometimes fails to provide a model id
export let handleDescribeResponse = response => {
    let data = response.data;
    let solvedProblem = findProblem(data);
    if (!solvedProblem) {
        console.warn('description arrived for unknown problem', data);
        return;
    }

    if (response.success) {
        if (!data.model_id) {
            console.error('invalid data', data);
            return;
        }

        setRecursiveDefault(solvedProblem.solutions, [
            [data.system, {}], [data.model_id, {}]]);
        Object.assign(solvedProblem.solutions[data.system][data.model_id], {
            name: data.model,
            description: data.description,
            solutionId: data.model_id,
            searchId: data.search_id,
            systemId: data.system
        });

        let selectedSolutions = results.getSelectedSolutions(solvedProblem);
        if (selectedSolutions.length === 0) results.setSelectedSolution(solvedProblem, data.system, data.model_id);

        m.redraw()
    }
};

export let handleProduceResponse = response => {
    let data = response.data;
    let solvedProblem = findProblem(data);
    if (!solvedProblem) {
        console.warn('produce arrived for unknown problem', data);
        return;
    }

    if (response.success) {
        setRecursiveDefault(solvedProblem.solutions, [
            [data.system, {}], [data.model_id, {}], ['produce', []]]);
        solvedProblem.solutions[data.system][data.model_id].solutionId = data.model_id;
        solvedProblem.solutions[data.system][data.model_id].systemId = data.system;
        solvedProblem.solutions[data.system][data.model_id].produce.push(data.produce);
        m.redraw()
    }
};

export let handleScoreResponse = response => {
    let data = response.data;
    let solvedProblem = findProblem(data);
    if (!solvedProblem) {
        console.warn('scores arrived for unknown problem', data);
        return;
    }

    if (response.success) {
        setRecursiveDefault(solvedProblem.solutions, [
            [data.system, {}], [data.model_id, {}], ['scores', []]]);
        solvedProblem.solutions[data.system][data.model_id].solutionId = data.model_id;
        solvedProblem.solutions[data.system][data.model_id].systemId = data.system;
        solvedProblem.solutions[data.system][data.model_id].scores.push(...data.scores);
        m.redraw()
    }
};

export let handleSolveCompleteResponse = response => {
    let data = response.data;
    let solvedProblem = findProblem(data);
    if (!solvedProblem) {
        console.warn('solve complete arrived for unknown problem', data);
        return;
    }

    solvedProblem.solverState[data.system].thinking = false;
    solvedProblem.solverState[data.system].message = response.additional_info.message;
    solvedProblem.solverState[data.system].elapsed_time = response.data.elapsed_time;
    m.redraw()
};

export let downloadModel = async solution => m.request(SOLVER_SVC_URL + 'Download', {
    method: 'POST',
    data: {model_id: solution.solutionId}
}).then(response => {
    if (!response.success) {
        alertWarn("Unable to prepare model for downloading.");
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


// STATISTICS HELPER FUNCTIONS

// covariance matrix returned by R
let cov = [[1, .87, .28, .1, -.548], [.1, 2, .3, -.4, .5], [.85, .2, .46, .4, -.5], [.1, .2, .3, 4, .23], [.1, .2358, -3.25, .4, .23]];
// coefficients returned by R
let coefs = [.2, 2.3, .12, 2.8, 7.78].map(elem => [elem]); // map to a column vector

// description of predictor variable to vary confidence band over
let predictor = {min: -100, max: 100, index: 2};
// fixed values for other predictors, likely the mean values of each other predictor
let constants = [1, 2, 5, 2];


// ~~~~ helper functions

// outer broadcast of x and y on column i
let broadcast = (x, y, i) => y.map(point => [...x.slice(0, i), point, ...x.slice(i)]);

// dot product between vectors
let dot = (x, y) => x.reduce((sum, _, i) => sum + x[i] * y[i], 0);

// computes diagonal of x @ Sym @ x.T, where C must be symmetric
let symmetricQuadraticDiag = (x, Sym) => x
    .map(rowLeft => Sym.map(rowRight => dot(rowLeft, rowRight))) // left product
    .map((rowLeft, i) => dot(rowLeft, x[i])); // right product

// matrix product between A, B
let product = (A, B) => A
    .map(rowA => B[0].map((_, j) => rowA.reduce((sum, _, i) => sum + rowA[i] * B[i][j], 0)));

let makeEllipse = (p1, p2, varCovMat) => {
    // only consider interactions among two coefficients
    varCovMat = [
        [varCovMat[p1][p1], varCovMat[p1][p2]],
        [varCovMat[p2][p1], varCovMat[p2][p2]]
    ];

    // λ^2 - trace(Σ)*λ + det(Σ)
    let [a, b, c] = [1, -varCovMat[0][0] -varCovMat[1][1], varCovMat[0][0] * varCovMat[1][1] - 2 * varCovMat[0][1]];
    let eigvals = [-1, 1].map(sign => (-b + sign * Math.sqrt(b * b - 4 * a * c)) / (2 * a));
    let eigvecs = [
        [varCovMat[0][1], eigvals[0] - varCovMat[0][0]],
        [eigvals[1] - varCovMat[1][1], varCovMat[1][0]]
    ];

    let maximalEigvec = eigvecs[Number(Math.abs(eigvals[0]) < Math.abs(eigvals[1]))];

    return {
        angle: Math.atan2(maximalEigvec[1], maximalEigvec[0]) * 180 / Math.pi,
        eigvals
    }
};

let getMean = data => data.reduce((sum, value) => sum + value, 0) / data.length;
let getVariance = (data, ddof = 1) => {
    let mean = getMean(data);
    return data.reduce((sum, value) => (value - mean) ^ 2, 0) / (data.length - ddof);
};


/**
 * construct a multivariate confidence region, projected onto 'predictor' at 'constants'
 * @param varCovMat - pxp variance-covariance matrix of regression coefficients
 * @param coefficients - regression coefficients
 * @param predictor - {
 *     min, max - bounds to vary the predicted variable
 *     n - number of points to construct intervals for, within the bounds [min, max]
 *     index - column index of predictor within the design matrix
 * }
 * @param constants - fixed values for the other predictors
 * @param preferences - specified in makeIntervals.
 *                      'statistic' should either be 'workingHotelling' (simultaneous) or 't' (pointwise)
 * @returns {*} - list of [lower, upper] intervals
 */
let makeGLMBands = (varCovMat, coefficients, predictor, constants, preferences) => {
    let {min, max, index, n = 100} = predictor;
    let observations = broadcast(constants, app.linspace(min, max, n), index);
    let fittedValues = product(observations, coefficients).map(row => row[0]); // product produces a column vector
    let variances = symmetricQuadraticDiag(observations, varCovMat);

    return makeIntervals(Object.assign({
        values: fittedValues,
        variances,
        statistic: 'workingHotelling',
        ddof: varCovMat.length
    }, preferences))
};

/**
 * construct a set of confidence intervals with the specified parameters
 * @param values - construct intervals for each of these values
 * @param variances - variance of each value
 * @param statistic - workingHotelling, scheffe, bonferroni, tukey, t
 * @param type - mean or prediction
 * @param family - glm family
 * @param alpha - 100(1 - alpha)% confidence
 * @param n - number of observations in entire dataset
 * @param ddof - delta degrees of freedom (p for regression intervals, used in statistic computation)
 * @param MSE - mean squared error of the regression model, estimated sample variance (needed for prediction interval only)
 * @param m - mean of m predictions in the prediction interval (optional)
 * @returns {*} - list of [lower, upper] intervals
 */
let makeIntervals = ({values, variances, statistic, type, family, alpha, n, ddof, MSE, m}) => {

    // MSE is already included in the coefficient variance-covariance matrix
    let stdErr = variances.map({
        mean: _ => _,
        prediction: x => (MSE * 1 / (m || 1)) + x,
    }[type]).map(Math.sqrt);

    let g = values.length;

    let statValue = {
        // simultaneous region over regression surface
        workingHotelling: Math.sqrt(ddof * jStat.centralF.inv(1 - alpha, ddof, n - ddof)),

        // simultaneous set
        scheffe: Math.sqrt(g * jStat.centralF.inv(1 - alpha, g, n - ddof)),
        bonferroni: jStat.studentt.inv(1 - alpha / (2 * g), n - ddof),

        // pointwise
        t: jStat.studentt.inv(1 - alpha / 2, n - ddof)
    }[statistic];

    let invLink = {
        gaussian: _ => _,
        poisson: x => Math.exp(x),
        exponential: x => -1 / x,
        gamma: x => -1 / x,
        binomial: x => 1 / (1 + Math.exp(x))
    }[family];

    return values
        .map((val, i) => [-1, 1].map(sign => invLink(val + sign * statValue * stdErr[i])).sort())
};

// // ~~~~ compute confidence intervals
// console.warn('GLM Bands');
// console.log(makeGLMBands(cov, coefs, predictor, constants, {
//     type: 'mean',
//     statistic: 'workingHotelling',
//     family: 'gaussian',
//     alpha: .05,
//     n: 2500,
//     MSE: 1.2
// }));
//
// console.warn('Set of intervals for coefficients');
// console.log(makeIntervals({
//     values: coefs.map(coef => coef[0]),
//     variances: cov.map((_, i) => cov[i][i]),
//     statistic: 'bonferroni',
//     type: 'mean',
//     family: 'gaussian',
//     alpha: .05,
//     n: 2500,
//     ddof: 1,
//     MSE: 1.2
// }));
