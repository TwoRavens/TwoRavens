/*
  Main TwoRavens mithril app
*/
import hopscotch from 'hopscotch';
import m from 'mithril';
import * as d3 from 'd3';

import * as common from "../common/common";

import {locationReload, setModal} from '../common/views/Modal';

import * as queryMongo from "./manipulations/queryMongo";
import * as solverD3M from './solvers/d3m';
import * as solverWrapped from './solvers/wrapped';

import * as model from './modes/model';
import * as manipulate from './manipulations/manipulate';
import * as results from "./modes/results";
import * as explore from './modes/explore';
import * as utils from "./utils";

import {setDatamartDefaults} from "./datamart/Datamart";
import Subpanel from "../common/views/Subpanel";
import {
    buildDefaultProblem,
    buildEmptyProblem,
    generateProblemID,
    getAbstractPipeline,
    getCategoricalVariables,
    getPredictorVariables,
    getProblemCopy,
    getSelectedProblem, getTargetGroups, getTargetVariables,
    needsManipulationRewritePriorToSolve,
    setSelectedProblem,
    standardizeDiscovery
} from "./problem";
import {setMetadata} from "./eventdata/eventdata";

/**
 * @typedef {Object} Workspace
 * @member {string} name
 * @member {RavenConfig} raven_config
 * @member {object} d3m_config
 * @member {object} datasetDoc - dataset doc of the un-manipulated dataset
 * @member {string} datasetPath - path to the un-manipulated dataset
 */

/** @type {Workspace} */
export let workspace;

/**
 * @typedef {Object} RavenConfig
 * @member {object.<string, Problem>} problems
 * @member {string} selectedProblem - problemId of selected problem
 * @member {number} problemCount - monotonically increasing count of number of problems, used to assign problem ids to new problems
 * @member {ManipulationStep[]} hardManipulations - manipulations to apply to the base dataset
 * @member {string[]} variablesInitial - variables in the original dataset. Manipulations are closed under these starting variables
 * @member {object.<string, Problem>} problems
 * @member {object} datasetSummariesDiffs - user-specified values to merge into the dataset summary
 * @member {object} variableSummariesDiffs - user-specified values to merge into the variable summary
 */


//-------------------------------------------------
// NOTE: global variables are now set in the index.html file.
//    Developers, see /template/index.html
//-------------------------------------------------

let RAVEN_CONFIG_VERSION = 1;
export let TOGGLER_UI = false;

export let TA2DebugMode = false;
export let debugLog = TA2DebugMode ? console.log : _ => _;
export let defaultMaxRecordCount = 10000;
export let preprocessSampleSize = 5000;

window.addEventListener('resize', m.redraw);

export let colors = {
    // groups
    predictor: '#14bdcc',
    target: '#79af4f',
    crossSection: '#fda760', // should be similar to categorical
    order: '#2d6ca2',
    location: '#419641',

    // labels
    time: '#2d6ca2', // should be similar/same to orderColor
    categorical: '#ff6600',
    ordinal: '#ffb700', // should be similar to categorical
    weight: '#cb5a94',
    boundary: '#d23e3e', // similar to bounding box color?
    privileged: '#996bcc', // royalty?
    exogenous: '#4fc48c',
    // TODO: these two are not original colors
    featurize: '#d23e3e',
    randomize: '#996bcc',
    geographic: '#419641',

    index: '#797478',
    matched: '#330b0b',
}
// set the css variables to match
Object.entries(colors).forEach(([name, color]) =>
    document.documentElement.style.setProperty(`--tag-${name}`, color))

// ~~~~~ PEEK ~~~~~
// for the second-window data preview
window.addEventListener('storage', (e) => {
    if (e.key !== 'peekMore' + peekId || peekIsLoading) return;
    if (localStorage.getItem('peekMore' + peekId) !== 'true' || peekIsExhausted) return;
    localStorage.setItem('peekMore' + peekId, 'false');
    updatePeek(getAbstractPipeline(!isDatasetMode && getSelectedProblem()));
});

// for the draggable within-window data preview
window.addEventListener('mousemove', (e) => peekMouseMove(e));  // please don't remove the anonymous wrapper
window.addEventListener('mouseup', (e) => peekMouseUp(e));

export let peekMouseMove = (e) => {
    if (!peekInlineIsResizing) return;

    let menuId = isDatasetMode || (rightTab === 'Manipulate' && manipulate.constraintMenu) ? 'canvas' : 'main';
    let percent = (1 - e.clientY / utils.byId(menuId).clientHeight) * 100;

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
export let peekLabel = '';

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
    if (peekInlineShown) {
        logEntryPeekUsed();
    }
};

/**
 *  Log when Peek is used.
 *    set 'is_external' to True if a new window is opened
 */
export let logEntryPeekUsed = is_external => {

    let logParams = {
        feature_id: 'PEEK',
        activity_l1: 'DATA_PREPARATION',
        activity_l2: 'DATA_EXPLORATION'
    };
    if (is_external) {
        logParams.feature_id = 'PEEK_NEW_WINDOW';
    }
    saveSystemLogEntry(logParams);
};

export async function resetPeek(pipeline) {
    peekData = undefined;
    peekSkip = 0;
    peekIsExhausted = false;
    localStorage.setItem('peekTableHeaders' + peekId, JSON.stringify([]));
    localStorage.setItem('peekTableData' + peekId, JSON.stringify([]));

    if (pipeline) await updatePeek(pipeline);
}

export async function updatePeek(pipeline) {

    if (peekIsLoading || peekIsExhausted || pipeline === undefined)
        return;

    peekLabel = pipeline && manipulate.constraintMenu
        ? 'Data at the current location in the manipulations pipeline.'
        : ({
            'model': 'Variables present in model after all manipulations.',
            'dataset': 'Entire dataset after hard manipulations.',
            'results': 'Variables present in model after all manipulations.',
            'explore': 'All data after all manipulations-- used in explore.',
        }[selectedMode]);

    peekIsLoading = true;
    let variables = [];

    let problem = getSelectedProblem();
    if (isModelMode || isResultsMode)
        variables = [...getPredictorVariables(problem), ...getTargetVariables(problem)];

    let previewMenu = {
        type: 'menu',
        metadata: {
            type: 'data',
            skip: peekSkip,
            limit: peekLimit,
            variables,
            categorical: !isDatasetMode && getCategoricalVariables(problem)
                .filter(variable => variables.includes(variable))
        }
    };

    // potentially pull data from a different dataset, if viewing data from a split
    let datasetDetails = {};
    if (isResultsMode) {
        let dataSplit = results.resultsPreferences.dataSplit;
        let splitPath = problem?.results?.datasetPaths?.[dataSplit];
        if (splitPath) {
            datasetDetails = {
                datafile: splitPath, // location of the dataset csv
                collection_name: `${workspace.d3m_config.name}_split_${utils.generateID(splitPath)}` // collection/dataset name
            }
            peekLabel = `Data from the ${dataSplit} split.`;
        }
    }

    let data = await manipulate.loadMenu(
        manipulate.constraintMenu
            ? pipeline.slice(0, pipeline.indexOf(manipulate.constraintMenu.step))
            : pipeline,
        previewMenu,
        {datasetDetails}
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
            out[entry] = utils.formatPrecision(record[entry]);
        else if (typeof record[entry] === 'string')
            out[entry] = `"${record[entry]}"`;
        else if (typeof record[entry] === 'boolean')
            out[entry] = m('div', {style: {'font-style': 'italic', display: 'inline'}}, String(record[entry]));
        else
            out[entry] = record[entry];
        return out;
    }, {}));

    peekData = (peekData || []).concat(data);

    localStorage.setItem('peekTableHeaders' + peekId, JSON.stringify(Object.keys(data[0])));
    localStorage.setItem('peekTableData' + peekId, JSON.stringify(peekData));
    localStorage.setItem('peekTableLabel' + peekId, peekLabel);

    // stop blocking new requests
    peekIsLoading = false;
    m.redraw();
}

export let downloadFile = async (datasetUrl, contentType) => {
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
window.alignmentData = alignmentData;

// ~~~~

export let taskPreferences = {
    isDiscoveryClicked: false,
    isSubmittingProblems: false,
    task1_finished: false,

    isResultsClicked: false,
    isSubmittingPipelines: false,
    task2_finished: false
};

export let selectedMode = 'model';
export let isModelMode = true;
export let isExploreMode = false;
export let isResultsMode = false;
export let isDatasetMode = false;

export function setSelectedMode(mode) {

    mode = mode ? mode.toLowerCase() : 'model';

    let previousMode = selectedMode;

    let selectedProblem = getSelectedProblem();
    if (!selectedProblem && mode === 'results') {
        return;
    }

    isDatasetMode = mode === 'dataset';
    isModelMode = mode === 'model';
    isExploreMode = mode === 'explore';
    isResultsMode = mode === 'results';


    // remove empty steps when leaving manipulate mode
    if (workspace && !isDatasetMode && previousMode === 'dataset') {
        let ravenConfig = workspace.raven_config;
        ravenConfig.hardManipulations = ravenConfig.hardManipulations.filter(step => {
            if (step.type === 'subset' && step.abstractQuery.length === 0) return false;
            if (step.type === 'aggregate' && step.measuresAccum.length === 0) return false;
            if (step.type === 'transform' && ['transforms', 'expansions', 'binnings', 'manual']
                .reduce((sum, val) => sum + step[val].length, 0) === 0) return false;
            return true;
        });
    }

    /*
     * Make an entry in the behavioral logs
     */
    let logParams = {
        feature_id: mode.toUpperCase() + '_MODE_SWITCH',
        activity_l2: 'SWITCH_MODE'
    };
    if (isModelMode) logParams.activity_l1 = 'PROBLEM_DEFINITION';
    if (isExploreMode) logParams.activity_l1 = 'DATA_PREPARATION';
    if (isResultsMode) logParams.activity_l1 = 'MODEL_SELECTION';
    if (isDatasetMode) logParams.activity_l1 = 'DATA_PREPARATION';

    saveSystemLogEntry(logParams);

    // remove the constraint menu if the mode bar is clicked while modifying constraints
    if (manipulate.constraintMenu) {
        manipulate.setConstraintMenu(undefined);
        updateRightPanelWidth();
        updateLeftPanelWidth();
        common.setPanelOpen('right');
    }

    if (selectedMode !== mode) {
        // ensures that non-editable problems are not selected
        if (!isExploreMode && previousMode === 'explore' && selectedProblem?.system === 'discovered') {
            let copiedProblem = getProblemCopy(selectedProblem);
            workspace.raven_config.problems[copiedProblem.problemId] = copiedProblem;
            setSelectedProblem(copiedProblem.problemId);
        }

        if (isResultsMode) {
            taskPreferences.isResultsClicked = true;

            // a solved problem, and its copy, are not pending

            selectedProblem.pending = false;

            let copiedProblem = getProblemCopy(selectedProblem);

            workspace.raven_config.problems[copiedProblem.problemId] = copiedProblem;

            // denote as solved problem
            selectedProblem.results = selectedProblem.results || {
                solutions: {},
                selectedSource: undefined,
                selectedSolutions: {},
                solverState: {}
            };

            if (!results.resultsPreferences.dataSplit)
                results.resultsPreferences.dataSplit = 'test';

            if (results.resultsPreferences.dataSplit !== 'all' && !selectedProblem.splitOptions.outOfSampleSplit)
                results.resultsPreferences.dataSplit = 'all';
        }

        if (!isDatasetMode && manipulate.pendingHardManipulation) {
            hopscotch.endTour(true);
            let ravenConfig = workspace.raven_config;
            let datasetQuery = JSON.stringify(queryMongo.buildPipeline([
                ...workspace.raven_config.hardManipulations,
                {type: 'menu', metadata: {type: 'data'}}
            ], workspace.raven_config.variablesInitial)['pipeline']);

            let preprocessPromise = loadPreprocess(datasetQuery)
                .then(setPreprocess)
                .then(m.redraw);

            loadDiscovery(datasetQuery).then(async discovery => {
                if (!discovery) return
                await preprocessPromise;
                ravenConfig.problems = standardizeDiscovery(discovery);

                let emptyProblemId = generateProblemID();
                ravenConfig.problems[emptyProblemId] = buildEmptyProblem(emptyProblemId);
                let problemCopy = getProblemCopy(Object.values(ravenConfig.problems)[0]);
                ravenConfig.problems[problemCopy.problemId] = problemCopy;
                setSelectedProblem(problemCopy.problemId);
            })
            manipulate.setPendingHardManipulation(false);
        }

        selectedMode = mode;
        m.route.set('/' + mode);
        updateRightPanelWidth();
        updateLeftPanelWidth();
        m.redraw()
    }

    // cause the peek table to redraw
    resetPeek();
}


export async function buildCsvPath(problem, lastStep, dataPath, collectionName) {

    let abstractPipeline = getAbstractPipeline(problem);
    // manipulations menus visualize data within the pipeline
    if (lastStep) abstractPipeline = abstractPipeline
        .slice(0, abstractPipeline.indexOf(lastStep));

    // compile the abstract pipeline to a mongo query
    let compiled = queryMongo.buildPipeline(abstractPipeline, workspace.raven_config.variablesInitial)['pipeline'];
    let body = {
        method: 'aggregate',
        query: JSON.stringify(compiled),
        export: 'csv',
        comment: 'exporting problem to CSV'
    };

    if (dataPath) body.datafile = dataPath;
    if (collectionName) body.collection_name = collectionName;
    return getData(body);
}

// get a path to a dataset that has had manipulations and tags applied
export async function buildDatasetPath(problem, lastStep, dataPath, collectionName, dataSchema) {
    if (!dataSchema) dataSchema = workspace.datasetDoc;

    let abstractPipeline = getAbstractPipeline(problem);
    // manipulations menus visualize data within the pipeline
    if (lastStep) abstractPipeline = abstractPipeline
        .slice(0, abstractPipeline.indexOf(lastStep));

    // compile the abstract pipeline to a mongo query
    let compiled = queryMongo.buildPipeline(abstractPipeline, workspace.raven_config.variablesInitial)['pipeline'];
    // translate the semantic metadata in the original dataset doc through all queries
    let newDatasetSchema = queryMongo.translateDatasetDoc(compiled, dataSchema, problem);

    let body = {
        method: 'aggregate',
        query: JSON.stringify(compiled),
        export: 'dataset',
        metadata: JSON.stringify(newDatasetSchema),
        comment: 'exporting problem to D3M dataset'
    };

    if (dataPath) body.datafile = dataPath;
    if (collectionName) body.collection_name = collectionName;
    return getData(body);
}


/**
 *  Send mongo query params to server and retrieve data
 *
 */
export let getData = async body => m.request({
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
            if (obj === '***TWORAVENS_NEGATIVE_INFINITY***') return -Infinity;
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
        body: logData
    })
        .then(function (save_result) {
            if (save_result.success) {
                // console.log('log entry saved');
            } else {
                console.log('log entry FAILED: ' + save_result.message);
            }
        })
};

export let k = 4; // strength parameter for group attraction/repulsion
export let tutorial_mode = localStorage.getItem('tutorial_mode') !== 'false';

export let LEFT_TAB_NAME_VARIABLES = 'Variables';
export let LEFT_TAB_NAME_DISCOVER = 'Discover';

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
    setFocusedPanel('left');

    if (tabName === LEFT_TAB_NAME_DISCOVER && !taskPreferences.task1_finished && tutorial_mode)
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
    if (isDatasetMode || isExploreMode || isResultsMode)
        common.panelOcclusion.right = '0px';
    // else if (isModelMode && !selectedProblem) common.panelOcclusion.right = common.panelMargin;
    else if (common.panelOpen['right']) {
        let tempWidth = {
            'model': model.rightPanelWidths[rightTab],
        }[selectedMode];

        panelWidth['right'] = `calc(${common.panelMargin}*2 + ${tempWidth})`;
    } else panelWidth['right'] = `calc(${common.panelMargin}*2 + 16px)`;
};
export let updateLeftPanelWidth = () => {
    if (isExploreMode)
        common.panelOcclusion.left = '0px';
    else if (isDatasetMode && !manipulate.constraintMenu) common.panelOcclusion.left = '0px';
    else if (common.panelOpen['left'])
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
export let wsLink = `${WEBSOCKET_PREFIX}${window.location.host}/ws/connect/${username}/`;

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

// For EventData, do not connect websockets (at least not yet)
//
if (!IS_EVENTDATA_DOMAIN) {
    document.addEventListener("DOMContentLoaded", connectWebsocket);
}

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

        else if (msg_data.data === undefined && ![
            "ENDGetSearchSolutionsResults",
            'DATAMART_MATERIALIZE_PROCESS',
            'DATAMART_AUGMENT_PROCESS',
            'DATAMART_SEARCH_BY_DATASET'
        ].includes(msg_data.msg_type)) {

            debugLog('streamSocket.onmessage: Error, "msg_data.data" type not specified!');
            debugLog('full data: ' + JSON.stringify(msg_data));
            debugLog('---------------------------------------------');
        } else if (msg_data.msg_type === 'GetSearchSolutionsResults') {
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
            solverD3M.handleGetFitSolutionResultsResponse(msg_data.data);
        } else if (msg_data.msg_type === 'ENDGetSearchSolutionsResults') {
            debugLog(msg_data.msg_type + ' recognized!');
            solverD3M.handleENDGetSearchSolutionsResults(msg_data);
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
export let lockToggle = TOGGLER_UI;
export let setLockToggle = state => {
    if (state && selectedProblem.system === 'solved') hopscotch.startTour(lockTour());
    else {
        hopscotch.endTour(true);
        lockToggle = state;
    }
};
export let isLocked = problem => lockToggle || problem.system === 'solved';

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
    // console.trace('warning: ', value);
};
export let alertError = (value, shown) => {
    alerts.push({type: 'error', time: new Date(), description: value});
    showModalAlerts = shown !== false; // Default is 'true'
    // console.trace('error: ', value);
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

export let showModalProblems = false;
export let setShowModalProblems = state => showModalProblems = state;

// menu state within datamart component
export let datamartPreferences = {
    // default state for query
    query: {
        keywords: []
    },
    // potential new indices to submit to datamart (used when uploading a dataset to datamart)
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

window.datamartPreferences = datamartPreferences;

if (DISPLAY_DATAMART_UI) setDatamartDefaults(datamartPreferences);

/**
 * metrics, tasks, and subtasks as specified in D3M schemas
 * @enum {string}
 */
export let d3mTaskType = {
    classification: "CLASSIFICATION",
    regression: "REGRESSION",
    clustering: "CLUSTERING",
    linkPrediction: "LINK_PREDICTION",
    vertexNomination: "VERTEX_NOMINATION",
    vertexClassification: "VERTEX_CLASSIFICATION",
    communityDetection: "COMMUNITY_DETECTION",
    graphMatching: "GRAPH_MATCHING",
    forecasting: "FORECASTING",
    collaborativeFiltering: "COLLABORATIVE_FILTERING",
    objectDetection: "OBJECT_DETECTION"
};

/**
 * @enum {string}
 */
export let d3mSupervision = {
    semiSupervised: "SEMI_SUPERVISED",
    unsupervised: "UNSUPERVISED",
};

/**
 * @enum {string}
 */
export let d3mResourceType = {
    tabular: "TABULAR",
    relational: "RELATIONAL",
    image: "IMAGE",
    audio: "AUDIO",
    video: "VIDEO",
    speech: "SPEECH",
    text: "TEXT",
    graph: "GRAPH",
    multiGraph: "MULTI_GRAPH",
    timeSeries: "TIME_SERIES",
};

/**
 * @enum {string}
 */
export let d3mTags = {
    grouped: "GROUPED",
    geospatial: "GEOSPATIAL",
    remoteSensing: "REMOTE_SENSING",
    lupi: "LUPI",
    missingMetadata: "MISSING_METADATA"
};

export let keywordDefinitions = {
    "semiSupervised": "semiSupervised learning task",
    "unsupervised": "unsupervised learning task - no labeled dataset",

    "binary": "binary classification task",
    "multiClass": "multi-class classification task",
    "multiLabel": "multi-label classification task",

    "univariate": "applied to \"regression\" task with a single response variable",
    "multivariate": "applied to \"regression\" task with more than one response variables",

    "overlapping": "applied to \"communityDetection\" problems to indicate overlapping communites: multiple community memberships for nodes",
    "nonOverlapping": "applied to \"communityDetection\" problems to indicate disjoint communites: single community memberships for nodes",

    "tabular": "indicates data is tabular",
    "relational": "indicates data is a relational database",
    "image": "indicates data consists of raw images",
    "audio": "indicates data consists of raw audio",
    "video": "indicates data consists of raw video",
    "speech": "indicates human speech data",
    "text": "indicates data consists of raw text",
    "graph": "indicates data consists of graphs",
    "multiGraph": "indicates data consists of multigraphs",
    "timeSeries": "indicates data consists of time series",

    "grouped": "applied to time series data (or tabular data in general) to indicate that some columns should be grouped",
    "geospatial": "indicates data contains geospatial information",
    "remoteSensing": "indicates data contains remote-sensing data",
    "lupi": "indicates the presence of privileged features: lupi",
    "missingMetadata": "indicates that the metadata for dataset is not complete"
};

/**
 * @enum {string}
 */
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

// MEAN SQUARED ERROR IS SET TO SAME AS RMSE. MSE is in schema but not proto
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
    objectDetectionAP: "OBJECT_DETECTION_AVERAGE_PRECISION",
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
        univariate: ['meanSquaredError', 'rootMeanSquaredError', 'rSquared', 'meanAbsoluteError'],
        multivariate: ['meanSquaredError', 'rootMeanSquaredError', 'rSquared', 'meanAbsoluteError']
    },
    forecasting: {
        subTypeNone: ['meanSquaredError', 'rootMeanSquaredError', 'meanAbsoluteError']
    },
    clustering: {
        subTypeNone: ["meanSquaredError", "rootMeanSquaredError", "meanAbsoluteError", "jaccardSimilarityScore"]
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
        overlapping: ['normalizedMutualInformation'],
        nonOverlapping: ['normalizedMutualInformation']
    },
    graphMatching: {
        subTypeNone: ['accuracy', 'jaccardSimilarityScore']
    },
    collaborativeFiltering: {
        subTypeNone: ['meanAbsoluteError', 'meanSquaredError', 'rootMeanSquaredError', 'rSquared']
    },
    objectDetection: {
        subTypeNone: ['objectDetectionAveragePrecision']
    }
};

// first format is the one stored in the geoJSON file
export let locationUnits = {
    'latitude': ['decimal'], // ['sexagesimal', 'minutes']
    'longitude': ['decimal'],
    'country': ["ISO-3", "ICEWS", "UN M.49", "cowcode", "gwcode", "gtdcode", "ISO-2"],
    'US_state': ['US_state_name', 'USPS'],
    'DE_state': ['DE_state_name', 'id'],
    'Dallas_City_Limits': ['CITY'],
    'Dallas_Current_Council_Districts': ['COUNCIL'],
    'Dallas_Targeted_Area_Action_Grids': ['TAAG_Name'],
    'Texas_Zip_Codes': ['ZCTA5CE10']
}

let standardWrappedSolvers = ['tpot', 'auto_sklearn', 'ludwig', 'h2o', 'TwoRavens']; // 'mlbox', 'caret', 'mljar-supervised'

export let applicableSolvers = {
    classification: {
        binary: ['mljar-supervised', ...standardWrappedSolvers],
        multiClass: standardWrappedSolvers,
        multiLabel: standardWrappedSolvers
    },
    regression: {
        univariate: standardWrappedSolvers,
        multivariate: standardWrappedSolvers
    },
    forecasting: {
        subTypeNone: ['TwoRavens']
    },
    clustering: {subTypeNone: []},
    linkPrediction: {subTypeNone: []},
    vertexNomination: {subTypeNone: [], binary: []},
    vertexClassification: {multiClass: [], multiLabel: []},
    communityDetection: {overlapping: [], nonOverlapping: []},
    graphMatching: {subTypeNone: []},
    collaborativeFiltering: {subTypeNone: []},
    objectDetection: {subTypeNone: []}
};
export const reset = async function reloadPage() {
    solverD3M.endAllSearches();
    location.reload();
};

export let step = (target, placement, title, content, options = {}) => Object.assign({
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
    i18n: {doneBtn: 'Ok'},
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
            `We are trying to predict ${getTargetVariables(getSelectedProblem()).join(', ')}.
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
    i18n: {doneBtn: 'Ok'},
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
    i18n: {doneBtn: 'Ok'},
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

export let getCurrentWorkspaceName = () => workspace?.name ?? '(no workspace name)'
export let getCurrentWorkspaceId = () => workspace?.user_workspace_id ?? '(no id)'

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
                m('p', 'Please try to ', utils.linkURLwithText(getClearWorkspacesLink(), 'Reset Workspaces'), ' or ', utils.linkURLwithText(switch_dataset_url, 'Load a Different Dataset')),
                //' or ', linkURLwithText(window.location.origin, 'Reload the Page')),
                m('hr'),
                m('p', utils.bold('Technical info. Error: '), datasetDocInfo.message),
                m('p', 'Url: ', utils.link(datasetDocLink))]),
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


const getClearWorkspacesLink = _ => {
    return window.location.origin + clear_user_workspaces_url;
    // '/user-workspaces/clear-user-workspaces';
}


/*
 * Clear workspace and return to the pebbles page
 */
const clearWorkpacesAndReloadPage = _ => {
    document.location = getClearWorkspacesLink();
    // return some_number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

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

let samplingCache = {id: {query: []}};

let setSamplingCacheId = query => {
    if (samplingCache?.id?.query === query)
        return

    samplingCache = {
        sampledDatasetPathPromise: undefined,
        preprocessPromise: undefined,
        variableSummariesPromise: undefined,
        datasetSummaryPromise: undefined,
        discoveryPromise: undefined,

        id: {
            query
        }
    };
}

let loadSampledDatasetPath = async query => {
    setSamplingCacheId(query);

    if (!samplingCache.sampledDatasetPathPromise) {
        samplingCache.sampledDatasetPathPromise = query.length > 0
            ? getData({
                method: 'aggregate', query,
                export: 'csv',
                comment: 'exporting sample of data to CSV for preprocess'
            })
            : Promise.resolve(workspace.raven_config.datasetPath)
    }
    return samplingCache.sampledDatasetPathPromise
}

let loadDiscovery = async query => {
    setSamplingCacheId(query);

    if (!samplingCache.discoveryPromise)
        samplingCache.discoveryPromise = loadSampledDatasetPath(query)
            .then(datasetPath => m.request(ROOK_SVC_URL + 'discovery.app', {
                method: 'POST',
                body: {path: datasetPath}
            }))
            .then(response => {
                if (!response.success) console.warn(response.message);
                else return response.data
            })
    return samplingCache.discoveryPromise
}

export let loadPreprocess = async query => {
    setSamplingCacheId(query);
    if (!samplingCache.preprocessPromise)
        samplingCache.preprocessPromise = loadSampledDatasetPath(query)
            .then(datasetPath => m.request(ROOK_SVC_URL + 'preprocess.app', {
                method: 'POST',
                body: {
                    data: datasetPath,
                    datastub: workspace.d3m_config.name,
                    l1_activity: 'PROBLEM_DEFINITION',
                    l2_activity: 'PROBLEM_SPECIFICATION'
                }
            }))
            .then(response => {
                if (!response.success) alertError(response.message);
                return response.data
            })

    return samplingCache.preprocessPromise
}

/**
 *
 * @param {Workspace} newWorkspace
 * @param awaitPreprocess
 * @returns {Promise<boolean>}
 */
export let loadWorkspace = async (newWorkspace, awaitPreprocess = false) => {

    workspace = newWorkspace;
    // useful for debugging
    window.workspace = workspace;

    d3.select("title").html("TwoRavens " + workspace.d3m_config.name);

    let newRavenConfig = workspace.raven_config === null;
    if (newRavenConfig) workspace.raven_config = {
        variableSummariesDiffs: {},
        datasetSummariesDiffs: {},
        // advancedMode: false,
        problemCount: 0, // used for generating new problem ID's
        ravenConfigVersion: RAVEN_CONFIG_VERSION,
        hardManipulations: [],
        problems: {}
    };

    let manipulations = [
        ...getAbstractPipeline(getSelectedProblem(), true),
        {type: 'menu', metadata: {type: 'data', sample: preprocessSampleSize}}
    ];

    let datasetQuery = JSON.stringify(queryMongo.buildPipeline(
        manipulations, workspace.raven_config.variablesInitial)['pipeline']);

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

            let learningResource = datasetDoc.dataResources
                .find(resource => resource.resID === 'learningData');
            if (!learningResource) return;

            if ('columns' in learningResource)
                workspace.raven_config.variablesInitial = learningResource.columns
                    .sort((a, b) => utils.omniSort(a.colIndex, b.colIndex))
                    .map(column => column.colName);
            // TODO: endpoint to retrieve column names if columns not present in datasetDoc
            else swandive = true;
        })
        .then(m.redraw);

    // MONGO LOAD / SAMPLE DATASET PATH
    let promiseSampledDatasetPath = Promise.all([promiseDatasetDoc, promiseDatasetPath])
        .then(() => loadSampledDatasetPath(datasetQuery));

    // PREPROCESS
    let promisePreprocess = promiseSampledDatasetPath
        .then(() => loadPreprocess(datasetQuery)) // first call to preprocess
        .then(setPreprocess)
        // pull worldModelers data in from datasetDoc if defined
        .then(() => {
            let learningDataResource = workspace.datasetDoc.dataResources
                .find(resource => resource.resID === "learningData");

            if (!learningDataResource) return;
            learningDataResource.columns
                .filter(columnSchema => columnSchema.worldModelers)
                .forEach(columnSchema => setVariableSummaryAttr(
                    columnSchema.colName, 'worldModelers', columnSchema.worldModelers))
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
        .then(() => loadDiscovery(datasetQuery))
        .then(async discovery => {
            if (!discovery) return;
            // merge discovery into problem set if constructing a new raven config
            // wait until after preprocess completes,
            //  so that discovered problems can have additional preprocess metadata attached
            await promisePreprocess;
            Object.assign(workspace.raven_config.problems, standardizeDiscovery(discovery))
            // promisePreprocess.then(() => );
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
            if (!response.success) {
                if (!newRavenConfig) {
                    window.selectedProblem = getSelectedProblem();
                    return;
                }
                // fallback for when preprocess and/or discovery is slow/broken

                if (Object.keys(workspace.raven_config.problems).length === 0) {
                    let problemId = 'base ' + generateProblemID();
                    workspace.raven_config.problems = {
                        [problemId]: buildEmptyProblem(problemId)
                    };
                }

                let problemFirst = Object.values(workspace.raven_config.problems)[0];
                let problemCopy = getProblemCopy(problemFirst);
                problemCopy.provenanceId = undefined;
                workspace.raven_config.problems[problemCopy.problemId] = problemCopy;
                // second call to preprocess
                setSelectedProblem(problemCopy.problemId);

                console.log('Task 1: Initiating');
                m.redraw();
                return;
            }

            console.log('Task 1: Complete, problemDoc loaded');

            taskPreferences.task1_finished = true;
            let problemDoc = response.data;
            datamartPreferences.hints = problemDoc.dataAugmentation;

            if (newRavenConfig) {
                await promisePreprocess;

                let defaultProblem = buildDefaultProblem(problemDoc);

                // add the default problems to the list of problems
                let problemCopy = getProblemCopy(defaultProblem);

                defaultProblem.defaultProblem = true;

                workspace.raven_config.problems[defaultProblem.problemId] = defaultProblem;
                workspace.raven_config.problems[problemCopy.problemId] = problemCopy;
                /**
                 * Note: mongodb data retrieval initiated here
                 *   setSelectedProblem -> loadMenu (manipulate.js) -> getData (manipulate.js)
                 */
                setSelectedProblem(problemCopy.problemId);
            } else if (!(workspace.raven_config.selectedProblem in workspace.raven_config.problems)) {
                await promiseDiscovery;
                setSelectedProblem(Object.keys(workspace.raven_config.problems)[0])
            }
        })
        .then(m.redraw);

    // final cleanup on the selected problem
    let selectedProblemPromise = Promise.all([promiseProblemDoc, promiseDiscovery])
        .then(() => {
            let problem = getSelectedProblem();
            if (problem.modelingMode === "causal") return
            let targets = getTargetVariables(problem);
            let predictors = getPredictorVariables(problem);

            if (problem.unedited && predictors.length === 0 && targets.length === 0) {
                setSelectedProblem(Object.values(workspace.raven_config.problems)
                    .find(problem => getPredictorVariables(problem).length !== 0)?.problemId)
            }
            // only modify the problem if problem is in predict mode
            else if (problem.unedited) {
                // set default predictors based on first discovered problem
                let newPredictors = getPredictorVariables(workspace.raven_config.problems['problem 3'])
                    ?.filter?.(variable => !targets.includes(variable));
                if (newPredictors?.length > 0) problem.groups.find(group => group.name === "Predictors").nodes = newPredictors;
            }
        })
        .catch(e => console.warn(e, 'failed to adopt predictors from first discovered problem'))

    // DATAMART (disabled while NYU is default)
    // if (DISPLAY_DATAMART_UI) promiseDatasetPath.then(() => workspace.raven_config.hardManipulations.length ? getData({
    //     method: 'aggregate',
    //     query: JSON.stringify(queryMongo.buildPipeline(
    //         workspace.raven_config.hardManipulations,
    //         workspace.raven_config.variablesInitial)['pipeline']),
    //     export: 'csv',
    // }) : workspace.datasetPath)
    //     .then(dataPath => search(datamartPreferences, datamartURL, dataPath))
    //     .then(m.redraw);

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

export async function load({awaitPreprocess} = {}) {
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

    if (!config_result.success) {
        setModal(config_result.message, "Error retrieving User Workspace configuration.", true, "Reset", false, locationReload);
    }

    if (!config_result.data) {
        setModal('No configurations in list!', "Error retrieving User Workspace configuration.", true, "Reset", false, locationReload);
    }

    // ------------------------------------
    // Find the current workspace in the list
    // ------------------------------------
    let tempWorkspace = config_result.data.find(config => config.is_current_workspace);

    if (!tempWorkspace) {
        setModal('No current workspace config in list!', "Error retrieving User Workspace configuration.", true, "Reset", false, locationReload);
    }

    // ---------------------------------------
    // 2. Load workspace
    // ---------------------------------------
    console.groupCollapsed('2. Load workspace');

    let success = await loadWorkspace(tempWorkspace, {awaitPreprocess});
    console.groupEnd();
    if (!success) {
        // alertError('Failed to load workspace');
        return;
    }

    /**
     * 3. Start the user session
     * rpc rpc Hello (HelloRequest) returns (HelloResponse) {}
     */
    sayHelloTA2();

    // hopscotch tutorial
    if (tutorial_mode) {
        console.log('Starting Hopscotch Tour');
        hopscotch.startTour(initialTour());
    }

}

/* ----------------------------------------------
   Say Hello to the D3M TA2
   rpc rpc Hello (HelloRequest) returns (HelloResponse) {}
---------------------------------------------- */
export let sayHelloTA2 = async() => {

    let responseTA2 = await m.request(D3M_SVC_URL + '/Hello', {});
    console.groupCollapsed('3. Start user session Hello');
    console.log(JSON.stringify(responseTA2));
    console.groupEnd();
    if (responseTA2) {
        if (responseTA2.success !== true) {
            console.log('fyi: TA2 not ready at startup.')
            //showTA2ConnectError(responseTA2.message);
            return;
        } else {
            showTA2Name(responseTA2);
        }
    }
}

/* ----------------------------------------------
   Format and show the TA2 name info panel
---------------------------------------------- */
export let showTA2Name = (responseTA2) => {
    let ta2Name = responseTA2.data.userAgent;

    let ta2Version = responseTA2.data.version;
    if (ta2Version) {
        ta2Name += ' (API: ' + ta2Version + ')';
    }

    setTA2ServerInfo(ta2Name);
}

/* ----------------------------------------------
  Show the TA2 connection error modal
---------------------------------------------- */
let showTechnicalDetails = false;
export let showTA2ConnectError = (errorMessage) => {
    setModal(
        m('div', [
            m('p', {class: 'h5'}, "We were unable to connect to the TA2 system."),
            m('p', {class: 'h5'}, "It may not be available."),
            //  m('p', {class: 'h5'}, "Please try again using the button below."),
            m('hr'),
            m(Subpanel, {
                header: "Technical Details",
                shown: showTechnicalDetails,
                // the modal keeps a stale copy of the hyperscript it will display, so this updates the stale copy
                setShown: state => {
                    console.log("set shown called")
                    showTechnicalDetails = state;
                    showTA2ConnectError(errorMessage)
                }
            }, errorMessage)
        ]),
        "Error Connecting to the TA2",
        true,
        "Close",
        true);
    // false, locationReload); // force system restart
}

/** needs doc */
export function helpmaterials(type) {
    if (type === "video") {
        let win = window.open("http://2ra.vn/demos/demos.html", '_blank');
        win.focus();
    } else {
        let win = window.open("http://2ra.vn/papers/tworavens-d3mguide.pdf", '_blank');
        win.focus();
    }
    console.log(type);
}

export let materializeManipulationsPromise = {};
export let materializeManipulations = async problem => {
    problem.results.datasetPaths = {all: workspace.datasetPath};
    problem.results.datasetSchemaPaths = {all: workspace.d3m_config.dataset_schema};
    problem.results.datasetSchemas = {all: common.deepCopy(workspace.datasetDoc)};

    if (!needsManipulationRewritePriorToSolve(problem)) return;

    // TODO: upon deleting or reassigning datasetDocProblemUrl, server-side temp directories may be deleted
    return buildDatasetPath(
        problem, undefined,
        problem.results.datasetPaths.all,
        workspace.d3m_config.name,
        problem.results.datasetSchemas.all)

        .then(({data_path, metadata_path, metadata}) => {
            problem.results.datasetPaths = {all: data_path};
            problem.results.datasetSchemaPaths = {all: metadata_path};
            problem.results.datasetSchemas = {all: metadata};
        })
}


// export let materializeTrainTestIndicesPromise = {};
// export let materializeTrainTestIndices = async problem => {
//
//     let response = await m.request({
//         method: 'POST',
//         url: D3M_SVC_URL + '/get-train-test-split-indices',
//         body: {
//             split_options: problem.splitOptions,
//             dataset_schema: problem.results.datasetSchemaPaths.all,
//             dataset_path: problem.results.datasetPaths.all,
//             problem: SPEC_problem(problem),
//             // if not manipulated, then don't rewrite datasetDoc with new metadata
//             // new datasetDoc will come from the translateDatasetDoc function
//             update_roles: !needsManipulationRewritePriorToSolve(problem)
//         }
//     });
//
//     if (!response.success) {
//         console.warn('Materialize train/test indices error:', response.message);
//         alertWarn('Unable to create out-of-sample split. Using entire dataset for training and for in-sample testing.');
//         results.resultsPreferences.dataSplit = 'all';
//         problem.splitOptions.outOfSampleSplit = false;
//         return false;
//     }
//
//     // splits collection has been materialized in the database
//     problem.results.splitCollection = response.data.split_collection;
//     return true;
// };

// materializing splits may only happen once per problem, all calls wait for same response
export let materializeTrainTestPromise = {};
export let materializeTrainTest = async problem => {

    let response = await m.request({
        method: 'POST',
        url: D3M_SVC_URL + '/get-train-test-split',
        body: {
            dataset_id: problem.results.d3mDatasetId,
            split_options: problem.splitOptions,
            dataset_schema: problem.results.datasetSchemaPaths.all,
            dataset_path: problem.results.datasetPaths.all,
            problem: solverWrapped.SPEC_problem(problem)
        }
    });

    if (!response.success) {
        console.warn('Materialize train/test error:', response.message);
        alertWarn('Unable to create out-of-sample split. Using entire dataset for training and for in-sample testing.');
        results.resultsPreferences.dataSplit = 'all';
        problem.splitOptions.outOfSampleSplit = false;
        return false;
    }

    problem.results.datasetSchemas.all = response.data.dataset_schemas.all;
    problem.results.datasetSchemas.train = response.data.dataset_schemas.train;
    problem.results.datasetSchemas.test = response.data.dataset_schemas.test;

    problem.results.datasetSchemaPaths.all = response.data.dataset_schema_paths.all;
    problem.results.datasetSchemaPaths.train = response.data.dataset_schema_paths.train;
    problem.results.datasetSchemaPaths.test = response.data.dataset_schema_paths.test;

    problem.results.datasetPaths.all = response.data.dataset_paths.all;
    problem.results.datasetPaths.train = response.data.dataset_paths.train;
    problem.results.datasetPaths.test = response.data.dataset_paths.test;

    return true;
};

/**
 converts color codes
 */
export let hexToRgba = (hex, alpha) => {
    if (alpha === undefined) alpha = 0.5
    if (!alpha) return '#0000';
    let int = parseInt(hex.replace('#', ''), 16);
    return `rgba(${[(int >> 16) & 255, (int >> 8) & 255, int & 255, alpha].join(',')})`;
};

export let setPreprocess = state => {
    setVariableSummaries(state?.variables)
    setDatasetSummary(state?.dataset)
}

export let setVariableSummaries = state => {
    if (!state) return;
    // delete state.d3mIndex;

    // I'm treating existence of a time format as indication that the data is temporal. same for geo
    Object.values(state).forEach(summary => {
        delete summary.temporal
        delete summary.geographic
    })
    variableSummaries = state;

    // TODO: replace usages of .name with already existing .variableName
    Object.keys(variableSummaries).forEach(variable => variableSummaries[variable].name = variable);

    // merge user-applied dataset annotations over the new variable summary
    // don't re-introduce variables that no longer exist
    Object.entries(workspace.raven_config.variableSummariesDiffs)
        .filter(([key, _]) => key in variableSummaries)
        .forEach(([key, value]) => common.deepMerge(variableSummaries[key], value));

    // infer location formats when possible
    Object.values(variableSummaries)
        .filter(summary => summary.locationUnit && !summary.locationFormat)
        .forEach(summary => inferLocationFormat(summary.variableName))

    window.variableSummaries = variableSummaries;
};

export let inferLocationFormat = variable => {
    let unit = variableSummaries[variable].locationUnit;
    if ([undefined, 'latitude', 'longitude'].includes(unit))
        return;
    if (!variableSummaries[variable].plotValues || !unit) return

    let units = [unit];
    if (!(unit in locationUnits))
        units = Object.keys(locationUnits)
            .filter(unit => !['latitude', 'longitude'].includes(unit))

    m.request({
        url: mongoURL + 'get-metadata',
        method: 'POST',
        body: {alignments: units}
    }).then(setMetadata).then(() => {
        units.some(unit => {
            let inversion = alignmentData[unit].reduce((inversion, alignment) => {
                Object.entries(alignment).forEach(([format, value]) => {
                    inversion[format] = inversion[format] || new Set();
                    inversion[format].add(value)
                })
                return inversion;
            }, {});

            let sampleNames = Object.keys(variableSummaries[variable].plotValues);

            // guess the format based on some plotValues
            let format = Object.keys(inversion).find(format => sampleNames.length * .8 < sampleNames.reduce((score, name) => inversion[format].has(name) ? score + 1 : score, 0));
            if (format) {
                setVariableSummaryAttr(variable, 'locationUnit', unit);
                setVariableSummaryAttr(variable, 'locationFormat', format);
                return true
            }
        })
    })
}

export let setVariableSummaryAttr = (variable, attr, value) => {
    utils.setDeep(workspace, ['raven_config', 'variableSummariesDiffs', variable, attr], value);
    utils.setDeep(variableSummaries, [variable, attr], value);
};

export let setDatasetSummaryAttr = (attr, value) => {
    utils.setDeep(workspace, ['raven_config', 'datasetSummaryDiffs', attr], value);
    datasetSummary[attr] = value;
}
export let variableSummaries = {};

export let setDatasetSummary = state => {
    if (!state) return;
    datasetSummary = state;
    window.datasetSummary = datasetSummary;
    common.deepMerge(datasetSummary, workspace.raven_config.datasetSummariesDiffs);
};
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
export let getCurrentWorkspaceMessage = () => {
    return currentWorkspaceSaveMsg;
};


/*
 *  saveUserWorkspace() save the current
 *  ravens_config data to the user workspace.
 *    e.g. updates the workspace saved in the database
 */
export let saveUserWorkspace = (silent = false, reload = false) => {
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
            if (reload) reset()
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
export let TA2ServerInfo = (TA2_SERVER !== undefined) ? TA2_SERVER : '(TA2 unknown)';
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
    if (boolVal) {
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
export let setNewWorkspaceName = newName => newWorkspaceName = newName;

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

    if (!newWorkspaceName) {

        // show save/cancel buttons
        setDisplaySaveNameButtonRow(true);

        setNewWorkspaceMessageError('Please enter a new workspace name.');
        return;
    }

    console.log('new_workspace_name: ' + newWorkspaceName);

    // save url
    let raven_config_save_url = '/user-workspaces/raven-configs/json/save-as-new/' + workspace.user_workspace_id;

    let save_result = await m.request({
        method: "POST",
        url: raven_config_save_url,
        body: {
            new_workspace_name: newWorkspaceName,
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

export let setCheckedDiscoveryProblem = (status, problemId) => {
    let ravenConfig = workspace.raven_config;
    if (problemId)
        ravenConfig.problems[problemId].meaningful = status;
    else
        Object.keys(ravenConfig.problems)
            .forEach(problemId => ravenConfig.problems[problemId].meaningful = status)
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
export function handleMaterializeDataMessage(msg_data) {

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
    const previewDatamartId = msg_data.data.id;
    datamartPreferences.cached[previewDatamartId] = msg_data.data;
    let previewDatamartIndex = datamartPreferences.results[datamartPreferences.sourceMode]
        .findIndex(entry => previewDatamartId === datamartPreferences.getData(entry, 'id'));
    datamartPreferences.setPreviewButtonState(previewDatamartIndex, false);

    // Format the data_preview
    //
    datamartPreferences.cached[previewDatamartId].data_preview = datamartPreferences.cached[previewDatamartId].data_preview.split('\n').map(line => line.split(','));

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
            console.log(msg_data);
            let augmentStep = Object.assign({type: 'augment'}, msg_data.data.augment_params || {});

            // - Copy manipulations from the orig selected problem to the
            // workspace's priorManipulations.
            // - Clear the orig. selected problem manipulations
            workspace.raven_config.priorManipulations = [
                ...priorHardManipulations,
                ...(priorSelectedProblem || {}).manipulations || [],
                augmentStep
            ];

            if (priorSelectedProblem) {
                // (4) update ids of the orig selected problem to avoid clashes
                //
                priorSelectedProblem.manipulations = [];

                priorSelectedProblem.problemId = priorDatasetName;
                delete priorSelectedProblem.provenanceId;
                priorSelectedProblem.pending = false;
                priorSelectedProblem.unedited = true;

                // (5) add the old problem to the current problems list
                //
                workspace.raven_config.problems[priorSelectedProblem.problemId] = priorSelectedProblem;

                // (6) add a problem with new columns added to predictors, and set it to the selected problem
                let problemCopy = getProblemCopy(priorSelectedProblem);

                let joinedGroup = problemCopy.groups.find(group => group.name === 'Joined')
                if (!joinedGroup) {
                    joinedGroup = {name: 'Joined', color: colors.predictor, opacity: 0.3, nodes: []};
                    problemCopy.groups.unshift(joinedGroup);
                    let targetGroups = getTargetGroups(problemCopy)
                    if (targetGroups.length > 0)
                        problemCopy.groupLinks.push({source: 'Joined', target: targetGroups[0].name, color: colors.predictor})
                }
                joinedGroup.nodes.push(...workspace.raven_config.variablesInitial
                    .filter(newVariable => !priorVariablesInitial.includes(newVariable)));

                workspace.raven_config.problems[problemCopy.problemId] = problemCopy;
                setSelectedProblem(problemCopy.problemId);
            }

            setSelectedMode('model');

            saveUserWorkspace(true)
        });


    // console.log('datamart_id: ' + msg_data.data.datamart_id);
    // console.log('filesize: ' + msg_data.data.filesize);

} // end: handleAugmentDataMessage

export let inferIsCategorical = variableSummary => {
    if (variableSummary.nature === 'nominal') return true;
    if (variableSummary.nature === 'ordinal' && variableSummary.uniqueCount <= 20) return true;
    return false;
};


let getSolutionIds = workspace => Object.values(workspace.raven_config.problems)
    .filter(problem => problem.results).reduce((out, problem) => {
        problem.results.solutions
        out.d3m.push(...Object.values(problem.results.solutions.d3m || {}).map(solution => solution.solutionId));
        out.wrapped.push(...Object.keys(problem.results.solutions)
            .filter(systemId => systemId !== 'd3m')
            .flatMap(systemId => Object.keys(problem.results.solutions[systemId])))
        return out
    }, {d3m: [], wrapped: []})