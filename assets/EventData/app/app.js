import m from 'mithril'

import {resetActionCounts, actionBuffer, drawGraphs, updateData} from "./subsets/Action";
import {updateActor, actorLinks, resizeActorSVG} from "./subsets/Actor";
import {updateDate, datemax, datemaxUser, datemin, dateminUser, setDatefromSlider} from "./subsets/Date";
import {updateLocation, mapListCountriesSelected} from "./subsets/Location";
import {setAggregMode, updateAggregTable, makeAggregQuery, aggregPentaChkOrd, aggregRootChkOrd} from "./aggreg/aggreg";
import {
    panelMargin, panelOcclusion, panelOpen, scrollBarChanged, setPanelCallback,
    setPanelOcclusion
} from "../../common/app/common";

// Used for custom query editor
import '../../../node_modules/ace-builds/src-min-noconflict/ace.js'

// Used for right panel query tree
import '../../../node_modules/jqtree/tree.jquery.js'
import '../../../node_modules/jqtree/jqtree.css'
import '../pkgs/jqtree/jqtree.style.css'

// Select which tab is shown in the left panel
export let setLeftTab = (tab) => leftTab = tab;
export let leftTab = 'Subsets';

setPanelCallback('right', () => {
    setPanelOcclusion('right', `calc(${panelOpen['right'] ? '250px' : '16px'} + ${2 * panelMargin}px)`);
    handleResize();
});

setPanelCallback('left', () => {
    setPanelOcclusion('left', `calc(${panelOpen['left'] ? '250px' : '16px'} + ${2 * panelMargin}px)`);
    handleResize();
});

export function handleResize() {
    document.getElementById('canvas').style['padding-right'] = panelOcclusion['right'];
    document.getElementById('canvas').style['padding-left'] = panelOcclusion['left'];
    if (canvasKeySelected === 'Actor') {
        resizeActorSVG();
    }

    if (canvasKeySelected === "Action") {
        drawGraphs();
        updateData();
    }
}

export let opMode = "subset";

export function setOpMode(mode) {
    if (['subset', 'aggregate'].indexOf(mode) !== -1) {
        opMode = mode;
    } else {
        console.log("Invalid opmode");
    }
}

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

export function setDataset(dataset) {
    localStorage.setItem('dataset', {
            'Phoenix - UTDallas': 'phoenix_rt',
            'Cline - New York Times': 'cline_phoenix_nyt',
            'Cline - CIA Broadcast': 'cline_phoenix_fbis',
            'Cline - BBC Summary': 'cline_phoenix_swb',
            'ICEWS': 'icews'
        }[dataset]
    );
    window.location.reload(false);
}

// Options: one of ["phoenix_rt", "cline_phoenix_swb", "cline_phoenix_nyt", "cline_phoenix_fbis", "icews"]
export let dataset = 'phoenix_rt';
if (localStorage.getItem("dataset") !== null) {
    dataset = localStorage.getItem('dataset');
}

// Options: "api" or "local"
export let datasource = 'api';

export let subsetKeys = ["Actor", "Date", "Action", "Location", "Coordinates", "Custom"]; // Used to label buttons in the left panel
export let aggregateKeys = ["Actor", "Date", "Penta Class", "Root Code"];
export let canvasKeySelected = "Actor";

export let variables;

// These get instantiated in the oncreate() method for the mithril Body_EventData class
export let laddaSubset;
export let laddaReset;
export let laddaDownload;

export let variablesSelected = new Set();

// Stores the live data returned from the server
export let dateData = [];
export let countryData = [];
export let actionData = [];
export let actorData = {
    'source': {
        full: [],
        entities: [],
        roles: [],
        attributes: []
    },
    'target': {
        full: [],
        entities: [],
        roles: [],
        attributes: []
    }
};

// This is set once data is loaded and the graphs can be drawn. Subset menus will not be shown until this is set
export let initialLoad = false;

export let subsetData = [];

// TAGGED: LOCALSTORE
// // Attempt to load stored settings
// if (localStorage.getItem("subsetData") !== null) {
//     // Since the user has already submitted a query, restore the previous preferences from local data
//     // All stored data is cleared on reset
//     variablesSelected = new Set(JSON.parse(localStorage.getItem('variablesSelected')));
//     subsetData = JSON.parse(localStorage.getItem('subsetData'));
// }

// Don't use constraints outside of submitted queries
let stagedSubsetData = [];
for (let child of subsetData) {
    if (child.name.indexOf("Query") !== -1) {
        stagedSubsetData.push(child)
    }
}

// Construct queries for current subset tree
export let variableQuery = buildVariables();
export let subsetQuery = buildSubset(stagedSubsetData);

console.log("Query: " + JSON.stringify(subsetQuery));

// The editor will be initialized on body setup
export var editor;

export function setupBody() {
    // The editor menu for the custom subsets
    editor = ace.edit("subsetCustomEditor");

    let query = {
        'type': 'formatted',
        'dataset': dataset,
        'datasource': datasource
    };

    // Load the field names into the left panel
    makeCorsRequest(subsetURL, query, function (jsondata) {
        // Each key has a %-formatted value
        variables = Object.keys(jsondata.variables);
        reloadLeftpanelVariables();
    });

    laddaSubset = Ladda.create(document.getElementById("btnSubsetSubmit"));
    laddaReset = Ladda.create(document.getElementById("btnReset"));
    laddaDownload = Ladda.create(document.getElementById("buttonDownload"));
    laddaReset.start();

    document.getElementById("datasetLabel").innerHTML = dataset + " dataset";

    query = {
        'subsets': JSON.stringify(subsetQuery),
        'variables': JSON.stringify(variableQuery),
        'dataset': dataset,
        'datasource': datasource
    };

    // Initial load of preprocessed data
    makeCorsRequest(subsetURL, query, pageSetup);
}

export let matchedVariables = [];

export function reloadLeftpanelVariables() {
    if (opMode !== 'subset') return;

    let search_term = document.getElementById('searchVariables').value.toUpperCase();
    // Subset variable list by search term. Empty string returns all.
    matchedVariables.length = 0;

    for (let variable of variables) {
        if (variable.toUpperCase().indexOf(search_term) !== -1) {
            matchedVariables.push(variable)
        }
    }
    m.redraw();
}

export function toggleVariableSelected(variable) {
    if (variablesSelected.has(variable)) {
        variablesSelected.delete(variable);
    } else {
        variablesSelected.add(variable);
    }
    reloadRightPanelVariables();
}

export function showCanvas(canvasKey) {
    canvasKeySelected = canvasKey;

    // Typically 1. update state 2. mithril redraw. Therefore graphs get drawn on a display:none styled div
    // Graphs depend on the the div width, so this causes them to render improperly.
    // Setting the div visible before the state change fixes collapsing graphs.
    for (let child of document.getElementById('canvas').children) child.style.display = 'none';

    if (!initialLoad) {
        alert("Resources are still being loaded from the server. Canvases will be available once resources have been loaded.");
    } else {

        if (canvasKeySelected === "Action") {
            document.getElementById('canvasAction').style.display = 'inline';
            drawGraphs();
            updateData();
        }

        if (canvasKeySelected === "Actor") {
            document.getElementById('canvasActor').style.display = 'inline';
            resizeActorSVG();
        }

        if (canvasKeySelected === "Penta Class") {
			console.log("in penta canvas");
			setAggregMode("penta");
			$(".aggregDataRoot").hide();
			//~ for (let x = 0; x <= 4; x ++) {
				//~ console.log("showing penta table");
				//~ if ($("#aggregPenta" + x).prop("checked")) {
					//~ $(".aggregDataPenta" + x).show();
				//~ }
			//~ }
			console.log(aggregPentaChkOrd);
			$("#aggregPentaAll").prop("indeterminate", false);
			if (aggregPentaChkOrd[0] == 0)
				$("#aggregPentaAll").prop("checked", false);
			else if (aggregPentaChkOrd[0] == 2)
				$("#aggregPentaAll").prop("indeterminate", true);
			for (let x = 0; x < aggregPentaChkOrd.length - 1; x ++) {
				if (aggregPentaChkOrd[x + 1] == 0) {
					console.log("hiding penta " + x);
					$("#aggregPenta" + x).prop("checked", false);
					$(".aggregDataPenta" + x).hide();
				}
				else {
					console.log("showing penta " + x);
					$("#aggregPenta" + x).prop("checked", true);
					$(".aggregDataPenta" + x).show();
				}
			}
			updateAggregTable();
		}
		else if (canvasKeySelected === "Root Code") {
			console.log("in root canvas");
			setAggregMode("root");
			$(".aggregDataPenta").hide();
			//~ for (let x = 1; x <= 20; x ++) {
				//~ if ($("#aggregRoot" + x).prop("checked")) {
					//~ $(".aggregDataRoot" + x).show();
				//~ }
			//~ }
			console.log(aggregRootChkOrd);
			$("#aggregRootAll").prop("indeterminate", false);
			if (aggregRootChkOrd[0] == 0)
				$("#aggregRootAll").prop("checked", false);
			else if (aggregRootChkOrd[0] == 2)
				$("#aggregRootAll").prop("indeterminate", true);
			for (let x = 1; x < aggregRootChkOrd.length; x ++) {
				if (aggregRootChkOrd[x] == 0) {
					console.log("hiding root " + x);
					$("#aggregRoot" + x).prop("checked", false);
					$(".aggregDataRoot" + x).hide();
				}
				else {
					console.log("showing root " + x);
					$("#aggregRoot" + x).prop("checked", true);
					$(".aggregDataRoot" + x).show();
				}
			}
			updateAggregTable();
		}
    }
}

export function makeCorsRequest(url, post, callback) {
    let xhr = new XMLHttpRequest();
    if ("withCredentials" in xhr) {
        // XHR for Chrome/Firefox/Opera/Safari.
        xhr.open('POST', url, true);
    } else if (typeof XDomainRequest !== "undefined") {
        // XDomainRequest for IE.
        xhr = new XDomainRequest();
        xhr.open('POST', url);
    } else {
        // CORS not supported.
        xhr = null;
    }
    xhr.setRequestHeader('Content-Type', 'text/json');

    if (!xhr) {
        alert('CORS not supported');
        return;
    }

    xhr.onload = function () {
        let text = xhr.responseText;
        let json = '';
        let names = [];

        try {
            json = JSON.parse(text);
            names = Object.keys(json);
        }
        catch (err) {
            console.log(err);
            alert('Error: Could not parse incoming JSON.');
        }
        if (names[0] === "warning") {
            console.log(json.warning);
            alert('Warning: Additional information in console.')
        }
        callback(json);
    };

    xhr.onerror = function () {
        // note: xhr.readystate should be 4, and status should be 200.
        // xhr.status should not be zero
        alert("There was an error making the data request. \nDebugging information has been logged.");
        console.log(xhr);
    };
    xhr.send('solaJSON=' + JSON.stringify(post));
}

export function download() {
	console.log("in download func");
	console.log(opMode);

    function save(data) {
        let a = document.createElement('A');
        a.href = data.download;
        a.download = data.download.substr(data.download.lastIndexOf('/') + 1);
        document.body.appendChild(a);
        a.click();

        laddaDownload.stop();
        document.body.removeChild(a);
    }

	if (opMode === "subset") {
		console.log("making subset download");
		let variableQuery = buildVariables();
		let subsetQuery = buildSubset(subsetData);

		console.log("Query: " + JSON.stringify(subsetQuery));
		console.log("Projection: " + JSON.stringify(variableQuery));

		let query = {
			'subsets': JSON.stringify(subsetQuery),
			'variables': JSON.stringify(variableQuery),
			'dataset': dataset,
			'datasource': datasource,
			'type': 'raw'
		};
		laddaDownload.start();
		makeCorsRequest(subsetURL, query, save);
	}
	else if (opMode === "aggregate") {
		console.log("making aggreg download");
		//merge my request code with makeCorsRequest and wrap table update in function
		laddaDownload.start();
		makeAggregQuery("download", save);
	}
}


/**
 *   Draws all subset plots, often invoked as callback after server request for new plotting data
 */
export function pageSetup(jsondata) {
    console.log("Server returned:");
    console.log(jsondata);

    laddaSubset.stop();
    laddaReset.stop();

    if (jsondata['date_data'].length === 0) {
        alert("No records match your subset. Plots will not be updated.");
        return false;
    }

    dateData = jsondata['date_data'];

    countryData = {};
    for (let entry of jsondata['country_data']) {
        let country = entry['<country_code>'];
        if (country === "" || country === undefined) continue;
        countryData[entry['<country_code>']] = entry.total
    }

    actionData = {};
    for (let i = 1; i <= 20; i++) actionData[i] = 0;
    for (let entry of jsondata['action_data']) {
        actionData[parseInt(entry['<root_code>'])] = entry.total
    }

    // assign to actorData
    actorData = jsondata['actor_data'];

    updateActor();
    updateDate();
    updateLocation();
    resetActionCounts();

    if (canvasKeySelected === 'Action') {
        drawGraphs();
        updateData();
    }

    // If first load of data, user may have selected a subset and is waiting. Render page now that data is available
    if (!initialLoad) {
        initialLoad = true;

        showCanvas(canvasKeySelected);
        if (canvasKeySelected === 'Actor') resizeActorSVG();
    }

    let total_records = 0;
    for (let record of dateData) {
        total_records += record['total'];
    }

    document.getElementById('recordCount').innerHTML = total_records + " records";
    m.redraw();
    return true;
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
// names of variables comes from 'variablesSelected' variable
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
        data: subsetData,
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
            subsetData = JSON.parse(subsetTree.tree('toJson'));

            hide_first(subsetData);
            let state = subsetTree.tree('getState');
            subsetTree.tree('loadData', subsetData);
            subsetTree.tree('setState', state);
        }
    );

    subsetTree.on(
        'tree.click',
        function (event) {
            let node = event.node;
            if (node.name === 'Custom Subset') {
                editor.set(JSON.parse(node.custom));
                showCanvas("Custom");
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
                editor.setValue(JSON.stringify(tempQuery, null, '\t'));
                editor.clearSelection();
                showCanvas("Custom");
                m.redraw();
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

    subsetData = JSON.parse(subsetTree.tree('toJson'));
    let state = subsetTree.tree('getState');
    subsetTree.tree('loadData', subsetData);
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
    subsetData = JSON.parse(subsetTree.tree('toJson'));
    let state = subsetTree.tree('getState');
    subsetTree.tree('loadData', subsetData);
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

        subsetData = JSON.parse(subsetTree.tree('toJson'));
        hide_first(subsetData);

        let qtree = subsetTree;
        let state = qtree.tree('getState');
        qtree.tree('loadData', subsetData);
        qtree.tree('setState', state);

        if (node.name.indexOf('Query') !== -1) {

            // Don't use constraints outside of submitted queries
            stagedSubsetData = [];
            for (let child of subsetData) {
                if (child.name.indexOf("Query") !== -1) {
                    stagedSubsetData.push(child)
                }
            }

            let variableQuery = buildVariables();
            let subsetQuery = buildSubset(stagedSubsetData);

            console.log(JSON.stringify(subsetQuery));
            console.log(JSON.stringify(variableQuery, null, '  '));

            let query = {
                'subsets': JSON.stringify(subsetQuery),
                'variables': JSON.stringify(variableQuery),
                'dataset': dataset,
                'datasource': datasource
            };

            laddaSubset.start();
            makeCorsRequest(subsetURL, query, pageSetup);

            if (subsetData.length === 0) {
                groupId = 1;
                queryId = 1;
            }

            // TAGGED: LOCALSTORE
            // // Store user preferences in local data
            // localStorage.setItem('variablesSelected', JSON.stringify([...variablesSelected]));
            //
            // localStorage.setItem('subsetData', $('#subsetTree').tree('toJson'));
            // localStorage.setItem('nodeId', String(nodeId));
            // localStorage.setItem('groupId', String(groupId));
            // localStorage.setItem('queryId', String(queryId));
        }
    }
};

// Updates the rightpanel variables menu
function reloadRightPanelVariables() {
    variableData.length = 0;
    [...variablesSelected].forEach(function (element) {
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
    if (subsetData.length === 0) {
        groupId = 1;
        queryId = 1;
    }

    // Make list of children to be moved
    for (let child_id in subsetData) {
        let child = subsetData[child_id];

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
        subsetData.splice(removeIds[i], 1);
    }

    if (query) {
        for (let child_id in movedChildren) {
            movedChildren[child_id] = disable_edit_recursive(movedChildren[child_id]);
        }
        subsetData.push({
            id: String(nodeId++),
            name: 'Query ' + String(queryId++),
            operation: 'and',
            editable: true,
            cancellable: true,
            children: movedChildren,
            show_op: subsetData.length > 0
        });
    } else {
        subsetData.push({
            id: String(nodeId++),
            name: 'Group ' + String(groupId++),
            operation: 'and',
            children: movedChildren,
            show_op: subsetData.length > 0
        });
    }

    hide_first(subsetData);

    let qtree = $('#subsetTree');
    let state = qtree.tree('getState');
    qtree.tree('loadData', subsetData);
    qtree.tree('setState', state);
    if (!query) {
        qtree.tree('openNode', qtree.tree('getNodeById', nodeId - 1), true);
    }
};

export function addRule() {
    // Index zero is root node. Add subset pref to nodes
    if (canvasKeySelected !== "") {
        let preferences = getSubsetPreferences();

        // Don't add an empty preference
        if (Object.keys(preferences).length === 0) {
            alert("No options have been selected. Please make a selection.");
            return;
        }

        if ($('#rightpanel').hasClass('closepanel')) toggleRightPanel();

        // Don't show the boolean operator on the first element
        if (subsetData.length === 0) {
            preferences['show_op'] = false;
        }

        subsetData.push(preferences);

        let qtree = $('#subsetTree');
        let state = qtree.tree('getState');
        qtree.tree('loadData', subsetData);
        qtree.tree('setState', state);
        qtree.tree('closeNode', qtree.tree('getNodeById', preferences['id']), false);
    }
}

/**
 * When a new rule is added, retrieve the preferences of the current subset panel
 * @returns {{}} : dictionary of preferences
 */
function getSubsetPreferences() {
    if (canvasKeySelected === 'Date') {

        // If the dates have not been modified, force bring the date from the slider
        if (dateminUser - datemin === 0 && datemaxUser - datemax === 0) {
            setDatefromSlider();

            // Ignore the rule if dates are still not modified
            if (dateminUser - datemin === 0 && datemaxUser - datemax === 0) {
                return {};
            }
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
                    name: 'From: ' + monthNames[dateminUser.getMonth()] + ' ' + dateminUser.getDate() + ' ' + String(dateminUser.getFullYear()),
                    fromDate: new Date(dateminUser.getTime()),
                    cancellable: false,
                    show_op: false
                },
                {
                    id: String(nodeId++),
                    name: 'To:   ' + monthNames[datemaxUser.getMonth()] + ' ' + datemaxUser.getDate() + ' ' + String(datemaxUser.getFullYear()),
                    toDate: new Date(datemaxUser.getTime()),
                    cancellable: false,
                    show_op: false
                }
            ],
            operation: 'and'
        };
    }

    if (canvasKeySelected === 'Location') {
        // Make parent node
        let subset = {
            id: String(nodeId++),
            name: 'Location Subset',
            operation: 'and',
            negate: 'false',
            children: []
        };

        // Add each country to the parent node as another rule
        for (let country in mapListCountriesSelected) {
            if (mapListCountriesSelected[country]) {
                subset['children'].push({
                    id: String(nodeId++),
                    name: country,
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

    if (canvasKeySelected === 'Action') {
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

    if (canvasKeySelected === 'Actor') {
        // Make parent node
        let subset = {
            id: String(nodeId++),
            name: 'Actor Subset',
            operation: 'and',
            children: []
        };
        // Add each link to the parent node as another rule
        for (let linkId in actorLinks) {
            let link = {
                id: String(nodeId++),
                name: 'Link ' + String(linkId + 1),
                show_op: linkId !== 0,
                operation: 'or',
                children: [{
                    id: String(nodeId++),
                    name: 'Source: ' + actorLinks[linkId].source.name,
                    show_op: false,
                    cancellable: false,
                    children: []
                }, {
                    id: String(nodeId++),
                    name: 'Target: ' + actorLinks[linkId].target.name,
                    show_op: false,
                    cancellable: false,
                    children: []
                }]
            };

            for (let source of actorLinks[linkId].source.group) {
                if (source !== undefined) {
                    link['children'][0]['children'].push({
                        id: String(nodeId++),
                        name: source,
                        show_op: false
                    });
                }
            }

            for (let target of actorLinks[linkId].target.group) {
                if (target !== undefined) {
                    link['children'][1]['children'].push({
                        id: String(nodeId++),
                        name: target,
                        show_op: false
                    });
                }
            }
            subset['children'].push(link);
        }

        // Don't add a rule and ignore the stage if no links are made
        if (subset['children'].length === 0) {
            return {}
        }

        return subset
    }

    if (canvasKeySelected === 'Coordinates') {
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

    // This functionality is disabled, because the stage button is hidden
    if (canvasKeySelected === 'Custom') {
        // noinspection JSUnresolvedFunction
        if (validateCustom(editor.getValue())) {
            return {
                id: String(nodeId++),
                name: 'Custom Subset',
                custom: JSON.stringify(editor.getValue())
            }
        } else {
            return {}
        }
    }
}

export function reset() {
    // suppress server queries from the reset button when the webpage is already reset
    let suppress = variablesSelected.size === 0 && subsetData.length === 0;

    // TAGGED: LOCALSTORE
    // localStorage.removeItem('variablesSelected');
    // localStorage.removeItem('subsetData');
    // localStorage.removeItem('nodeId');
    // localStorage.removeItem('groupId');
    // localStorage.removeItem('queryId');

    subsetData.length = 0;
    $('#subsetTree').tree('loadData', subsetData);

    variablesSelected.clear();
    nodeId = 1;
    groupId = 1;
    queryId = 1;

    reloadLeftpanelVariables();
    reloadRightPanelVariables();

    if (!suppress) {
        let query = {
            'subsets': JSON.stringify({}),
            'variables': JSON.stringify({}),
            'dataset': dataset,
            'datasource': datasource
        };

        laddaReset.start();
        makeCorsRequest(subsetURL, query, pageSetup);
    }
}

/**
 * Makes web request for rightpanel preferences
 */
export function submitQuery() {

    // Only construct and submit the query if new subsets have been added since last query
    let newSubsets = false;
    for (let idx in subsetData) {
        if (subsetData[idx].name.indexOf('Query') === -1) {
            newSubsets = true;
            break
        }
    }

    if (!newSubsets) {
        alert("Nothing has been staged yet! Stage your preferences before subset.");
        return;
    }

    function submitQueryCallback(jsondata) {
        let subsetTree = $('#subsetTree');

        // If page setup failed, then don't lock the preferences behind a query
        if (!pageSetup(jsondata)) return;

        // True for adding a query group, all existing preferences are grouped under a 'query group'
        addGroup(true);

        // Add all nodes to selection
        let nodeList = [...Array(nodeId).keys()];

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
        subsetData = JSON.parse(subsetTree.tree('toJson'));
        let state = subsetTree.tree('getState');
        subsetTree.tree('loadData', subsetData);
        subsetTree.tree('setState', state);

        // TAGGED: LOCALSTORE
        // // Store user preferences in local data
        // localStorage.setItem('variablesSelected', JSON.stringify([...variablesSelected]));
        //
        // localStorage.setItem('subsetData', subsetTree.tree('toJson'));
        // localStorage.setItem('nodeId', String(nodeId));
        // localStorage.setItem('groupId', String(groupId));
        // localStorage.setItem('queryId', String(queryId));
    }

    let variableQuery = buildVariables();
    let subsetQuery = buildSubset(subsetData);

    console.log("Query: " + JSON.stringify(subsetQuery));
    // console.log(JSON.stringify(variableQuery, null, '  '));

    let query = {
        'subsets': JSON.stringify(subsetQuery),
        'variables': JSON.stringify(variableQuery),
        'dataset': dataset,
        'datasource': datasource,
        'type': 'sample'
    };

    laddaSubset.start();
    makeCorsRequest(subsetURL, query, submitQueryCallback);
}

// Construct mongoDB selection (subsets columns)
function buildVariables() {
    let fieldQuery = {};
    let variablelist = [...variablesSelected];

    // Select all fields if none selected
    if (variablelist.length === 0) {
        variablelist = variables;
    }

    for (let idx in variablelist) {
        fieldQuery[variablelist[idx]] = 1;
    }

    return fieldQuery;
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

        // The cline sets have year at the end of the date string, so it takes some additional work
        if (['cline_phoenix_nyt', 'cline_phoenix_swb', 'cline_phoenix_fbis'].indexOf(dataset) !== -1) {
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

        // Just a simple string sort
        else {
            let rule_query_inner = {};
            for (let child of rule.children) {

                let phoenixDate = function (date) {
                    return date.getFullYear().toString() +
                        pad(date.getMonth() + 1) +
                        pad(date.getDate());
                };

                let icewsDate = function (date) {
                    return date.getFullYear().toString() + '-' +
                        pad(date.getMonth() + 1) + '-' +
                        pad(date.getDate())
                };

                if ('fromDate' in child) {
                    // There is an implicit cast somewhere in the code, and I cannot find it.
                    child.fromDate = new Date(child.fromDate);
                    if (dataset === "icews") rule_query_inner['$gte'] = icewsDate(child.fromDate);
                    if (dataset === "phoenix_rt") rule_query_inner['$gte'] = phoenixDate(child.fromDate);
                }

                if ('toDate' in child) {
                    // There is an implicit cast somewhere in the code, and I cannot find it. This normalizes
                    child.toDate = new Date(child.toDate);
                    if (dataset === "icews") rule_query_inner['$lte'] = icewsDate(child.toDate);
                    if (dataset === "phoenix_rt") rule_query_inner['$lte'] = phoenixDate(child.toDate);
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

        if (dataset === "icews") {
            rule_query['<country>'] = rule_query_inner;
        }
        if (['phoenix_rt', 'cline_phoenix_fbis', 'cline_phoenix_nyt', 'cline_phoenix_swb'].indexOf(dataset) !== -1) {
            rule_query['<country_code>'] = rule_query_inner;
        }
    }

    if (rule.name === 'Action Subset') {
        let rule_query_inner = [];
        if (['phoenix_rt', 'cline_phoenix_fbis', 'cline_phoenix_nyt', 'cline_phoenix_swb'].indexOf(dataset) !== -1) {
            for (let child of rule.children) {
                rule_query_inner.push(pad(parseInt(child.name)));
            }
            rule_query_inner = {'$in': rule_query_inner};

            if ('negate' in rule && !rule.negate) {
                rule_query_inner = {'$not': rule_query_inner};
            }

            rule_query['<root_code>'] = rule_query_inner;
        }

        if (dataset === "icews") {
            let prefixes = [];
            for (let child of rule.children) {
                prefixes.push(pad(parseInt(child.name)));
            }
            rule_query_inner = {'$regex': '^(' + prefixes.join('|') + ')'};

            if ('negate' in rule && !rule.negate) {
                rule_query_inner = {'$not': rule_query_inner};
            }

            rule_query['<cameo>'] = rule_query_inner;
        }
    }

    if (rule.name === 'Actor Subset') {
        let link_list = [];
        for (let child of rule.children) {
            let link_rule = {};

            let sourceList = [];
            for (let child_source of child.children[0].children) {
                sourceList.push(child_source.name);
            }
            link_rule['<source>'] = {'$in': sourceList};

            let targetList = [];
            for (let child_target of child.children[1].children) {
                targetList.push(child_target.name)
            }
            link_rule['<target>'] = {'$in': targetList};

            link_list.push(link_rule)
        }
        rule_query['$and'] = link_list;
    }

    if (rule.name === 'Coords Subset') {

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
        rule_query = JSON.parse(rule.custom.replace(/\s/g, ''));
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
