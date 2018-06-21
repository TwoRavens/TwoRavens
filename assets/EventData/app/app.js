import m from 'mithril';
import {dateSort} from "./views/CanvasDate";
import {
    makeAggregQuery,
    updateToAggreg
} from "./aggreg/aggreg";

import * as common from '../../common/common';

// Used for right panel query tree
import '../../../node_modules/jqtree/tree.jquery.js';
import '../../../node_modules/jqtree/jqtree.css';
import '../pkgs/jqtree/jqtree.style.css';

let production = false;

export let rappURL = '';
if (!production) {
    // base URL for the R apps:
    //rappURL = "http://localhost:8000/custom/";
    rappURL = ROOK_SVC_URL; // Note: The ROOK_SVC_URL is set by django in /templates/index.html
} else {
    rappURL = "https://beta.dataverse.org/custom/"; //this will change when/if the production host changes
}

let appname = 'eventdatasubsetapp';
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

export let isLoading = {};
export let setIsLoading = (key, state) => isLoading[key] = state;

// contains state for redrawing canvases
export let canvasPreferences = {};
export let canvasRedraw = {};
export let setCanvasRedraw = (canvas, value) => canvasRedraw[canvas] = value || false;

// Select which tab is shown in the left panel
export let setLeftTab = (tab) => leftTab = tab;
export let leftTab = 'Subsets';

common.setPanelCallback('right', () => {
    common.setPanelOcclusion('right', `calc(${common.panelOpen['right'] ? '250px' : '16px'} + 2*${common.panelMargin})`);
    handleResize();
});

common.setPanelCallback('left', () => {
    common.setPanelOcclusion('left', `calc(${common.panelOpen['left'] ? '250px' : '16px'} + 2*${common.panelMargin})`);
    handleResize();
});

export function handleResize() {
    document.getElementById('canvas').style['padding-right'] = common.panelOcclusion['right'];
    document.getElementById('canvas').style['padding-left'] = common.panelOcclusion['left'];
}

window.addEventListener('resize', handleResize);

export let selectedDataset;
export let setSelectedDataset = (key) => {
    // trigger reloading of necessary menu elements
    if (key !== selectedDataset) subsetData = {};

    selectedDataset = key;

    Object.keys(genericMetadata[selectedDataset]['subsets']).forEach(subset => {
        // ensure each subset has a place to store settings
        subsetPreferences[subset] = subsetPreferences[subset] || {};
    });

    resetPeek();
};

let modeTypes = ['subset', 'aggregate'];
export let selectedMode = "datasets";
export function setSelectedMode(mode) {
    mode = mode.toLowerCase();

    if (mode === selectedMode) return;

    // Some canvases only exist in certain modes. Fall back to default if necessary.
    if (mode === 'subset' && subsetKeys().indexOf(selectedCanvas) === -1) setSelectedSubsetName(subsetKeys()[0]);
    if (mode === 'aggregate' && aggregateKeys.indexOf(selectedCanvas) === -1) setSelectedSubsetName(subsetKeys()[0]);
    if (mode === 'datasets' && 'Datasets' !== selectedCanvas) setSelectedCanvas('Datasets');

    selectedMode = mode;

    if (mode === 'aggregate') {
        updateToAggreg(false);
    }

    m.route.set('/' + mode.toLowerCase());
}

// dictates what menu is shown, but the value of selectedSubsetName is user-defined
let subsetTypes = ['dyad', 'categorical', 'categorical_grouped', 'date', 'custom'];
export let selectedSubsetName;
export let setSelectedSubsetName = (subset) => {
    setSelectedCanvas('Subset');
    selectedSubsetName = subset;
};

let canvasTypes = ['Datasets', 'Subset', 'Time Series', 'Analysis'];
export let selectedCanvas = 'Datasets';
export let setSelectedCanvas = (canvasKey) => selectedCanvas = canvasKey;

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
    isLoading[subsetName] = true;

    let stagedSubsetData = [];
    for (let child of abstractQuery) {
        if (child.name.indexOf("Query") !== -1) {
            stagedSubsetData.push(child)
        }
    }

    let subsetMetadata = genericMetadata[selectedDataset]['subsets'][selectedSubsetName];
    // since R can't handle scalars
    let coerceArray = (value) => Array.isArray(value) ? value : [value];

    m.request({
        url: subsetURL,
        data: {
            query: JSON.stringify(buildSubset(stagedSubsetData)),
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
// TODO conditionally draw based on available aggregates
export let aggregateKeys = ["Actor", "Date", "Penta Class", "Root Code", "Time Series", "Analysis"];

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

// Don't use constraints outside of submitted queries
let stagedSubsetData = [];
for (let child of abstractQuery) {
    if (child.name.indexOf("Query") !== -1) {
        stagedSubsetData.push(child)
    }
}

// Construct queries for current subset tree
export let subsetQuery = buildSubset(stagedSubsetData);

export function setupBody() {
    laddaUpdate = Ladda.create(document.getElementById("btnUpdate"));
    laddaReset = Ladda.create(document.getElementById("btnReset"));
    laddaDownload = Ladda.create(document.getElementById("buttonDownload"));

    // this will only get used if dataset selection is loaded from localstorage, since the default is undefined
    if (selectedDataset === undefined) return;

    resetPeek();

    let query = {
        'query': JSON.stringify(subsetQuery),
        'variables': [...selectedVariables],
        'dataset': genericMetadata[selectedDataset]['key'],
        'subsets': Object.keys(genericMetadata[selectedDataset]['subsets'])
    };

    laddaReset.start();

    // Initial load of preprocessed data
    m.request({
        url: subsetURL,
        data: query,
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
function laddaStop() {
    laddaDownload.stop();
    laddaReset.stop();
    laddaUpdate.stop();
}

export function download() {

    function save(data) {
        let a = document.createElement('A');
        a.href = data.download;
        a.download = data.download.substr(data.download.lastIndexOf('/') + 1);
        document.body.appendChild(a);
        a.click();

        laddaDownload.stop();
        document.body.removeChild(a);
    }

	if (selectedMode === "subset") {
		let subsetQuery = buildSubset(abstractQuery);

		console.log("Query: " + JSON.stringify(subsetQuery));

		let query = {
			'query': JSON.stringify(subsetQuery),
			'dataset': selectedDataset,
			'type': 'raw'
		};

		// only pass projection if variables are loaded and selected
		if (selectedVariables.size !== 0) Object.assign(query, {'variables': [...selectedVariables]});

		laddaDownload.start();
        m.request({
            url: subsetURL,
            data: query,
            method: 'POST'
        }).then(save).catch(laddaStop);
	}
	else if (selectedMode === "aggregate") {
		//merge my request code with makeCorsRequest and wrap table update in function
		laddaDownload.start();
		makeAggregQuery("download", save);
	}
}

let resetPeek = () => {
    peekSkip = 0;
    peekData = [];

    peekAllDataReceived = false;
    peekIsGetting = false;

    // this will cause a redraw in the peek menu
    localStorage.removeItem('peekTableData');
};

let peekBatchSize = 100;
let peekSkip = 0;
let peekData = [];

let peekAllDataReceived = false;
let peekIsGetting = false;

if (selectedMode !== 'peek') {
    localStorage.setItem('peekHeader', (genericMetadata[selectedDataset] || {})['name']);
    localStorage.removeItem('peekTableData');
}
// localStorage.setItem('peekTableData', JSON.stringify(peekData));

let onStorageEvent = (e) => {
    if (e.key !== 'peekMore' || peekIsGetting) return;

    if (localStorage.getItem('peekMore') === 'true' && !peekAllDataReceived) {
        localStorage.setItem('peekMore', 'false');
        peekIsGetting = true;
        updatePeek();
    }
};

let updatePeek = async () => {
    let subsetQuery = buildSubset(abstractQuery);

    console.log("Peek Update");
    console.log("Query: " + JSON.stringify(subsetQuery));

    let query = {
        subsets: JSON.stringify(subsetQuery),
        skip: peekSkip,
        limit: peekBatchSize,
        dataset: selectedDataset,
        datasource: datasource,
        type: 'peek'
    };

    // conditionally pass variable projection
    if (selectedVariables.size !== 0) query['variables'] = [...selectedVariables];

    // cancel the request
    if (!peekIsGetting) return;

    let data = await m.request({
        url: subsetURL,
        data: query,
        method: 'POST'
    });

    console.log(data);
    peekIsGetting = false;

    if (data.length === 0) {
        peekAllDataReceived = true;
        return;
    }

    // for (let record of data) peekData.push(Object.keys(variableQuery).map((key) => record[key] || ""));
    peekData = peekData.concat(data);
    peekSkip += data.length;

    // this gets noticed by the peek window
    localStorage.setItem('peekHeader', selectedDataset['name']);
    localStorage.setItem('peekTableHeaders', JSON.stringify([...selectedVariables]));
    localStorage.setItem('peekTableData', JSON.stringify(peekData));
};
window.addEventListener('storage', onStorageEvent);


// we must be very particular about how months get incremented, to handle leap years etc.
export function incrementMonth(date) {
    let d = date.getDate();
    date.setMonth(date.getMonth() + 1);
    if (date.getDate() !== d) {
        date.setDate(0);
    }
    return date;
}

export let isSameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();


/**
 *   Draws all subset plots, often invoked as callback after server request for new plotting data
 */
export function pageSetup(jsondata) {
    console.log("Server returned:");
    console.log(jsondata);

    laddaUpdate.stop();
    laddaReset.stop();

    if ('total' in jsondata) totalSubsetRecords = jsondata['total'];

    Object.keys(jsondata).forEach(subset => {
        // trigger d3 replots in all subsets
        subsetRedraw[subset] = true;
    });

    Object.keys(jsondata['formats'] || {}).forEach(format => formattingData[format] = jsondata['formats'][format]);
    Object.keys(jsondata['alignments'] || {}).forEach(align => formattingData[align] = jsondata['alignments'][align]);

    let subsetType = genericMetadata[selectedDataset]['subsets'][jsondata['subsetName']]['type'];

    // todo: configuration for the categorical reformatters - they're tied to 20 atm, for example
    let reformatters = {
        'categorical': data => data
            .filter(entry => entry['<action_code>'] !== undefined)
            .reduce((out, entry) => {
                out[parseInt(entry['<action_code>']) - 1] = entry['total'];
                return(out)
            }, Array(20).fill(0)),

        'dyad': _=>_,
        'coordinates': _=>_,

        'date': data => data
            .filter(entry => !isNaN(entry['<year>'] && !isNaN(entry['<month>'])))
            .map(entry => ({'Date': new Date(entry['<year>'], entry['<month>'] - 1, 0), 'Freq': entry.total}))
            .sort(dateSort)
            .reduce((out, entry) => {
                if (out.length === 0) return [entry];
                let tempDate = incrementMonth(out[out.length - 1]['Date']);

                while (!isSameMonth(tempDate, entry['Date'])) {
                    out.push({Freq: 0, Date: new Date(tempDate)});
                    tempDate = incrementMonth(tempDate);
                }
                out.push(entry);
                return(out);
            }, []),

        'categorical_grouped': data => data
            .filter(entry => ['', undefined].indexOf(entry['<country>'] === -1))
            .reduce((out, entry) => {
                out[entry['<country>']] = entry['total'];
                return(out);
            }, {})
    };

    if (subsetType === 'dyad' && jsondata['search'])
        subsetData[jsondata['subsetName']][jsondata['tab']]['full'] = jsondata['data'];
    else
        subsetData[jsondata['subsetName']] = reformatters[subsetType](jsondata['data']);
}


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

let nodeId = 1;
let groupId = 1;
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
                let canChange = node.name.indexOf('Query') === -1 && !node.editable;
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
            let is_country = ('type' in node && node.type === 'country');
            return (node.name.indexOf('Subset') !== -1 || node.name.indexOf('Group') !== -1 || is_country);
        },
        onCanMoveTo: function (moved_node, target_node, position) {

            // Cannot move to uneditable queries
            if ('editable' in target_node && !target_node.editable) {
                return false
            }

            // Countries can be moved to child of location subset group
            if ('type' in moved_node && moved_node.type === 'country') {
                return position === 'after' && target_node.parent.name === 'Location Subset';
            }
            // Rules may be moved next to another rule or grouping
            if (position === 'after' && (target_node.name.indexOf('Subset') !== -1 || target_node.name.indexOf('Group') !== -1)) {
                return true;
            }
            // Rules may be moved inside a group or root
            // noinspection RedundantIfStatementJS
            if ((position === 'inside') && (target_node.name.indexOf('Subsets') !== -1 || target_node.name.indexOf('Group') !== -1)) {
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

            hide_first(abstractQuery);
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
                subsetPreferences['custom']['text'] = JSON.stringify(node.custom, null, '\t');
                subsetRedraw['custom'] = true;
                setSelectedCanvas("Custom");
            }

            if (event.node.hasChildren()) {
                $('#subsetTree').tree('toggle', event.node);
            }
        }
    );

    subsetTree.bind(
        'tree.dblclick',
        function (event) {
            let tempQuery = buildSubset([event.node]);
            if ($.isEmptyObject(tempQuery)) {
                alert("\"" + event.node.name + "\" is too specific to parse into a query.");
            } else {
                subsetPreferences['custom']['text'] = JSON.stringify(node.custom, null, '\t');
                subsetRedraw['custom'] = true;
                setSelectedCanvas("Custom");
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

window.callbackDelete = function (id) {
    // noinspection JSJQueryEfficiency
    let subsetTree = $('#subsetTree');
    let node = subsetTree.tree('getNodeById', id);
    if (node.name.indexOf('Query') !== -1) {
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
        hide_first(abstractQuery);

        let qtree = subsetTree;
        let state = qtree.tree('getState');
        qtree.tree('loadData', abstractQuery);
        qtree.tree('setState', state);

        if (node.name.indexOf('Query') !== -1) {

            // Don't use constraints outside of submitted queries
            stagedSubsetData = [];
            for (let child of abstractQuery) {
                if (child.name.indexOf("Query") !== -1) {
                    stagedSubsetData.push(child)
                }
            }

            let subsetQuery = buildSubset(stagedSubsetData);

            // console.log(JSON.stringify(subsetQuery));
            // console.log(JSON.stringify(variableQuery, null, '  '));

            let query = {
                'query': JSON.stringify(subsetQuery),
                'variables': [...selectedVariables],
                'dataset': selectedDataset,
                'subsets': Object.keys(genericMetadata[selectedDataset]['subsets'])
            };

            laddaUpdate.start();

            m.request({
                url: subsetURL,
                data: query,
                method: 'POST'
            }).then(pageSetup).catch(laddaStop);

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

function disable_edit_recursive(node) {
    node.editable = false;
    node.cancellable = false;
    if ('children' in node) {
        for (let child of node.children) {
            child = disable_edit_recursive(child);
        }
    }
    return node
}

function hide_first(data) {
    for (let child_id in data) {
        // noinspection JSUnfilteredForInLoop
        let child = data[child_id];
        if ('children' in child) {
            child.children = hide_first(child.children);
        }
        child['show_op'] = child_id !== "0";
    }
    return data;
}

window.addGroup = function (query = false) {
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
        if (!query && child.name.indexOf('Subset') !== -1) {
            movedChildren.push(child);
            removeIds.push(child_id);

            // A query grouping can, however put groups inside of groups.
        } else if (query && child.name.indexOf('Query') === -1) {
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
            movedChildren[child_id] = disable_edit_recursive(movedChildren[child_id]);
        }
        abstractQuery.push({
            id: String(nodeId++),
            name: 'Query ' + String(queryId++),
            operation: 'and',
            editable: true,
            cancellable: true,
            children: movedChildren,
            show_op: abstractQuery.length > 0
        });
    } else {
        abstractQuery.push({
            id: String(nodeId++),
            name: 'Group ' + String(groupId++),
            operation: 'and',
            children: movedChildren,
            show_op: abstractQuery.length > 0
        });
    }

    hide_first(abstractQuery);

    let qtree = $('#subsetTree');
    let state = qtree.tree('getState');
    qtree.tree('loadData', abstractQuery);
    qtree.tree('setState', state);
    if (!query) {
        qtree.tree('openNode', qtree.tree('getNodeById', nodeId - 1), true);
    }
};

export function addRule() {
    // Index zero is root node. Add subset pref to nodes
    if (selectedCanvas !== "") {
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
}

/**
 * When a new rule is added, retrieve the preferences of the current subset panel
 * @returns {{}} : dictionary of preferences
 */
function getSubsetPreferences() {
    let preferences = subsetPreferences[selectedSubsetName];
    let data = subsetData[selectedSubsetName];

    if (selectedCanvas === 'Date') {
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
            name: 'Date Subset',
            children: [
                {
                    id: String(nodeId++),
                    name: 'From: ' + monthNames[preferences['userLower'].getMonth()] + ' ' + preferences['userLower'].getDate() + ' ' + String(preferences['userLower'].getFullYear()),
                    fromDate: new Date(preferences['userLower'].getTime()),
                    cancellable: false,
                    show_op: false
                },
                {
                    id: String(nodeId++),
                    name: 'To:   ' + monthNames[preferences['userUpper'].getMonth()] + ' ' + preferences['userUpper'].getDate() + ' ' + String(preferences['userUpper'].getFullYear()),
                    toDate: new Date(preferences['userUpper'].getTime()),
                    cancellable: false,
                    show_op: false
                }
            ],
            operation: 'and'
        };
    }

    if (selectedCanvas === 'Location') {
        // Make parent node
        let subset = {
            id: String(nodeId++),
            name: 'Location Subset',
            operation: 'and',
            negate: 'false',
            children: []
        };

        // Add each country to the parent node as another rule
        // TODO pull from subsetPreferences
        // for (let country in mapListCountriesSelected) {
        //     if (mapListCountriesSelected[country]) {
        //         subset['children'].push({
        //             id: String(nodeId++),
        //             name: country,
        //             show_op: false
        //         });
        //     }
        // }
        // Don't add a rule and ignore the stage if no countries are selected
        if (subset['children'].length === 0) {
            return {}
        }
        return subset
    }

    if (selectedCanvas === 'Action') {
        // Make parent node
        let subset = {
            id: String(nodeId++),
            name: 'Action Subset',
            operation: 'and',
            negate: 'false',
            children: []
        };

        actionBuffer.sort(function (a, b) {
            return a - b;
        });
        // Add each action to the parent node as another rule
        for (let action of actionBuffer) {
            if (action) {
                subset['children'].push({
                    id: String(nodeId++),
                    name: action.toString(),
                    show_op: false
                });
            }
        }
        // Don't add a rule and ignore the stage if no countries are selected
        if (subset['children'].length === 0) {
            return {}
        }
        return subset
    }

    if (selectedCanvas === 'Actor') {
        // Make parent node
        let subset = {
            id: String(nodeId++),
            name: 'Actor Subset',
            operation: 'and',
            children: []
        };

        for (let linkId in preferences[selectedSubsetName]['edges']) {
            // Add each link to the parent node as another rule
            let link = {
                id: String(nodeId++),
                name: 'Link ' + String(linkId),
                show_op: linkId !== '0',
                operation: 'or',
                children: [{
                    id: String(nodeId++),
                    name: 'Source: ' + preferences[selectedSubsetName]['edges'][linkId].source.name,
                    show_op: false,
                    cancellable: false,
                    actors: [...preferences[selectedSubsetName]['edges'][linkId].source.group]
                }, {
                    id: String(nodeId++),
                    name: 'Target: ' + preferences[selectedSubsetName]['edges'][linkId].target.name,
                    show_op: false,
                    cancellable: false,
                    actors: [...preferences[selectedSubsetName]['edges'][linkId].target.group]
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
        if (subset['children'].length === 0) {
            return {}
        }

        return subset
    }

    if (selectedCanvas === 'Coordinates') {
        let valLeft = parseFloat(document.getElementById('lonLeft').value);
        let valRight = parseFloat(document.getElementById('lonRight').value);

        let valUpper = parseFloat(document.getElementById('latUpper').value);
        let valLower = parseFloat(document.getElementById('latLower').value);

        // Make parent node
        let subset = {
            id: String(nodeId++),
            name: 'Coords Subset',
            operation: 'and',
            // negate: 'false',
            children: []
        };

        let longitude = {
            id: String(nodeId++),
            name: 'Longitude',
            operation: 'and',
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

        let latitude = {
            id: String(nodeId++),
            name: 'Latitude',
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

        subset.children.push(latitude);
        subset.children.push(longitude);

        return subset

    }

    if (selectedCanvas === 'Custom') {
        return {
            id: String(nodeId++),
            name: 'Custom Subset',
            custom: JSON.parse(subsetPreferences['custom']['text'])
        }
    }
}

export function reset() {
    // suppress server queries from the reset button when the webpage is already reset
    let suppress = selectedVariables.size === 0 && abstractQuery.length === 0;

    // TAGGED: LOCALSTORE
    // localStorage.removeItem('selectedVariables');
    // localStorage.removeItem('abstractQuery');
    // localStorage.removeItem('nodeId');
    // localStorage.removeItem('groupId');
    // localStorage.removeItem('queryId');

    abstractQuery.length = 0;
    $('#subsetTree').tree('loadData', abstractQuery);

    selectedVariables.clear();
    nodeId = 1;
    groupId = 1;
    queryId = 1;

    reloadRightPanelVariables();

    if (!suppress) {
        let query = {
            'query': JSON.stringify({}),
            'variables': JSON.stringify({}),
            'dataset': selectedDataset,
            'datasource': datasource,
            'subsets': Object.keys(genericMetadata[selectedDataset]['subsets'])
        };

        laddaReset.start();

        m.request({
            url: subsetURL,
            data: query,
            method: 'POST'
        }).then(pageSetup).catch(laddaStop);
    }
}

/**
 * Makes web request for rightpanel preferences
 */
export function submitQuery(datasetChanged=false) {

    // Only construct and submit the query if new subsets have been added since last query
    let newSubsets = false;
    for (let idx in abstractQuery) {
        if (abstractQuery[idx].name.indexOf('Query') === -1) {
            newSubsets = true;
            break
        }
    }

    if (!newSubsets && !datasetChanged) {
        alert("Nothing has been staged yet! Stage your preferences before subset.");
        return;
    }

    function submitQueryCallback(jsondata) {
        // If no records match, then don't lock the preferences behind a query
        if (jsondata['total'] === 0) {
            alert("No records match your subset. Plots will not be updated.");
            return;
        }

        // clear all subset data
        subsetData = {};

        pageSetup(jsondata);

        // when requerying for switching datasets, don't make right panel edits
        if (datasetChanged) return;

        // True for adding a query group, all existing preferences are grouped under a 'query group'
        addGroup(true);

        // Add all nodes to selection
        let nodeList = [...Array(nodeId).keys()];

        let subsetTree = $('#subsetTree');
        nodeList.forEach(
            function (node_id) {
                const node = subsetTree.tree("getNodeById", node_id);

                if (node) {
                    subsetTree.tree("addToSelection", node);
                    if (node.name.indexOf('Query') === -1) node.editable = false;
                }
            }
        );

        // Redraw tree
        abstractQuery = JSON.parse(subsetTree.tree('toJson'));
        let state = subsetTree.tree('getState');
        subsetTree.tree('loadData', abstractQuery);
        subsetTree.tree('setState', state);

        // TAGGED: LOCALSTORE
        // // Store user preferences in local data
        // localStorage.setItem('selectedVariables', JSON.stringify([...selectedVariables]));
        //
        // localStorage.setItem('abstractQuery', subsetTree.tree('toJson'));
        // localStorage.setItem('nodeId', String(nodeId));
        // localStorage.setItem('groupId', String(groupId));
        // localStorage.setItem('queryId', String(queryId));
    }

    let subsetQuery = buildSubset(abstractQuery);
    console.log("Query: " + JSON.stringify(subsetQuery));

    if (datasetChanged) laddaReset.start();
    else laddaUpdate.start();

    m.request({
        url: subsetURL,
        data: {
            'type': 'summary',
            'query': JSON.stringify(subsetQuery),
            'dataset': selectedDataset,
            'subset': selectedSubsetName,
            'countRecords': true
        },
        method: 'POST'
    }).then(submitQueryCallback) // TODO re-enable catch after debugging. Possibly make this one custom/explicit because tracking this down is annoying .catch(laddaStop);
}

// Construct mongoDB filter (subsets rows)
export function buildSubset(tree) {
    // Base case
    if (tree.length === 0) return {};

    // Recursion
    let queryStack = [];
    let stagedSubsetData = [];
    for (let child of tree) {
        if (child.name.indexOf("Query") !== -1) {
            stagedSubsetData.push(child)
        } else {
            queryStack.push(child)
        }
    }

    // Treat staged subset data as just another query on the query stack
    queryStack.push({'children': stagedSubsetData, 'operation': 'and', 'name': 'New Query'});
    return processGroup({'children': queryStack})
}

// Recursively traverse the tree in the right panel. For each node, call processNode

// If node is a group, then build up the overall operator tree via processGroup
// If node is a subset, then consider it a leaf, use processRule to build query specific to subset

function processNode(node) {
    if (node.name.indexOf('Group') !== -1 && 'children' in node && node.children.length !== 0) {
        // Recursively process subgroups
        return processGroup(node);
    } else if (node.name.indexOf('Query') !== -1 && 'children' in node && node.children.length !== 0) {
        // Recursively process query
        return processGroup(node);
    }
    else {
        // Explicitly process rules
        return processRule(node);
    }
}

// Group precedence parser
// Constructs a boolean operator tree via operator precedence between siblings (for groups and queries)
function processGroup(group) {

    // all rules are 'or'ed together
    let group_query = {'$or': []};

    // strings of rules conjoined by 'and' operators are clotted in semigroups that act together as one rule
    let semigroup = [];

    for (let child_id = 0; child_id < group.children.length - 1; child_id++) {
        let op_self = group.children[child_id]['operation'];
        let op_next = group.children[child_id + 1]['operation'];

        // Clot together and operators
        if (op_self === 'and' || op_next === 'and') {
            semigroup.push(processNode(group.children[child_id]));
            if (op_next === 'or') {
                group_query['$or'].push({'$and': semigroup.slice()});
                semigroup = [];
            }
        }

        // If not part of an 'and' clot, simply add to the query
        if (op_self === 'or' && op_next === 'or') {
            group_query['$or'].push(processNode(group.children[child_id]));
        }
    }

    // Process final sibling
    if (group.children.length > 0 && group.children[group.children.length - 1]['operation'] === 'and') {
        semigroup.push(processNode(group.children[group.children.length - 1]));
        group_query['$or'].push({'$and': semigroup.slice()})

    } else {
        group_query['$or'].push(processNode(group.children[group.children.length - 1]));
    }

    // Remove unnecessary conjunctions
    if (group_query['$or'].length === 1) {
        group_query = group_query['$or'][0]
    }
    if ('$and' in group_query && group_query['$and'].length === 1) {
        group_query = group_query['$and'][0]
    }

    return group_query;
}

// Return a mongoDB query for a rule data structure
function processRule(rule) {
    let rule_query = {};

    if (rule.name === 'Date Subset') {
        let date_schema = genericMetadata[selectedDataset]['subsets'][selectedSubsetName]['format'];

        // construct a query that works for separate year, month and day fields
        if (date_schema === 'fields') {
            let lower_bound = {};
            let upper_bound = {};
            for (let child of rule.children) {

                if ('fromDate' in child) {
                    child.fromDate = new Date(child.fromDate);
                    // Not a pretty solution, but it prevents aggregation substring slicing or regexes
                    lower_bound['$or'] = [
                        {'<year>': {'$gt': pad(child.fromDate.getFullYear())}},
                        {
                            '<year>': pad(child.fromDate.getFullYear()),
                            '<month>': {'$gte': pad(child.fromDate.getMonth() + 1)}
                        },
                        {
                            '<year>': pad(child.fromDate.getFullYear()),
                            '<month>': pad(child.fromDate.getMonth() + 1),
                            '<day>': {'$gte': pad(child.fromDate.getDate())}
                        }]
                }
                if ('toDate' in child) {
                    child.toDate = new Date(child.toDate);
                    upper_bound['$or'] = [
                        {'<year>': {'$lt': pad(child.toDate.getFullYear())}},
                        {
                            '<year>': pad(child.toDate.getFullYear()),
                            '<month>': {'$lte': pad(child.toDate.getMonth() + 1)}
                        },
                        {
                            '<year>': pad(child.toDate.getFullYear()),
                            '<month>': pad(child.toDate.getMonth() + 1),
                            '<day>': {'$lte': pad(child.toDate.getDate())}
                        }]
                }
            }
            rule_query['$and'] = [lower_bound, upper_bound];
        }

        // construct a query that works for string date fields
        else if (date_schema === 'YYYYMMDD' || /YYYY.MM.DD/.test(date_schema)) {
            let rule_query_inner = {};
            for (let child of rule.children) {

                let formatDate = (date) => {
                    if (date_schema === 'YYYYMMDD')
                        return date.getFullYear().toString() +
                            pad(date.getMonth() + 1) +
                            pad(date.getDate());
                    return date.getFullYear().toString() + date_schema[4] +
                        pad(date.getMonth() + 1) + date_schema[6] +
                        pad(date.getDate())
                };

                if ('fromDate' in child) {
                    // There is an implicit cast somewhere in the code, and I cannot find it.
                    child.fromDate = new Date(child.fromDate);
                    rule_query_inner['$gte'] = formatDate(child.fromDate);
                }

                if ('toDate' in child) {
                    // There is an implicit cast somewhere in the code, and I cannot find it. This normalizes
                    child.toDate = new Date(child.toDate);
                    rule_query_inner['$lte'] = formatDate(child.toDate);
                }
            }
            rule_query['<date>'] = rule_query_inner;
        }
    }

    if (rule.name === 'Location Subset') {
        let rule_query_inner = [];
        for (let child of rule.children) {
            rule_query_inner.push(child.name);
        }

        rule_query_inner = {'$in': rule_query_inner};
        if ('negate' in rule && !rule.negate) {
            rule_query_inner = {'$not': rule_query_inner};
        }

        rule_query['<country>'] = rule_query_inner;
    }

    if (rule.name === 'Action Subset') {
        let rule_query_inner = [];

        if (genericMetadata[selectedDataset]['subsets'][selectedSubsetName]['format'] === 'CAMEO root code') {
            for (let child of rule.children) {
                rule_query_inner.push(pad(parseInt(child.name)));
            }
            rule_query_inner = {'$in': rule_query_inner};

            if ('negate' in rule && !rule.negate) {
                rule_query_inner = {'$not': rule_query_inner};
            }

            rule_query['<root_code>'] = rule_query_inner;
        }

        if (genericMetadata[selectedDataset]['subsets'][selectedSubsetName]['action'] === "CAMEO") {
            let prefixes = [];
            for (let child of rule.children) {
                prefixes.push(pad(parseInt(child.name)));
            }
            rule_query_inner = {'$regex': '^(' + prefixes.join('|') + ')'};

            if ('negate' in rule && !rule.negate) {
                rule_query_inner = {'$not': rule_query_inner};
            }

            rule_query['<root_code>'] = rule_query_inner;
        }
    }

    // Actor subset is itself a group of links. A link is a hardcoded group, and source/target lists are leaf nodes
    if (rule.name === 'Actor Subset') {
        return processGroup(rule);
    }

    if (rule.name.indexOf('Link ') !== -1) {
        return {'$and': [
                processNode(rule.children[0]),
                processNode(rule.children[1])
            ]
        };
    }

    if (rule.name.indexOf('Source: ') !== -1) {
        return {'<source>':  {'$in': rule.actors}}
    }

    if (rule.name.indexOf('Target: ') !== -1) {
        return {'<target>':  {'$in': rule.actors}}
    }

    if (rule.name === 'Coords Subset') {
        // The only implemented coordinates unit type is signed degrees
        if (genericMetadata[selectedDataset]['subsets'][selectedSubsetName]['format'] !== 'signed degrees')
            console.log("invalid format: " + genericMetadata[selectedDataset]['subsets'][selectedSubsetName]['format']);

        let rule_query_inner = [];

        for (let child of rule.children) {
            if (child.name === 'Latitude') {
                let latitude = {
                    '<latitude>': {
                        '$lte': parseFloat(child.children[0].name),
                        '$gte': parseFloat(child.children[1].name)
                    }
                };

                if ('negate' in child && !child.negate) {
                    latitude = {'$not': latitude};
                }
                rule_query_inner.push(latitude);

            } else if (child.name === 'Longitude') {
                let longitude = {
                    '<longitude>': {
                        '$lte': parseFloat(child.children[0].name),
                        '$gte': parseFloat(child.children[1].name)
                    }
                };

                if ('negate' in child && !child.negate) {
                    longitude = {'$not': longitude};
                }
                rule_query_inner.push(longitude);
            }
        }

        if ('negate' in rule && !rule.negate) {
            rule_query_inner = {'$not': rule_query_inner};
        }

        rule_query['$and'] = rule_query_inner;
    }

    if (rule.name === 'Custom Subset') {
        // makes a copy and validates json
        rule_query = JSON.parse(JSON.stringify(rule.custom));
        console.log(rule_query);
    }

    return rule_query;
}

// Convert number to string with at least length 2
function pad(number) {
    if (number <= 9) {
        return ("0" + number.toString());
    }
    else {
        return number.toString()
    }
}
