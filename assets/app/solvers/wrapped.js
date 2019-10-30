import * as jStat from "jstat";
import m from 'mithril';

import * as app from '../app';
import * as results from "../results";

let SOLVER_SVC_URL = '/solver-service/';


export let getSolverSpecification = async (problem, systemId) => {

    problem.datasetSchemas = {
        all: app.workspace.d3m_config.dataset_schema
    };
    problem.datasetPaths = {
        all: app.workspace.datasetPath
    };
    problem.datasetSchemasManipulated = {};
    problem.datasetPathsManipulated = {};

    problem.solverState[systemId] = {thinking: true};
    problem.solverState[systemId].message = 'preparing partials data';
    m.redraw();
    await app.materializePartials(problem);

    problem.solverState[systemId].message = 'preparing train/test splits';
    m.redraw();
    if (!await app.materializeTrainTest(problem)) throw "Cannot solve problem without a train/test split."

    problem.solverState[systemId].message = 'applying manipulations to data';
    m.redraw();
    await app.materializeManipulations(problem, ['train', 'test', 'partials']);

    problem.solverState[systemId].message = 'initiating the search for solutions';
    m.redraw();

    return {
        'search': SPEC_search(problem),
        'produce': SPEC_produce(problem),
        'score': SPEC_score(problem)
    };
};

let SPEC_search = problem => ({
    "input": {
        "resource_uri": 'file://' + ((problem.datasetPathsManipulated || {}).train || problem.datasetPaths.train)
    },
    'problem': {
        "name": problem.problemID,
        "targets": problem.targets,
        "predictors": app.getPredictorVariables(problem),
        "categorical": app.getNominalVariables(problem),
        "taskSubtype": app.d3mTaskSubtype[problem.subTask],
        "taskType": app.d3mTaskType[problem.task]
    },
    "performanceMetric": {
        "metric": app.d3mMetrics[problem.metric]
    },
    "configuration": {
        "folds": problem.folds || 10,
        "method": app.d3mEvaluationMethods[problem.evaluationMethod],
        "randomSeed": problem.shuffleRandomSeed,
        "shuffle": problem.shuffle,
        "stratified": problem.stratified,
        "trainTestRatio": problem.trainTestRatio
    },
    "timeBoundSearch": problem.timeBoundSearch || 60 * .5,
    "timeBoundRun": problem.timeBoundRun,
    "rankSolutionsLimit": problem.solutionsLimit
});

let SPEC_produce = problem => {
    let specification = [
        {
            'input': {
                'name': 'test',
                "resource_uri": 'file://' + ((problem.datasetPathsManipulated || {}).test || problem.datasetPaths.test)
            },
            'configuration': {
                'predict_type': 'RAW'
            },
            'output': {
                'resource_uri': 'file:///ravens_volume/solvers/produce/'
            }
        }
    ];

    if (problem.datasetPaths.partials) {
        specification.push({
            'input': {
                'name': 'partials',
                "resource_uri": 'file://' + ((problem.datasetPathsManipulated || {}).partials || problem.datasetPaths.partials)
            },
            'configuration': {
                'predict_type': 'RAW'
            },
            'output': {
                'resource_uri': 'file:///ravens_volume/solvers/produce/'
            }
        })
    }

    return specification;
};


let SPEC_score = problem => [{
    "input": {
        "name": "data_test",
        "resource_uri": 'file://' + ((problem.datasetPathsManipulated || {}).test || problem.datasetPaths.test)
    },
    "performanceMetrics": [problem.metric, ...problem.metrics]
        .map(metric => ({metric: app.d3mMetrics[metric]}))
}];

let systemParams = {
    'tpot': {"generations": 1, population_size: 20},
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
    solve: async () => m.request(SOLVER_SVC_URL + 'Solve', {
        method: 'POST',
        data: {
            system: systemId,
            specification: await getSolverSpecification(problem, systemId),
            system_params: systemParams[systemId]
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
        m.redraw()
    }),
    search: async () => m.request(SOLVER_SVC_URL + 'Search', {
        method: 'POST',
        data: {
            system: systemId,
            specification: await getSolverSpecification(problem, systemId),
            system_params: systemParams[systemId]
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


// functions to extract information from D3M response format
export let getSolutionAdapter = (problem, solution) => ({
    getName: () => solution.model_id,
    getSystemId: () => solution.system,
    getSolutionId: () => solution.model_id,
    getDataPointer: pointerId => {
        let produce = solution.produce.find(produce => produce.input.name === pointerId);
        return produce && '/' + produce.data_pointer;
    },
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
        if (!results.resultsData.fitted[solution.model_id]) return;

        // cached data is current, return it
        return results.resultsData.actuals.map(point => point.d3mIndex)
            .map(sample => results.resultsData.fitted[solution.model_id][sample][target])
    },
    getConfusionMatrix: target => {
        let adapter = getSolutionAdapter(problem, solution);
        results.loadConfusionData(problem, adapter);
        if (solution.model_id in results.resultsData.confusion)
            return results.resultsData.confusion[solution.model_id][target];
    },
    getScore: metric => {
        if (!solution.scores) return;
        let evaluation = solution.scores.find(score => app.d3mMetricsInverted[score.metric.metric] === metric);
        return evaluation && evaluation.value
    },
    getDescription: () => solution.description,
    getTask: () => '',
    getModel: () => '',
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
        if (!results.resultsData.importancePartialsFitted[solution.model_id]) return;

        return app.melt(
            results.resultsData.importancePartialsActual[predictor]
                .map((x, i) => Object.assign({[predictor]: x},
                    results.resultsData.importancePartialsFitted[solution.model_id][predictor][i])),
            [predictor],
            results.valueLabel, results.variableLabel);
    },
});

let findProblem = data => {
    let problems = ((app.workspace || {}).raven_config || {}).problems || {};
    let solvedProblemId = Object.keys(problems)
        .find(problemId =>
            ((problems[problemId].solverState || {})[data.system] || {}).searchId === data.search_id)
    return problems[solvedProblemId];
};

let setDefault = (obj, id, value) => obj[id] = id in obj ? obj[id] : value;
let setRecursiveDefault = (obj, map) => map
    .reduce((obj, pair) => setDefault(obj, pair[0], pair[1]), obj);

export let handleDescribeResponse = response => {
    let data = response.data;
    let solvedProblem = findProblem(data);
    if (!solvedProblem) {
        console.warn('description arrived for unknown problem', data);
        return;
    }

    if (response.success) {
        setRecursiveDefault(solvedProblem.solutions, [
            [data.system, {}], [data.model_id, data]]);
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
    m.redraw()
};

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

// n linearly spaced points between min and max
let linspace = (min, max, n) => Array.from({length: n})
    .map((_, i) => min + (max - min) / (n - 1) * i);

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
    let observations = broadcast(constants, linspace(min, max, n), index);
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
