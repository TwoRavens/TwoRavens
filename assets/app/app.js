/*
  Main TwoRavens mithril app
*/
import hopscotch from 'hopscotch';
import m from 'mithril';
import * as common from "../common/common";

import * as manipulate from './manipulations/manipulate';

import {setModal, locationReload} from '../common/views/Modal';

import {bars, barsNode, barsSubset, density, densityNode, scatter, selVarColor} from './plots.js';
import {elem} from './utils';


//-------------------------------------------------
// NOTE: global variables are now set in the index.html file.
//    Developers, see /template/index.html
//-------------------------------------------------

var transform_data ={
    "preprocess_id":0,
    "current_variable":"",
    "description" : "",
    "transform_variable":[
       "any name (optional)"
    ],
    "transform_type":{
       "manual_transform":true,
       "functional_transform":false
    },
    "transform_data":""
 }

export let marginTopCarousel = 0;
export let marginLeftCarousel = 0;

// ~~~~~ PEEK ~~~~~
// for the second-window data preview
window.addEventListener('storage', (e) => {
    if (e.key !== 'peekMore' + peekId || peekIsLoading) return;
    if (localStorage.getItem('peekMore' + peekId) !== 'true' || peekIsExhausted) return;
    localStorage.setItem('peekMore' + peekId, 'false');
    updatePeek(manipulate.getPipeline(selectedProblem));
});

// for the draggable within-window data preview
window.addEventListener('mousemove', (e) => peekMouseMove(e));  // please don't remove the anonymous wrapper
window.addEventListener('mouseup', (e) => peekMouseUp(e));

export let peekMouseMove = (e) => {
    if (!peekInlineIsResizing) return;
    let percent = (1 - e.clientY / byId(is_manipulate_mode ? 'canvas' : 'main').clientHeight) * 100;
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

    if (is_model_mode && selectedProblem)
        variables = [...selectedProblem.predictors, selectedProblem.target];

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
        alert('The pipeline at this stage matches no records. Delete constraints to match more records.');

    if (data.length === 0) {
        peekIsExhausted = true;
        peekIsLoading = false;
        return;
    }

    data = data.map(record => Object.keys(record).reduce((out, entry) => {
        if (typeof record[entry] === 'number')
            out[entry] = formatPrecision(record[entry])
        else if (typeof record[entry] === 'string')
            out[entry] = `"${record[entry]}"`;
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
};

// ~~~~ MANIPULATIONS STATE ~~~~
export let mongoURL = '/eventdata/api/';

// this contains an object of abstract descriptions of pipelines of manipulations
export let manipulations = {};
// Holds steps that aren't part of a pipeline (for example, pending subset or aggregation in eventdata)
export let looseSteps = {};

export let formattingData = {};
export let alignmentData = {};
// ~~~~


// when set, solver will be called if results menu is active
export let solverPending = false;
export let setSolverPending = state => solverPending = state;

export let solver_res = []
export let setSolver_res = res => solver_res = res;
let solver_res_user = []
let problem_sent = []
let problem_sent_user = []
let problems_in_preprocess = []


export let exploreVariate = 'Univariate';
export function setVariate(variate) {
    exploreVariate = variate;
}

export let task1_finished = false;
export let task2_finished = false;
export let problemDocExists = true;
export let univariate_finished = false;
export let resultsMetricDescription = 'Larger numbers are better fits';

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
    if ((domainIdentifier || {}).name in manipulations && is_manipulate_mode && mode !== 'manipulate') {
        manipulations[domainIdentifier.name] = manipulations[domainIdentifier.name].filter(step => {
            if (step.type === 'subset' && step.abstractQuery.length === 0) return false;
            if (step.type === 'aggregate' && step.measuresAccum.length === 0) return false;
            if (step.type === 'transform' && ['transforms', 'expansions', 'binnings', 'manual']
                .reduce((sum, val) => sum + step[val].length, 0) === 0) return false;
            return true;
        });
    }

    is_model_mode = mode === 'model'
    is_explore_mode = mode === 'explore';
    is_results_mode = mode === 'results';
    is_manipulate_mode = mode === 'manipulate';

    if (currentMode !== mode) {
        if (mode === 'model' && manipulate.pendingHardManipulation)
            manipulate.rebuildPreprocess();

        currentMode = mode;
        m.route.set('/' + mode);
        restart && restart();
        updateRightPanelWidth();
        updateLeftPanelWidth();
    }

    // cause the peek table to redraw
    resetPeek();

    let ws = elem('#whitespace0');
    if (ws) {
        ws.style.display = is_explore_mode ? 'none' : 'block';
    }
}

// for debugging - if not in PRODUCTION, prints args
export let cdb = _ => PRODUCTION || console.log(...arguments);

export let k = 4; // strength parameter for group attraction/repulsion
let tutorial_mode = localStorage.getItem('tutorial_mode') !== 'false';

// initial color scale used to establish the initial colors of nodes
// allNodes.push() below establishes a field for the master node array allNodes called "nodeCol" and assigns a color from this scale to that field
// everything there after should refer to the nodeCol and not the color scale, this enables us to update colors and pass the variable type to R based on its coloring
let colors = d3.scale.category20();
export let csColor = '#419641';
export let dvColor = '#28a4c9';
export let gr1Color = '#14bdcc';  // initially was #24a4c9', but that is dvColor, and we track some properties by color assuming them unique
let gr1Opacity = [0,1];
export let gr2Color = '#ffcccc';
let gr2Opacity = [0,1];

let grayColor = '#c0c0c0';
export let nomColor = '#ff6600';
export let varColor = '#f0f8ff'; // d3.rgb("aliceblue");
let taggedColor = '#f5f5f5'; // d3.rgb("whitesmoke");
export let timeColor = '#2d6ca2';

export let leftTab = 'Variables'; // current tab in left panel
export let leftTabHidden = 'Variables'; // stores the tab user was in before summary hover
export let subset = false;
export let summaryHold = false;

export let rightTab = 'Problem'; // current tab in right panel
export let rightTabExplore = 'Univariate';

export let modelLeftPanelWidths = {
    'Variables': '300px',
    'Discovery': 'auto',
    'Summary': '300px',
    'Subset': '300px'
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

export let setRightTab = (tab) => { rightTab = tab; updateRightPanelWidth() };
export let setRightTabExplore = (tab) => { rightTabExplore = tab; updateRightPanelWidth() };

// panelWidth is meant to be read only
export let panelWidth = {
    'left': '0',
    'right': '0'
};


//-------------------------------------------------
// Initialize a websocket for this page
//-------------------------------------------------
export let wsLink = 'ws://' + window.location.host +
               '/ws/connect/' + username + '/';
console.log('streamSocket connection made: ' + wsLink);
export let streamSocket = new WebSocket(wsLink);

export let streamMsgCnt = 0;
//  messages received.
//
streamSocket.onmessage = function(e) {
   streamMsgCnt++;
   console.log(streamMsgCnt + ') message received! '  + e);
   // parse the data into JSON
   let msg_obj = JSON.parse(e.data);
   //console.log('data:' + JSON.stringify(msg_obj));
   let msg_data = msg_obj['message'];

  if(typeof msg_data.msg_type===undefined){
    console.log('streamSocket.onmessage: Error, "msg_data.msg_type" not specified!');
    return;
  } else if(typeof msg_data.data===undefined){
    console.log('streamSocket.onmessage: Error, "msg_data.data" type not specified!');
    console.log('full data: ' + JSON.stringify(msg_data));
    console.log('---------------------------------------------');

    return;
  }

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


  } else {
    console.log('streamSocket.onmessage: Error, Unknown message type: ' + msg_data.msg_type);
  }
};
streamSocket.onclose = function(e) {
      console.error('streamSocket closed unexpectedly');
};
//-------------------------------------------------



export let updateRightPanelWidth = () => {
    if (is_explore_mode) panelWidth.right = `calc(${common.panelMargin}*2 + 16px)`;
    else if (is_model_mode && !selectedProblem) panelWidth.right = common.panelMargin;
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

export let preprocess = {}; // hold pre-processed data
export let setPreprocess = data => preprocess = data;

let spaces = [];

// radius of circle
export const RADIUS = 40;

// cx, cy, r values for indicator lights
let ind1 = [(RADIUS+30) * Math.cos(1.3), -1*(RADIUS+30) * Math.sin(1.3), 5];
let ind2 = [(RADIUS+30) * Math.cos(1.1), -1*(RADIUS+30) * Math.sin(1.1), 5];

// space index
export let myspace = 0;

export let forcetoggle = ["true"];

// when set, a problem's Task, Subtask and Metric may not be edited
export let lockToggle = true;
export let setLockToggle = state => lockToggle = state;

let priv = true;
export let setPriv = state => priv = state;

// swandive is our graceful fail for d3m
// swandive set to true if task is in failset
export let swandive = false;
let failset = ["TIME_SERIES_FORECASTING","GRAPH_MATCHING","LINK_PREDICTION","timeSeriesForecasting","graphMatching","linkPrediction"];

// object that contains all information about the returned pipelines
export let allPipelineInfo = {};
export let pipelineHeader = ['PipelineID', 'Score'];
export let pipelineTable = [];

export let discoveryHeader = ['problem_id', 'system', 'meaningful'];
export let discoveryTable = [];

export let logArray = [];
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

// list of variable strings (same as Object.keys(preprocess))
export let valueKey = [];
export let setValueKey = keys => valueKey = keys;

// list of discovered problem objects
export let disco = [];
export let setDisco = data => disco = data;

// list of force diagram node objects
export let allNodes = [];
export let setAllNodes = data => allNodes = data;

export let modelCount = 0;

// list of result objects for one problem
export let allResults = [];

export let nodes = [];
export let links = [];
let mods = {};
let estimated = false;
let rightClickLast = false;
let selInteract = false;
export let callHistory = []; // transform and subset calls

// stores the target on page load
export let mytargetdefault = '';

// targeted variable name
export let mytarget = '';
export let setMytarget = target => mytarget = target;

export let configurations = {};
let datadocument = {};

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

export let d3mProblemDescription = {
    id: "",
    version: "",
    name: "",
    description: "",
    taskType: "taskTypeUndefined",
    taskSubtype: "taskSubtypeUndefined",
    performanceMetrics: [{metric: "metricUndefined"}]
};

export let twoRavensModelTypes = {
    regression: ['modelUndefined', 'Linear', 'Logistic', 'Negative Binomial', 'Poisson'],
    classification: ['modelUndefined'],
    clustering: ['modelUndefined', 'KMeans']
};

/*
 * call to django to update the problem definition in the problem document
 * rpc SetProblemDoc(SetProblemDocRequest) returns (Response) {}
 */
export let setD3mProblemDescription = (key, value) => {
    if (!lockToggle) {
        d3mProblemDescription[key] = value;

        let lookup = {
            'taskType': d3mTaskType,
            'taskSubtype': d3mTaskSubtype,
            // 'outputType': d3mOutputType,
            'metric': d3mMetrics
        }[key];

        if (lookup === undefined) return;

        // Eventually should do something here.  But currently this is wrong API call, and most TA2's don't support the correct API call.
        //makeRequest(
        //    D3M_SVC_URL + "/SetProblemDoc",
        //    {replaceProblemSchemaField: {[key]: lookup[d3mProblemDescription[key]][1]}, context: apiSession(zparams.zsessionid)});
    }
    else hopscotch.startTour(lockTour);
}

let svg, div, selectLadda;
export let width, height, estimateLadda, discoveryLadda;

// arcs for denoting pebble characteristics
const arc = (start, end) => (radius) => d3.svg.arc()
    .innerRadius(radius + 5)
    .outerRadius(radius + 20)
    .startAngle(start)
    .endAngle(end);
export const [arc0, arc1, arc2, arc3, arc4] = [arc(0, 3.2), arc(0, 1), arc(1.1, 2.2), arc(2.3, 3.3), arc(4.3, 5.3)];
const arcInd = (arclimits) => (radius) => d3.svg.arc()
    .innerRadius(radius + 22)
    .outerRadius(radius + 37)
    .startAngle(arclimits[0])
    .endAngle(arclimits[1]);

const [arcInd1Limits, arcInd2Limits] = [[0, 0.3], [0.35, 0.65]];
const [arcInd1, arcInd2] = [arcInd(arcInd1Limits), arcInd(arcInd2Limits)];

// milliseconds to wait before showing/hiding the pebble handles
let hoverTimeout = 150;
let hoverPebble;
export let selectedPebble;

export let byId = id => document.getElementById(id);
// export let byId = id => {console.log(id); return document.getElementById(id);}

function trigger(id, event) {
    let evt = document.createEvent('HTMLEvents');
    evt.initEvent(event, true, false);
    byId(id).dispatchEvent(evt);
}

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
export let restart;

let dataurl = '';
let datasetdocurl = '';

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

export let mytour = {
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
        step("btnDiscovery", "right", "Start Task 1",
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
        step(mytarget + 'biggroup', "left", "Target Variable",
             `This is the variable, ${mytarget}, we are trying to predict.
                      This center panel graphically represents the problem currently being attempted.`),
        step("gr1hull", "right", "Explanation Set", "This set of variables can potentially predict the target."),
        step("displacement", "right", "Variable List",
             `<p>Click on any variable name here if you wish to remove it from the problem solution.</p>
                      <p>You likely do not need to adjust the problem representation in the center panel.</p>`),
        step("btnEndSession", "bottom", "Finish Problem",
             "If the solution reported back seems acceptable, then finish this problem by clicking this End Session button."),
    ]
};


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
  3. Read the problem schema and set 'd3mProblemDescription'
  4. Read the data document and set 'datadocument'
  5. Read in zelig models (not for d3m)
  6. Read in zeligchoice models (not for d3m)
  7. Start the user session
  8. Read preprocess data or (if necessary) run preprocess
  9. Build allNodes[] using preprocessed information
  10. Add datadocument information to allNodes (when in IS_D3M_DOMAIN)
  11. Call layout() and start up
*/
async function load(hold, lablArray, d3mRootPath, d3mDataName, d3mPreprocess, d3mData, d3mPS, d3mDS, pURL) {
    if (!IS_D3M_DOMAIN) {
        return;
    }

    let d3m_config_url = "/config/d3m-config/json/latest";
    //let d3m_config_eval_url = "/config/d3m-config/json/eval/latest";

    // 1. Retrieve the configuration information
    let res = await m.request({
        method: "POST",
        url: d3m_config_url
    });
    console.log("this is config file:");
    console.log(res);
    datasetdocurl = res.dataset_schema;

    // 2. Set 'configurations'
    configurations = JSON.parse(JSON.stringify(res)); // this is just copying res
    d3mRootPath = configurations.training_data_root.replace(/\/data/,'');
    d3mDataName = configurations.name;

    // scopes at app.js level; used for saving workspace
    domainIdentifier = {name: configurations.name,
                        source_url: configurations.config_url,
                        description: 'D3M config file'};
                        //id: configurations.id};

    d3mPS = "/config/d3m-config/get-problem-schema/json";
    d3mDS = "/config/d3m-config/get-dataset-schema/json";
    console.log("Configurations: ", configurations);
    d3mPreprocess = pURL = `rook-custom/rook-files/${d3mDataName}/preprocess/preprocess.json`;
    console.log(d3mPreprocess);

    // 3. Read the problem schema and set 'd3mProblemDescription'
    // ...and make a call to Hello to check TA2 is up.  If we get this far, data are guaranteed to exist for the frontend

    res = await m.request("/config/d3m-config/get-problem-data-file-info");
    console.log("result from problem data file info:");
    console.log(res);

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
    // Note: if data files have "exists" as false, stay as default which is null
    //
    let set_d3m_data_path = (field, val) => res.data[field].exists ? res.data[field].path :
        res.data[field + '.gz'].exists ? res.data[field + '.gz'].path :
        val;

    zparams.zd3mdata = d3mData = set_d3m_data_path('learningData.csv', d3mData);
    zparams.zd3mtarget = set_d3m_data_path('learningData.csv', d3mData);

    // If this is the D3M domain; d3mData MUST be set to an actual value
    //
    if ((IS_D3M_DOMAIN)&&(d3mData == null)){
        const d3m_path_err = 'NO VALID d3mData path!! ' + JSON.stringify(res)
        console.log(d3m_path_err);
        alert('debug (be more graceful): ' + d3m_path_err);
    }

    // hardcoding this, once get-problem-data-file-info is revised this hardcode can go away and use the previous two LOC
    //  zparams.zd3mdata = d3mData = d3mRootPath+"/dataset_TRAIN/tables/learningData.csv";
    //  zparams.zd3mtarget = d3mRootPath+"/dataset_TRAIN/tables/learningData.csv";

    res = await m.request(d3mPS);
    // console.log("prob schema data: ", res);
    if(typeof res.success=='undefined'){            // In Task 2 currently res.success does not exist in this state, so can't check res.success==true
        // This is a Task 2 assignment
        // console.log("DID WE GET HERE?");
        task1_finished = true;
        byId("btnDiscovery").classList.remove("btn-success");
        byId("btnDiscovery").classList.add("btn-default");
        byId("btnSubmitDisc").classList.remove("btn-success");
        byId("btnSubmitDisc").classList.add("btn-default");
        byId("btnEstimate").classList.remove("btn-default");
        byId("btnEstimate").classList.add("btn-success");

    } else if (!res.success){                       // Task 1 is when res.success==false
        // This is a Task 1 assignment: no problem doc.
        task2_finished = true;
        problemDocExists = false;
    } else {
        alert("Something Unusual happened reading problem schema.")
    };

    if(problemDocExists){
        console.log("Task 2: Problem Doc Exists");

        // Note: There is no res.success field in this return state
        // if (!res.success){
        //   alert('problem schema not available: ' + res.message);
        //   return
        // }

        mytargetdefault = res.inputs.data[0].targets[0].colName; // easier way to access target name?
        if (typeof res.about.problemID !== 'undefined') {
            d3mProblemDescription.id=res.about.problemID;
        }
        if (typeof res.about.problemVersion !== 'undefined') {
            d3mProblemDescription.version=res.about.problemVersion;
        }
        if (typeof res.about.problemName !== 'undefined') {
            d3mProblemDescription.name=res.about.problemName;
        }
        if (typeof res.about.problemDescription !== 'undefined') {
            d3mProblemDescription.description = res.about.problemDescription;
        }
        if (typeof res.about.taskType !== 'undefined') {
            d3mProblemDescription.taskType=res.about.taskType;
        }
        if (typeof res.about.taskSubType !== 'undefined') {
            d3mProblemDescription.taskSubtype=res.about.taskSubType;
        }
        if (typeof res.inputs.performanceMetrics[0].metric !== 'undefined') {
            d3mProblemDescription.performanceMetrics = res.inputs.performanceMetrics;   // or? res.inputs.performanceMetrics[0].metric;
        }

        // making it case insensitive because the case seems to disagree all too often
        if (failset.includes(d3mProblemDescription.taskType.toUpperCase())) {
            if(IS_D3M_DOMAIN){
              console.log('D3M WARNING: failset  task type found');
            }
            swandive = true;
        }
    }else{
        console.log("Task 1: No Problem Doc");
        d3mProblemDescription.id="Task1";
        d3mProblemDescription.name="Task1";
        d3mProblemDescription.description = "Discovered Problems";
    };

    // 4. Read the data document and set 'datadocument'
    datadocument = await m.request(d3mDS);

    // if no columns in the datadocument, go to swandive
    // 4a. Set datadocument columns!
    let datadocument_columns;
    let col_idx;
    for (col_idx = 0; col_idx < datadocument.dataResources.length; col_idx++) {
        if(datadocument.dataResources[col_idx].columns) {
            datadocument_columns = datadocument.dataResources[col_idx].columns;
            console.log('columns found in datadocument.dataResources[' + col_idx + '].columns');
            break
        }
    }
    if (typeof datadocument_columns === "undefined") {
        console.log('D3M WARNING: datadocument.dataResources[x].columns is undefined.');
        swandive = true;
    }

    if (IS_D3M_DOMAIN) {
        let datasetName = datadocument.about.datasetID;   //.datasetName;             // Was use "datasetName" field in dataset document, but is commonly "null"
        zparams.zdata = datasetName.charAt(0).toUpperCase() + datasetName.slice(1); // Make sure to capitalize;
        let cite = "No citation provided";
        if (typeof datadocument.about.citation !== 'undefined') {
            cite = datadocument.about.citation;
        }
        //console.log(cite);
        //let newcite = cite.match(/{\s*[\w\.]+\s*}/g).map(function(x) { return x.match(/[\w\.]+/)[0]; });
        //console.log(newcite);
        /*
        // clean citation
        zparams.zdatacite = cite
        .replace(/\&/g, "and")
        .replace(/\;/g, ",")
        .replace(/\%/g, "-");
        // fill in citation in header
        elem('#cite div.panel-body').textNode = zparams.zdatacite;
        */

    } else {
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
    // drop file extension
    let dataname = IS_D3M_DOMAIN ? zparams.zdata : zparams.zdata.replace(/\.(.*)/, '');
    d3.select("#dataName").html(dataname);
    // put dataset name, from meta-data, into page title
    d3.select("title").html("TwoRavens " + dataname);

    localStorage.setItem('peekHeader' + peekId, "TwoRavens " + dataname);


    // if swandive, we have to set valueKey here so that left panel can populate.
    if (swandive) {
        alert('Exceptional data detected.  Please check the logs for "D3M WARNING"');
        //    let mydataRes = datadocument.dataResources;
        //  for (let i = 0; i < mydataRes.length; i++) {
        //       valueKey.push(mydataRes[i].resFormat[0]);
        //  }
        // end session if neither trainData nor trainTargets?
        // valueKey.length === 0 && alert("no trainData or trainTargest in data description file. valueKey length is 0");
        // perhaps allow users to unlock and select things?
        byId('btnLock').classList.add('noshow');
        byId('btnForce').classList.add('noshow');
        byId('btnEraser').classList.add('noshow');
        byId('btnSubset').classList.add('noshow');
        byId('main').style.backgroundColor = 'grey';
        byId('whitespace').style.backgroundColor = 'grey';
    }
    console.log("data schema data: ", datadocument);

    // 5. Read in zelig models (not for d3m)
    // 6. Read in zeligchoice models (not for d3m)
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
    // 7. Start the user session
    // rpc rpc Hello (HelloRequest) returns (HelloResponse) {}
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
        hopscotch.startTour(mytour);
    }

    // 8. read preprocess data or (if necessary) run preprocess
    // NOTE: preprocess.json is now guaranteed to exist...
    let read = res => {
        priv = res.dataset.private || priv;
        Object.keys(res.variables).forEach(k => preprocess[k] = res.variables[k]);
        if("problems" in res){Object.keys(res.problems).forEach(k => problems_in_preprocess[k] = res.problems[k].description.problem_id);} // storing all the problem id's present in preprocess
        return res;
    };
    try {
        console.log('attempt to read preprocess file (which may not exist): ' + pURL);
        res = read(await m.request(pURL));
    } catch(_) {
        console.log("Ok, preprocess not found, try to RUN THE PREPROCESSAPP");
        let url = ROOK_SVC_URL + 'preprocessapp';
        var json_input;
        if (IS_D3M_DOMAIN){
          // For D3M inputs, change the preprocess input data
          //
          json_input = {data: d3mData, datastub: d3mDataName};
        }else{
         json_input = {data: dataloc, target: targetloc, datastub: datastub};
        }

        console.log('json_input: ', json_input);
        console.log('url: ', url);
        let data = new FormData();
        try {
            res = read(await m.request({method: 'POST', url: url, data: json_input}));
        } catch(_) {
            console.log('preprocess failed');
            alert('preprocess failed. ending user session.');
            endsession();
        }
    }


    // console.log("is this preprocess?")
    // console.log(res);
    // console.log(preprocess);

    // 9. Build allNodes[] using preprocessed information
    // contains all the preprocessed data we have for the variable, as well as UI data pertinent to that variable,
    // such as setx values (if the user has selected them) and pebble coordinates
    setValueKey(Object.keys(preprocess));
    setAllNodes(valueKey.map((variable, i) => jQuery.extend(true, {
        id: i,
        reflexive: false,
        name: variable,
        labl: lablArray[i],
        data: [5, 15, 20, 0, 5, 15, 20],
        count: [.6, .2, .9, .8, .1, .3, .4],  // temporary values for hold that correspond to histogram bins
        nodeCol: colors(i),
        baseCol: colors(i),
        strokeColor: selVarColor,
        strokeWidth: "1",
        subsetplot: false,
        subsetrange: ["", ""],
        setxplot: false,
        setxvals: ["", ""],
        grayout: false,
        group1: false,
        group2: false,
        forefront: false
    }, preprocess[variable])))

    // 10. Add datadocument information to allNodes (when in IS_D3M_DOMAIN)
    if(!swandive) {
        datadocument_columns.forEach(v => findNode(v.colName).d3mDescription = v);
        console.log("all nodes:");
        console.log(allNodes);
    }

    // 10b. Call problem discovery
    // Requires that `res` built in 8. above still exists.  Should make this better.
    if(!swandive) {
        disco = discovery(res);

        // Set target variable for center panel if no problemDoc exists to set this
        if(!problemDocExists){
            mytarget = disco[0].target;
        };

        // Kick off discovery button as green for user guidance
        if (!task1_finished) {
            byId("btnDiscovery").classList.remove("btn-default");
            byId("btnDiscovery").classList.add("btn-success"); // Would be better to attach this as a class at creation, but don't see where it is created
        }

        // send the all problems to metadata and also perform app solver on theme
        // MIKE: is it necessary to solve all problems on page load? Can this be deferred until the user attempts to view results?
        // disco.forEach(callSolver);
    }

    // 11. Call layout() and start up
    layout(false, true);
    IS_D3M_DOMAIN ? zPop() : dataDownload();

    setTimeout(loadResult, 10000);
    problem_sent.length = 0;
}



export function loadResult(my_disco) {
    (my_disco || disco).forEach((problem, i) => {

        let prob_name = (problem.description || {}).problem_id || problem.problem_id;

        if (problems_in_preprocess.includes(prob_name))
            console.log("Problem already exists in preprocess", prob_name);
        else problem_sent.push({
            "description": problem,
            "result": solver_res[i]
        });
        // console.log("problem to be sent ", problem_sent);
    })

    // console.log("problem to be sent ", problem_sent.splice())
    let preprocess_id = 1
    let version = 1
    // addProblem(preprocess_id, version).then(api_res => console.log("ADD PROBLEM/RESULT API RESPONSE ", api_res))
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
        alert(msg);
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
    width = tempWidth.substring(0, tempWidth.length - 2);
    height = window.innerHeight - 120; // hard code header, footer, and bottom margin

    estimateLadda = Ladda.create(byId("btnEstimate"));
    discoveryLadda = Ladda.create(byId("btnSubmitDisc"));
    svg = d3.select("#whitespace");

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

let $fill = (obj, op, d1, d2) => d3.select(obj).transition()
    .attr('fill-opacity', op).attr('display', op ? '' : 'none')
    .delay(d1)
    .duration(d2);
let fill = (d, id, op, d1, d2) => $fill('#' + id + d.id, op, d1, d2);
let fillThis = (self, op, d1, d2) => $fill(self, op, d1, d2);

/**
   deletes the item at index from array.
   if object is provided, deletes first instance of object from array.
   @param {Object[]} arr - array
   @param {number} idx - index
   @param {Object} [obj] - object
*/
function del(arr, idx, obj) {
    idx = obj ? arr.indexOf(obj) : idx;
    idx > -1 && arr.splice(idx, 1);
}

/** needs doc */
function zparamsReset(text, labels='zdv zcross ztime znom') {
    labels.split(' ').forEach(x => del(zparams[x], -1, text));
}

export function setup_svg(svg) {
    // clear old elements before setting up the force diagram
    svg.html('');

    svg.append("svg:defs").append("svg:marker")
        .attr("id", "group1-arrow")
        .attr('viewBox', '0 -5 15 15')
        .attr("refX", 2.5)
        .attr("refY", 0)
        .attr("markerWidth", 3)
        .attr("markerHeight", 3)
        .attr("orient", "auto")
        .append("path")
        .attr('d', 'M0,-5L10,0L0,5')
        .style("fill", gr1Color);
    svg.append("svg:defs").append("svg:marker")
        .attr("id", "group2-arrow")
        .attr('viewBox', '0 -5 15 15')
        .attr("refX", 2.5)
        .attr("refY", 0)
        .attr("markerWidth", 3)
        .attr("markerHeight", 3)
        .attr("orient", "auto")
        .append("path")
        .attr('d', 'M0,-5L10,0L0,5')
        .style("fill", gr2Color);
    // define arrow markers for graph links
    svg.append('svg:defs').append('svg:marker')
        .attr('id', 'end-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 6)
        .attr('markerWidth', 3)
        .attr('markerHeight', 3)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5')
        .style('fill', '#000');
    svg.append('svg:defs').append('svg:marker')
        .attr('id', 'start-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 4)
        .attr('markerWidth', 3)
        .attr('markerHeight', 3)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M10,-5L0,0L10,5')
        .style('fill', '#000');

    var line = svg.append("line")
        .style('fill', 'none')
        .style('stroke', gr1Color)
        .style('stroke-width', 5)
        .attr("marker-end", "url(#group1-arrow)");
    var line2 = svg.append("line")
        .style('fill', 'none')
        .style('stroke', gr2Color)
        .style('stroke-width', 5)
        .attr("marker-end", "url(#group2-arrow)");
    var visbackground = svg.append("svg")
        .attr("width", width)
        .attr("height", height);
    visbackground.append("path") // note lines, are behind group hulls of which there is a white and colored semi transparent layer
        .attr("id", 'gr1background')
        .style("fill", '#ffffff')
        .style("stroke", '#ffffff')
        .style("stroke-width", 2.5*RADIUS)
        .style('stroke-linejoin','round')
        .style("opacity", 1);
    var vis2background = svg.append("svg")
        .attr("width", width)
        .attr("height", height);
    vis2background.append("path")
        .attr("id", 'gr1background')
        .style("fill", '#ffffff')
        .style("stroke", '#ffffff')
        .style("stroke-width", 2.5*RADIUS)
        .style('stroke-linejoin','round')
        .style("opacity", 1);
    var vis = svg.append("svg")
        .attr("width", width)
        .attr("height", height);
    vis.append("path")
        .attr("id", 'gr1hull')
        .style("fill", gr1Color)
        .style("stroke", gr1Color)
        .style("stroke-width", 2.5*RADIUS)
        .style('stroke-linejoin','round');
    var vis2 = svg.append("svg")
        .attr("width", width)
        .attr("height", height);
    vis2.append("path")
        .style("fill", gr2Color)
        .style("stroke", gr2Color)
        .style("stroke-width", 2.5*RADIUS)
        .style('stroke-linejoin','round');
    // line displayed when dragging new nodes
    var drag_line = svg.append('svg:path')
        .attr('class', 'link dragline hidden')
        .attr('d', 'M0,0L0,0');
    // handles to link and node element groups
    var path = svg.append('svg:g').selectAll('path'),
        circle = svg.append('svg:g').selectAll('g');
    return [line, line2, visbackground, vis2background, vis, vis2, drag_line, path, circle];
}


// layout function constants
const layoutAdd = "add";
const layoutMove = "move";

export function layout(layoutConstant, v2) {
    var myValues = [];
    nodes = [];
    links = [];

    var [line, line2, visbackground, vis2background, vis, vis2, drag_line, path, circle] = setup_svg(svg);

    if (layoutConstant == layoutAdd || layoutConstant == layoutMove) {
        nodes = zparams.zvars.map(findNode).filter(node => !node.grayout)
        links = zparams.zedges.map(edge => ({
            source: findNodeIndex(edge[0]),
            target: findNodeIndex(edge[1]),
            left: false,
            right: true
        }));
    } else {
        if(IS_D3M_DOMAIN) {
            mytarget = mytargetdefault;
            nodes = allNodes.slice(1,allNodes.length);  // Add all but first variable on startup (assumes 0 position is d3m index variable)
            nodes.forEach(node => node.group1 = node.name !== mytarget)
            // update zparams
            zparams.zvars = nodes.map(node => node.name);
            zparams.zgroup1 = nodes.filter(node => node.name !== mytarget).map(node => node.name);

        } else if (allNodes.length > 2) {
            nodes = [allNodes[0], allNodes[1], allNodes[2]];
            links = [{
                source: nodes[1],
                target: nodes[0],
                left: false,
                right: true
            }, {
                source: nodes[0],
                target: nodes[2],
                left: false,
                right: true
            }];
        } else if (allNodes.length === 2) {
            nodes = [allNodes[0], allNodes[1]];
            links = [{
                source: nodes[1],
                target: nodes[0],
                left: false,
                right: true
            }];
        } else if (allNodes.length === 1) {
            nodes = [allNodes[0]];
        } else {
            alert("There are zero variables in the metadata.");
            return;
        }
    }

    panelPlots(); // after nodes is populated, add subset and (if !IS_D3M_DOMAIN) setx panels

    let force = d3.layout.force()
        .nodes(nodes)
        .links(links)
        .size([width, height])
        .linkDistance(150)
        .charge(-800)
        .on('tick', tick);

    // mouse event vars
    var selected_node = null,
        selected_link = null,
        mousedown_link = null,
        mousedown_node = null,
        mouseup_node = null;

    function resetMouseVars() {
        mousedown_node = null;
        mouseup_node = null;
        mousedown_link = null;
    }

    // update force layout (called automatically each iteration)
    function tick() {
        if (is_explore_mode) {
            return;
        }

        function findcoords(findnames,allnames,coords,lengthen){
            var fcoords = new Array(findnames.length);   // found coordinates
            var addlocation = 0;
            for (var j = 0; j < findnames.length; j++) {
                addlocation = allnames.indexOf(findnames[j]);
                fcoords[j] = coords[addlocation];
            };

            if(lengthen){
                // d3.geom.hull returns null for two points, and fails if three points are in a line,
                // so this puts a couple points slightly off the line for two points, or around a singleton.
                if (fcoords.length == 2){
                    var deltax = fcoords[0][0]- fcoords[1][0];
                    var deltay = fcoords[0][1]- fcoords[1][1];
                    fcoords.push([(fcoords[0][0] + fcoords[1][0])/2 + deltay/20, (fcoords[0][1]+ fcoords[1][1])/2 + deltax/20]);
                    fcoords.push([(fcoords[0][0] + fcoords[1][0])/2 - deltay/20, (fcoords[0][1]+ fcoords[1][1])/2 - deltax/20]);
                }
                if (fcoords.length == 1){
                    var delta = RADIUS * 0.2;
                    fcoords.push([fcoords[0][0] + delta, fcoords[0][1]]);
                    fcoords.push([fcoords[0][0] - delta, fcoords[0][1]]);
                    fcoords.push([fcoords[0][0], fcoords[0][1] + delta]);
                    fcoords.push([fcoords[0][0], fcoords[0][1] - delta]);
                }
            }
            return (fcoords);
        };

        // d3.geom.hull returns null for two points, and fails if three points are in a line,
        // so this puts a couple points slightly off the line for two points, or around a singleton.
        function lengthencoords(coords){
            if (coords.length == 2){
                var deltax = coords[0][0]- coords[1][0];
                var deltay = coords[0][1]- coords[1][1];
                coords.push([(coords[0][0] + coords[1][0])/2 + deltay/20, (coords[0][1]+ coords[1][1])/2 + deltax/20]);
                coords.push([(coords[0][0] + coords[1][0])/2 - deltay/20, (coords[0][1]+ coords[1][1])/2 - deltax/20]);
            }
            if (coords.length == 1){
                var delta = RADIUS * 0.2;
                coords.push([coords[0][0] + delta, coords[0][1]]);
                coords.push([coords[0][0] - delta, coords[0][1]]);
                coords.push([coords[0][0], coords[0][1] + delta]);
                coords.push([coords[0][0], coords[0][1] - delta]);
            }
            return (coords);
        };

        var coords = nodes.map(function(d) {  return [ d.x, d.y]; });

        var gr1coords = findcoords(zparams.zgroup1, zparams.zvars, coords, true);
        var gr2coords = findcoords(zparams.zgroup2, zparams.zvars, coords, true);
        var depcoords = findcoords(zparams.zdv, zparams.zvars, coords, false);

        // draw convex hull around independent variables, if three or more coordinates given
        // note, d3.geom.hull returns null if shorter coordinate set than 3,
        // so findcoords() function has option to lengthen the coordinates returned to bypass this
        if(gr1coords.length > 2){
            line.style("opacity", 1);
            visbackground.style("opacity", 1);
            vis.style("opacity", 0.3);
            var myhull = d3.geom.hull(gr1coords);

            vis.selectAll("path")
                .data([myhull])   // returns null if less than three coordinates
                .attr("d", function(d) { return "M" + d.join("L") + "Z"; });
            visbackground.selectAll("path")
                .data([myhull])   // returns null if less than three coordinates
                .attr("d", function(d) { return "M" + d.join("L") + "Z"; });

            //var p = d3.geom.polygon(indcoords).centroid();  // Seems to go strange sometimes
            var p = jamescentroid(gr1coords);

            if(depcoords.length>0){
                var q = depcoords[0];                         // Note, only using first dep var currently
                //var r = findboundary(p,q,gr1coords);        // An approach to find the exact boundary, not presently working
                var ldeltaX = q[0] - p[0],
                    ldeltaY = q[1] - p[1],
                    ldist = Math.sqrt(ldeltaX * ldeltaX + ldeltaY * ldeltaY),
                    lnormX = 0,
                    lnormY = 0,
                    lsourcePadding = RADIUS + 7,
                    ltargetPadding = RADIUS + 10;

                if (ldist > 0){
                    lnormX = ldeltaX / ldist;
                    lnormY = ldeltaY / ldist;
                };

                line.attr("x1", p[0] + (lsourcePadding * lnormX))   // or r[0] if findboundary works
                    .attr("y1", p[1] + (lsourcePadding * lnormY))   // or r[1] if findboundary works
                    .attr("x2", q[0]- (ltargetPadding * lnormX))
                    .attr("y2", q[1]- (ltargetPadding * lnormY))
                    .style('opacity', 1);
            }
            else line.style('opacity', 0);

            // group members attract each other, repulse non-group members
            nodes.forEach(n => {
                var sign = (n.group1) ? 1 : -1;    //was: Math.sign( zparams.zgroup1.indexOf(n.name) +0.5 );  // 1 if n in group, -1 if n not in group;
                var ldeltaX = p[0] - n.x,
                    ldeltaY = p[1] - n.y,
                    ldist = Math.sqrt(ldeltaX * ldeltaX + ldeltaY * ldeltaY);
                    lnormX = 0,
                    lnormY = 0;

                if (ldist > 0){
                    lnormX = ldeltaX / ldist;
                    lnormY = ldeltaY / ldist;
                };

                n.x += Math.min(lnormX , ldeltaX/100 ) * k * sign   * force.alpha();
                n.y += Math.min(lnormY , ldeltaY/100 ) * k * sign   * force.alpha();
            });

        } else {
            visbackground.style("opacity", 0);
            vis.style("opacity", 0);
            line.style("opacity", 0);
        };

        if(gr2coords.length > 2){
            line2.style("opacity", 1);
            vis2background.style("opacity", 1);
            vis2.style("opacity", 0.3);
            var myhull = d3.geom.hull(gr2coords);
            vis2.selectAll("path")
                .data([myhull])   // returns null if less than three coordinates
                .attr("d", function(d) { return "M" + d.join("L") + "Z"; });
            vis2background.selectAll("path")
                .data([myhull])   // returns null if less than three coordinates
                .attr("d", function(d) { return "M" + d.join("L") + "Z"; });

            //var p = d3.geom.polygon(indcoords).centroid();  // Seems to go strange sometimes
            var p = jamescentroid(gr2coords);

            if(depcoords.length>0){
                var q = depcoords[0];                             // Note, only using first dep var currently
                var ldeltaX = q[0] - p[0],
                    ldeltaY = q[1] - p[1],
                    ldist = Math.sqrt(ldeltaX * ldeltaX + ldeltaY * ldeltaY),
                    lnormX = ldeltaX / ldist,
                    lnormY = ldeltaY / ldist,
                    lsourcePadding = RADIUS + 7,
                    ltargetPadding = RADIUS + 10;

                line2.attr("x1", p[0] + (lsourcePadding * lnormX))
                    .attr("y1", p[1] + (lsourcePadding * lnormY))
                    .attr("x2", q[0]- (ltargetPadding * lnormX))
                    .attr("y2", q[1]- (ltargetPadding * lnormY))
                    .style('opacity', 0);
            }
            else line2.style('opacity', 0);

            // group members attract each other, repulse non-group members
            nodes.forEach(n => {
                var sign = (n.group2) ? 1 : -1;  // was: Math.sign( zparams.zgroup2.indexOf(n.name) +0.5 );  // 1 if n in group, -1 if n not in group;
                var ldeltaX = p[0] - n.x,
                    ldeltaY = p[1] - n.y,
                    ldist = Math.sqrt(ldeltaX * ldeltaX + ldeltaY * ldeltaY),
                    lnormX = 0,
                    lnormY = 0;

                if (ldist > 0){
                    lnormX = ldeltaX / ldist;
                    lnormY = ldeltaY / ldist;
                };

                n.x += Math.min(lnormX , ldeltaX/100 ) * k * sign   * force.alpha();
                n.y += Math.min(lnormY , ldeltaY/100 ) * k * sign   * force.alpha();
            });


        }else{
            vis2background.style("opacity", 0);
            vis2.style("opacity", 0);
            line2.style("opacity", 0);
        };

        // draw directed edges with proper padding from node centers
        path.attr('d', d => {
            var deltaX = d.target.x - d.source.x,
                deltaY = d.target.y - d.source.y,
                dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
                normX = deltaX / dist,
                normY = deltaY / dist,
                sourcePadding = d.left ? RADIUS + 5 : RADIUS,
                targetPadding = d.right ? RADIUS + 5 : RADIUS,
                sourceX = d.source.x + (sourcePadding * normX),
                sourceY = d.source.y + (sourcePadding * normY),
                targetX = d.target.x - (targetPadding * normX),
                targetY = d.target.y - (targetPadding * normY);
            return `M${sourceX},${sourceY}L${targetX},${targetY}`;
        });

        circle.attr('transform', d => 'translate(' + d.x + ',' + d.y + ')');

        circle.selectAll('circle')           // Shrink/expand pebbles that join/leave groups
            .transition()
            .duration(100)
            .attr('r', d => setPebbleRadius(d));
    }

    // this is to detect a click in the whitespace, but not on a pebble
    let outsideClick = false;

    let redrawPebble = pebble => {
        // nullity check for when reintroducing variable from variable list
        if (pebble === null) return;
        let data = pebble.__data__;

        let radius = setPebbleRadius(data);
        if (data.plottype == 'continuous') densityNode(data, pebble, setPebbleRadius(data));
        else if (data.plottype == 'bar') barsNode(data, pebble, setPebbleRadius(data));

        d3.select(pebble.querySelector("[id^='pebbleLabel']")).style('font-size', radius * .175 + 7 + 'px')  // proportional scaling would be 14 / 40, but I added y-intercept at 7
        d3.select(pebble.querySelector("[id^='dvArc']")).attr("d", arc3(radius))
        d3.select(pebble.querySelector("[id^='nomArc']")).attr("d", arc4(radius))
        d3.select(pebble.querySelector("[id^='grArc']")).attr("d", arc1(radius))
        d3.select(pebble.querySelector("[id^='gr1indicator']")).attr("d", arcInd1(radius))
        d3.select(pebble.querySelector("[id^='gr2indicator']")).attr("d", arcInd2(radius))

        if (!data.forefront && data.name !== selectedPebble) {
            fillThis(pebble.querySelector('[id^=grArc]'), 0, 100, 500);
            fill(data, "grText", 0, 100, 500);
            fillThis(pebble.querySelector('[id^=dvArc]'), 0, 100, 500);
            fill(data, "dvText", 0, 100, 500);
            fillThis(pebble.querySelector('[id^=nomArc]'), 0, 100, 500);
            fill(data, "nomText", 0, 100, 500);
            fill(data, "gr1indicator", 0, 100, 500);
            fill(data, "gr2indicator", 0, 100, 500);
        }
    }

    // update graph (called when needed)
    restart = function($links) {
        if (is_results_mode) {
            return;
        }

        links = $links || links;
        // nodes.id is pegged to allNodes, i.e. the order in which variables are read in
        // nodes.index is floating and depends on updates to nodes.  a variables index changes when new variables are added.
        circle.call(force.drag);
        if (forcetoggle[0] == "true") {
            force.gravity(0.1);
            force.charge(d => setPebbleCharge(d));
            force.start();
            force.linkStrength(1);
            k = 4; // strength parameter for group attraction/repulsion
            if ((zparams.zgroup1.length > 0) & (zparams.zgroup2.length > 0 )) { // scale down by number of active groups
                k = 2.5;
            }
        } else {
            force.gravity(0);
            force.charge(0);
            force.linkStrength(0);
            k = 0;
        }
        force.resume();

        // path (link) group
        path = path.data(links);

        let marker = side => x => {
            let kind = side === 'left' ? 'start' : 'end';
            return is_explore_mode ? 'url(#circle)' :
                x[side] ? `url(#${kind}-arrow)` :
                    '';
        };

        // update existing links
        // VJD: dashed links between pebbles are "selected". this is disabled for now
        path.classed('selected', x => null)
            .style('marker-start', marker('left'))
            .style('marker-end', marker('right'));

        // add new links
        path.enter().append('svg:path')
            .attr('class', 'link')
            .classed('selected', x => null)
            .style('marker-start', marker('left'))
            .style('marker-end', marker('right'))
            .on('mousedown', function(d) { // do we ever need to select a link? make it delete..
                var obj = JSON.stringify(d);
                for (var j = 0; j < links.length; j++) {
                    if (obj === JSON.stringify(links[j]))
                        del(links, j);
                }
            });

        // remove old links
        path.exit().remove();

        // circle (node) group
        circle = circle.data(nodes, x => x.id);

        // remove handles and make sure pebbles are properly sized when restart is called
        circle[0].forEach(redrawPebble)

        // update existing nodes (reflexive & selected visual states)
        // d3.rgb is the function adjusting the color here
        circle.selectAll('circle')
            .classed('reflexive', x => x.reflexive)
            .style('fill', x => d3.rgb(x.nodeCol))
            .style('stroke', x => d3.rgb(x.strokeColor))
            .style('stroke-width', x => x.strokeWidth);
        // add new nodes
        let g = circle.enter()
            .append('svg:g')
            .attr('id', x => x.name + 'biggroup');

        // add plot
        g.each(function(d) {
            d3.select(this);
            if (d.plottype == 'continuous') densityNode(d, this, setPebbleRadius(d));
            else if (d.plottype == 'bar') barsNode(d, this, setPebbleRadius(d));
        });

        let append = (str, attr) => x => str + x[attr || 'id'];

        g.append("path").each(function(d) {
            let radius = setPebbleRadius(d);
            d3.select(this)
                .attr("id", append('dvArc'))
                .attr("d", arc3(radius))
                .style("fill", dvColor)
                .attr("fill-opacity", 0)
                .on('mouseover', function(d) {
                    d.forefront = true;
                    if (hoverPebble === d.name) {
                        setTimeout(() => {
                            if (!d.forefront) return;
                            hoverPebble = d.name;
                            fillThis(this, .3, 0, 100);
                            fill(d, 'dvText', .9, 0, 100);
                        }, hoverTimeout)
                    }
                })
                .on('mouseout', function(d) {
                    d.forefront = false;
                    if (d.name === selectedPebble) return;
                    setTimeout(() => {
                        fillThis(this, 0, 100, 500);
                        fill(d, 'dvText', 0, 100, 500);
                    }, hoverTimeout)
                })
                .on('click', function(d) {
                    setColors(d, dvColor);
                    selectedPebble = d.name;
                    restart();
                    m.redraw();
                });
        })

        g.append("text")
            .attr("id", append('dvText'))
            .attr("x", 6)
            .attr("dy", 11.5)
            .attr("fill-opacity", 0)
            .append("textPath")
            .attr("xlink:href", append('#dvArc'))
            .text("Dep Var");

        g.append("path").each(function(d) {
            let radius = setPebbleRadius(d);
            d3.select(this)
                .attr("id", append('nomArc'))
                .attr("d", arc4(radius))
                .style("fill", nomColor)
                .attr("fill-opacity", 0)
                .on('mouseover', function (d) {
                    if (d.defaultNumchar == "character") return;
                    d.forefront = true;
                    if (hoverPebble === d.name) {
                        setTimeout(() => {
                            if (!d.forefront) return;
                            hoverPebble = d.name;
                            fillThis(this, .3, 0, 100);
                            fill(d, "nomText", .9, 0, 100);
                        }, hoverTimeout)
                    }
                })
                .on('mouseout', function (d) {
                    if (d.defaultNumchar == "character") return;
                    d.forefront = false;
                    if (d.name === selectedPebble) return;
                    setTimeout(() => {
                        fillThis(this, 0, 100, 500);
                        fill(d, "nomText", 0, 100, 500);
                    }, hoverTimeout)
                })
                .on('click', function (d) {
                    if (d.defaultNumchar == "character") return;
                    setColors(d, nomColor);
                    selectedPebble = d.name;
                    restart();
                    m.redraw();
                });
        });

        g.append("text")
            .attr("id", append("nomText"))
            .attr("x", 6)
            .attr("dy", 11.5)
            .attr("fill-opacity", 0)
            .append("textPath")
            .attr("xlink:href", append("#nomArc"))
            .text("Nominal");

        g.append("path").each(function(d) {
            let radius = setPebbleRadius(d);
            d3.select(this)
                .attr("id", append('grArc'))
                .attr("d", arc1(radius))
                .style("fill", gr1Color)
                .attr("fill-opacity", 0)
                .on('mouseover', function (d) {
                    fill(d, "gr1indicator", .3, 0, 100);
                    fill(d, "gr2indicator", .3, 0, 100);
                    d.forefront = true;
                    if (hoverPebble === d.name) {
                        setTimeout(() => {
                            if (!d.forefront) return;
                            hoverPebble = d.name;
                            fillThis(this, .3, 0, 100);
                            fill(d, 'grText', .9, 0, 100);
                        }, hoverTimeout)
                    }
                })
                .on('mouseout', function (d) {
                    d.forefront = false;
                    if (d.name === selectedPebble) return;
                    setTimeout(() => {
                        fill(d, "gr1indicator", 0, 100, 500);
                        fill(d, "gr2indicator", 0, 100, 500);
                        fillThis(this, 0, 100, 500);
                        fill(d, 'grText', 0, 100, 500);
                    }, hoverTimeout)
                })
                .on('click', d => {
                    setColors(d, gr1Color);
                    selectedPebble = d.name;
                    restart();
                    m.redraw();
                });
        });

        g.append("path").each(function(d) {
            let radius = setPebbleRadius(d);
            d3.select(this)
                .attr("id", append('gr1indicator'))
                .attr("d", arcInd1(radius))
                .style("fill", gr1Color)  // something like: zparams.zgroup1.indexOf(node.name) > -1  ?  #FFFFFF : gr1Color)
                .attr("fill-opacity", 0)
                .on('mouseover', function (d) {
                    d.forefront = true;
                    if (hoverPebble === d.name) {
                        setTimeout(() => {
                            if (!d.forefront) return;
                            hoverPebble = d.name;
                            fillThis(this, .3, 0, 100);
                            fill(d, "grArc", .1, 0, 100);
                            fill(d, 'grText', .9, 0, 100);
                        }, hoverTimeout)
                    }
                })
                .on('mouseout', function (d) {
                    d.forefront = false;
                    if (d.name === selectedPebble) return;
                    setTimeout(() => {
                        fillThis(this, 0, 100, 500);
                        fill(d, "grArc", 0, 100, 500);
                        fill(d, 'grText', 0, 100, 500);
                    }, hoverTimeout)
                })
                .on('click', d => {
                    setColors(d, gr1Color);
                    selectedPebble = d.name;
                    restart();
                    m.redraw();
                });
        });

        g.append("path").each(function(d) {
            let radius = setPebbleRadius(d);
            d3.select(this)
                .attr("id", append('gr2indicator'))
                .attr("d", arcInd2(radius))
                .style("fill", gr2Color)  // something like: zparams.zgroup1.indexOf(node.name) > -1  ?  #FFFFFF : gr1Color)
                .attr("fill-opacity", 0)
                .on('mouseover', function (d) {
                    d.forefront = true;
                    if (hoverPebble === d.name) {
                        setTimeout(() => {
                            if (!d.forefront) return;
                            hoverPebble = d.name;
                            fillThis(this, .3, 0, 100);
                            fill(d, "grArc", .1, 0, 100);
                            fill(d, 'grText', .9, 0, 100);
                        }, hoverTimeout)
                    }
                })
                .on('mouseout', function (d) {
                    d.forefront = false;
                    if (d.name === selectedPebble) return;
                    setTimeout(() => {
                        fillThis(this, 0, 100, 500);
                        fill(d, "grArc", 0, 100, 500);
                        fill(d, 'grText', 0, 100, 500);
                    }, hoverTimeout)
                })
                .on('click', d => {
                    setColors(d, gr2Color);
                    selectedPebble = d.name;
                    restart();
                    m.redraw();
                });
        });

        g.append("text")
            .attr("id", append('grText'))
            .attr("x", 6)
            .attr("dy", 11.5)
            .attr("fill-opacity", 0)
            .append("textPath")
            .attr("xlink:href", append('#grArc'))
            .text("Groups");

        g.append('svg:circle')
            .attr('class', 'node')
            .attr('r', d => setPebbleRadius(d))
            .style('pointer-events', 'inherit')
            .style('fill', d => d.nodeCol)
            .style('opacity', "0.5")
            .style('stroke', d => d3.rgb(d.strokeColor).toString())
            .classed('reflexive', d => d.reflexive)
            // TODO should this be used?
            .on('dblclick', function(_) {
                d3.event.stopPropagation(); // stop click from bubbling
                summaryHold = true;
            })
            .on('click', function(d) {
                selectedPebble = d.name;
                outsideClick = false;
                restart();
                m.redraw();
            })
            .on('contextmenu', function(d) {
                // right click on node
                d3.event.preventDefault();
                d3.event.stopPropagation();

                rightClickLast = true;
                mousedown_node = d;
                selected_node = mousedown_node === selected_node ? null : mousedown_node;
                selected_link = null;

                // reposition drag line
                drag_line
                    .style('marker-end', is_explore_mode? 'url(#end-marker)' : 'url(#end-arrow)')
                    .classed('hidden', false)
                    .attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y);

                svg.on('mousemove', mousemove);
                restart();
            })
            .on('mouseup', function(d) {
                d3.event.stopPropagation();

                if (rightClickLast) {
                    rightClickLast = false;
                    return;
                }
                if (!mousedown_node) return;

                // needed by FF
                drag_line
                    .classed('hidden', true)
                    .style('marker-end', '');

                // check for drag-to-self
                mouseup_node = d;
                if (mouseup_node === mousedown_node) {
                    resetMouseVars();
                    return;
                }

                // unenlarge target node
                d3.select(this).attr('transform', '');

                // add link to graph (update if exists)
                // NB: links are strictly source < target; arrows separately specified by booleans
                var source, target, direction;
                if (mousedown_node.id < mouseup_node.id) {
                    source = mousedown_node;
                    target = mouseup_node;
                    direction = 'right';
                } else {
                    source = mouseup_node;
                    target = mousedown_node;
                    direction = 'left';
                }

                let link = links.filter(x => x.source == source && x.target == target)[0];
                if (link) {
                    link[direction] = true;
                } else {
                    link = {
                        source: source,
                        target: target,
                        left: false,
                        right: false
                    };
                    link[direction] = true;
                    links.push(link);
                }

                // select new link
                selected_link = link;
                selected_node = null;
                svg.on('mousemove', null);

                resetMouseVars();
                restart();
            });

        // show node names
        g.append('svg:text')
            .attr('id', append('pebbleLabel'))
            .attr('x', 0)
            .attr('y', 15)
            .attr('class', 'id')
            .text(d => d.name);

        // show summary stats on mouseover
        // SVG doesn't support text wrapping, use html instead
        g.selectAll("circle.node")
            .on("mouseover", d => {

                d.forefront = true;

                setTimeout(() => {
                    if (leftTab !== 'Summary') leftTabHidden = leftTab;
                    setLeftTab('Summary');
                    varSummary(d);

                    m.redraw();

                    if (!d.forefront) return;
                    hoverPebble = d.name;

                    fill(d, "dvArc", .1, 0, 100);
                    fill(d, "dvText", .5, 0, 100);
                    fill(d, "grArc", .1, 0, 100);
                    fill(d, "grText", .5, 0, 100);

                    //fill(d, "gr1indicator", .1, 0, 100);
                    //fill(d, "gr1indicatorText", .1, 0, 100);
                    //fill(d, "gr2indicator", .1, 0, 100);
                    //fill(d, "gr2indicatorText", .1, 0, 100);

                    if (d.defaultNumchar == "numeric") {
                        fill(d, "nomArc", .1, 0, 100);
                        fill(d, "nomText", .5, 0, 100);
                    }
                    fill(d, "csArc", .1, 0, 100);
                    fill(d, "csText", .5, 0, 100);
                    fill(d, "timeArc", .1, 0, 100);
                    fill(d, "timeText", .5, 0, 100);
                }, hoverTimeout)
            })
            .on('mouseout', d => {
                d.forefront = false;
                setTimeout(() => {
                    hoverPebble = undefined;

                    if (selectedPebble) varSummary(allNodes.find((node) => node.name === selectedPebble));
                    else setLeftTab(leftTabHidden);

                    if (selectedPebble !== d.name)
                        'csArc csText timeArc timeText dvArc dvText nomArc nomText grArc grText'.split(' ').map(x => fill(d, x, 0, 100, 500));

                    m.redraw();
                }, hoverTimeout)
            });

        // remove old nodes
        circle.exit().remove();
        force.start();

        // save workspaces
        // console.log('ok ws');
        record_user_metadata();
    }

    function mousedown(d) {
        selectedPebble = undefined;
        // prevent I-bar on drag
        d3.event.preventDefault();
        // because :active only works in WebKit?
        svg.classed('active', true);
        if (d3.event.ctrlKey || mousedown_node || mousedown_link) return;
        outsideClick = true;
        restart();
    }

    function mousemove(d) {
        if (!mousedown_node)
            return;
        // update drag line
        drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);
    }

    function mouseup(d) {
        if (mousedown_node) {
            drag_line
                .classed('hidden', true)
                .style('marker-end', '');
        }
        if (outsideClick) {
            outsideClick = false;
            if (leftTabHidden) {
                setLeftTab(leftTabHidden);
                leftTabHidden = undefined;
                m.redraw();
            }
        }
        // because :active only works in WebKit?
        svg.classed('active', false);
        // clear mouse event vars
        resetMouseVars();
    }

    // app starts here
    svg.attr('id', () => "whitespace".concat(myspace))
        .attr('height', height)
        .attr('width', width)
        .on('mousedown', function() {mousedown(this);})
        .on('mouseup', function() {mouseup(this);});

    restart(); // initializes force.layout()
    fakeClick();

    if(v2 && IS_D3M_DOMAIN) {
        var click_ev = document.createEvent("MouseEvents");
        // initialize the event
        click_ev.initEvent("click", true /* bubble */, true /* cancelable */);
        // trigger the event
        byId("dvArc" + findNodeIndex(mytarget)).dispatchEvent(click_ev);

        // The dispatched click sets the leftpanel. This switches the panel back on page load
        selectedPebble = undefined;
        mouseup();
    }
}

/** needs doc */
function find($nodes, name) {
    for (let i in $nodes)
        if ($nodes[i].name == name) return $nodes[i].id;
}

// returns index of node in allNodes by node name
export function findNodeIndex(name) {
    return allNodes.findIndex(node => node.name === name)
}

// return node in allNodes by node name
export function findNode(name) {
    return allNodes.find(node => node.name === name);
}

/** needs doc */
//
function updateNode(id, nodes) {

    let node = allNodes.find(node => node.name === id) || nodes.find(node => node.name === id);

    if (node === undefined) {
        let i = 0;
        while (nodes.find(tempNode => tempNode.id === i)) i++;

        node = {
            id: i,
            reflexive: false,
            name: id,
            labl: 'no label',
            data: [5, 15, 20, 0, 5, 15, 20],
            count: [.6, .2, .9, .8, .1, .3, .4],  // temporary values for hold that correspond to histogram bins
            nodeCol: colors(i),
            baseCol: colors(i),
            strokeColor: selVarColor,
            strokeWidth: "1",
            subsetplot: false,
            subsetrange: ["", ""],
            setxplot: false,
            setxvals: ["", ""],
            grayout: false,
            group1: false,
            group2: false,
            forefront: false
        }
    }

    if (node.grayout) return false;

    let name = node.name;
    let names = _ => nodes.map(n => n.name);
    if (names().includes(name)) {
        del(nodes, node.index, is_explore_mode && node);
        if (!is_explore_mode) {
            links
                .filter(l => l.source === node || l.target === node)
                .forEach(l => del(links, -1, l));
            zparamsReset(name);

            // remove node name from group lists
            node.group1 && del(zparams.zgroup1, -1, name);
            node.group2 && del(zparams.zgroup2, -1, name);
            node.group1 = node.group2 = false;

            // node reset - perhaps this will become a hard reset back to all original allNode values?
            node.nodeCol = node.baseCol;
            node.strokeColor = selVarColor;
            node.strokeWidth = '1';
        }
    } else nodes.push(node);

    if (is_explore_mode) return false;

    zparams.zvars = names();
    return true;
}

/**
 every time a variable in leftpanel is clicked, nodes updates and background color changes
 */
export function clickVar(elem, $nodes) {
    if (is_explore_mode && $nodes && !$nodes.map(x => x.name).includes(elem)) {
        let max = exploreVariate === 'Univariate' ? 1
            : exploreVariate === 'Bivariate' ? 2
            : exploreVariate === 'Trivariate' ? 3
            : 5;
        if ($nodes.length >= max) {
            alert('Please deselect another variable first.')
            return;
        }
    }

    if (updateNode(elem, $nodes || nodes)) {
        // panelPlots(); is this necessary?
        restart();
    }
}

// Used for left panel variable search
export let matchedVariables = [];
export let searchVariables = val => {
    matchedVariables.length = 0;
    let [others, match] = [[], (n, key) => n[key].toLowerCase().includes(val.toLowerCase())];
    allNodes.forEach(n => match(n, 'name') || match(n, 'labl') ? matchedVariables.push(n.name) : others.push(n.name));
    valueKey = matchedVariables.concat(others);

    // Just because having every variable bordered all the time is not pleasant
    if (val === '') matchedVariables.length = 0;
};

/**
 Retrieve the variable list from the preprocess data.
 This helps handle the new format and (temporarily)
 the older format in PRODUCTION (rp 8.14.2017)
 "new" response:
 {
 "dataset" : {...}
 "variables" : {
 "var1" : {...},
 (etc)
 }
 }
 "old" response:
 {
 "var1" : {...},
 (etc)
 }
 */
export function getVariableData(json) {
    return json.hasOwnProperty('variables') ? json.variables : json;
}

/**
 called by force button
 */
export function forceSwitch() {
    forcetoggle = [forcetoggle[0] == 'true' ? 'false' : 'true'];
    if (forcetoggle[0] === "false") {
        byId('btnForce').setAttribute("class", "btn active");
    } else {
        byId('btnForce').setAttribute("class", "btn btn-default");
        fakeClick();
    }
}

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

/** needs doc */
export function zPop() {
    if (dataurl) zparams.zdataurl = dataurl;
    zparams.zmodelcount = modelCount;
    zparams.zedges = [];
    zparams.zvars = [];
    zparams.znature = [];
    for (let j = 0; j < nodes.length; j++) { //populate zvars array
        zparams.zvars.push(nodes[j].name);
        zparams.znature.push(nodes[j].nature);
        let temp = nodes[j].id;
        zparams.zsetx[j] = allNodes[temp].setxvals;
        zparams.zsubset[j] = allNodes[temp].subsetrange;
    }
    for (let j = 0; j < links.length; j++) { //populate zedges array
        //correct the source target ordering for Zelig
        let srctgt = links[j].left == false ?
            [links[j].source.name, links[j].target.name] :
            [links[j].target.name, links[j].source.name];
        zparams.zedges.push(srctgt);
    }
}

// when selected, the key/value [mode]: [pipelineID] is set.
export let selectedPipeline;
export let setSelectedPipeline = result => {
    selectedPipeline = result;
    if (currentMode === 'model') resultsplotinit(result);
}

export let selectedResultsMenu;
export let setSelectedResultsMenu = result => selectedResultsMenu = result;

export let selectedDiscoverySolutionMenu;
export let setSelectedDiscoverySolutionMenu = result => selectedDiscoverySolutionMenu = result;

// No longer used:
// Update table when pipeline is fitted
//function onPipelineCreate(PipelineCreateResult, id) {
//    let myscore = PipelineCreateResult.data.response.scores[0].value.raw.double.toPrecision(3);   // Makes a number of assumptions about how values are returned, also need to attempt to deal w multiple scores
//    let matchedPipeline = pipelineTable.find(candidate => candidate['PipelineID'] === parseInt(id, 10))
//    matchedPipeline['Score'] = String(myscore);
//}

// Update table when pipeline is solved
function onPipelinePrime(PipelineCreateResult, rookpipe) {

    // Need to deal with (exclude) pipelines that are reported, but failed.  For approach, see below.



    if(PipelineCreateResult.id in allPipelineInfo) {
        allPipelineInfo[PipelineCreateResult.id] = Object.assign(allPipelineInfo[PipelineCreateResult.id], PipelineCreateResult);
    } else {
        allPipelineInfo[PipelineCreateResult.id] = PipelineCreateResult;
        pipelineTable.push({
            'PipelineID': PipelineCreateResult.id,
            'Score': "scoring"
        });
    }

        // this will NOT report the pipeline to user if pipeline has failed, if pipeline is still running, or if it has not completed
        // if(allPipelineInfo[key].responseInfo.status.details == "Pipeline Failed")  {
        //     continue;
        // }
        // if(allPipelineInfo[key].progressInfo == "RUNNING")  {
        //     continue;
        // }

    //adding rookpipe to allPipelineInfo
    allPipelineInfo.rookpipe=rookpipe;                // This is setting rookpipe for the entire table, but when there are multiple CreatePipelines calls, this is only recording latest values

    // VJD: these two functions are built and (I believe) functioning as intended. These exercise two core API calls that are currently unnecessary
    //eline(pipelineTable[1][1]);
    //listpipelines();

    // VJD: this is a third core API call that is currently unnecessary
    //let pipelineid = PipelineCreateResult.pipelineid;
    // getexecutepipelineresults is the third to be called
  //  makeRequest(D3M_SVC_URL + '/getexecutepipelineresults', {context, pipeline_ids: Object.keys(allPipelineInfo)});
}

function CreatePipelineData(predictors, depvar, aux) {
    let context = apiSession(zparams.zsessionid);
    let uriCsv = zparams.zd3mdata;
    let uriJson = uriCsv.substring(0, uriCsv.lastIndexOf("/tables")) + "/datasetDoc.json";
    let targetFeatures = [{ 'resource_id': "0", 'feature_name': depvar[0] }];
    let predictFeatures = [];
    for (var i = 0; i < predictors.length; i++) {
        predictFeatures[i] = { 'resource_id': "0", 'feature_name': predictors[i] };
    }
    if(typeof aux==="undefined") { //default behavior for creating pipeline data
    return {
        context,
        dataset_uri: uriJson,   // uriCsv is also valid, but not currently accepted by ISI TA2
        task: d3mTaskType[d3mProblemDescription.taskType][1],
        taskSubtype: d3mTaskSubtype[d3mProblemDescription.taskSubtype][1],
        taskDescription: d3mProblemDescription.taskDescription,
        output: "OUTPUT_TYPE_UNDEFINED",  // valid values will come in future API
        metrics: [d3mMetrics[d3mProblemDescription.metric][1]],
        targetFeatures,
        /* Example:
          "targetFeatures": [
          {
              "resource_id": "0",
              "feature_name": "At_bats"
          }
          ],
        */
        predictFeatures,
        /* Example:
          "predictReatures": [
          {
            "resource_id": "0",
            "feature_name": "RBIs"
          }
          ],
        */
        maxPipelines: 5 //user to specify this eventually?
    };}
    else { //creating pipeline data for problem discovery using aux inputs
        return {
        context,
        dataset_uri: uriJson,   // uriCsv is also valid, but not currently accepted by ISI TA2
        task: aux.task,
        taskSubtype: "TASK_SUBTYPE_UNDEFINED",
        taskDescription: aux.description,
        output: "OUTPUT_TYPE_UNDEFINED",
        metrics: [aux.metrics],
        targetFeatures,
        predictFeatures,
        maxPipelines: 1
        };
    }
}

// Update of old CreatePipelineData function that creates problem definition for SearchSolutions call.
function CreateProblemDefinition(depvar, aux) {

    let targetFeatures = [{ 'resource_id': "0", 'feature_name': depvar[0] }];    // not presently being used in this function
    let my_target = depvar[0];


    if(typeof aux==="undefined") { //default behavior for creating pipeline data
        let problem = {
            id: d3mProblemDescription.id,
            version: d3mProblemDescription.version,
            name: d3mProblemDescription.name,
            description: d3mProblemDescription.description,
            taskType: d3mTaskType[d3mProblemDescription.taskType][1],
            taskSubtype: d3mTaskSubtype[d3mProblemDescription.taskSubtype][1],
            performanceMetrics: [{metric: d3mMetrics[d3mProblemDescription.performanceMetrics[0].metric][1]} ]  // need to generalize to case with multiple metrics.  only passes on first presently.
        };
        let inputs =  [
            {
                datasetId: datadocument.about.datasetID,
                targets: [
                    {
                        resourceId: '0',
                        columnIndex: valueKey.indexOf(my_target) - 1,  // the -1 is to make zero indexed
                        columnName: my_target
                    }
                ]}];

        return {problem: problem, inputs: inputs};
    } else { //creating pipeline data for problem discovery using aux inputs from disco line

        let problem = {
            id: aux.problem_id,
            version: '1.0',
            name: aux.problem_id,
            description: aux.description,
            taskType: d3mTaskType[aux.task][1],
            taskSubtype: 'TASK_SUBTYPE_UNDEFINED',
            performanceMetrics: [{metric: d3mMetrics[aux.metric][1]}]  // need to generalize to case with multiple metrics.  only passes on first presently.
        };
        let inputs =  [
            {
                datasetId: datadocument.about.datasetID,
                targets: [
                    {
                        resourceId: '0',
                        columnIndex: valueKey.indexOf(my_target) - 1,  // the -1 is to make zero indexed
                        columnName: my_target
                    }
                ]}];
        return {problem, inputs};

    }
}

// Create a problem description that follows the Problem Schema, for the Task 1 output.
function CreateProblemSchema(aux){
    let my_target = aux.target;

    let my_about = {
        problemID: aux.problem_id,
        problemName: aux.problem_id,
        problemDescription: aux.description,
        taskType: d3mTaskType[aux.task][1],
        problemVersion: '1.0',
        problemSchemaVersion: '3.1.1'
    };
    let my_inputs = {
        data: [
            {
                datasetId: datadocument.about.datasetID,
                targets: [
                    {
                        resourceId: '0',
                        columnIndex: valueKey.indexOf(my_target) - 1,  // the -1 is to make zero indexed
                        columnName: my_target
                    }
                ]}],
        dataSplits: {
            method: 'holdOut',
            testSize: 0.2,
            stratified: true,
            numRepeats: 0,
            randomSeed: 123,
            splitsFile: 'dataSplits.csv'
            },
        performanceMetrics: [{metric: d3mMetrics[aux.metric][1]}]
    };

    return {about: my_about, inputs: my_inputs, expectedOutputs: {predictionsFile: 'predictions.csv'}};
}

function CreatePipelineDefinition(predictors, depvar, timeBound, aux) {
    let my_timeBound = 1;
    if(typeof timeBound !== 'undefined'){
        my_timeBound = timeBound;
    }
    let my_userAgent = TA3_GRPC_USER_AGENT;              // set on django server
    let my_version = TA3TA2_API_VERSION;                 // set on django server
    let my_allowedValueTypes = ['DATASET_URI', 'CSV_URI'];      // Get from elsewhere
    let my_problem = CreateProblemDefinition(depvar, aux);
    let my_template = makePipelineTemplate(aux);
    //console.log(my_problem);
    let my_dataseturi = 'file://' + datasetdocurl;
    // console.log(my_dataseturi);
    return {userAgent: my_userAgent, version: my_version, timeBound: my_timeBound, priority: 1, allowedValueTypes: my_allowedValueTypes, problem: my_problem, template: my_template, inputs: [{dataset_uri: my_dataseturi}] };
}



function CreateFitDefinition(solutionId){

    let fitDefn = getFitSolutionDefaultParameters();
    fitDefn.solutionId = solutionId;
    return fitDefn;
}

/**
    Return the default parameters used for a FitSolution call.
    This DOES NOT include the solutionID
 */
export function getFitSolutionDefaultParameters(){

  let my_dataseturi = 'file://' + datasetdocurl;
  let my_inputs = [{dataset_uri: my_dataseturi}];
  let my_exposeOutputs = [];   // eg. ["steps.3.produce"];  need to fix
  let my_exposeValueTypes = ['CSV_URI'];
  let my_users = [{id: 'TwoRavens', choosen: false, reason: ''}];
  return {inputs: my_inputs,
          exposeOutputs: my_exposeOutputs,
          exposeValueTypes: my_exposeValueTypes,
          users: my_users};
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
//             "choosen": true,
//             "reason": "best solution"
//         },
//         {
//             "id": "uuid of user",
//             "choosen": false,
//             "reason": ""
//         }
//     ]
// }

function CreateProduceDefinition(fsid){

    let produceDefn = getProduceSolutionDefaultParameters();
    produceDefn.fittedSolutionId = fsid
    return produceDefn;
}

/*
  Return the default parameters used for a ProduceSolution call.
  This DOES NOT include the fittedSolutionId
*/
export function getProduceSolutionDefaultParameters(){

  let my_dataseturi = 'file://' + datasetdocurl;
  let my_inputs = [{dataset_uri: my_dataseturi}];
  let my_exposeOutputs = [];  // Not sure about this.
  let my_exposeValueTypes = ['CSV_URI']; // Not sure about this.
  return {inputs: my_inputs,
          exposeOutputs: my_exposeOutputs,
          exposeValueTypes: my_exposeValueTypes};
}



function CreateScoreDefinition(res){

  if (typeof res.response.solutionId === undefined){
      let errMsg = 'ERROR: CreateScoreDefinition. solutionId not set.'
      console.log(errMsg);
      return {errMsg: errMsg};
  }

  let createDefn = getScoreSolutionDefaultParameters();
  createDefn.solutionId = res.response.solutionId;
  return createDefn;

}

/*
  Return the default parameters used for a ProduceSolution call.
  This DOES NOT include the solutionId
*/
function getScoreSolutionDefaultParameters(){

  let my_dataseturi = 'file://' + datasetdocurl;
  let my_inputs = [{dataset_uri: my_dataseturi}];
  let my_performanceMetrics = [{metric: d3mMetrics[d3mProblemDescription.performanceMetrics[0].metric][1]} ];  // need to generalize to case with multiple metrics.  only passes on first presently.;
  let my_users = [{id: 'TwoRavens', choosen: false, reason: ""}];
  let my_configuration = {method: 'HOLDOUT', folds: 0, trainTestRatio: 0, shuffle: false, randomSeed: 0, stratified: false};

  return {inputs: my_inputs, performanceMetrics: my_performanceMetrics, users: my_users, configuration: my_configuration};

}



export function downloadIncomplete() {
    if (PRODUCTION && zparams.zsessionid === '') {
        alert('Warning: Data download is not complete. Try again soon.');
        return true;
    }
    return false;
}

/**
    called by clicking 'Solve This Problem' in model mode
*/
export async function estimate(btn) {
    if (!IS_D3M_DOMAIN){
        // let userUsg = 'This code path is no longer used.  (Formerly, it used Zelig.)';
        // console.log(userMsg);
        // alert(userMsg);
        // return;

        // if (downloadIncomplete()) {
        //     return;
        // }

        // zPop();
        // // write links to file & run R CMD
        // // package the output as JSON
        // // add call history and package the zparams object as JSON
        // zparams.callHistory = callHistory;
        // zparams.allVars = valueKey.slice(10, 25); // because the URL is too long...


        // estimateLadda.start(); // start spinner
        // let json = await makeRequest(ROOK_SVC_URL + 'zeligapp', zparams);
        // if (!json) {
        //     estimated = true;
        // } else {
        //     allResults.push(json);
        //     if (!estimated) byId("tabResults").removeChild(byId("resultsHolder"));

        //     estimated = true;
        //     d3.select("#tabResults")
        //         .style("display", "block");
        //     d3.select("#resultsView")
        //         .style("display", "block");
        //     d3.select("#modelView")
        //         .style("display", "block");

        //     // programmatic click on Results button
        //     trigger("btnSetx", "click"); // Was "btnResults" - changing to simplify user experience for testing.

        //     let model = "Model".concat(modelCount = modelCount + 1);

        //     function modCol() {
        //         d3.select("#modelView")
        //             .selectAll("p")
        //             .style('background-color', hexToRgba(varColor));
        //     }
        //     modCol();

        //     d3.select("#modelView")
        //         .insert("p", ":first-child") // top stack for results
        //         .attr("id", model)
        //         .text(model)
        //         .style('background-color', hexToRgba(selVarColor))
        //         .on("click", function() {
        //             var a = this.style.backgroundColor.replace(/\s*/g, "");
        //             var b = hexToRgba(selVarColor).replace(/\s*/g, "");
        //             if (a.substr(0, 17) == b.substr(0, 17))
        //                 return; // escape function if displayed model is clicked
        //             modCol();
        //             d3.select(this)
        //                 .style('background-color', hexToRgba(selVarColor));
        //             viz(this.id);
        //         });

        //     let rCall = [json.call];
        //     showLog('estimate', rCall);

        //     viz(model);
        // }
    } else if (swandive) { // IS_D3M_DOMAIN and swandive is true
        zPop();
        zparams.callHistory = callHistory;

        let myvki = valueKey.indexOf(mytarget);
        if(myvki != -1) {
            del(valueKey, myvki);
        }

        estimateLadda.start(); // start spinner

        alert('estimate() function. Check app.js error with swandive (err: 003)');
        //let res = await makeRequest(D3M_SVC_URL + '/SearchSolutions', CreatePipelineDefinition(valueKey, mytarget));
        //res && onPipelineCreate(res);   // arguments were wrong, and this function no longer needed

    } else { // we are in IS_D3M_DOMAIN no swandive
        // rpc CreatePipelines(PipelineCreateRequest) returns (stream PipelineCreateResult) {}
        zPop();
        zparams.callHistory = callHistory;

        // pipelineapp is a rook application that returns the dependent variable, the DV values, and the predictors. can think of it was a way to translate the potentially complex grammar from the UI

        estimateLadda.start(); // start spinner

        ROOKPIPE_FROM_REQUEST = await makeRequest(ROOK_SVC_URL + 'pipelineapp', zparams);        // parse the center panel data into a formula like construction

        if (!ROOKPIPE_FROM_REQUEST) {
            estimated = true;
            estimateLadda.stop(); // start spinner
        } else {
            setxTable(ROOKPIPE_FROM_REQUEST.predictors);
            let searchSolutionParams = CreatePipelineDefinition(ROOKPIPE_FROM_REQUEST.predictors,
                                                                 ROOKPIPE_FROM_REQUEST.depvar,
                                                                 2);

            let allParams = {searchSolutionParams: searchSolutionParams,
                             fitSolutionDefaultParams: getFitSolutionDefaultParameters(),
                             produceSolutionDefaultParams: getProduceSolutionDefaultParameters(),
                             scoreSolutionDefaultParams: getScoreSolutionDefaultParameters()};

            //let res = await makeRequest(D3M_SVC_URL + '/SearchSolutions',
            let res = await makeRequest(D3M_SVC_URL + '/SearchDescribeFitScoreSolutions',
                                        allParams);
            console.log(JSON.stringify(res));
            if (res===undefined){
              handleENDGetSearchSolutionsResults();
              alert('SearchDescribeFitScoreSolutions request Failed! ' + res.message);

              return;
            }else if(!res.success){
              handleENDGetSearchSolutionsResults();
              alert('SearchDescribeFitScoreSolutions request Failed! ' + res.message);
              return;
            }

            let searchId = res.data.searchId;
            allsearchId.push(searchId);
        }
    }
}




// This appears not to be used:
/** needs doc */
//export function ta2stuff() {
//    console.log(d3mProblemDescription);
//}

/** needs doc */
async function dataDownload() {
    zPop();
    // write links to file & run R CMD

    // package the output as JSON
    // add call history and package the zparams object as JSON
    let res = await makeRequest(ROOK_SVC_URL + 'dataapp', zparams);
    if (!res) {
        return;
    }

    zparams.zsessionid = res.sessionid[0];
    // set link URL
    byId("logID").href = `${PRODUCTION ? ROOK_SVC_URL + 'log_dir/log_' : 'rook/log_' }${zparams.zsessionid}.txt`;
}

/** needs doc */
function viz(mym) {
    mym = +mym.substr(5, 5) - 1;

    let removeKids = parent => {
        while (parent.firstChild)
            parent.removeChild(parent.firstChild);
    };
    removeKids(byId("resultsView"));

    let json = allResults[mym];

    // pipe in figures to right panel
    var filelist = new Array;
    for (var i in json.images) {
        var zfig = document.createElement("img");
        zfig.setAttribute("src", json.images[i]);
        zfig.setAttribute('width', 200);
        zfig.setAttribute('height', 200);
        byId("resultsView").appendChild(zfig);
    }

    // write the results table
    var resultsArray = [];
    for (var key in json.sumInfo) {
        if (key == 'colnames')
            continue;
        resultsArray.push(json.sumInfo[key]);
    }

    var table = d3.select("#resultsView")
        .append("p")
        .append("table");

    var thead = table.append("thead");
    thead.append("tr")
        .selectAll("th")
        .data(json.sumInfo.colnames)
        .enter()
        .append("th")
        .text(d => d);

    var tbody = table.append("tbody");
    tbody.selectAll("tr")
        .data(resultsArray)
        .enter().append("tr")
        .selectAll("td")
        .data(d => d)
        .enter().append("td")
        .text(function(d) {
            var myNum = Number(d);
            if (isNaN(myNum))
                return d;
            return myNum.toPrecision(3);
        })
        .on("mouseover", function() {
            d3.select(this).style("background-color", "aliceblue");
        }) // for no discernable reason
        .on("mouseout", function() {
            d3.select(this).style("background-color", "#F9F9F9");
        }); //(but maybe we'll think of one)

    d3.select("#resultsView")
        .append("p")
        .html(() => "<b>Formula: </b>".concat(json.call[0]));

    m.redraw();
}

export async function updateRequest(url) {
    //console.log('url:', url);
    //console.log('POST:', data);
    let res;
    try {
        res = await m.request(url, {method: 'POST', data:{}});       // maybe change the POST and data
        //console.log('response:', res);
        if (Object.keys(res)[0] === 'warning') {
            alert('Warning: ' + res.warning);
            end_ta3_search(false, res.warning);
        }
    } catch(err) {
        end_ta3_search(false, err);
        cdb(err);
        alert(`Error: call to ${url} failed`);
    }
    return res;
}



export async function makeRequest(url, data) {
    // console.log('url:', url);
    // console.log('POST:', data);
    let res;
    try {
        res = await m.request(url, {method: 'POST', data: data});
        // console.log('response:', res);
        if (Object.keys(res)[0] === 'warning') {
            alert('Warning: ' + res.warning);
            end_ta3_search(false, res.warning);
        }
    } catch(err) {
        end_ta3_search(false, err);
        cdb(err);
        alert(`Error: call to ${url} failed`);
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

    if (!IS_D3M_DOMAIN){
        estimateLadda.stop();    // estimateLadda is being stopped somewhere else in D3M
    };
    return res;
}

// programmatically deselect every selected variable
export let erase = () => nodes.map(node => node.name).forEach(name => clickVar(name, nodes));

// programmatically reset force diagram/selectedvars to initial state at page load
export function unerase() {
    erase();
    layout();
    let targetNode = findNode(mytarget);
    if (targetNode.strokeColor !== dvColor)
        setColors(targetNode, dvColor);
    restart();
    // the dependent variable force needs a kick
    fakeClick();
}

// call with a tab name to change the left tab in model mode
export let setLeftTab = (tab) => {
    leftTab = tab;
    updateLeftPanelWidth();
    exploreVariate = tab === 'Discovery' ? 'Problem' : 'Univariate';
};

// formats data for the hidden summary tab in the leftpanel
export let summary = {data: []};

// d is a node from allNodes or nodes
// updates the summary variable, which is rendered in the hidden summary tab in the leftpanel;
function varSummary(d) {
    if (!d) {
        summary = {data: []};
        return;
    }

    let t1 = 'Mean:, Median:, Most Freq:, Occurrences:, Median Freq:, Occurrences:, Least Freq:, Occurrences:, Std Dev:, Minimum:, Maximum:, Invalid:, Valid:, Uniques:, Herfindahl'.split(', ');

    d3.select('#tabSummary')
        .selectAll('svg')
        .remove();

    if (!d.plottype)
        return;
    d.plottype == 'continuous' ? density(d, 'Summary', priv) :
        d.plottype == "bar" ? bars(d, 'Summary', priv) :
        d3.select("#tabSummary") // no graph to draw, but still need to remove previous graph
        .selectAll("svg")
        .remove();

    let rint = d3.format('r');
    let str = (x, p) => (+x).toPrecision(p || 4).toString();
    let t2 = priv && d.meanCI ?
        [str(d.mean, 2) + ' (' + str(d.meanCI.lowerBound, 2) + ' - ' + str(d.meanCI.upperBound, 2) + ')',
         str(d.median), d.mode, rint(d.freqmode), d.mid, rint(d.freqmid), d.fewest, rint(d.freqfewest),
         str(d.sd), str(d.min), str(d.max), rint(d.invalid), rint(d.valid), rint(d.uniques), str(d.herfindahl)] :
        [str(d.mean), str(d.median), d.mode, rint(d.freqmode), d.mid, rint(d.freqmid), d.fewest, rint(d.freqfewest),
         str(d.sd), str(d.min), str(d.max), rint(d.invalid), rint(d.valid), rint(d.uniques), str(d.herfindahl)];

    summary.data = [];
    t1.forEach((e, i) => !t2[i].includes('NaN') && t2[i] != 'NA' && t2[i] != '' && summary.data.push([e, t2[i]]));

    summary.name = d.name;
    summary.labl = d.labl;

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
}

/** needs doc */
export function panelPlots() {

    if(IS_D3M_DOMAIN) {
        //byId('btnSubset').classList.add('noshow');
    }
    // build arrays from nodes in main
    let vars = [];
    let ids = [];
    nodes.forEach(n => {
        vars.push(n.name.replace(/\(|\)/g, ''));
        ids.push(n.id);
    });

    //remove all plots, could be smarter here
    d3.select('#setxLeft').selectAll('svg').remove();
    for (var i = 0; i < vars.length; i++) {
        if(allNodes[ids[i]].valid==0) // this was a silent error... very frustrating...
            continue;
        let node = allNodes[ids[i]];
        node.setxplot = false;
        node.subsetplot = false;
        if (node.plottype === "continuous" & node.setxplot == false) {
            node.setxplot = true;
            density(node, div = "setxLeft", priv);
            node.subsetplot = true;
            density(node, div = "Summary", priv);
        } else if (node.plottype === "bar" & node.setxplot == false) {
            node.setxplot = true;
            bars(node, div = "setxLeft", priv);
            node.subsetplot = true;
            barsSubset(node);
        }
    }

        d3.select("#setxLeft").selectAll("svg")
        .each(function () {
            d3.select(this);
            var regstr = /(.+)_setxLeft_(\d+)/;
            var myname = regstr.exec(this.id);
            var nodeid = myname[2];
            myname = myname[1];
            if (!vars.includes(myname)) {
                allNodes[nodeid].setxplot = false;
                let temp = "#".concat(myname, "_setxLeft_", nodeid);
                d3.select(temp)
                    .remove();
                allNodes[nodeid].subsetplot = false;
                temp = "#".concat(myname, "_tab2_", nodeid);
                d3.select(temp)
                    .remove();
            }
        });

    // just removing all the subset plots here, because using this button for problem discover
    d3.select('#tabDiscovery').selectAll('svg').remove();
}

/**
   converts color codes
*/
export let hexToRgba = (hex, alpha) => {
    let int = parseInt(hex.replace('#', ''), 16);
    return `rgba(${[(int >> 16) & 255, (int >> 8) & 255, int & 255, alpha || '0.5'].join(',')})`;
};

/**
   takes node and color and updates zparams
*/
export function setColors(n, c) {
    // the order of the keys indicates precedence
    let zmap = {
        [csColor]: 'zcross',
        [timeColor]: 'ztime',
        [nomColor]: 'znom',
        [dvColor]: 'zdv',
        [gr1Color]: 'zgroup1',
        [gr2Color]: 'zgroup2'
    }
    let strokeWidths = {
        [csColor]: 4,
        [timeColor]: 4,
        [nomColor]: 4,
        [dvColor]: 4,
        [gr1Color]: 1,
        [gr2Color]: 1
    }
    let nodeColors = {
        [csColor]: taggedColor,
        [timeColor]: taggedColor,
        [nomColor]: taggedColor,
        [dvColor]: taggedColor,
        [gr1Color]: colors(n.id),
        [gr2Color]: colors(n.id)
    }
    let strokeColors = {
        [csColor]: csColor,
        [timeColor]: timeColor,
        [nomColor]: nomColor,
        [dvColor]: dvColor,
        [gr1Color]: selVarColor,
        [gr2Color]: selVarColor
    }

    // from the relevant zparams list: remove if included, add if not included
    if (!Array.isArray(zparams[zmap[c]])) zparams[zmap[c]] = [];
    let index = zparams[zmap[c]].indexOf(n.name);
    if (index > -1) zparams[zmap[c]].splice(index, 1)
    else zparams[zmap[c]].push(n.name)

    labelNodeAttrs: {
        let matchedColor;
        for (let label of Object.keys(zmap))
            if (zparams[zmap[label]].includes(n.name)) {
                n.strokeWidth = strokeWidths[label];
                n.nodeCol = nodeColors[label];
                n.strokeColor = strokeColors[label];
                break labelNodeAttrs;
            }
        // default node color
        n.strokeWidth = 1;
        n.nodeCol = n.baseCol;
        n.strokeColor = selVarColor;
    }

    // if index was not found, then it was added
    let isIncluded = index === -1;

    if (c == gr1Color) {
        [n.group1, n.group2] = [isIncluded, false]
        del(zparams.zgroup2, -1, n.name)
        del(zparams.zdv, -1, n.name)
    }
    if (c === gr2Color) {
        [n.group1, n.group2] = [false, isIncluded]
        del(zparams.zgroup1, -1, n.name)
        del(zparams.zdv, -1, n.name)
    }
    if (c === dvColor) {
        [n.group1, n.group2] = [false, false]
        del(zparams.zgroup1, -1, n.name)
        del(zparams.zgroup2, -1, n.name)
    }

    if (c === nomColor) {
        findNode(n.name).nature = isIncluded ? 'nominal' : findNode(n.name).defaultNature;
        resetPeek();
    }
}


/** needs doc */
export function subsetSelect(btn) {
    if (dataurl) {
        zparams.zdataurl = dataurl;
    }
    if (downloadIncomplete()) {
        return;
    }

    zparams.zvars = [];
    zparams.zplot = [];
    var subsetEmpty = true;
    // is this the same as zPop()?
    for (var j = 0; j < nodes.length; j++) { // populate zvars and zsubset arrays
        zparams.zvars.push(nodes[j].name);
        var temp = nodes[j].id;
        zparams.zsubset[j] = allNodes[temp].subsetrange;
        if (zparams.zsubset[j].length > 0) {
            if (zparams.zsubset[j][0] != "")
                zparams.zsubset[j][0] = Number(zparams.zsubset[j][0]);
            if (zparams.zsubset[j][1] != "")
                zparams.zsubset[j][1] = Number(zparams.zsubset[j][1]);
        }
        zparams.zplot.push(allNodes[temp].plottype);
        if (zparams.zsubset[j][1] != "")
            subsetEmpty = false; // only need to check one
    }

    if (subsetEmpty == true) {
        alert("Warning: No new subset selected.");
        return;
    }

    var outtypes = [];
    for (var j = 0; j < allNodes.length; j++) {
        outtypes.push({
            varnamesTypes: allNodes[j].name,
            nature: allNodes[j].nature,
            numchar: allNodes[j].numchar,
            binary: allNodes[j].binary,
            interval: allNodes[j].interval
        });
    }

    let json = makeRequest(
        ROOK_SVC_URL + 'subsetSelect',
        {zdataurl: zparams.zdataurl,
         zvars: zparams.zvars,
         zsubset: zparams.zsubset,
         zsessionid: zparams.zsessionid,
         zplot: zparams.zplot,
         callHistory: callHistory,
         typeStuff: outtypes});
    if (!json) {
        return;
    }

    trigger("btnVariables", "click"); // programmatic clicks
    trigger("btnModels", "click");

    var grayOuts = [];
    var rCall = [];
    rCall[0] = json.call;

    // store contents of the pre-subset space
    zPop();
    var myNodes = jQuery.extend(true, [], allNodes);
    var myParams = jQuery.extend(true, {}, zparams);
    var myTrans = jQuery.extend(true, [], trans);
    var myForce = jQuery.extend(true, [], forcetoggle);
    var myPreprocess = jQuery.extend(true, {}, preprocess);
    var myLog = jQuery.extend(true, [], logArray);
    var myHistory = jQuery.extend(true, [], callHistory);

    spaces[myspace] = {
        "allNodes": myNodes,
        "zparams": myParams,
        "trans": myTrans,
        "force": myForce,
        "preprocess": myPreprocess,
        "logArray": myLog,
        "callHistory": myHistory
    };

    // remove pre-subset svg
    var selectMe = "#m".concat(myspace);
    d3.select(selectMe).attr('class', 'item');
    selectMe = "#whitespace".concat(myspace);
    d3.select(selectMe).remove();

    myspace = spaces.length;
    callHistory.push({
        func: "subset",
        zvars: jQuery.extend(true, [], zparams.zvars),
        zsubset: jQuery.extend(true, [], zparams.zsubset),
        zplot: jQuery.extend(true, [], zparams.zplot)
    });

    // this is to be used to gray out and remove listeners for variables that have been subsetted out of the data
    function varOut(v) {
        // if in nodes, remove gray out in left panel
        // make unclickable in left panel
        for (var i = 0; i < v.length; i++) {
            var selectMe = v[i].replace(/\W/g, "_");
            byId(selectMe).style.color = hexToRgba(grayColor);
            selectMe = "p#".concat(selectMe);
            d3.select(selectMe)
                .on("click", null);
        }
    }

    showLog('subset', rCall);

    d3.select("#innercarousel")
        .append('div')
        .attr('class', 'item active')
        .attr('id', () => "m".concat(myspace.toString()))
        .append('svg')
        .attr('id', 'whitespace');
    svg = d3.select("#whitespace");

    d3.json(json.url, function(error, json) {
        if (error){
            return console.warn(error);
        }
        var jsondata = getVariableData(json);

        for (var key in jsondata) {
            var myIndex = findNodeIndex(key);

            allNodes[myIndex].plotx = undefined;
            allNodes[myIndex].ploty = undefined;
            allNodes[myIndex].plotvalues = undefined;
            allNodes[myIndex].plottype = "";

            jQuery.extend(true, allNodes[myIndex], jsondata[key]);
            allNodes[myIndex].subsetplot = false;
            allNodes[myIndex].subsetrange = ["", ""];
            allNodes[myIndex].setxplot = false;
            allNodes[myIndex].setxvals = ["", ""];

            if (allNodes[myIndex].valid == 0) {
                grayOuts.push(allNodes[myIndex].name);
                allNodes[myIndex].grayout = true;
            }
        }
        rePlot();
        layout(layoutAdd);
    });

    varOut(grayOuts);
}

/**
   removes all the children svgs inside subset and setx divs
*/
function rePlot() {
    d3.select('#tab2')
        .selectAll('svg')
        .remove();
    d3.select('#setx')
        .selectAll('svg')
        .remove();
    allNodes.forEach(n => n.setxplot = n.subsetplot = false);
}

// acts as if the user clicked in whitespace. useful when restart() is outside of scope
export function fakeClick() {
    let el = byId(`whitespace${myspace}`);
    let evt = document.createEvent("MouseEvents");
    evt.initMouseEvent("mousedown", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    el.dispatchEvent(evt);
    d3.select(el)
        .classed('active', false);
}

/**
   EndSession(SessionContext) returns (Response) {}
*/
export async function endsession() {
    if(Object.keys(allPipelineInfo).length === 0) {
        alert("No pipelines exist. Cannot mark problem as complete.");
        return;
    }

    if (!selectedPipeline) {
        alert("No pipeline selected. Cannot mark problem as complete.");
        return;
    }

    console.log("== this should be the selected solution ==");
    console.log(allPipelineInfo[selectedPipeline]);
    console.log(allPipelineInfo[selectedPipeline].response.solutionId);

    let chosenSolutionId = allPipelineInfo[selectedPipeline].response.solutionId;

    // calling exportpipeline
    let end = await exportpipeline(chosenSolutionId);

   // makeRequest(D3M_SVC_URL + '/endsession', apiSession(zparams.zsessionid));
    //let res = await makeRequest(D3M_SVC_URL + '/endsession', apiSession(zparams.zsessionid));
    endAllSearches()
    //let mystatus = res.status.code.toUpperCase();
    //if(mystatus == "OK") {
        end_ta3_search(true, "Problem marked as complete.");
        setModal("Your selected pipeline has been submitted.", "Task Complete", true, false, false, locationReload);
    //}
}



function addPredictions(res) {
    function tabulate(data, columns) {
        var table = d3.select('#setxLeftBottomRightBottom').append('table');
        var thead = table.append('thead');
        var    tbody = table.append('tbody');

        // append the header row
        thead.append('tr')
        .selectAll('th')
        .data(columns).enter()
        .append('th')
        .text(function (column) { return column; });

        // create a row for each object in the data
        var rows = tbody.selectAll('tr')
        .data(data)
        .enter()
        .append('tr');

        // create a cell in each row for each column
        var cells = rows.selectAll('td')
            .data(function (row) {
                return columns.map(function (column) {
                    return {column: column, value: row[column]};
                });
            })
            .enter()
            .append('td')
            .text(function (d) { return d.value; })
            .attr('id',function(d,i) {
                let rowname = this.parentElement.firstChild.innerText;
                return rowname + d.column;
            });

        return table;
    }

    // this is what ISI should look like, and the test server eventually, so just remove the following line when it's up
    res = res.grpcResp[0];

    console.log(res);
    let allPreds = res.resultData.data;
    let predvals = [];

    for(let i = 0; i < allPreds.length; i++) {
        predvals.push(allPreds[i]["preds"]);
    }

    let mydata = [];
    mydata.push({" ":"Pred 1","E(Y|X1)":predvals[0], "E(Y|X2)":predvals[1]});

    // render the table(s)
    tabulate(mydata, [' ', 'E(Y|X1)', 'E(Y|X2)']); // 2 column table

}

/**
   find something centerish to the vertices of a convex hull
   (specifically, the center of the bounding box)
*/
function jamescentroid(coord) {
    var minx = coord[0][0],
        maxx = coord[0][0],
        miny = coord[0][1],
        maxy = coord[0][1];
    for(var j = 1; j<coord.length; j++){
        if (coord[j][0] < minx) minx = coord[j][0];
        if (coord[j][1] < miny) miny = coord[j][1];
        if (coord[j][0] > maxx) maxx = coord[j][0];
        if (coord[j][1] > maxy) maxy = coord[j][1];
    };
        return[(minx + maxx)/2, (miny + maxy)/2];
};

/**
   Define each pebble radius.
   Presently, most pebbles are scaled to radius set by global RADIUS.
   Members of groups are scaled down if group gets large.
*/
export function setPebbleRadius(d){
    if (d.group1 || d.group2) { // if a member of a group, need to calculate radius size
        var uppersize = 7;
        var ng1 = (d.group1) ? zparams.zgroup1.length : 1; // size of group1, if a member of group 1
        var ng2 = (d.group2) ? zparams.zgroup2.length : 1; // size of group2, if a member of group 2
        var maxng = Math.max(ng1, ng2); // size of the largest group variable is member of
        let node_radius = (maxng>uppersize) ? RADIUS*Math.sqrt(uppersize/maxng) : RADIUS; // keep total area of pebbles bounded to pi * RADIUS^2 * uppersize, thus shrinking radius for pebbles in larger groups

        // make the selected node a bit bigger
        if (d.name === selectedPebble) return Math.min(node_radius * 1.5, RADIUS);
        return node_radius
    } else {
        return RADIUS; // nongroup members get the common global radius
    }
};

/**
   Define each pebble charge.
*/
function setPebbleCharge(d){
    if(d.group1 || d.group2){
        if(d.forefront){// pebbles packed in groups repel others on mouseover
            return -1000;
        }
        var uppersize = 7;
        var ng1 = (d.group1) ? zparams.zgroup1.length : 1;      // size of group1, if a member of group 1
        var ng2 = (d.group2) ? zparams.zgroup2.length : 1;      // size of group2, if a member of group 2
        var maxng = Math.max(ng1,ng2);                                                      // size of the largest group variable is member of
        return (maxng>uppersize) ? -400*(uppersize/maxng) : -400;                           // decrease charge as pebbles become smaller, so they can pack together
    }else{
        return -800;
    }
}

/** needs doc */
export async function resultsplotinit(pid) {
    if (!('predictedValues' in allPipelineInfo[pid])){
        // The FitSolution/ProduceSolution sequences are now
        // run server side....
        //generatePredictions(pid, true);                    // generate predicted values, and then plot

    } else {
        resultsplotgraph(pid);                             // predicted values already exist
    };
}

export function resultsplotgraph(pid){
    let pipelineInfo = allPipelineInfo[pid];
    console.log("pid:");
    console.log(pid);
    let mydv = allPipelineInfo.rookpipe.depvar[0];          // When there are multiple CreatePipelines calls, then this only has values from latest value
    console.log(mydv);
    let dvvalues = allPipelineInfo.rookpipe.dvvalues;       // When there are multiple CreatePipelines calls, then this only has values from latest value

    // Terminate plot if predicted values not available
    if (!('predictedValues' in pipelineInfo)) return;
    if (pipelineInfo.predictedValues.success == false) return;


    let allPreds = pipelineInfo.predictedValues.data;
    console.log(Object.keys(allPreds[1]));
    let predvals = [];

    let mydvI = Object.keys(allPreds[1]).indexOf(mydv);
    if (mydvI > -1) {
        for (let i = 0; i < allPreds.length; i++) {
            predvals.push(allPreds[i][mydv]);
        }
    } else if (Object.keys(allPreds[1]).indexOf("preds") > -1) {
        for (let i = 0; i < allPreds.length; i++) {
            predvals.push(allPreds[i]["preds"]);
        }
    } else {
        alert("DV does not match. No Results window.");
        return;
    }

    // only do this for classification tasks
    if(d3mTaskType[d3mProblemDescription.taskType][1] == "CLASSIFICATION") {
        console.log("class plot");
        console.log("actual:");
        console.log(dvvalues);
        console.log("predicted:");
        console.log(predvals);
        genconfdata(dvvalues, predvals);
    } else {
        let xdata = "Actual";
        let ydata = "Predicted";
        let mytitle = "Predicted V Actuals: Pipeline " + pid;
        scatter(dvvalues, predvals, xdata, ydata, undefined, undefined, mytitle);
    }

    // add the list of predictors into setxLeftTopLeft

    d3.select("#setxLeftTopLeft").selectAll("p")
        .data(allPipelineInfo.rookpipe.predictors)                    // When there are multiple CreatePipelines calls, then this only has values from latest value
        .enter()
        .append("p")
        .text(function (d) { return d; })
        .attr('id',function(d) { return "sx_"+d; })
        .attr('class',"item-default")
        .on("click", function() {
        if(this.className=="item-select") {
            return;
        } else {
            d3.select("#setxLeftTopLeft").select("p.item-select")
            .attr('class', 'item-default');
            d3.select(this).attr('class',"item-select");
            singlePlot(this.id.slice(3)); // drops that sx_
        }
        });
}

/** needs doc */
export function genconfdata (dvvalues, predvals) {

    // dvvalues are generally numeric
    dvvalues = dvvalues.map(String);

    // predvals are generally strings
    predvals = predvals.map(String);

    let mycounts = [];
    let mypairs = [];

    // combine actuals and predicted, and get all unique elements
    let myuniques = dvvalues.concat(predvals);
    myuniques= [...new Set(myuniques)];                 //equivalent to: myuniques = Array.from(new Set(myuniques));
    //was:
    //  function onlyUnique(value, index, self) {
    //    return self.indexOf(value) === index;
    //  }
    //  myuniques = myuniques.filter(onlyUnique);
    myuniques = myuniques.sort();

    // create two arrays: mycounts initialized to 0, mypairs have elements set to all possible pairs of uniques
    // looked into solutions other than nested fors, but Internet suggest performance is just fine this way
    for(let i = 0; i < myuniques.length; i++) {
        let tempcount = [];
        let temppair = [];
        for(let j = 0; j < myuniques.length; j++) {
            mycounts.push(0);
            mypairs.push(myuniques[i]+','+myuniques[j]);
        }
    }

    // line up actuals and predicted, and increment mycounts at index where mypair has a match for the 'actual,predicted'
    for (let i = 0; i < dvvalues.length; i++) {
        let temppair = predvals[i]+','+dvvalues[i];
        let myindex = mypairs.indexOf(temppair);
        mycounts[myindex] += 1;
    }

    let confdata = [], size = myuniques.length;
    // another loop... this builds the array of arrays from the flat array mycounts for input to confusionsmatrix function
    while (mycounts.length > 0)
        confdata.push(mycounts.splice(0, size));

    confusionmatrix(confdata, myuniques);
}

/** needs doc */
export function confusionmatrix(matrixdata, classes) {

    d3.select("#setxLeftPlot").html("");
    d3.select("#setxLeftPlot").select("svg").remove();

    // adapted from this block: https://bl.ocks.org/arpitnarechania/dbf03d8ef7fffa446379d59db6354bac
    let mainwidth = byId('rightpanel').clientWidth; //byId('main').clientWidth;
    let mainheight = byId('main').clientHeight;


    let longest = classes.reduce(function (a, b) { return a.length > b.length ? a : b; });
    //console.log(longest);
    let leftmarginguess = Math.max(longest.length * 8, 25);  // More correct answer is to make a span, put string inside span, then use jquery to get pixel width of span.


    let condiv = document.createElement('div');
    condiv.id="confusioncontainer";
    condiv.style.display="inline-block";
    condiv.style.width=+(((mainwidth-50)*.7)-100)+'px';   // Need to not be hard coded
    condiv.style.marginLeft='12px';
    condiv.style.height=+(mainheight)+'px';      // Need to not be hard coded
    condiv.style.float="left";
    byId('setxLeftPlot').appendChild(condiv);

    let legdiv = document.createElement('div');
    legdiv.id="confusionlegend";
    legdiv.style.width=+(90)+'px';    // Need to not be hard coded
    legdiv.style.marginLeft='5px';               // Margin between confusion matrix container and legend container
    legdiv.style.height=+(mainheight)+'px';      // Need to not be hard coded
    legdiv.style.display="inline-block";
    byId('setxLeftPlot').appendChild(legdiv);

    var margin = {top: 50, right: 35, bottom: leftmarginguess, left: leftmarginguess};    // Left margin needs not to be hardcoded, but responsive to maximum label length


    function Matrix(options) {

        let width = options.width,
        height = options.height,
        data = options.data,
        container = options.container,
        labelsData = options.labels,
        startColor = options.start_color,
        endColor = options.end_color,
        xOffset = options.x_offset,
        pipelineId = options.pipelineId;

        let widthLegend = options.widthLegend;

        if(!data){
            throw new Error('Please pass data');
        }

        if(!Array.isArray(data) || !data.length || !Array.isArray(data[0])){
            throw new Error('It should be a 2-D array');
        }

        let maxValue = d3.max(data, function(layer) { return d3.max(layer, function(d) { return d; }); });
        let minValue = d3.min(data, function(layer) { return d3.min(layer, function(d) { return d; }); });

        let numrows = data.length;
        let numcols = data[0].length;

        let svg = d3.select(container).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        let background = svg.append("rect")
        .style("stroke", "black")
        .style("stroke-width", "2px")
        .attr("width", width)
        .attr("height", height);

        let x = d3.scale.ordinal()
        .domain(d3.range(numcols))
        .rangeBands([0, width]);

        let y = d3.scale.ordinal()
        .domain(d3.range(numrows))
        .rangeBands([0, height]);

        let colorMap = d3.scale.linear()
        .domain([minValue,maxValue])
        .range([startColor, endColor]);

        let row = svg.selectAll(".row")
        .data(data)
        .enter().append("g")
        .attr("class", "row")
        .attr("transform", function(d, i) { return "translate(0," + y(i) + ")"; });

        let cell = row.selectAll(".cell")
        .data(function(d) { return d; })
        .enter().append("g")
        .attr("class", "cell")
        .attr("transform", function(d, i) { return "translate(" + x(i) + ", 0)"; });

        cell.append('rect')
        .attr("width", x.rangeBand())
        .attr("height", y.rangeBand())
        .style("stroke-width", 0);

        if(numcols < 20){
          cell.append("text")
          .attr("dy", ".32em")
          .attr("x", x.rangeBand() / 2)
          .attr("y", y.rangeBand() / 2)
          .attr("text-anchor", "middle")
          .style("fill", function(d, i) { return d >= maxValue/2 ? 'white' : 'black'; })
          .text(function(d, i) { return d; });
        };

        row.selectAll(".cell")
        .data(function(d, i) { return data[i]; })
        .style("fill", colorMap);

        // this portion of the code isn't as robust to sizing. column labels not rendering in the right place
        let labels = svg.append('g')
        .attr('class', "labels");

        let columnLabels = labels.selectAll(".column-label")
        .data(labelsData)
        .enter().append("g")
        .attr("class", "column-label")
        .attr("transform", function(d, i) {
             // let temp = "translate(" + x(i) + "," + (height+20) + ")"; // this in particular looks to be the cause
            //  console.log(temp);
              return "translate(" + x(i) + "," + (height + xOffset) + ")"; });

        columnLabels.append("line")
        .style("stroke", "black")
        .style("stroke-width", "1px")
        .attr("x1", x.rangeBand() / 2)
        .attr("x2", x.rangeBand() / 2)
        .attr("y1", 5 -xOffset)
        .attr("y2", -xOffset);

        console.log(x.rangeBand);

        columnLabels.append("text")
        .attr("x", x.rangeBand()/2)
        .attr("y", -10)
        //.attr("dy", "0.5em")
        .attr("text-anchor", "start")
        .attr("transform", "rotate(60," + x.rangeBand()/2 + ",-10)")
        .text(function(d, i) { return d; });

        let rowLabels = labels.selectAll(".row-label")
        .data(labelsData)
        .enter().append("g")
        .attr("class", "row-label")
        .attr("transform", function(d, i) { return "translate(" + 0 + "," + y(i) + ")"; });

        rowLabels.append("line")
        .style("stroke", "black")
        .style("stroke-width", "1px")
        .attr("x1", 0)
        .attr("x2", -5)
        .attr("y1", y.rangeBand() / 2)
        .attr("y2", y.rangeBand() / 2);

        rowLabels.append("text")
        .attr("x", -8)
        .attr("y", y.rangeBand() / 2)
        .attr("dy", ".32em")
        .attr("text-anchor", "end")
        .text(function(d, i) { return d; });

        let key = d3.select("#confusionlegend")  // Legend
        .append("svg")
        .attr("width", widthLegend)
        .attr("height", height + margin.top + margin.bottom);

        let legend = key
        .append("defs")
        .append("svg:linearGradient")
        .attr("id", "gradient")
        .attr("x1", "100%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "100%")
        .attr("spreadMethod", "pad");

        legend
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", endColor)
        .attr("stop-opacity", 1);

        legend
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", startColor)
        .attr("stop-opacity", 1);

        key.append("rect")       // gradient image in legend
        .attr("width", widthLegend/4-10)
        .attr("height", height)
        .style("fill", "url(#gradient)")
        .attr("transform", "translate(0," + margin.top + ")");

        svg.append("text")
        .attr("transform", "translate(" + (width / 2) + " ," + (0 - 10) + ")")
        .style("text-anchor", "middle")
        .text("Actual Class");

        svg.append("text")
        .attr("transform", "translate(" + (width / 2) + " ," + (0 - 30) + ")")
        .style("text-anchor", "middle")
        .text("Confusion Matrix: Pipeline " + pipelineId);

        svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", (width + 15) )
        .attr("x",0 - (height / 2))
        //.attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Predicted Class");

        // this y is for the legend
        y = d3.scale.linear()
        .range([height, 0])
        .domain([minValue, maxValue]);

        let yAxis = d3.svg.axis()
        .scale(y)
        .orient("right");

        key
            .append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(15," + margin.top + ")")    // first number is separation between legend scale and legend key
            .call(yAxis);
    }

    // The table generation function. Used for the table of performance measures, not the confusion matrix
    function tabulate(data, columns) {
        var table = d3.select("#setxLeftPlot").append("table")
        .attr("style", "margin-left: " + margin.left +"px"),
        thead = table.append("thead"),
        tbody = table.append("tbody");

        // append the header row
        thead.append("tr")
        .selectAll("th")
        .data(columns)
        .enter()
        .append("th")
        .text(function(column) { return column; });

        // create a row for each object in the data
        var rows = tbody.selectAll("tr")
        .data(data)
        .enter()
        .append("tr");

        // create a cell in each row for each column
        var cells = rows.selectAll("td")
        .data(function(row) {
              return columns.map(function(column) {
                                 return {column: column, value: row[column]};
                                 });
              })
        .enter()
        .append("td")
        .attr("style", "font-family: Courier") // sets the font style
        .html(function(d) { return d.value; });

        return table;
    }

    // this code is all for producing a table with performance measures
    //var confusionMatrix = [[169, 10],[7, 46]];
    var tp = matrixdata[0][0];
    var fn = matrixdata[0][1];
    var fp = matrixdata[1][0];
    var tn = matrixdata[1][1];

    var p = tp + fn;
    var n = fp + tn;

    var accuracy = (tp+tn)/(p+n);
    var f1 = 2*tp/(2*tp+fp+fn);
    var precision = tp/(tp+fp);
    var recall = tp/(tp+fn);

    accuracy = Math.round(accuracy * 100) / 100;
    f1 = Math.round(f1 * 100) / 100;
    precision = Math.round(precision * 100) / 100;
    recall = Math.round(recall * 100) / 100;

    var computedData = [];
    computedData.push({"F1":f1, "PRECISION":precision,"RECALL":recall,"ACCURACY":accuracy});

    Matrix({
        container: '#confusioncontainer',
        data: matrixdata,
        labels: classes,
        start_color: '#ffffff',
        end_color: '#e67e22',
        width: ((mainwidth - 50) * .7) - 100 - leftmarginguess - 30,//     // Width of confusion matrix table: Beginning of this is #confusioncontainer.width, but this div doesn't always exist yet
        height: mainheight * .6,    // Need to not be hard coded
        widthLegend: mainwidth * .04,
        x_offset: 30,
        pipelineId: selectedPipeline  // Note: cueing from global, not from passed through pid, because of number of functions to pass through value.
    });

    // not rendering this table for right now, left all the code in place though. maybe we use it eventually
    // var table = tabulate(computedData, ["F1", "PRECISION","RECALL","ACCURACY"]);
}

/**
  Sort the Pipeline table, putting the higest score at the top
 */
export function sortPipelineTable(pt){
    let reverseSet = ["meanSquaredError", "rootMeanSquaredError", "rootMeanSquaredErrorAvg", "meanAbsoluteError"];  // array of metrics to sort low to high
    let reverse = (reverseSet.indexOf(d3mProblemDescription.performanceMetrics[0].metric) > -1) ? -1 : 1;
    if (reverse == -1){
        resultsMetricDescription = "Smaller numbers are better fits"
    }

    pt = pt.sort(function(a,b){
        if (a['Score']===b['Score']){
            return(0)
        } else if (a['Score']=="scoring"){
            return(100)
        } else if (b['Score']=="scoring") {
            return(-100)
        } else if (a['Score']=="no score"){
            return(1000)
        } else if (b['Score']=="no score"){
            return(-1000)
        } else {
            return (parseFloat(b['Score']) - parseFloat(a['Score'])) * reverse;
        };
    });
    return pt;
};

/** needs doc */
export function setxTable(features) {
    function tabulate(data, columns) {
        var table = d3.select('#setxLeftBottomLeft').append('table');
        var thead = table.append('thead');
        var	tbody = table.append('tbody');

        // append the header row
        thead.append('tr')
        .selectAll('th')
        .data(columns).enter()
        .append('th')
        .text(function (column) { return column; });

        // create a row for each object in the data
        var rows = tbody.selectAll('tr')
        .data(data)
        .enter()
        .append('tr');

        // create a cell in each row for each column
        var cells = rows.selectAll('td')
            .data(function (row) {
                return columns.map(function (column) {
                    return {column: column, value: row[column]};
                });
            })
            .enter()
            .append('td')
            .text(function (d) { return d.value; })
            .attr('id',function(d,i) {
                let rowname = this.parentElement.firstChild.innerText;
                return rowname + d.column;
            });

        return table;
    }

    let mydata = [];
    for(let i = 0; i<features.length; i++) {
        let myi = findNodeIndex(features[i]); //i+1;                                // This was set as (i+1), but should be allnodes position, not features position

        if(allNodes[myi].valid==0) {
            let xval=0;
            let x1val=0;
            mydata.push({"Variables":features[i],"From":xval, "To":x1val});
            continue;
        }

        let mysvg = features[i]+"_setxLeft_"+myi;

        try
        {
            //console.log(mysvg);
            //console.log(byId(mysvg).querySelector('.xval'));
            let xval = byId(mysvg).querySelector('.xval').innerHTML;
            let x1val = byId(mysvg).querySelector('.x1val').innerHTML;
            //console.log(xval);
            //console.log(x1val);
            xval = xval.split("x: ").pop();
            x1val = x1val.split("x1: ").pop();
            mydata.push({"Variables":features[i],"From":xval, "To":x1val});
        }
        catch(error)
        {
            continue;
        }
    }

    // render the table(s)
    tabulate(mydata, ['Variables', 'From', 'To']); // 2 column table
}

/**
  rpc SolutionExport (SolutionExportRequest) returns (SolutionExportResponse) {}
*/

// Example call:
// {
//     "fittedSolutionId": "solutionId_gtk2c2",
//     "rank": 0.122
// }


export async function exportpipeline(pipelineId) {
    exportCount++;
    let res;
    let my_rank = 1.01 - 0.01 * exportCount;   // ranks always gets smaller each call

    let params = {pipelineId: pipelineId, rank: my_rank};
    res = await makeRequest(D3M_SVC_URL + '/SolutionExport2', params);

    // we need standardized status messages...
    let mystatus = res.status;
    console.log(res);
    if (typeof mystatus !== 'undefined') {
        if(mystatus.code=="FAILED_PRECONDITION") {
            console.log("TA2 has not written the executable.");    // was alert(), but testing on NIST infrastructure suggests these are getting written but triggering alert.
        }else{
            console.log(`Executable for solution ${pipelineId} with fittedsolution ${finalFittedId} has been written`);
        }
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
  if (allNodes == null){
    console.log('No workspace recording. zparams not defined');
    return;
  }

  // (2) Format workspace data
  //
  let workspace_data = {'app_domain': APP_DOMAIN,
                        'domain_identifier': domain_identifier,
                        'allnodes': allNodes,
                        'zparams': zparams}

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

function singlePlot(pred) {
    d3.select('#setxLeftTopRight').selectAll('svg').remove();
    let i = findNodeIndex(pred);
    let node = allNodes[i];
    node.setxplot = false;
        node.subsetplot = false;
        if (node.plottype === "continuous" & node.setxplot == false) {
            node.setxplot = true;
            density(node, div = "setxLeftTopRight", priv);
        } else if (node.plottype === "bar" & node.setxplot == false) {
            node.setxplot = true;
            bars(node, div = "setxLeftTopRight", priv);
        }
}

export function discovery(preprocess_file) {

    let makeDescription = (prob) => {
        if (prob.transform && prob.transform != 0)
            return `The combination of ${prob.transform.split('=')[1]} is predicted by ${prob.predictors.join(" and ")}`;
        if (prob.subset && prob.subsetObs != 0)
            return `${prob.predictors} is predicted by ${prob.predictors.join(" and ")} whenever ${prob.subsetObs}`;
        return `${prob.target} is predicted by ${prob.predictors.slice(0, -1).join(", ")} ${prob.predictors.length > 1 ? 'and ' : ''}${prob.predictors[prob.predictors.length - 1]}`;
    }

    return preprocess_file.dataset.discovery.map((prob, i) => ({
        problem_id: "problem" + (i+1),
        system: "auto",
        description: makeDescription(prob),
        target: prob.target,
        predictors: prob.predictors,
        transform: prob.transform,
        subsetObs: prob.subsetObs,
        subsetFeats: prob.subsetFeats,
        metric: findNode(prob.target).plottype === "bar" ? 'f1Macro' : 'meanSquaredError',
        task: findNode(prob.target).plottype === "bar" ? 'classification' : 'regression',
        subTask: Object.keys(d3mTaskSubtype)[0],
        model: 'modelUndefined',
        rating: 3,
        meaningful: "no"
    }))

    /* Problem Array of the Form:
        [1: {problem_id: "problem 1",
            system: "auto",
            meaningful: "no",
            target:"Home_runs",
            predictors:["Walks","RBIs"],
            task:"regression",
            rating:5,
            description: "Home_runs is predicted by Walks and RBIs",
            metric: "meanSquaredError"
        },2:{...}]
    */
}

// creates a new problem from the force diagram problem space and adds to disco
export async function addProblemFromForceDiagram() {
    zPop();

    let newProblem = jQuery.extend(true, {
            transform: 0,
            subsetObs: 0,
            subsetFeats: 0
        },
        selectedProblem || {},
        await makeRequest(ROOK_SVC_URL + 'pipelineapp', zparams),
        {
            problem_id: 'problem' + (disco.length + 1),
            system: 'user',
            meaningful: 'yes'
        });

    newProblem.target = newProblem.depvar[0];
    newProblem.description = newProblem.target+" is predicted by "+newProblem.predictors;

    let currentTaskType = d3mProblemDescription.taskType;
    let currentMetric = d3mProblemDescription.performanceMetrics[0].metric;

    if (findNode(newProblem.target).nature === "nominal") {
        newProblem.task = currentTaskType === 'taskTypeUndefined' ? 'classification' : currentTaskType;
        newProblem.metric = currentMetric === 'metricUndefined' ? 'f1Macro' : currentMetric;
    } else {
        newProblem.task = currentTaskType === 'taskTypeUndefined' ? 'regression' : currentTaskType;
        newProblem.metric = currentMetric === 'metricUndefined' ? 'meanSquaredError' : currentMetric;
    }

    if ((selectedProblem || {}).problem_id in manipulations)
        manipulations[newProblem.problem_id]
            = jQuery.extend(true, [], manipulations[selectedProblem.problem_id]);

    console.log("pushing new problem to discovered problems:");
    console.log(newProblem);

    disco.push(newProblem);
    setSelectedProblem(newProblem);
    setLeftTab('Discovery');
    loadResult([newProblem]);
    // let addProblemAPI = app.addProblem(preprocess_id, version, problem_section);
    // console.log("API RESPONSE: ",addProblemAPI );

    m.redraw();
}

export function connectAllForceDiagram() {
    let links = [];
    if (is_explore_mode) {
        for (let node of nodes) {
            for (let node1 of nodes) {
                if (node !== node1 && links.filter(l => l.target === node1 && l.source === node).length === 0) {
                    links.push({left: false, right: false, target: node, source: node1});
                }
            }
        }
    } else {
        let dvs = nodes.filter(n => zparams.zdv.includes(n.name));
        let nolink = zparams.zdv.concat(zparams.zgroup1).concat(zparams.zgroup2);
        let ivs = nodes.filter(n => !nolink.includes(n.name));

        links = dvs.map(dv => ivs.map(iv => ({
            left: true,
            right: false,
            target: iv,
            source: dv
        })));
    }
    restart([...links]);
}


// called when a problem is clicked in the discovery leftpanel table
export let discoveryClick = problemId => {
    setSelectedProblem(disco.find(problem => problem.problem_id === problemId));

    if (!selectedProblem) return;

    let {target, predictors} = selectedProblem;
    erase();
    [target, ...predictors].map(x => clickVar(x));
    predictors.forEach(predictor => setColors(nodes.find(node => node.name === predictor), gr1Color));
    setColors(findNode(target), dvColor);
    m.redraw();
    restart();
};


export let selectedProblem; // the problem object
export function setSelectedProblem(problem) {
    if (selectedProblem === problem) return; // ignore if already set

    selectedProblem = problem;
    updateRightPanelWidth();

    // if a constraint is being staged, delete it
    manipulate.setConstraintMenu(undefined);

    // remove old staged problems
    disco = disco.filter(entry => entry.problem_id === (problem || {}).problem_id || !entry.staged);
    if (problem === undefined) return;

    if (!(problem.problem_id in manipulations)) {
        let pipeline = [];

        if (problem['subsetObs']) {
            pipeline.push({
                type: 'subset',
                id: 'subset ' + pipeline.length,
                abstractQuery: [{
                    id: String(problem.problem_id) + '-' + String(0) + '-' + String(1),
                    name: problem['subsetObs'],
                    show_op: false,
                    cancellable: true,
                    subset: 'automated'
                }],
                nodeId: 2,
                groupId: 1
            })
        }

        if (problem['transform']) {
            let [variable, transform] = problem['transform'].split('=').map(_ => _.trim());
            pipeline.push({
                type: 'transform',
                transforms: [{
                    name: variable,
                    equation: transform
                }],
                expansions: [],
                binnings: [],
                manual: [],
                id: 'transform ' + pipeline.length,
            })
            problem.predictors.push(variable);
        }

        manipulations[problem.problem_id] = pipeline;
    }

    let countMenu = {type: 'menu', metadata: {type: 'count'}};
    let subsetMenu = [...manipulate.getPipeline(), ...manipulate.getProblemPipeline(problem) || []];
    manipulate.loadMenu(subsetMenu, countMenu).then(count => {
        manipulate.setTotalSubsetRecords(count);
        m.redraw();
    });

    resetPeek();

    // will trigger the call to solver, if a menu that needs that info is shown
    if (selectedProblem) setSolverPending(true);
}

export function getProblemCopy(problem) {
    let problemId = problem.problem_id;
    problem = jQuery.extend(true, {}, problem);  // deep copy of original

    let offset = 1;
    while (disco.find(prob => prob.problem_id === problem.problem_id + 'user' + offset)) offset++;
    let new_problem_id = problem.problem_id + 'user' + offset;

    if (problem.problem_id in manipulations)
        manipulations[new_problem_id] = jQuery.extend(true, [], manipulations[problem.problem_id]);

    Object.assign(problem, {
        problem_id: new_problem_id,
        provenance: problem.problem_id,
        system: 'user'
    })

    return problem;
}

export let stargazer = ""
export function modelSelectionResults(problem){
    setSolverPending(false);
    callSolver(problem).then(() => {
        console.log("callSolver response : ", solver_res)
        makeDataDiscovery()
        makeDiscoverySolutionPlot()
        makeDataDiscoveryTable()
    });
}

export function makeDataDiscovery(){
    console.log("make discovery")
    d3.select("#setPredictionDataLeft").html("");
    d3.select("#setPredictionDataLeft").select("svg").remove();
    let in_data = [
        {"Variable":"Dependent Variable : ", "Data":solver_res[0]['dependent_variable']},
        {"Variable":"Predictors : ", "Data":solver_res[0]['predictors']},
        {"Variable":"Description : ", "Data":solver_res[0]['description']},
        {"Variable":"Task : ", "Data":solver_res[0]['task']},
        {"Variable":"Model : ", "Data":solver_res[0]['model_type']}
    ]

    function tabulate(data, columns) {
		var table = d3.select('#setPredictionDataLeft').append('table')
		var thead = table.append('thead')
		var	tbody = table.append('tbody');

		// append the header row
		thead.append('tr')
		  .selectAll('th')
		  .data(columns).enter()
		  .append('th')
		    .text(function (column) { return column; })
        .style('background-color','rgba(0, 0, 0, .2)')
        ;

		// create a row for each object in the data
		var rows = tbody.selectAll('tr')
		  .data(data)
		  .enter()
		  .append('tr');

		// create a cell in each row for each column
		var cells = rows.selectAll('td')
		  .data(function (row) {
		    return columns.map(function (column) {
		      return {column: column, value: row[column]};
		    });
		  })
		  .enter()
		  .append('td')
		    .text(function (d) { return d.value; })
        .style('border-bottom','1px solid #ddd');

	  return table;
	}

	// render the table(s)
	tabulate(in_data, ['Variable', 'Data']); // 2 column table

}
export function makeDiscoverySolutionPlot(){
  let xdata = "Actual";
  let ydata = "Predicted";
  let mytitle = "Predicted V Actuals: Pipeline ";
  let dvvalues = solver_res[0]['predictor_values']['actualvalues']
  let predvals = solver_res[0]['predictor_values']['fittedvalues']
  let task = solver_res[0]['task']
  if(task == "regression"){
      console.log("scatter")
  scatter(dvvalues, predvals, xdata, ydata, undefined, undefined, mytitle);
  }
  else{
      console.log("confusion matrix")
    genconfdata(dvvalues,predvals);
  }
}
export function makeDataDiscoveryTable(){
//   console.log("Here we bring our table")
  stargazer = solver_res[0]['stargazer']
//   console.log("Stargazer : ", stargazer)
  // d3.select("#setDataTable").html("");
}

export let checkedDiscoveryProblems = new Set();
export let setCheckedDiscoveryProblem = (status, problem) => {
    if (problem !== undefined) status ? checkedDiscoveryProblems.add(problem) : checkedDiscoveryProblems.delete(problem);
    else checkedDiscoveryProblems = status ? new Set(disco.map(problem => problem.problem_id)) : new Set();
};

export async function submitDiscProb() {
    discoveryLadda.start();
    console.log("This is disco");
    console.log(disco);
    let outputCSV = "problem_id, system, meaningful \n";

    for(let i = 0; i < disco.length; i++) {
        if(checkedDiscoveryProblems.has(disco[i].problem_id)) { disco[i].meaningful = "yes"; }

        // build up the required .csv file line by line
        outputCSV = outputCSV + disco[i].problem_id + ", \"" + disco[i].system + "\", \"" + disco[i].meaningful + "\"\n";

        if(disco[i].subsetObs ==0 && disco[i].transform==0){
            // construct and write out the api call and problem description for each discovered problem
            let problemApiCall = CreatePipelineDefinition(disco[i].predictors, [disco[i].target], 10, disco[i]);
            let problemProblemSchema = CreateProblemSchema(disco[i]);
            let filename_api = disco[i].problem_id + '/ss_api.json';
            let filename_ps = disco[i].problem_id + '/schema.json';
            let res1 = await makeRequest(D3M_SVC_URL + '/store-user-problem', {filename: filename_api, data: problemApiCall } );
            let res2 = await makeRequest(D3M_SVC_URL + '/store-user-problem', {filename: filename_ps, data: problemProblemSchema } );
        } else {
            console.log('omitting:');
            console.log(disco[i]);
        };
    }

    // write the CSV file requested by NIST that describes properties of the solutions
    console.log(outputCSV);
    let res3 = await makeRequest(D3M_SVC_URL + '/store-user-problem', {filename: 'labels.csv', data: outputCSV});

    discoveryLadda.stop();
    // change status of buttons for estimating problem and marking problem as finished
    byId("btnDiscovery").classList.remove("btn-success");
    byId("btnDiscovery").classList.add("btn-default");
    byId("btnSubmitDisc").classList.remove("btn-success");
    byId("btnSubmitDisc").classList.add("btn-default");
    task1_finished = true;
    if(!(task2_finished)){
        byId("btnEstimate").classList.remove("btn-default");
        byId("btnEstimate").classList.add("btn-success");
    };
    //trigger("btnVariables", 'click');

    if(!problemDocExists){
        setModal("Your discovered problems have been submitted.", "Task Complete", true, false, false, locationReload);
    };

}

export function deleteFromDisc(discov){
    var index = disco.indexOf(discov);
    console.log("index of disco to be deleted", index)
    if (index > -1) {
        disco.splice(index, 1);
    }
}

export function saveDisc() {
    selectedProblem.description = document.getElementById("discoveryInput").value;
}

export function deleteProblem(preproess_id, version, problem_id) {
    console.log("Delete problem clicked")
    setSelectedProblem(undefined);
    m.request({
        method: "POST",
        url: "http://127.0.0.1:4354/preprocess/problem-section-delete",
        data: {
            "preprocessId" : preproess_id,
            "version": version,
            "problem_id" : problem_id
        }
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
 *  Function takes as input the pipeline template information (currently aux) and returns a valid pipline template in json. This json is to be inserted into SearchSolutions. e.g., problem = {...}, template = {...}, inputs = [dataset_uri]
 */
function makePipelineTemplate (aux) {
    console.log("this is aux for makePipelineTemplate:")
    console.log(aux);
    // aux.transform, aux.subsetFeats, aux.Obs are all by default 0. if not 0, which is set in preprocess, then steps should build the corresponding primitive call.

    let inputs = [];
    let outputs = [];
    let steps = [];

    if(typeof aux==="undefined") {    // This is how this is called by /SearchSolutions
        return {inputs:inputs,outputs:outputs,steps:steps};

    } else {                          // This is how this is called by Discovered Problems
        let ph = placeholderStep(); // this writes the placeholder object
        let rc = primitiveStepRemoveColumns(aux); // this writes the primitive object to remove columns

        inputs = [{name:"dataset"}];
        outputs = [{name:"dataset", data:"produce"}];
        steps = [rc,ph];

        return {inputs:inputs,outputs:outputs,steps:steps};
    };

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
function placeholderStep () {
    let step = {inputs:[{data:"steps.0.produce"}],outputs:[{id:"produce"}]};
    return {placeholder:step};
}

// function builds a step in a pipeline to remove indices
function primitiveStepRemoveColumns (aux) {
    //let keep = aux.predictors;  // This was being assigned by reference, not by value, thus changing the global disco table.
    let keep = [];
    for(let i=0; i<aux.predictors.length; i++) {
        keep[i] = aux.predictors[i];
    };
    typeof aux.target === 'string' ?  keep.push(aux.target): keep.concat(aux.target);

    // looks like some TA2s need this, so we'll also keep it
    keep.push("d3mIndex");

    let indices = [];
    for(let i=0; i<valueKey.length; i++) {
        if(keep.indexOf(valueKey[i]) > -1) continue;
        indices.push(i);
    }

    function buildItems (indices) {
        let items = [];
        for(let i = 0; i<indices.length; i++) {
            items[i] = {int64: indices[i].toString()};
        }
        return items;
    }

    let id = "2eeff053-395a-497d-88db-7374c27812e6";
    let version = "0.2.0";
    let python_path = "d3m.primitives.datasets.RemoveColumns";
    let name = "Column remover";
    let digest = "85b946aa6123354fe51a288c3be56aaca82e76d4071c1edc13be6f9e0e100144";
    let users = [];

    let hpitems = {items:buildItems(indices)};
    let hplist = {list:hpitems};
    let hpraw = {raw:hplist};
    let hpdata = {data:hpraw};
    let hpvalue = {value:hpdata};
    let hyperparams = {columns:hpvalue};

    let primitive = {id:id, version:version, python_path:python_path, name:name, digest:digest}

    let argdata = {data:"inputs.0"};
    let argcontainer = {container:argdata};
    let parguments = {inputs:argcontainer};

    let outputs = [{id:"produce"}];

    let step = {primitive:primitive, arguments:parguments, outputs:outputs, hyperparams:hyperparams, users:users};
    return {primitive:step};
}

/**
  Handle a websocket sent GetSearchSolutionResultsResponse
  wrapped in a StoredResponse object
*/
export async function handleGetSearchSolutionResultsResponse(response1){
  if(typeof response1===undefined){
    console.log('GetSearchSolutionResultsResponse: Error.  "response1" undefined');
    return;
  }
  let resizeTriggered = false;

  // ----------------------------------------
  // (1) Pull the solutionId
  // ----------------------------------------
  console.log('(1) Pull the solutionId');

  // Note: the response.id becomes the Pipeline id
  //
  //
  if(typeof response1.id===undefined){
    console.log('GetSearchSolutionResultsResponse: Error.  "response1.id" undefined');
    return;
  }
  if(typeof response1.response.solutionId===undefined){
    console.log('GetSearchSolutionResultsResponse: Error.  "response1.response.solutionId" undefined');
    return;
  }
  let solutionId = response1.response.solutionId;

  // ----------------------------------------
  // (2) Update the pipeline list on the UI
  // ----------------------------------------
  console.log('(2) Update the pipeline list on the UI');

  // ----------------------------------------
  // (2a) Update or Create the Pipeline
  // ----------------------------------------
  if (!ROOKPIPE_FROM_REQUEST){
    console.log('---------- ERROR: ROOKPIPE_FROM_REQUEST not set!!!');
  }
  onPipelinePrime(response1, ROOKPIPE_FROM_REQUEST) //, rookpipe - handleGetSearchSolutionResultsResponse

  if(!resizeTriggered){
      if (IS_D3M_DOMAIN){
          byId("btnSetx").click();   // Was "btnResults" - changing to simplify user experience for testing.
      };
      resizeTriggered = true;
  }
  if(selectedPipeline === undefined){
     setSelectedPipeline(pipelineTable[0]['PipelineID']);
  }

  // Add pipeline descriptions to allPipelineInfo
  // More overwriting than is necessary here.
  allPipelineInfo[response1.id] = Object.assign(allPipelineInfo[response1.id], response1.data);

}  // end GetSearchSolutionResultsResponse


/**
  Handle a describeSolutionResponse sent via websockets
*/
async function handleDescribeSolutionResponse(response){

  if(typeof response===undefined){
    console.log('handleDescribeSolutionResponse: Error.  "response" undefined');
    return;
  }
  if(typeof response.pipelineId===undefined){
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

  allPipelineInfo[pipelineId] = Object.assign(allPipelineInfo[pipelineId], response);

} // end: handleDescribeSolutionResponse

/**
  Handle a GetProduceSolutionResultsResponse sent via websockets
  -> parse response, retrieve data, plot data
*/
async function handleGetProduceSolutionResultsResponse(response){

    if(typeof response===undefined){
      console.log('handleGetProduceSolutionResultsResponse: Error.  "response" undefined');
      return;
    }
    if(typeof response.pipelineId===undefined){
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

    allPipelineInfo[response.pipelineId].predictedValues = responseOutputData;

    resultsplotgraph(response.pipelineId);

} // end: handleGetProduceSolutionResultsResponse

/**
  Handle a getScoreSolutionResultsResponse send via websocket
  wrapped in a StoredResponse object
*/
async function handleGetScoreSolutionResultsResponse(response){
  if(typeof response===undefined){
    console.log('handleGetScoreSolutionResultsResponse: Error.  "response" undefined');
    return;
  }
  if(typeof response.is_finished === undefined){
    console.log('handleGetScoreSolutionResultsResponse: Error.  "response.data.is_finished" undefined');
    return;
  }
  if(!response.is_finished){
    return;
  }

  let myscore;

  try{
    // This is very specific, the potential responses may vary greatly
    //
    myscore = response.response.scores[0].value.raw.double.toPrecision(3);
  }catch(error) {
    console.log(JSON.stringify(response));
    alert('Error in "handleGetScoreSolutionResultsResponse": ' + error);
    console.error(error);
    return;
  }
  // Note: what's now the "res4DataId" needs to be sent to this function
  //
  let matchedPipeline = pipelineTable.find(candidate => candidate['PipelineID'] === parseInt(response.pipelineId, 10))

  if (matchedPipeline===undefined){
    console.log('handleGetScoreSolutionResultsResponse: Error.  Pipeline not found for id: ' + response.pipelineId);
  }else{
    // set the score
    matchedPipeline['Score'] = String(myscore);

    // sort the pipeline table by score
    pipelineTable = sortPipelineTable(pipelineTable);

    // Click the "Prediction Summary" button
    byId("btnPredPlot").click();
  }
} // end: handleGetScoreSolutionResultsResponse


/*
  Triggered at the end of GetSearchSolutionsResults
*/
async function handleENDGetSearchSolutionsResults(){

  // stop spinner
  estimateLadda.stop();
  // change status of buttons for estimating problem and marking problem as finished
  byId("btnEstimate").classList.remove("btn-success");
  byId("btnEstimate").classList.add("btn-default");
  byId("btnEndSession").classList.remove("btn-default");
  byId("btnEndSession").classList.add("btn-success");

  task2_finished = true; // should this go here?

  // stop the interval process
}

export async function addProblem(preprocess_id, version){
    // return await m.request({
    //     method: "POST",
    //     url: "http://127.0.0.1:4354/preprocess/problem-section", // should be changed later
    //     data: {
    //         "preprocessId": preprocess_id,
    //         "version": version,
    //         "problems": problem_sent
    //     }
    // })
    problem_sent.length = 0;
}


// takes as input problem in the form of a "discovered problem" (can also be user-defined), calls rooksolver, and stores result
export async function callSolver(prob) {
    let hasManipulation = prob.problem_id in manipulations && manipulations[prob.problem_id].length > 0;
    let hasNominal = [prob.target, ...prob.predictors].some(variable => zparams.znom.includes(variable));
    let zd3mdata = hasManipulation || hasNominal ? await manipulate.buildDatasetUrl(prob) : zparams.zd3mdata;

    // MIKE: shouldn't solverapp return a list? even a singleton list would be fine
    solver_res = [await makeRequest(ROOK_SVC_URL + 'solverapp', {prob, zd3mdata})];
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

export let omniSort = (a, b) => {
    if (a === undefined && b !== undefined) return -1;
    if (b === undefined && a !== undefined) return 1;
    if (a === b) return 0;
    if (typeof a === 'number') return a - b;
    if (typeof a === 'string') return  a.localeCompare(b);
    return (a < b) ? -1 : 1;
};

export function callTransform(elem){
    console.log("function called")
    let json =  makeRequest(
        ROOK_SVC_URL + 'transformapp',
        {zdataurl: dataurl,
         zvars: elem,
         zsessionid: zparams.zsessionid,
         transform: t,
         callHistory: callHistory,
         typeTransform: typeTransform,
         typeStuff: outtypes});

         console.log(json)
}
