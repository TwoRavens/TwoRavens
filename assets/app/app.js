import hopscotch from 'hopscotch';
import m from 'mithril';

import * as common from "../common/app/common";
import {setModal} from '../common/app/views/Modal';

import {bars, barsNode, barsSubset, density, densityNode, scatter, selVarColor} from './plots.js';
import {elem, fadeOut} from './utils';

//-------------------------------------------------
// NOTE: global variables are now set in the index.html file.
//    Developers, see /template/index.html
//-------------------------------------------------

let peekBatchSize = 100;
let peekSkip = 0;
let peekData = [];

let peekAllDataReceived = false;
let peekIsGetting = false;

function onStorageEvent(e) {
    if (e.key !== 'peekMore' || peekIsGetting) return;

    if (localStorage.getItem('peekMore') === 'true' && !peekAllDataReceived) {
        localStorage.setItem('peekMore', 'false');
        peekIsGetting = true;
        updatePeek();
    }
}

window.addEventListener('storage', onStorageEvent);

function updatePeek() {
    m.request(`rook-custom/rook-files/${configurations.name}/data/trainData.tsv`, {
        deserialize: x => x.split('\n').map(y => y.split('\t'))
    }).then(data => {
        // simulate only loading some of the data... by just deleting all the other data
        let headers = data[0].map(x => x.replace(/"/g, ''));
        let newData = data.slice(peekSkip + 1, peekSkip + 1 + peekBatchSize);

        // stop blocking new requests
        peekIsGetting = false;

        // start blocking new requests until peekReset() is called
        if (newData.length === 0) peekAllDataReceived = true;

        peekData = peekData.concat(newData);
        peekSkip += newData.length;

        localStorage.setItem('peekTableHeaders', JSON.stringify(headers));
        localStorage.setItem('peekTableData', JSON.stringify(peekData));
    });
}

function resetPeek() {
    peekSkip = 0;
    peekData = [];

    peekAllDataReceived = false;
    peekIsGetting = false;

    // provoke a redraw from the peek menu
    localStorage.removeItem('peekTableData');
}

resetPeek();

export let exploreVariate = 'Univariate';
export function setVariate(variate) {
    exploreVariate = variate;
}

export let task1_finished = false;
export let task2_finished = false;
export let univariate_finished = false;
export let resultsMetricDescription = 'Larger numbers are better fits';

export let allsearchId = [];            // List of all the searchId's created on searches

export let currentMode = 'model';
export let is_explore_mode = false;
export let is_results_mode = false;
export let is_transform_mode = false;

export function set_mode(mode) {
    mode = mode ? mode.toLowerCase() : 'model';

    is_explore_mode = mode === 'explore';
    is_results_mode = mode === 'results';
    is_transform_mode = mode === 'transform';

    if (currentMode !== mode) {
        updateRightPanelWidth();
        updateLeftPanelWidth();

        currentMode = mode;
        m.route.set('/' + mode);
    }

    let ws = elem('#whitespace0');
    if (ws) {
        ws.style.display = currentMode === 'model' ? 'none' : 'block';
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

export let rightTab = 'Task Type'; // current tab in right panel
export let rightTabExplore = 'Univariate';

export let modelLeftPanelWidths = {
    'Variables': '300px',
    'Discovery': 'auto',
    'Summary': '300px',
    'Subset': '300px'
};

export let modelRightPanelWidths = {
    'Models': '300px',
    'Task Type': '300px',
    'Subtype': '300px',
    'Metrics': '300px',
    'Results': '900px'
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

let updateRightPanelWidth = () => {
    if (is_explore_mode) {
        return panelWidth.right = `calc(${common.panelMargin * 2}px + 16px)`;
    }

    if (common.panelOpen['right']) {
        let tempWidth = {
            'model': modelRightPanelWidths[rightTab],
            'explore': exploreRightPanelWidths[rightTabExplore]
        }[currentMode];

        panelWidth['right'] = `calc(${common.panelMargin * 2}px + ${tempWidth})`;
    }
    else panelWidth['right'] = `calc(${common.panelMargin * 2}px + 16px)`;
};
let updateLeftPanelWidth = () => {
    if (common.panelOpen['left'])
        panelWidth['left'] = `calc(${common.panelMargin * 2}px + ${modelLeftPanelWidths[leftTab]})`;
    else panelWidth['left'] = `calc(${common.panelMargin * 2}px + 16px)`;
};

updateRightPanelWidth();
updateLeftPanelWidth();

common.setPanelCallback('right', updateRightPanelWidth);
common.setPanelCallback('left', updateLeftPanelWidth);

// transformation toolbar options
let t, typeTransform;
export let transformList = 'log(d) exp(d) d^2 sqrt(d) interact(d,e)'.split(' ');
let transformVar = '';

// var list for each space contain variables in original data
// plus trans in that space
let trans = [];
let preprocess = {}; // hold pre-processed data
let spaces = [];

// layout function constants
const layoutAdd = "add";
const layoutMove = "move";

// radius of circle
export const RADIUS = 40;

// cx, cy, r values for indicator lights
let ind1 = [(RADIUS+30) * Math.cos(1.3), -1*(RADIUS+30) * Math.sin(1.3), 5];
let ind2 = [(RADIUS+30) * Math.cos(1.1), -1*(RADIUS+30) * Math.sin(1.1), 5];

// space index
export let myspace = 0;

export let forcetoggle = ["true"];
export let locktoggle = true;
let priv = true;

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

export let disco = [];

export let modelCount = 0;
export let valueKey = [];
export let allNodes = [];
export let allResults = [];
export let nodes = [];
export let links = [];
let mods = {};
let estimated = false;
let rightClickLast = false;
let selInteract = false;
export let callHistory = []; // transform and subset calls
let mytarget = '';
let mytargetindex = '';

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

/*
 * call to django to update the problem definition in the problem document
 * rpc SetProblemDoc(SetProblemDocRequest) returns (Response) {}
 */
export let setD3mProblemDescription = (key, value) => {
    if (!locktoggle) {
        d3mProblemDescription[key] = value;

        let lookup = {
            'taskType': d3mTaskType,
            'taskSubtype': d3mTaskSubtype,
            // 'outputType': d3mOutputType,
            'metric': d3mMetrics
        }[key];

        if (lookup === undefined) return;
        makeRequest(
            D3M_SVC_URL + "/SetProblemDoc",
            {replaceProblemSchemaField: {[key]: lookup[d3mProblemDescription[key]][1]}, context: apiSession(zparams.zsessionid)});
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
let selectedPebble;

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

    // 1. Retrieve the configuration information
    let res = await m.request({
        method: "POST",
        url: "/config/d3m-config/json/latest"
    });
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
    console.log("prob schema data: ", res);

    mytarget = res.inputs.data[0].targets[0].colName; // easier way to access target name?
    mytargetindex = res.inputs.data[0].targets[0].colIndex; // easier way to access target name?
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
    localStorage.setItem('peekHeader', "TwoRavens " + dataname);

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
        setModal(user_err_msg, "Error Connecting to TA2", true, "Reset", false, location.reload);
        return;
      } else {
            zparams.zsessionid = "no session id in this API version";   // remove this eventually
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

    console.log("is this preprocess?")
    console.log(res);
    console.log(preprocess);

    // 9. Build allNodes[] using preprocessed information
    let vars = Object.keys(preprocess);
    // temporary values for hold that correspond to histogram bins
    hold = [.6, .2, .9, .8, .1, .3, .4];
    for (let i = 0; i < vars.length; i++) {
        // valueKey[i] = vars[i].attributes.name.nodeValue;
        // lablArray[i] = varsXML[i].getElementsByTagName("labl").length == 0 ?
        // "no label" :
        // varsXML[i].getElementsByTagName("labl")[0].childNodes[0].nodeValue;
        // let datasetcount = d3.layout.histogram()
        //     .bins(barnumber).frequency(false)
        //     ([0, 0, 0, 0, 0]);
        valueKey[i] = vars[i];
        lablArray[i] = "no label";
        // contains all the preprocessed data we have for the variable, as well as UI data pertinent to that variable,
        // such as setx values (if the user has selected them) and pebble coordinates
        let obj = {
            id: i,
            reflexive: false,
            name: valueKey[i],
            labl: lablArray[i],
            data: [5, 15, 20, 0, 5, 15, 20],
            count: hold,
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
        };
        jQuery.extend(true, obj, preprocess[valueKey[i]]);
        allNodes.push(obj);
    }

    // 10. Add datadocument information to allNodes (when in IS_D3M_DOMAIN)
    if(!swandive) {
        let datavars = datadocument_columns;
        datavars.forEach((v, i) => {
            let myi = findNodeIndex(v.colName);
            allNodes[myi] = Object.assign(allNodes[myi], {d3mDescription: v});
        });
        console.log("all nodes:");
        console.log(allNodes);
    }

    // 10b. Call problem discovery
    // Requires that `res` built in 8. above still exists.  Should make this better.
    if(!swandive) {
        disco = discovery(res);

        // Kick off discovery button as green for user guidance
        byId("btnDiscovery").classList.remove("btn-default");
        byId("btnDiscovery").classList.add("btn-success"); // Would be better to attach this as a class at creation, but don't see where it is created

        console.log("disco:");
        console.log(disco);
    }

    // 11. Call layout() and start up
    layout(false, true);
    IS_D3M_DOMAIN ? zPop() : dataDownload();
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
function zparamsReset(text) {
    'zdv zcross ztime znom'.split(' ').forEach(x => del(zparams[x], -1, text));
}

export function setup_svg(svg) {
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

/** needs doc */
export function layout(v, v2) {
    var myValues = [];
    nodes = [];
    links = [];

    var [line, line2, visbackground, vis2background, vis, vis2, drag_line, path, circle] = setup_svg(svg);

    if (v == layoutAdd || v == layoutMove) {
        for (var j = 0; j < zparams.zvars.length; j++) {
            var ii = findNodeIndex(zparams.zvars[j]);
            if (allNodes[ii].grayout)
                continue;
            nodes.push(allNodes[ii]);
            var selectMe = zparams.zvars[j].replace(/\W/g, "_");
            selectMe = "#".concat(selectMe);
            d3.select(selectMe).style('background-color', () => hexToRgba(nodes[j].strokeColor));
        }

        for (var j = 0; j < zparams.zedges.length; j++) {
            var mysrc = nodeIndex(zparams.zedges[j][0]);
            var mytgt = nodeIndex(zparams.zedges[j][1]);
            links.push({
                source: nodes[mysrc],
                target: nodes[mytgt],
                left: false,
                right: true
            });
        }
    } else {
        if(IS_D3M_DOMAIN) {
            //nodes = [findNode(mytarget)];               // Only add dependent variable on startup
            nodes = allNodes.slice(1,allNodes.length);    // Add all but first variable on startup (assumes 0 position is d3m index variable)
            for (let j = 0; j < nodes.length; j++) { //populate zvars array
                if (nodes[j].name != mytarget) {
                    nodes[j].group1 = true;
                    zparams.zgroup1.push(nodes[j].name);  // write all names (except d3m index and the dependent variable) to zgroup1 array
                };
            };
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

    var force = d3.layout.force()
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
            if(findnames.length>0){
                for (var j = 0; j < findnames.length; j++) {
                    addlocation = allnames.indexOf(findnames[j]);
                    fcoords[j] = coords[addlocation];
                };
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
                    .attr("y2", q[1]- (ltargetPadding * lnormY));
            };

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
                    .attr("y2", q[1]- (ltargetPadding * lnormY));
            };

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

        let redrawPebbles = () => {
            g[0].forEach((pebble) => {
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
            })
        }

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
                    setTimeout(() => {
                        fillThis(this, 0, 100, 500);
                        fill(d, 'dvText', 0, 100, 500);
                    }, hoverTimeout)
                })
                .on('click', function(d) {
                    setColors(d, dvColor);
                    legend(dvColor);
                    d.group1 = d.group2 = false;
                    selectedPebble = d.name;
                    redrawPebbles();
                    restart();
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
                    setTimeout(() => {
                        fillThis(this, 0, 100, 500);
                        fill(d, "nomText", 0, 100, 500);
                    }, hoverTimeout)
                })
                .on('click', function (d) {
                    if (d.defaultNumchar == "character") return;
                    setColors(d, nomColor);
                    legend(nomColor);
                    selectedPebble = d.name;
                    redrawPebbles();
                    restart();
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
                    setTimeout(() => {
                        fill(d, "gr1indicator", 0, 100, 500);
                        fill(d, "gr2indicator", 0, 100, 500);
                        fillThis(this, 0, 100, 500);
                        fill(d, 'grText', 0, 100, 500);
                    }, hoverTimeout)
                })
                .on('click', d => {
                    //d.group1 = !d.group1;      // This might be easier, but currently set in setColors()
                    setColors(d, gr1Color);
                    legend(gr1Color);
                    selectedPebble = d.name;
                    redrawPebbles();
                    restart();
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
                    setTimeout(() => {
                        fillThis(this, 0, 100, 500);
                        fill(d, "grArc", 0, 100, 500);
                        fill(d, 'grText', 0, 100, 500);
                    }, hoverTimeout)
                })
                .on('click', d => {
                    //d.group1 = !d.group1;      // This might be easier, but currently set in setColors()
                    setColors(d, gr1Color);
                    legend(gr1Color);
                    selectedPebble = d.name;
                    redrawPebbles();
                    restart();
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
                    setTimeout(() => {
                        fillThis(this, 0, 100, 500);
                        fill(d, "grArc", 0, 100, 500);
                        fill(d, 'grText', 0, 100, 500);
                    }, hoverTimeout)
                })
                .on('click', d => {
                    //d.group2 = !d.group2;      // This might be easier, but currently set in setColors()
                    setColors(d, gr2Color);
                    legend(gr2Color);
                    selectedPebble = d.name;
                    redrawPebbles();
                    restart();
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
                redrawPebbles();
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

                    byId('transformations').setAttribute('style', 'display:block');
                    byId("transSel").selectedIndex = d.id;
                    transformVar = valueKey[d.id];

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

                    if (selectedPebble) varSummary(allNodes.filter((node) => node.name === selectedPebble)[0]);
                    else setLeftTab(leftTabHidden);
                    'csArc csText timeArc timeText dvArc dvText nomArc nomText grArc grText'.split(' ').map(x => fill(d, x, 0, 100, 500));
                    m.redraw();
                }, hoverTimeout)
            });

        // the transformation variable list is silently updated as pebbles are added/removed
        d3.select("#transSel")
            .selectAll('li')
            .remove();

        d3.select("#transSel")
            .selectAll('li')
            .data(nodes.map(x => x.name)) // set to variables in model space as they're added
            .enter()
            .append("li")
            .text(d => d);

        if(!IS_D3M_DOMAIN) {
            document.querySelectorAll('#transSel li').forEach(x => x.onclick(function(evt) {
                // if 'interaction' is the selected function, don't show the function list again
                let tInput = byId('tInput');
                if (selInteract) {
                    let n = tInput.value.concat(this.textContent);
                    tInput.value = n;
                    evt.stopPropagation();
                    let t = transParse(n = n);
                    if (!t) return;
                    fadeOut(this.parentNode, 100);
                    transform(n = t.slice(0, t.length - 1), t = t[t.length - 1], typeTransform = false);
                    return;
                }

                tInput.value = this.textContent;
                fadeOut(this.parentNode, 100);
                fadeOut('#transList', 100);
                evt.stopPropagation();
            }));
        };

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

    d3.select(window)
        .on('click', () => {
            // all clicks will bubble here unless event.stopPropagation()
            fadeOut('#transList', 100);
            fadeOut('#transSel', 100);
        });

    restart(); // initializes force.layout()
    fakeClick();

    if(v2 & IS_D3M_DOMAIN) {
        var click_ev = document.createEvent("MouseEvents");
        // initialize the event
        click_ev.initEvent("click", true /* bubble */, true /* cancelable */);
        // trigger the event
        let clickID = "dvArc"+findNodeIndex(mytarget);
        byId(clickID).dispatchEvent(click_ev);

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

/**
 returns id
 */
export function findNodeIndex(name, whole) {
    for (let node of allNodes)
        if (node.name === name) return whole ? node : node.id;
}

/** needs doc */
function nodeIndex(nodeName) {
    for (let i in nodes)
        if (nodes[i].name === nodeName) return i;
}

/** needs doc */
export function findNode(name) {
    for (let n of allNodes)
        if (n.name === name)
            return n;
}

/** needs doc */
function updateNode(id, nodes) {
    let node = findNode(id);
    if (node.grayout) {
        return false;
    }

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

            borderState();
        }
    } else {
        nodes.push(node);
    }

    if (is_explore_mode) {
        return false;
    }

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
export let lockDescription = (state) => locktoggle = state;

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
    console.log("JUST DID THIS");
    selectedPipeline = result;
    if (currentMode === 'model') resultsplotinit(result);
}

export let selectedResultsMenu;
export let setSelectedResultsMenu = result => selectedResultsMenu = result;


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
    //exportpipeline(pipelineTable[1][1]);
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
        console.log(problem);
        console.log("valueKey");
        console.log(valueKey);
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
    let my_solutionId = solutionId;
    let my_dataseturi = 'file://' + datasetdocurl;
    let my_inputs = [{dataset_uri: my_dataseturi}];
    let my_exposeOutputs = [];   // eg. ["steps.3.produce"];  need to fix
    let my_exposeValueTypes = ['CSV_URI'];
    let my_users = [{id: 'TwoRavens', choosen: false, reason: ''}];
    return {solutionId: my_solutionId, inputs: my_inputs, exposeOutputs: my_exposeOutputs, exposeValueTypes: my_exposeValueTypes, users: my_users};
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
    let my_fittedSolutionId = fsid;
    let my_dataseturi = 'file://' + datasetdocurl;
    let my_inputs = [{dataset_uri: my_dataseturi}];
    let my_exposeOutputs = [];  // Not sure about this.
    let my_exposeValueTypes = ['CSV_URI']; // Not sure about this.
    return {fittedSolutionId: my_fittedSolutionId, inputs: my_inputs, exposeOutputs: my_exposeOutputs, exposeValueTypes: my_exposeValueTypes};
}

function CreateScoreDefinition(res){
    let my_solutionId = res.data.response.solutionId;
    let my_dataseturi = 'file://' + datasetdocurl;
    let my_inputs = [{dataset_uri: my_dataseturi}];
    let my_performanceMetrics = [{metric: d3mMetrics[d3mProblemDescription.performanceMetrics[0].metric][1]} ];  // need to generalize to case with multiple metrics.  only passes on first presently.;
    let my_users = [{id: 'TwoRavens', choosen: false, reason: ""}];
    let my_configuration = {method: 'HOLDOUT', folds: 0, trainTestRatio: 0, shuffle: false, randomSeed: 0, stratified: false};
    return {solutionId: my_solutionId, inputs: my_inputs, performanceMetrics: my_performanceMetrics, users: my_users, configuration: my_configuration};
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
        if (downloadIncomplete()) {
            return;
        }

        zPop();
        // write links to file & run R CMD
        // package the output as JSON
        // add call history and package the zparams object as JSON
        zparams.callHistory = callHistory;
        zparams.allVars = valueKey.slice(10, 25); // because the URL is too long...

        /* UNUSED
        var selectorurlcall = ROOK_SVC_URL + "selectorapp";
        function selectorSuccess(btn, json) {
            d3.select("#ticker")
                .text("Suggested variables and percent improvement on RMSE: " + json.vars);
            cdb("selectorSuccess: ", json);
        }
        function selectorFail(btn) {
            alert("Selector Fail");
        }
        */

        estimateLadda.start(); // start spinner
        let json = await makeRequest(ROOK_SVC_URL + 'zeligapp', zparams);
        if (!json) {
            estimated = true;
        } else {
            allResults.push(json);
            if (!estimated) byId("tabResults").removeChild(byId("resultsHolder"));

            estimated = true;
            d3.select("#tabResults")
                .style("display", "block");
            d3.select("#resultsView")
                .style("display", "block");
            d3.select("#modelView")
                .style("display", "block");

            // programmatic click on Results button
            trigger("btnSetx", "click"); // Was "btnResults" - changing to simplify user experience for testing.

            let model = "Model".concat(modelCount = modelCount + 1);

            function modCol() {
                d3.select("#modelView")
                    .selectAll("p")
                    .style('background-color', hexToRgba(varColor));
            }
            modCol();

            d3.select("#modelView")
                .insert("p", ":first-child") // top stack for results
                .attr("id", model)
                .text(model)
                .style('background-color', hexToRgba(selVarColor))
                .on("click", function() {
                    var a = this.style.backgroundColor.replace(/\s*/g, "");
                    var b = hexToRgba(selVarColor).replace(/\s*/g, "");
                    if (a.substr(0, 17) == b.substr(0, 17))
                        return; // escape function if displayed model is clicked
                    modCol();
                    d3.select(this)
                        .style('background-color', hexToRgba(selVarColor));
                    viz(this.id);
                });

            let rCall = [json.call];
            showLog('estimate', rCall);

            viz(model);
        }
    } else if (swandive) { // IS_D3M_DOMAIN and swandive is true
        zPop();
        zparams.callHistory = callHistory;

        let myvki = valueKey.indexOf(mytarget);
        if(myvki != -1) {
            del(valueKey, myvki);
        }

        estimateLadda.start(); // start spinner
        let res = await makeRequest(D3M_SVC_URL + '/SearchSolutions', CreatePipelineDefinition(valueKey, mytarget));
        //res && onPipelineCreate(res);   // arguments were wrong, and this function no longer needed

    } else { // we are in IS_D3M_DOMAIN no swandive
        // rpc CreatePipelines(PipelineCreateRequest) returns (stream PipelineCreateResult) {}
        zPop();
        zparams.callHistory = callHistory;

        // pipelineapp is a rook application that returns the dependent variable, the DV values, and the predictors. can think of it was a way to translate the potentially complex grammar from the UI

        estimateLadda.start(); // start spinner

        // 1. Some diagnostic tests to add special characters to the pipelineapp call:
        //zparams.zgroup1.unshift("blah+");
        //zparams.zgroup1.unshift("Alice-was_beg!n^ing t* get/ ve#y tired of s(tt)ng by her si$\+er on th= bank & of having nothing to do:");

        // 2. Note how they go out in call:
        //console.log("zparams zgroup1");
        //console.log(zparams.zgroup1);      // Notice zgroup1 is being sent with correct characters

        let rookpipe = await makeRequest(ROOK_SVC_URL + 'pipelineapp', zparams);        // parse the center panel data into a formula like construction

        // 3. And check they come back correctly formed:
        //console.log("pipeline app return (rookpipe)");
        //console.log(rookpipe);

        if (!rookpipe) {
            estimated = true;
        } else {
            setxTable(rookpipe.predictors);
            let res = await makeRequest(D3M_SVC_URL + '/SearchSolutions', CreatePipelineDefinition(rookpipe.predictors, rookpipe.depvar, 2));
            let searchId = res.data.searchId;
            let solutionId = "";
            let fittedId = "";
            allsearchId.push(searchId);

            let res2 = await makeRequest(D3M_SVC_URL + '/GetSearchSolutionsResults', {searchId: searchId});
            let searchDetailsUrl = res2.data.details_url;
            let fittedDetailsUrl = "";
            let solutionDetailsUrl = "";

            let searchFinished = false;
            let fitFinished = false;
            let res3, res4;
            let oldCount = 0;
            let newCount = 0;
            let resizeTriggered = false;
            let predPlotTriggered = false;

            let fitFlag = false;

            let refreshIntervalId = setInterval(async function() {
                res3 = await updateRequest(searchDetailsUrl);                // silent equivalent makeRequest() with no data argument.  Also, should check whether best to be synchronous here.
                newCount = res3.data.responses.count;

                // Check if new pipeline to add and inspect
                if(newCount>oldCount){
                    //for (var i = oldCount; i < newCount; i++) {       //  for statement if new items are pushed instead
                    for (var i = 0; i < (newCount-oldCount); i++) {     //  instead, updates are at top of list
                        //console.log(res3.data.responses.list[i].details_url);
                        solutionDetailsUrl = res3.data.responses.list[i].details_url;
                        res4 = await updateRequest(solutionDetailsUrl);
                        let res4DataId = res4.data.id;
                        //console.log(res4);
                        solutionId = res4.data.response.solutionId;
                        onPipelinePrime(res4.data, rookpipe);

                        // Once pipelineTable exist, can rebuild the window to start exploring results
                        if(!resizeTriggered){
                            if (IS_D3M_DOMAIN){
                                byId("btnSetx").click();   // Was "btnResults" - changing to simplify user experience for testing.
                            };
                            resizeTriggered = true;
                        }

                        if(selectedPipeline === undefined){
                            setSelectedPipeline(pipelineTable[0]['PipelineID']);
                        }

                        let res10, res11, res77, res5, res6, res8;
                        let scoreDetailsUrl;

                        if(typeof solutionId != 'undefined'){         // Find out when this happens

                            // [1] Get the template language description of the pipeline solution
                            res77 = await makeRequest(D3M_SVC_URL + '/DescribeSolution', {solutionId: solutionId});                            
                            // Add pipeline descriptions to allPipelineInfo
                            // More overwriting than is necessary here.
                            allPipelineInfo[res4.data.id] = Object.assign(allPipelineInfo[res4.data.id], res4.data, res77.data);

                            console.log("pipeline description here:")
                            console.log(allPipelineInfo[res4.data.id].pipeline);

                            // [2] Ask for a solution to be scored
                            res10 = await makeRequest(D3M_SVC_URL + '/ScoreSolution', CreateScoreDefinition(res4));
                            
                            if(typeof res10.data.requestId != 'undefined'){
                                let scoreId = res10.data.requestId;
                                res11 = await makeRequest(D3M_SVC_URL + '/GetScoreSolutionResults', {requestId: scoreId});
                                scoreDetailsUrl = res11.data.details_url;  
                            };

                            if(fitFlag){
                                res5 = await makeRequest(D3M_SVC_URL + '/FitSolution', CreateFitDefinition(solutionId));
                                if(typeof res5.data.requestId != 'undefined'){
                                    fittedId = res5.data.requestId;
                                    res6 = await makeRequest(D3M_SVC_URL + `/GetFitSolutionResults`, {requestId: fittedId});
                                    fittedDetailsUrl = res6.data.details_url;
                                };
                            };
                        };

                        // Possibly these belong elsewhere, like a callback function above.

                        let scoringIntervalId = setInterval(async function() {
                            let res12 = await updateRequest(scoreDetailsUrl);   // check
                            if(typeof res12.data.is_finished != 'undefined'){
                                if(res12.data.is_finished){
                                    if(res12.data.responses.list.length > 0){   // need to understand why this comes back is.finished=true but also length=0
                                        console.log('finished scoring');
                                        let finalScoreUrl = res12.data.responses.list[0].details_url;
                                        let res13 = await updateRequest(finalScoreUrl);
                                        let myscore = res13.data.response.scores[0].value.raw.double.toPrecision(3);   // Makes a number of assumptions about how values are returned, also need to attempt to deal w multiple scores
                                        let matchedPipeline = pipelineTable.find(candidate => candidate['PipelineID'] === parseInt(res4DataId, 10))
                                        matchedPipeline['Score'] = String(myscore);
                                        if(!predPlotTriggered){
                                            console.log(pipelineTable);
                                                byId("btnPredPlot").click();   // Was "btnResults" - changing to simplify user experience for testing.
                                            predPlotTriggered = true;
                                        };

                                        //onPipelineCreate(res13, res4DataId);    // This function was getting shorter and shorter, and now just lives above.
                                    } else {
                                        console.log('finished scoring but broken');
                                        let brokenPipeline = pipelineTable.find(candidate => candidate['PipelineID'] === parseInt(res4DataId, 10))
                                        brokenPipeline['Score'] = 'no score';
                                    };
                                    pipelineTable = sortPipelineTable(pipelineTable);
                                    clearInterval(scoringIntervalId);
                                };
                            };
                        }, 2700);

                        let finalFittedId, finalFittedDetailsUrl;
                        if(fitFlag){
                            let fittingIntervalId = setInterval(async function() {
                                let res7 = await updateRequest(fittedDetailsUrl);   // check
                                if(typeof res7.data.is_finished != 'undefined'){
                                    if(res7.data.is_finished){
                                        finalFittedDetailsUrl = res7.data.responses.list[0].details_url;
                                        res8 = await updateRequest(finalFittedDetailsUrl);
                                        finalFittedId = res8.data.response.fittedSolutionId;
                                        console.log("finalfittedId:" + finalFittedId);

                                        // PUT finalFittedId SOMEWHERE IT CAN BE FOUND : maybe allPipelineInfo

                                        clearInterval(fittingIntervalId);
                                    };
                                };
                            }, 500);
                        };

                    };
                    oldCount = newCount;
                };

                searchFinished = res3.data.is_finished;

                // Check if search is finished
                if(searchFinished){
                    // stop spinner
                    estimateLadda.stop();
                    // change status of buttons for estimating problem and marking problem as finished
                    byId("btnEstimate").classList.remove("btn-success");
                    byId("btnEstimate").classList.add("btn-default");
                    byId("btnEndSession").classList.remove("btn-default");
                    byId("btnEndSession").classList.add("btn-success");
                    // stop the interval process
                    clearInterval(refreshIntervalId);
                };
            }, 1000);

        }
    }
    task2_finished = true;
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

/**
   parses the transformation input.
   variable names are often nested inside one another, e.g., ethwar, war, wars, and so this is handled
*/
function transParse(n) {
    var out2 = [];
    var t2 = n;
    var k2 = 0;
    var subMe2 = "_transvar".concat(k2);
    var indexed = [];

    // out2 is all matched variables, indexed is an array, each element is an object that contains the matched variables starting index and finishing index.  e.g., n="wars+2", out2=[war, wars], indexed=[{0,2},{0,3}]
    for (var i in valueKey) {
        var m2 = n.match(valueKey[i]);
        if (m2 != null)
            out2.push(m2[0]);

        var re = new RegExp(valueKey[i], "g");
        var s = n.search(re);
        if (s != -1)
            indexed.push({from: s, to: s + valueKey[i].length});
    }

    // nested loop not good, but indexed is not likely to be very large.
    // if a variable is nested, it is removed from out2
    // notice, loop is backwards so that index changes don't affect the splice
    cdb("indexed ", indexed);
    for (var i = indexed.length - 1; i > -1; i--) {
        for (var j = indexed.length - 1; j > -1; j--) {
            if (i === j)
                continue;
            if ((indexed[i].from >= indexed[j].from) & (indexed[i].to <= indexed[j].to)) {
                cdb(i, " is nested in ", j);
                del(out2, i);
            }
        }
    }

    for (var i in out2) {
        t2 = t2.replace(out2[i], subMe2); //something that'll never be a variable name
        k2 = k2 + 1;
        subMe2 = "_transvar".concat(k2);
    }

    if (out2.length > 0) {
        out2.push(t2);
        cdb("new out ", out2);
        return (out2);
    } else {
        alert("No variable name found. Perhaps check your spelling?");
        return null;
    }
}

/**
   n = name of column/node
   t = selected transformation
*/
async function transform(n, t, typeTransform) {
    if (downloadIncomplete()) {
        return;
    }

    if (!typeTransform)
        t = t.replace("+", "_plus_"); // can't send the plus operator

    cdb('name of col: ' + n);
    cdb('transformation: ' + t);

    var btn = byId('btnEstimate');

    // find the node by name
    var myn = findNodeIndex(n[0], true);

    if (typeof myn === "undefined") {
        myn = findNodeIndex(n, true);
    }

    var outtypes = {
        varnamesTypes: n,
        interval: myn.interval,
        numchar: myn.numchar,
        nature: myn.nature,
        binary: myn.binary
    };

    cdb(myn);
    // if typeTransform but we already have the metadata
    if (typeTransform) {
        if (myn.nature == "nominal" & typeof myn.plotvalues !== "undefined") {
            myn.plottype = "bar";
            barsNode(myn);
            panelPlots();
            return;
        } else if (myn.nature != "nominal" & typeof myn.plotx !== "undefined") {
            myn.plottype = "continuous";
            densityNode(myn);
            panelPlots();
            return;
        }
    }

    estimateLadda.start(); // start spinner
    let json = await makeRequest(
        ROOK_SVC_URL + 'transformapp',
        {zdataurl: dataurl,
         zvars: myn.name,
         zsessionid: zparams.zsessionid,
         transform: t,
         callHistory: callHistory,
         typeTransform: typeTransform,
         typeStuff: outtypes});
    if (!json) {
        return;
    }

    // Is this a typeTransform?
    if (json.typeTransform[0]) {
        // Yes. We're updating an existing node
        d3.json(json.url, (err, data) => {
            if (err)
                return console.warn(err);
            let node;
            for (let key in data) {
                node = findNodeIndex(key, true);
		            if (!node)
		                continue;
                jQuery.extend(true, node, data[key]);
                node.plottype === "continuous" ? densityNode(node) :
                    node.plottype === "bar" ? barsNode(node) : null;
            }
            fakeClick();
            panelPlots();
            node && cdb(node);
        });
    } else {
        /* No, we have a new node here--e.g. the transformed column
           example response: {
           "call":["t_year_2"],
           "url":["data/preprocessSubset_BACCBC78-7DD9-4482-B31D-6EB01C3A0C95.txt"],
           "trans":["year","_transvar0^2"],
           "typeTransform":[false]
           }
        */
        callHistory.push({
            func: "transform",
            zvars: n,
            transform: t
        });

        var subseted = false;
        var rCall = [];

        rCall[0] = json.call;
        var newVar = rCall[0][0];

        trans.push(newVar);

        // Read the preprocess file containing values
        // for the transformed variable
        //
        d3.json(json.url, function(error, json) {
            if (error) return console.warn(error);

            var jsondata = getVariableData(json);

            for (var key in jsondata) {
                var myIndex = findNodeIndex(key);
                if (typeof myIndex !== "undefined") {
                    alert("Invalid transformation: this variable name already exists.");
                    return;
                }
                // add transformed variable to the current space
                var i = allNodes.length;  // get new index
                var obj1 = {
                    id: i,
                    reflexive: false,
                    name: key,
                    labl: "transformlabel",
                    data: [5, 15, 20, 0, 5, 15, 20],
                    count: [.6, .2, .9, .8, .1, .3, .4],
                    nodeCol: colors(i),
                    baseCol: colors(i),
                    strokeColor: selVarColor,
                    strokeWidth: "1",
                    subsetplot: false,
                    subsetrange: ["", ""],
                    setxplot: false,
                    setxvals: ["", ""],
                    grayout: false,
                    defaultInterval: jsondata[key].interval,
                    defaultNumchar: jsondata[key].numchar,
                    defaultNature: jsondata[key].nature,
                    defaultBinary: jsondata[key].binary
                };

                jQuery.extend(true, obj1, jsondata[key]);
                allNodes.push(obj1);

                valueKey.push(newVar);
                nodes.push(allNodes[i]);
                fakeClick();
                panelPlots();

                if (allNodes[i].plottype === "continuous") {
                    densityNode(allNodes[i]);
                } else if (allNodes[i].plottype === "bar") {
                    barsNode(allNodes[i]);
                }

                m.redraw();
            }
        });

        showLog('transform', rCall);
    }
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
    console.log('url:', url);
    console.log('POST:', data);
    let res;
    try {
        res = await m.request(url, {method: 'POST', data: data});
        console.log('response:', res);
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

/** needs doc */
export function legend() {
    borderState();
    m.redraw();
}

/**
   programmatically deselect every selected variable
*/
export function erase(disc) {
    setLeftTab(disc == 'Discovery' ? 'Discovery' : 'Variables');
    valueKey.forEach(function(element){
      if (zparams.zdv.concat(zparams.znom, zparams.zvars).includes(element))   // names start with varList now
        clickVar(element);
    });
}

/** needs doc */
export let setLeftTab = (tab) => {
    leftTab = tab;
    updateLeftPanelWidth();
    exploreVariate = tab === 'Discovery' ? 'Problem' : 'Univariate';
};

export let summary = {data: []};

/** needs doc */
function varSummary(d) {
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

export let popoverContent = d => {
    if(swandive)
        return;
    let text = '<table class="table table-sm table-striped" style="margin:-10px;"><tbody>';
    let [rint, prec] = [d3.format('r'), (val, int) => (+val).toPrecision(int).toString()];
    let div = (field, name, val) => {
        if (field != 'NA') text += `<tr><th>${name}</th><td><p class="text-left" style="height:10px;">${val || field}</p></td></tr>`;
    };
    d.labl != '' && div(d.labl, 'Label');
    div(d.mean, 'Mean', priv && d.meanCI ?
        `${prec(d.mean, 2)} (${prec(d.meanCI.lowerBound, 2)} - ${prec(d.meanCI.upperBound, 2)})` :
        prec(d.mean, 4));
    div(d.median, 'Median', prec(d.median, 4));
    div(d.mode, 'Most Freq');
    div(d.freqmode, 'Occurrences',  rint(d.freqmode));
    div(d.mid, 'Median Freq');
    div(d.freqmid, 'Occurrences', rint(d.freqmid));
    div(d.fewest, 'Least Freq');
    div(d.freqfewest, 'Occurrences', rint(d.freqfewest));
    div(d.sd, 'Stand Dev', prec(d.sd, 4));
    div(d.max, 'Maximum', prec(d.max, 4));
    div(d.min, 'Minimum', prec(d.min, 4));
    div(d.invalid, 'Invalid', rint(d.invalid));
    div(d.valid, 'Valid', rint(d.valid));
    div(d.uniques, 'Uniques', rint(d.uniques));
    div(d.herfindahl, 'Herfindahl', prec(d.herfindahl, 4));
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
export let hexToRgba = hex => {
    let int = parseInt(hex.replace('#', ''), 16);
    return `rgba(${[(int >> 16) & 255, (int >> 8) & 255, int & 255, '0.5'].join(',')})`;
};

/**
   takes node and color and updates zparams
*/
export function setColors(n, c) {
    if (n.strokeWidth == '1') {
        if (c == gr1Color){
            var tempindex = zparams.zgroup1.indexOf(n.name);
            if (tempindex > -1){
                n.group1 = false;
                del(zparams.zgroup1, tempindex);
            } else {
                n.group1 = true;
                zparams.zgroup1.push(n.name);
            };
        } else if (c == gr2Color){
            var tempindex = zparams.zgroup2.indexOf(n.name);
            if (tempindex > -1){
                n.group2 = false;
                del(zparams.zgroup2, tempindex);
            } else {
                n.group2 = true;
                zparams.zgroup2.push(n.name);
            };
        } else {
        // adding time, cs, dv, nom to node with no stroke
        n.strokeWidth = '4';
        n.strokeColor = c;
        n.nodeCol = taggedColor;
        let push = ([color, key]) => {
            if (color != c)
                return;
            zparams[key] = Array.isArray(zparams[key]) ? zparams[key] : [];
            zparams[key].push(n.name);
            if (key == 'znom') {
                findNodeIndex(n.name, true).nature = "nominal";
                transform(n.name, t = null, typeTransform = true);
            }
            if (key == 'zdv'){                                              // remove group memberships from dv's
                if(n.group1){
                    n.group1 = false;
                    del(zparams.zgroup1, -1, n.name);
                };
                if(n.group2){
                    n.group2 = false;
                    del(zparams.zgroup2, -1, n.name);
                };
            }
        };
        [[dvColor, 'zdv'], [csColor, 'zcross'], [timeColor, 'ztime'], [nomColor, 'znom']].forEach(push);
        }
    } else if (n.strokeWidth == '4') {
        if (c == n.strokeColor) { // deselecting time, cs, dv, nom
            n.strokeWidth = '1';
            n.strokeColor = selVarColor;
            n.nodeCol = colors(n.id);
            zparamsReset(n.name);
            if (nomColor == c && zparams.znom.includes(n.name)) {
                findNodeIndex(n.name, true).nature = findNodeIndex(n.name, true).defaultNature;
                transform(n.name, t = null, typeTransform = true);
            }
        } else { // deselecting time, cs, dv, nom AND changing it to time, cs, dv, nom
            zparamsReset(n.name);
            if (nomColor == n.strokeColor && zparams.znom.includes(n.name)) {
                findNodeIndex(n.name, true).nature = findNodeIndex(n.name, true).defaultNature;
                transform(n.name, t = null, typeTransform = true);
            }
            n.strokeColor = c;
            if (dvColor == c){
                var dvname = n.name;
                zparams.zdv.push(dvname);
                if(n.group1){ // remove group memberships from dv's
                    ngroup1 = false;
                    del(zparams.zgroup1, -1, dvname);
                };
                if(n.group2){
                    ngroup2 = false;
                    del(zparams.zgroup2, -1, dvname);
                };
            }
            else if (csColor == c) zparams.zcross.push(n.name);
            else if (timeColor == c) zparams.ztime.push(n.name);
            else if (nomColor == c) {
                zparams.znom.push(n.name);
                findNodeIndex(n.name, true).nature = "nominal";
                transform(n.name, t = null, typeTransform = true);
            }
        }
    }
}

/** needs doc */
export function borderState() {
    let set = (id, param, attrs) => {
        let el = byId(id);
        if (!el) {
            return;
        }

        zparams[param].length > 0 ?
            Object.entries(attrs).forEach(([x, y]) => el.querySelector('.rectColor svg circle').setAttribute(x, y)) :
            el.style['border-color'] = '#ccc';
    };
    set('dvButton', 'zdv', {stroke: dvColor});
    set('csButton','zcross', {stroke: csColor});
    set('timeButton','ztime', {stroke: timeColor});
    set('nomButton','znom', {stroke: nomColor});
    set('gr1Button','zgroup1', {stroke: gr1Color, fill: gr1Color, 'fill-opacity': 0.6, 'stroke-opacity': 0});
    set('gr2Button','zgroup2', {stroke: gr2Color, fill: gr2Color, 'fill-opacity': 0.6, 'stroke-opacity': 0});
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
        setModal("Your selected pipeline has been submitted.", "Task Complete", true, false, false, location.reload);
    //}
}

/**
    rpc DeletePipelines(PipelineDeleteRequest) returns (PipelineListResult) {}
    pipes is an array of pipeline IDs
*/
export function deletepipelines(pipes) {
    let res = makeRequest(D3M_SVC_URL + '/DeletePipelines', {context: apiSession(zparams.zsessionid), deletePipelineIds: pipes});
    if (!res) {
        return;
    }
}

/**
    rpc DeletePipelines(PipelineDeleteRequest) returns (PipelineListResult) {}
    pipes is an array of pipeline IDs
*/
export function cancelpipelines(pipes) {
    let res = makeRequest(D3M_SVC_URL + '/CancelPipelines', {context: apiSession(zparams.zsessionid), cancelPipelineIds: pipes});
    if (!res) {
        return;
    }
}

/**
   rpc ListPipelines(PipelineListRequest) returns (PipelineListResult) {}
   pipes is an array of pipeline IDs
*/
export async function listpipelines() {
    let res = await makeRequest(D3M_SVC_URL + '/listpipelines', {context: apiSession(zparams.zsessionid)});
    if (!res) {
        return [];
    }
    let pipes = res.pipelineIds;
    return pipes;
}

/**
   rpc ExecutePipeline(PipelineExecuteRequest) returns (stream PipelineExecuteResult) {}
*/
export async function executepipeline() {
    if (!selectedPipeline) {
        alert("Please select a pipeline to execute on.");
        return;
    }

    zPop();
    zparams.callHistory = callHistory;

    let data = [];

    //this will just set zparams.zsetx to the mean, which is default for setx plots
    //note that if setxplot is modified, it will NOT == "" because zparams.zsetx is modified when the setx plot slider is moved for the first time
    for(let i =0; i<zparams.zvars.length; i++) {
        let mydata = [];
        mydata[0] = zparams.zvars[i];
        let mymean = allNodes[findNodeIndex(zparams.zvars[i])].mean;
        if(zparams.zsetx[i][0]=="") {
            mydata[1]=mymean;
        } else if(zparams.zsetx[i][0]!=mymean){
            mydata[1]=zparams.zsetx[i][0];
        }
        if(zparams.zsetx[i][1]=="") {
            mydata[2]=allNodes[findNodeIndex(zparams.zvars[i])].mean;
        } else if(zparams.zsetx[i][1]!=mymean){
            mydata[2]=zparams.zsetx[i][1];
        }
        data.push(mydata);
    }

    let context = apiSession(zparams.zsessionid);
    let temp = JSON.stringify({context, selectedPipeline, data});
    console.log(temp);
    let res = await makeRequest(D3M_SVC_URL + '/ExecutePipeline', {context, selectedPipeline, data});
    // I think we want to do this here, but will wait for ISI image to test against
    // if(res.progressInfo=="COMPLETED") {
    res && addPredictions(res);
    // }
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

    console.log("Plotting Results");
    console.log(pid);                  // This is passed argument
    console.log(selectedPipeline);     // This is global

    let pipelineInfo = allPipelineInfo[pid];

    if (!('predictedValues' in pipelineInfo)){
        // Need to generate and store predicted values
        let finalFittedId, finalFittedDetailsUrl, produceDetailsUrl, finalProduceDetailsUrl, hold3;
        let res8, res55, res56, res58, res59;

        let chosenSolutionId = allPipelineInfo[selectedPipeline].response.solutionId;
        let res5 = await makeRequest(D3M_SVC_URL + '/FitSolution', CreateFitDefinition(chosenSolutionId));
        let fittedId = res5.data.requestId;
        let res6 = await makeRequest(D3M_SVC_URL + `/GetFitSolutionResults`, {requestId: fittedId});
        let fittedDetailsUrl = res6.data.details_url;
        let fittingfinished = false;                     // Flag for whether we have a fitted solution available yet to produce predicted values from.
        let fittingIntervalId = setInterval(async function() {

            // First get fitted solution
            if(!fittingfinished){
                let res7 = await updateRequest(fittedDetailsUrl);
                if(typeof res7.data.is_finished != 'undefined'){
                    if(res7.data.is_finished){
                        finalFittedDetailsUrl = res7.data.responses.list[0].details_url;
                        res8 = await updateRequest(finalFittedDetailsUrl);
                        finalFittedId = res8.data.response.fittedSolutionId;
                        console.log(finalFittedId);
                        res55 = await makeRequest(D3M_SVC_URL + '/ProduceSolution', CreateProduceDefinition(finalFittedId));
                        console.log("--Finished Fitting");
                        console.log(res55);
                        let produceId = res55.data.requestId;
                        res56 = await makeRequest(D3M_SVC_URL + `/GetProduceSolutionResults`, {requestId: produceId});
                        console.log("--Get Produce");
                        console.log(res56);
                        produceDetailsUrl = res56.data.details_url;
                        fittingfinished = true;
                    };
                };
            };

            // Then produce predicted values from fitted solution
            if(fittingfinished){
                let res57 = await updateRequest(produceDetailsUrl);
                if(typeof res57.data.is_finished != 'undefined'){
                    if(res57.data.is_finished){
                        finalProduceDetailsUrl = res57.data.responses.list[0].details_url;
                        res58 = await updateRequest(finalProduceDetailsUrl);
                        console.log("--Long Awaited Predictions:");
                        let hold = res58.data.response.exposedOutputs;
                        let hold2 = hold[Object.keys(hold)[0]];  // There's an issue getting ."outputs.0".csvUri directly.
                        hold3 = hold2.csvUri;
                        console.log(hold3);
                        res59 = await makeRequest(D3M_SVC_URL + `/retrieve-output-data`, {data_pointer: hold3});
                        console.log(res59);

                        allPipelineInfo[pid].predictedValues = res59;

                        clearInterval(fittingIntervalId);

                        resultsplotgraph(pid);
                    };
                };
            };
        }, 100);

    } else {
        // Predicted values already stored and ready for graphing
        console.log("Skipping creating predicted values");
        resultsplotgraph(pid);
    }; 

};

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
        console.log("resid plot");
        let xdata = "Actual";
        let ydata = "Predicted";
        scatter(dvvalues, predvals, xdata, ydata);
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

    var margin = {top: 30, right: 35, bottom: 0, left: leftmarginguess};    // Left margin needs not to be hardcoded, but responsive to maximum label length


    function Matrix(options) {

        let width = options.width,
        height = options.height,
        data = options.data,
        container = options.container,
        labelsData = options.labels,
        startColor = options.start_color,
        endColor = options.end_color,
        xOffset = options.x_offset;

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

        let key = d3.select("#confusionlegend")
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

        key.append("rect")
        .attr("width", widthLegend/2-10)
        .attr("height", height)
        .style("fill", "url(#gradient)")
        .attr("transform", "translate(0," + margin.top + ")");

        svg.append("text")
        .attr("transform", "translate(" + (width / 2) + " ," + (0 - 10) + ")")
        .style("text-anchor", "middle")
        .text("Actual Class");

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
            .attr("transform", "translate(25," + margin.top + ")")    // first number is separation between legend scale and legend key
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
           container : '#confusioncontainer',
           data      : matrixdata,
           labels    : classes,
           start_color : '#ffffff',
           end_color : '#e67e22',
           width : ((mainwidth-50)*.7) - 100 - leftmarginguess -30,//     // Width of confusion matrix table: Beginning of this is #confusioncontainer.width, but this div doesn't always exist yet
           height : mainheight * .6,    // Need to not be hard coded
           widthLegend : mainwidth*.04,
           x_offset : 30
           });

    // not rendering this table for right now, left all the code in place though. maybe we use it eventually
    // var table = tabulate(computedData, ["F1", "PRECISION","RECALL","ACCURACY"]);
}


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
    let finalFittedId, finalFittedDetailsUrl;
    let res, res8;

    let res5 = await makeRequest(D3M_SVC_URL + '/FitSolution', CreateFitDefinition(pipelineId));
    let fittedId = res5.data.requestId;
    let res6 = await makeRequest(D3M_SVC_URL + `/GetFitSolutionResults`, {requestId: fittedId});
    let fittedDetailsUrl = res6.data.details_url;
    let fittingIntervalId = setInterval(async function() {
        let res7 = await updateRequest(fittedDetailsUrl);   // check
        if(typeof res7.data.is_finished != 'undefined'){
            if(res7.data.is_finished){
                finalFittedDetailsUrl = res7.data.responses.list[0].details_url;
                res8 = await updateRequest(finalFittedDetailsUrl);
                finalFittedId = res8.data.response.fittedSolutionId;
                console.log(finalFittedId);
                res = await makeRequest(D3M_SVC_URL + '/SolutionExport', {fittedSolutionId: finalFittedId, rank: 0.5})

                // we need standardized status messages...
                let mystatus = res.status;
                console.log(res);
                if (typeof mystatus !== 'undefined') {
                if(mystatus.code=="FAILED_PRECONDITION") {
                    console.log("TA2 has not written the executable.");    // was alert(), but testing on NIST infrastructure suggests these are getting written but triggering alert.
                }
                else {
                    console.log(`Executable for solution ${pipelineId} with fittedsolution ${finalFittedId} has been written`);
                }}
                clearInterval(fittingIntervalId);
            };
        };
    }, 500);
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

    // console.log("entering disco");
    let extract = preprocess_file.dataset.discovery;
    // console.log(extract);
    let disco = [];
    let names = [];
    let vars = Object.keys(preprocess);
    for (let i = 0; i < extract.length; i++) {
        names[i] = "Problem" + (i + 1);
        let current_target = extract[i]["target"];
        let current_transform = extract[i]["transform"];
        let current_subsetObs = extract[i]["subsetObs"];
        let current_subsetFeats = extract[i]["subsetFeats"];
        let j = findNodeIndex(current_target);
        let node = allNodes[j];
        let current_predictors = extract[i]["predictors"];
        let current_task = node.plottype === "bar" ? 'classification' : 'regression';
        let current_rating = 3;
        let current_description = "";
        if(current_transform != 0){
            current_description = "The combination of " + current_transform.split('=')[1] + " is predicted by " + current_predictors.join(" and ");
        } else if (current_subsetObs != 0){
            current_description = current_target + " is predicted by " + current_predictors.join(" and ") + " whenever " + current_subsetObs;
        } else {
            current_description = current_target + " is predicted by " + current_predictors.join(" and ");
        };
        let current_metric = node.plottype === "bar" ? 'f1Macro' : 'meanSquaredError';
        let current_id = "problem" + (i+1);
        let current_disco = {problem_id: current_id, system: "auto", meaningful: "no", target: current_target, predictors: current_predictors, transform: current_transform, subsetObs: current_subsetObs, subsetFeats: current_subsetFeats, task: current_task, rating: current_rating, description: current_description, metric: current_metric, };
        //jQuery.extend(true, current_disco, names);
        disco[i] = current_disco;
    };
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
    return disco;
}


export let selectedProblem;
export function setSelectedProblem(prob) {selectedProblem = prob;}

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
        // build up the required .csv file line by line
        outputCSV = outputCSV + disco[i].problem_id + ", \"" + disco[i].system + "\", \"" + disco[i].meaningful + "\"\n";

        // construct and write out the api call and problem description for each discovered problem
        let problemApiCall = CreatePipelineDefinition(disco[i].predictors, [disco[i].target], 10, disco[i]);
        let problemProblemSchema = CreateProblemSchema(disco[i]);
        let filename_api = disco[i].problem_id + '/ss_api.json';  
        let filename_ps = disco[i].problem_id + '/schema.json';   
        let res1 = await makeRequest(D3M_SVC_URL + '/store-user-problem', {filename: filename_api, data: problemApiCall } );
        let res2 = await makeRequest(D3M_SVC_URL + '/store-user-problem', {filename: filename_ps, data: problemProblemSchema } );
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
    trigger("btnVariables", 'click');
}

export function saveDisc() {
    let problem = disco.find(problem => problem.problem_id === selectedProblem);
    problem.description = document.getElementById("discoveryInput").value;
    console.log(problem);
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
    allsearchId = [];
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
    console.log(aux);
    // aux.transform, aux.subsetFeats, aux.Obs are all by default 0. if not 0, which is set in preprocess, then steps should build the corresponding primitive call.
    let inputs = [];
    let outputs = [];
    let steps = [];
    return {inputs:inputs,outputs:outputs,steps:steps};
    
    // example inputs:
    /*
        "inputs": [
        {
            "name": "dataset"
        }
        ]
    */
    // example outputs:
    /*
        "outputs": [
        {
            "name": "dataset",
            "data": "step.0.produce"
        }
        ]
    */
    // example steps:
    /*
        "steps": [
                {
                    "primitive": {
                        "primitive": {
                            "id": "id",
                            "version": "version",
                            "pythonPath": "python_path",
                            "name": "name",
                            "digest": "optional--some locally registered primitives might not have it"
                        },
                        "arguments": {
                            "arg1": {
                                "container": {
                                    "data": "data reference"
                                }
                            }},
                        "outputs": [
                            {
                                "id": "id for data ref"
                            }
                        ],
                        "hyperparams": {
                            "param 1": {
                                "container": {
                                    "data": "data reference"
                                }
                            }
                        }
                    }
                }
            ]
    */
}





