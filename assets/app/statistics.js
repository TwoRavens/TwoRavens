import * as jStat from 'jstat';

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

    // MSE is already included in the predictor variance-covariance matrix
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
        .map((val, i) => [-1, 1].map(sign => invLink(val + sign * statValue * stdErr[i])))
};

// ~~~~ compute confidence intervals
console.warn('GLM Bands');
console.log(makeGLMBands(cov, coefs, predictor, constants, {
    type: 'mean',
    statistic: 'workingHotelling',
    family: 'gaussian',
    alpha: .05,
    n: 2500,
    MSE: 1.2
}));

console.warn('Set of intervals for coefficients');
console.log(makeIntervals({
    values: coefs.map(coef => coef[0]),
    variances: cov.map((_, i) => cov[i][i]),
    statistic: 'bonferroni',
    type: 'mean',
    family: 'gaussian',
    alpha: .05,
    n: 2500,
    ddof: 1,
    MSE: 1.2
}));
