/*
  Main TwoRavens mithril app
*/
import hopscotch from 'hopscotch';
import m from 'mithril';
import * as common from "../common/common";

import * as manipulate from './manipulations/manipulate';
import {getData, getTransformVariables} from './manipulations/manipulate';

import {locationReload, setModal} from '../common/views/Modal';
import {elem} from './utils';

import $ from 'jquery';
import * as d3 from 'd3';
import * as queryMongo from "./manipulations/queryMongo";
import {groupBuilder, groupLinkBuilder, linkBuilder, pebbleBuilderLabeled} from "./views/ForceDiagram";
import {
    end_ta3_search,
    endAllSearches,
    handleDescribeSolutionResponse,
    handleENDGetSearchSolutionsResults,
    handleGetProduceSolutionResultsResponse,
    handleGetScoreSolutionResultsResponse,
    handleGetSearchSolutionResultsResponse,
    makePipelineTemplate
} from "./solvers/d3m";
import {buildDatasetUrl} from "./manipulations/manipulate";

// polyfill for flatmap (could potentially be included as a webpack entrypoint)
import "core-js/fn/array/flat-map";
import PlotVegaLite from "./views/PlotVegaLite";

//-------------------------------------------------
// NOTE: global variables are now set in the index.html file.
//    Developers, see /template/index.html
//-------------------------------------------------

let RAVEN_CONFIG_VERSION = 1;

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

    peekInlineHeight = `calc(${Math.max(percent, 0)}% + ${common.heightFooter})`;
    m.redraw();
};

export let peekMouseUp = () => {
    if (!peekInlineIsResizing) return;
    peekInlineIsResizing = false;
    document.body.classList.remove('no-select');
}

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
export let setPeekInlineShown = state => peekInlineShown = state;

// TA2 server information for display in modal
export let TA2ServerInfo = (TA2_SERVER !== undefined ) ? TA2_SERVER : '(TA2 unknown)';
export let setTA2ServerInfo = (infoStr) => TA2ServerInfo = infoStr;

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

    if (is_model_mode){
        let problem = getSelectedProblem();
        variables = [...problem.predictors, ...problem.targets];
    }

    let previewMenu = {
        type: 'menu',
        metadata: {
            type: 'data',
            skip: peekSkip,
            limit: peekLimit,
            variables,
            nominal: !is_manipulate_mode && nodes
                .filter(node => node.nature === 'nominal')
                .map(node => node.name)
        }
    };

    let data = await manipulate.loadMenu(
        manipulate.constraintMenu
            ? pipeline.slice(0, pipeline.indexOf(stage => stage === manipulate.constraintMenu.step))
            : pipeline,
        previewMenu
    );

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

export let downloadPeek = async () => {
    let problem = getSelectedProblem();
    let datasetUrl = await buildDatasetUrl(problem)

    let link = document.createElement("a");
    link.setAttribute("href", datasetUrl);
    link.setAttribute("download", datasetUrl);
    link.click();
}

// ~~~~ MANIPULATIONS STATE ~~~~
export let mongoURL = '/eventdata/api/';
export let datamartURL = '/datamart/api/';

// this contains an object of abstract descriptions of pipelines of manipulations for eventdata
export let eventDataPipeline;

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

// determines which variable is selected for additional analysis in the classification results menu
export let confusionFactor;
export let setConfusionFactor = factor => confusionFactor = factor === 'undefined' ? undefined : factor;

export let exploreVariate = 'Univariate';
export function setVariate(variate) {
    exploreVariate = variate;
}

export let task1_finished = false;
export let task2_finished = false;
export let setTask1_finished = state => task1_finished = state;
export let setTask2_finished = state => task2_finished = state;

export let problemDocExists = true;
export let univariate_finished = false;

export let allsearchId = [];            // List of all the searchId's created on searches

export let currentMode;
export let is_model_mode = true;
export let is_explore_mode = false;
export let is_results_mode = false;
export let is_manipulate_mode = false;

let exportCount = 0;

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

    if (currentMode !== mode) {
        if (mode === 'model' && manipulate.pendingHardManipulation) {
            let ravenConfig = workspace.raven_config;
            buildDatasetPreprocess(ravenConfig).then(response => {
                if (!response.success) alertLog(response.message)
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

export let buildProblemPreprocess = async (ravenConfig, problem) => problem.manipulations.length === 0
    ? variableSummaries
    : await getData({
        method: 'aggregate',
        query: JSON.stringify(queryMongo.buildPipeline(
            [...ravenConfig.hardManipulations, ...problem.manipulations, {
                type: 'menu',
                metadata: {
                    type: 'data',
                    nominal: problem.tags.nominal,
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

// for debugging - if not in PRODUCTION, prints args
export let cdb = _ => PRODUCTION || console.log(...arguments);

export let k = 4; // strength parameter for group attraction/repulsion
let tutorial_mode = localStorage.getItem('tutorial_mode') !== 'false';

// initial color scale used to establish the initial colors of nodes
// allNodes.push() below establishes a field for the master node array allNodes called "nodeCol" and assigns a color from this scale to that field
// everything there after should refer to the nodeCol and not the color scale, this enables us to update colors and pass the variable type to R based on its coloring
export let colors = d3.scaleOrdinal(d3.schemeCategory20);

export let leftTab = 'Variables'; // current tab in left panel
export let leftTabHidden = 'Variables'; // stores the tab user was in before summary hover

export let rightTab = 'Problem'; // current tab in right panel
export let rightTabExplore = 'Univariate';

export let preprocessTabName = 'Preprocess Log'

export let isPreprocessTab = () => {
    return leftTab === preprocessTabName;
}
export let setPreprocessTab = () =>{
    isPreprocessTab() ? setLeftTab('Variables') : setLeftTab(preprocessTabName);
}
export let modelLeftPanelWidths = {
    [preprocessTabName]: '500px',
    'Variables': '300px',
    'Discover': 'auto',
    'Augment': '600px',
    'Summary': '300px'
};

export let modelRightPanelWidths = {
    Problem: '300px',
    Manipulate: '485px',
    // 'Set Covar.': '900px',
    Results: '900px',
    Discovery:'900px'
};

export let exploreRightPanelWidths = {
    'Univariate': '700px',
    'Bivariate': '75%'
};

export let setRightTab = tab => {
    rightTab = tab;
    updateRightPanelWidth();
    setFocusedPanel('right')
};
export let setRightTabExplore = (tab) => { rightTabExplore = tab; updateRightPanelWidth() };

// call with a tab name to change the left tab in model mode
export let setLeftTab = (tab) => {
    leftTab = tab;
    updateLeftPanelWidth();
    if (tab === 'Discover') buttonClasses.btnDiscover = 'btn-secondary';
    exploreVariate = tab === 'Discover' ? 'Problem' : 'Univariate';
    setFocusedPanel('left');
};

export let setLeftTabHidden = tab => leftTabHidden = tab;

export let panelWidth = {
    'left': '0',
    'right': '0'
};

export let updateRightPanelWidth = () => {
    if (is_results_mode) common.panelOcclusion.right = '0px';
    // else if (is_model_mode && !selectedProblem) common.panelOcclusion.right = common.panelMargin;
    else if (common.panelOpen['right']) {
        let tempWidth = {
            'model': modelRightPanelWidths[rightTab],
            'explore': exploreRightPanelWidths[rightTabExplore]
        }[currentMode];

        panelWidth['right'] = `calc(${common.panelMargin}*2 + ${tempWidth})`;
    }
    else panelWidth['right'] = `calc(${common.panelMargin}*2 + 16px)`;
};
let updateLeftPanelWidth = () => {
    if (common.panelOpen['left'])
        panelWidth['left'] = `calc(${common.panelMargin}*2 + ${modelLeftPanelWidths[leftTab]})`;
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
    console.log(streamMsgCnt + ') message received! ' + e);
    // parse the data into JSON
    let msg_obj = JSON.parse(e.data);
    //console.log('data:' + JSON.stringify(msg_obj));
    let msg_data = msg_obj['message'];

    if (msg_data.msg_type === undefined) {
        console.log('streamSocket.onmessage: Error, "msg_data.msg_type" not specified!');
        return;
    }

    console.warn("#debug msg_data");
    console.log(msg_data);

    if (msg_data.data === undefined && msg_data.msg_type !== 'DATAMART_AUGMENT_PROCESS') {
        console.log('streamSocket.onmessage: Error, "msg_data.data" type not specified!');
        console.log('full data: ' + JSON.stringify(msg_data));
        console.log('---------------------------------------------');
        return;
    }
    console.log('full data: ' + JSON.stringify(msg_data));

    console.log('Got it! Message type: ' + msg_data.msg_type);
    //JSON.stringify(msg_data));

    if (msg_data.msg_type === 'GetSearchSolutionsResults') {
        console.log(msg_data.msg_type + ' recognized!');
        handleGetSearchSolutionResultsResponse(msg_data.data);
    }
    else if (msg_data.msg_type === 'DescribeSolution') {
        console.log(msg_data.msg_type + ' recognized!');
        handleDescribeSolutionResponse(msg_data.data);
    }
    else if (msg_data.msg_type === 'GetScoreSolutionResults') {
        console.log(msg_data.msg_type + ' recognized!');
        handleGetScoreSolutionResultsResponse(msg_data.data);
    }
    else if (msg_data.msg_type === 'GetProduceSolutionResults') {
        console.log(msg_data.msg_type + ' recognized!');
        handleGetProduceSolutionResultsResponse(msg_data.data);
    }
    else if (msg_data.msg_type === 'GetFitSolutionResults') {
        console.log(msg_data.msg_type + ' recognized!');
        console.log('No handler: Currently not using GetFitSolutionResultsResponse...');
    }
    else if (msg_data.msg_type === 'ENDGetSearchSolutionsResults') {
        console.log(msg_data.msg_type + ' recognized!');
        handleENDGetSearchSolutionsResults();
    }
    else if (msg_data.msg_type === 'DATAMART_MATERIALIZE_PROCESS') {
        console.log(msg_data.msg_type + ' recognized!');
        handleMaterializeDataMessage(msg_data);
    }
    else if (msg_data.msg_type === 'DATAMART_AUGMENT_PROCESS') {
        console.log(msg_data.msg_type + ' recognized!');
        handleAugmentDataMessage(msg_data);
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
export let setLockToggle = state => lockToggle = state;

export let priv = true;
export let setPriv = state => priv = state;

// if no columns in the datasetDoc, swandive is enabled
// swandive set to true if task is in failset
export let swandive = false;
let failset = ["TIME_SERIES_FORECASTING","GRAPH_MATCHING","LINK_PREDICTION","timeSeriesForecasting","graphMatching","linkPrediction"];

// replacement for javascript's blocking 'alert' function, draws a popup similar to 'alert'
export let alertLog = (value, shown) => {
    alerts.push({type: 'log', time: new Date(), description: value});
    alertsShown = shown !== false; // Default is 'true'
};
export let alertWarn = (value, shown) => {
    alerts.push({type: 'warn', time: new Date(), description: value});
    alertsShown = shown !== false; // Default is 'true'
    console.trace('warning: ', value);
};
export let alertError = (value, shown) => {
    alerts.push({type: 'error', time: new Date(), description: value});
    alertsShown = shown !== false; // Default is 'true'
    console.trace('error: ', value);
};

// alerts popup internals
export let alerts = [];
export let alertsLastViewed = new Date();

export let alertsShown = false;
export let setAlertsShown = state => alertsShown = state;

export let zparams = {
    zdata: [],
    zedges: [],
    ztime: [],
    znom: [],
    zcross: [],
    zmodel: "",
    zvars: [],
    zdv: [],
    zgroup1: [],
    zgroup2: [], // hard coding to two groups for present experiments, but will eventually make zgroup array of arrays, with zgroup.length the number of groups
    zdataurl: "",
    zd3mdata: "", //these take the place of zdataurl for d3m, because data is in two placees. eventually will generalize
    zd3mtarget: "",
    zsubset: [],
    zsetx: [],
    zmodelcount: 0,
    zplot: [],
    zsessionid: "",
    zdatacite: '...',
    zcrosstab: [],
    zusername: ''
};

// menu state within datamart component
export let datamartPreferences = {
    // default state for query
    query: {
        dataset: {
            about: '',
            keywords: []
        }
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
    cached: {}
};


export let modelCount = 0;

// list of result objects for one problem
export let allResults = [];

export let nodes = [];
export let links = [];
let mods = {};
let estimated = false;
let selInteract = false;
export let callHistory = []; // transform and subset calls


export let configurations = {};

export let domainIdentifier = null; // available throughout apps js; used for saving workspace

// eventually read this from the schema with real descriptions
// metrics, tasks, and subtasks as specified in D3M schemas
// MEAN SQUARED ERROR IS SET TO SAME AS RMSE. MSE is in schema but not proto
export let d3mTaskType = {
  taskTypeUndefined: ["description", "TASK_TYPE_UNDEFINED", 0],
  classification: ["description", "CLASSIFICATION", 1],
  regression: ["description", "REGRESSION", 2],
  clustering: ["description", "CLUSTERING", 3],
  linkPrediction: ["description", "LINK_PREDICTION", 4],
  vertexNomination: ["description", "VERTEX_NOMINATION", 5],
  vertexClassification: ["description", "VERTEX_CLASSIFICATION", 6],
  communityDetection: ["description", "COMMUNITY_DETECTION", 7],
  graphMatching: ["description", "GRAPH_MATCHING", 8],
  timeSeriesForecasting: ["description", "TIME_SERIES_FORECASTING", 9],
  collaborativeFiltering: ["description", "COLLABORATIVE_FILTERING", 10],
  objectDetection: ["description", "OBJECT_DETECTION", 11],
  semisupervisedClassification: ["description", "SEMISUPERVISED_CLASSIFICATION", 12],
  semisupervisedRegression: ["description", "SEMISUPERVISED_REGRESSION", 13]
};

export let d3mTaskSubtype = {
    taskSubtypeUndefined: ["description", "TASK_SUBTYPE_UNDEFINED", 0],
    subtypeNone: ["description", "NONE",1],
    binary: ["description", "BINARY" , 2],
    multiClass: ["description", "MULTICLASS" , 3],
    multiLabel: ["description", "MULTILABEL" , 4],
    univariate: ["description", "UNIVARIATE" , 5],
    multivariate: ["description", "MULTIVARIATE" , 6],
    overlapping: ["description", "OVERLAPPING" , 7],
    nonOverlapping: ["description", "NONOVERLAPPING" , 8]
};
/*export let d3mOutputType = {
    outputUndefined:["description","OUTPUT_TYPE_UNDEFINED ", 0],
    predictionsFile:["description","PREDICTIONS_FILE",1],
    scoresFile:["description","SCORES_FILE",2]
}; */
export let d3mMetrics = {
    metricUndefined: ["description", "METRIC_UNDEFINED", 0],
    accuracy: ["description", "ACCURACY", 1],
    precision: ["description", "PRECISION", 2],
    recall: ["description", "RECALL", 3],
    f1: ["description", "F1", 4],
    f1Micro: ["description", "F1_MICRO", 5],
    f1Macro: ["description", "F1_MACRO", 6],
    rocAuc: ["description", "ROC_AUC", 7],
    rocAucMicro: ["description", "ROC_AUC_MICRO", 8],
    rocAucMacro: ["description", "ROC_AUC_MACRO", 9],
    meanSquaredError: ["description", "MEAN_SQUARED_ERROR", 10],
    rootMeanSquaredError: ["description", "ROOT_MEAN_SQUARED_ERROR", 11],
    meanAbsoluteError: ["description", "MEAN_ABSOLUTE_ERROR", 12],
    rSquared: ["description", "R_SQUARED", 13],
    normalizedMutualInformation: ["description", "NORMALIZED_MUTUAL_INFORMATION", 14],
    jaccardSimilarityScore: ["description", "JACCARD_SIMILARITY_SCORE", 15],
    precisionAtTopK: ["description", "PRECISION_AT_TOP_K", 17],
    objectDetectionAveragePrecision: ["description", "OBJECT_DETECTION_AVERAGE_PRECISION", 18],
    hammingLoss: ["description", "HAMMING_LOSS", 19],
    rank: ["description", "RANK", 99],
    loss: ["description", "LOSS", 100]
};

// available models from rookSolver
export let baselineModelTypes = {
    regression: ['Linear', 'Negative Binomial', 'Poisson'],
    classification: ['Logistic', 'Multinomial'],
    clustering: ['KMeans'],
    timeSeriesForecasting: ['Vector Autoregression']
};

export let byId = id => document.getElementById(id);
// export let byId = id => {console.log(id); return document.getElementById(id);}

/**
   page reload linked to btnReset
*/
export const reset = async function reloadPage() {
    endAllSearches();
    byId("btnModel").click();
    //clearInterval(interiorIntervalId);
    //clearInterval(requestIntervalId);
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
        step("dataName", "bottom", "Welcome to TwoRavens Solver",
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
        step("btnEstimate", "left", "Solve Task 2",
             `<p>This generally is the important step to follow for Task 2 - Build a Model.</p>
                      <p>Generally, as a tip, the Green button is the next button you need to press to move the current task forward, and this button will be Green when Task 1 is completed and Task 2 started.</p>
                      <p>Click this Solve button to tell the tool to find a solution to the problem, using the variables presented in the center panel.</p>`),
        step(getSelectedProblem().targets.join(', ') + 'biggroup', "left", "Target Variable",
             `We are trying to predict ${getSelectedProblem().targets.join(', ')}.
                      This center panel graphically represents the problem currently being attempted.`),
        step("gr1hull", "right", "Explanation Set", "This set of variables can potentially predict the target."),
        step("displacement", "right", "Variable List",
             `<p>Click on any variable name here if you wish to remove it from the problem solution.</p>
                      <p>You likely do not need to adjust the problem representation in the center panel.</p>`),
        step("btnEndSession", "bottom", "Finish Problem",
             "If the solution reported back seems acceptable, then finish this problem by clicking this End Session button."),
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
export let lockTour = {
    id: "lock_toggle",
    i18n: {doneBtn:'Ok'},
    showCloseButton: true,
    scrollDuration: 300,
    steps: [
        step("btnLock", "left", "Locked Mode", `<p>Click the lock button to enable editing.</p>`)
    ]
};

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
}
export let getCurrentWorkspaceId = () => {
  return (workspace || {}).user_workspace_id || '(no id)';
  //return (workspace === undefined || workspace.user_workspace_id === undefined) ? '(no id)' : workspace.user_workspace_id;
}

export let setShowModalWorkspace = state => showModalWorkspace = state;
export let showModalWorkspace = false;

export let loadWorkspace = async newWorkspace => {

    // scopes at app.js level; used for saving workspace
    domainIdentifier = {
        name: newWorkspace.d3m_config.name,
        source_url: newWorkspace.d3m_config.config_url,
        description: 'D3M config file',
        // id: workspace.d3m_config.id
    };

    workspace = newWorkspace;

    // update page title shown on tab
    d3.select("title").html("TwoRavens " + workspace.d3m_config.name);

    // TODO: just call updatePeek?
    // will trigger further mongo calls if the secondary peek page is open
    localStorage.setItem('peekHeader' + peekId, "TwoRavens " + workspace.d3m_config.name);

    /**
     * 1. Load 'datasetDoc'
     */
    console.log('---------------------------------------');
    console.log("-- Workspace: 1. Load 'datasetDoc' --");
    // url example: /config/d3m-config/get-dataset-schema/json/39
    //
    workspace.datasetDoc = await m.request(workspace.d3m_config.dataset_schema_url);

    let datadocument_columns = (workspace.datasetDoc.dataResources.find(resource => resource.columns) || {}).columns;
    if (datadocument_columns === undefined) {
        console.log('D3M WARNING: datadocument.dataResources[x].columns is undefined.');
        swandive = true;
    }

    if (swandive)
        alertWarn('Exceptional data detected.  Please check the logs for "D3M WARNING"');

    console.log("data schema data: ", workspace.datasetDoc);

    //
    // if (!IS_D3M_DOMAIN) {
    //     // Note: presently xml is no longer being read from Dataverse metadata anywhere
    //     let temp = xml.documentElement.getElementsByTagName("fileName");
    //     zparams.zdata = temp[0].childNodes[0].nodeValue;
    //     let cite = xml.documentElement.getElementsByTagName("biblCit");
    //     // clean citation so POST is valid json
    //     zparams.zdatacite = cite[0].childNodes[0].nodeValue
    //         .replace(/\&/g, "and")
    //         .replace(/\;/g, ",")
    //         .replace(/\%/g, "-");
    //     // fill in citation in header
    //     byId('cite').children[0].textContent = zparams.zdatacite;
    // }


    /**
     * 2. Load 'datasetUrl'
     */
    console.log('---------------------------------------');
    console.log("-- Workspace: 2. Load 'datasetUrl' --");
    //url example: /config/d3m-config/get-problem-data-file-info/39
    //
    let problem_info_result = await m.request(workspace.d3m_config.problem_data_info);

    console.log("result from problem data file info:");
    console.log(problem_info_result);

    // The result of this call is similar to below:
    // example:
    /*  {
             "success":true,
             "data":{
                "learningData.csv":{
                   "exists":true,
                   "size":11654,
                   "path":"/inputs/dataset_TRAIN/tables/learningData.csv"
                },
                "learningData.csv.gz":{
                   "exists":false,
                   "size":-1,
                   "path":"/inputs/dataset_TRAIN/tables/learningData.csv.gz"
                }
             }
          }
    */

    // Loop through the response above and
    // pick the first "path" where "exists" is true
    //
    // Note: if data files have "exists" as false, stay at default which is null
    //
    let set_d3m_data_path = field => problem_info_result.data[field].exists
        ? problem_info_result.data[field].path
        : problem_info_result.data[field + '.gz'].exists
            ? problem_info_result.data[field + '.gz'].path
            : undefined


    workspace.datasetUrl = set_d3m_data_path('learningData.csv');

    // If this is the D3M domain; workspace.datasetUrl MUST be set to an actual value
    //
    if (IS_D3M_DOMAIN && !workspace.datasetUrl) {
        const d3m_path_err = 'NO VALID datasetUrl! ' + JSON.stringify(problem_info_result)
        console.log(d3m_path_err);
        alertError('debug (be more graceful): ' + d3m_path_err);
    }


    /**
     * 3. read preprocess data or (if necessary) run preprocess
     * NOTE: preprocess.json is now guaranteed to exist...
     */
    console.log('---------------------------------------');
    console.log("-- Workspace: 3. read preprocess data or (if necessary) run preprocess --");

    // Function to load retreived preprocess data
    //
    let loadPreprocessData = res => {
        priv = res.data.dataset.private || priv;
        return res.data;
    };

    let resPreprocess;

    if (workspace.raven_config)
        setVariableSummaries(await buildProblemPreprocess(workspace.raven_config, getSelectedProblem()));

    else {
        let url = ROOK_SVC_URL + 'preprocessapp';
        // For D3M inputs, change the preprocess input data
        let json_input = IS_D3M_DOMAIN
            ? {data: workspace.datasetUrl, datastub: workspace.d3m_config.name}
            : {data: dataloc, target: targetloc, datastub}; // TODO: these are not defined

        try {
            // res = read(await m.request({method: 'POST', url: url, data: json_input}));
            let preprocess_info = await m.request({method: 'POST', url, data: json_input});
            console.log('preprocess_info: ', preprocess_info);
            console.log('preprocess_info message: ' + preprocess_info.message);
            if (preprocess_info.success){
                resPreprocess = loadPreprocessData(preprocess_info);

            }else{
                setModal(m('div', m('p', "Preprocess failed: "  + preprocess_info.message),
                    m('p', '(May be a serious problem)')),
                    "Failed to load basic data.",
                    true,
                    "Reload Page",
                    false,
                    locationReload);
                return false;

                //alertError('Preprocess failed: ' + preprocess_info.message);
                // endsession();
            }
        } catch(_) {
            console.log('preprocess failed');
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
    }


    /**
     * 4.a. Assign problem discovery to raven_config
     */
    console.log('---------------------------------------');
    console.log("-- Workspace: 4.a. Assign problem discovery to raven_config --");

    if(!swandive && resPreprocess) {
        // assign discovered problems into problems set, keeping the d3m problem
        Object.assign(newWorkspace.raven_config.problems, discovery(resPreprocess.dataset.discovery));
        newWorkspace.raven_config.variablesInitial = Object.keys(variableSummaries);

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
    let d3mPS = newWorkspace.d3m_config.problem_schema_url;
    let problemDoc = await m.request(d3mPS);
    // console.log("prob schema data: ", res);
    if(typeof problemDoc.success === 'undefined'){            // In Task 2 currently res.success does not exist in this state, so can't check res.success==true
        // This is a Task 2 assignment
        // console.log("DID WE GET HERE?");
        task1_finished = true;
        buttonClasses.btnDiscover = 'btn-success';
        buttonClasses.btnSubmitDisc = 'btn-success';
        buttonClasses.btnEstimate = 'btn-success';

    } else if (!problemDoc.success){                       // Task 1 is when res.success==false
        // This is a Task 1 assignment: no problem doc.
        task2_finished = true;
        problemDocExists = false;
    } else alertLog("Something Unusual happened reading problem schema.");


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

        // -----------------------------
        // Check with MS, quick hack to get resId working
        // -----------------------------
        let firstTarget;
        if (typeof problemDoc.inputs.data[0].targets[0] !== 'undefined') {
            firstTarget = problemDoc.inputs.data[0].targets[0];
        }
        // -----------------------------


        // create the default problem provided by d3m
        let targets = problemDoc.inputs.data
            .flatMap(source => source.targets.map(targ => targ.colName));
        let predictors = swandive
            ? Object.keys(variableSummaries)
                .filter(column => column !== 'd3mIndex' && !targets.includes(column))
            : newWorkspace.datasetDoc.dataResources // if swandive false, then datadoc has column labeling
                .filter(resource => resource.resType === 'table')
                .flatMap(resource => resource.columns
                    .filter(column => column.role[0] !== 'index' && !targets.includes(column.colName))
                    .map(column => column.colName));

        console.log('pdoc targets: ' + JSON.stringify(targets));

        let defaultProblem = {
            problemID: problemDoc.about.problemID,
            system: 'auto',
            version: problemDoc.about.version,
            predictors: predictors,
            firstTarget: firstTarget,
            targets: targets,
            description: problemDoc.about.problemDescription,
            metric: problemDoc.inputs.performanceMetrics[0].metric,
            task: problemDoc.about.taskType,
            subTask: problemDoc.about.taskSubType,
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
                time: [],
                nominal: [],
                loose: [] // variables displayed in the force diagram, but not in any groups
            }
        };

        // add the default problems to the list of problems
        let problemCopy = getProblemCopy(defaultProblem);

        newWorkspace.raven_config.problems[problemDoc.about.problemID] = defaultProblem;
        newWorkspace.raven_config.problems[problemCopy.problemID] = problemCopy;
        /**
         * Note: mongodb data retrieval initiated here
         *   setSelectedProblem -> loadMenu (manipulate.js) -> getData (manipulate.js)
         */
        setSelectedProblem(problemCopy.problemID);

    } else console.log("Task 1: No Problem Doc");


    return true;
}

/**
 called by main
 Loads all external data in the following order (logic is not included):
 1. Retrieve the configuration information
 2. Load workspace
 3. Read in zelig models (not for d3m)
 4. Read in zeligchoice models (not for d3m)
 5. Start the user session /Hello
 */

async function load(d3mRootPath, d3mDataName, d3mPreprocess, d3mData, d3mPS, d3mDS, pURL) {
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

    console.log(JSON.stringify(config_result));

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

    // Take the 1st configuration from the list -- for now...
    //let configurations = config_result.data[0]

    // console.log("this is the config file:");
    // console.log(configurations);

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

    // m.redraw();

    // /**
    //  * 3. Read in zelig models (not for d3m)
    //  * 4. Read in zeligchoice models (not for d3m)
    //  */
    // console.log('---------------------------------------');
    // console.log("-- 3. Read in zelig models (not for d3m) --");
    // console.log("-- 4. Read in zeligchoice models (not for d3m) --");
    //
    // if (!IS_D3M_DOMAIN){
    //   for (let field of ['zelig5models', 'zelig5choicemodels']) {
    //       try {
    //           problemDoc = await m.request(`data/${field}.json`);
    //           cdb(field + ' json: ', problemDoc);
    //           problemDoc[field]
    //               .filter(key => problemDoc[field].hasOwnProperty(key))
    //               .forEach(key => mods[key.name[0]] = key.description[0]);
    //       } catch(_) {
    //           console.log("can't load " + field);
    //       }
    //   }
    // }

    /**
     * 5. Start the user session
     * rpc rpc Hello (HelloRequest) returns (HelloResponse) {}
     */
    console.log('---------------------------------------');
    console.log("-- 5. Start the user session /Hello --");

    let problemDoc = await makeRequest(D3M_SVC_URL + '/Hello', {});
    if (problemDoc) {
      console.log(problemDoc)
      if (problemDoc.success != true){
        const user_err_msg = "Failed to make Hello connection with TA2! status code: " + problemDoc.message;
        setModal(user_err_msg, "Error Connecting to TA2", true, "Reset", false, locationReload);
        return;
      } else {
            zparams.zsessionid = "no session id in this API version";   // remove this eventually

            // ----------------------------------------------
            // Format and show the TA2 name in the footer
            // ----------------------------------------------
            let ta2Version;
            if(typeof problemDoc.data.version !== 'undefined'){
              ta2Version = problemDoc.data.version;
            }
            let ta2Name = problemDoc.data.userAgent;
            if (ta2Version){
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
   called on app start
   @param {string} fileid
   @param {string} hostname
   @param {string} ddiurl
   @param {string} dataurl
   @param {string} apikey
*/


export function main(fileid, hostname, ddiurl, dataurl, apikey) {
    if (PRODUCTION && fileid === '') {
        let msg = 'Error: No fileid has been provided.';
        alertError(msg);
        throw new Error(msg);
    }

    let dataverseurl = hostname ? 'https://' + hostname :
        PRODUCTION ? DATAVERSE_URL :
        'http://localhost:8080';
    // if file id supplied, assume we are dealing with dataverse and cook a standard dataverse data access url
    // with the fileid supplied and the hostname we have supplied or configured
    dataurl = fileid && !dataurl ? `${dataverseurl}/api/access/datafile/${fileid}?key=${apikey}` : dataurl;
    cdb('--dataurl: ' + dataurl);
    cdb('--dataverseurl: ' + dataverseurl);

    let tempWidth = d3.select('#main').style('width');

    // indicators for showing membership above arcs
    // let indicator = (degree) => d3.svg.circle()
    //     .cx( RADIUS )//(RADIUS+35) * Math.sin(degree))
    //     .cy( RADIUS )//(RADIUS+35) * Math.cos(degree))
    //     .r(3);
    // ind1 = indicator(1);
    // ind2 = indicator(1.2);

    // assume locations are consistent based on d3m directory structure
    let d3mRootPath = '';
    let d3mDataName = '';
    let d3mData = null;
    let d3mPreprocess = '';
    let d3mPS = '';
    let d3mDS = '';

    // default to Fearon Laitin
    let data = 'data/' + (false ? 'PUMS5small' : 'fearonLaitin');
    let metadataurl = ddiurl || (fileid ? `${dataverseurl}/api/meta/datafile/${fileid}` : data + '.xml');
    // read pre-processed metadata and data
    let pURL = dataurl ? `${dataurl}&format=prep` : data + '.json';

    if (IS_D3M_DOMAIN) {
        pURL = d3mPreprocess;
    } else if (!PRODUCTION) {
        zparams.zdataurl = 'data/fearonLaitin.tsv';
    }
    load(d3mRootPath, d3mDataName, d3mPreprocess, d3mData, d3mPS, d3mDS, pURL);
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

const k_combinations = (list, k) => {
    if (k > list.length || k <= 0) return []; // no valid combinations of size k
    if (k === list.length) return [list]; // one valid combination of size k
    if (k === 1) return list.reduce((acc, cur) => [...acc, [cur]], []); // k combinations of size k

    let combinations = [];

    for (let i = 0; i <= list.length - k + 1; i++) {
        let subcombinations = k_combinations(list.slice(i + 1), k - 1);
        for (let j = 0; j < subcombinations.length; j++) {
            combinations.push([list[i], ...subcombinations[j]])
        }
    }

    return combinations
};

// used to compute interaction terms of degree lte k
const lte_k_combinations = (set, k) =>
    Array(k).fill(null).reduce((acc, _, idx) => [...acc, ...k_combinations(set, idx + 1)], []);

const intersect = sets => sets.reduce((a, b) => new Set([...a].filter(x => b.has(x))));


// layout for force diagram pebbles. Can be 'variables', 'pca', 'clustering' etc. (ideas)
export let forceDiagramMode = 'variables';
export let setForceDiagramMode = mode => forceDiagramMode = mode;

export let buildForceData = problem => {

    if (!problem) return;

    let pebbles = [...problem.predictors, ...problem.targets, ...problem.tags.loose];
    let groups = [];
    let groupLinks = [];

    if (forceDiagramMode === 'variables') {
        groups = [
            {
                name: "Predictors",
                color: common.gr1Color,
                colorBackground: swandive && 'grey',
                nodes: new Set(problem.predictors),
                opacity: 0.3
            },
            {
                name: "Targets",
                color: common.gr2Color,
                colorBackground: swandive && 'grey',
                nodes: new Set(problem.targets),
                opacity: 0.3
            },
            {
                name: "Loose",
                color: common.selVarColor,
                colorBackground: "transparent",
                nodes: new Set(problem.tags.loose),
                opacity: 0.0
            },
            // {
            //     name: "Priors",
            //     color: common.warnColor,
            //     colorBackground: "transparent",
            //     nodes: new Set(['INSTM', 'pctfedited^2', 'test', 'PCTFLOAN^3']),
            //     opacity: 0.4
            // }
        ];

        groupLinks = [
            {
                color: common.gr1Color,
                source: 'Predictors',
                target: 'Targets'
            }
        ];
    }

    // TODO: if clustering information is present in the problem, this is where alternative views would be implemented
    if (forceDiagramMode === 'clusters') {

    }

    let summaries = Object.assign({}, variableSummaries);

    // collapse group intersections with more than maxNodes into a single node
    let maxNodes = 20;
    let collapsedGroups = [];

    let removedPebbles = new Set();
    let addedPebbles = new Set();

    let combinedGroups = common.deepCopy(groups)
        .reduce((out, group) => Object.assign(out, {[group.name]: group}), {});

    // TODO: can be linearized with a hashmap
    // for any combination of groups, collapse their intersection if their intersection is large enough
    // https://stackoverflow.com/questions/12303989/cartesian-product-of-multiple-arrays-in-javascript
    const f = (a, b) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
    const cartesian = (a, b, ...c) => (b ? cartesian(f(a, b), ...c) : a);

    cartesian(...groups.map(group => [{group, include: true}, {group, include: false}]))
        .forEach(combination => {

            let includedGroups = combination
                .filter(comb => comb.include)
                .map(comb => comb.group);
            if (includedGroups.length === 0) return;

            let partition = new Set([
                ...intersect(includedGroups.map(group => group.nodes))
            ].filter(pebble => !combination
                .filter(comb => !comb.include)
                .some(comb => comb.group.nodes.has(pebble))));

            let mergedName = includedGroups.map(group => group.name).join(' & ');

            if (partition.size > maxNodes) {

                addedPebbles.add(mergedName);
                let partitionArray = [...partition];
                partitionArray.forEach(pebble => removedPebbles.add(pebble));

                // remove pebbles that were collapsed from their parent groups
                includedGroups
                    .forEach(group => combinedGroups[group.name].nodes = new Set([...group.nodes].filter(node => !partition.has(node))));
                // add the pebble that represents the merge to each parent group
                includedGroups
                    .forEach(group => combinedGroups[group.name].nodes.add(mergedName));

                summaries[mergedName] = {
                    plottype: 'collapsed',
                    childNodes: partition
                }

                // when merging, attempt to use the positions of existing modes
                if (!(mergedName in forceDiagramNodesReadOnly)) {
                    let preexistingPebbles = partitionArray.filter(pebble => pebble in forceDiagramNodesReadOnly)
                    if (preexistingPebbles.length > 0) forceDiagramNodesReadOnly[mergedName] = {
                        id: mergedName.replace(/\W/g,'_'),
                        name: mergedName,
                        x: preexistingPebbles.reduce((sum, pebble) => sum + forceDiagramNodesReadOnly[pebble].x, 0) / preexistingPebbles.length,
                        y: preexistingPebbles.reduce((sum, pebble) => sum + forceDiagramNodesReadOnly[pebble].y, 0) / preexistingPebbles.length
                    }
                }
            }
        });

    pebbles = [...pebbles.filter(pebble => !removedPebbles.has(pebble)), ...addedPebbles];
    groups = Object.values(combinedGroups);

    return {pebbles, groups, groupLinks, summaries};
};


export let setGroup = (group, name) => {
    let selectedProblem = getSelectedProblem();
    ({
        'Loose': () => {
            !selectedProblem.tags.loose.includes(name) && selectedProblem.tags.loose.push(name);
            remove(selectedProblem.targets, name);
            remove(selectedProblem.predictors, name);
        },
        'Predictors': () => {
            !selectedProblem.predictors.includes(name) && selectedProblem.predictors.push(name);
            remove(selectedProblem.targets, name);
            remove(selectedProblem.tags.loose, name);
        },
        'Targets': () => {
            !selectedProblem.targets.includes(name) && selectedProblem.targets.push(name);
            remove(selectedProblem.predictors, name);
            remove(selectedProblem.tags.loose, name);
        }
    }[group] || Function)()
}

export let forceDiagramNodesReadOnly = {};

export let forceDiagramState = {
    builders: [pebbleBuilderLabeled, groupBuilder, linkBuilder, groupLinkBuilder],
    pebbleLinks: [],
    hoverPebble: undefined,
    contextPebble: undefined,
    selectedPebble: undefined,
    hoverTimeout: undefined,
    isPinned: false,
    hullRadius: 40,
    defaultPebbleRadius: 40,
    hoverTimeoutDuration: 150, // milliseconds to wait before showing/hiding the pebble handles
    selectTransitionDuration: 300, // milliseconds of pebble resizing animations
    arcHeight: 16,
    arcGap: 1
}

let setSelectedPebble = pebble => {
    forceDiagramState.selectedPebble = pebble;

    if (pebble) {
        leftTab !== 'Summary' && setLeftTabHidden(leftTab);
        setLeftTab('Summary');
    } else if (leftTabHidden) {
        setLeftTab(leftTabHidden);
        setLeftTabHidden(undefined);
    }
    m.redraw();
}

Object.assign(forceDiagramState, {
    setSelectedPebble,
    pebbleEvents: {
        click: setSelectedPebble,
        mouseover: pebble => {
            clearTimeout(forceDiagramState.hoverTimeout);
            forceDiagramState.hoverTimeout = setTimeout(() => {
                forceDiagramState.hoverPebble = pebble;
                leftTab !== 'Summary' && setLeftTabHidden(leftTab);
                setLeftTab('Summary');
                m.redraw()
            }, forceDiagramState.hoverTimeoutDuration)
        },
        mouseout: () => {
            clearTimeout(forceDiagramState.hoverTimeout);
            forceDiagramState.hoverTimeout = setTimeout(() => {
                forceDiagramState.hoverPebble = undefined;
                if (!forceDiagramState.selectedPebble) {
                    setLeftTab(leftTabHidden);
                    setLeftTabHidden(undefined);
                }

                m.redraw()
            }, forceDiagramState.hoverTimeoutDuration)
        },
        contextmenu: pebble => {
            d3.event.preventDefault(); // block browser context menu
            if (forceDiagramState.contextPebble) {
                if (forceDiagramState.contextPebble !== pebble) forceDiagramState.pebbleLinks.push({
                    source: forceDiagramState.contextPebble,
                    target: pebble,
                    right: true
                });
                forceDiagramState.contextPebble = undefined;
            } else forceDiagramState.contextPebble = pebble;
            m.redraw();
        }
    }
})

export let mutateNodes = problem => (state, context) => {
    let pebbles = Object.keys(context.nodes);

    // set radius of each node. Members of groups are scaled down if group gets large.
    pebbles.forEach(pebble => {
        let upperSize = 10;
        let maxNodeGroupSize = Math.max(...context.filtered.groups
            .filter(group => group.nodes.has(pebble))
            .map(group => group.nodes.size), upperSize);
        context.nodes[pebble].radius = state.defaultPebbleRadius * Math.sqrt(upperSize / maxNodeGroupSize);

        if (pebble === state.selectedPebble)
            context.nodes[pebble].radius = Math.min(context.nodes[pebble].radius * 1.5, state.defaultPebbleRadius);
    });

    // if no search string, match nothing
    let matchedVariables = variableSearchText.length === 0 ? []
        : pebbles.filter(variable => variable.toLowerCase().includes(variableSearchText));

    // the order of the keys indicates precedence, lower keys are more important
    let params = {
        predictors: new Set(problem.predictors),
        loose: new Set(problem.tags.loose),
        transformed: new Set(problem.tags.transformed),
        crossSection: new Set(problem.tags.crossSection),
        time: new Set(problem.tags.time),
        nominal: new Set(getNominalVariables(problem)), // include both nominal-casted and string-type variables
        weight: new Set(problem.tags.weights),
        targets: new Set(problem.targets),
        matched: new Set(matchedVariables),
    };

    let strokeWidths = {
        matched: 4,
        crossSection: 4,
        time: 4,
        nominal: 4,
        targets: 4,
        weight: 4
    };

    let nodeColors = {
        crossSection: common.taggedColor,
        time: common.taggedColor,
        nominal: common.taggedColor,
        targets: common.taggedColor,
        weight: common.taggedColor,
        loose: common.selVarColor,
    };
    let strokeColors = {
        matched: 'black',
        crossSection: common.csColor,
        time: common.timeColor,
        nominal: common.nomColor,
        targets: common.dvColor,
        weight: common.weightColor
    };

    // set the base color of each node
    pebbles.forEach(pebble => {
        if (state.summaries[pebble].plottype === 'collapsed') {
            context.nodes[pebble].strokeWidth = 0;
            context.nodes[pebble].nodeCol = 'transparent';
            context.nodes[pebble].strokeColor = 'transparent';
        }
        else {
            context.nodes[pebble].strokeWidth = 1;
            context.nodes[pebble].nodeCol = colors(generateID(pebble));
            context.nodes[pebble].strokeColor = 'transparent';
        }
    });

    // set additional styling for each node
    pebbles.forEach(pebble => Object.keys(params)
    // only apply styles on classes the variable is a member of
        .filter(label => params[label].has(pebble))
        .forEach(label => {
            if (label in strokeWidths) context.nodes[pebble].strokeWidth = strokeWidths[label];
            if (label in nodeColors) context.nodes[pebble].nodeCol = nodeColors[label];
            if (label in strokeColors) context.nodes[pebble].strokeColor = strokeColors[label];
        }));
}

export let forceDiagramLabels = problem => pebble => ['Predictors', 'Loose', 'Targets'].includes(pebble) ? [] : [
    {
        id: 'Group',
        name: 'Group',
        attrs: {fill: common.gr1Color},
        children: [
            {
                id: 'Predictor',
                name: 'Predictor',
                attrs: {fill: common.gr1Color},
                onclick: d => {
                    toggle(problem.tags.loose, d);
                    remove(problem.targets, d);
                    toggle(problem.predictors, d);
                    forceDiagramState.setSelectedPebble(d);
                }
            },
            {
                id: 'Dep',
                name: 'Dep Var',
                attrs: {fill: common.dvColor},
                onclick: d => {
                    toggle(problem.tags.loose, d);
                    remove(problem.predictors, d);
                    toggle(problem.targets, d);
                    forceDiagramState.setSelectedPebble(d);
                }
            }
        ]
    },
    {
        id: 'GroupLabel',
        name: 'Labels',
        attrs: {fill: common.nomColor},
        onclick: forceDiagramState.setSelectedPebble,
        children: [
            {
                id: 'Nominal',
                name: 'Nom',
                attrs: {fill: common.nomColor},
                onclick: d => {
                    toggle(problem.tags.nominal, d);
                    forceDiagramState.setSelectedPebble(d);
                }
            },
            {
                id: 'Time',
                name: 'Time',
                attrs: {fill: common.timeColor},
                onclick: d => {
                    toggle(problem.tags.time, d);
                    forceDiagramState.setSelectedPebble(d);
                }
            },
            {
                id: 'Cross',
                name: 'Cross',
                attrs: {fill: common.csColor},
                onclick: d => {
                    toggle(problem.tags.crossSection, d);
                    forceDiagramState.setSelectedPebble(d);
                }
            },
            {
                id: 'Weight',
                name: 'Weight',
                attrs: {fill: common.weightColor},
                onclick: d => {
                    if (problem.tags.weights.includes(d))
                        problem.tags.weights = [];
                    else {
                        problem.tags.weights = [d];
                        remove(problem.targets, d);
                        remove(problem.tags.time, d);
                        remove(problem.tags.nominal, d);
                        remove(problem.tags.crossSection, d);
                    }
                    forceDiagramState.setSelectedPebble(d);
                }
            }
        ]
    },
];

// Used for left panel variable search
export let variableSearchText = "";
export let setVariableSearchText = text => variableSearchText = text.toLowerCase();

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

// when selected, the key/value [mode]: [pipelineID] is set.
export let setSelectedSolution = (problem, source, solutionId) => {
    solutionId = String(solutionId);

    if (!problem) return;
    let pipelineIds = problem.selectedSolutions[source];
    if (modelComparison) problem.selectedSolutions[source].includes(solutionId)
        ? remove(problem.selectedSolutions[source], solutionId)
        : problem.selectedSolutions[source].push(solutionId)
    else {
        problem.selectedSolutions = Object.keys(problem.selectedSolutions)
            .reduce((out, source) => Object.assign(out, {[source]: []}, {}), {})
        problem.selectedSolutions[source] = [solutionId]
    }
};

function CreatePipelineData(dataset, problem) {

    let pipelineSpec = Object.assign({
        context: apiSession(zparams.zsessionid),
        // uriCsv is also valid, but not currently accepted by ISI TA2
        dataset_uri: dataset.datasetUrl.substring(0, dataset.datasetUrl.lastIndexOf("/tables")) + "/datasetDoc.json",
        // valid values will come in future API
        output: "OUTPUT_TYPE_UNDEFINED",
        // Example:
        // "predictFeatures": [{
        //     "resource_id": "0",
        //     "feature_name": "RBIs"
        // }],
        predictFeatures: problem.predictors.map((predictor, i) => ({resource_id: i, feature_name: predictor})),
        // Example:
        // "targetFeatures": [{
        //     "resource_id": "0",
        //     "feature_name": "At_bats"
        // }],
        targetFeatures: problem.targets.map((target, i) => ({resource_id: i, feature_name: target})),
        task: problem.task,
        taskSubtype: problem.subTask || d3mTaskSubtype.subtypeNone[1],
        taskDescription: problem.description,
        metrics: [problem.metrics],
        maxPipelines: 1
    });
    if (!pipelineSpec.subTask) delete pipelineSpec.subTask;
    return pipelineSpec;
}

// create problem definition for SearchSolutions call
function CreateProblemDefinition(problem) {
    console.log('problem: ' + JSON.stringify(problem));
    let resourceIdFromProblemDoc = problem.firstTarget.resID;
    let problemSpec = {
        // id: problem.problemID,  // remove for API 2019.4.11
        // version: problem.version, // remove for API 2019.4.11
        // name: problem.problemID, // remove for API 2019.4.11
        taskType: d3mTaskType[problem.task][1],
        // taskSubtype: problem.taskSubtype, // TODO: MULTICLASS designation
        taskSubtype: problem.taskSubtype || d3mTaskSubtype.subtypeNone[1],

        performanceMetrics: [{metric: d3mMetrics[problem.metric][1]}]  // need to generalize to case with multiple metrics.  only passes on first presently.
    };
    if (problemSpec.taskSubtype === 'taskSubtypeUndefined') delete problemSpec.taskSubtype;

    let inputSpec =  [
        {
            datasetId: workspace.d3m_config.name,
            targets: problem.targets.map((target, resourceId) => ({
                resourceId: resourceIdFromProblemDoc,
                columnIndex: Object.keys(variableSummaries).indexOf(target),  // Adjusted to match dataset doc
                columnName: target
            }))
        }
    ];

    return {problem: problemSpec, inputs: inputSpec};
}

// Create a problem description that follows the Problem Schema, for the Task 1 output.
function CreateProblemSchema(problem){
    return {
        about: {
            problemID: problem.problemID,
            problemName: problem.problemID,
            problemDescription: problem.description,
            taskType: d3mTaskType[problem.task][1],
            problemVersion: '1.0',
            problemSchemaVersion: '3.1.1'
        },
        inputs: {
            data: [
                {
                    datasetId: workspace.d3m_config.name,
                    targets: problem.targets.map((target, resourceId) => ({
                        // resourceId: resourceIdFromDatasetDoc,
                        columnIndex: Object.keys(variableSummaries).indexOf(target),
                        columnName: target
                    }))
                }],
            dataSplits: {
                method: 'holdOut',
                testSize: 0.2,
                stratified: true,
                numRepeats: 0,
                randomSeed: 123,
                splitsFile: 'dataSplits.csv'
            },
            performanceMetrics: [{metric: d3mMetrics[problem.metric][1]}]
        },
        expectedOutputs: {
            predictionsFile: 'predictions.csv'
        }
    };
}

function CreatePipelineDefinition(problem, timeBound) {
    return {
        userAgent: TA3_GRPC_USER_AGENT, // set on django
        version: TA3TA2_API_VERSION, // set on django
        timeBoundSearch: timeBound || 1,
        priority: 1,
        allowedValueTypes: ['DATASET_URI', 'CSV_URI'],
        problem: CreateProblemDefinition(problem),
        template: makePipelineTemplate(problem),
        inputs: [{dataset_uri: 'file://' + workspace.d3m_config.dataset_schema}]
    };
}



function CreateFitDefinition(datasetDocUrl, solutionId) {
    return Object.assign(
        getFitSolutionDefaultParameters(datasetDocUrl),
        {solutionId}
    );
}

/**
    Return the default parameters used for a FitSolution call.
    This DOES NOT include the solutionID
 */
export function getFitSolutionDefaultParameters(datasetDocUrl) {
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

function CreateProduceDefinition(fittedSolutionId) {
    return Object.assign(
        getProduceSolutionDefaultParameters(),
        {fittedSolutionId}
    );
}

/*
  Return the default parameters used for a ProduceSolution call.
  This DOES NOT include the fittedSolutionId
*/
export function getProduceSolutionDefaultParameters(datasetDocUrl){
    return {
        inputs: [{dataset_uri: 'file://' + datasetDocUrl}],
        exposeOutputs: ['outputs.0'],
        exposeValueTypes: ['CSV_URI']
    };
}



function CreateScoreDefinition(res){

  if (res.response.solutionId === undefined){
      let errMsg = 'ERROR: CreateScoreDefinition. solutionId not set.';
      console.log(errMsg);
      return {errMsg};
  }

  return Object.assign(
      getScoreSolutionDefaultParameters(getResultsProblem()),
      {solutionId: res.response.solutionId});
}

/*
  Return the default parameters used for a ProduceSolution call.
  This DOES NOT include the solutionId
*/
function getScoreSolutionDefaultParameters(problem, datasetDocUrl) {
    return {
        inputs: [{dataset_uri: 'file://' + datasetDocUrl}],
        performanceMetrics: [
            {metric: d3mMetrics[problem.metric][1]}
        ],
        users: [{id: 'TwoRavens', chosen: false, reason: ""}],
        // note: FL only using KFOLD in latest iteration (3/8/2019)
        configuration: {method: 'K_FOLD', folds: 0, trainTestRatio: 0, shuffle: false, randomSeed: 0, stratified: false}
    };
}



export function downloadIncomplete() {
    if (PRODUCTION && zparams.zsessionid === '') {
        alertWarn('Warning: Data download is not complete. Try again soon.');
        return true;
    }
    return false;
}

/**
    called by clicking 'Solve This Problem' in model mode
*/
export async function estimate() {
    if (solverProblem.d3m) {
        alertWarn('Another problem is still being solved. Please wait until the solver for ' + solverProblem.d3m.problemId + ' is complete.')
        return;
    }

    let selectedProblem = getSelectedProblem();

    // return if current problem already has solutions
    if (getSolutions(copiedProblem).length > 0) return;

    selectedProblem.pending = false; // a problem with solutions is no longer pending

    let copiedProblem = getProblemCopy(selectedProblem);
    let ravenConfig = workspace.raven_config;

    ravenConfig.problems[copiedProblem.problemID] = copiedProblem;
    ravenConfig.resultsProblem = selectedProblem.problemID;

    solverProblem.d3m = selectedProblem;
    selectedProblem.solved = true;

    if (!IS_D3M_DOMAIN){
        // let userUsg = 'This code path is no longer used.  (Formerly, it used Zelig.)';
        // console.log(userMsg);
        // alert(userMsg);
        // return;
        //
        // if (downloadIncomplete()) {
        //     return;
        // }
        // zPop();
        // // write links to file & run R CMD
        // // package the output as JSON
        // // add call history and package the zparams object as JSON
        // zparams.callHistory = callHistory;
        // zparams.allVars = valueKey.slice(10, 25); // because the URL is too long...
        //
        //
        // laddaState['btnEstimate'] = true;
        // m.redraw()
        //
        // let json = await makeRequest(ROOK_SVC_URL + 'zeligapp', zparams);
        // if (!json) {
        //     estimated = true;
        // } else {
        //     allResults.push(json);
        //     if (!estimated) byId("tabResults").removeChild(byId("resultsHolder"));
        //
        //     estimated = true;
        //     d3.select("#tabResults")
        //         .style("display", "block");
        //     d3.select("#resultsView")
        //         .style("display", "block");
        //     d3.select("#modelView")
        //         .style("display", "block");
        //
        //     // programmatic click on Results button
        //     trigger("btnSetx", "click"); // Was "btnResults" - changing to simplify user experience for testing.
        //
        //     let model = "Model".concat(modelCount = modelCount + 1);
        //
        //     function modCol() {
        //         d3.select("#modelView")
        //             .selectAll("p")
        //             .style('background-color', hexToRgba(varColor));
        //     }
        //     modCol();
        //
        //     d3.select("#modelView")
        //         .insert("p", ":first-child") // top stack for results
        //         .attr("id", model)
        //         .text(model)
        //         .style('background-color', hexToRgba(common.selVarColor))
        //         .on("click", function() {
        //             var a = this.style.backgroundColor.replace(/\s*/g, "");
        //             var b = hexToRgba(common.selVarColor).replace(/\s*/g, "");
        //             if (a.substr(0, 17) == b.substr(0, 17))
        //                 return; // escape function if displayed model is clicked
        //             modCol();
        //             d3.select(this)
        //                 .style('background-color', hexToRgba(common.selVarColor));
        //             viz(this.id);
        //         });
        //
        //     let rCall = [json.call];
        //     showLog('estimate', rCall);
        //
        //     viz(model);
        // }
        return;
    }

    // IS_D3M_DOMAIN and swandive is true
    if (swandive) {
        zparams.callHistory = callHistory;

        buttonLadda.btnEstimate = false;

        alertError('estimate() function. Check app.js error with swandive (err: 003)');
        //let res = await makeRequest(D3M_SVC_URL + '/SearchSolutions', CreatePipelineDefinition(resultsProblem, 10));
        //res && onPipelineCreate(res);   // arguments were wrong, and this function no longer needed
        return;
    }

    // we are in IS_D3M_DOMAIN no swandive
    // rpc CreatePipelines(PipelineCreateRequest) returns (stream PipelineCreateResult) {}
    // zPop();
    zparams.callHistory = callHistory;

    // pipelineapp is a rook application that returns the dependent variable, the DV values, and the predictors. can think of it was a way to translate the potentially complex grammar from the UI

    buttonLadda.btnEstimate = true;
    m.redraw();

    try {
        selectedProblem.dvvalues = await manipulate.getData({
            method: 'aggregate',
            query: JSON.stringify(queryMongo.buildPipeline(
                [...ravenConfig.hardManipulations, ...selectedProblem.manipulations, {
                    type: 'menu',
                    metadata: {
                        type: 'data',
                        variables: ['d3mIndex', ...selectedProblem.targets],
                        sample: 1000
                    }
                }],
                ravenConfig.variablesInitial)['pipeline'])
        })
    } catch(err) {
        alertWarn('Dependent variables have not been loaded. Some plots will not load.')
    }

    let searchTimeLimit = 5;
    let searchSolutionParams = CreatePipelineDefinition(selectedProblem, searchTimeLimit);

    let nominalVars = new Set(getNominalVariables(selectedProblem));

    let hasManipulation = selectedProblem.manipulations.length > 0;
    let hasNominal = [...selectedProblem.targets, ...selectedProblem.predictors]
        .some(variable => nominalVars.has(variable));

    let needsProblemCopy = hasManipulation || hasNominal;

    let datasetPath = workspace.datasetUrl;
    // TODO: upon deleting or reassigning datasetDocProblemUrl, server-side temp directories may be deleted
    if (needsProblemCopy) {
        let {data_path, metadata_path} = await manipulate.buildProblemUrl(selectedProblem);
        selectedProblem.datasetDocPath = metadata_path;
        datasetPath = data_path;
    } else delete selectedProblem.datasetDocPath;

    // initiate rook solver
    // - TO-FIX 5/22/2019
    //callSolver(selectedProblem, datasetPath);

    let datasetDocPath = selectedProblem.datasetDocPath || workspace.d3m_config.dataset_schema;

    let allParams = {
        searchSolutionParams: searchSolutionParams,
        fitSolutionDefaultParams: getFitSolutionDefaultParameters(datasetDocPath),
        produceSolutionDefaultParams: getProduceSolutionDefaultParameters(datasetDocPath),
        scoreSolutionDefaultParams: getScoreSolutionDefaultParameters(selectedProblem, datasetDocPath)
    };

    //let res = await makeRequest(D3M_SVC_URL + '/SearchSolutions',
    let res = await makeRequest(D3M_SVC_URL + '/SearchDescribeFitScoreSolutions', allParams);
    console.log(JSON.stringify(res));
    if (res === undefined) {
        handleENDGetSearchSolutionsResults();
        alertError('SearchDescribeFitScoreSolutions request Failed! ' + res.message);
        return;
    } else if (!res.success) {
        handleENDGetSearchSolutionsResults();
        alertError('SearchDescribeFitScoreSolutions request Failed! ' + res.message);
        return;
    }

    let searchId = res.data.searchId;
    allsearchId.push(searchId);
}

export async function makeRequest(url, data) {
    // console.log('url:', url);
    // console.log('POST:', data);
    let res;
    try {
        res = await m.request(url, {method: 'POST', data: data});
        // console.log('response:', res);
        if (Object.keys(res)[0] === 'warning') {
            // alertWarn('Warning: ' + res.warning);
            end_ta3_search(false, res.warning);
        }
    } catch(err) {
        end_ta3_search(false, err);
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
            end_ta3_search(false, "grpc response status not ok");
        }
    }
    */

    if (!IS_D3M_DOMAIN) {
        buttonLadda['btnEstimate'] = false;
        m.redraw()
    }
    return res;
}

// programmatically deselect every selected variable
export let erase = () => {
    let problem = getSelectedProblem();
    problem.predictors = [];
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
}

/**
   converts color codes
*/
export let hexToRgba = (hex, alpha) => {
    let int = parseInt(hex.replace('#', ''), 16);
    return `rgba(${[(int >> 16) & 255, (int >> 8) & 255, int & 255, alpha || '0.5'].join(',')})`;
};

/**
   EndSession(SessionContext) returns (Response) {}
*/
export async function endsession() {
    let resultsProblem = getResultsProblem();

    let solutions = resultsProblem.solutions;
    if(Object.keys(solutions.d3m).length === 0) {
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
        setModal("Your selected pipeline has been submitted.", "Task Complete", true, false, false, locationReload);
    //}
}

export let reverseSet = ["meanSquaredError", "rootMeanSquaredError", "rootMeanSquaredErrorAvg", "meanAbsoluteError"];  // array of metrics to sort low to high

/**
 Sort the Pipeline table, putting the highest score at the top
 */
export function sortPipelineTable(a, b) {
    if (a === b) return 0;
    if (a === "scoring") return 100;
    if (b === "scoring") return -100;
    if (a === "no score") return 1000;
    if (b === "no score") return -1000;
    return (parseFloat(b) - parseFloat(a)) * (reverseSet.includes(getSelectedProblem().metric) ? -1 : 1);
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

export function getDescription(problem) {
    if (problem.description) return problem.description;
    return `${problem.targets} is predicted by ${problem.predictors.slice(0, -1).join(", ")} ${problem.predictors.length > 1 ? 'and ' : ''}${problem.predictors[problem.predictors.length - 1]}`;
}

export function discovery(problems) {
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

        out[problemID] = {
            problemID,
            system: "auto",
            description: undefined,
            predictors: [...coerceArray(prob.predictors), ...getTransformVariables(manips)],
            targets: [prob.target],
            // NOTE: if the target is manipulated, the metric/task could be wrong
            metric: variableSummaries[prob.target].plottype === "bar" ? 'f1Macro' : 'meanSquaredError',
            task: variableSummaries[prob.target].plottype === "bar" ? 'classification' : 'regression',
            subTask: 'taskSubtypeUndefined',
            meaningful: false,
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
                transformed: [...manipulate.getTransformVariables(manips)], // this is used when updating manipulations pipeline
                weights: [], // singleton list
                crossSection: [],
                time: [],
                nominal: [],
                loose: [] // variables displayed in the force diagram, but not in any groups
            },
            summaries: {} // this gets populated below
        };
        return out;
    }, {});
}

// creates a new problem from the force diagram problem space and adds to disco
export async function addProblemFromForceDiagram() {
    let problemCopy = getProblemCopy(getSelectedProblem());
    workspace.raven_config.problems[problemCopy.problemID] = problemCopy;

    setSelectedProblem(problemCopy.problemID);
    setLeftTab('Discover');
    m.redraw();
}

export function connectAllForceDiagram() {
    let problem = getSelectedProblem();

    if (is_explore_mode) {
        let pebbles = [...problem.predictors, ...problem.targets];
        forceDiagramState.pebbleLinks = pebbles
            .flatMap((pebble1, i) => pebbles.slice(i + 1, pebbles.length)
                .map(pebble2 => ({
                    source: pebble1, target: pebble2
                })))
    }
    else forceDiagramState.pebbleLinks = problem.predictors
        .flatMap(source => problem.targets
            .map(target => ({
                source, target, right: true
            })))
    m.redraw();
}

// TODO: apply label in this setter?
export let setVariableSummaries = state => {
    variableSummaries = state;

    // quality of life
    Object.keys(variableSummaries).forEach(variable => variableSummaries[variable].name = variable);
}
export let variableSummaries = {};


/*
 *  'Save' button - Variables related to displaying a modal message
 */
export let saveCurrentWorkspaceWindowOpen = false;
// Open/close modal window
export let setSaveCurrentWorkspaceWindowOpen = (boolVal) => {
  saveCurrentWorkspaceWindowOpen = boolVal;
}

/*
 *  'Save' button - Message to display in the modal window
 */

// set/get user messages for new workspace
export let currentWorkspaceSaveMsg = '';

// success message
export let setCurrentWorkspaceMessageSuccess = (errMsg) => {
  currentWorkspaceSaveMsg = m('p', {class: 'text-success'}, errMsg);
}

// error message
export let setCurrentWorkspaceMessageError = (errMsg) => {
  currentWorkspaceSaveMsg = m('p', {class: 'text-danger'}, errMsg);
}
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


/*
*  Variables related to saving a new user workspace
*/

// Name of Modal window
export let isSaveNameModelOpen = false;

/*
 * open/close the modal window
 */
export let setSaveNameModalOpen = (boolVal) => {
  isSaveNameModelOpen = boolVal;

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
}
// Display for the Close Modal success
export let displayCloseButtonRow = true;
export let setDisplayCloseButtonRow = (boolVal) => {
  displayCloseButtonRow = boolVal;
}

// set/get new workspace name
export let newWorkspaceName = '';
export let setNewWorkspaceName = (newName) => newWorkspaceName = newName;
export let getNewWorkspaceName = () => { return newWorkspaceName; };

// set/get user messages for new workspace
export let newWorkspaceMessage = '';
// success message
export let setNewWorkspaceMessageSuccess = (errMsg) => {
  newWorkspaceMessage = m('p', {class: 'text-success'}, errMsg);
}
// error message
export let setNewWorkspaceMessageError = (errMsg) => {
  newWorkspaceMessage = m('p', {class: 'text-danger'}, errMsg);
}
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

      // Success! Update the name and the workspace id
      workspace.user_workspace_id = save_result.data.user_workspace_id;
      workspace.name = save_result.data.name;

      setNewWorkspaceMessageSuccess('The new workspace name has been saved!');
      setDisplayCloseButtonRow(true);
   })
 };
 /*
  * END: saveAsNewWorkspace
  */



export let getD3MConfig = () => (workspace || {}).d3m_config;

export let getSelectedProblem = () => {
    if (!workspace) return;
    let ravenConfig = workspace.raven_config;
    if (!ravenConfig) return;
    return ravenConfig.problems[ravenConfig.selectedProblem];
}
export let getResultsProblem = () => {
    if (!workspace) return;
    let ravenConfig = workspace.raven_config;
    if (!ravenConfig) return;
    return ravenConfig.problems[ravenConfig.resultsProblem];
}

export let getSolutions = (problem, source) => {
    if (!problem) return [];

    if (!source) return Object.keys(problem.selectedSolutions)
        .flatMap(source => problem.selectedSolutions[source]
            .map(id => problem.solutions[source][id])).filter(_=>_)

    return problem.selectedSolutions[source]
        .map(id => problem.solutions[source][id]).filter(_=>_)
};

export let getNominalVariables = problem => {
    let selectedProblem = problem || getSelectedProblem();
    return [...new Set([
        ...Object.keys(variableSummaries).filter(variable => variableSummaries[variable].nature === 'nominal'),
        ...selectedProblem.tags.nominal])
    ];
};

export let getBaselineModels = problem => {
    // TODO: filter found models with a trivial hyperparameter grid
    return [...baselineModelTypes[problem.task], 'modelUndefined']
}

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
    confusionFactor = undefined;
}

export function setResultsProblem(problemID) {
    workspace.raven_config.resultsProblem = problemID;
}

export function getProblemCopy(problemSource) {
    // deep copy of original
    return Object.assign($.extend(true, {}, problemSource), {
        problemID: generateProblemID(),
        provenanceID: problemSource.problemID,
        system: 'user'
    });
}

// When enabled, multiple pipelineTable pipelineIDs may be selected at once
export let modelComparison = false;
export let setModelComparison = state => {
    let resultsProblem = getResultsProblem();
    let selectedSolutions = getSolutions(resultsProblem);

    if (selectedSolutions.length > 1 && !state)
        setSelectedSolution(resultsProblem, selectedSolutions[0].source, selectedSolutions[0])

    modelComparison = state;
};

export let setCheckedDiscoveryProblem = (status, problemID) => {
    let ravenConfig = workspace.raven_config;
    if (problemID)
        ravenConfig.problems[problemID].meaningful = status;
    else
        Object.keys(ravenConfig.problems)
            .forEach(problemID => ravenConfig.problems[problemID].meaningful = status)
};

export async function submitDiscProb() {
    let problems = workspace.raven_config.problems;
    buttonLadda['btnSubmitDisc'] = true;
    m.redraw()

    let outputCSV = Object.keys(problems).reduce((out, problemID) => {
        let problem = problems[problemID];


        if(problem.manipulations.length === 0){
            // construct and write out the api call and problem description for each discovered problem
            let problemApiCall = CreatePipelineDefinition(problem, 10);
            let problemProblemSchema = CreateProblemSchema(problem);
            let filename_api = problem.problemID + '/ss_api.json';
            let filename_ps = problem.problemID + '/schema.json';
            makeRequest(D3M_SVC_URL + '/store-user-problem', {filename: filename_api, data: problemApiCall } );
            makeRequest(D3M_SVC_URL + '/store-user-problem', {filename: filename_ps, data: problemProblemSchema } );
        } else {
            console.log('omitting:');
            console.log(problem);
        }
    });

    // write the CSV file requested by NIST that describes properties of the solutions
    console.log(outputCSV);
    let res3 = await makeRequest(D3M_SVC_URL + '/store-user-problem', {filename: 'labels.csv', data: outputCSV});

    buttonLadda.btnSubmitDisc = false;
    buttonClasses.btnSubmitDisc = 'btn-secondary';
    buttonClasses.btnDiscover = 'btn-secondary';
    if (!task2_finished) buttonClasses.btnEstimate = 'btn-secondary';

    task1_finished = true;
    m.redraw()

    if (!problemDocExists)
        setModal("Your discovered problems have been submitted.", "Task Complete", true, false, false, locationReload);
}

export function deleteProblem(preprocessID, version, problemID) {
    console.log("Delete problem clicked")
    setSelectedProblem(undefined);
    m.request({
        method: "POST",
        url: "http://127.0.0.1:4354/preprocess/problem-section-delete",
        data: {preprocessID, version, problemID}
    })
        .then(function(result) {
            console.log(result)
        })

}

export function xhandleAugmentDataMessage(msg_data) {

    if (!msg_data) {
        console.log('handleAugmentDataMessage: Error.  "msg_data" undefined');
        return;
    }
    if (msg_data.success === true) {
        console.log('Successful Augment.  Try to reload now!!');
        console.log(msg_data.user_message);

        setModal("Successful data augmentation. Please reload the page. ",
            "Data Augmentation", true, "Reload", false, locationReload);

        return
    }

    setModal("Data augmentation error: " + msg_data.user_message,
        "Data Augmentation Failed", true, "Close", true);

}


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

export function handleAugmentDataMessage(msg_data){

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
      setModal(undefined, undefined, false)
      load()
      });


  // console.log('datamart_id: ' + msg_data.data.datamart_id);
  // console.log('filesize: ' + msg_data.data.filesize);

} // end: handleAugmentDataMessage

let ravenPipelineID = 0;

// when a solver is in the process of solving a problem, the problem to save to is stored here:
export let solverProblem = {
    rook: undefined,
    d3m: undefined
}

// takes as input problem, calls rooksolver, and stores result
export async function callSolver(prob, datasetPath=undefined) {
    if (solverProblem.rook) {
        alertWarn('Another problem is still being solved. Please wait until the solver for ' + solverProblem.rook.problemId + ' is complete.')
        return;
    }
    setSolverPending(false);

    let hasManipulation = [...workspace.raven_config.hardManipulations, ...prob.manipulations].length > 0;
    let hasNominal = [prob.targets, ...prob.predictors].some(variable => zparams.znom.includes(variable));

    if (!datasetPath)
        datasetPath = hasManipulation || hasNominal ? await manipulate.buildDatasetUrl(prob) : workspace.datasetUrl;

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
    let probReduced = Object.assign({}, prob)
    delete probReduced.solutions;
    delete probReduced.metric;

    solverProblem.rook = prob;
    m.redraw();

    for (let param of params) await makeRequest(ROOK_SVC_URL + 'solverapp', Object.assign({
        problem: probReduced,
        dataset_path: datasetPath,
        samples: prob.dvvalues && prob.dvvalues.map(point => point.d3mIndex)
    }, param)).then(response => {

        // assign source and remove errant fits
        Object.keys(response.results)
            .forEach(result => {

                response.results[result].source = 'rook'
                if ('error' in response.results[result])
                    delete response.results[result]
                else if (Object.keys(response.results[result].models)
                    .some(target => 'error' in response.results[result].models[target]))
                    delete response.results[result]
            })

        // add to rook solutions
        Object.assign(prob.solutions.rook, response.results)
        let selectedPipelines = getSolutions(prob);
        if (selectedPipelines.length === 0) setSelectedSolution(prob, 'rook', Object.keys(prob.solutions.rook)[0]);
        m.redraw()
    })

    solverProblem.rook = undefined;
    m.redraw();
}


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
let generateID = text => Array.from({length: text.length})
    .reduce((hash, _, i) => ((hash << 5) - hash + text.charCodeAt(i)) | 0, 0);

export let omniSort = (a, b) => {
    if (a === undefined && b !== undefined) return -1;
    if (b === undefined && a !== undefined) return 1;
    if (a === b) return 0;
    if (typeof a === 'number') return a - b;
    if (typeof a === 'string') return  a.localeCompare(b);
    return (a < b) ? -1 : 1;
};
