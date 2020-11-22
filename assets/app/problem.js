// Utilities for working with problem objects
import m from "mithril";

import * as queryMongo from "./manipulations/queryMongo";
import * as common from "../common/common";
import * as manipulate from "./manipulations/manipulate";
import * as results from "./modes/results";
import * as app from "./app";
import * as utils from './utils';

/**
 * Problem
 * @typedef {Object} Problem
 * @property {string} problemId - Unique indicator for the problem
 * @property {?string} provenanceId - Unique indicator for the problem this was sourced from
 * @property {('auto'|'user'|'solved')} system - Indicates the state of a problem.
 * @property {?boolean} unedited - if true, then the problem may be transiently deleted (when switching away from a temp copy of a discovered problem)
 * @property {string[]} predictors - Variables in the predictors group
 * @property {string[]} targets - Variables in the targets group
 * @property {string} description
 * @property {string} metric - Primary metric to fit against
 * @property {string[]} metrics - Secondary metrics to evaluate, but not fit against
 * @property {d3mTaskType} task
 * @property {d3mTaskSubtype} subTask
 * @property {d3mSupervision} supervision
 * @property {d3mResourceType[]} resourceTypes
 * @property {d3mTags} d3mTags
 * @property {SplitOptions} splitOptions
 * @property {ScoreOptions} scoreOptions
 * @property {SearchOptions} searchOptions
 * @property {boolean} meaningful
 * @property {Object[]} manipulations
 * @property {ProblemTags} tags
 * @property {TimeGranularity} timeGranularity
 * @property {Object[]} pebbleLinks - small black arrows represented in the force diagram
 * @property {?string} orderingName - explicit name to give to the ordering variable
 * @property {?ProblemResults} results
 */

/**
 * @typedef {Object} SplitOptions
 * @property {boolean} outOfSampleSplit
 * @property {number} trainTestRatio
 * @property {boolean} stratified
 * @property {boolean} shuffle
 * @property {?number} randomSeed
 * @property {?string} splitsFile
 * @property {?string} splitsDir
 * @property {number} maxRecordCount
 */

/**
 * @typedef {Object} SearchOptions
 * @property {number} timeBoundSearch
 * @property {number} timeBoundRun
 * @property {number} priority
 * @property {number} solutionsLimit
 */

/**
 * @typedef {Object} ScoreOptions
 * @property {boolean} userSpecified
 * @property {string} evaluationMethod
 * @property {?number} folds
 * @property {number} trainTestRatio
 * @property {boolean} stratified
 * @property {boolean} shuffle
 * @property {?number} randomSeed
 * @property {?string} splitsFile
 */

/**
 * @typedef {Object} ProblemTags
 * @property {string[]} nominal
 * @property {string[]} ordinal
 * @property {string[]} crossSection
 * @property {string[]} geographic
 * @property {string[]} boundary
 * @property {string[]} ordering
 * @property {string[]} weights
 * @property {string[]} indexes
 * @property {string[]} privileged
 * @property {string[]} exogenous
 * @property {string[]} transformed
 * @property {string[]} loose
 */

/**
 * @typedef {Object} TimeGranularity
 * @property {number} [value]
 * @property {string} [units]
 */

/**
 * @typedef {Object} ProblemResults
 * @property {Object} solutions
 * @property {Object} selectedSource
 * @property {Object} selectedSolutions
 * @property {Object} solverState
 */

/**
 * @param {string} problemId
 * @returns {Problem}
 */
export let buildEmptyProblem = problemId => ({
    problemId,
    system: 'auto',
    predictors: [],
    targets: [],
    description: '',
    metric: undefined,
    metrics: [],
    task: 'classification',
    subTask: undefined,
    supervision: undefined,
    resourceTypes: ['tabular'],
    d3mTags: [],
    splitOptions: {
        outOfSampleSplit: true,
        trainTestRatio: 0.7,
        stratified: false,
        shuffle: true,
        randomSeed: undefined,
        splitsFile: undefined,
        splitsDir: undefined,
        maxRecordCount: app.defaultMaxRecordCount
    },
    searchOptions: {
        timeBoundSearch: 15,
        timeBoundRun: undefined,
        priority: undefined,
        solutionsLimit: undefined
    },
    scoreOptions: {
        userSpecified: false,
        evaluationMethod: 'kFold',
        folds: 10,
        trainTestRatio: 0.7,
        stratified: false,
        shuffle: true,
        randomSeed: undefined,
        splitsFile: undefined,
    },

    meaningful: false,
    manipulations: [],
    tags: {
        nominal: [],
        ordinal: [],
        crossSection: [],
        location: [],
        boundary: [],
        ordering: [],
        weights: [], // singleton list
        indexes: ['d3mIndex'],
        privileged: [],
        exogenous: [],
        transformed: [],
        loose: [] // variables displayed in the force diagram, but not in any groups
    },
    timeGranularity: {}
});


/**
 * Build a problem based on the d3m problem doc
 * @param {Object} problemDoc
 * @returns {Problem}
 */
export let buildDefaultProblem = problemDoc => {

    console.log('problemDoc', problemDoc);
    // create the default problem provided by d3m

    if (!problemDoc.inputs.dataSplits)
        problemDoc.inputs.dataSplits = {};

    // UTILITY FUNCTIONS
    let findTask = keywords => Object.keys(app.d3mTaskType)
        .find(key => keywords.includes(key)) || 'regression';
    let findSupervision = keywords => Object.keys(app.d3mSupervision)
        .find(key => keywords.includes(key));

    let findSubtask = keywords => {
        let task = findTask(keywords);
        let subTask = keywords.find(keyword => Object.keys(app.applicableMetrics[task]).includes(keyword))
        if (!subTask) subTask = Object.keys(app.applicableMetrics[task])[0];
        return subTask;
    };

    let filterResourceType = keywords => Object.keys(app.d3mResourceType)
        .filter(key => keywords.includes(key));
    let filterD3MTags = keywords => Object.keys(app.d3mResourceType)
        .filter(key => keywords.includes(key));

    // extract a list of tagged variables from the datasetDoc's roles
    let getTagsByRole = role => app.swandive ? [] : app.workspace.datasetDoc.dataResources
        .filter(resource => resource.resType === 'table')
        .flatMap(resource => resource.columns
            .filter(column => column.role.includes(role))
            .map(column => column.colName));

    // PREPROCESSING
    let targets = problemDoc.inputs.data
        .flatMap(source => source.targets.map(targ => targ.colName));

    let clusteredTargets = problemDoc.inputs.data
        .flatMap(source => source.targets.filter(targ => 'numClusters' in targ));
    let numClusters = clusteredTargets.length > 0 ? clusteredTargets[0].numClusters : undefined;

    let indexes = [...getTagsByRole('index'), ...getTagsByRole('multiIndex')];

    let predictors = app.swandive
        ? Object.keys(app.variableSummaries)
            .filter(column => column !== 'd3mIndex' && !targets.includes(column))
        : app.workspace.datasetDoc.dataResources // if swandive false, then datadoc has column labeling
            .filter(resource => resource.resType === 'table')
            .flatMap(resource => resource.columns
                .filter(column => !column.role.includes('index') && !targets.includes(column.colName))
                .map(column => column.colName));

    if (predictors.length === 0) {
        predictors = Object.keys(app.variableSummaries).filter(v => !targets.includes(v) && !indexes.includes(v));
    }

    // defaultProblem
    return {
        problemId: problemDoc.about.problemID,
        system: 'auto',
        version: problemDoc.about.version,
        predictors: predictors,
        targets: targets,
        description: problemDoc.about.problemDescription,

        metric: problemDoc.inputs.performanceMetrics[0].metric,
        metrics: problemDoc.inputs.performanceMetrics.slice(1).map(elem => elem.metric),
        positiveLabel: (problemDoc.inputs.performanceMetrics.find(metric => 'posLabel' in metric) || {}).posLabel,
        precisionAtTopK: (problemDoc.inputs.performanceMetrics.find(metric => 'K' in metric) || {}).K,

        task: findTask(problemDoc.about.taskKeywords),
        subTask: findSubtask(problemDoc.about.taskKeywords),
        supervision: findSupervision(problemDoc.about.taskKeywords),
        resourceTypes: filterResourceType(problemDoc.about.taskKeywords),
        d3mTags: filterD3MTags(problemDoc.about.taskKeywords),

        splitOptions: Object.assign({
            outOfSampleSplit: true,
            // evaluationMethod can only be holdOut
            trainTestRatio: 1. - (problemDoc.inputs.dataSplits.testSize || 0.3),
            stratified: problemDoc.inputs.dataSplits.stratified,
            shuffle: problemDoc.inputs.dataSplits.shuffle === undefined ? true : problemDoc.inputs.dataSplits.shuffle,
            randomSeed: problemDoc.inputs.dataSplits.randomSeed,
            splitsFile: undefined,
            splitsDir: undefined,
            maxRecordCount: app.defaultMaxRecordCount
        }, problemDoc.splitOptions || {}),

        searchOptions: Object.assign({
            timeBoundSearch: 15,
            timeBoundRun: undefined,
            priority: undefined,
            solutionsLimit: undefined
        }, problemDoc.searchOptions || {}),

        scoreOptions: {
            evaluationMethod: problemDoc.inputs.dataSplits.method || 'kFold',
            folds: problemDoc.inputs.dataSplits.folds || 10,
            trainTestRatio: problemDoc.inputs.dataSplits.testSize || 0.7,
            stratified: problemDoc.inputs.dataSplits.stratified,
            shuffle: problemDoc.inputs.dataSplits.shuffle === undefined ? true : problemDoc.inputs.dataSplits.shuffle,
            randomSeed: problemDoc.inputs.dataSplits.randomSeed,
            splitsFile: problemDoc.inputs.dataSplits.splitsFile
        },
        meaningful: false,
        manipulations: [],
        tags: {
            nominal: app.swandive ? [] : app.workspace.datasetDoc.dataResources
                .filter(resource => resource.resType === 'table')
                .flatMap(resource => resource.columns
                    .filter(column => column.colType === 'categorical')
                    .map(column => column.colName)),
            crossSection: getTagsByRole('suggestedGroupingKey'),
            ordinal: [],
            boundary: getTagsByRole('boundaryIndicator'),
            location: getTagsByRole('locationIndicator'),
            ordering: [problemDoc?.inputs?.forecastingHorizon?.colName].filter(_ => _),
            weights: getTagsByRole('instanceWeight'), // singleton list
            indexes,
            privileged: getTagsByRole('suggestedPrivilegedData'), // singleton list
            exogenous: [],
            transformed: [],
            loose: [] // variables displayed in the force diagram, but not in any groups
        },

        numClusters: numClusters,
        timeGranularity: app.workspace.datasetDoc.dataResources
            .find(resource => resource.resType === 'table')?.columns?.find?.(column => column.timeGranularity)?.timeGranularity || {},
        forecastingHorizon: problemDoc.inputs.forecastingHorizon?.horizonValue
    };
};

/**
 * programmatically deselect every selected variable
 */
export let erase = problem => {
    problem.predictors = [];
    problem.pebbleLinks = [];
    problem.targets = [];
    problem.manipulations = [];
    Object.keys(problem.tags).forEach(tag => problem.tags[tag] = []);
    if ('d3mIndex' in app.variableSummaries)
        problem.tags.indexes = ['d3mIndex'];
};

export let generateProblemID = () => 'problem ' + app.workspace.raven_config.problemCount++;

/**
 * Translate the barebones discovery problem descriptions to Problems
 * @param {Object[]} problems
 * @returns {Object.<string, Problem>}
 */
export function standardizeDiscovery(problems) {
    console.log('-------------  Discover!!!  -------------')
    // filter out problems with target of null
    // e.g. [{"target":null, "predictors":null,"transform":0, ...},]
    //
    problems = problems.filter(problem => problem.targets && problem.targets.every(target => target in app.variableSummaries));

    return problems.reduce((out, prob) => {
        let problemId = generateProblemID();
        let manips = [];

        prob.subsetObs.forEach(subsetObs => manips.push({
            type: 'subset',
            id: 'subset ' + manips.length,
            abstractQuery: [{
                id: problemId + '-' + String(0) + '-' + String(1),
                name: subsetObs,
                show_op: false,
                cancellable: true,
                subset: 'automated'
            }],
            nodeId: 2,
            groupId: 1
        }));

        // skip if transformations are present, D3M primitives cannot handle
        // if (!IS_D3M_DOMAIN) {
        prob.transform.forEach(transformObs => {
            // index at zero compensates for poor R json handling
            let [variable, transform] = transformObs[0].split('=').map(_ => _.trim());
            manips.push({
                type: 'transform',
                transforms: [{
                    name: variable,
                    equation: transform
                }],
                expansions: [],
                binnings: [],
                manual: [],
                id: 'transform ' + manips.length,
            });
        });
        // }

        // console.log('variableSummaries:' + JSON.stringify(app.variableSummaries))
        // console.log('>> prob:' +  JSON.stringify(prob))

        let predictors = [...prob.predictors, ...getTransformVariables(manips)]
            .filter(variable => !prob.targets.includes(variable));

        let ordering = predictors.filter(variable => app.variableSummaries[variable]?.timeUnit);
        predictors = predictors.filter(predictor => !ordering.includes(predictor));

        out[problemId] = {
            problemId,
            system: "auto",
            description: undefined,
            // should include all variables (and transformed variables) that are not in target list
            predictors,
            targets: prob.targets,
            meaningful: false,
            // NOTE: if the target is manipulated, the metric/task could be wrong
            metric: undefined,
            metrics: [], // secondary evaluation metrics
            task: undefined,
            supervision: undefined,
            subTask: undefined,
            resourceTypes: [],
            d3mTags: [],

            splitOptions: {
                outOfSampleSplit: true,
                trainTestRatio: 0.7,
                stratified: false,
                shuffle: true,
                randomSeed: undefined,
                splitsFile: undefined,
                splitsDir: undefined,
                maxRecordCount: app.defaultMaxRecordCount
            },
            searchOptions: {
                timeBoundSearch: 15,
                timeBoundRun: undefined,
                priority: undefined,
                solutionsLimit: undefined
            },
            scoreOptions: {
                evaluationMethod: 'kFold',
                folds: 10,
                trainTestRatio: 0.7,
                stratified: false,
                shuffle: true,
                randomSeed: undefined,
                splitsFile: undefined,
            },

            manipulations: manips,
            tags: {
                transformed: [...getTransformVariables(manips)], // this is used when updating manipulations pipeline
                weights: [], // singleton list
                crossSection: [],
                ordinal: [],
                boundary: [],
                location: [],
                ordering,
                indexes: ['d3mIndex'],
                privileged: [],
                exogenous: [],
                temporal: [],
                nominal: [],
                loose: [] // variables displayed in the force diagram, but not in any groups
            },
            timeGranularity: {}
        };
        setTask(
            app.inferIsCategorical(app.variableSummaries[prob.targets[0]])
                ? 'classification' : ordering.length > 0
                ? 'forecasting'
                : 'regression',
            out[problemId]);
        return out;
    }, {});
}

/**
 * @returns {Problem}
 */
export let getSelectedProblem = () => {
    let ravenConfig = app.workspace?.raven_config;
    return ravenConfig?.problems?.[ravenConfig?.selectedProblem]
};

/**
 * Return the problem description--or autogenerate one
 * @param {Problem} problem
 */
export function getDescription(problem) {
    if (problem.description) return problem.description;
    let predictors = getPredictorVariables(problem);
    if (problem.targets.length === 0 || predictors.length === 0) return "Empty problem. Please add some variables to the model via the variables tab.";
    return `${problem.targets} is predicted by ${predictors.slice(0, -1).join(", ")} ${predictors.length > 1 ? 'and ' : ''}${predictors[predictors.length - 1]}`;
}

/**
 * @param {d3mTaskType} task
 * @param {Problem} problem
 */
export let setTask = (task, problem) => {
    if (task === problem.task) return; //  || !(supportedTasks.includes(task))
    problem.task = task;
    if (task.toLowerCase() === 'classification')
        setSubTask(app.variableSummaries[problem.targets[0]].binary ? 'binary' : 'multiClass', problem);
    else if (task.toLowerCase() === 'regression')
        setSubTask(problem.targets.length > 1 ? 'multivariate' : 'univariate', problem);
    else if (!(problem.subTask in app.applicableMetrics[task]))
        setSubTask(Object.keys(app.applicableMetrics[task])[0], problem);

    if (problem.task === 'forecasting' && problem.tags.ordering.length === 0) {
        problem.tags.ordering = getPredictorVariables(problem)
            .filter(variable => app.variableSummaries[variable].timeUnit)
        problem.predictors = problem.predictors
            .filter(predictor => !problem.tags.ordering.includes(predictor))
    }
    delete problem.unedited;
};

/**
 * @param {d3mTaskSubtype} subTask
 * @param {Problem} problem
 */
export let setSubTask = (subTask, problem) => {
    if (subTask === problem.subTask || !Object.keys(app.applicableMetrics[problem.task]).includes(subTask))
        return;
    problem.subTask = subTask;
    setMetric(app.applicableMetrics[problem.task][getSubtask(problem)][0], problem, true);

    delete problem.unedited;
};

/**
 * Sets if the problem is supervised or unsupervised
 * @param {d3mSupervision} supervision
 * @param {Problem} problem
 */
export let setSupervision = (supervision, problem) => {
    if (supervision === problem.supervision || ![undefined, ...Object.keys(app.d3mSupervision)].includes(supervision))
        return;
    problem.supervision = supervision;

    delete problem.unedited;
};

/**
 * @param {string[]} types
 * @param {Problem} problem
 */
export let setResourceTypes = (types, problem) => {
    types = types.filter(type => Object.keys(app.d3mResourceType).includes(type));
    if (types.every(type => problem.resourceTypes.includes(type)) && types.length === problem.resourceTypes.length)
        return;

    problem.resourceTypes = types;

    delete problem.unedited;
};

/**
 * Sets the secondary tags that are dropped into keywords sent to the TA2
 * @param {string[]} tags
 * @param {Problem} problem
 */
export let setD3MTags = (tags, problem) => {
    tags = tags.filter(type => Object.keys(app.d3mTags).includes(type));
    if (tags.every(tag => problem.d3mTags.includes(tag)) && tags.length === problem.d3mTags.length)
        return;

    problem.d3mTags = tags;

    delete problem.unedited;
};

/**
 * Mutate the problem state if the subtask is invalid, and return the subtask
 * @param {Problem} problem
 * @returns {string}
 */
export let getSubtask = problem => {
    if (problem.task.toLowerCase() === 'regression')
        return problem.targets.length > 1 ? 'multivariate' : 'univariate';

    if (!problem.subTask && app.variableSummaries[problem.targets[0]]) {
        if (problem.task.toLowerCase() === 'classification')
            problem.subTask = app.variableSummaries[problem.targets[0]].binary ? 'binary' : 'multiClass';
        else if (problem.task.toLowerCase() === 'regression')
            problem.subTask = problem.targets.length > 1 ? 'multivariate' : 'univariate';
        else
            problem.subTask = Object.keys(app.applicableMetrics[problem.task])[0]
    } else if (!problem.subTask && !app.variableSummaries[problem.targets[0]])
        return Object.keys(app.applicableMetrics[problem.task])[0];

    return problem.subTask
};

/**
 * Sets the metric, and may update the secondary metric
 * @param {string} metric
 * @param {Problem} problem
 * @param {boolean} all - set all other secondary metrics that also apply to the problem
 */
export let setMetric = (metric, problem, all = false) => {
    if (metric === problem.metric || !app.applicableMetrics[problem.task][getSubtask(problem)].includes(metric))
        return;
    if (problem.metrics.includes(metric)) problem.metrics.push(problem.metric);
    problem.metric = metric;
    utils.remove(problem.metrics, metric);

    if (all) problem.metrics = app.applicableMetrics[problem.task][getSubtask(problem)]
        .filter(elem => elem !== metric).sort();

    delete problem.unedited;
};

/**
 * Retrieve all predictor variables
 * This includes variables tagged as predictors/in the predictor group,
 *     as well as variables that are linked to the target group
 * @param {Problem} problem
 * @returns {string[]}
 */
export let getPredictorVariables = problem => {
    if (!problem) return;
    let arrowPredictors = (problem.pebbleLinks || [])
        .filter(link => problem.targets.includes(link.target) && link.right)
        .map(link => link.source);

    // union arrow predictors with predictor group
    return [...new Set([...problem.predictors, ...arrowPredictors])]
};

/**
 * Retrieve all variables that are nominal/text
 * This includes variables that were text-based and variables that were tagged as nominal
 * @param {Problem} problem
 * @returns {string[]}
 */
export let getNominalVariables = problem => {
    let selectedProblem = problem || getSelectedProblem();
    return [...new Set([
        ...Object.keys(app.variableSummaries).filter(variable => app.variableSummaries[variable].nature === "nominal"),
        ...selectedProblem.tags.nominal,
        // // targets in a classification problem are also nominal
        ...selectedProblem.task.toLowerCase() === 'classification'
            ? selectedProblem.targets : []
    ])];
};

/**
 * Gets the name of the problem's ordering variable
 * @param {Problem} problem
 * @returns {string}
 */
export let getOrderingVariable = problem => {
    if (problem.orderingName)
        return problem.orderingName;
    if (problem.tags.ordering.length > 0)
        return problem.tags.ordering.join("-");
    if (problem.tags.indexes.length === 1)
        return problem.tags.indexes[0];
}

/**
 * Computes the time unit of the constructed ordering variable
 * @param {Problem} problem
 * @returns {(string | undefined)}
 */
export let getOrderingTimeUnit = problem => {
    let units = problem.tags.ordering
        .map(variable => app.variableSummaries[variable]?.timeUnit);
    if (units.some(unit => unit === undefined))
        return
    return units.join("-")
}

export let getGeographicVariables = () =>
    Object.keys(app.variableSummaries).filter(variable => app.variableSummaries[variable].locationUnit);

export let getLocationVariables = problem => {
    let selectedProblem = problem || getSelectedProblem();
    return selectedProblem.tags.location;
}

export let getLocationUnit = variable => app.variableSummaries[variable].locationUnit;
export let getLocationFormat = variable => app.variableSummaries[variable].locationFormat;
export let getTransformVariables = pipeline => pipeline.reduce((out, step) => {
    if (step.type !== 'transform') return out;

    step.transforms.forEach(transform => out.add(transform.name));
    step.expansions.forEach(expansion => queryMongo.expansionTerms(expansion).forEach(term => out.add(term)));
    step.binnings.forEach(binning => out.add(binning.name));
    step.manual.forEach(manual => out.add(manual.name));

    return out;
}, new Set());

// build a description of all computations the user has specified
// typically omit 'all' when calling, unless you want to keep all variables (like in explore mode)
export let getAbstractPipeline = (problem, all) => {
    if (!problem) return [...app.workspace.raven_config.hardManipulations]

    let modelVariables = [
        ...problem.tags.indexes,
        ...getPredictorVariables(problem),
        getOrderingVariable(problem),
        ...problem.targets
    ].filter(_ => _);
    let nominalCasts = problem.tags.nominals || [];
    // nominal casts need only be applied to variables retained after subsetting
    if (!all) nominalCasts = nominalCasts.filter(variable => modelVariables.includes(variable))

    return [
        // manipulations applied in dataset mode
        ...app.workspace.raven_config.hardManipulations,
        // manipulations applied in problem mode
        // - including ordinal labeling, imputes, transforms, subsets, etc
        ...problem.manipulations,
        // if the problem has nominal casting
        nominalCasts.length > 0 && {
            type: 'transform',
            transforms: nominalCasts.map(variable => ({
                equation: `toString(${variable})`,
                name: variable
            }))
        },
        // combine the temporal ordering variables
        problem.tags.ordering.length > 1 && {
            type: 'transform',
            transforms: [{
                equation: "concat(" + problem.tags.ordering.map(variable => `toString(${variable})`).join(", \"-\", ") + ")",
                name: problem.orderingName || getOrderingVariable(problem)
            }]
        },
        // drop nan target rows and all unused variables
        {
            type: 'menu',
            metadata: !all && (modelVariables.length < Object.keys(app.variableSummaries).length) ? {
                type: 'data',
                variables: modelVariables,
                // these are also dropped in the train/test split, but why write the data out?
                dropNA: problem.targets
            } : {type: 'data'}
        }
    ].filter(_ => _);
}

export let loadProblemPreprocess = async problem =>
    app.loadPreprocess(JSON.stringify(queryMongo.buildPipeline([
        ...getAbstractPipeline(problem, true),
        {type: 'menu', metadata: {type: 'data', sample: app.preprocessSampleSize}}
    ], app.workspace.raven_config.variablesInitial)['pipeline']));

/**
 * Sets the currently selected problem, and updates all relevant page state
 * @param {string} problemId
 */
export function setSelectedProblem(problemId) {
    let ravenConfig = app.workspace.raven_config;

    if (!problemId || ravenConfig.selectedProblem === problemId) return;
    if (!(problemId in ravenConfig.problems)) return;

    ravenConfig.selectedProblem = problemId;
    let problem = getSelectedProblem();
    // console.log('problem: ' + JSON.stringify(problem));

    // Behavioral Logging
    let logParams = {
        feature_id: 'SET_SELECTED_PROBLEM',
        activity_l1: 'DATA_PREPARATION',
        activity_l2: 'PROBLEM_DEFINITION',
        other: {problem: problem}
    };
    app.saveSystemLogEntry(logParams);


    app.updateRightPanelWidth();

    // if a constraint is being staged, delete it
    manipulate.setConstraintMenu(undefined);

    let problemPipeline = getAbstractPipeline(problem, true);
    let countMenu = {type: 'menu', metadata: {type: 'count'}};

    // update number of records
    manipulate.loadMenu(problemPipeline, countMenu)
        .then(manipulate.setTotalSubsetRecords)
        .then(m.redraw);

    // update preprocess
    loadProblemPreprocess(problem)
        .then(app.setPreprocess)
        .then(m.redraw);

    app.resetPeek();

    if (results.resultsPreferences.dataSplit !== 'all' && !problem.splitOptions.outOfSampleSplit)
        results.resultsPreferences.dataSplit = 'all';

    window.selectedProblem = problem;
}

/**
 * returns a copy of the problem with results stripped, and system/ids adjusted
 * @param {Problem} problemSource
 * @returns {Problem}
 */
export function getProblemCopy(problemSource) {
    return Object.assign(common.deepCopy(problemSource), {
        problemId: generateProblemID(),
        provenanceId: problemSource.problemId,
        unedited: true,
        pending: true,
        system: 'user',
        // IMPORTANT: this resets all results mode state
        results: undefined
    })
}

/**
 * returns true if the problem is correctly specified for a solver
 * @param {Problem} problem
 * @returns {boolean}
 */
export let isProblemValid = problem => {
    let valid = true;
    if (problem.task.toLowerCase() === 'forecasting' && !getOrderingVariable(problem)) {
        app.alertError('One variable (even an index) must be tagged as an ordering to solve a time series forecasting problem. ')
        valid = false;
    }
    if (problem.predictors.length === 0) {
        app.alertError('At least one predictor is required.');
        valid = false;
    }
    if (problem.task !== "clustering") {
        if (problem.targets.length === 0) {
            app.alertError('At least one target is required.');
            valid = false;
        }

        if (problem.targets.length > 1) {
            app.alertError("Only one target variable may be specified at a time.");
            valid = false;
        }
    }
    if (problem.tags.loose.length > 0) {
        app.alertWarn("This problem has loose variables in the modeling space that will not be used in the model: " + String(problem.tags.loose))
    }
    if (problem.task === "classification" && app.variableSummaries[problem.targets[0]].uniqueCount > 100) {
        app.alertWarn("The target variable has more than 100 classes. This may prevent meaningful results.")
    }
    // this triggers the popup
    if (!valid)
        m.redraw();
    return valid;
};

/**
 * returns true if the user actions necessitate writing out a new dataset before solving
 * @param {Problem} problem
 * @returns {boolean}
 */
export let needsManipulationRewritePriorToSolve = problem => {
    let newNominalVars = new Set(getNominalVariables(problem));
    Object.keys(app.variableSummaries)
        .filter(variable => app.variableSummaries[variable].numchar === 'character')
        .forEach(variable => newNominalVars.delete(variable));
    let hasNominalCast = [...problem.targets, ...getPredictorVariables(problem)]
        .some(variable => newNominalVars.has(variable));
    let hasOrdering = problem.tags.ordering.length > 1;

    let hasManipulation = (app.workspace.raven_config.hardManipulations.length + problem.manipulations.length) > 0;
    return hasManipulation || hasNominalCast || hasOrdering;
};