/*
  Main TwoRavens mithril app
*/
import hopscotch from 'hopscotch';
import m from 'mithril';

import $ from 'jquery';
import * as d3 from 'd3';

// polyfill for flatmap (could potentially be included as a webpack entrypoint)
import "core-js/fn/array/flat-map";

import * as common from "../common/common";

import {locationReload, setModal} from '../common/views/Modal';

import * as queryMongo from "./manipulations/queryMongo";
import * as solverD3M from './solvers/d3m';

import * as model from './model';
import * as manipulate from './manipulations/manipulate';
import * as results from "./results";
import * as explore from './explore';
import {getSelectedSolutions} from "./results";
import {linkURL, link} from "./index";

//-------------------------------------------------
// NOTE: global variables are now set in the index.html file.
//    Developers, see /template/index.html
//-------------------------------------------------

let RAVEN_CONFIG_VERSION = 1;

let TA2DebugMode = false;
export let debugLog = TA2DebugMode ? console.log : _ => _;

window.addEventListener('resize', m.redraw);

// ~~~~~ PEEK ~~~~~
// for the second-window data preview
window.addEventListener('storage', (e) => {
    if (e.key !== 'peekMore' + peekId || peekIsLoading) return;
    if (localStorage.getItem('peekMore' + peekId) !== 'true' || peekIsExhausted) return;
    localStorage.setItem('peekMore' + peekId, 'false');
    updatePeek([...workspace.raven_config.hardManipulations, ...getSelectedProblem().manipulations]);
});

// for the draggable within-window data preview
window.addEventListener('mousemove', (e) => peekMouseMove(e));  // please don't remove the anonymous wrapper
window.addEventListener('mouseup', (e) => peekMouseUp(e));

export let peekMouseMove = (e) => {
    if (!peekInlineIsResizing) return;

    let menuId = is_manipulate_mode || (rightTab === 'Manipulate' && manipulate.constraintMenu) ? 'canvas' : 'main';
    let percent = (1 - e.clientY / byId(menuId).clientHeight) * 100;

    setPeekInlineHeight(`calc(${Math.max(percent, 0)}% + ${common.heightFooter})`);
    m.redraw();
};

export let peekMouseUp = () => {
    if (!peekInlineIsResizing) return;
    peekInlineIsResizing = false;
    document.body.classList.remove('no-select');
};

export let peekData;
export let peekId = 'tworavens';

let peekLimit = 100;  // how many records to load at a time
let peekSkip = 0;  // how many records have already been loaded

export let peekIsExhausted = false;  // if all data has been retrieved, this prevents attempting to load more records
export let peekIsLoading = false;  // if a request is currently being made for more data, block additional requests

export let peekInlineHeight = `calc(20% + ${common.heightFooter})`; // updated by the drag event listener
export let setPeekInlineHeight = height => peekInlineHeight = height;

// set when inline peek table is being resized/dragged
export let peekInlineIsResizing = false;
export let setPeekInlineIsResizing = state => peekInlineIsResizing = state;

// true if within-page data preview is enabled
export let peekInlineShown = false;
export let setPeekInlineShown = state => {
  peekInlineShown = state;
  if (peekInlineShown){
    logEntryPeekUsed();
  }
};

/**
 *  Log when Peek is used.
 *    set 'is_external' to True if a new window is opened
 */
export let logEntryPeekUsed = is_external => {

  let logParams = {feature_id: 'PEEK', activity_l1: 'DATA_PREPARATION'};
  if (is_external){
    logParams.feature_id = 'PEEK_NEW_WINDOW';
  }
  saveSystemLogEntry(logParams);
};

export async function resetPeek(pipeline) {
    peekData = undefined;
    peekSkip = 0;
    peekIsExhausted = false;
    localStorage.setItem('peekTableHeaders' + peekId, JSON.stringify([]));
    localStorage.setItem('peekTableData' + peekId,
        JSON.stringify([]));

    if (pipeline) await updatePeek(pipeline);
}

export async function updatePeek(pipeline) {

    if (peekIsLoading || peekIsExhausted || pipeline === undefined)
        return;

    peekIsLoading = true;
    let variables = [];

    let problem = getSelectedProblem();
    if (is_model_mode)
        variables = [...getPredictorVariables(problem), ...problem.targets];


    let previewMenu = {
        type: 'menu',
        metadata: {
            type: 'data',
            skip: peekSkip,
            limit: peekLimit,
            variables,
            nominal: !is_manipulate_mode && getNominalVariables(problem)
                .filter(variable => variables.includes(variable))
        }
    };

    let data = await manipulate.loadMenu(
        manipulate.constraintMenu
            ? pipeline.slice(0, pipeline.indexOf(manipulate.constraintMenu.step))
            : pipeline,
        previewMenu
    );

    if (!data) return;

    peekSkip += data.length;

    if (data.length + (peekData || []).length === 0)
        alertError('The pipeline at this stage matches no records. Delete constraints to match more records.');

    if (data.length === 0) {
        peekIsExhausted = true;
        peekIsLoading = false;
        return;
    }

    data = data.map(record => Object.keys(record).reduce((out, entry) => {
        if (typeof record[entry] === 'number')
            out[entry] = formatPrecision(record[entry]);
        else if (typeof record[entry] === 'string')
            out[entry] = `"${record[entry]}"`;
        else if (typeof record[entry] === 'boolean')
            out[entry] =  m('div', {style: {'font-style': 'italic', display: 'inline'}}, String(record[entry]));
        else
            out[entry] = record[entry];
        return out;
    }, {}));

    peekData = (peekData || []).concat(data);

    localStorage.setItem('peekTableHeaders' + peekId, JSON.stringify(Object.keys(data[0])));
    localStorage.setItem('peekTableData' + peekId, JSON.stringify(peekData));

    // stop blocking new requests
    peekIsLoading = false;
    m.redraw();
}

export let downloadFile = async datasetUrl => {
    let downloadUrl = D3M_SVC_URL + '/download-file?' + m.buildQueryString({data_pointer: datasetUrl});
    let link = document.createElement("a");
    link.setAttribute("href", downloadUrl);
    link.setAttribute("download", downloadUrl);
    link.click();
};

// ~~~~ MANIPULATIONS STATE ~~~~
export let mongoURL = '/eventdata/api/';
export let datamartURL = '/datamart/api/';

// Holds steps that aren't part of a pipeline (for example, pending subset or aggregation in eventdata)
export let looseSteps = {};

export let formattingData = {};
export let alignmentData = {};
// ~~~~

export let buttonLadda = {
    btnSubmitDisc: false
};
export let buttonClasses = {
    btnDiscover: 'btn-secondary',
    btnSubmitDisc: 'btn-secondary',
    btnEstimate: 'btn-secondary'
};

// when set, solver will be called if results menu is active
export let solverPending = false;
export let setSolverPending = state => solverPending = state;

export let task1_finished = false;
export let task2_finished = false;
export let setTask1_finished = state => task1_finished = state;
export let setTask2_finished = state => task2_finished = state;
export let isResultsClicked = false;

export let problemDocExists = true;

export let currentMode;
export let is_model_mode = true;
export let is_explore_mode = false;
export let is_results_mode = false;
export let is_manipulate_mode = false;

export function set_mode(mode) {
    mode = mode ? mode.toLowerCase() : 'model';

    // remove empty steps when leaving manipulate mode
    if (workspace && is_manipulate_mode && mode !== 'manipulate') {
        let ravenConfig = workspace.raven_config;
        ravenConfig.hardManipulations = ravenConfig.hardManipulations.filter(step => {
            if (step.type === 'subset' && step.abstractQuery.length === 0) return false;
            if (step.type === 'aggregate' && step.measuresAccum.length === 0) return false;
            if (step.type === 'transform' && ['transforms', 'expansions', 'binnings', 'manual']
                .reduce((sum, val) => sum + step[val].length, 0) === 0) return false;
            return true;
        });
    }

    is_model_mode = mode === 'model';
    is_explore_mode = mode === 'explore';
    is_results_mode = mode === 'results';
    is_manipulate_mode = mode === 'manipulate';

    /*
     * Make an entry in the behavioral logs
     */
    let logParams = {
                      feature_id: mode.toUpperCase(),
                      activity_l2: 'SWITCH_MODE'
                    };
    if (is_model_mode){ logParams.activity_l1 = 'MODEL_SELECTION'};
    if (is_explore_mode){ logParams.activity_l1 = 'DATA_PREPARATION'};
    if (is_results_mode){ logParams.activity_l1 = 'MODEL_SELECTION'};
    if (is_manipulate_mode){ logParams.activity_l1 = 'DATA_PREPARATION'};

    saveSystemLogEntry(logParams);


    if (currentMode !== mode) {
        if (mode === 'model' && manipulate.pendingHardManipulation) {
            let ravenConfig = workspace.raven_config;
            buildDatasetPreprocess(ravenConfig).then(response => {
                if (!response.success) alertLog(response.message);
                else {
                    setVariableSummaries(response.data.variables);
                    ravenConfig.problems = discovery(response.data.dataset.discovery);
                }
            });
        }

        currentMode = mode;
        m.route.set('/' + mode);
        updateRightPanelWidth();
        updateLeftPanelWidth();
        m.redraw()
    }

    if (is_results_mode) {
        let resultsProblem = getResultsProblem();

        // reload the results if on the results tab and there are pending changes
        if (!resultsProblem || solverPending)
            estimate();
    }

    // cause the peek table to redraw
    resetPeek();
}

// TODO: should have an early exit if the manipulations are empty
export let buildDatasetPreprocess = async ravenConfig => await getData({
    method: 'aggregate',
    query: JSON.stringify(queryMongo.buildPipeline(
        ravenConfig.hardManipulations,
        ravenConfig.variablesInitial)['pipeline']),
    export: 'dataset'
}).then(url => m.request({
    method: 'POST',
    url: ROOK_SVC_URL + 'preprocessapp',
    data: {
        data: url,
        datastub: workspace.d3m_config.name
    }
}));

export let buildProblemPreprocess = async (ravenConfig, problem) => await getData({
    method: 'aggregate',
    query: JSON.stringify(queryMongo.buildPipeline(
        [...ravenConfig.hardManipulations, ...problem.manipulations, {
            type: 'menu',
            metadata: {
                type: 'data',
                nominal: getNominalVariables(problem),
                sample: 5000
            }
        }],
        ravenConfig.variablesInitial)['pipeline']),
    export: 'dataset'
}).then(url => m.request({
    method: 'POST',
    url: ROOK_SVC_URL + 'preprocessapp',
    data: {
        data: url,
        datastub: workspace.d3m_config.name,
        l1_activity: 'PROBLEM_DEFINITION',
        l2_activity: 'PROBLEM_SPECIFICATION'
    }
})).then(response => {
    if (!response.success) alertError(response.message);
    else return response.data.variables
});


export async function buildDatasetUrl(problem, lastStep) {

    let steps = [
        ...workspace.raven_config.hardManipulations,
        ...problem.manipulations,
    ];
    if (lastStep) steps = steps.slice(0, steps.indexOf(lastStep));

    let variables = [...getPredictorVariables(problem), ...problem.targets];
    let problemStep = {
        type: 'menu',
        metadata: {
            type: 'data',
            variables,
            nominal: !is_manipulate_mode && getNominalVariables(problem)
                .filter(variable => variables.includes(variable))
        }
    };

    let compiled = queryMongo.buildPipeline([...steps, problemStep], workspace.raven_config.variablesInitial)['pipeline'];

    return await getData({
        method: 'aggregate',
        query: JSON.stringify(compiled),
        export: 'dataset'
    });
}

export async function buildProblemUrl(problem) {

    let variables = ['d3mIndex', ...getPredictorVariables(problem), ...problem.targets];
    let abstractPipeline = [
        ...workspace.raven_config.hardManipulations,
        ...problem.manipulations,
        {
            type: 'menu',
            metadata: {
                type: 'data',
                variables,
                nominal: !is_manipulate_mode && getNominalVariables(problem)
                    .filter(variable => variables.includes(variable))
            }
        }
    ];

    let compiled = queryMongo.buildPipeline(abstractPipeline, workspace.raven_config.variablesInitial)['pipeline'];
    let metadata = queryMongo.translateDatasetDoc(compiled, workspace.datasetDoc, problem);

    return await getData({
        method: 'aggregate',
        query: JSON.stringify(compiled),
        export: 'problem',
        metadata: JSON.stringify(metadata)
    });
}

export let getData = async body => m.request({
    url: mongoURL + 'get-data',
    method: 'POST',
    data: Object.assign({
        datafile: workspace.datasetUrl, // location of the dataset csv
        collection_name: workspace.d3m_config.name // collection/dataset name
    }, body)
}).then(response => {
    // console.log('-- getData --');
    if (!response.success) throw response;

    // parse Infinity, -Infinity, NaN from unambiguous string literals. Coding handled in python function 'json_comply'
    let jsonParseLiteral = obj => {
        if (obj === undefined || obj === null) return obj;
        if (Array.isArray(obj)) return obj.map(jsonParseLiteral);

        if (typeof obj === 'object') return Object.keys(obj).reduce((acc, key) => {
            acc[key] = jsonParseLiteral(obj[key]);
            return acc;
        }, {});

        if (typeof obj === 'string') {
            if (obj === '***TWORAVENS_INFINITY***') return Infinity;
            if (obj === '***TWORAVENS_NEGATIVE_INFINITY') return -Infinity;
            if (obj === '***TWORAVENS_NAN***') return NaN;
        }

        return obj;
    };
    return jsonParseLiteral(response.data);
});


export let saveSystemLogEntry = async logData => {
    logData.type = 'SYSTEM';
    saveLogEntry(logData);
};

/*
 * Behavioral logging.  Method to save a log entry to the database
 */
export let saveLogEntry = async logData => {

    let save_log_entry_url = '/logging/create-new-entry';

    m.request({
        method: "POST",
        url: save_log_entry_url,
        data: logData
    })
        .then(function(save_result) {
            // console.log(save_result);
            /*
            if (save_result.success){
              setCurrentWorkspaceMessageSuccess('The workspace was saved!')
            } else {
              setCurrentWorkspaceMessageError('Failed to save the workspace. ' + save_result.message + ' (saveUserWorkspace)');
            }
            setSaveCurrentWorkspaceWindowOpen(true);
            */
        })
};

// for debugging - if not in PRODUCTION, prints args
export let cdb = _ => PRODUCTION || console.log(_);

export let k = 4; // strength parameter for group attraction/repulsion
let tutorial_mode = localStorage.getItem('tutorial_mode') !== 'false';

export let leftTab = 'Variables'; // current tab in left panel
export let leftTabHidden = 'Variables'; // stores the tab user was in before summary hover

export let rightTab = 'Problem'; // current tab in right panel

export let setRightTab = tab => {
    rightTab = tab;
    updateRightPanelWidth();
    setFocusedPanel('right')
};

// call with a tab name to change the left tab in model mode
export let setLeftTab = (tab) => {
    leftTab = tab;
    updateLeftPanelWidth();
    if (tab === 'Discover') buttonClasses.btnDiscover = 'btn-secondary';
    explore.setExploreVariate(tab === 'Discover' ? 'Problem' : 'Univariate');
    setFocusedPanel('left');
};

export let setLeftTabHidden = tab => {
    if (tab === 'Summary' || !tab) return;
    leftTabHidden = tab;
};

export let panelWidth = {
    'left': '0',
    'right': '0'
};

export let updateRightPanelWidth = () => {
    if (is_results_mode) common.panelOcclusion.right = '0px';
    // else if (is_model_mode && !selectedProblem) common.panelOcclusion.right = common.panelMargin;
    else if (common.panelOpen['right']) {
        let tempWidth = {
            'model': model.rightPanelWidths[rightTab],
        }[currentMode];

        panelWidth['right'] = `calc(${common.panelMargin}*2 + ${tempWidth})`;
    }
    else panelWidth['right'] = `calc(${common.panelMargin}*2 + 16px)`;
};
let updateLeftPanelWidth = () => {
    if (common.panelOpen['left'])
        panelWidth['left'] = `calc(${common.panelMargin}*2 + ${model.leftPanelWidths[leftTab]})`;
    else panelWidth['left'] = `calc(${common.panelMargin}*2 + 16px)`;
};

// minor quality of life, the focused panel gets +1 to the z-index. Set whenever a panel is clicked
export let focusedPanel = 'left';
export let setFocusedPanel = side => focusedPanel = side;

updateRightPanelWidth();
updateLeftPanelWidth();

if (!IS_EVENTDATA_DOMAIN) {
    common.setPanelCallback('right', updateRightPanelWidth);
    common.setPanelCallback('left', updateLeftPanelWidth);
}

//-------------------------------------------------
// Initialize a websocket for this page
//-------------------------------------------------
export let wsLink = WEBSOCKET_PREFIX + window.location.host +
               '/ws/connect/' + username + '/';
console.log('streamSocket connection made: ' + wsLink);
export let streamSocket = new WebSocket(wsLink);

export let streamMsgCnt = 0;
//  messages received.
//
streamSocket.onmessage = function (e) {
    streamMsgCnt++;
    debugLog(streamMsgCnt + ') message received! ' + e);
    // parse the data into JSON
    let msg_obj = JSON.parse(e.data);
    //console.log('data:' + JSON.stringify(msg_obj));
    let msg_data = msg_obj['message'];

    if (msg_data.msg_type === undefined) {
        console.log('streamSocket.onmessage: Error, "msg_data.msg_type" not specified!');
        return;
    }

    if (msg_data.data === undefined && msg_data.msg_type !== 'DATAMART_AUGMENT_PROCESS') {
        debugLog('streamSocket.onmessage: Error, "msg_data.data" type not specified!');
        debugLog('full data: ' + JSON.stringify(msg_data));
        debugLog('---------------------------------------------');
        return;
    }

    debugLog('Got it! Message type: ' + msg_data.msg_type);
    debugLog('full data: ' + JSON.stringify(msg_data));
    //JSON.stringify(msg_data));

    if (msg_data.msg_type === 'GetSearchSolutionsResults') {
        debugLog(msg_data.msg_type + ' recognized!');
        solverD3M.handleGetSearchSolutionResultsResponse(msg_data.data);
    }
    else if (msg_data.msg_type === 'DescribeSolution') {
        debugLog(msg_data.msg_type + ' recognized!');
        solverD3M.handleDescribeSolutionResponse(msg_data.data);
    }
    else if (msg_data.msg_type === 'GetScoreSolutionResults') {
        debugLog(msg_data.msg_type + ' recognized!');
        solverD3M.handleGetScoreSolutionResultsResponse(msg_data.data);
    }
    else if (msg_data.msg_type === 'GetProduceSolutionResults') {
        debugLog(msg_data.msg_type + ' recognized!');
        solverD3M.handleGetProduceSolutionResultsResponse(msg_data.data, 'fittedValues');
    }
    else if (msg_data.msg_type === 'GetPartialsSolutionResults') {
        debugLog(msg_data.msg_type + ' recognized!');
        solverD3M.handleGetProduceSolutionResultsResponse(msg_data.data, 'partialsValues');
    }
    else if (msg_data.msg_type === 'GetFitSolutionResults') {
        debugLog(msg_data.msg_type + ' recognized!');
        debugLog('No handler: Currently not using GetFitSolutionResultsResponse...');
    }
    else if (msg_data.msg_type === 'ENDGetSearchSolutionsResults') {
        debugLog(msg_data.msg_type + ' recognized!');
        solverD3M.handleENDGetSearchSolutionsResults(msg_data.data);
    }
    else if (msg_data.msg_type === 'DATAMART_MATERIALIZE_PROCESS') {
        debugLog(msg_data.msg_type + ' recognized!');
        handleMaterializeDataMessage(msg_data);
    }
    else if (msg_data.msg_type === 'DATAMART_AUGMENT_PROCESS') {
        debugLog(msg_data.msg_type + ' recognized!');
        handleAugmentDataMessage(msg_data);
    }
    else if (msg_data.msg_type === 'DATAMART_SEARCH_BY_DATASET') {
        debugLog(msg_data.msg_type + ' recognized!');
        handleSearchbyDataset(msg_data);
    }
    else {
        console.log('streamSocket.onmessage: Error, Unknown message type: ' + msg_data.msg_type);
    }
};
streamSocket.onclose = function(e) {
      console.error('streamSocket closed unexpectedly');
};
//-------------------------------------------------

// when set, a problem's Task, Subtask and Metric may not be edited
export let lockToggle = true;
export let setLockToggle = state => {
    let selectedProblem = getSelectedProblem();
    if (state && selectedProblem.system === 'solved') hopscotch.startTour(lockTour(selectedProblem));
    else lockToggle = state;
};
export let isLocked = problem => lockToggle || problem.system === 'solved';

export let priv = true;

// if no columns in the datasetDoc, swandive is enabled
// swandive set to true if task is in failset
export let swandive = false;
let failset = ["TIME_SERIES_FORECASTING","GRAPH_MATCHING","LINK_PREDICTION","timeSeriesForecasting","graphMatching","linkPrediction"];

// replacement for javascript's blocking 'alert' function, draws a popup similar to 'alert'
export let alertLog = (value, shown) => {
    alerts.push({type: 'log', time: new Date(), description: value});
    showModalAlerts = shown !== false; // Default is 'true'
};
export let alertWarn = (value, shown) => {
    alerts.push({type: 'warn', time: new Date(), description: value});
    showModalAlerts = shown !== false; // Default is 'true'
    console.trace('warning: ', value);
};
export let alertError = (value, shown) => {
    alerts.push({type: 'error', time: new Date(), description: value});
    showModalAlerts = shown !== false; // Default is 'true'
    console.trace('error: ', value);
};

// alerts popup internals
export let alerts = [];
export let alertsLastViewed = new Date();

export let showModalAlerts = false;
export let setShowModalAlerts = state => showModalAlerts = state;

export let showModalTA2Debug = false;
export let setShowModalTA2Debug = state => showModalTA2Debug = state;

export let showModalDownload = false;
export let setShowModalDownload = state => showModalDownload = state;

// menu state within datamart component
export let datamartPreferences = {
    // default state for query
    query: {
      keywords: [],
        /*
        dataset: {
            about: '',
            keywords: []
        }*/
    },
    // potential new indices to submit to datamart
    indices: [],

    // search results
    results: {
        ISI: [],
        NYU: []
    },
    // one of 'augment', 'preview', 'metadata', undefined
    modalShown: undefined,
    // stores paths to data and metadata, as well as a data preview and metadata (datasetDoc.json) for materialized datasets
    cached: {},
    // track preview button state
    previewButtonState: {
      ISI: [],
      NYU: []
    }
};

export let configurations = {};
export let domainIdentifier = null; // available throughout apps js; used for saving workspace

// eventually read this from the schema with real descriptions
// metrics, tasks, and subtasks as specified in D3M schemas
// MEAN SQUARED ERROR IS SET TO SAME AS RMSE. MSE is in schema but not proto
export let d3mTaskType = {
    taskTypeUndefined: "TASK_TYPE_UNDEFINED",
    classification: "CLASSIFICATION",
    regression: "REGRESSION",
    clustering: "CLUSTERING",
    linkPrediction: "LINK_PREDICTION",
    vertexNomination: "VERTEX_NOMINATION",
    vertexClassification: "VERTEX_CLASSIFICATION",
    communityDetection: "COMMUNITY_DETECTION",
    graphMatching: "GRAPH_MATCHING",
    timeSeriesForecasting: "TIME_SERIES_FORECASTING",
    collaborativeFiltering: "COLLABORATIVE_FILTERING",
    objectDetection: "OBJECT_DETECTION",
    semisupervisedClassification: "SEMISUPERVISED_CLASSIFICATION",
    semisupervisedRegression: "SEMISUPERVISED_REGRESSION",
};

export let d3mTaskSubtype = {
    taskSubtypeUndefined: "TASK_SUBTYPE_UNDEFINED",
    subtypeNone: "NONE",
    binary: "BINARY",
    multiClass: "MULTICLASS",
    multiLabel: "MULTILABEL",
    univariate: "UNIVARIATE",
    multivariate: "MULTIVARIATE",
    overlapping: "OVERLAPPING",
    nonOverlapping: "NONOVERLAPPING",
};

export let d3mMetrics = {
    metricUndefined: "METRIC_UNDEFINED",
    accuracy: "ACCURACY",
    precision: "PRECISION",
    recall: "RECALL",
    f1: "F1",
    f1Micro: "F1_MICRO",
    f1Macro: "F1_MACRO",
    rocAuc: "ROC_AUC",
    rocAucMicro: "ROC_AUC_MICRO",
    rocAucMacro: "ROC_AUC_MACRO",
    meanSquaredError: "MEAN_SQUARED_ERROR",
    rootMeanSquaredError: "ROOT_MEAN_SQUARED_ERROR",
    meanAbsoluteError: "MEAN_ABSOLUTE_ERROR",
    rSquared: "R_SQUARED",
    normalizedMutualInformation: "NORMALIZED_MUTUAL_INFORMATION",
    jaccardSimilarityScore: "JACCARD_SIMILARITY_SCORE",
    precisionAtTopK: "PRECISION_AT_TOP_K",
    objectDetectionAveragePrecision: "OBJECT_DETECTION_AVERAGE_PRECISION",
    hammingLoss: "HAMMING_LOSS",
    rank: "RANK",
    loss: "LOSS",
};

export let d3mMetricsInverted = Object.keys(d3mMetrics)
    .reduce((out, key) => Object.assign(out, {[d3mMetrics[key]]: key}), {});

export let d3mEvaluationMethods = {
    holdout: "HOLDOUT",
    kFold: "K_FOLD"
};

export let supportedTasks = [
    'classification', 'regression',
    'timeSeriesForecasting',
    'semisupervisedClassification', 'semisupervisedRegression'
];

export let applicableMetrics = {
    classification: {
        binary: ['accuracy', 'precision', 'recall', 'f1', 'rocAuc', 'jaccardSimilarityScore'],
        multiClass: ['accuracy', 'f1Micro', 'f1Macro', 'rocAucMicro', 'rocAucMacro', 'jaccardSimilarityScore'],
        multiLabel: ['accuracy', 'f1Micro', 'f1Macro', 'rocAucMacro', 'jaccardSimilarityScore', 'hammingLoss']
    },
    regression: {
        univariate: ['meanAbsoluteError', 'meanSquaredError', 'rootMeanSquaredError', 'rSquared'],
        multivariate: ['meanAbsoluteError', 'meanSquaredError', 'rootMeanSquaredError', 'rSquared']
    },
    linkPrediction: {
        subTypeNone: ['accuracy', 'jaccardSimilarityScore']
    },
    vertexNomination: {
        subTypeNone: ['meanReciprocalRank'],
        binary: ['accuracy', 'precision', 'recall', 'f1', 'rocAuc', 'jaccardSimilarityScore']
    },
    vertexClassification: {
        multiClass: ['accuracy', 'f1Micro', 'f1Macro', 'rocAucMicro', 'rocAucMacro', 'jaccardSimilarityScore'],
        multiLabel: ['accuracy', 'f1Micro', 'f1Macro', 'rocAucMacro', 'jaccardSimilarityScore']
    },
    communityDetection: {
        subTypeNone: ['normalizedMutualInformation']
    },
    graphMatching: {
        subTypeNone: ['accuracy', 'jaccardSimilarityScore']
    },
    timeSeriesForecasting: {
        subTypeNone: ['meanAbsoluteError', 'meanSquaredError', 'rootMeanSquaredError', 'rSquared', 'precisionAtTopK']
    },
    collaborativeFiltering: {
        subTypeNone: ['meanAbsoluteError', 'meanSquaredError', 'rootMeanSquaredError', 'rSquared']
    },
    objectDetection: {
        subTypeNone: ['objectDetectionAveragePrecision']
    },
    semisupervisedClassification: {
        binary: ['accuracy', 'precision', 'recall', 'f1', 'rocAuc'],
        multiClass: ['accuracy', 'f1Micro', 'f1Macro', 'rocAucMicro', 'rocAucMacro', 'jaccardSimilarityScore'],
        multiLabel: ['accuracy', 'f1Micro', 'f1Macro', 'rocAucMacro', 'jaccardSimilarityScore', 'hammingLoss']
    },
    semisupervisedRegression: {
        univariate: ['meanAbsoluteError', 'meanSquaredError', 'rootMeanSquaredError', 'rSquared'],
        multivariate: ['meanAbsoluteError', 'meanSquaredError', 'rootMeanSquaredError', 'rSquared']
    }
};

export let byId = id => document.getElementById(id);
// export let byId = id => {console.log(id); return document.getElementById(id);}

export const reset = async function reloadPage() {
    solverD3M.endAllSearches();
    location.reload();
};

export let step = (target, placement, title, content) => ({
    target,
    placement,
    title,
    content,
    showCTAButton: true,
    ctaLabel: 'Disable these messages',
    onCTA: () => {
        localStorage.setItem('tutorial_mode', 'false');
        hopscotch.endTour(true);
    }
});

export let mytour = () => ({
    id: "dataset_launch",
    i18n: {doneBtn:'Ok'},
    showCloseButton: true,
    scrollDuration: 300,
    steps: [
        step("dataName", "bottom", "Welcome to the TwoRavens Solver",
             `<p>This tool can guide you to solve an empirical problem in the dataset above.</p>
                      <p>These messages will teach you the steps to take to find and submit a solution.</p>`),
        step("btnReset", "bottom", "Restart Any Problem Here",
             '<p>You can always start a problem over by using this reset button.</p>'),
        step("btnDiscover", "right", "Start Task 1",
             `<p>This Problem Discovery button allows you to start Task 1 - Problem Discovery.</p>
                     <p>Generally, as a tip, the Green button is the next button you need to press to move the current task forward.</p>
                     <p>Click this button to see a list of problems that have been discovered in the dataset.</p>
                     <p>You can mark which ones you agree may be interesting, and then submit the table as an answer.</p>`),
        //step("btnSelect", "right", "Complete Task 1",
        //     `<p>This submission button marks Task 1 - Problem Discovery, as complete.</p>
        //     <p>Click this button to save the check marked problems in the table below as potentially interesting or relevant.</p>
        //     <p>Generally, as a tip, the Green button is the next button you need to press to move the current task forward.</p>`),
        step("btnResults", "left", "Solve Task 2",
             `<p>This generally is the important step to follow for Task 2 - Build a Model.</p>
                      <p>Generally, as a tip, the Green button is the next button you need to press to move the current task forward, and this button will be Green when Task 1 is completed and Task 2 started.</p>
                      <p>Click this Solve button to tell the tool to find a solution to the problem, using the variables presented in the center panel.</p>`),
        step('TargetsHull', "left", "Target Variable",
             `We are trying to predict ${getSelectedProblem().targets.join(', ')}.
                      This center panel graphically represents the problem currently being attempted.`),
        step("PredictorsHull", "right", "Explanation Set", "This set of variables can potentially predict the target."),
        step("tabVariables", "right", "Variable List",
             `<p>Click on any variable name here if you wish to remove it from the problem solution.</p>
                      <p>You likely do not need to adjust the problem representation in the center panel.</p>`),
        // step("btnEndSession", "bottom", "Finish Problem",
        //      "If the solution reported back seems acceptable, then finish this problem by clicking this End Session button."),
    ]
});


export let mytour3 = {
    id: "dataset_launch",
    i18n: {doneBtn:'Ok'},
    showCloseButton: true,
    scrollDuration: 300,
    steps: [
        step("btnSelect", "right", "Complete Task 1",
             `<p>This submission button marks Task 1 - Problem Discovery, as complete.</p>
                     <p>Click this button to save the check marked problems in the table below as potentially interesting or relevant.</p>
                     <p>Generally, as a tip, the Green button is the next button you need to press to move the current task forward.</p>`),
    ]
};

// appears when a user attempts to edit when the toggle is set
export let lockTour = problem => ({
    id: "lock_toggle",
    i18n: {doneBtn:'Ok'},
    showCloseButton: true,
    scrollDuration: 300,
    steps: [
        step("btnLock", "left", "Locked Mode", problem.system === 'solved'
            ? `<p>This problem cannot be edited, because it already has solutions.</p>`
            : `<p>Click the lock button to enable editing.</p>`)
    ]
});

/**
 1. Load datasetDoc
 2. Load datasetUrl
 3. Read preprocess data or (if necessary) run preprocess
 4. Create raven_config if undefined
    a. Assign discovered problems into raven_config
    b. Read the d3m problem schema and add to problems
 */

export let workspace;

export let getCurrentWorkspaceName = () => {
    return (workspace || {}).name || '(no workspace name)';
};
export let getCurrentWorkspaceId = () => {
  return (workspace || {}).user_workspace_id || '(no id)';
  //return (workspace === undefined || workspace.user_workspace_id === undefined) ? '(no id)' : workspace.user_workspace_id;
};

export let setShowModalWorkspace = state => showModalWorkspace = state;
export let showModalWorkspace = false;
/*
 * Set the workspace.datasetUrl using the workspace's d3m_config
 *  - e.g. workspace.d3m_config.problem_data_info
 *    - example of url in variable above
 *        - /config/d3m-config/get-problem-data-file-info/39
 */
export let setDatasetUrl = async () => {

    let showDatasetUrlFailModal = (msg) => setModal(m('div', [
            m('p', {class: 'h5'}, "The dataset url was not found."),
            m('p', 'Please try to reload the page using the button below.'),
            m('hr'),
            m('p', 'If it fails again, please contact the administrator.'),
            m('p', msg)
        ]),
        "Severe Error. Failed to locate the dataset",
        true,
        "Reload Page",
        false,
        locationReload);


    console.log("-- setDatasetUrl --");
    //url example: /config/d3m-config/get-problem-data-file-info/39
    //
    let problem_info_result = await m.request(workspace.d3m_config.problem_data_info);

    if (!problem_info_result.success) {
        showDatasetUrlFailModal('Error: ' + problem_info_result.message);

        return false;
    }

    if ('source_data_path' in problem_info_result.data) {
        workspace.datasetUrl = problem_info_result.data.source_data_path;
    }

    if (workspace.datasetUrl === undefined) {
        console.log('Severe error.  Not able to set the datasetUrl. (p2)' +
            ' (url: ' + workspace.d3m_config.problem_data_info + ')');

        showDatasetUrlFailModal('(url: ' + workspace.d3m_config.problem_data_info + ')');

        return false;
    }
    if (IS_D3M_DOMAIN && !workspace.datasetUrl) {

        console.log('Severe error.  Not able to set the datasetUrl. (p2)' +
            ' (url: ' + workspace.d3m_config.problem_data_info + ')' +
            ' Invalid data: ' + JSON.stringify(problem_info_result));

        showDatasetUrlFailModal('Invalid data: ' + JSON.stringify(problem_info_result));

        return false;
    }

    return true;
};

export let loadWorkspace = async newWorkspace => {

    // scopes at app.js level; used for saving workspace
    domainIdentifier = {
        name: newWorkspace.d3m_config.name,
        source_url: newWorkspace.d3m_config.config_url,
        description: 'D3M config file',
        // id: workspace.d3m_config.id
    };

    workspace = newWorkspace;
    // useful for debugging
    window.workspace = workspace;

    // update page title shown on tab
    d3.select("title").html("TwoRavens " + workspace.d3m_config.name);

    // will trigger further mongo calls if the secondary peek page is open
    localStorage.setItem('peekHeader' + peekId, "TwoRavens " + workspace.d3m_config.name);

    /**
     * 1. Load 'datasetDoc'
     */
    console.log('---------------------------------------');
    console.log("-- Workspace: 1. Load 'datasetDoc' --");
    // url example: /config/d3m-config/get-dataset-schema/json/39
    //
    console.log('url: ' + workspace.d3m_config.dataset_schema_url);

    let datasetDocInfo = await m.request(workspace.d3m_config.dataset_schema_url);
    // console.log(JSON.stringify(datasetDocInfo));

    if (!datasetDocInfo.success){
      let datasetDocFailMsg = 'D3M WARNING: No dataset doc available! ' +
                              datasetDocInfo.message;
      swandive = true;
      console.log(datasetDocFailMsg);
      // alertWarn(datasetDocFailMsg);

      let datasetDocLink = window.location.origin +
                        workspace.d3m_config.dataset_schema_url;
      setModal(m('div', {}, [
                m('p', datasetDocFailMsg),
                m('p', 'Url: ', link(datasetDocLink)),
                m('p', 'Please try to reload. However, this may be a fatal error.'),
              ]),
          true,
          "Reload Page",
          false,
          locationReload);
      return;
    }

    workspace.datasetDoc = datasetDocInfo.data;


    let datadocument_columns = (workspace.datasetDoc.dataResources.find(resource => resource.columns) || {}).columns;
    if (datadocument_columns === undefined) {
        console.log('D3M WARNING: datadocument.dataResources[x].columns is undefined.');
        swandive = true;
    }

    if (swandive)
        alertWarn('Exceptional data detected.  Please check the logs for "D3M WARNING"');

    /**
     * 2. Load 'datasetUrl'
     */
    let urlAvailable = await setDatasetUrl();

    if (!urlAvailable && IS_D3M_DOMAIN){
        // shouldn't reach here, setDatasetUrl adds failure modal
        alertWarn('FAILED TO SET DATASET URL. Please check the logs.');
        return;
    }


    /**
     * 3. read preprocess data or (if necessary) run preprocess
     * NOTE: preprocess.json is now guaranteed to exist...
     */
    console.log('---------------------------------------');
    console.log("-- Workspace: 3. read preprocess data or (if necessary) run preprocess --");

    let resPreprocess;

    // update preprocess
    if (workspace.raven_config)
        setVariableSummaries(await buildProblemPreprocess(workspace.raven_config, getSelectedProblem()));
    else {
        let url = ROOK_SVC_URL + 'preprocessapp';
        // For D3M inputs, change the preprocess input data
        let json_input = {
            data: workspace.datasetUrl,
            datastub: IS_D3M_DOMAIN ? workspace.d3m_config.name : workspace.name
        };

        try {
            // res = read(await m.request({method: 'POST', url: url, data: json_input}));
            let preprocess_info = await m.request({method: 'POST', url, data: json_input});

            // console.log('preprocess_info: ', preprocess_info);
            // console.log('preprocess_info message: ' + preprocess_info.message);
            if (!preprocess_info.success) throw "Preprocess failed";
            resPreprocess = preprocess_info.data;

            priv = resPreprocess.dataset.private || priv

        } catch(_) {
            // alertError('preprocess failed. ending user session.');
            setModal(m('div', m('p', "Preprocess failed."),
                m('p', '(p: 2)')),
                "Failed to load basic data.",
                true,
                "Reload Page",
                false,
                locationReload);
            // endsession();
            return false;
        }
        setVariableSummaries(resPreprocess.variables);
        setDatasetSummary(resPreprocess.dataset);
    }

    if (workspace.raven_config) {
        // update total subset records
        let countMenu = {type: 'menu', metadata: {type: 'count'}};
        manipulate.loadMenu([...workspace.raven_config.hardManipulations, ...getSelectedProblem().manipulations], countMenu).then(count => {
            manipulate.setTotalSubsetRecords(count);
            m.redraw();
        });
        // update peek
        resetPeek();
    }

    /**
     * 4. Create 'raven_config' if undefined
     */
    console.log('---------------------------------------');
    console.log("-- Workspace: 4. Create 'raven_config' if undefined --");
    if (workspace.raven_config) {
        console.log('workspace.raven_config found! ' + workspace.user_workspace_id);
        m.redraw();
        return true;
    }

    workspace.raven_config = {
        problemCount: 0, // used for generating new problem ID's
        ravenConfigVersion: RAVEN_CONFIG_VERSION,
        hardManipulations: [],
        problems: {},
        tags: {
            transformed: [],
            weights: [], // only one variable can be a weight
            crossSection: [],
            time: [],
            nominal: [],
            loose: [] // variables displayed in the force diagram, but not in any groups
        }
    };


    /**
     * 4.a. Assign problem discovery to raven_config
     */
    console.log('---------------------------------------');
    console.log("-- Workspace: 4.a. Assign problem discovery to raven_config --");

    if(!swandive && resPreprocess) {
        // assign discovered problems into problems set, keeping the d3m problem
        Object.assign(workspace.raven_config.problems, discovery(resPreprocess.dataset.discovery));
        workspace.raven_config.variablesInitial = Object.keys(variableSummaries);

        // Kick off discovery button as green for user guidance
        if (!task1_finished) buttonClasses.btnDiscover = 'btn-success'
    }

    // ---------------------------------------
    // 4.b. Read the d3m problem schema and add to problems
    // ...and make a call to Hello to check TA2 is up.  If we get this far, data are guaranteed to exist for the frontend
    // ---------------------------------------
    console.log('---------------------------------------');
    console.log("-- Workspace: 4.b. Read the d3m problem schema and add to problems --");

    // ---------------------------------------
    // Retrieve the problem schema....
    // ---------------------------------------

    // url example: /config/d3m-config/get-problem-schema/json/39
    //
    let d3mPS = workspace.d3m_config.problem_schema_url;
    let problemDoc;
    let problemDocInfo = await m.request(d3mPS);
    // console.log("prob schema data: ", res);
    if (problemDocInfo.success){

        problemDoc = problemDocInfo.data;

        console.log('Problem doc loaded!  Consider this Task 2')
        console.log('Message: ' + problemDocInfo.message);
        // This is a Task 2 assignment
        // console.log("DID WE GET HERE?");
        setTask1_finished(true);
        buttonClasses.btnDiscover = 'btn-success';
        buttonClasses.btnSubmitDisc = 'btn-success';
        buttonClasses.btnEstimate = 'btn-success';

    } else if (!problemDocInfo.success){                       // Task 1 is when res.success==false
        console.log('Problem doc not loaded.  Consider this Task 1.')
        console.log('Message: ' + problemDocInfo.message);

      // This is a Task 1 assignment: no problem doc.
        setTask2_finished(true);
        problemDocExists = false;
    } else {
      alertLog("Something unusual happened reading problem schema.");
    }

    if(problemDocExists){
        console.log("Task 2: Problem Doc Exists");

        // Note: There is no res.success field in this return state
        // if (!res.success){
        //   alertError('problem schema not available: ' + res.message);
        //   return
        // }

        // making it case insensitive because the case seems to disagree all too often
        if (failset.includes(problemDoc.about.taskType.toUpperCase())) {
            if(IS_D3M_DOMAIN){
                console.log('D3M WARNING: failset  task type found');
            }
            swandive = true;
        }

        // store the resourceId of the table being used in the raven_config (must persist)
        workspace.raven_config.resourceId = workspace.datasetDoc.dataResources
            .find(resource => resource.resType === 'table').resID;

        // create the default problem provided by d3m
        let targets = problemDoc.inputs.data
            .flatMap(source => source.targets.map(targ => targ.colName));
        let predictors = swandive
            ? Object.keys(variableSummaries)
                .filter(column => column !== 'd3mIndex' && !targets.includes(column))
            : newWorkspace.datasetDoc.dataResources // if swandive false, then datadoc has column labeling
                .filter(resource => resource.resType === 'table')
                .flatMap(resource => resource.columns
                    .filter(column => !column.role.includes('index') && !targets.includes(column.colName))
                    .map(column => column.colName));

        console.log('pdoc targets: ' + JSON.stringify(targets));

        let defaultProblem = {
            problemID: problemDoc.about.problemID,
            system: 'auto',
            version: problemDoc.about.version,
            predictors: predictors,
            targets: targets,
            description: problemDoc.about.problemDescription,
            metric: problemDoc.inputs.performanceMetrics[0].metric,
            metrics: problemDoc.inputs.performanceMetrics.slice(1).map(elem => elem.metric),
            task: problemDoc.about.taskType,
            subTask: problemDoc.about.taskSubtype,

            evaluationMethod: problemDoc.inputs.dataSplits.method || 'kFold',
            testSize: problemDoc.inputs.dataSplits.trainTestRatio,
            stratified: problemDoc.inputs.dataSplits.stratified,
            randomSeed: problemDoc.inputs.dataSplits.randomSeed,

            meaningful: false,
            manipulations: [],
            solutions: {
                d3m: {},
                rook: {}
            },
            selectedSource: undefined, // 'd3m' or 'rook'
            selectedSolutions: {
                d3m: undefined,
                rook: undefined
            },
            tags: {
                transformed: [],
                weights: [], // singleton list
                crossSection: [],
                time: swandive ? [] : newWorkspace.datasetDoc.dataResources // if swandive false, then datadoc has column labeling
                    .filter(resource => resource.resType === 'table')
                    .flatMap(resource => resource.columns
                        .filter(column => column.role.includes('timeIndicator') || column.colType === 'dateTime')
                        .map(column => column.colName)),
                nominal: Object.keys(variableSummaries)
                    .filter(variable => variableSummaries[variable].nature === 'nominal'),
                loose: [] // variables displayed in the force diagram, but not in any groups
            }
        };
        datamartPreferences.hints = problemDoc.dataAugmentation;

        if (!defaultProblem.subTask) {
            if (defaultProblem.task === 'classification' || defaultProblem.task === 'semisupervisedClassification')
                defaultProblem.subTask = variableSummaries[defaultProblem.targets[0]].binary === 'yes' ? 'binary' : 'multiClass'
            else if (defaultProblem.task === 'regression' || defaultProblem.task === 'semisupervisedRegression')
                defaultProblem.subTask = defaultProblem.predictors.length > 1 ? 'multivariate' : 'univariate'
            else
                defaultProblem.subTask = Object.keys(applicableMetrics[defaultProblem.task])[0]
        }

        // add the default problems to the list of problems
        let problemCopy = getProblemCopy(defaultProblem);

        workspace.raven_config.problems[problemDoc.about.problemID] = defaultProblem;
        workspace.raven_config.problems[problemCopy.problemID] = problemCopy;
        /**
         * Note: mongodb data retrieval initiated here
         *   setSelectedProblem -> loadMenu (manipulate.js) -> getData (manipulate.js)
         */
        setSelectedProblem(problemCopy.problemID);

    } else {
      console.log("Task 1: No Problem Doc");
    }

    return true;
};

/**
 called by main
 Loads all external data in the following order (logic is not included):
 1. Retrieve the configuration information
 2. Load workspace
 3. Read in zelig models (not for d3m)
 4. Read in zeligchoice models (not for d3m)
 5. Start the user session /Hello
 */

export async function load() {
    console.log('---------------------------------------');
    console.log('-- initial load, app.js - load() --');
    if (!IS_D3M_DOMAIN) {
        return;
    }

    // ---------------------------------------
    // 1. Retrieve the configuration information
    //  dev view: http://127.0.0.1:8080/user-workspaces/d3m-configs/json/latest?pretty
    // ---------------------------------------
    console.log('---------------------------------------');
    console.log('-- 1. Retrieve the configuration information --');

    // let d3m_config_url = '/user-workspaces/d3m-configs/json/latest';
    let raven_config_url = '/user-workspaces/raven-configs/json/list';
    let config_result = await m.request({
        method: "POST",
        url: raven_config_url
    });

    // console.log(JSON.stringify(config_result));

    if (!config_result.success){
      setModal(config_result.message, "Error retrieving User Workspace configuration.", true, "Reset", false, locationReload);
    }

    if (!config_result.data){
      setModal('No configurations in list!', "Error retrieving User Workspace configuration.", true, "Reset", false, locationReload);
    }

    // ------------------------------------
    // Find the current workspace in the list
    // ------------------------------------
    let workspace = config_result.data.find(config => config.is_current_workspace);

    if (!workspace){
        setModal('No current workspace config in list!', "Error retrieving User Workspace configuration.", true, "Reset", false, locationReload);
    }

    // ---------------------------------------
    // 2. Load workspace
    // ---------------------------------------
    console.log('---------------------------------------');
    console.log('-- 2. Load workspace --');

    let success = await loadWorkspace(workspace);
    if (!success){
      // alertError('Failed to load workspace');
      return;
    }

    /**
     * 5. Start the user session
     * rpc rpc Hello (HelloRequest) returns (HelloResponse) {}
     */
    console.log('---------------------------------------');
    console.log("-- 5. Start the user session /Hello --");

    let responseTA2 = await makeRequest(D3M_SVC_URL + '/Hello', {});
    if (responseTA2) {
        if (responseTA2.success !== true) {
          //  const user_err_msg = "We were unable to connect to the TA2 system.  It may not be ready.  Please try again.  (status code: " + problemDoc.message + ")";
            setModal(
                m('div', [
                    m('p', {class: 'h5'}, "We were unable to connect to the TA2 system."),
                    m('p', {class: 'h5'}, "It may not be ready."),
                    m('p', {class: 'h5'}, "Please try again using the button below."),
                    m('hr'),
                    m('p', "Technical details: " + responseTA2.message),
                  ]),
                  "Error Connecting to the TA2",
                  true,
                  "Retry TA2 Connection",
                  false,
                  locationReload);
            return;
        } else {

            // ----------------------------------------------
            // Format and show the TA2 name in the footer
            // ----------------------------------------------
            let ta2Version;
            if (typeof responseTA2.data.version !== 'undefined') {
                ta2Version = responseTA2.data.version;
            }
            let ta2Name = responseTA2.data.userAgent;
            if (ta2Version) {
                ta2Name += ' (API: ' + ta2Version + ')';
            }
            setTA2ServerInfo(ta2Name);
            // $('#ta2-server-name').html('TA2: ' + ta2Name);

        }
    }
    // hopscotch tutorial
    if (tutorial_mode) {
        console.log('Starting Hopscotch Tour');
        hopscotch.startTour(mytour());
    }

}

/**
   deletes the item at index from array.
   if object is provided, deletes first instance of object from array.
   @param {Object[]} arr - array
   @param {number} idx - index
   @param {Object} [obj] - object
*/
export function del(arr, idx, obj) {
    idx = obj ? arr.indexOf(obj) : idx;
    idx > -1 && arr.splice(idx, 1);
}

/**
 deletes the first instance of obj from arr
 @param {Object[]} arr - array
 @param {Object} [obj] - object
 */
export let remove = (arr, obj) => {
    let idx = arr.indexOf(obj);
    idx !== -1 && arr.splice(idx, 1);
};

/**
 toggles inclusion of the obj in collection
 @param {Object[]} collection - array or set
 @param {Object} [obj] - object
 */
export let toggle = (collection, obj) => {
    if (Array.isArray(collection)) {
        let idx = collection.indexOf(obj);
        idx === -1 ? collection.push(obj) : collection.splice(idx, 1)
    }
    else if (collection instanceof Set)
        collection.has(obj) ? collection.delete(obj) : collection.add(obj)
};

/** needs doc */
export function helpmaterials(type) {
    if(type=="video"){
        var win = window.open("http://2ra.vn/demos/d3mintegrationdemo.mp4", '_blank');
        win.focus();
    }else{
        var win = window.open("http://2ra.vn/papers/tworavens-d3mguide.pdf", '_blank');
        win.focus();
    }
    console.log(type);
}


export function downloadIncomplete() {
    // TODO: session id is no longer used, so there is no check
    // if (PRODUCTION && zparams.zsessionid === '') {
    //     alertWarn('Warning: Data download is not complete. Try again soon.');
    //     return true;
    // }
    return false;
}

/**
    called by switching to results mode
*/
export async function estimate() {
    isResultsClicked = true;

    let selectedProblem = getSelectedProblem();

    // return if current problem is already being solved
    if ('d3mSearchId' in selectedProblem) return;

    // a solved problem, and its copy, are not pending
    selectedProblem.pending = false;

    let copiedProblem = getProblemCopy(selectedProblem);

    workspace.raven_config.problems[copiedProblem.problemID] = copiedProblem;
    workspace.raven_config.resultsProblem = selectedProblem.problemID;

    selectedProblem.system = 'solved';

    if (!IS_D3M_DOMAIN){
        // inactive.estimateNonD3M()
        return;
    }

    buttonLadda.btnEstimate = !swandive;

    if (swandive) {
        alertError('estimate() function. Check app.js error with swandive (err: 003)');
        return;
    }

    m.redraw();

    // let nominalVars = new Set(getNominalVariables(selectedProblem));
    // let predictorVars = getPredictorVariables(selectedProblem);
    //
    // let hasNominal = [...selectedProblem.targets, ...predictorVars]
    //     .some(variable => nominalVars.has(variable));
    // let hasManipulation = selectedProblem.manipulations.length > 0;

    // let needsProblemCopy = hasManipulation || hasNominal;
    //
    let datasetPath = workspace.datasetUrl;
    // TODO: upon deleting or reassigning datasetDocProblemUrl, server-side temp directories may be deleted
    // if (needsProblemCopy) {
    //     let {data_path, metadata_path} = await buildProblemUrl(selectedProblem);
    //     selectedProblem.datasetDocPath = metadata_path;
    //     datasetPath = data_path;
    // } else delete selectedProblem.datasetDocPath;

    // initiate rook solver
    callSolverEnabled && callSolver(selectedProblem, datasetPath);

    // let datasetDocPath = selectedProblem.datasetDocPath || workspace.d3m_config.dataset_schema;
    let datasetDocPath = workspace.d3m_config.dataset_schema;

    let partialsDatasetDocPath;
    selectedProblem.d3mSolverState = 'preparing partials data';
    m.redraw();
    try {
        let partialsLocationInfo = await m.request({
            method: 'POST',
            url: ROOK_SVC_URL + 'partialsapp',
            data: {metadata: variableSummaries}
        });
        if (!partialsLocationInfo.success) {
            alertWarn('Call for partials data failed. ' + partialsLocationInfo.message);
            throw partialsLocationInfo.message;
        } else {
            selectedProblem.partialsDatasetPath = partialsLocationInfo.data.partialsDatasetPath;
            partialsDatasetDocPath = partialsLocationInfo.data.partialsDatasetDocPath;
        }
    } catch(err) {
        cdb(err);
        alertError(`Error: call to partialsapp failed`);
    }

    selectedProblem.d3mSolverState = 'initiating the search for solutions';
    m.redraw();

    let allParams = {
        searchSolutionParams: solverD3M.GRPC_SearchSolutionsRequest(selectedProblem),
        fitSolutionDefaultParams: solverD3M.GRPC_GetFitSolutionRequest(datasetDocPath),
        produceSolutionDefaultParams: solverD3M.GRPC_ProduceSolutionRequest(datasetDocPath),
        scoreSolutionDefaultParams: solverD3M.GRPC_ScoreSolutionRequest(selectedProblem, datasetDocPath)
    };

    if (partialsDatasetDocPath)
        allParams.partialsSolutionParams = solverD3M.GRPC_ProduceSolutionRequest(partialsDatasetDocPath);

    console.warn("#debug allParams");
    console.log(JSON.stringify(allParams));

    let res = await makeRequest(D3M_SVC_URL + '/SearchDescribeFitScoreSolutions', allParams);

    if (!res || !res.success) {
        solverD3M.handleENDGetSearchSolutionsResults();
        alertError('SearchDescribeFitScoreSolutions request Failed! ' + res.message);
        m.redraw();
        return;
    }

    // sort resulting pipelines by the primary metric by default
    results.selectedMetric.d3m = selectedProblem.metric;

    // route streamed responses with this searchId to this problem
    selectedProblem.d3mSearchId = res.data.searchId;

    selectedProblem.d3mSolverState = '';
    m.redraw();
}

export async function makeRequest(url, data) {
    // console.log('url:', url);
    // console.log('POST:', data);
    let res;
    try {
        res = await m.request(url, {method: 'POST', data: data});
        // console.log('response:', res);
        // oftentimes rook fails with a {warning: '...'} JSON
        if (res && 'warning' in res && Object.keys(res).length === 1) {
            // alertWarn('Warning: ' + res.warning);
            solverD3M.end_ta3_search(false, res.warning);
        }
    } catch(err) {
        solverD3M.end_ta3_search(false, err);
        cdb(err);
        alertError(`Error: call to ${url} failed`);
    }

   /*
    // call end_ta3_search if status != OK
    // status may be in different places for different calls though, and this is not worth doing at the moment
    let myreg = /d3m-service/g;
    let isd3mcall = myreg.test(url);
    if(isd3mcall) {
        let mystatus = res.responseInfo.status.code.toUpperCase();
        if(mystatus != "OK") {
            solverD3M.end_ta3_search(false, "grpc response status not ok");
        }
    }
    */

    if (!IS_D3M_DOMAIN) {
        buttonLadda.btnEstimate = false;
        m.redraw()
    }
    return res;
}


export let callSolverEnabled = false;
// takes as input problem, calls rooksolver, and stores result
export async function callSolver(prob, datasetPath=undefined) {
    setSolverPending(false);

    let hasManipulation = [...workspace.raven_config.hardManipulations, ...prob.manipulations].length > 0;
    let hasNominal = getNominalVariables(prob).length > 0;

    if (!datasetPath)
        datasetPath = hasManipulation || hasNominal ? await buildDatasetUrl(prob) : workspace.datasetUrl;

    // solutions.rook[ravenID] = cachedResponse;
    let params = {
        regression: [
            {method: 'lm'}, // old faithful
            {method: 'pcr'}, // principal components regression
            {method: 'glmnet'}, // lasso/ridge
            {method: 'rpart'}, // regression tree
            {method: 'knn'}, // k nearest neighbors
            {method: 'earth'}, // regression splines
            {method: 'svmLinear'} // linear support vector regression
        ],
        classification: [
            ...(variableSummaries[prob.targets[0]].unique == 2 ? [
                {method: 'glm', hyperparameters: {family: 'binomial'}},
                {method: 'glmnet', hyperparameters: {family: 'binomial'}},
            ] : []),
            {method: 'lda'}, // linear discriminant analysis
            {method: 'qda'}, // quadratic discriminant analysis
            {method: 'rpart'}, // decision tree
            {method: 'svmLinear'}, // support vector machine
            {method: 'naive_bayes'},
            {method: 'knn'}
        ]
    }[prob.task];

    // keep the problem light
    let probReduced = Object.assign({}, prob);
    delete probReduced.solutions;
    delete probReduced.metric;

    m.redraw();

    for (let param of params) await makeRequest(ROOK_SVC_URL + 'solverapp', Object.assign({
        problem: probReduced,
        dataset_path: datasetPath,
        samples: prob.actualValues && prob.actualValues.map(point => point.d3mIndex)
    }, param)).then(response => {
        // assign source and remove errant fits
        Object.keys(response.results)
            .forEach(result => {

                response.results[result].source = 'rook';
                if ('error' in response.results[result])
                    delete response.results[result];
                else if (Object.keys(response.results[result].models)
                    .some(target => 'error' in response.results[result].models[target]))
                    delete response.results[result]
            });

        // add to rook solutions
        Object.assign(prob.solutions.rook, response.results);
        let selectedPipelines = results.getSelectedSolutions(prob);
        if (selectedPipelines.length === 0) results.setSelectedSolution(prob, 'rook', Object.keys(prob.solutions.rook)[0]);
        m.redraw()
    });

    m.redraw();
}

// programmatically deselect every selected variable
export let erase = () => {
    let problem = getSelectedProblem();
    problem.predictors = [];
    problem.pebbleLinks = [];
    problem.targets = [];
    problem.manipulations = [];
    problem.tags = {
        transformed: [],
        weights: [], // singleton list
        crossSection: [],
        time: [],
        nominal: [],
        loose: [] // variables displayed in the force diagram, but not in any groups
    }
};

/**
   converts color codes
*/
export let hexToRgba = (hex, alpha) => {
    let int = parseInt(hex.replace('#', ''), 16);
    return `rgba(${[(int >> 16) & 255, (int >> 8) & 255, int & 255, alpha || '0.5'].join(',')})`;
};

/**
 *  Process problems
 */
export function discovery(problems) {

    // filter out problems with target of null
    // e.g. [{"target":null, "predictors":null,"transform":0, ...},]
    //
    problems = problems.filter(yeTarget => yeTarget.target)


    return problems.reduce((out, prob) => {
        let problemID = generateProblemID();
        let manips = [];

        if (prob.subsetObs) {
            manips.push({
                type: 'subset',
                id: 'subset ' + manips.length,
                abstractQuery: [{
                    id: problemID + '-' + String(0) + '-' + String(1),
                    name: prob.subsetObs,
                    show_op: false,
                    cancellable: true,
                    subset: 'automated'
                }],
                nodeId: 2,
                groupId: 1
            })
        }

        if (prob.transform) {
            // skip if transformations are present, D3M primitives cannot handle
            if (IS_D3M_DOMAIN) return out;

            let [variable, transform] = prob.transform.split('=').map(_ => _.trim());
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
            })
        }

        // R can't represent scalars
        // So R json libraries demote singletons to scalars in serialization.
        // coerceArray un-mangles data from R, in cases where you are expecting an array that could potentially be of length one
        let coerceArray = data => Array.isArray(data) ? data : [data];

        // console.log('variableSummaries:' + JSON.stringify(variableSummaries))
        // console.log('>> prob:' +  JSON.stringify(prob))

        out[problemID] = {
            problemID,
            system: "auto",
            description: undefined,
            predictors: [...coerceArray(prob.predictors), ...getTransformVariables(manips)],
            targets: [prob.target],
            // NOTE: if the target is manipulated, the metric/task could be wrong
            metric: undefined,
            metrics: [], // secondary evaluation metrics
            task: undefined,
            subTask: 'taskSubtypeUndefined',
            meaningful: false,
            evaluationMethod: 'kFold',
            manipulations: manips,
            solutions: {
                d3m: {},
                rook: {}
            },
            selectedSource: undefined, // 'd3m' or 'rook'
            selectedSolutions: {
                d3m: undefined,
                rook: undefined
            },
            tags: {
                transformed: [...getTransformVariables(manips)], // this is used when updating manipulations pipeline
                weights: [], // singleton list
                crossSection: [],
                time: [],
                nominal: Object.keys(variableSummaries)
                    .filter(variable => variableSummaries[variable].nature === 'nominal'),
                loose: [] // variables displayed in the force diagram, but not in any groups
            },
            summaries: {} // this gets populated below
        };
        setTask(variableSummaries[prob.target].plottype === "bar" ? 'classification' : 'regression', out[problemID])
        return out;
    }, {});
}

export let setVariableSummaries = state => {
    variableSummaries = Object.keys(state).reduce((out, variable) =>
        Object.assign(out, {[variable.split('.').join('_')]: state[variable]}), {});

    // quality of life
    Object.keys(variableSummaries).forEach(variable => variableSummaries[variable].name = variable);
    window.variableSummaries = variableSummaries;
};
export let variableSummaries = {};

export let setDatasetSummary = state => datasetSummary = state;
export let datasetSummary = {};


/*
 *  'Save' button - Variables related to displaying a modal message
 */
export let saveCurrentWorkspaceWindowOpen = false;
// Open/close modal window
export let setSaveCurrentWorkspaceWindowOpen = (boolVal) => {
  saveCurrentWorkspaceWindowOpen = boolVal;
};

/*
 *  'Save' button - Message to display in the modal window
 */

// set/get user messages for new workspace
export let currentWorkspaceSaveMsg = '';

// success message
export let setCurrentWorkspaceMessageSuccess = (errMsg) => {
  currentWorkspaceSaveMsg = m('p', {class: 'text-success'}, errMsg);
};

// error message
export let setCurrentWorkspaceMessageError = (errMsg) => {
  currentWorkspaceSaveMsg = m('p', {class: 'text-danger'}, errMsg);
};
export let getCurrentWorkspaceMessage = () => { return currentWorkspaceSaveMsg; };


/*
 *  saveUserWorkspace() save the current
 *  ravens_config data to the user workspace.
 *    e.g. updates the workspace saved in the database
 */
export let saveUserWorkspace = () => {
  console.log('-- saveUserWorkspace --');

  // clear modal message
  setSaveCurrentWorkspaceWindowOpen(false);
  setCurrentWorkspaceMessageSuccess('');


  if(!('user_workspace_id' in workspace)) {
    setCurrentWorkspaceMessageError('Cannot save the workspace. The workspace id was not found. (saveUserWorkspace)');
    setSaveCurrentWorkspaceWindowOpen(true);
    return;
  }

  let raven_config_save_url = '/user-workspaces/raven-configs/json/save/' + workspace.user_workspace_id;

  console.log('data to save: ' + JSON.stringify(workspace.raven_config))

  m.request({
      method: "POST",
      url: raven_config_save_url,
      data: {raven_config: workspace.raven_config}
  })
  .then(function(save_result) {
    console.log(save_result);
    if (save_result.success){
      setCurrentWorkspaceMessageSuccess('The workspace was saved!')
    } else {
      setCurrentWorkspaceMessageError('Failed to save the workspace. ' + save_result.message + ' (saveUserWorkspace)');
    }
    setSaveCurrentWorkspaceWindowOpen(true);
  })
};
/*
 * END: saveUserWorkspace
 */


 /*
 *  Variables related to API info window
 */
export let isAPIInfoWindowOpen = false;
// Open/close modal window
export let setAPIInfoWindowOpen = (boolVal) => isAPIInfoWindowOpen = boolVal;



// TA2 server information for display in modal
export let TA2ServerInfo = (TA2_SERVER !== undefined ) ? TA2_SERVER : '(TA2 unknown)';
export let setTA2ServerInfo = (infoStr) => TA2ServerInfo = infoStr;

/*
*  Variables related to saving a new user workspace
*/

// Name of Modal window
export let showModalSaveName = false;

/*
 * open/close the modal window
 */
export let setShowModalSaveName = (boolVal) => {
  showModalSaveName = boolVal;

  // Reset the modal window
  if (boolVal){
    // clear any workspace names in the input box
    setNewWorkspaceName('');

    // clear any user messages
    setNewWorkspaceMessageSuccess('');

    // show save/cancel buttons
    setDisplaySaveNameButtonRow(true);

    // hide close button
    setDisplayCloseButtonRow(false);
  }
}

// Display for the Cancel/Save button row
export let displaySaveNameButtonRow = true;
export let setDisplaySaveNameButtonRow = (boolVal) => {
  displaySaveNameButtonRow = boolVal;
};
// Display for the Close Modal success
export let displayCloseButtonRow = true;
export let setDisplayCloseButtonRow = (boolVal) => {
  displayCloseButtonRow = boolVal;
};

// set/get new workspace name
export let newWorkspaceName = '';
export let setNewWorkspaceName = (newName) => newWorkspaceName = newName;
export let getNewWorkspaceName = () => { return newWorkspaceName; };

// set/get user messages for new workspace
export let newWorkspaceMessage = '';
// success message
export let setNewWorkspaceMessageSuccess = (errMsg) => {
  newWorkspaceMessage = m('p', {class: 'text-success'}, errMsg);
};
// error message
export let setNewWorkspaceMessageError = (errMsg) => {
  newWorkspaceMessage = m('p', {class: 'text-danger'}, errMsg);
};
export let getnewWorkspaceMessage = () => { return newWorkspaceMessage; };

 /*
  *  saveAsNewWorkspace() save the current
  *  workspace as new one, with a new name.
  *    - placeholder with random name
  */
 export async function saveAsNewWorkspace(){
   console.log('-- saveAsNewWorkspace --');

   // hide save/cancel buttons
   setDisplaySaveNameButtonRow(false);

   // get the current workspace id
   if(!('user_workspace_id' in workspace)) {

     // show save/cancel buttons
     setDisplaySaveNameButtonRow(true);

     return {
             success: false,
             message: 'Cannot save the workspace. The workspace' +
                      ' id was not found. (saveAsNewWorkspace)'
            };
   }

   // new workspace name
   // let new_workspace_name = 'new_ws_' + Math.random().toString(36).substring(7);
   let new_workspace_name = getNewWorkspaceName();

   if (!new_workspace_name){

     // show save/cancel buttons
     setDisplaySaveNameButtonRow(true);

     setNewWorkspaceMessageError('Please enter a new workspace name.');
     return;
   }

   console.log('new_workspace_name: ' + new_workspace_name);

   // save url
   let raven_config_save_url = '/user-workspaces/raven-configs/json/save-as-new/' + workspace.user_workspace_id;

   await m.request({
       method: "POST",
       url: raven_config_save_url,
       data: {new_workspace_name: new_workspace_name,
              raven_config: workspace.raven_config}
   })
   .then(function(save_result) {
     console.log('save_result: ' + JSON.stringify(save_result.success));
      // Failed! show error and return
      if (!save_result.success){
         // show save/cancel buttons
         setDisplaySaveNameButtonRow(true);

         setNewWorkspaceMessageError(save_result.message);
         return;
      }

      /*
       * Success! Update the workspace data,
       *  but keep the datasetDoc
       */

      // point to the existing DatasetDoc
      let currentDatasetDoc = workspace.datasetDoc;

      // load the new workspace
      workspace = save_result.data;

      // attach the existing dataseDoc
      workspace.datasetDoc = currentDatasetDoc;


      setDatasetUrl().then((urlAvailable) => {

        if (!urlAvailable){
            // shouldn't reach here, setDatasetUrl adds failure modal
            // alertWarn('FAILED TO SET DATASET URL. Please check the logs.');
            setNewWorkspaceMessageError('An error occurred saving the new workspace.');
            setDisplayCloseButtonRow(true);

        } else {
            setNewWorkspaceMessageSuccess('The new workspace has been saved!');
            setDisplayCloseButtonRow(true);
        }
        m.redraw();
      })

   })
 };
 /*
  * END: saveAsNewWorkspace
  */


export let getSelectedProblem = () => {
    if (!workspace) return;
    let ravenConfig = workspace.raven_config;
    if (!ravenConfig) return;
    return ravenConfig.problems[ravenConfig.selectedProblem];
};
export let getResultsProblem = () => {
    if (!workspace) return;
    let ravenConfig = workspace.raven_config;
    if (!ravenConfig) return;
    return ravenConfig.problems[ravenConfig.resultsProblem];
};

/*
 *  Return the problem description--or autogenerate one
 */
export function getDescription(problem) {
    if (problem.description) return problem.description;
    let predictors = getPredictorVariables(problem);
    return `${problem.targets} is predicted by ${predictors.slice(0, -1).join(", ")} ${predictors.length > 1 ? 'and ' : ''}${predictors[predictors.length - 1]}`;
}

export let setTask = (task, problem) => {
    if (task === problem.task || !(supportedTasks.includes(task))) return;
    problem.task = task;
    if (task === 'classification' || task === 'semisupervisedClassification')
        setSubTask(variableSummaries[problem.targets[0]].binary === 'yes' ? 'binary' : 'multiClass', problem)
    else if (task === 'regression' || task === 'semisupervisedRegression')
        setSubTask(problem.predictors.length > 1 ? 'multivariate' : 'univariate', problem)
    else if (!(problem.subTask in applicableMetrics[task]))
        setSubTask(Object.keys(applicableMetrics[task])[0], problem)

    delete problem.unedited;
    // will trigger the call to solver, if a menu that needs that info is shown
    setSolverPending(true);
};

export let setSubTask = (subTask, problem) => {
    if (subTask === problem.subTask || !Object.keys(applicableMetrics[problem.task]).includes(subTask))
        return;
    problem.subTask = subTask;
    setMetric(applicableMetrics[problem.task][getSubtask(problem)][0], problem, true)

    delete problem.unedited;
    // will trigger the call to solver, if a menu that needs that info is shown
    setSolverPending(true);
};

export let getSubtask = problem => {
    if (['regression', 'semisupervisedRegression'].includes(problem.task)) return getPredictorVariables(problem).length > 1 ? 'multivariate' : 'univariate';
    return problem.subTask
};

export let setMetric = (metric, problem, all=false) => {
    if (metric === problem.metric || !applicableMetrics[problem.task][getSubtask(problem)].includes(metric))
        return;
    if (problem.metrics.includes(metric)) problem.metrics.push(problem.metric)
    problem.metric = metric;
    remove(problem.metrics, metric)

    if (all) problem.metrics = applicableMetrics[problem.task][getSubtask(problem)]
        .filter(elem => elem !== metric).sort()

    delete problem.unedited;
    // will trigger the call to solver, if a menu that needs that info is shown
    setSolverPending(true);
};

// get all predictors, including those that only have an arrow to a target
export let getPredictorVariables = problem => {
    let arrowPredictors = (problem.pebbleLinks || [])
        .filter(link => problem.targets.includes(link.target) && link.right)
        .map(link => link.source)

    // union arrow predictors with predictor group
    return [...new Set([...problem.predictors, ...arrowPredictors])]
};

export let getNominalVariables = problem => {
    let selectedProblem = problem || getSelectedProblem();
    return [...new Set([
        ...selectedProblem.tags.nominal,
        // targets in a classification problem are also nominal
        ...['classification', 'semisupervisedClassification'].includes(selectedProblem.task)
            ? selectedProblem.targets : []
    ])];
};

export let getTransformVariables = pipeline => pipeline.reduce((out, step) => {
    if (step.type !== 'transform') return out;

    step.transforms.forEach(transform => out.add(transform.name));
    step.expansions.forEach(expansion => queryMongo.expansionTerms(expansion).forEach(term => out.add(term)));
    step.binnings.forEach(binning => out.add(binning.name));
    step.manual.forEach(manual => out.add(manual.name));

    return out;
}, new Set());

export function setSelectedProblem(problemID) {
    let ravenConfig = workspace.raven_config;

    if (!problemID || ravenConfig.selectedProblem === problemID) return;
    ravenConfig.selectedProblem = problemID;
    let problem = getSelectedProblem();

    updateRightPanelWidth();

    // if a constraint is being staged, delete it
    manipulate.setConstraintMenu(undefined);

    let problemPipeline = [...ravenConfig.hardManipulations, ...problem.manipulations];
    let countMenu = {type: 'menu', metadata: {type: 'count'}};

    // update number of records
    manipulate.loadMenu(problemPipeline, countMenu)
        .then(manipulate.setTotalSubsetRecords)
        .then(m.redraw);

    // update preprocess
    buildProblemPreprocess(ravenConfig, problem)
        .then(setVariableSummaries)
        .then(m.redraw);

    resetPeek();

    // will trigger the call to solver, if a menu that needs that info is shown
    setSolverPending(true);
}

export function setResultsProblem(problemID) {
    workspace.raven_config.resultsProblem = problemID;
}

export function getProblemCopy(problemSource) {
    // deep copy of original
    return Object.assign($.extend(true, {}, problemSource), {
        problemID: generateProblemID(),
        provenanceID: problemSource.problemID,
        unedited: true,
        pending: true,
        system: 'user'
    });
}

export let setCheckedDiscoveryProblem = (status, problemID) => {
    let ravenConfig = workspace.raven_config;
    if (problemID)
        ravenConfig.problems[problemID].meaningful = status;
    else
        Object.keys(ravenConfig.problems)
            .forEach(problemID => ravenConfig.problems[problemID].meaningful = status)
};


/**
 * handleMaterializeDataMessage()
 *  - Processes a websocket message based on clicking Datamart "Preview"
 *  - On success, displays a modal window with a preview of the data.
 *  - Example of successful response:
 *  {
       "msg_type":"DATAMART_MATERIALIZE_PROCESS",
       "timestamp":"2019-03-12T10:50:06",
       "success":true,
       "user_message":"The dataset has been materialized",
       "data":{
          "datamart_id":"287260000",
          "data_path":"/ravens_volume/test_output/185_baseball/additional_inputs/materialize/287260000/materialize/learningData.csv",
          "filesize":2114303,
          "metadata_path":null,
          "data_preview":"source,subject_label,category,prop_value,value_label\nhttp://www.wikidata.org/entity/Q5661707,Harold McCarthy,human,http://www.wikidata.org/entity/Q82133,Bodleian Library
          human,http://www.wikidata.org/entity/Q148554,National Museum of Natural History\n [TRUNCATED - GIVES UP TO 100 PREVIEW ROWS]",
      "metadata":null
       }
    }
 */
export function handleMaterializeDataMessage(msg_data){

  if (!msg_data) {
      console.log('handleMaterializeDataMessage: Error.  "msg_data" undefined');
      return;
  }
  if (msg_data.success === false) {
    setModal("Data preview error: " + msg_data.user_message,
             "Data materialization Failed", true, "Close", true);
    return;
  }

  console.log('datamart_id: ' + msg_data.data.datamart_id);
  console.log('filesize: ' + msg_data.data.filesize);

  // Save the data in the datamartPreferences object
  //
  const previewDatamartId = msg_data.data.datamart_id;
  datamartPreferences.cached[previewDatamartId] = msg_data.data;

  // Format the data_preview
  //
  datamartPreferences.cached[previewDatamartId].data_preview =   datamartPreferences.cached[previewDatamartId].data_preview.split('\n').map(line => line.split(','));

  // Set the modal type
  datamartPreferences.modalShown = 'preview';

  // Set user message
  const userMsg = 'File preview complete.'
  datamartPreferences.success[msg_data.data.source_mode] = userMsg;

  // Refresh the display
  m.redraw();


} // end handleMaterializeDataMessage


/**
 *  After a search by dataset:
 *  - Display the results on the Datamart
 */
 export async function handleSearchbyDataset(msg_data){

     if (!msg_data) {
         console.log('handleAugmentDataMessage: Error.  "msg_data" undefined');
         return;
     }
     console.log('handleSearchbyDataset!!!');
     console.log(JSON.stringify(msg_data));

     // Need datamart name, even if an error
     //
     let datamartName = msg_data.data.datamart_name;


    if (msg_data.success){
        let response_info = {
                              success: true,
                              data: msg_data.data.search_results
                            }
      datamartPreferences.handleSearchResults(datamartName, response_info);
    } else{
      datamartPreferences.handleSearchResults(datamartName, msg_data);
    }
} // end: handleSearchbyDataset

/**
 *  After an augment:
 *  - Load the new workspace
 *  - Move the old selected problem manipulations to hardManipulations
 *  - Set the old selected problem as the new selected problem (sans manipulations)
 */
export async function handleAugmentDataMessage(msg_data){

  if (!msg_data) {
      console.log('handleAugmentDataMessage: Error.  "msg_data" undefined');
      return;
  }

  // Hide the modal
  datamartPreferences.modalShown = undefined;
  datamartPreferences.isAugmenting = false;

  if (msg_data.success === false) {
    setModal("Error: " + msg_data.user_message,
             "Data Augmentation Failed", true, "Close", true);
    return;
  }

  setModal("Success: " + msg_data.user_message,
           "Data Augmentation Succeeded!", true, "Switch to augmented dataset", false, () => {

      /*
      setModal(undefined, undefined, false)
      load()
      */
      setModal(undefined, undefined, false)

      // (1) Copy the current selected problem
      //
      let tempSelectedProblem = common.deepCopy(workspace.raven_config.problems[workspace.raven_config.selectedProblem]);

      // (2) clear current problems
      //
      workspace.raven_config.problems = {};

      // (2) load the new workspace
      //
      let ws_obj = JSON.parse(msg_data.data.workspace_json_string);
      console.log('--- 2a new workspace: ' + JSON.stringify(ws_obj));

      loadWorkspace(ws_obj).then(() => {

          // (3) update new workspace manipulations
          //

          // - Copy manipulations from the orig selected problem to the
          // workspace's hardManipulations.
          // - Clear the orig. selected problem manipulations
          workspace.raven_config.priorManipulations = common.deepCopy(tempSelectedProblem.manipulations);
          tempSelectedProblem.manipulations = [];

          console.log('--- 4 workspace.hardManipulations: ' + JSON.stringify(workspace.raven_config.hardManipulations));

          // (4) update ids of the orig selected problem to avoid clashes
          //
          tempSelectedProblem.problemID = generateProblemID();
          if ('provenanceID' in tempSelectedProblem){
            delete tempSelectedProblem.provenanceID;
          }
          // (5) add the old problem to the current problems list
          //    and make it the selected problem
          //
          workspace.raven_config.problems[tempSelectedProblem.problemID] = tempSelectedProblem;

          setSelectedProblem(tempSelectedProblem.problemID);
      })
  });


  // console.log('datamart_id: ' + msg_data.data.datamart_id);
  // console.log('filesize: ' + msg_data.data.filesize);

} // end: handleAugmentDataMessage


// pretty precision formatting- null and undefined are NaN, attempt to parse strings to float
// if valid number, returns a Number at less than or equal to precision (trailing decimal zeros are ignored)
export function formatPrecision(value, precision=4) {
    if (value === null) return NaN;
    let numeric = value * 1;
    if (isNaN(numeric)) return value;

    // determine number of digits in value
    let digits = Math.max(Math.floor(Math.log10(Math.abs(Number(String(numeric).replace(/[^0-9]/g, ''))))), 0) + 1;

    return (digits <= precision || precision === 0) ? numeric : numeric.toPrecision(precision) * 1
}

let generateProblemID = () => 'problem ' + workspace.raven_config.problemCount++;

// generate a number from text (cheap hash)
export let generateID = text => Array.from({length: text.length})
    .reduce((hash, _, i) => ((hash << 5) - hash + text.charCodeAt(i)) | 0, 0);

export let omniSort = (a, b) => {
    if (a === undefined && b !== undefined) return -1;
    if (b === undefined && a !== undefined) return 1;
    if (a === b) return 0;
    if (typeof a === 'number') return a - b;
    if (typeof a === 'string') return  a.localeCompare(b);
    return (a < b) ? -1 : 1;
};


export function melt(data, factors, value="value", variable="variable") {
    factors = new Set(factors);
    let outData = [];
    data.forEach(record => {
        let UID = [...factors].reduce((out, idx) => {
            out[idx] = record[idx];
            return out;
        }, {});

        Object.keys(record)
            .filter(key => !factors.has(key))
            .forEach(idxMelted => outData.push(Object.assign(
                {}, UID,
                {[variable]: idxMelted, [value]: record[idxMelted]})))
    });
    return outData;
}
