import m from 'mithril';
import {dateSort} from "./canvases/CanvasDate";

import * as common from '../../common-eventdata/common';
import * as query from './query';
// Used for right panel query tree
import '../../../node_modules/jqtree/tree.jquery.js';
import '../../../node_modules/jqtree/jqtree.css';
import '../pkgs/jqtree/jqtree.style.css';
import {buildSubset} from "./query";

let production = false;

export let rappURL = '';
if (!production) {
    // base URL for the R apps:
    //rappURL = "http://localhost:8000/custom/";
    rappURL = ROOK_SVC_URL; // Note: The ROOK_SVC_URL is set by django in /templates/index.html
} else {
    rappURL = "https://beta.dataverse.org/custom/"; //this will change when/if the production host changes
}

// TODO login
export let username = 'TwoRavens';

// since R mangles literals and singletons
export let coerceArray = (value) => Array.isArray(value) ? value : value === undefined ? [] : [value];

let appname = 'eventdataapp';
export let subsetURL = rappURL + appname;

// metadata for all available datasets and type formats
export let genericMetadata = {};
export let formattingData = {};
export let alignmentData = {};

export let getVariables = (dataset) => Object.values((dataset || {})['columns'] || {});
export let ontologyAlign = (column) => genericMetadata[selectedDataset]['columns'][column];

// metadata computed on the dataset for each subset
export let subsetData = {};

// contains state for redrawing subsets (for example, it contains selected countries and regions under the name of a location subset)
export let subsetPreferences = {};
export let subsetRedraw = {};
export let setSubsetRedraw = (subset, value) => subsetRedraw[subset] = value || false;

// if selectedSubsetName: true, then the loading symbol is displayed instead of the menu
export let isLoading = {};

// contains state for redrawing canvases
export let canvasPreferences = {};
export let canvasRedraw = {};
export let setCanvasRedraw = (canvas, value) => canvasRedraw[canvas] = value || false;

// Select which tab is shown in the left panel
export let setLeftTab = (tab) => leftTab = tab;
export let leftTab = 'Subsets';

export let displayModal = false;
export let setDisplayModal = (state) => displayModal = state;

// stores user info for the save query modal menu. Subset and aggregate are separate
export let saveQuery = {
    'home': {},
    'subset': {},
    'aggregate': {}
};

common.setPanelCallback('right', () => {
    common.setPanelOcclusion('right', `calc(${common.panelOpen['right'] ? '250px' : '16px'} + 2*${common.panelMargin})`);
    handleResize();
});

common.setPanelCallback('left', () => {
    common.setPanelOcclusion('left', `calc(${common.panelOpen['left'] ? '250px' : '16px'} + 2*${common.panelMargin})`);
    handleResize();
});

export function handleResize() {
    if (selectedDataset === undefined || genericMetadata[selectedDataset] === undefined) return;
    document.getElementById('canvas').style['padding-right'] = common.panelOcclusion['right'];
    document.getElementById('canvas').style['padding-left'] = common.panelOcclusion['left'];
    Object.keys(genericMetadata[selectedDataset]['subsets']).forEach(subset => subsetRedraw[subset] = true);
    m.redraw();
}

window.addEventListener('resize', handleResize);

// percent of the canvas to cover with the aggregation table
export let tableHeight = '20%';

export let selectedDataset;
export let setSelectedDataset = (key) => {
    // trigger reloading of necessary menu elements
    if (key !== selectedDataset) subsetData = {};

    selectedDataset = key;

    // ensure each subset has a place to store settings
    Object.keys(genericMetadata[selectedDataset]['subsets']).forEach(subset => {
        subsetPreferences[subset] = subsetPreferences[subset] || {};
    });

    Object.keys(unitMeasure).forEach(unit => {
        if (!(unit in genericMetadata[selectedDataset]['subsets']) || !('measure' in genericMetadata[selectedDataset['subsets'][unit]]))
            delete unitMeasure[unit];
    });
    setEventMeasure(undefined);
    aggregationHeadersUnit = [];
    aggregationHeadersEvent = [];
    aggregationData = [];

    resetPeek();
};

let modeTypes = ['home', 'subset', 'aggregate'];
export let selectedMode = 'home';

export function setSelectedMode(mode) {
    mode = mode.toLowerCase();

    if (mode === selectedMode) return;

    // Some canvases only exist in certain modes. Fall back to default if necessary.
    if (mode === 'home' && ['About', 'Datasets', 'Saved Queries'].indexOf(selectedCanvas) === -1)
        setSelectedCanvas(selectedCanvasHome);
    if (mode === 'subset' && (selectedCanvas !== 'subset' || subsetKeys().indexOf(selectedSubsetName) === -1))
        setSelectedSubsetName(subsetKeys()[0]);
    if (mode === 'aggregate' && (selectedCanvas !== 'subset' || aggregateKeys().indexOf(selectedSubsetName) === -1))
        setSelectedSubsetName(aggregateKeys()[0]);

    selectedMode = mode;

    m.route.set('/' + mode.toLowerCase());

    // wait until after the redraw to force a plot size update
    setTimeout(() => {
        Object.keys(genericMetadata[selectedDataset]['subsets']).forEach(subset => subsetRedraw[subset] = true);
        m.redraw();
    }, 100);
}

// dictates what menu is shown, but the value of selectedSubsetName is user-defined
let subsetTypes = ['dyad', 'categorical', 'categorical_grouped', 'date', 'custom']; // not actually used, but maintained for documentation
export let selectedSubsetName;
export let setSelectedSubsetName = (subset) => {
    setSelectedCanvas('Subset');
    selectedSubsetName = subset;
};

let canvasTypes = ['Home', 'Datasets', 'Saved Queries', 'Subset', 'Custom', 'Time Series', 'Analysis']; // not actually used, but maintained for documentation
export let selectedCanvas = 'Datasets';
export let selectedCanvasHome = selectedCanvas;
export let setSelectedCanvas = (canvasKey) => {
    if (['About', 'Datasets', 'Saved Queries'].indexOf(canvasKey) !== -1) selectedCanvasHome = canvasKey;
    selectedCanvas = canvasKey;
};

export let totalSubsetRecords;

// Load the metadata for each available dataset
m.request({
    url: subsetURL,
    data: {'type': 'datasets'},
    method: 'POST'
}).then((jsondata) => {
    console.log(jsondata);
    genericMetadata = jsondata;
    resetPeek();
}).catch(laddaStop);

if (localStorage.getItem("dataset") !== null) {
    dataset = localStorage.getItem('dataset');
}

export let reloadSubset = (subsetName) => {
    if (isLoading[subsetName]) return;

    // the custom subset never uses data
    if (subsetName === 'Custom') return;
    isLoading[subsetName] = true;

    let stagedSubsetData = [];
    for (let child of abstractQuery) {
        if (child.type === 'query') {
            stagedSubsetData.push(child)
        }
    }

    let subsetMetadata = genericMetadata[selectedDataset]['subsets'][selectedSubsetName];

    m.request({
        url: subsetURL,
        data: {
            query: JSON.stringify(query.buildSubset(stagedSubsetData)),
            dataset: selectedDataset,
            subset: selectedSubsetName,

            alignments: coerceArray(subsetMetadata['alignments'] || [])
                .filter(alignment => !(alignment in alignmentData)),
            formats: coerceArray(subsetMetadata['formats'] || [])
                .filter(format => !(format in formattingData)),

            countRecords: totalSubsetRecords === undefined
        },
        method: 'POST'
    }).then((data) => {
        isLoading[subsetName] = false;
        pageSetup(data);
    })
};

export let subsetKeys = () => Object.keys(genericMetadata[selectedDataset]['subsets']);
export let aggregateKeys = () => subsetKeys().filter(subset => 'measures' in genericMetadata[selectedDataset]['subsets'][subset]);

// These get instantiated in the oncreate() method for the mithril Body_EventData class
export let laddaUpdate;
export let laddaReset;
export let laddaDownload;

export let selectedVariables = new Set();

export let abstractQuery = [];

// TAGGED: LOCALSTORE
// // Attempt to load stored settings
// if (localStorage.getItem("abstractQuery") !== null) {
//     // Since the user has already submitted a query, restore the previous preferences from local data
//     // All stored data is cleared on reset
//     selectedVariables = new Set(JSON.parse(localStorage.getItem('selectedVariables')));
//     abstractQuery = JSON.parse(localStorage.getItem('abstractQuery'));
// }

export function setupBody() {

    laddaUpdate = Ladda.create(document.getElementById("btnUpdate"));
    laddaReset = Ladda.create(document.getElementById("btnReset"));
    laddaDownload = Ladda.create(document.getElementById("buttonDownload"));

    // this will only get used if dataset selection is loaded from localstorage, since the default is undefined
    if (selectedDataset === undefined) return;

    resetPeek();

    let stagedSubsetData = [];
    for (let child of abstractQuery) {
        if (child.type === 'query') {
            stagedSubsetData.push(child)
        }
    }

    let body = {
        'query': escape(JSON.stringify(query.buildSubset(stagedSubsetData))),
        'variables': [...selectedVariables],
        'dataset': genericMetadata[selectedDataset]['key'],
        'subsets': Object.keys(genericMetadata[selectedDataset]['subsets'])
    };

    laddaReset.start();

    // Initial load of preprocessed data
    m.request({
        url: subsetURL,
        data: body,
        method: 'POST'
    }).then(pageSetup).catch(laddaStop);
}

export let variableSearch = '';
export let setVariableSearch = (text) => variableSearch = text;

export function toggleVariableSelected(variable) {
    if (selectedVariables.has(variable)) {
        selectedVariables.delete(variable);
    } else {
        selectedVariables.add(variable);
    }
    reloadRightPanelVariables();
}

// useful for handling request errors
export function laddaStop(err) {
    laddaDownload.stop();
    laddaReset.stop();
    laddaUpdate.stop();
    console.error(err);
}

export function download(queryType, dataset, queryMongo) {

    function save(data) {
        // postprocess aggregate to reformat dates to YYYY-MM-DD and collapse the dyad boolean array
        if (queryType === 'aggregate') {
            let headersUnit;
            ({data, headersUnit} = query.reformatAggregation(data));

            // reformat dates to strings
            for (let header of headersUnit) {
                if (genericMetadata[dataset]['subsets'][header]['type'] === 'date') {
                    data = data
                        .filter(entry => header in entry) // ignore entries with undefined dates
                        .map(entry => {
                            // because YYYY-MM-DD format rocks
                            return Object.assign({}, entry, {[header]: entry[header].toISOString().slice(0, 10)})
                        });
                }
            }
        }

        let a = document.createElement('A');
        a.href = data.download;
        a.download = data.download.substr(data.download.lastIndexOf('/') + 1);
        document.body.appendChild(a);
        a.click();

        laddaDownload.stop();
        document.body.removeChild(a);
    }

    // fall back to document state if args are not passed
    if (!queryType) queryType = selectedMode;
    if (!dataset) dataset = selectedDataset;
    if (!queryMongo) {
        if (queryType === 'subset') {
            let variables = selectedVariables.size === 0 ? genericMetadata[dataset]['columns'] : [...selectedVariables];
            queryMongo = [
                {"$match": query.buildSubset(abstractQuery)},
                {
                    "$project": variables.reduce((out, variable) => {
                        out[variable] = 1;
                        return out;
                    }, {'_id': 0})
                }
            ];
        }
        else if (queryType === 'aggregate')
            queryMongo = query.buildAggregation(abstractQuery, subsetPreferences);
    }

    let body = {
        'query': escape(JSON.stringify(queryMongo)),
        'dataset': dataset,
        'type': 'raw'
    };

    laddaDownload.start();
    m.request({
        url: subsetURL,
        data: body,
        method: 'POST'
    }).then(save).catch(laddaStop);
}

let resetPeek = () => {
    peekSkip = 0;
    peekData = [];

    peekAllDataReceived = false;
    peekIsGetting = false;

    // this will cause a redraw in the peek menu
    if (localStorage.getItem('peekTableData' + peekId)) {
        localStorage.removeItem('peekHeader' + peekId);
        localStorage.removeItem('peekTableHeaders' + peekId);
        localStorage.removeItem('peekTableData' + peekId);
    }
    else updatePeek();
};

let peekId = 'eventdata';

let peekBatchSize = 100;
let peekSkip = 0;
let peekData = [];

let peekAllDataReceived = false;
let peekIsGetting = false;

let onStorageEvent = (e) => {
    if (e.key !== 'peekMore' + peekId || peekIsGetting) return;

    if (localStorage.getItem('peekMore' + peekId) === 'true' && !peekAllDataReceived) {
        localStorage.setItem('peekMore' + peekId, 'false');
        peekIsGetting = true;
        updatePeek();
    }
};

let updatePeek = async () => {
    if (!selectedDataset) return;

    let stagedSubsetData = [];
    for (let child of abstractQuery) {
        if (child.type === 'query') {
            stagedSubsetData.push(child)
        }
    }
    let subsetQuery = query.buildSubset(stagedSubsetData);

    console.log("Peek Update");
    console.log("Query: " + JSON.stringify(subsetQuery));

    let tableHeaders = JSON.stringify(selectedVariables.size
        ? [...selectedVariables]
        : genericMetadata[selectedDataset]['columns']);

    if (tableHeaders !== localStorage.getItem('peekTableHeaders' + peekId)) {
        peekData = [];
        peekSkip = 0;
    }

    let body = {
        query: JSON.stringify(subsetQuery),
        skip: peekSkip,
        limit: peekBatchSize,
        dataset: selectedDataset,
        type: 'peek'
    };

    // conditionally pass variable projection
    if (selectedVariables.size !== 0) body['variables'] = [...selectedVariables];

    // cancel the request
    if (!peekIsGetting) return;

    let data = await m.request({
        url: subsetURL,
        data: body,
        method: 'POST'
    });

    peekIsGetting = false;

    if (data.length === 0) {
        peekAllDataReceived = true;
        return;
    }

    // for (let record of data) peekData.push(Object.keys(variableQuery).map((key) => record[key] || ""));
    peekData = peekData.concat(data);
    peekSkip += data.length;

    // this gets noticed by the peek window
    localStorage.setItem('peekHeader' + peekId, selectedDataset);
    localStorage.setItem('peekTableHeaders' + peekId, tableHeaders);
    localStorage.setItem('peekTableData' + peekId, JSON.stringify(peekData));
};
window.addEventListener('storage', onStorageEvent);


// we must be very particular about how months get incremented, to handle leap years etc.
export function incrementMonth(date) {
    let months = date.getFullYear() * 12 + date.getMonth() + 1;
    return new Date(Math.floor(months / 12), months % 12);
}

export let isSameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();


/*
 *   Draws all subset plots, often invoked as callback after server request for new plotting data
 */
export function pageSetup(jsondata) {
    console.log("Server returned:");
    console.log(jsondata);

    laddaUpdate.stop();
    laddaReset.stop();

    if ('total' in jsondata) totalSubsetRecords = jsondata['total'];

    // trigger d3 redraw within current subset
    subsetRedraw[jsondata['subsetName']] = true;

    Object.keys(jsondata['formats'] || {}).forEach(format => formattingData[format] = jsondata['formats'][format]);
    Object.keys(jsondata['alignments'] || {}).forEach(align => alignmentData[align] = jsondata['alignments'][align]);

    let subsetType = genericMetadata[selectedDataset]['subsets'][jsondata['subsetName']]['type'];

    if (subsetType === 'dyad' && jsondata['search'])
        subsetData[jsondata['subsetName']][jsondata['tab']]['full'] = jsondata['data'] || [];

    else if (subsetType === 'date')
        subsetData[jsondata['subsetName']] = jsondata['data']
            .filter(entry => !isNaN(entry['year'] && !isNaN(entry['month'])))
            .map(entry => ({'Date': new Date(entry['year'], entry['month'] - 1, 0), 'Freq': entry.total}))
            .sort(dateSort)
            .reduce((out, entry) => {

                if (out.length === 0) return [entry];
                let tempDate = incrementMonth(out[out.length - 1]['Date']);

                while (!isSameMonth(tempDate, entry['Date'])) {
                    out.push({Freq: 0, Date: new Date(tempDate)});
                    tempDate = incrementMonth(tempDate);
                }
                out.push(entry);
                return (out);
            }, []);
    else
        subsetData[jsondata['subsetName']] = jsondata['data'];
}

export let aggregationData = [];
export let setAggregationData = (data) => aggregationData = data;

export let aggregationHeadersUnit = [];
export let setAggregationHeadersUnit = (headersUnit) => aggregationHeadersUnit = headersUnit;

export let aggregationHeadersEvent = [];
export let setAggregationHeadersEvent = (headersEvent) => aggregationHeadersEvent = headersEvent;

export let unitMeasure = {};

export let eventMeasure; // string
export let setEventMeasure = (measure) => eventMeasure = measure;


// Right panel of subset menu

// This is the node format for creating the jqtree
// {
//     id: String(nodeId++),    // Node number with post-increment
//     name: '[title]',         // 'Subsets', 'Group #', '[Selection] Subset' or tag name
//     show_op: true,           // If true, show operation menu element
//     operation: 'and',        // Stores preference of operation menu element
//     children: [],            // If children exist
//     negate: false,           // If exists, have a negation button
//     editable: true,          // If false, operation cannot be edited
//     cancellable: false       // If exists and false, disable the delete button
// }

// variableData is used to create the tree gui on the right panel
// names of variables comes from 'selectedVariables' variable
let variableData = [];

export let nodeId = 1;
export let groupId = 1;
export var queryId = 1;

// TAGGED: LOCALSTORE
// if (localStorage.getItem("nodeId") !== null) {
//     // If the user has already submitted a query, restore the previous query from local data
//     nodeId = parseInt(localStorage.getItem('nodeId'));
//     groupId = parseInt(localStorage.getItem('groupId'));
//     queryId = parseInt(localStorage.getItem('queryId'));
// }


export function setupQueryTree() {

    // Variables menu
    $('#variableTree').tree({
        data: variableData,
        saveState: true,
        dragAndDrop: false,
        autoOpen: true,
        selectable: false
    });

    // Create the query tree
    let subsetTree = $('#subsetTree');
    subsetTree.tree({
        data: abstractQuery,
        saveState: true,
        dragAndDrop: true,
        autoOpen: true,
        selectable: false,

        // Executed for every node and leaf in the tree
        onCreateLi: function (node, $li) {

            if ('negate' in node) {
                $li.find('.jqtree-element').prepend(buttonNegate(node.id, node.negate));
            }
            if ((!('show_op' in node) || ('show_op' in node && node.show_op)) && 'operation' in node) {
                let canChange = node.type !== 'query' && !node.editable;
                $li.find('.jqtree-element').prepend(buttonOperator(node.id, node.operation, canChange));
            }
            if (!('cancellable' in node) || (node['cancellable'] === true)) {
                $li.find('.jqtree-element').append(buttonDelete(node.id));
            }
            // Set a left margin on the first element of a leaf
            if (node.children.length === 0) {
                $li.find('.jqtree-element:first').css('margin-left', '14px');
            }
        },
        onCanMove: function (node) {
            // Cannot move nodes in uneditable queries
            if ('editable' in node && !node.editable) {
                return false
            }

            // Subset and Group may be moved
            return (node.type === 'rule' || node.type === 'query');
        },
        onCanMoveTo: function (moved_node, target_node, position) {
            // Cannot move to uneditable queries
            if ('editable' in target_node && !target_node.editable) return false;

            // Categories may be reordered or swapped between similar subsets
            if (['categorical', 'categorical_grouped'].indexOf(moved_node.type) !== -1) {
                return position === 'after' && target_node.parent.name === moved_node.parent.name;
            }
            // Rules may be moved next to another rule or grouping
            if (position === 'after' && (target_node.type === 'rule' || target_node.type === 'group')) {
                return true;
            }
            // Rules may be moved inside a group or root
            // noinspection RedundantIfStatementJS
            if ((position === 'inside') && (target_node.name.indexOf('Subsets') !== -1 || target_node.type === 'group')) {
                return true;
            }
            return false;
        }
    });

    subsetTree.on(
        'tree.move',
        function (event) {
            event.preventDefault();
            event.move_info.do_move();

            // Save changes when an element is moved
            abstractQuery = JSON.parse(subsetTree.tree('toJson'));

            hideFirst(abstractQuery);
            let state = subsetTree.tree('getState');
            subsetTree.tree('loadData', abstractQuery);
            subsetTree.tree('setState', state);
        }
    );

    subsetTree.on(
        'tree.click',
        function (event) {
            let node = event.node;
            if (node.name === 'Custom Subset') {
                canvasPreferences['Custom'] = canvasPreferences['Custom'] || {};
                canvasPreferences['Custom']['text'] = JSON.stringify(node.custom, null, '\t');
                canvasRedraw['Custom'] = true;
                setSelectedCanvas("Custom");
                m.redraw()
            }

            if (event.node.hasChildren()) {
                $('#subsetTree').tree('toggle', event.node);
            }
        }
    );

    subsetTree.bind(
        'tree.dblclick',
        function (event) {
            let tempQuery = query.buildSubset([event.node]);
            if ($.isEmptyObject(tempQuery)) {
                alert("\"" + event.node.name + "\" is too specific to parse into a query.");
            } else {
                canvasPreferences['Custom'] = canvasPreferences['Custom'] || {};
                canvasPreferences['Custom']['text'] = JSON.stringify(tempQuery, null, '\t');
                canvasRedraw['Custom'] = true;
                setSelectedCanvas("Custom");
                m.redraw()
            }
        }
    );
}

// Define negation toggle, logic dropdown and delete button, as well as their callbacks
function buttonNegate(id, state) {
    // This state is negated simply because the buttons are visually inverted. An active button appears inactive
    // This is due to css tomfoolery
    if (!state) {
        return '<button id="boolToggle" class="btn btn-default btn-xs" type="button" data-toggle="button" aria-pressed="true" onclick="callbackNegate(' + id + ', true)">not</button> '
    } else {
        return '<button id="boolToggle" class="btn btn-default btn-xs active" type="button" data-toggle="button" aria-pressed="true" onclick="callbackNegate(' + id + ', false)">not</button> '
    }
}

window.callbackNegate = function (id, bool) {
    let subsetTree = $('#subsetTree');
    let node = subsetTree.tree('getNodeById', id);

    // don't permit change in negation on non-editable node
    if ('editable' in node && !node.editable) return;

    node.negate = bool;

    abstractQuery = JSON.parse(subsetTree.tree('toJson'));
    let state = subsetTree.tree('getState');
    subsetTree.tree('loadData', abstractQuery);
    subsetTree.tree('setState', state);
};

function buttonOperator(id, state, canChange) {
    if (canChange) {
        if (state === 'and') {
            // language=HTML
            return `<button class="btn btn-default btn-xs active" style="width:33px" type="button" data-toggle="button" aria-pressed="true" onclick="callbackOperator(${id}, 'or')">and</button> `
        } else {
            // language=HTML
            return `<button class="btn btn-default btn-xs active" style="width:33px" type="button" data-toggle="button" aria-pressed="true" onclick="callbackOperator(${id}, 'and')">or</button> `
        }
    } else {
        if (state === 'and') {
            return '<button class="btn btn-default btn-xs active" style="width:33px;background:none" type="button" data-toggle="button" aria-pressed="true">and</button> '
        } else {
            return '<button class="btn btn-default btn-xs active" style="width:33px;background:none" type="button" data-toggle="button" aria-pressed="true">or</button> '
        }
    }

    // To enable nand and nor, comment above and uncomment below. Please mind; the query builder does not support nand/nor
    // let logDropdown = ' <div class="dropdown" style="display:inline"><button class="btn btn-default dropdown-toggle btn-xs" type="button" data-toggle="dropdown">' + state + ' <span class="caret"></span></button>';
    // logDropdown += '<ul class="dropdown-menu dropdown-menu-right" id="addDropmenu" style="float:left;margin:0;padding:0;width:45px;min-width:45px">' +
    //     '<li style="margin:0;padding:0;width:45px"><a style="margin:0;height:20px;padding:2px;width:43px!important" data-addsel="1" onclick="callbackOperator(' + id + ', &quot;and&quot;)">and</a></li>' +
    //     '<li style="margin:0;padding:0;width:45px"><a style="margin:0;height:20px;padding:2px;width:43px!important" data-addsel="2" onclick="callbackOperator(' + id + ', &quot;or&quot;)">or</a></li>' +
    //     '<li style="margin:0;padding:0;width:45px"><a style="margin:0;height:20px;padding:2px;width:43px!important" data-addsel="1" onclick="callbackOperator(' + id + ', &quot;nand&quot;)">nand</a></li>' +
    //     '<li style="margin:0;padding:0;width:45px"><a style="margin:0;height:20px;padding:2px;width:43px!important" data-addsel="2" onclick="callbackOperator(' + id + ', &quot;nor&quot;)">nor</a></li>' +
    //     '</ul></div> ';
}

window.callbackOperator = function (id, operand) {
    let subsetTree = $('#subsetTree');
    let node = subsetTree.tree('getNodeById', id);
    if ('editable' in node && !node.editable) return;

    node.operation = operand;

    // Redraw tree
    abstractQuery = JSON.parse(subsetTree.tree('toJson'));
    let state = subsetTree.tree('getState');
    subsetTree.tree('loadData', abstractQuery);
    subsetTree.tree('setState', state);
};

function buttonDelete(id) {
    return "<button type='button' class='btn btn-default btn-xs' style='background:none;border:none;box-shadow:none;float:right;margin-top:2px;height:18px' onclick='callbackDelete(" + String(id) + ")'><span class='glyphicon glyphicon-remove' style='color:#ADADAD'></span></button></div>";
}

// attached to window due to html injection in jqtree
window.callbackDelete = function (id) {

    let subsetTree = $('#subsetTree');
    let node = subsetTree.tree('getNodeById', id);
    if (node.type === 'query') {
        if (!confirm("You are deleting a query. This will return your subsetting to an earlier state.")) {
            return;
        }
    }
    // If deleting the last leaf in a branch, delete the branch
    if (typeof node.parent.id !== 'undefined' && node.parent.children.length === 1) {
        callbackDelete(node.parent.id);
    } else {
        subsetTree.tree('removeNode', node);

        abstractQuery = JSON.parse(subsetTree.tree('toJson'));
        hideFirst(abstractQuery);

        let qtree = subsetTree;
        let state = qtree.tree('getState');
        qtree.tree('loadData', abstractQuery);
        qtree.tree('setState', state);

        if (node.type === 'query') {
            // Don't use constraints outside of submitted queries
            let stagedSubsetData = [];
            for (let child of abstractQuery) {
                if (child.type === 'query') {
                    stagedSubsetData.push(child)
                }
            }
            let subsetQuery = buildSubset(stagedSubsetData);
            console.log("Query: " + JSON.stringify(subsetQuery));

            laddaUpdate.start();

            m.request({
                url: subsetURL,
                data: {
                    'type': 'summary',
                    'query': escape(JSON.stringify(subsetQuery)),
                    'dataset': selectedDataset,
                    'subset': selectedSubsetName,
                    'countRecords': true
                },
                method: 'POST'
            }).then((jsondata) => {
                jsondata['total'] = jsondata['total'][0];
                subsetData = {};
                pageSetup(jsondata);
            }).catch(laddaStop);

            if (abstractQuery.length === 0) {
                groupId = 1;
                queryId = 1;
            }

            // TAGGED: LOCALSTORE
            // // Store user preferences in local data
            // localStorage.setItem('selectedVariables', JSON.stringify([...selectedVariables]));
            //
            // localStorage.setItem('abstractQuery', $('#subsetTree').tree('toJson'));
            // localStorage.setItem('nodeId', String(nodeId));
            // localStorage.setItem('groupId', String(groupId));
            // localStorage.setItem('queryId', String(queryId));
        }
    }
};

// Updates the rightpanel variables menu
function reloadRightPanelVariables() {
    variableData.length = 0;
    [...selectedVariables].forEach(function (element) {
        variableData.push({
            name: element,
            cancellable: false,
            show_op: false
        })
    });

    let qtree = $('#variableTree');
    let state = qtree.tree('getState');
    qtree.tree('loadData', variableData);
    qtree.tree('setState', state);

    resetPeek();
}

// Load stored variables into the rightpanel variable tree on initial page load
reloadRightPanelVariables();

function disableEditRecursive(node) {
    node.editable = false;
    node.cancellable = false;
    if ('children' in node) {
        for (let child of node.children) {
            child = disableEditRecursive(child);
        }
    }
    return node
}

function hideFirst(data) {
    for (let child_id in data) {
        // noinspection JSUnfilteredForInLoop
        let child = data[child_id];
        if ('children' in child) {
            child.children = hideFirst(child.children);
        }
        child['show_op'] = child_id !== "0";
    }
    return data;
}

export function addGroup(query = false) {
    // When the query argument is set, groups will be included under a 'query group'
    let movedChildren = [];
    let removeIds = [];

    // If everything is deleted, then restart the ids
    if (abstractQuery.length === 0) {
        groupId = 1;
        queryId = 1;
    }

    // Make list of children to be moved
    for (let child_id in abstractQuery) {
        let child = abstractQuery[child_id];

        // Don't put groups inside groups! Only a drag can do that.
        if (!query && child.type === 'rule') {
            movedChildren.push(child);
            removeIds.push(child_id);

            // A query grouping can, however put groups inside of groups.
        } else if (query && child.type !== 'query') {
            movedChildren.push(child);
            removeIds.push(child_id);
        }
    }
    if (movedChildren.length > 0) {
        movedChildren[0]['show_op'] = false;
    }

    // Delete elements from root directory that are moved
    for (let i = removeIds.length - 1; i >= 0; i--) {
        abstractQuery.splice(removeIds[i], 1);
    }

    if (query) {
        for (let child_id in movedChildren) {
            movedChildren[child_id] = disableEditRecursive(movedChildren[child_id]);
        }
        abstractQuery.push({
            id: String(nodeId++),
            name: 'Query ' + String(queryId++),
            operation: 'and',
            editable: true,
            cancellable: true,
            type: 'query',
            children: movedChildren,
            show_op: abstractQuery.length > 0
        });
    } else {
        abstractQuery.push({
            id: String(nodeId++),
            name: 'Group ' + String(groupId++),
            operation: 'and',
            type: 'group',
            children: movedChildren,
            show_op: abstractQuery.length > 0
        });
    }

    hideFirst(abstractQuery);

    let qtree = $('#subsetTree');
    let state = qtree.tree('getState');
    qtree.tree('loadData', abstractQuery);
    qtree.tree('setState', state);
    if (!query) {
        qtree.tree('openNode', qtree.tree('getNodeById', nodeId - 1), true);
    }
}

export function addRule() {
    let preferences = getSubsetPreferences();

    // Don't add an empty preference
    if (Object.keys(preferences).length === 0) {
        alert("No options have been selected. Please make a selection.");
        return;
    }

    common.setPanelOpen('right');

    // Don't show the boolean operator on the first element
    if (abstractQuery.length === 0) {
        preferences['show_op'] = false;
    }

    abstractQuery.push(preferences);

    let qtree = $('#subsetTree');
    let state = qtree.tree('getState');
    qtree.tree('loadData', abstractQuery);
    qtree.tree('setState', state);
    qtree.tree('closeNode', qtree.tree('getNodeById', preferences['id']), false);
}

/**
 * When a new rule is added, retrieve the preferences of the current subset panel
 * @returns {{}} : dictionary of preferences
 */
function getSubsetPreferences() {

    if (selectedCanvas === 'Custom') {
        return {
            id: String(nodeId++),
            name: 'Custom Subset',
            type: 'rule',
            subset: 'custom',
            custom: JSON.parse(canvasPreferences['Custom']['text'])
        }
    }


    let data = subsetData[selectedSubsetName];
    let metadata = genericMetadata[selectedDataset]['subsets'][selectedSubsetName];
    let preferences = subsetPreferences[selectedSubsetName];

    let subsetType = metadata['type'];

    if (subsetType === 'dyad') {
        // Make parent node
        let subset = {
            id: String(nodeId++),
            name: selectedSubsetName + ' Subset',
            operation: 'and',
            type: 'rule',
            subset: subsetType,
            children: []
        };

        // ignore edges from shared dyad menus in other datasets
        let filteredEdges = preferences['edges']
            .filter(edge => edge.source.actor in metadata['tabs'] && edge.target.actor in metadata['tabs']);

        for (let linkId in filteredEdges) {
            // Add each link to the parent node as another rule
            let link = {
                id: String(nodeId++),
                name: 'Link ' + String(linkId),
                show_op: linkId !== '0',
                operation: 'or',
                subset: 'link',
                children: [{
                    id: String(nodeId++),
                    name: Object.keys(metadata['tabs'])[0] + ': ' + filteredEdges[linkId].source.name,
                    show_op: false,
                    cancellable: false,
                    actors: [...filteredEdges[linkId].source.selected],
                    subset: 'node',
                    column: metadata['tabs'][Object.keys(metadata['tabs'])[0]]['full']
                }, {
                    id: String(nodeId++),
                    name: Object.keys(metadata['tabs'])[1] + ': ' + filteredEdges[linkId].target.name,
                    show_op: false,
                    cancellable: false,
                    actors: [...filteredEdges[linkId].target.selected],
                    subset: 'node',
                    column: metadata['tabs'][Object.keys(metadata['tabs'])[1]]['full']
                }]
            };

            // // add an entry for every checked value. Disabled for performance
            // for (let source of actorLinks[linkId].source.group) {
            //     if (source !== undefined) {
            //         link['children'][0]['children'].push({
            //             id: String(nodeId++),
            //             name: source,
            //             show_op: false
            //         });
            //     }
            // }
            //
            // for (let target of actorLinks[linkId].target.group) {
            //     if (target !== undefined) {
            //         link['children'][1]['children'].push({
            //             id: String(nodeId++),
            //             name: target,
            //             show_op: false
            //         });
            //     }
            // }

            subset['children'].push(link);
        }

        // Don't add a rule and ignore the stage if no links are made
        if (subset['children'].length === 0) return {};
        return subset
    }

    if (subsetType === 'date') {
        let datemin = data[0]['Date'];
        let datemax = data[data.length - 1]['Date'];

        // If the dates have not been modified, force bring the date from the slider
        if (preferences['userLower'] - datemin === 0 && preferences['userUpper'] - datemax === 0) {
            if (preferences['userLower'] - preferences['handleLower'] === 0 &&
                preferences['userUpper'] - preferences['handleUpper'] === 0) {
                return {};
            }

            preferences['userLower'] = preferences['handleLower'];
            preferences['userUpper'] = preferences['handleUpper'];
        }

        // For mapping numerical months to strings in the child node name
        let monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June",
            "July", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return {
            id: String(nodeId++),
            name: selectedSubsetName + ' Subset',
            type: 'rule',
            subset: subsetType,
            structure: metadata['structure'],
            children: [
                {
                    id: String(nodeId++),
                    name: 'From: ' + monthNames[preferences['userLower'].getMonth()] + ' ' + preferences['userLower'].getDate() + ' ' + String(preferences['userLower'].getFullYear()),
                    fromDate: new Date(preferences['userLower'].getTime()),
                    cancellable: false,
                    show_op: false,
                    column: coerceArray(metadata['columns'])[0]
                },
                {
                    id: String(nodeId++),
                    name: 'To:   ' + monthNames[preferences['userUpper'].getMonth()] + ' ' + preferences['userUpper'].getDate() + ' ' + String(preferences['userUpper'].getFullYear()),
                    toDate: new Date(preferences['userUpper'].getTime()),
                    cancellable: false,
                    show_op: false,
                    // If the date is an interval, the last element will be different from the first
                    column: coerceArray(metadata['columns'])[coerceArray(metadata['columns']).length - 1]
                }
            ],
            operation: 'and'
        };
    }

    if (['categorical', 'categorical_grouped'].indexOf(subsetType) !== -1) {
        // Make parent node
        let subset = {
            id: String(nodeId++),
            name: selectedSubsetName + ' Subset',
            operation: 'and',
            negate: 'false',
            column: coerceArray(metadata['columns'])[0],
            type: 'rule',
            subset: subsetType,
            children: []
        };

        // Add each selection to the parent node as another rule
        [...preferences['selections']]
            .sort((a, b) => typeof a === 'number' ? a - b : a.localeCompare(b))
            .forEach(selection => subset['children'].push({
                id: String(nodeId++),
                name: String(selection),
                show_op: false
            }));

        // Don't add a rule and ignore the stage if no selections are made
        if (subset['children'].length === 0) return {};
        return subset
    }

    if (subsetType === 'coordinates') {
        let valLeft = parseFloat(document.getElementById('lonLeft').value);
        let valRight = parseFloat(document.getElementById('lonRight').value);

        let valUpper = parseFloat(document.getElementById('latUpper').value);
        let valLower = parseFloat(document.getElementById('latLower').value);

        // Make parent node
        let subset = {
            id: String(nodeId++),
            name: selectedSubsetName + ' Subset',
            operation: 'and',
            type: 'rule',
            subset: subsetType,
            // negate: 'false',
            children: []
        };

        let latitude = {
            id: String(nodeId++),
            name: 'Latitude',
            column: coerceArray(metadata['columns'])[0],
            // negate: 'false',
            children: []
        };

        latitude.children.push({
            id: String(nodeId++),
            name: valUpper > valLower ? valUpper : valLower
        });

        latitude.children.push({
            id: String(nodeId++),
            name: valUpper < valLower ? valUpper : valLower
        });

        let longitude = {
            id: String(nodeId++),
            name: 'Longitude',
            operation: 'and',
            column: coerceArray(metadata['columns'])[1],
            // negate: 'false',
            children: []
        };

        longitude.children.push({
            id: String(nodeId++),
            name: valLeft > valRight ? valLeft : valRight
        });

        longitude.children.push({
            id: String(nodeId++),
            name: valLeft < valRight ? valLeft : valRight
        });

        subset.children.push(latitude);
        subset.children.push(longitude);

        return subset

    }
}

export function reset() {

    let scorchTheEarth = () => {
        // TAGGED: LOCALSTORE
        // localStorage.removeItem('selectedVariables');
        // localStorage.removeItem('abstractQuery');
        // localStorage.removeItem('nodeId');
        // localStorage.removeItem('groupId');
        // localStorage.removeItem('queryId');

        abstractQuery.length = 0;
        $('#subsetTree').tree('loadData', abstractQuery);

        selectedVariables.clear();
        reloadRightPanelVariables();

        nodeId = 1;
        groupId = 1;
        queryId = 1;

        Object.keys(genericMetadata[selectedDataset]['subsets']).forEach(subset => {
            subsetPreferences[subset] = {};
            subsetRedraw[subset] = true
        });
    };

    // suppress server queries from the reset button when the webpage is already reset
    if (abstractQuery.length === 0) {
        scorchTheEarth();
        return;
    }

    laddaReset.start();
    m.request({
        url: subsetURL,
        data: {
            'query': escape(JSON.stringify({})),
            'dataset': selectedDataset,
            'subset': selectedSubsetName
        },
        method: 'POST'
    }).then((jsondata) => {
        // clear all subset data. Note this is intentionally mutating the object, not rebinding it
        for (let member in subsetData) delete subsetData[member];
        scorchTheEarth();
        pageSetup(jsondata)
    }).catch(laddaStop);
}
