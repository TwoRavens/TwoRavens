/*
  Main TwoRavens mithril app
*/
import hopscotch from 'hopscotch';
import m from 'mithril';
window.m = m;

import $ from 'jquery';
import * as d3 from 'd3';

// polyfill for flatmap (could potentially be included as a webpack entrypoint)
import "core-js/fn/array/flat-map";

import * as common from "../common/common";

import {locationReload, setModal} from '../common/views/Modal';

import * as queryMongo from "./manipulations/queryMongo";
import * as solverD3M from './solvers/d3m';
import * as solverWrapped from './solvers/wrapped';

import * as model from './model';
import * as manipulate from './manipulations/manipulate';
import * as results from "./results";
import * as explore from './explore';
import {bold, linkURLwithText, linkURL, link} from "./index";
import {getClearWorkspacesLink, clearWorkpacesAndReloadPage} from "./utils";

import * as datamart from './datamart/Datamart';

//-------------------------------------------------
// NOTE: global variables are now set in the index.html file.
//    Developers, see /template/index.html
//-------------------------------------------------

let RAVEN_CONFIG_VERSION = 1;

export let TA2DebugMode = false;
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

  let logParams = {feature_id: 'PEEK',
                   activity_l1: 'DATA_PREPARATION',
                   activity_l2: 'DATA_EXPLORATION'};
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

export let downloadFile = async (datasetUrl, contentType) => {
    console.log(datasetUrl);
    if (!datasetUrl) return;
    let data = {data_pointer: datasetUrl};
    if (contentType) data['content_type'] = contentType;
    let downloadUrl = D3M_SVC_URL + '/download-file?' + m.buildQueryString(data);

    console.warn('Download URL');
    console.log(downloadUrl);

    let link = document.createElement("a");
    link.setAttribute("href", downloadUrl);
    link.setAttribute("download", datasetUrl.split('/').slice(-1));
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

// when set, solver will be called if results menu is active
export let solverPending = false;
export let setSolverPending = state => solverPending = state;

export let taskPreferences = {
    isDiscoveryClicked: false,
    isSubmittingProblems: false,
    task1_finished: false,

    isResultsClicked: false,
    isSubmittingPipelines: false,
    task2_finished: false
};

export let currentMode;
export let is_model_mode = true;
export let is_explore_mode = false;
export let is_results_mode = false;
export let is_manipulate_mode = false;

export function setSelectedMode(mode) {
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
                      feature_id: mode.toUpperCase() + '_MODE_SWITCH',
                      activity_l2: 'SWITCH_MODE'
                    };
    if (is_model_mode){ logParams.activity_l1 = 'PROBLEM_DEFINITION'};
    if (is_explore_mode){ logParams.activity_l1 = 'DATA_PREPARATION'};
    if (is_results_mode){ logParams.activity_l1 = 'MODEL_SELECTION'};
    if (is_manipulate_mode){ logParams.activity_l1 = 'DATA_PREPARATION'};

    saveSystemLogEntry(logParams);


    if (currentMode !== mode) {
        if (is_results_mode) {
            taskPreferences.isResultsClicked = true;
            let selectedProblem = getSelectedProblem();

            // a solved problem, and its copy, are not pending
            selectedProblem.pending = false;

            let copiedProblem = getProblemCopy(selectedProblem);

            workspace.raven_config.problems[copiedProblem.problemID] = copiedProblem;

            // denote as solved problem
            if (!selectedProblem.solverState)
                selectedProblem.solverState = {};
            selectedProblem.system = 'solved';

            if (!results.resultsPreferences.dataSplit)
                results.resultsPreferences.dataSplit = 'test';

            if (results.resultsPreferences.dataSplit !== 'all' && !selectedProblem.splitOptions.outOfSampleSplit)
                results.resultsPreferences.dataSplit = 'all';
        }

        if (is_model_mode && manipulate.pendingHardManipulation) {
            let ravenConfig = workspace.raven_config;
            buildDatasetPreprocess().then(response => {
                if (!response.success) alertLog(response.message);
                else {
                    // setVariableSummaries(response.data.variables);
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

    // cause the peek table to redraw
    resetPeek();
}

export let buildDatasetPreprocess = () => getPreprocess(
    JSON.stringify(queryMongo.buildPipeline(
        workspace.raven_config.hardManipulations,
        workspace.raven_config.variablesInitial)['pipeline']));

export let buildProblemPreprocess = problem => getPreprocess(JSON.stringify(queryMongo.buildPipeline(
    [...workspace.raven_config.hardManipulations, ...problem.manipulations, {
        type: 'menu',
        metadata: {type: 'data', nominal: getNominalVariables(problem), sample: 5000}
    }],
    workspace.raven_config.variablesInitial)['pipeline']));


export async function buildDatasetUrl(problem, lastStep, dataPath, collectionName) {

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

    let body = {
        method: 'aggregate',
        query: JSON.stringify(compiled),
        export: 'csv'
    };

    if (dataPath) body.datafile = dataPath;
    if (collectionName) body.collection_name = collectionName;
    return await getData(body);
}

export async function buildProblemUrl(problem, lastStep, dataPath, collectionName) {

    let steps = [
        ...workspace.raven_config.hardManipulations,
        ...problem.manipulations,
    ];
    if (lastStep) steps = steps.slice(0, steps.indexOf(lastStep));

    let variables = ['d3mIndex', ...getPredictorVariables(problem), ...problem.targets];
    let abstractPipeline = [
        ...steps,
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

    let body = {
        method: 'aggregate',
        query: JSON.stringify(compiled),
        export: 'dataset',
        metadata: JSON.stringify(metadata)
    };

    if (dataPath) body.datafile = dataPath;
    if (collectionName) body.collection_name = collectionName;
    return await getData(body);
}

let getDataPromise;
export let getData = async body => {
    if (getDataPromise) await getDataPromise;
    getDataPromise = m.request({
        url: mongoURL + 'get-data',
        method: 'POST',
        body: Object.assign({
            datafile: workspace.datasetPath, // location of the dataset csv
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
    return getDataPromise;
};


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
        body: logData
    })
    .then(function(save_result) {
        if (save_result.success){
          // console.log('log entry saved');
        } else {
          console.log('log entry FAILED: ' + save_result.message);
        }
    })
};

// for debugging - if not in PRODUCTION, prints args
export let cdb = _ => PRODUCTION || console.log(_);

export let k = 4; // strength parameter for group attraction/repulsion
export let tutorial_mode = localStorage.getItem('tutorial_mode') !== 'false';

export let LEFT_TAB_NAME_VARIABLES = 'Variables';
export let LEFT_TAB_NAME_DISCOVER = 'Discover';
export let LEFT_TAB_NAME_AUGMENT = 'Augment';

export let leftTab = LEFT_TAB_NAME_VARIABLES; // current tab in left panel
export let leftTabHidden = LEFT_TAB_NAME_VARIABLES; // stores the tab user was in before summary hover

export let rightTab = 'Problem'; // current tab in right panel

export let setRightTab = tab => {
    rightTab = tab;
    updateRightPanelWidth();
    setFocusedPanel('right')
};

/*
  Model Mode
  - Set the Left Tab: Variables | Discover | Augment
  call with a tab name to change the left tab in model mode
*/
export let setLeftTab = (tabName) => {
    leftTab = tabName;
    updateLeftPanelWidth();

    // behavioral logging
    let logParams = {
        feature_id: 'VIEW_' + tabName.toUpperCase(),
        activity_l1: 'DATA_PREPARATION',
        activity_l2: 'PROBLEM_DEFINITION',
    };
    saveSystemLogEntry(logParams);

    if (tabName === LEFT_TAB_NAME_DISCOVER) taskPreferences.isDiscoveryClicked = true;
    explore.setExploreVariate(tabName === LEFT_TAB_NAME_DISCOVER ? 'Problem' : 'Univariate');
    setFocusedPanel('left');

    if (tabName === LEFT_TAB_NAME_DISCOVER && !taskPreferences.task1_finished)
        setTimeout(() => hopscotch.startTour(task1Tour), 100);
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
function connectWebsocket() {
    let ws = null;

    function start() {

        try {
            ws = new WebSocket(wsLink);
        } catch (err) {
            console.log('Cannot connect to streamSocket:', wsLink)
        }
        ws.onopen = function () {
            console.log('Connected to streamSocket:', wsLink);
        };
        ws.onmessage = websocketMessage;
        ws.onclose = function () {
            console.log('Attempting reconnect to streamSocket:', wsLink);
            check();
        };
    }

    function check() {
        if (!ws || ws.readyState === 3) start();
    }

    start();

    setInterval(check, 10000);
}

document.addEventListener("DOMContentLoaded", connectWebsocket);
export let streamMsgCnt = 0;
//  messages received.
//
function websocketMessage(e) {
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

    console.groupCollapsed(`WS: ${msg_data.msg_type || 'unknown'}`);

    try {
        console.log(msg_data);
        if (msg_data.msg_type === 'receive_describe_msg')
            solverWrapped.handleDescribeResponse(msg_data);
        else if (msg_data.msg_type === 'receive_score_msg')
            solverWrapped.handleScoreResponse(msg_data);
        else if (msg_data.msg_type === 'receive_produce_msg')
            solverWrapped.handleProduceResponse(msg_data);
        else if (msg_data.msg_type === 'receive_solve_msg')
            solverWrapped.handleSolveCompleteResponse(msg_data);

        else if (msg_data.data === undefined && msg_data.msg_type !== 'DATAMART_AUGMENT_PROCESS') {
            debugLog('streamSocket.onmessage: Error, "msg_data.data" type not specified!');
            debugLog('full data: ' + JSON.stringify(msg_data));
            debugLog('---------------------------------------------');
        }

        else if (msg_data.msg_type === 'GetSearchSolutionsResults') {
            debugLog(msg_data.msg_type + ' recognized!');
            solverD3M.handleGetSearchSolutionResultsResponse(msg_data.data);
        } else if (msg_data.msg_type === 'DescribeSolution') {
            debugLog(msg_data.msg_type + ' recognized!');
            solverD3M.handleDescribeSolutionResponse(msg_data.data);
        } else if (msg_data.msg_type === 'GetScoreSolutionResults') {
            debugLog(msg_data.msg_type + ' recognized!');
            solverD3M.handleGetScoreSolutionResultsResponse(msg_data.data);
        } else if (msg_data.msg_type === 'GetProduceSolutionResults') {
            debugLog(msg_data.msg_type + ' recognized!');
            solverD3M.handleGetProduceSolutionResultsResponse(msg_data.data);
        } else if (msg_data.msg_type === 'GetFitSolutionResults') {
            debugLog(msg_data.msg_type + ' recognized!');
            debugLog('No handler: Currently not using GetFitSolutionResultsResponse...');
        } else if (msg_data.msg_type === 'ENDGetSearchSolutionsResults') {
            debugLog(msg_data.msg_type + ' recognized!');
            solverD3M.handleENDGetSearchSolutionsResults(msg_data.data);
        } else if (msg_data.msg_type === 'DATAMART_MATERIALIZE_PROCESS') {
            debugLog(msg_data.msg_type + ' recognized!');
            handleMaterializeDataMessage(msg_data);
        } else if (msg_data.msg_type === 'DATAMART_AUGMENT_PROCESS') {
            debugLog(msg_data.msg_type + ' recognized!');
            handleAugmentDataMessage(msg_data);
        } else if (msg_data.msg_type === 'DATAMART_SEARCH_BY_DATASET') {
            debugLog(msg_data.msg_type + ' recognized!');
            handleSearchbyDataset(msg_data);
        } else {
            console.log('streamSocket.onmessage: Error, Unknown message type: ' + msg_data.msg_type);
        }
    } finally {
        console.groupEnd();
    }
}
//-------------------------------------------------

// when set, a problem's Task, Subtask and Metric may not be edited
export let lockToggle = true;
export let setLockToggle = state => {
    if (state && selectedProblem.system === 'solved') hopscotch.startTour(lockTour());
    else {
        hopscotch.endTour(true);
        lockToggle = state;
    }
};
export let isLocked = problem => lockToggle || problem.system === 'solved';

export let priv = true;

// if no columns in the datasetDoc, swandive is enabled
// swandive set to true if task is in failset
export let swandive = false;

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
      keywords: []
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

datamart.setDefaultPreferences(datamartPreferences);

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
    semiSupervisedClassification: "SEMISUPERVISED_CLASSIFICATION",
    semiSupervisedRegression: "SEMISUPERVISED_REGRESSION",
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


export let d3mMetricDomains = {
    accuracy: [0, 1],
    precision: [0, 1],
    recall: [0, 1],
    f1: [0, 1],
    f1Micro: [0, 1],
    f1Macro: [0, 1],
    rocAuc: [0, 1],
    rocAucMicro: [0, 1],
    rocAucMacro: [0, 1],
    meanSquaredError: undefined,
    rootMeanSquaredError: undefined,
    meanAbsoluteError: undefined,
    rSquared: [0, 1],
    normalizedMutualInformation: [0, 1],
    jaccardSimilarityScore: [0, 1],
    precisionAtTopK: [0, 1],
    objectDetectionAveragePrecision: [0, 1],
    hammingLoss: undefined,
    rank: undefined,
    loss: undefined,
};


export let d3mMetricsInverted = Object.keys(d3mMetrics)
    .reduce((out, key) => Object.assign(out, {[d3mMetrics[key]]: key}), {});

export let d3mEvaluationMethods = {
    holdOut: "HOLDOUT",
    kFold: "K_FOLD"
};

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
    semiSupervisedClassification: {
        binary: ['accuracy', 'precision', 'recall', 'f1', 'rocAuc'],
        multiClass: ['accuracy', 'f1Micro', 'f1Macro', 'rocAucMicro', 'rocAucMacro', 'jaccardSimilarityScore'],
        multiLabel: ['accuracy', 'f1Micro', 'f1Macro', 'rocAucMacro', 'jaccardSimilarityScore', 'hammingLoss']
    },
    semiSupervisedRegression: {
        univariate: ['meanAbsoluteError', 'meanSquaredError', 'rootMeanSquaredError', 'rSquared'],
        multivariate: ['meanAbsoluteError', 'meanSquaredError', 'rootMeanSquaredError', 'rSquared']
    }
};

export let modelResults = {};


export let byId = id => document.getElementById(id);
// export let byId = id => {console.log(id); return document.getElementById(id);}

export const reset = async function reloadPage() {
    solverD3M.endAllSearches();
    location.reload();
};

export let step = (target, placement, title, content, options={}) => Object.assign({
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
}, options);

export let initialTour = () => ({
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


export let task1Tour = {
    id: "dataset_launch",
    i18n: {doneBtn:'Ok'},
    showCloseButton: true,
    scrollDuration: 300,
    steps: [
        step("discoveryTableSelectedProblem", "right", "Mark Problems as Meaningful",
            `<p>Check problems that you consider meaningful.</p>
                     <p>Generally, as a tip, the Green button is the next button you need to press to move the current task forward.</p>`),
        step("btnSubmitDisc", "right", "Complete Task 1",
             `<p>This submission button marks Task 1 - Problem Discovery, as complete.</p>
                     <p>Click this button to save the check marked problems in the table below as potentially interesting or relevant.</p>`,
            {onShow: () => document.getElementById('btnSubmitDisc').scrollIntoView()}),
    ]
};

// appears when a user attempts to edit when the toggle is set
export let lockTour = () => ({
    id: "lock_toggle",
    i18n: {doneBtn:'Ok'},
    showCloseButton: true,
    scrollDuration: 300,
    steps: [
        step("btnLock", "left", "Locked Mode", `<p>Click the lock button to enable editing.</p>`)
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

export let workspace = {
    datasetPath: '/home/shoe/TwoRavens/ravens_volume/test_data/196_autoMpg/TRAIN/dataset_TRAIN/tables/learningData.csv',
    d3m_config: {name: 'autompg'}
};

export let getCurrentWorkspaceName = () => {
    return (workspace || {}).name || '(no workspace name)';
};
export let getCurrentWorkspaceId = () => {
  return (workspace || {}).user_workspace_id || '(no id)';
  //return (workspace === undefined || workspace.user_workspace_id === undefined) ? '(no id)' : workspace.user_workspace_id;
};

export let setShowModalWorkspace = state => showModalWorkspace = state;
export let showModalWorkspace = false;

let getDatasetDoc = async dataset_schema_url => {

    let datasetDocInfo = await m.request(dataset_schema_url);

    if (!datasetDocInfo.success) {
        let datasetDocFailMsg = 'D3M WARNING: No dataset doc available! ';
        swandive = true;
        console.log(datasetDocFailMsg);
        // alertWarn(datasetDocFailMsg);

        let datasetDocLink = window.location.origin + dataset_schema_url;

        setModal(m('div', {}, [
                m('p', datasetDocFailMsg),
                m('p', 'Please try to ', linkURLwithText(getClearWorkspacesLink(), 'Reset Workspaces')),
                  //' or ', linkURLwithText(window.location.origin, 'Reload the Page')),
                m('hr'),
                m('p', bold('Technical info. Error: '), datasetDocInfo.message),
                m('p', 'Url: ', link(datasetDocLink))            ]),
            "Failed to load datasetDoc.json!",
            true,
            "Reset Workspaces",
            false,
            clearWorkpacesAndReloadPage);
        return;
    }

    let datadocument_columns = (datasetDocInfo.data.dataResources.find(resource => resource.columns) || {}).columns;
    if (datadocument_columns === undefined) {
        console.log('D3M WARNING: datadocument.dataResources[x].columns is undefined.');
        swandive = true;
    }

    if (swandive)
        alertWarn('Exceptional data detected.  Please check the logs for "D3M WARNING"');

    return datasetDocInfo.data;
};

let buildDefaultProblem = problemDoc => {

    console.log('problemDoc', problemDoc);
    // create the default problem provided by d3m
    let targets = problemDoc.inputs.data
        .flatMap(source => source.targets.map(targ => targ.colName));

    let predictors = swandive
        ? Object.keys(variableSummaries)
            .filter(column => column !== 'd3mIndex' && !targets.includes(column))
        : workspace.datasetDoc.dataResources // if swandive false, then datadoc has column labeling
            .filter(resource => resource.resType === 'table')
            .flatMap(resource => resource.columns
                .filter(column => !column.role.includes('index') && !targets.includes(column.colName))
                .map(column => column.colName));

    if (!problemDoc.inputs.dataSplits)
        problemDoc.inputs.dataSplits = {};

    // defaultProblem
    return {
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

        splitOptions: Object.assign({
            outOfSampleSplit: true,
            // evaluationMethod can only be holdOut
            trainTestRatio: problemDoc.inputs.dataSplits.testSize || 0.35,
            stratified: problemDoc.inputs.dataSplits.stratified,
            shuffle: problemDoc.inputs.dataSplits.shuffle,
            randomSeed: problemDoc.inputs.dataSplits.randomSeed,
            splitsFile: undefined,
            splitsDir: undefined,
        }, problemDoc.splitOptions || {}),

        searchOptions: Object.assign({
            timeBoundSearch: undefined,
            timeBoundRun: undefined,
            priority: undefined,
            solutionsLimit: undefined
        },problemDoc.searchOptions || {}),

        scoreOptions: {
            evaluationMethod: problemDoc.inputs.dataSplits.method || 'kFold',
            folds: problemDoc.inputs.dataSplits.folds || 10,
            trainTestRatio: problemDoc.inputs.dataSplits.testSize || 0.35,
            stratified: problemDoc.inputs.dataSplits.stratified,
            shuffle: problemDoc.inputs.dataSplits.shuffle,
            randomSeed: problemDoc.inputs.dataSplits.randomSeed,
            splitsFile: problemDoc.inputs.dataSplits.splitsFile
        },

        meaningful: false,
        manipulations: [],
        solutions: {},
        selectedSource: undefined,
        selectedSolutions: {},
        tags: {
            transformed: [],
            weights: [], // singleton list
            crossSection: [],
            time: swandive ? [] : workspace.datasetDoc.dataResources // if swandive false, then datadoc has column labeling
                .filter(resource => resource.resType === 'table')
                .flatMap(resource => resource.columns
                    .filter(column => column.role.includes('timeIndicator') || column.colType === 'dateTime')
                    .map(column => column.colName)),
            nominal: [],
            loose: [] // variables displayed in the force diagram, but not in any groups
        }
    };
};

/*
 * Set the workspace.datasetUrl using the workspace's d3m_config
 *  - e.g. workspace.d3m_config.problem_data_info
 *    - example of url in variable above
 *        - /config/d3m-config/get-problem-data-file-info/39
 */
let getDatasetPath = async problem_data_info => {

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


    console.log("-- getDatasetPath --");
    //url example: /config/d3m-config/get-problem-data-file-info/39
    //
    let problem_info_result = await m.request(problem_data_info);

    if (!problem_info_result.success) {
        showDatasetUrlFailModal('Error: ' + problem_info_result.message);

        return;
    }

    if (!('source_data_path' in problem_info_result.data)) {
        console.log('Severe error.  Not able to load the datasetPath. (p2)' +
            ' (url: ' + problem_data_info + ')' +
            ' Invalid data: ' + JSON.stringify(problem_info_result));

        showDatasetUrlFailModal('Invalid data: ' + JSON.stringify(problem_info_result));

        return;
    }

    if (!problem_info_result.data.source_data_path) {
        console.log('Severe error.  Not able to load the datasetPath. (p2)' +
            ' (url: ' + problem_data_info + ')');

        showDatasetUrlFailModal('(url: ' + problem_data_info + ')');

        return;
    }

    return problem_info_result.data.source_data_path;
};

export let getPreprocess = async query => {
    let datasetPath = query ? await getData({
        method: 'aggregate', query,
        export: 'csv'
    }) : workspace.raven_config.datasetPath;

    let response = await m.request({
        method: 'POST',
        url: ROOK_SVC_URL + 'preprocess.app',
        body: {
            data: datasetPath,
            datastub: workspace.d3m_config.name,
            l1_activity: 'PROBLEM_DEFINITION',
            l2_activity: 'PROBLEM_SPECIFICATION'
        }
    });

    if (!response.success) alertError(response.message);
    else return response.data;
};

export let loadWorkspace = async (newWorkspace, awaitPreprocess=false) => {

    workspace = newWorkspace;
    // useful for debugging
    window.workspace = workspace;

    d3.select("title").html("TwoRavens " + workspace.d3m_config.name);

    if (DISPLAY_DATAMART_UI){
      setTimeout(() => datamart.search(datamartPreferences, datamartURL).then(m.redraw), 1000);
    }

    let newRavenConfig = workspace.raven_config === null;
    if (newRavenConfig) workspace.raven_config = {
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

    let manipulations = newRavenConfig ? [] : [
        ...workspace.raven_config.hardManipulations,
        ...getSelectedProblem().manipulations
    ];

    // ~~~~ BEGIN PROMISE GRAPH ~~~~

    // DATASET PATH
    let promiseDatasetPath = getDatasetPath(workspace.d3m_config.problem_data_info)
        .then(datasetPath => {
            if (!datasetPath && IS_D3M_DOMAIN) throw "datasetPath not loaded";
            workspace.datasetPath = datasetPath;
        })
        .then(m.redraw);

    // DATASET DOC
    let promiseDatasetDoc = getDatasetDoc(workspace.d3m_config.dataset_schema_url)
        .then(datasetDoc => {
            workspace.datasetDoc = datasetDoc;

            let resourceTable = datasetDoc.dataResources
                .find(resource => resource.resType === 'table');
            if (!resourceTable) return;

            // store the resourceId of the table being used in the raven_config (must persist)
            workspace.raven_config.resourceId = resourceTable.resID;

            if ('columns' in resourceTable) {
                workspace.raven_config.variablesInitial = resourceTable.columns
                    .sort((a, b) => omniSort(a.colIndex, b.colIndex))
                    .map(column => column.colName);
                setVariableSummaries(resourceTable.columns.reduce((summaries, columnSchema) => Object.assign(summaries, {
                    [columnSchema.colName]: {
                        name: columnSchema.colName,
                        nature: {categorical: 'nominal', integer: 'ordinal', real: 'ordinal'}[columnSchema.colType],
                    }
                }), {}))
            }
            // TODO: endpoint to retrieve column names if columns not present in datasetDoc
            else swandive = true;
        })
        .then(m.redraw);

    // MONGO LOAD / SAMPLE DATASET PATH
    let promiseSampledDatasetPath = Promise.all([promiseDatasetDoc, promiseDatasetPath])
        .then(() => getData({
            method: 'aggregate',
            query: JSON.stringify(queryMongo.buildPipeline([
                ...manipulations, {type: 'menu', metadata: {type: 'data', sample: 5000}}
            ], workspace.raven_config.variablesInitial)['pipeline']),

            export: 'csv'
        }));

    // PREPROCESS
    let promisePreprocess = promiseSampledDatasetPath
        .then(sampledDatasetPath => m.request(ROOK_SVC_URL + 'preprocess.app', {
            method: 'POST',
            body: {data: sampledDatasetPath, datastub: workspace.d3m_config.name}
        }))
        .then(response => {
            if (!response.success) alertError(response.message);
            else return response.data;
        })
        .then(preprocess => {
            if (!preprocess) return;
            // setVariableSummaries(preprocess.variables);
            setDatasetSummary(preprocess.dataset);

            if (newRavenConfig) {
                // go back and add tags to original problems
                let nominals = Object.keys(variableSummaries)
                    .filter(variable => variableSummaries[variable].nature === 'nominal');
                Object.values(workspace.raven_config.problems)
                    .forEach(problem => problem.tags.nominal = nominals);
            }
        })
        .then(m.redraw)
        .catch(err => {
            console.error(err);
            setModal(m('div', m('p', "Preprocess failed."),
                m('p', '(p: 2)')),
                "Failed to load basic data.",
                true,
                "Reload Page",
                false,
                locationReload);
            throw err;
        });

    // DISCOVERY
    let promiseDiscovery = promiseSampledDatasetPath
        .then(sampledDatasetPath => m.request(ROOK_SVC_URL + 'discovery.app', {
            method: 'POST',
            body: {path: sampledDatasetPath}
        }))
        .then(response => {
            if (!response.success) {
                console.warn(response.message);
                return;
            }
            // merge discovery into problem set if constructing a new raven config
            promisePreprocess.then(_ => Object.assign(workspace.raven_config.problems, discovery(response.data)))
        });

    // RECORD COUNT
    // wait until after sampling returns, because dataset is loaded into mongo
    promiseSampledDatasetPath
        .then(() => manipulate.loadMenu(manipulations,
            {type: 'menu', metadata: {type: 'count'}}))
        .then(count => {
            manipulate.setTotalSubsetRecords(count);
            m.redraw();
        });

    // PEEK
    // wait briefly before running peek, to ensure a few observations are loaded in the dataset
    Promise.all([promiseDatasetDoc, promiseDatasetPath])
        .then(() => new Promise(resolve => setTimeout(() => resolve(), 1000)))
        .then(() => {
            resetPeek();
            // will trigger further mongo calls if the secondary peek page is open
            localStorage.setItem('peekHeader' + peekId, "TwoRavens " + workspace.d3m_config.name);
        });

    // PROBLEM DOC
    let promiseProblemDoc = promiseDatasetDoc
        .then(() => m.request(workspace.d3m_config.problem_schema_url))
        .then(async response => {
            // problem doc not supplied, so set the first discovered problem as selected, once preprocess loaded
            if (!response.success) {
                if (!newRavenConfig) return;
                await promisePreprocess;

                if (Object.keys(workspace.raven_config.problems).length === 0) {
                    let problemID = generateProblemID();
                    workspace.raven_config.problems = {
                        [problemID]: {
                            problemID,
                            system: 'auto',
                            predictors: [],
                            targets: [],
                            description: '',
                            metric: undefined,
                            metrics: [],
                            task: 'regression',
                            subTask: 'univariate',

                            splitOptions: {
                                outOfSampleSplit: true,
                                trainTestRatio: 0.35,
                                stratified: false,
                                shuffle: true,
                                randomSeed: undefined,
                                splitsFile: undefined,
                                splitsDir: undefined,
                            },
                            searchOptions: {
                                timeBoundSearch: undefined,
                                timeBoundRun: undefined,
                                priority: undefined,
                                solutionsLimit: undefined
                            },
                            scoreOptions: {
                                evaluationMethod: 'kFold',
                                folds: 10,
                                trainTestRatio: 0.35,
                                stratified: false,
                                shuffle: true,
                                randomSeed: undefined,
                                splitsFile: undefined,
                            },

                            meaningful: false,
                            manipulations: [],
                            solutions: {},
                            selectedSource: undefined,
                            selectedSolutions: {},
                            tags: {
                                transformed: [],
                                weights: [], // singleton list
                                crossSection: [],
                                time: [],
                                nominal: [],
                                loose: [] // variables displayed in the force diagram, but not in any groups
                            }
                        }
                    };
                }

                let problemFirst = Object.values(workspace.raven_config.problems)[0];
                let problemCopy = getProblemCopy(problemFirst);
                workspace.raven_config.problems[problemCopy.problemID] = problemCopy;
                setSelectedProblem(problemCopy.problemID);

                console.log('Task 1: Initiating');
                m.redraw();
                return;
            }

            console.log('Task 1: Complete, problemDoc loaded');

            taskPreferences.task1_finished = true;
            let problemDoc = response.data;
            datamartPreferences.hints = problemDoc.dataAugmentation;

            if (newRavenConfig) {
                // if swandive, columns cannot be extracted from datasetDoc
                if (swandive) await promisePreprocess;

                let defaultProblem = buildDefaultProblem(problemDoc);

                // add the default problems to the list of problems
                let problemCopy = getProblemCopy(defaultProblem);

                defaultProblem.defaultProblem = true;

                workspace.raven_config.problems[defaultProblem.problemID] = defaultProblem;
                workspace.raven_config.problems[problemCopy.problemID] = problemCopy;
                /**
                 * Note: mongodb data retrieval initiated here
                 *   setSelectedProblem -> loadMenu (manipulate.js) -> getData (manipulate.js)
                 */
                setSelectedProblem(problemCopy.problemID);
            }
        })
        .then(m.redraw);

    try {
        await Promise.all([
            promiseDatasetPath,
            promiseDatasetDoc,
            promiseSampledDatasetPath,
            promiseProblemDoc
        ]);

        if (awaitPreprocess)
            await Promise.all([promisePreprocess, promiseDiscovery]);

        m.redraw();

        return true
    } catch (err) {
        console.error(err);
        return false
    }
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

export async function load({awaitPreprocess}={}) {
    console.log('---------------------------------------');
    console.log('-- initial load, app.js - load() --');
    if (!IS_D3M_DOMAIN) {
        return;
    }

    // ---------------------------------------
    // 1. Retrieve the configuration information
    //  dev view: http://127.0.0.1:8080/user-workspaces/d3m-configs/json/latest?pretty
    // ---------------------------------------
    // let d3m_config_url = '/user-workspaces/d3m-configs/json/latest';
    let raven_config_url = '/user-workspaces/raven-configs/json/list';
    let config_result = await m.request({
        method: "POST",
        url: raven_config_url
    });

    console.groupCollapsed('1. Retrieve the configuration information');
    console.log(JSON.stringify(config_result));
    console.groupEnd();

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
    console.groupCollapsed('2. Load workspace');

    let success = await loadWorkspace(workspace, {awaitPreprocess});
    console.groupEnd();
    if (!success){
      // alertError('Failed to load workspace');
      return;
    }

    /**
     * 3. Start the user session
     * rpc rpc Hello (HelloRequest) returns (HelloResponse) {}
     */
    let responseTA2 = await m.request(D3M_SVC_URL + '/Hello', {});
    console.groupCollapsed('3. Start user session Hello');
    console.log(JSON.stringify(responseTA2));
    console.groupEnd();
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
        hopscotch.startTour(initialTour());
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
        var win = window.open("http://2ra.vn/demos/index.html", '_blank');
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

export let materializeManipulations = async (problem, schemaIds) => {

    let nominalVars = new Set(getNominalVariables(problem));
    let predictorVars = getPredictorVariables(problem);

    let hasNominal = [...problem.targets, ...predictorVars]
        .some(variable => nominalVars.has(variable));
    let hasManipulation = problem.manipulations.length > 0;

    let needsProblemCopy = hasManipulation || hasNominal;

    if (!needsProblemCopy)
        return;

    // TODO: upon deleting or reassigning datasetDocProblemUrl, server-side temp directories may be deleted
    Object.keys(problem.datasetSchemas)
        // only apply manipulations to a preset list of schema ids
        .filter(schemaId => schemaIds === undefined || schemaId in schemaIds)
        // ignore schemas with manipulations
        .filter(schemaId => !(schemaId in problem.datasetSchemasManipulated))
        // build manipulated dataset for schema
        .forEach(schemaId => buildProblemUrl(problem).then(({data_path, metadata_path}) => {
            problem.datasetSchemasManipulated[schemaId] = metadata_path;
            problem.datasetPathsManipulated[schemaId] = data_path;
        }))
};

// should be equivalent to partials.app
// loads up linearly spaced observations along domain and non-mangled levels/counts
let loadPredictorDomains = async problem => {
    if (problem.levels || problem.domain) return {success: true, message: 'predictor domains already loaded'};

    if (!variableSummariesLoaded)
        return {success: false, message: "variable summaries are not loaded"};

    let predictors = getPredictorVariables(problem);
    let categoricals = getNominalVariables(problem).filter(variable => predictors.includes(variable));

    let abstractPipeline = [...workspace.raven_config.hardManipulations, problem.manipulations];
    let compiled = queryMongo.buildPipeline(abstractPipeline, workspace.raven_config.variablesInitial)['pipeline'];

    let facets = categoricals
        .filter(variable => variableSummaries[variable].validCount !== 0)
        .reduce((facets, variable) => Object.assign(facets, {
            [variable]: [
                {$group: {_id: '$' + variable, count: {$sum: 1}}},
                {$sort: {count: -1, _id: 1}},
                {$limit: ICE_DOMAIN_MAX_SIZE},
                {$project: {'_id': 0, level: '$_id', count: 1}}
            ]
        }), {});

    // {[variable]: [{'level': level, 'count': count}, ...]}
    problem.levels = Object.keys(facets).length > 0 ? (await getData({
        method: 'aggregate',
        query: JSON.stringify([
            ...compiled,
            {$facet: facets}
        ])
    }))[0] : {};

    // {[variable]: *samples along domain*}
    problem.domains = predictors.reduce((domains, predictor) => {
        let summary = variableSummaries[predictor];
        if (summary.validCount === 0)
            domains[predictor] = [];
        else if (categoricals.includes(predictor))
            domains[predictor] = problem.levels[predictor].map(entry => entry.level);
        else {
            if (!('min' in variableSummaries[predictor]) || !('max' in variableSummaries[predictor]) || !('binary' in variableSummaries[predictor]))
                return domains;
            else if (variableSummaries[predictor].binary)
                domains[predictor] = [variableSummaries[predictor].min, variableSummaries[predictor].max];
            else
                domains[predictor] = linspace(
                    variableSummaries[predictor].min,
                    variableSummaries[predictor].max,
                    ICE_DOMAIN_MAX_SIZE)
        }
        return domains;
    }, {});

    return {success: true}
};

// materializing partials may only happen once per problem, all calls wait for same response
export let materializePartialsPromise = {};
export let materializePartials = async problem => {

    console.log('materializing partials');
    let responseLoadPredictorDomains = await loadPredictorDomains(problem);
    if (!responseLoadPredictorDomains.success)
        return responseLoadPredictorDomains;

    // BUILD BASE DATASET (one record)
    let dataset = [Object.keys(variableSummaries)
        .reduce((record, variable) => Object.assign(record, {
            [variable]: variable in problem.levels
                ? problem.levels[variable][0].level // take most frequent level (first mode)
                : variableSummaries[variable].median
        }), {})];

    // BUILD PARTIALS DATASETS
    let partialsLocationInfo = await m.request({
        method: 'POST',
        url: D3M_SVC_URL + '/get-partials-datasets',
        body: {
            domains: problem.domains,
            dataset_schema: workspace.datasetDoc,
            dataset,
            separate_variables: false,
            name: 'partials'
        }
    });
    if (!partialsLocationInfo.success) {
        alertWarn('Call for partials data failed. ' + (partialsLocationInfo.message || ''));
    } else {
        Object.assign(problem.datasetSchemas, partialsLocationInfo.data.dataset_schemas);
        Object.assign(problem.datasetPaths, partialsLocationInfo.data.dataset_paths);
    }
};


// BUILD DOMAINS
export let ICE_SAMPLE_MAX_SIZE = 50;
export let ICE_DOMAIN_MAX_SIZE = 20;

export let materializeICEPromise = {};
export let materializeICE = async problem => {
    console.log('materializing ICE partials');

    let responseLoadPredictorDomains = await loadPredictorDomains(problem);
    if (!responseLoadPredictorDomains.success)
        return responseLoadPredictorDomains;

    let abstractPipeline = [...workspace.raven_config.hardManipulations, problem.manipulations];
    let compiled = queryMongo.buildPipeline(abstractPipeline, workspace.raven_config.variablesInitial)['pipeline'];

    console.log(compiled);
    // BUILD SAMPLE DATASET
    let samplePaths = await getData({
        method: 'aggregate',
        query: JSON.stringify([...compiled, {$sample: {size: ICE_SAMPLE_MAX_SIZE}}, {$project: {_id: 0}}]),
        export: 'dataset',
        metadata: JSON.stringify(queryMongo.translateDatasetDoc(compiled, workspace.datasetDoc, problem))
    });

    let partialsLocationInfo;
    try {
        partialsLocationInfo = await m.request({
            method: 'POST',
            url: D3M_SVC_URL + '/get-partials-datasets',
            body: {
                domains: problem.domains,
                dataset_schema_path: samplePaths.metadata_path,
                separate_variables: true,
                name: 'ICE_synthetic_'
            }
        })
    } catch (err) {
        partialsLocationInfo = {success: false, message: String(err)}
    }
    // BUILD ICE DATASETS
    if (!partialsLocationInfo.success) {
        alertWarn('Call for ICE data failed. ' + (partialsLocationInfo.message || ''));
    } else {
        Object.assign(problem.datasetSchemas, partialsLocationInfo.data.dataset_schemas);
        Object.assign(problem.datasetPaths, partialsLocationInfo.data.dataset_paths);
    }
};

// materializing splits may only happen once per problem, all calls wait for same response
export let materializeTrainTestPromise = {};
export let materializeTrainTest = async problem => {

    let temporalVariables = problem.task.toLowerCase() === 'timeseriesforecasting' ? problem.tags.time : [];
    if (temporalVariables.length > 1)
        alertWarn(`Multiple temporal variables found. Using the first temporal variable to split: ${temporalVariables[0]}`);

    let response = await m.request({
        method: 'POST',
        url: D3M_SVC_URL + '/get-train-test-split',
        body: {
            do_split: problem.splitOptions.outOfSampleSplit,
            train_test_ratio: problem.splitOptions.trainTestRatio,
            stratified: problem.splitOptions.stratified,
            shuffle: problem.splitOptions.shuffle,
            random_seed: problem.splitOptions.randomSeed,
            splits_file_path: problem.splitOptions.splitsDir && problem.splitOptions.splitsFile && (problem.splitOptions.splitsDir + '/' + problem.splitOptions.splitsFile),

            temporal_variable: temporalVariables[0],
            nominal_variables: getNominalVariables(problem),
            dataset_schema: problem.datasetSchemas.all,
            dataset_path: problem.datasetPaths.all
        }
    });

    if (!response.success) {
        console.warn('Materialize train/test error:', response.message);
        alertWarn('Unable to create out-of-sample split. Using entire dataset for training and for in-sample testing.');
        results.resultsPreferences.dataSplit = 'all';
        problem.splitOptions.outOfSampleSplit = false;
        return false;
    }

    problem.datasetSchemas.all = response.data.dataset_schemas.all;
    problem.datasetSchemas.train = response.data.dataset_schemas.train;
    problem.datasetSchemas.test = response.data.dataset_schemas.test;

    problem.datasetPaths.all = response.data.dataset_paths.all;
    problem.datasetPaths.train = response.data.dataset_paths.train;
    problem.datasetPaths.test = response.data.dataset_paths.test;

    return true;
};

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
    problems = problems.filter(problem => problem.targets && problem.targets.every(target => target in variableSummaries));

    return problems.reduce((out, prob) => {
        let problemID = generateProblemID();
        let manips = [];

        prob.subsetObs.forEach(subsetObs => manips.push({
            type: 'subset',
            id: 'subset ' + manips.length,
            abstractQuery: [{
                id: problemID + '-' + String(0) + '-' + String(1),
                name: subsetObs,
                show_op: false,
                cancellable: true,
                subset: 'automated'
            }],
            nodeId: 2,
            groupId: 1
        }));

        // skip if transformations are present, D3M primitives cannot handle
        if (!IS_D3M_DOMAIN) {
            prob.transform.forEach(transformObs => {
                let [variable, transform] = transformObs.split('=').map(_ => _.trim());
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
        }

        // console.log('variableSummaries:' + JSON.stringify(variableSummaries))
        // console.log('>> prob:' +  JSON.stringify(prob))

        out[problemID] = {
            problemID,
            system: "auto",
            description: undefined,
            predictors: [...prob.predictors, ...getTransformVariables(manips)],
            targets: prob.targets,
            // NOTE: if the target is manipulated, the metric/task could be wrong
            metric: undefined,
            metrics: [], // secondary evaluation metrics
            task: undefined,
            subTask: 'taskSubtypeUndefined',
            meaningful: false,

            splitOptions: {
                outOfSampleSplit: true,
                trainTestRatio: 0.35,
                stratified: false,
                shuffle: true,
                randomSeed: undefined,
                splitsFile: undefined,
                splitsDir: undefined,
            },
            searchOptions: {
                timeBoundSearch: undefined,
                timeBoundRun: undefined,
                priority: undefined,
                solutionsLimit: undefined
            },
            scoreOptions: {
                evaluationMethod: 'kFold',
                folds: 10,
                trainTestRatio: 0.35,
                stratified: false,
                shuffle: true,
                randomSeed: undefined,
                splitsFile: undefined,
            },

            manipulations: manips,
            solutions: {},
            selectedSource: undefined,
            selectedSolutions: {},
            tags: {
                transformed: [...getTransformVariables(manips)], // this is used when updating manipulations pipeline
                weights: [], // singleton list
                crossSection: [],
                time: [],
                nominal: Object.keys(variableSummaries)
                    .filter(variable => variableSummaries[variable].nature === 'nominal'),
                loose: [] // variables displayed in the force diagram, but not in any groups
            }
        };
        setTask(inferIsCategorical(variableSummaries[prob.targets[0]]) ? 'classification' : 'regression', out[problemID]);
        return out;
    }, {});
}

export let setVariableSummaries = state => {
    if (!state) return;

    delete state.d3mIndex;

    variableSummaries = state;

    // quality of life
    Object.keys(variableSummaries).forEach(variable => variableSummaries[variable].name = variable);
    window.variableSummaries = variableSummaries;

    variableSummariesLoaded = true;
};
export let variableSummaries = {};
export let variableSummariesLoaded = false;

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
export let saveUserWorkspace = (silent = false) => {
    console.log('-- saveUserWorkspace --');

    // clear modal message
    !silent && setSaveCurrentWorkspaceWindowOpen(false);
    setCurrentWorkspaceMessageSuccess('');


    if (!('user_workspace_id' in workspace)) {
        setCurrentWorkspaceMessageError('Cannot save the workspace. The workspace id was not found. (saveUserWorkspace)');
        setSaveCurrentWorkspaceWindowOpen(true);
        return;
    }

    let raven_config_save_url = '/user-workspaces/raven-configs/json/save/' + workspace.user_workspace_id;

    console.log('data to save: ' + JSON.stringify(workspace.raven_config))

    m.request({
        method: "POST",
        url: raven_config_save_url,
        body: {raven_config: workspace.raven_config}
    })
        .then(function (save_result) {
            console.log(save_result);
            if (save_result.success) {
                setCurrentWorkspaceMessageSuccess('The workspace was saved!')
            } else {
                setCurrentWorkspaceMessageError('Failed to save the workspace. ' + save_result.message + ' (saveUserWorkspace)');
            }
            !silent && setSaveCurrentWorkspaceWindowOpen(true);
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
export async function saveAsNewWorkspace() {
    console.log('-- saveAsNewWorkspace --');

    // hide save/cancel buttons
    setDisplaySaveNameButtonRow(false);

    // get the current workspace id
    if (!('user_workspace_id' in workspace)) {

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

    if (!new_workspace_name) {

        // show save/cancel buttons
        setDisplaySaveNameButtonRow(true);

        setNewWorkspaceMessageError('Please enter a new workspace name.');
        return;
    }

    console.log('new_workspace_name: ' + new_workspace_name);

    // save url
    let raven_config_save_url = '/user-workspaces/raven-configs/json/save-as-new/' + workspace.user_workspace_id;

    let save_result = await m.request({
        method: "POST",
        url: raven_config_save_url,
        body: {
            new_workspace_name: new_workspace_name,
            raven_config: workspace.raven_config
        }
    });
    console.log('save_result: ' + JSON.stringify(save_result.success));
    // Failed! show error and return
    if (!save_result.success) {
        // show save/cancel buttons
        setDisplaySaveNameButtonRow(true);

        setNewWorkspaceMessageError(save_result.message);
        m.redraw();
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

    workspace.datasetPath = await getDatasetPath(workspace.d3m_config.problem_data_info);


    if (!workspace.datasetPath) {
        // shouldn't reach here, setDatasetUrl adds failure modal
        // alertWarn('FAILED TO SET DATASET URL. Please check the logs.');
        setNewWorkspaceMessageError('An error occurred saving the new workspace.');
        setDisplayCloseButtonRow(true);

    } else {
        setNewWorkspaceMessageSuccess('The new workspace has been saved!');
        setDisplayCloseButtonRow(true);
    }
    m.redraw();
}
/*
 * END: saveAsNewWorkspace
 */

export let isSelectedProblem = (probID) => {
  let selProblem = getSelectedProblem();
  if (!selProblem) return false;
  return (selProblem.problemID === probID)? true : false;
}

export let getSelectedProblem = () => {
    if (!workspace) return;
    let ravenConfig = workspace.raven_config;
    if (!ravenConfig) return;
    return ravenConfig.problems[ravenConfig.selectedProblem];
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
    if (task === problem.task) return; //  || !(supportedTasks.includes(task))
    problem.task = task;
    if (task.toLowerCase() === 'classification' || task.toLowerCase() === 'semisupervisedclassification')
        setSubTask(variableSummaries[problem.targets[0]].binary ? 'binary' : 'multiClass', problem);
    else if (task.toLowerCase() === 'regression' || task.toLowerCase() === 'semisupervisedregression')
        setSubTask(problem.predictors.length > 1 ? 'multivariate' : 'univariate', problem);
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
    if (['regression', 'semisupervisedregression'].includes(problem.task.toLowerCase())) return getPredictorVariables(problem).length > 1 ? 'multivariate' : 'univariate';

    if (!problem.subTask && variableSummaries[problem.targets[0]]) {
        if (problem.task.toLowerCase() === 'classification' || problem.task.toLowerCase() === 'semisupervisedclassification')
            problem.subTask = variableSummaries[problem.targets[0]].binary ? 'binary' : 'multiClass';
        else if (problem.task.toLowerCase() === 'regression' || problem.task.toLowerCase() === 'semisupervisedregression')
            problem.subTask = problem.predictors.length > 1 ? 'multivariate' : 'univariate';
        else
            problem.subTask = Object.keys(applicableMetrics[problem.task])[0]
    } else if (!problem.subTask && !variableSummaries[problem.targets[0]]) {
        return Object.keys(applicableMetrics[problem.task])[0];
    }

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
    if (!problem) return;
    let arrowPredictors = (problem.pebbleLinks || [])
        .filter(link => problem.targets.includes(link.target) && link.right)
        .map(link => link.source);

    // union arrow predictors with predictor group
    return [...new Set([...problem.predictors, ...arrowPredictors])]
};

export let getNominalVariables = problem => {
    let selectedProblem = problem || getSelectedProblem();
    return [...new Set([
        ...selectedProblem.tags.nominal,
        // targets in a classification problem are also nominal
        ...['classification', 'semisupervisedclassification'].includes(selectedProblem.task.toLowerCase())
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
    console.log('problem: ' + JSON.stringify(problem));

    // Behavioral Logging
    let logParams = {
        feature_id: 'SET_SELECTED_PROBLEM',
        activity_l1: 'DATA_PREPARATION',
        activity_l2: 'PROBLEM_DEFINITION',
        other: {problem: problem}

    };
    saveSystemLogEntry(logParams);


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
    // buildProblemPreprocess(problem)
    //     .then(preprocess => setVariableSummaries(preprocess.variables))
    //     .then(m.redraw);

    resetPeek();

    // will trigger the call to solver, if a menu that needs that info is shown
    setSolverPending(true);

    if (results.resultsPreferences.dataSplit !== 'all' && !problem.splitOptions.outOfSampleSplit)
        results.resultsPreferences.dataSplit = 'all';

    window.selectedProblem = problem;
}

export function getProblemCopy(problemSource) {
    // deep copy of original
    return Object.assign($.extend(true, {}, problemSource), {
        problemID: generateProblemID(),
        provenanceID: problemSource.problemID,
        unedited: true,
        pending: true,
        system: 'user',
        results: undefined
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
  let previewDatamartIndex = datamartPreferences.results[datamartPreferences.sourceMode]
      .findIndex(entry => previewDatamartId === datamartPreferences.getData(entry, 'id'));
  datamartPreferences.setPreviewButtonState(previewDatamartIndex, false);

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
 export async function handleSearchbyDataset(msg_data) {


    if (!msg_data) {
        console.log('handleSearchbyDataset: Error.  "msg_data" undefined');
        return;
    }
    console.log('handleSearchbyDataset');
    console.log(JSON.stringify(msg_data));

    // Need datamart name, even if an error
    //
    let datamartName = msg_data.data.datamart_name;


    if (msg_data.success) {
        let response_info = {
            success: true,
            data: msg_data.data.search_results
        }
        datamartPreferences.handleSearchResults(datamartName, response_info);
    } else {
        datamartPreferences.handleSearchResults(datamartName, msg_data);
    }
} // end: handleSearchbyDataset

/**
 *  After an augment:
 *  - Load the new workspace
 *  - Move the old selected problem manipulations to hardManipulations
 *  - Set the old selected problem as the new selected problem (sans manipulations)
 */
export async function handleAugmentDataMessage(msg_data) {

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
        "Data Augmentation Succeeded!", true, "Switch to augmented dataset", false, async () => {

            setModal(undefined, undefined, false);

            // (1) Preserve necessary info from current workspace
            //
            let priorSelectedProblem = getSelectedProblem();
            let priorHardManipulations = workspace.raven_config.hardManipulations;
            let priorVariablesInitial = workspace.raven_config.variablesInitial;

            // (2) load the new workspace
            //
            let ws_obj = JSON.parse(msg_data.data.workspace_json_string);
            console.log('--- 2a new workspace: ' + JSON.stringify(ws_obj));
            let priorDatasetName = workspace.d3m_config.name;
            await loadWorkspace(ws_obj);

            // (3) store prior manipulations
            //

            // - Copy manipulations from the orig selected problem to the
            // workspace's priorManipulations.
            // - Clear the orig. selected problem manipulations
            workspace.raven_config.priorManipulations = [
                ...priorHardManipulations,
                ...priorSelectedProblem.manipulations
            ];
            priorSelectedProblem.manipulations = [];

            // (4) update ids of the orig selected problem to avoid clashes
            //
            priorSelectedProblem.problemID = priorDatasetName;
            delete priorSelectedProblem.provenanceID;
            priorSelectedProblem.pending = false;
            priorSelectedProblem.edited = false;

            // (5) add the old problem to the current problems list
            //
            workspace.raven_config.problems[priorSelectedProblem.problemID] = priorSelectedProblem;

            // (6) add a problem with new columns added to predictors, and set it to the selected problem
            let problemCopy = getProblemCopy(priorSelectedProblem);

            problemCopy.predictors.push(...workspace.raven_config.variablesInitial
                .filter(newVariable => !priorVariablesInitial.includes(newVariable)));

            workspace.raven_config.problems[problemCopy.problemID] = problemCopy;
            setSelectedProblem(problemCopy.problemID);

            // Close augment and go to variables tab
            setLeftTab(LEFT_TAB_NAME_VARIABLES);

            saveUserWorkspace(true)
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

// replacement: allow duplicates in samples
// ordered: preserve the order in the original array
export let sample = (arr, n=1, replacement=false, ordered=false) => {
    let indices = [];
    if (replacement)
        indices = Array.from({length: n})
            .map(() => Math.floor(Math.random() * arr.length));
    else {
        let buckets = Array.from({length: arr.length}).map((_, i) => i);

        indices = Array.from({length: Math.min(n, arr.length)}).map(() => {
            let index = Math.floor(Math.random() * buckets.length);
            let temp = buckets[index];
            buckets.splice(index, 1);
            return temp;
        });
    }

    if (ordered) indices = indices.sort();
    return indices.map(i => arr[i]);
};

export let inferIsCategorical = variableSummary => {
    if (variableSummary.nature === 'nominal') return true;
    if (variableSummary.nature === 'ordinal' && variableSummary.uniqueCount <= 20) return true;
    return false;
};

export let isProblemValid = problem => {
    let valid = true;
    if (problem.task.toLowerCase() === 'timeseriesforecasting' && problem.tags.time.length === 0) {
        alertError('One variable must be marked as temporal to solve a time series forecasting problem.')
        valid = false;
    }
    if (problem.predictors.length === 0) {
        alertError('At least one predictor is required.');
        valid = false;
    }
    if (problem.targets.length === 0) {
        alertError('At least one target is required.');
        valid = false;
    }
    return valid;
};

// n linearly spaced points between min and max
let linspace = (min, max, n) => Array.from({length: n})
    .map((_, i) => min + (max - min) / (n - 1) * i);
