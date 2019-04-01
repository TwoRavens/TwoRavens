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
import {groupBuilder, groupLinkBuilder, linkBuilder, pebbleBuilder} from "./views/ForceDiagram";


//-------------------------------------------------
// NOTE: global variables are now set in the index.html file.
//    Developers, see /template/index.html
//-------------------------------------------------

// ~~~~~ PEEK ~~~~~
// for the second-window data preview
window.addEventListener('storage', (e) => {
    if (e.key !== 'peekMore' + peekId || peekIsLoading) return;
    if (localStorage.getItem('peekMore' + peekId) !== 'true' || peekIsExhausted) return;
    localStorage.setItem('peekMore' + peekId, 'false');
    updatePeek([...getSelectedDataset().hardManipulations, ...getSelectedProblem().manipulations]);
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

// ~~~~ MANIPULATIONS STATE ~~~~
export let mongoURL = '/eventdata/api/';
export let datamartURL = '/datamart/api/';

// this contains an object of abstract descriptions of pipelines of manipulations for eventdata
export let eventDataPipeline;

// The JQtrees can't store references to objects within their callbacks.
// The manipulations proxy allows manipulations pipelines to be stored inside problems (where they belong!)
export let manipulations = new Proxy({}, {
    ownKeys() {
        // if no dataset selected, then there are no manipulations
        return selectedDataset
            ? [selectedDataset, ...Object.keys(datasets[selectedDataset].problems)]
            : []
    },
    has(_, key) {
        return key in datasets || key in (datasets[selectedDataset] || {}).problems
    },
    get(obj, manipulationID) {
        if (IS_EVENTDATA_DOMAIN && manipulationID === 'eventdata') return eventDataPipeline;
        return selectedDataset && datasets[selectedDataset].problems[manipulationID].manipulations;
    }
});

// Holds steps that aren't part of a pipeline (for example, pending subset or aggregation in eventdata)
export let looseSteps = {};

export let formattingData = {};
export let alignmentData = {};
// ~~~~

export let buttonLadda = {
    btnSubmitDisc: false,
    btnEstimate: false
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
export let problemDocExists = true;
export let univariate_finished = false;

export let allsearchId = [];            // List of all the searchId's created on searches

export let currentMode;
export let is_model_mode = true;
export let is_explore_mode = false;
export let is_results_mode = false;
export let is_manipulate_mode = false;
export let ROOKPIPE_FROM_REQUEST;  // rookpipe needed within websocket handler functions

let exportCount = 0;

export function set_mode(mode) {
    mode = mode ? mode.toLowerCase() : 'model';

    // remove empty steps when leaving manipulate mode
    if (selectedDataset && (domainIdentifier || {}).name in manipulations && is_manipulate_mode && mode !== 'manipulate') {
        manipulations[domainIdentifier.name] = manipulations[domainIdentifier.name].filter(step => {
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
            let dataset = getSelectedDataset();
            buildDatasetPreprocess(dataset).then(response => {
                dataset.summaries = response.variables;
                dataset.problems = discovery(response.dataset.discovery);
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

    let ws = elem('#whitespace0');
    if (ws) {
        ws.style.display = is_explore_mode ? 'none' : 'block';
    }
}

// TODO: should have an early exit if the manipulations are empty
export let buildDatasetPreprocess = async dataset => await getData({
    method: 'aggregate',
    query: JSON.stringify(queryMongo.buildPipeline(
        dataset.hardManipulations,
        Object.keys(dataset.variablesInitial))['pipeline']),
    export: 'dataset'
}).then(url => m.request({
    method: 'POST',
    url: ROOK_SVC_URL + 'preprocessapp',
    data: url
}));

export let buildProblemPreprocess = async (dataset, problem) => problem.manipulations.length === 0
    ? dataset.summaries
    : await getData({
        method: 'aggregate',
        query: JSON.stringify(queryMongo.buildPipeline(
            [...dataset.hardManipulations, ...problem.manipulations, {
                type: 'menu',
                metadata: {
                    type: 'data',
                    variables: [...problem.predictors, problem.targets],
                    nominal: problem.tags.nominal
                }
            }],
            Object.keys(dataset.variablesInitial))['pipeline']),
        export: 'dataset'
    }).then(url => m.request({
        method: 'POST',
        url: ROOK_SVC_URL + 'preprocessapp',
        data: url
    }));

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

// panelWidth is meant to be read only
export let panelWidth = {
    'left': '0',
    'right': '0'
};

export let updateRightPanelWidth = () => {
    if (is_explore_mode) panelWidth.right = `calc(${common.panelMargin}*2 + 16px)`;
    // else if (is_model_mode && !selectedProblem) panelWidth.right = common.panelMargin;
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

common.setPanelCallback('right', updateRightPanelWidth);
common.setPanelCallback('left', updateLeftPanelWidth);


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

    if (msg_data.data === undefined) {
        console.log('streamSocket.onmessage: Error, "msg_data.data" type not specified!');
        console.log('full data: ' + JSON.stringify(msg_data));
        console.log('---------------------------------------------');
        return;
    }
    console.log('full data: ' + JSON.stringify(msg_data));

  console.log('Got it! Message type: ' + msg_data.msg_type);
  //JSON.stringify(msg_data));

  if (msg_data.msg_type === 'GetSearchSolutionsResults'){
    console.log(msg_data.msg_type + ' recognized!');

    handleGetSearchSolutionResultsResponse(msg_data.data);

  } else if (msg_data.msg_type === 'DescribeSolution'){
    console.log(msg_data.msg_type + ' recognized!');

    handleDescribeSolutionResponse(msg_data.data);

  } else if (msg_data.msg_type === 'GetScoreSolutionResults'){
    console.log(msg_data.msg_type + ' recognized!');
    handleGetScoreSolutionResultsResponse(msg_data.data);

  } else if (msg_data.msg_type === 'GetProduceSolutionResults'){
    console.log(msg_data.msg_type + ' recognized!');

    handleGetProduceSolutionResultsResponse(msg_data.data);

  } else if (msg_data.msg_type === 'GetFitSolutionResults'){
    console.log(msg_data.msg_type + ' recognized!');

    console.log('No handler: Currently not using GetFitSolutionResultsResponse...');

  } else if (msg_data.msg_type === 'ENDGetSearchSolutionsResults'){
    console.log(msg_data.msg_type + ' recognized!');

    handleENDGetSearchSolutionsResults();

  } else if (msg_data.msg_type === 'DATAMART_MATERIALIZE_PROCESS'){
    console.log(msg_data.msg_type + ' recognized!');
    handleMaterializeDataMessage(msg_data);

  } else if (msg_data.msg_type === 'DATAMART_AUGMENT_PROCESS'){
    console.log(msg_data.msg_type + ' recognized!');
    handleAugmentDataMessage(msg_data);

  } else {
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
    classification: ["description", "CLASSIFICATION" , 1],
    regression: ["description", "REGRESSION" , 2],
    clustering: ["description", "CLUSTERING", 3],
    linkPrediction: ["description", "LINK_PREDICTION" , 4],
    vertexNomination: ["description", "VERTEX_NOMINATION" , 5],
    communityDetection: ["description", "COMMUNITY_DETECTION" , 6],
    graphClustering: ["description", "GRAPH_CLUSTERING" , 7],
    graphMatching: ["description", "GRAPH_MATCHING" , 8],
    timeSeriesForecasting: ["description", "TIME_SERIES_FORECASTING" , 9],
    collaborativeFiltering: ["description", "COLLABORATIVE_FILTERING" , 10]
};

export let d3mTaskSubtype = {
    taskSubtypeUndefined:["description", "TASK_SUBTYPE_UNDEFINED", 0],
    subtypeNone:["description","NONE",1],
    binary:["description", "BINARY" , 2],
    multiClass:["description", "MULTICLASS" , 3],
    multiLabel:["description", "MULTILABEL" , 4],
    univariate:["description", "UNIVARIATE" , 5],
    multivariate:["description", "MULTIVARIATE" , 6],
    overlapping:["description", "OVERLAPPING" , 7],
    nonOverlapping:["description", "NONOVERLAPPING" , 8]
};
/*export let d3mOutputType = {
    outputUndefined:["description","OUTPUT_TYPE_UNDEFINED ", 0],
    predictionsFile:["description","PREDICTIONS_FILE",1],
    scoresFile:["description","SCORES_FILE",2]
}; */
export let d3mMetrics = {
    metricUndefined:["description", "METRIC_UNDEFINED" , 0],
    executionTime:["description", "EXECUTION_TIME", 1],
    accuracy : ["description", "ACCURACY" , 2],
    f1:["description", "F1" , 3],
    f1Micro:["description", "F1_MICRO" , 4],
    f1Macro:["description", "F1_MACRO" , 5],
    rocAuc:["description", "ROC_AUC" , 6],
    rocAucMicro:["description", "ROC_AUC_MICRO" , 7],
    rocAucMacro:["description", "ROC_AUC_MACRO" , 8],
    meanSquaredError:["description", "MEAN_SQUARED_ERROR", 9],
    rootMeanSquaredError:["description", "ROOT_MEAN_SQUARED_ERROR" , 10],
    rootMeanSquaredErrorAvg:["description", "ROOT_MEAN_SQUARED_ERROR_AVG" , 11],
    meanAbsoluteError:["description", "MEAN_ABSOLUTE_ERROR" , 12],
    rSquared:["description", "R_SQUARED" , 13],
    normalizedMutualInformation:["description", "NORMALIZED_MUTUAL_INFORMATION" , 14],
    jaccardSimilarityScore:["description", "JACCARD_SIMILARITY_SCORE" , 15]
};

export let twoRavensModelTypes = {
    regression: ['modelUndefined', 'Linear', 'Logistic', 'Negative Binomial', 'Poisson'],
    classification: ['modelUndefined'],
    clustering: ['modelUndefined', 'KMeans']
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
  called by main
  Loads all external data in the following order (logic is not included):
  1. Retrieve the configuration information
  2. Set 'configurations'
  3. Read the data document and set 'datadocument'
  4. Read preprocess data or (if necessary) run preprocess
  5. Read the d3m problem schema and add to problems
  6. Read in zelig models (not for d3m)
  7. Read in zeligchoice models (not for d3m)
*/
async function load(hold, lablArray, d3mRootPath, d3mDataName, d3mPreprocess, d3mData, d3mPS, d3mDS, pURL) {
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

    let d3m_config_url = '/user-workspaces/d3m-configs/json/latest';

    let config_result = await m.request({
        method: "POST",
        url: d3m_config_url
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
    let configurations;
    for (const one_config of config_result.data) {
        if (one_config.is_current_workspace){
          configurations = one_config;
          break;
        }
    }
    if (!configurations){
        setModal('No current workspace config in list!', "Error retrieving User Workspace configuration.", true, "Reset", false, locationReload);
    }

    // Take the 1st configuration from the list -- for now...
    //let configurations = config_result.data[0]

    // console.log("this is the config file:");
    // console.log(configurations);

    // ---------------------------------------
    // 2. Set 'configurations'
    // ---------------------------------------
    console.log('---------------------------------------');
    console.log('-- 2. Set "configurations" --');

    $('#user-workspace-id').html('(ws:' + configurations.user_workspace_id +')');

    if (configurations.d3m_input_dir){
      // 2019 config
      d3mRootPath = configurations.d3m_input_dir;
    }else{
      // 2018 config
      d3mRootPath = configurations.training_data_root.replace(/\/data/,'');
    }

    d3mDataName = configurations.name;

    // scopes at app.js level; used for saving workspace
    domainIdentifier = {name: configurations.name,
                        source_url: configurations.config_url,
                        description: 'D3M config file'};
                        //id: configurations.id};

    // url example: /config/d3m-config/get-problem-schema/json/39
    //
    d3mPS = configurations.problem_schema_url;
    // url example: /config/d3m-config/get-dataset-schema/json/39
    //
    d3mDS = configurations.dataset_schema_url;

    // need to change?
    //
    d3mPreprocess = pURL = `rook-custom/rook-files/${d3mDataName}/preprocess/preprocess.json`;
    console.log(d3mPreprocess);


    /**
     * 3. Read the data document and set 'datadocument'
     */
    console.log('---------------------------------------');
    console.log("-- 3. Read the data document and set 'datadocument' --");

    let resDataDocument = await m.request(d3mDS);
    // sets the dataset, which prepares internal state
    setSelectedDataset(resDataDocument.about.datasetID);
    let selectedDataset = getSelectedDataset();
    selectedDataset.datasetDoc = resDataDocument;
    selectedDataset.datasetDocPath = configurations.dataset_schema;

    // 3. Set datadocument columns!

    let datadocument_columns = (resDataDocument.dataResources.find(resource => resource.columns) || {}).columns;
    if (datadocument_columns === undefined) {
        console.log('D3M WARNING: datadocument.dataResources[x].columns is undefined.');
        swandive = true;
    }

    if (!IS_D3M_DOMAIN) {
        // Note: presently xml is no longer being read from Dataverse metadata anywhere
        let temp = xml.documentElement.getElementsByTagName("fileName");
        zparams.zdata = temp[0].childNodes[0].nodeValue;
        let cite = xml.documentElement.getElementsByTagName("biblCit");
        // clean citation so POST is valid json
        zparams.zdatacite = cite[0].childNodes[0].nodeValue
            .replace(/\&/g, "and")
            .replace(/\;/g, ",")
            .replace(/\%/g, "-");
        // fill in citation in header
        byId('cite').children[0].textContent = zparams.zdatacite;
    }

    if (swandive) {
        alertWarn('Exceptional data detected.  Please check the logs for "D3M WARNING"');

        // TODO: should be tied into a global pageLocked boolean?
        byId('btnLock').classList.add('noshow');
        byId('btnForce').classList.add('noshow');
        byId('btnEraser').classList.add('noshow');
        byId('btnSubset').classList.add('noshow');
        byId('main').style.backgroundColor = 'grey';
        byId('whitespace').style.backgroundColor = 'grey';
    }
    console.log("data schema data: ", selectedDataset.datasetDoc);

    //url example: /config/d3m-config/get-problem-data-file-info/39
    //
    let problem_info_result = await m.request(configurations.problem_data_info);

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
    let set_d3m_data_path = (field, val) => problem_info_result.data[field].exists
        ? problem_info_result.data[field].path
        : problem_info_result.data[field + '.gz'].exists
            ? problem_info_result.data[field + '.gz'].path
            : val;


    selectedDataset.datasetUrl = d3mData = set_d3m_data_path('learningData.csv', d3mData);
    // zparams.zd3mtarget = set_d3m_data_path('learningData.csv', d3mData);

    // If this is the D3M domain; d3mData MUST be set to an actual value
    //
    if ((IS_D3M_DOMAIN)&&(d3mData == null)){
        const d3m_path_err = 'NO VALID d3mData path!! ' + JSON.stringify(problem_info_result)
        console.log(d3m_path_err);
        alertError('debug (be more graceful): ' + d3m_path_err);
    }


    /**
     * 4. read preprocess data or (if necessary) run preprocess
     * NOTE: preprocess.json is now guaranteed to exist...
     */
    console.log('---------------------------------------');
    console.log("-- 4. read preprocess data or (if necessary) run preprocess --");

    // Function to load retreived preprocess data
    //
    let loadPreprocessData = res => {
        priv = res.data.dataset.private || priv;
        getSelectedDataset().summaries = res.data.variables;
        return res.data;
    };

    let resPreprocess;
    try {
        console.log('attempt to read preprocess file (which may not exist): ' + pURL);
        resPreprocess = loadPreprocessData(await m.request(pURL));
    } catch(_) {
        console.log("Ok, preprocess not found, try to RUN THE PREPROCESSAPP");
        let url = ROOK_SVC_URL + 'preprocessapp';
        // For D3M inputs, change the preprocess input data
        let json_input = IS_D3M_DOMAIN
            ? {data: d3mData, datastub: d3mDataName}
            : {data: dataloc, target: targetloc, datastub}; // TODO: these are not defined

        try {
            // res = read(await m.request({method: 'POST', url: url, data: json_input}));
            let preprocess_info = await m.request({method: 'POST', url: url, data: json_input});
            console.log('preprocess_info: ', preprocess_info);
            console.log('preprocess_info message: ' + preprocess_info.message);
            if (preprocess_info.success){
                resPreprocess = loadPreprocessData(preprocess_info);

            }else{
                setModal(m('div', m('p', "Preprocess failed: "  + preprocess_info.message),
                    m('p', '(May be a serious problem)')),
                    "Failed to load basic data.",
                    true,
                    "Try to Reload Page",
                    false,
                    locationReload);

                //alertError('Preprocess failed: ' + preprocess_info.message);
                // endsession();
                return;
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
            return;
        }
    }

    /**
     * 4b. Call problem discovery
     */
    console.log('---------------------------------------');
    console.log("-- 4b. Call problem discovery --");

    if(!swandive && resPreprocess) {
        let dataset = getSelectedDataset();
        // assign discovered problems into problems set, keeping the d3m problem
        Object.assign(dataset.problems, discovery(resPreprocess.dataset.discovery));
        dataset.variablesInitial = Object.keys(dataset.summaries);

        // Kick off discovery button as green for user guidance
        if (!task1_finished) buttonClasses.btnDiscover = 'btn-success'
    }

    // ---------------------------------------
    // 5. Read the d3m problem schema and add to problems
    // ...and make a call to Hello to check TA2 is up.  If we get this far, data are guaranteed to exist for the frontend
    // ---------------------------------------
    console.log('---------------------------------------');
    console.log("-- 5. Read the d3m problem schema and add to problems --");

    // ---------------------------------------
    // Retrieve the problem schema....
    // ---------------------------------------
    let res = await m.request(d3mPS);
    // console.log("prob schema data: ", res);
    if(typeof res.success === 'undefined'){            // In Task 2 currently res.success does not exist in this state, so can't check res.success==true
        // This is a Task 2 assignment
        // console.log("DID WE GET HERE?");
        task1_finished = true;
        buttonClasses.btnDiscover = 'btn-success';
        buttonClasses.btnSubmitDisc = 'btn-success';
        buttonClasses.btnEstimate = 'btn-success';

    } else if (!res.success){                       // Task 1 is when res.success==false
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
        if (failset.includes(res.about.taskType.toUpperCase())) {
            if(IS_D3M_DOMAIN){
              console.log('D3M WARNING: failset  task type found');
            }
            swandive = true;
        }

        // create the default problem provided by d3m
        let targets = res.inputs.data
            .flatMap(source => source.targets.map(targ => targ.colName));
        let predictors = swandive
            ? Object.keys(getSelectedDataset().summaries)
                .filter(column => column !== 'd3mIndex' && !targets.includes(column))
            : resDataDocument.dataResources // if swandive false, then datadoc has column labeling
                .filter(resource => resource.resType === 'table')
                .flatMap(resource => resource.columns
                    .filter(column => column.role[0] !== 'index' && !targets.includes(column.colName))
                    .map(column => column.colName));

        let defaultProblem = {
            problemID: res.about.problemID,
            system: 'auto',
            version: res.about.version,
            predictors: predictors,
            targets: targets,
            description: res.about.problemDescription,
            metric: res.inputs.performanceMetrics[0].metric,
            task: res.about.taskType,
            subTask: res.about.taskSubType,
            model: 'modelUndefined',
            meaningful: false,
            manipulations: [],
            solutions: {
                d3m: {},
                rook: {}
            },
            tags: {
                transformed: [],
                weights: [], // singleton list
                crossSection: [],
                time: [],
                nominal: [],
                loose: [] // variables displayed in the force diagram, but not in any groups
            },
            summaries: getSelectedDataset().summaries
        };

        // add the default problems to the list of problems
        let problemCopy = getProblemCopy(defaultProblem);

        getSelectedDataset().problems[res.about.problemID] = defaultProblem;
        getSelectedDataset().problems[problemCopy.problemID] = problemCopy;
        /**
         * Note: mongodb data retrieval initiated here
         *   setSelectedProblem -> loadMenu (manipulate.js) -> getData (manipulate.js)
         */
        setSelectedProblem(problemCopy.problemID);

    } else console.log("Task 1: No Problem Doc");

    /**
     * 6. Read in zelig models (not for d3m)
     * 7. Read in zeligchoice models (not for d3m)
     */
    console.log('---------------------------------------');
    console.log("-- 6. Read in zelig models (not for d3m) --");
    console.log("-- 7. Read in zeligchoice models (not for d3m) --");

    if (!IS_D3M_DOMAIN){
      for (let field of ['zelig5models', 'zelig5choicemodels']) {
          try {
              res = await m.request(`data/${field}.json`);
              cdb(field + ' json: ', res);
              res[field]
                  .filter(key => res[field].hasOwnProperty(key))
                  .forEach(key => mods[key.name[0]] = key.description[0]);
          } catch(_) {
              console.log("can't load " + field);
          }
      }
    }

    /**
     * 8. Start the user session
     * rpc rpc Hello (HelloRequest) returns (HelloResponse) {}
     */
    console.log('---------------------------------------');
    console.log("-- 8. Start the user session /Hello --");

    res = await makeRequest(D3M_SVC_URL + '/Hello', {});
    if (res) {
      console.log(res)
      if (res.success != true){
        const user_err_msg = "Failed to make Hello connection with TA2! status code: " + res.message;
        setModal(user_err_msg, "Error Connecting to TA2", true, "Reset", false, locationReload);
        return;
      } else {
            zparams.zsessionid = "no session id in this API version";   // remove this eventually

            // ----------------------------------------------
            // Format and show the TA2 name in the footer
            // ----------------------------------------------
            let ta2Version;
            if(typeof res.data.version !== 'undefined'){
              ta2Version = res.data.version;
            }
            let ta2Name = res.data.userAgent;
            if (ta2Version){
              ta2Name += ' (API: ' + ta2Version + ')';
            }
            $('#ta2-server-name').html('TA2: ' + ta2Name);

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

    // from .csv
    let [hold, lablArray] = [[], []];

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
    load(hold, lablArray, d3mRootPath, d3mDataName, d3mPreprocess, d3mData, d3mPS, d3mDS, pURL);
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

// layout for force diagram pebbles. Can be 'variables', 'pca', 'clustering' etc. (ideas)
export let forceDiagramMode = 'variables';
export let setForceDiagramMode = mode => forceDiagramMode = mode;

export let buildForceData = problem => {

    if (!problem) return;

    let summaries = problem.summaries;
    let pebbles = [...problem.predictors, ...problem.targets, ...problem.tags.loose];
    let groups = [];
    let groupLinks = [];

    if (forceDiagramMode === 'variables') {
        groups = [
            {
                name: "Predictors",
                color: common.gr1Color,
                nodes: new Set(problem.predictors),
                opacity: 0.3
            },
            {
                name: "Targets",
                color: common.gr2Color,
                nodes: new Set(problem.targets),
                opacity: 0.3
            },
            {
                name: "Priors",
                color: common.warnColor,
                nodes: new Set(['At_bats', 'Hits', 'RBIs']),
                opacity: 0.4
            }
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

    // collapse groups with more than maxNodes into a single node
    let maxNodes = 100;
    groups.filter(group => group.nodes.length > maxNodes).forEach(group => {
        pebbles = pebbles.filter(node => !group.nodes.has(node.name)); // remove nodes from said group
        pebbles.push({id: normalize(group.name), name: group.name}); // add one node to represent all the nodes
        group.nodes = [group.name]; // redefine the group to only contain the new node
    });

    return {pebbles, groups, groupLinks};
};

export let forceDiagramState = {
    builders: [pebbleBuilder, groupBuilder, linkBuilder, groupLinkBuilder],
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
                m.redraw()
            }, forceDiagramState.hoverTimeoutDuration)
        },
        mouseout: () => {
            clearTimeout(forceDiagramState.hoverTimeout);
            forceDiagramState.hoverTimeout = setTimeout(() => {
                forceDiagramState.hoverPebble = undefined;
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

    // the order of the keys indicates precedence
    let params = {
        predictors: new Set(problem.predictors),
        loose: new Set(problem.tags.loose),
        transformed: new Set(problem.tags.transformed),
        crossSection: new Set(problem.tags.crossSection),
        time: new Set(problem.tags.time),
        nominal: new Set(getNominalVariables(problem)), // include both nominal-casted and string-type variables
        weight: new Set(problem.tags.weights),
        targets: new Set(problem.targets),
    };

    let strokeWidths = {
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
        crossSection: common.csColor,
        time: common.timeColor,
        nominal: common.nomColor,
        targets: common.dvColor,
        weight: common.weightColor
    };

    // set the base color of each node
    pebbles.forEach(pebble => {
        context.nodes[pebble].strokeWidth = 1;
        context.nodes[pebble].nodeCol = colors(generateID(pebble));
        context.nodes[pebble].strokeColor = 'transparent';
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

export let forceDiagramLabels = problem => [
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
            },
            {
                id: 'Prior',
                name: 'Prior',
                attrs: {fill: common.warnColor},
                onclick: d => {
                    alertLog('Neat feature to add?')
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
export let selectedPipelines = new Set([]);
export let setSelectedPipeline = pipelineID => {
    pipelineID = String(pipelineID);

    if (modelComparison) selectedPipelines.has(pipelineID)
        ? selectedPipelines.delete(pipelineID)
        : selectedPipelines.add(pipelineID);
    else selectedPipelines = new Set([pipelineID]);

    // ensures results menu is in a valid state
    setSelectedResultsMenu(selectedResultsMenu);
};

// read-only abstraction layer for retrieving useful pipeline data
export let pipelineAdapter = new Proxy({}, {
    ownKeys() {
        // grab all pipeline ids for results problem
        let solutions = getResultsProblem().solutions;
        return Object.keys(solutions).reduce((out, solver) => out.concat(Object.keys(solutions[solver])), []);
    },
    getOwnPropertyDescriptor() {
        return {enumerable: true, configurable: true};
    },
    has(_, key) {
        let solutions = getResultsProblem().solutions;
        return key in solutions.rook || key in solutions.d3m
    },

    get(obj, pipelineID) {
        let solutions = getResultsProblem().solutions;
        if (pipelineID in solutions.rook) return {
            get actualValues() {
                return solutions.rook[pipelineID].predictor_values.actualvalues;
            },
            get fittedValues() {
                return solutions.rook[pipelineID].predictor_values.fittedvalues;
            },
            get score() {return solutions.rook[pipelineID].score},
            get target() {return solutions.rook[pipelineID].dependent_variable[0]},
            get predictors() {return solutions.rook[pipelineID].predictors},
            get description() {return solutions.rook[pipelineID].description[0]},
            get task() {return solutions.rook[pipelineID].task[0]},
            get model() {return solutions.rook[pipelineID].model_type[0]}
        };

        if (pipelineID in solutions.d3m) return {
            get actualValues() {
                return solutions.d3m.rookpipe.dvvalues;
            },
            get fittedValues() {
                if ((solutions.d3m[pipelineID].predictedValues || {}).success)
                    return solutions.d3m[pipelineID].predictedValues.data
                        .map(item => parseFloat(item[solutions.d3m.rookpipe.depvar]))
            },
            get score() {return solutions.d3m[pipelineID].score},

            get target() {return (solutions.d3m.rookpipe || {}).depvar},
            get predictors() {return (solutions.d3m.rookpipe || {}).predictors},
            get description() {return (solutions.d3m[pipelineID].pipeline || {}).description},
            get task() {return solutions.d3m[pipelineID].status},
            get model() {return `${(solutions.d3m[pipelineID].steps || []).length} steps`}
        };

        // no need to perform null check while accessing pipeline attributes
        return {};
    }
});

export let selectedResultsMenu = 'Problem Description';
export let setSelectedResultsMenu = menu => {
    let isValid = state => {
        if (modelComparison) return ['Problem Description', 'Prediction Summary'].includes(state);

        let selectedPipeline = [...selectedPipelines][0] || '';
        if (selectedPipeline.includes('raven') && ['Generate New Predictions', 'Visualize Pipeline'].includes(state)) return false;
        if (!selectedPipeline.includes('raven') && ['Solution Table'].includes(state)) return false;
        return true;
    };

    if (isValid(menu)) selectedResultsMenu = menu;
    if (!isValid(selectedResultsMenu)) selectedResultsMenu = 'Problem Description';
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
        taskSubtype: problem.subTask,
        taskDescription: problem.description,
        metrics: [problem.metrics],
        maxPipelines: 1
    });
    if (!pipelineSpec.subTask) delete pipelineSpec.subTask;
    return pipelineSpec;
}

// create problem definition for SearchSolutions call
function CreateProblemDefinition(problem) {
    let resourceIdFromProblemDoc = d3mProblemDescription.firstTarget.resID;
    let problemSpec = {
        id: problem.problemID,
        version: problem.version || '1.0',
        name: problem.problemID,
        taskType: d3mTaskType[problem.task][1],
        taskSubtype: problem.taskSubtype, // TODO: MULTICLASS designation
        performanceMetrics: [{metric: d3mMetrics[problem.metric][1]}]  // need to generalize to case with multiple metrics.  only passes on first presently.
    };
    if (problemSpec.taskSubtype === 'taskSubtypeUndefined') delete problemSpec.taskSubtype;

    let inputSpec =  [
        {
            datasetId: selectedDataset,
            targets: problem.targets.map((target, resourceId) => ({
                resourceId: resourceIdFromProblemDoc,
                columnIndex: Object.keys(getSelectedProblem().summaries).indexOf(target),  // Adjusted to match dataset doc
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
                    datasetId: selectedDataset,
                    targets: problem.targets.map((target, resourceId) => ({
                        resourceId: resourceIdFromDatasetDoc,
                        columnIndex: Object.keys(getSelectedProblem().summaries).indexOf(target),
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
        timeBound: timeBound || 1,
        priority: 1,
        allowedValueTypes: ['DATASET_URI', 'CSV_URI'],
        problem: CreateProblemDefinition(problem),
        template: makePipelineTemplate(problem),
        inputs: [{dataset_uri: 'file://' + getSelectedDataset().datasetDocPath}]
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
    let resultsProblem = getProblemCopy(getSelectedProblem());
    getSelectedDataset().problems[resultsProblem.problemID] = resultsProblem;
    getSelectedDataset().resultsProblem = resultsProblem.problemID;

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

    if (swandive) { // IS_D3M_DOMAIN and swandive is true
        // zPop();
        zparams.callHistory = callHistory;

        buttonLadda.btnEstimate = true;
        m.redraw();

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

    ROOKPIPE_FROM_REQUEST = await makeRequest(ROOK_SVC_URL + 'pipelineapp', zparams);        // parse the center panel data into a formula like construction

    if (!ROOKPIPE_FROM_REQUEST) {
        estimated = true;
        buttonLadda.btnEstimate = false;
        m.redraw();
        return;
    }

    // ROOKPIPE_FROM_REQUEST.predictors && setxTable(ROOKPIPE_FROM_REQUEST.predictors);
    let searchTimeLimit = 5;
    let searchSolutionParams = CreatePipelineDefinition(resultsProblem, searchTimeLimit);

    let nominalVars = new Set(getNominalVariables(resultsProblem));

    let hasManipulation = resultsProblem.manipulations.length > 0;
    let hasNominal = [...resultsProblem.targets, ...resultsProblem.predictors]
        .some(variable => nominalVars.has(variable));

    let needsProblemCopy = hasManipulation || hasNominal;

    let datasetPath = getSelectedDataset().datasetUrl;
    // TODO: upon deleting or reassigning datasetDocProblemUrl, server-side temp directories may be deleted
    if (needsProblemCopy) {
        let {data_path, metadata_path} = await manipulate.buildProblemUrl(resultsProblem);
        resultsProblem.datasetDocPath = metadata_path;
        datasetPath = data_path;
    } else delete resultsProblem.datasetDocPath;

    makeRequest(ROOK_SVC_URL + 'solverapp', {prob: resultsProblem, dataset_path: datasetPath})
        .then(response => {
            if (response && 'warning' in response) return;
            let ravenID = 'raven ' + ravenPipelineID++;
            resultsProblem.solutions.rook[ravenID] = response;
            if (selectedPipelines.size === 0) setSelectedPipeline(ravenID);
        });

    let datasetDocPath = resultsProblem.datasetDocPath || getSelectedDataset().datasetDocPath;

    let allParams = {
        searchSolutionParams: searchSolutionParams,
        fitSolutionDefaultParams: getFitSolutionDefaultParameters(datasetDocPath),
        produceSolutionDefaultParams: getProduceSolutionDefaultParameters(datasetDocPath),
        scoreSolutionDefaultParams: getScoreSolutionDefaultParameters(resultsProblem, datasetDocPath)
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

// d is a node from allNodes or nodes
// updates the summary variable, which is rendered in the hidden summary tab in the leftpanel;
export function getVarSummary(d) {
    if (!d) return {};

    // d3 significant digit formatter
    let rint = d3.format('r');
    const precision = 4;
    let data = {
        'Mean': formatPrecision(d.mean, precision) + (d.meanCI
            ? ` (${formatPrecision(d.meanCI.lowerBound, precision)}, ${formatPrecision(d.meanCI.upperBound, precision)})`
            : ''),
        'Median': formatPrecision(d.median, precision),
        'Most Freq': rint(d.mode),
        'Most Freq Occurrences': rint(d.freqmode),
        'Median Freq': d.mid,
        'Mid Freq Occurrences': rint(d.freqmid),
        'Least Freq': d.fewest,
        'Least Freq Occurrences': rint(d.freqfewest),
        'Std Dev (Sample)': formatPrecision(d.sd, precision),
        'Minimum': formatPrecision(d.min, precision),
        'Maximum': formatPrecision(d.max, precision),
        'Invalid': rint(d.invalid),
        'Valid': rint(d.valid),
        'Uniques': rint(d.uniques),
        'Herfindahl': formatPrecision(d.herfindahl)
    };

    return Object.keys(data)
        .filter(key => data[key] !== "" && data[key] !== undefined && !isNaN(data[key])) // drop all keys with nonexistent values
        .reduce((out, key) => Object.assign(out, {[key]: data[key]}), {})
}

export let popoverContent = node => {
    if (swandive || !node) return;

    let text = '<table class="table table-sm table-striped" style="margin:-10px;"><tbody>';
    let [rint, prec] = [d3.format('r'), (val, int) => (+val).toPrecision(int).toString()];
    let div = (field, name, val) => {
        if ((field != 'NA' && ((field && !isNaN(field)) || (val && !isNaN(val)))))
            text += `<tr><th>${name}</th><td><p class="text-left" style="height:10px;">${val || field}</p></td></tr>`;
    };
    node.labl != '' && div(node.labl, 'Label');
    div(node.mean, 'Mean', priv && node.meanCI ?
        `${prec(node.mean, 2)} (${prec(node.meanCI.lowerBound, 2)} - ${prec(node.meanCI.upperBound, 2)})` :
        prec(node.mean, 4));
    div(node.median, 'Median', prec(node.median, 4));
    div(node.mode, 'Most Freq');
    div(node.freqmode, 'Occurrences',  rint(node.freqmode));
    div(node.mid, 'Median Freq');
    div(node.freqmid, 'Occurrences', rint(node.freqmid));
    div(node.fewest, 'Least Freq');
    div(node.freqfewest, 'Occurrences', rint(node.freqfewest));
    div(node.sd, 'Stand Dev', prec(node.sd, 4));
    div(node.max, 'Maximum', prec(node.max, 4));
    div(node.min, 'Minimum', prec(node.min, 4));
    div(node.invalid, 'Invalid', rint(node.invalid));
    div(node.valid, 'Valid', rint(node.valid));
    div(node.uniques, 'Uniques', rint(node.uniques));
    div(node.herfindahl, 'Herfindahl', prec(node.herfindahl, 4));
    return text + '</tbody></table>';
};

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
    let solutions = getResultsProblem().solutions;
    if(Object.keys(solutions.d3m).length === 0) {
        alertError("No pipelines exist. Cannot mark problem as complete.");
        return;
    }

    if (selectedPipelines.size === 0) {
        alertWarn("No pipelines exist. Cannot mark problem as complete");
        return;
    }
    if (selectedPipelines.size > 1) {
        alertWarn("More than one pipeline selected. Please select one TA2 pipeline");
        return;
    }
    if ([...selectedPipelines].filter(pipelineID => pipelineID.includes('raven')).length !== 0) {
        alertWarn("Cannot select a TwoRavens pipeline. Please select a different pipeline");
        return;
    }

    console.log("== this should be the selected solution ==");
    console.log(solutions.d3m[[...selectedPipelines][0]]);
    console.log(solutions.d3m[[...selectedPipelines][0]].response.solutionId);

    let chosenSolutionId = solutions.d3m[[...selectedPipelines][0]].response.solutionId;

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

/* Generates confusion table data and labels, given the expected and predicted values*/
/* if a factor is passed, the resultant table will be 2x2 with respect to the factor */
export function generateConfusionData(Y_true, Y_pred, factor=undefined) {
    if (!Y_true || ! Y_pred) return;

    // dvvalues are generally numeric
    Y_true = Y_true.map(String);

    // predvals are generally strings
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
    let indexOf = classes.reduce((out, clss, i) => {out[clss] = i; return out}, {})
    // increment the data matrix at the class coordinates of true and pred
    Y_true.forEach((_, i) => data[indexOf[Y_true[i]]][indexOf[Y_pred[i]]]++);

    return {data, classes, allClasses};
}

/* generate an object containing accuracy, recall, precision, F1, given a 2x2 confusion data matrix */
export function generatePerformanceData(confusionData2x2) {

    var tp = confusionData2x2[0][0];
    var fn = confusionData2x2[0][1];
    var fp = confusionData2x2[1][0];
    var tn = confusionData2x2[1][1];

    var p = tp + fn;
    var n = fp + tn;

    let round = (number, digits) => Math.round(number * Math.pow(10, digits)) / Math.pow(10, digits)

    return {
        f1: round(2 * tp / (2 * tp + fp + fn), 2),
        precision:  round(tp / (tp + fp), 2), // positive predictive value
        recall: round(tp / (tp + fn), 2), // sensitivity, true positive rate
        accuracy: round((tp + tn) / (p + n), 2),

        // specificity: round(fp / (fp + tn), 2),
        // 'true positive rate': round(tp / (tp + fn), 2), // already included with recall
        // 'true negative rate': round(tn / (tn + fp), 2),
        // 'false positive rate': round(fp / (fp + tn), 2),
        // 'false negative rate': round(fn / (fn + tp), 2), // miss rate
    }
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


/**
 *  Send a status message to the TA3 console
 */
export function ta3_search_message(user_msg){
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

export function test_msg_ta3_search(){
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
export function end_ta3_search(is_success, user_msg){

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

/**
 *  record user metadata
 */
let recorder_cnt = 0;
const save_workspace_url = '/workspaces/record-user-workspace';

// TODO: this used to be embedded inside the force diagram restart, needs a new calling source
export function record_user_metadata(){

  // turning off for now
  return;

  // (1) Set domain identifier: differs for D3M, Dataverse, etc
  //
  var domain_identifier = 'unknown!';
  if (IS_D3M_DOMAIN){ // domain specific identifier
    domain_identifier = domainIdentifier;
  }/*else if (IS_DATAVERSE_DOMAIN){
    domain_identifier = 'TODO: DV IDENTIFIER';
  }else if (IS_EVENTDATA_DOMAIN){
    domain_identifier = 'TODO: EVENTDATA IDENTIFIER';
  }*/

  if (zparams == null){
    console.log('No workspace recording. zparams not defined');
    return;
  }

  // (2) Format workspace data
  //
  let workspace_data = {
      'app_domain': APP_DOMAIN,
      domain_identifier,
      datasets,
  };

        //console.log('workspace_data: ' + workspace_data);

      // (3) Save workspace data
      //
      try {
          let res = m.request(save_workspace_url, {method: 'POST', data: workspace_data});
          recorder_cnt++;
          console.log('Session recorded: (cnt: ' + recorder_cnt + ') ' + res);
      } catch (err) {
          console.log('record_user_metadata failed: ' + err);
      }
}

export function getDescription(problem) {
    if (problem.description) return problem.description;
    return `${problem.targets} is predicted by ${problem.predictors.slice(0, -1).join(", ")} ${problem.predictors.length > 1 ? 'and ' : ''}${problem.predictors[problem.predictors.length - 1]}`;
}

export function discovery(problems) {
    problems = problems.reduce((out, prob) => {
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

        out[problemID] = {
            problemID,
            system: "auto",
            description: undefined,
            predictors: [...prob.predictors, ...getTransformVariables(manips)],
            targets: [prob.target],
            metric: undefined, // this is set below
            task: undefined, // this is set below
            subTask: 'taskSubtypeUndefined',
            model: 'modelUndefined',
            meaningful: false,
            manipulations: manips,
            solutions: {
                d3m: {},
                rook: {}
            },
            tags: {
                transformed: manipulate.getTransformVariables(manips), // this is used when updating manipulations pipeline
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

    let dataset = getSelectedDataset();
    Object.keys(problems)
        .filter(problemID => problems[problemID].manipulations.length === 0)
        .forEach(problemID => Object.assign(problems[problemID], {
            summaries: dataset.summaries,
            metric: dataset.summaries[problems[problemID].targets[0]].plottype === "bar" ? 'f1Macro' : 'meanSquaredError',
            task: dataset.summaries[problems[problemID].targets[0]].plottype === "bar" ? 'classification' : 'regression'
        }));

    // construct preprocess for all problems with manipulations
    // TODO: optimization- preprocess variables only, for 5000 samples
    Promise.all(Object.keys(problems)
        .filter(problemID => problems[problemID].manipulations.length !== 0)
        .map(problemID => manipulate.buildDatasetUrl(problems[problemID])
            .then(url => m.request({
                method: 'POST',
                url: ROOK_SVC_URL + 'preprocessapp',
                data: url
            }))
            .then(response => {
                let problem = problems[problemID];
                Object.assign(problem, {
                    summaries: response.variables,
                    metric: response.variables[problem.targets[0]].plottype === "bar" ? 'f1Macro' : 'meanSquaredError',
                    task: response.variables[problem.targets[0]].plottype === "bar" ? 'classification' : 'regression'
                })
            })));

    return problems;
}

// creates a new problem from the force diagram problem space and adds to disco
export async function addProblemFromForceDiagram() {
    let problemCopy = getProblemCopy(getSelectedProblem());
    getSelectedDataset().problems[problemCopy.problemID] = problemCopy;

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

export let datasets = {};
export let selectedDataset;

export let setSelectedDataset = datasetID => {
    if (!(datasetID in datasets)) {
        datasets[datasetID] = {
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
    }
    selectedDataset = datasetID;
    // update page title shown on tab
    d3.select("title").html("TwoRavens " + selectedDataset);
    // will trigger further mongo calls if the secondary peek page is open
    localStorage.setItem('peekHeader' + peekId, "TwoRavens " + selectedDataset);
};

export let getSelectedDataset = () => datasets[selectedDataset];
export let getSelectedProblem = () => selectedDataset && getSelectedDataset().problems[getSelectedDataset().selectedProblem];
export let getResultsProblem = () => selectedDataset && getSelectedDataset().problems[getSelectedDataset().resultsProblem];

export let getNominalVariables = problem => {
    let selectedProblem = problem || getSelectedProblem();
    return [...new Set([
        ...Object.keys(selectedProblem.summaries).filter(variable => selectedProblem.summaries[variable].nature === 'nominal'),
        ...selectedProblem.tags.nominal])
    ];
};

export function setSelectedProblem(problemID) {
    if (!problemID || getSelectedDataset().selectedProblem === problemID) return;
    getSelectedDataset().selectedProblem = problemID;

    updateRightPanelWidth();

    // if a constraint is being staged, delete it
    manipulate.setConstraintMenu(undefined);

    let subsetMenu = [...getSelectedDataset().hardManipulations, ...getSelectedProblem().manipulations];
    let countMenu = {type: 'menu', metadata: {type: 'count'}};
    manipulate.loadMenu(subsetMenu, countMenu).then(count => {
        manipulate.setTotalSubsetRecords(count);
        m.redraw();
    });

    resetPeek();

    // will trigger the call to solver, if a menu that needs that info is shown
    setSolverPending(true);
    confusionFactor = undefined;
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
    if (!state) selectedPipelines = new Set([...selectedPipelines].slice(undefined, 1));
    modelComparison = state;

    setSelectedResultsMenu('Prediction Summary');
};

export let setCheckedDiscoveryProblem = (status, problemID) => {
    let dataset = getSelectedDataset();
    if (problemID)
        dataset.problems[problemID].meaningful = status;
    else
        Object.keys(dataset.problems)
            .forEach(problemID => dataset.problems[problemID].meaningful = status)
};

export async function submitDiscProb() {
    let problems = getSelectedDataset().problems;
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

export async function endAllSearches() {
    console.log("Attempting to End All Searches");
    console.log(allsearchId);
    console.log(allsearchId[0]);
    let res = await makeRequest(D3M_SVC_URL + '/EndSearchSolutions', {searchId: allsearchId[0]} );
    if(allsearchId.length > 1){
        for(let i = 1; i < allsearchId.length; i++) {
            res = await makeRequest(D3M_SVC_URL + '/EndSearchSolutions', {searchId: allsearchId[i]} );
        };
    };
    //allsearchId = [];
}

export async function stopAllSearches() {
    let res = await makeRequest(D3M_SVC_URL + '/StopSearchSolutions', {searchId: allsearchId[0]} );
    if(allsearchId.length > 1){
        for(let i = 1; i < allsearchId.length; i++) {
            res = await makeRequest(D3M_SVC_URL + '/StopSearchSolutions', {searchId: allsearchId[i]} );
        };
    };
}

/**
 *  Function takes as input the pipeline template information (currently problem) and returns a valid pipline template in json. This json is to be inserted into SearchSolutions. e.g., problem = {...}, template = {...}, inputs = [dataset_uri]
 */
function makePipelineTemplate (problem) {
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
}

// function builds a placeholder step for pipeline
function placeholderStep() {
    let step = {inputs: [{data: "steps.0.produce"}], outputs: [{id: "produce"}]};
    return {placeholder: step};
}

// function builds a step in a pipeline to remove indices
function primitiveStepRemoveColumns (problem) {
    // looks like some TA2s need "d3mIndex"
    let keep = [...problem.predictors, ...problem.targets, "d3mIndex"];

    let indices = [];
    Object.keys(problem.summaries).forEach((variable, i) => keep.includes(variable) && indices.push(i));

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
        }};
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
    if (!ROOKPIPE_FROM_REQUEST) {
        console.warn('---------- ERROR: ROOKPIPE_FROM_REQUEST not set!!!');
    }

    let solutions = getResultsProblem().solutions;
    // Need to deal with (exclude) pipelines that are reported, but failed.  For approach, see below.
    if (response1.id in solutions.d3m)
        Object.assign(solutions.d3m[response1.id], response1);
    else {
        solutions.d3m[response1.id] = response1;
        solutions.d3m[response1.id].score = 'scoring';
    }

    // this will NOT report the pipeline to user if pipeline has failed, if pipeline is still running, or if it has not completed
    // if(solutions.d3m[key].responseInfo.status.details == "Pipeline Failed")  {
    //     continue;
    // }
    // if(solutions.d3m[key].progressInfo == "RUNNING")  {
    //     continue;
    // }

    //adding rookpipe to the set of d3m solutions for the problem
    solutions.d3m.rookpipe = Object.assign({}, ROOKPIPE_FROM_REQUEST);                // This is setting rookpipe for the entire table, but when there are multiple CreatePipelines calls, this is only recording latest values

    // VJD: this is a third core API call that is currently unnecessary
    //let pipelineid = PipelineCreateResult.pipelineid;
    // getexecutepipelineresults is the third to be called
    //  makeRequest(D3M_SVC_URL + '/getexecutepipelineresults', {context, pipeline_ids: Object.keys(solutions.d3m)});


    if (selectedPipelines.size === 0) setSelectedPipeline(response1.id);

    // Add pipeline descriptions
    // TODO: this is redundant, check if can be deleted
    Object.assign(solutions.d3m[response1.id], response1.data);
    m.redraw();
}


/**
  Handle a describeSolutionResponse sent via websockets
*/
async function handleDescribeSolutionResponse(response) {

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
    delete response.pipelineId;
    let pipelineInfo = getResultsProblem().solutions.d3m;

    Object.assign(pipelineInfo[pipelineId], response);

} // end: handleDescribeSolutionResponse


/**
 Handle a getScoreSolutionResultsResponse send via websocket
 wrapped in a StoredResponse object
 */
async function handleGetScoreSolutionResultsResponse(response) {
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
    let pipelineInfo = getResultsProblem().solutions.d3m;
    pipelineInfo[response.pipeline_id].score = myscore;
    m.redraw();
} // end: handleGetScoreSolutionResultsResponse


/**
  Handle a GetProduceSolutionResultsResponse sent via websockets
  -> parse response, retrieve data, plot data
*/
async function handleGetProduceSolutionResultsResponse(response){

    if(response === undefined){
      console.log('handleGetProduceSolutionResultsResponse: Error.  "response" undefined');
      return;
    }
    if(response.pipelineId === undefined){
      console.log('handleGetProduceSolutionResultsResponse: Error.  "pipelineId" undefined');
      return;
    }
    console.log('---- handleGetProduceSolutionResultsResponse -----');
    console.log(JSON.stringify(response));

    // Note: UI update logic moved from generatePredictions
    if (!response.is_finished){
      console.log('-- GetProduceSolutionResultsResponse not finished yet... (returning) --');
      return;
    } else if (response.is_error){
      console.log('-- GetProduceSolutionResultsResponse has error --')
      console.log('response: ' + JSON.stringify(response));
      console.log('----------------------------------------------');
      return;
    }

    let hold = response.response.exposedOutputs;
    let hold2 = hold[Object.keys(hold)[0]];  // There's an issue getting ."outputs.0".csvUri directly.
    let hold3 = hold2.csvUri;

    let responseOutputData = await makeRequest(D3M_SVC_URL + `/retrieve-output-data`, {data_pointer: hold3});

    let pipelineInfo = getResultsProblem().solutions.d3m;
    pipelineInfo[response.pipelineId].predictedValues = responseOutputData;

} // end: handleGetProduceSolutionResultsResponse

/*
  Triggered at the end of GetSearchSolutionsResults
*/
async function handleENDGetSearchSolutionsResults() {

    // stop spinner
    buttonLadda['btnEstimate'] = false;
    m.redraw()
    // change status of buttons for estimating problem and marking problem as finished
    buttonClasses.btnEstimate = 'btn-secondary';

    task2_finished = true; // should this go here?

    // stop the interval process
}

export function xhandleAugmentDataMessage(msg_data){

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

  if (msg_data.success === false) {
    setModal("Error: " + msg_data.user_message,
             "Data Augmentation Failed", true, "Close", true);
    return;
  }

  setModal("Success: " + msg_data.user_message,
           "Data Augmentation Succeeded!", true, "Reload", false, locationReload);


  // console.log('datamart_id: ' + msg_data.data.datamart_id);
  // console.log('filesize: ' + msg_data.data.filesize);

} // end: handleAugmentDataMessage

let ravenPipelineID = 0;

// takes as input problem in the form of a "discovered problem" (can also be user-defined), calls rooksolver, and stores result
export async function callSolver(prob) {
    setSolverPending(false);
    let dataset = getSelectedDataset();

    let hasManipulation = prob.problemID in manipulations && manipulations[prob.problemID].length > 0;
    let hasNominal = [prob.targets, ...prob.predictors].some(variable => zparams.znom.includes(variable));
    let datasetPath = hasManipulation || hasNominal ? await manipulate.buildDatasetUrl(prob) : dataset.datasetUrl;
    let ravenID = 'raven ' + ravenPipelineID++;

    let solutions = getResultsProblem().solutions;
    solutions.rook[ravenID] = await makeRequest(ROOK_SVC_URL + 'solverapp', {prob, dataset_path: datasetPath});
    if (selectedPipelines.size === 0) setSelectedPipeline(ravenID);
    console.log("callSolver response:", solutions.rook[ravenID]);
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

let problemCount = 0;
let generateProblemID = () => 'problem ' + problemCount++;

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
