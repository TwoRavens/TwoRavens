let production = false;

let rappURL = '';
if (!production) {
    // base URL for the R apps:
    rappURL = "http://localhost:8000/custom/";
} else {
    rappURL = "https://beta.dataverse.org/custom/"; //this will change when/if the production host changes
}

let appname = 'eventdatasubsetapp';

// Options: "phoenix" or "icews"
let dataset = 'icews';

// Options: "api" or "local"
let datasource = 'local';

// document.getElementById("header").innerHTML = dataset;
let subsetKeys = [];
let subsetKeySelected = "";

if (dataset === "phoenix") {
    subsetKeys = ["Actor", "Date", "Action", "Location", "Coordinates", "Custom"]; // Used to label buttons in the left panel
    subsetKeySelected = "Actor";
}
if (dataset === "icews") {
    subsetKeys = ["Actor", "Date", "Action", "Location", "Coordinates", "Custom"]; // Used to label buttons in the left panel
    subsetKeySelected = 'Actor';
}

let subsetURL = rappURL + appname;

let variables = ["X","GID","Date","Year","Month","Day","Source","SrcActor","SrcAgent","SOthAgent","Target","TgtActor",
    "TgtAgent","TOthAgent","CAMEO","RootCode","QuadClass","Goldstein","None","Lat","Lon","Geoname","CountryCode",
    "AdminInfo","ID","URL","sourcetxt"];
let variablesSelected = new Set();

let varColor = 'rgba(240,248,255, 1.0)';   //d3.rgb("aliceblue");
let selVarColor = 'rgba(250,128,114, 0.5)';    //d3.rgb("salmon");

// Stores the live data returned from the server
let dateData = [];
let countryData = [];
let actorData = {};
let actionData = [];

// This is set once data is loaded and the graphs can be drawn. Subset menus will not be shown until this is set
let initialLoad = false;

let subsetData = [];

// Attempt to load stored settings
if (localStorage.getItem("subsetData") !== null) {
    // Since the user has already submitted a query, restore the previous preferences from local data
    // All stored data is cleared on reset
    variablesSelected = new Set(JSON.parse(localStorage.getItem('variablesSelected')));
    subsetData = JSON.parse(localStorage.getItem('subsetData'));
}

// Construct queries for current subset tree
let variableQuery = buildVariables();
let subsetQuery = buildSubset(subsetData);

console.log("Query: " + JSON.stringify(subsetQuery));
let query = {
    'subsets': JSON.stringify(subsetQuery),
    'variables': JSON.stringify(variableQuery),
    'dataset': dataset,
    'datasource': datasource
};

// The editor menu for the custom subsets
var editor = ace.edit("subsetCustomEditor");
editor.$blockScrolling = Infinity;
editor.session.setMode("ace/mode/json");

editor.setOptions({
    readOnly: true,
    highlightActiveLine: false,
    highlightGutterLine: false
});
editor.renderer.$cursorLayer.element.style.opacity=0;
editor.textInput.getElement().disabled=true;


reloadLeftpanelVariables();
$("#searchvar").keyup(reloadLeftpanelVariables);

function reloadLeftpanelVariables() {
    // Subset variable list by search term. Empty string returns all.
    let search_term = $("#searchvar").val().toUpperCase();
    let matchedVariables = [];

    for (let idx in variables) {
        if (variables[idx].toUpperCase().indexOf(search_term) !== -1) {
            matchedVariables.push(variables[idx])
        }
    }

    $('#variableList').empty();
    d3.select("#variableList").selectAll("p")
        .data(matchedVariables)
        .enter()
        .append("p")
        .text(function (d) {return d;})
        .style('background-color', function () {
            if (variablesSelected.has(d3.select(this).text())) return selVarColor;
            return varColor
        })
        .on("click", function () {
            d3.select(this).style('background-color', function () {

                let text = d3.select(this).text();
                if (variablesSelected.has(text)) {
                    variablesSelected.delete(text);
                    return varColor

                } else {
                    variablesSelected.add(text);
                    return selVarColor
                }
            });

            reloadRightPanelVariables()
        });

}

d3.select("#subsetList").selectAll("p")
    .data(subsetKeys)
    .enter()
    .append("p")
    .text(function (d) {return d;})
    .style("text-align", "center")
    .style('background-color', function() {
        if (d3.select(this).text() === subsetKeySelected) return selVarColor;
        else return varColor;
    })
    .on("click", function () {
        showSubset(d3.select(this).text())
    });

function showSubset(subsetKey) {
    subsetKeySelected = subsetKey;
    d3.select('#subsetList').selectAll("p").style('background-color', function (d) {
        if (d === subsetKeySelected) return selVarColor;
        else return varColor;
    });

    if (!initialLoad) {
        alert("Resources are still being loaded from the server. Subsets will be available once resources have been loaded.");
    } else {
        if (subsetKeySelected !== ""){
            $("#main").children().hide();
            $("#subset" + subsetKeySelected).css('display', 'inline');
            if (subsetKeySelected === "Actor") {
                d3actor();
            }
            if (subsetKeySelected === "Action") {
                drawGraphs();
                updateData();
            }
            if (subsetKeySelected === "Custom") {
                $("#stageButton").hide()
            } else {
                $("#stageButton").show()
            }
            rightpanelMargin();
        }
    }
}

// Initial load of preprocessed data
makeCorsRequest(subsetURL, query, pageSetup);

function makeCorsRequest(url, post, callback) {
    let xhr = new XMLHttpRequest();
    if ("withCredentials" in xhr) {
        // XHR for Chrome/Firefox/Opera/Safari.
        xhr.open('POST', url, true);
    } else if (typeof XDomainRequest != "undefined") {
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
        if (xhr.status == 0) {
            // occurs when the url becomes too large
            alert('There was an error making the request. xmlhttprequest status is 0.');
        }
        else if (xhr.readyState != 4) {
            alert('There was an error making the request. xmlhttprequest readystate is not 4.');
        }
        else {
            alert('There was an error making the request.');
        }
    };
    xhr.send('solaJSON='+ JSON.stringify(post));
}

// TODO: Change to web link to file
function download() {

    function save(data) {
        const replacer = (key, value) => value === null ? '' : value // specify how you want to handle null values here
        const header = Object.keys(data[0])
        let csv = data.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
        csv.unshift(header.join(','))

        var blob = new Blob([csv.join('\r\n')], {type: "text/plain;charset=utf-8"});
        saveAs(blob, "Eventdata_Subset.csv");
    }

    let variableQuery = buildVariables();
    let subsetQuery = buildSubset(subsetData);
    query = {
        'subsets': JSON.stringify(subsetQuery),
        'variables': JSON.stringify(variableQuery),
        'dataset': dataset,
        'datasource': datasource,
        'type': 'raw'
    };

    makeCorsRequest(subsetURL, query, save);
}


/**
*   Draws all subset plots, often invoked as callback after server request for new plotting data
*/

function loadICEWS(jsondata) {
    dateData = jsondata.date_data;

    countryData = {};
    for (let idx in jsondata.country_data) {
        countryData[jsondata.country_data[idx]['_id']['Country']] = jsondata.country_data[idx]['total']
    }

    actionData = {};
    for (let i = 0; i < 20; i++) {
        actionData[i] = 0;
    }
    for (let idx in jsondata.action_data) {
        actionData[parseInt(jsondata.action_data[idx]._id.root_code)] = jsondata.action_data[idx].total
    }

    actorData = jsondata.actor_data;
    actorDataLoad();

    d3date(true);
    d3loc();
    resetActionCounts();
}

function loadPhoenix(jsondata) {

    dateData = jsondata.date_data;

    for (let idx in jsondata.country_data) {
        // TODO: All data in the database should be in ISO ALPHA-3 spec. This should not be necessary. Data is discarded.
        if (jsondata.country_data[idx]._id.country_code.length === 3) {
            countryData[jsondata.country_data[idx]._id.country_code]= jsondata.country_data[idx].total
        }
    }

    actionData = {};
    for (let i = 0; i < 20; i++) {
        actionData[i] = 0;
    }
    for (let idx in jsondata.action_data) {
        actionData[jsondata.action_data[idx]._id.root_code] = jsondata.action_data[idx].total
    }

    actorData = jsondata.actor_data;
    actorDataLoad();


    d3date(true);
    d3loc();
    resetActionCounts();
}

function pageSetup(jsondata) {
    // console.log("Server returned:");
    // console.log(jsondata);

    if (jsondata.date_data.length === 0) {
        alert("No records match your subset. Plots will not be updated.");
        return false;
    }

    if (dataset === "phoenix") loadPhoenix(jsondata);
    if (dataset === "icews") loadICEWS(jsondata);

    // If first load of data, user may have selected a subset and is waiting. Render page now that data is available
    if (!initialLoad) {
        initialLoad = true;
        // In the case where the user has not yet made a subset selection, this is ignored
        showSubset(subsetKeySelected);
    }

    if (subsetKeySelected === "Action") {
        drawGraphs();
        updateData();
    }

    return true;
}



// Select which tab is shown in the left panel
function tabLeft(tab) {
    document.getElementById('variableTab').style.display = 'none';
    document.getElementById('subsetTab').style.display = 'none';

    $("#leftpanelButtons").children().addClass("btn btn-default").removeClass("active");

    switch (tab) {
        case "variableTab":
            document.getElementById('btnVariables').setAttribute("class", "active");
            break;
        case "subsetTab":
            document.getElementById('btnSubset').setAttribute("class", "active");
    }

    d3.select("#leftpanel").attr("class", "sidepanel container clearfix");
    document.getElementById(tab).style.display = 'block';
}

window.onresize = rightpanelMargin;
$("#btnSubset").trigger("click");		//on load let subset tab show first

function rightpanelMargin() {
    if (typeof actorCodeLoaded !== "undefined" && actorCodeLoaded){
        resizeActorSVG();
    }

    // Resize SVGs in action
    if (subsetKeySelected === "Action") {
        drawGraphs();
        updateData();
    }

    let main = $("#main");
    if (main.get(0).scrollHeight > main.get(0).clientHeight) {
        // Vertical scrollbar
        document.getElementById("rightpanel").style.right = "27px";
        if ($('#rightpanel').hasClass('closepanel')) {
            document.getElementById("stageButton").style.right = "56px";
        } else {
            document.getElementById("stageButton").style.right = "286px";
            
        }
    } else {
        // No vertical scrollbar
        document.getElementById("rightpanel").style.right = "10px";
        if ($('#rightpanel').hasClass('closepanel')) {
            document.getElementById("stageButton").style.right = "40px";
        } else {
            document.getElementById("stageButton").style.right = "270px";
        }
    }

    if (main.get(0).scrollWidth > main.get(0).clientWidth) {
        // Horizontal scrollbar
        document.getElementById("rightpanel").style.height = "calc(100% - 139px)";
        document.getElementById("stageButton").style.bottom = "73px";
    } else {
        // No horizontal scrollbar
        document.getElementById("rightpanel").style.height = "calc(100% - 122px)";
        document.getElementById("stageButton").style.bottom = "56px";
    }
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
var variableData = [];

var nodeId = 1;
var groupId = 1;
var queryId = 1;

if (localStorage.getItem("nodeId") !== null) {
    // If the user has already submitted a query, restore the previous query from local data
    nodeId = localStorage.getItem('nodeId');
    groupId = localStorage.getItem('groupId');
    queryId = localStorage.getItem('queryId');
}

// Close rightpanel if no prior queries have been submitted
if (queryId === 1) {
    toggleRightPanel();
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

function callbackNegate(id, bool) {
    let node = $('#subsetTree').tree('getNodeById', id);

    // don't permit change in negation on non-editable node
    if ('editable' in node && !node.editable) return;

    node.negate = bool;

    subsetData = JSON.parse($('#subsetTree').tree('toJson'));
    let qtree = $('#subsetTree');
    let state = qtree.tree('getState');
    qtree.tree('loadData', subsetData);
    qtree.tree('setState', state);
}

function buttonOperator(id, state) {
    if (state === 'and') {
        return '<button class="btn btn-default btn-xs active" style="width:33px" type="button" data-toggle="button" aria-pressed="true" onclick="callbackOperator(' + id + ', &quot;or&quot;)">and</button> '
    } else {
        return '<button class="btn btn-default btn-xs active" style="width:33px" type="button" data-toggle="button" aria-pressed="true" onclick="callbackOperator(' + id + ', &quot;and&quot;)">or</button> '
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

function callbackOperator(id, operand) {
    let node = $('#subsetTree').tree('getNodeById', id);
    if ('editable' in node && !node.editable) return;

    node.operation = operand;

    // Redraw tree
    subsetData = JSON.parse($('#subsetTree').tree('toJson'));
    let qtree = $('#subsetTree');
    let state = qtree.tree('getState');
    qtree.tree('loadData', subsetData);
    qtree.tree('setState', state);
}

function buttonDelete(id) {
    return "<button type='button' class='btn btn-default btn-xs' style='background:none;border:none;box-shadow:none;float:right;margin-top:2px;height:18px' onclick='callbackDelete(" + String(id) + ")'><span class='glyphicon glyphicon-remove' style='color:#ADADAD'></span></button></div>";
}

function callbackDelete(id) {
    let node = $('#subsetTree').tree('getNodeById', id);
    if (node.name.indexOf('Query') !== -1) {
        if (!confirm("You are deleting a query. This will return your subsetting to an earlier state.")) {
            return;
        }
    }
    // If deleting the last leaf in a branch, delete the branch
    if (typeof node.parent.id !== 'undefined' && node.parent.children.length === 1) {
        callbackDelete(node.parent.id);
    } else {
        $('#subsetTree').tree('removeNode', node);

        subsetData = JSON.parse($('#subsetTree').tree('toJson'));
        hide_first(subsetData);

        let qtree = $('#subsetTree');
        let state = qtree.tree('getState');
        qtree.tree('loadData', subsetData);
        qtree.tree('setState', state);

        if (node.name.indexOf('Query') !== -1) {
            let variableQuery = buildVariables();
            let subsetQuery = buildSubset(subsetData);

            console.log(JSON.stringify(subsetQuery));
            console.log(JSON.stringify(variableQuery, null, '  '));

            query = {
                'subsets': JSON.stringify(subsetQuery),
                'variables': JSON.stringify(variableQuery),
                'dataset': dataset,
                'datasource': datasource
            };
            makeCorsRequest(subsetURL, query, pageSetup);

            // Store user preferences in local data
            localStorage.setItem('variablesSelected', JSON.stringify([...variablesSelected]));

            localStorage.setItem('subsetData', $('#subsetTree').tree('toJson'));
            localStorage.setItem('nodeId', nodeId);
            localStorage.setItem('groupId', groupId);
            localStorage.setItem('queryId', queryId);
        }
    }
}

// Variables menu
$(function () {
    $('#variableTree').tree({
        data: variableData,
        saveState: true,
        dragAndDrop: false,
        autoOpen: true,
        selectable: false
    });
});

// Updates the rightpanel variables menu
function reloadRightPanelVariables() {
    variableData.length = 0;
    [...variablesSelected].forEach(function(element){
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

// Create the query tree
$(function () {
    $('#subsetTree').tree({
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
                $li.find('.jqtree-element').prepend(buttonOperator(node.id, node.operation));
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
            if ((position === 'inside') && (target_node.name.indexOf('Subsets') !== -1 || target_node.name.indexOf('Group') !== -1)) {
                return true;
            }
            return false;
        }
    });
});

$('#subsetTree').on(
    'tree.move',
    function (event) {
        event.preventDefault();
        event.move_info.do_move();

        // Save changes when an element is moved
        subsetData = JSON.parse($('#subsetTree').tree('toJson'));

        hide_first(subsetData);
        let qtree = $('#subsetTree');
        let state = qtree.tree('getState');
        qtree.tree('loadData', subsetData);
        qtree.tree('setState', state);
    }
);

$('#subsetTree').on(
    'tree.click',
    function(event) {
        let node = event.node;
        if (node.name === 'Custom Subset') {
            editor.set(JSON.parse(node.custom));
            showSubset("Custom");
        }
    }
);

$('#subsetTree').bind(
    'tree.dblclick',
    function(event) {
        let tempQuery = buildSubset([event.node]);
        if ($.isEmptyObject(tempQuery)) {
            alert("\"" + event.node.name + "\" is too specific to parse into a query.");
        } else {
            editor.setValue(JSON.stringify(tempQuery, null, '\t'));
            editor.clearSelection();
            showSubset("Custom");
        }
    }
);

function disable_edit_recursive(node) {
    node.editable = false;
    node.cancellable = false;
    if ('children' in node) {
        for (let child_id in node.children) {
            node.children[child_id] = disable_edit_recursive(node.children[child_id]);
        }
    }
    return node
}

function hide_first(data){
    for (let child_id in data) {
        if ('children' in data[child_id]) {
            data[child_id].children = hide_first(data[child_id].children);
        }
        data[child_id]['show_op'] = child_id !== "0";
    }
    return data;
}

$('#subsetTree').on(
    'tree.click',
    function (event) {
        if (event.node.hasChildren()) {
            $('#subsetTree').tree('toggle', event.node);
        }
    }
);

function addGroup(query=false) {
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
        for (let child_id in movedChildren){
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
}

function addRule() {
    // Index zero is root node. Add subset pref to nodes
    if (subsetKeySelected !== "") {
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
    if (subsetKeySelected === 'Date') {

        // If the dates have not been modified, force bring the date from the slider
        if (dateminUser - datemin === 0 && datemaxUser - datemax === 0){
            setDatefromSlider();

            // Ignore the rule if still dates are still not modified
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
                    name: 'From: ' + monthNames[dateminUser.getMonth()] + ' ' + String(dateminUser.getFullYear()),
                    fromDate: new Date(dateminUser.getTime()),
                    cancellable: false,
                    show_op: false
                },
                {
                    id: String(nodeId++),
                    name: 'To:   ' + monthNames[datemaxUser.getMonth()] + ' ' + String(datemaxUser.getFullYear()),
                    toDate: new Date(datemaxUser.getTime()),
                    cancellable: false,
                    show_op: false
                }
            ],
            operation: 'and'
        };
    }

    if (subsetKeySelected === 'Location') {
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

    if (subsetKeySelected === 'Action') {
        // Make parent node
        let subset = {
            id: String(nodeId++),
            name: 'Action Subset',
            operation: 'and',
            negate: 'false',
            children: []
        };
        actionBuffer.sort();
        // Add each action to the parent node as another rule
        for (let action in actionBuffer) {
            if (actionBuffer[action]) {
                subset['children'].push({
                    id: String(nodeId++),
                    name: actionBuffer[action].toString(),
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

    if (subsetKeySelected === 'Actor') {
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
                name: 'Link ' + String(linkId),
                show_op: linkId !== 0,
                operation: 'and',
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

            for (let sourceId in actorLinks[linkId].source.group) {
                link['children'][0]['children'].push({
                    id: String(nodeId++),
                    name: actorLinks[linkId].source.group[sourceId],
                    show_op: false
                });
            }
            for (let targetId in actorLinks[linkId].target.group) {
                link['children'][1]['children'].push({
                    id: String(nodeId++),
                    name: actorLinks[linkId].target.group[targetId],
                    show_op: false
                });
            }
            subset['children'].push(link);
        }

        // Don't add a rule and ignore the stage if no links are made
        if (subset['children'].length === 0) {
            return {}
        }

        return subset
    }

    if (subsetKeySelected === 'Coordinates') {
        let valLeft = parseFloat($("#lonLeft").val());
        let valRight = parseFloat($("#lonRight").val());

        let valUpper = parseFloat($("#latUpper").val());
        let valLower = parseFloat($("#latLower").val());

        // Make parent node
        let subset = {
            id: String(nodeId++),
            name: 'Coords Subset',
            operation: 'and',
            negate: 'false',
            children: []
        };

        let longitude = {
            id: String(nodeId++),
            name: 'Longitude',
            operation: 'and',
                negate: 'false',
                children: []
        };

        longitude.children.push({
            id: String(nodeId++),
            name: valLeft > valRight ? $("#lonLeft").val() : $("#lonRight").val()
        });

        longitude.children.push({
            id: String(nodeId++),
            name: valLeft < valRight ? $("#lonLeft").val() : $("#lonRight").val()
        });

        let latitude = {
            id: String(nodeId++),
            name: 'Latitude',
            negate: 'false',
            children: []
        };

        latitude.children.push({
            id: String(nodeId++),
            name: valUpper > valLower ? $("#latUpper").val() : $("#latLower").val()
        });

        latitude.children.push({
            id: String(nodeId++),
            name: valUpper < valLower ? $("#latUpper").val() : $("#latLower").val()
        });

        subset.children.push(latitude);
        subset.children.push(longitude);

        return subset

    }

    if (subsetKeySelected === 'Custom') {
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

function reset() {
    // suppress server queries from the reset button when the webpage is already reset
    let suppress = variablesSelected.size === 0 && subsetData.length === 0;

    localStorage.removeItem('variablesSelected');
    localStorage.removeItem('subsetData');
    localStorage.removeItem('nodeId');
    localStorage.removeItem('groupId');
    localStorage.removeItem('queryId');

    subsetData.length = 0;
    $('#subsetTree').tree('loadData', subsetData);

    variablesSelected.clear();
    nodeId = 1;
    groupId = 1;
    queryId = 1;

    reloadLeftpanelVariables();
    reloadRightPanelVariables();

    if (!suppress) {
        query = {
            'subsets': JSON.stringify({}),
            'variables': JSON.stringify({}),
            'dataset': dataset,
            'datasource': datasource
        };
        makeCorsRequest(subsetURL, query, pageSetup);
    }
}

/**
 * Makes web request for rightpanel preferences
 */
function submitQuery() {

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
        // If page setup failed, then don't lock the preferences behind a query
        if (!pageSetup(jsondata)) return;

        // True for adding a query group, all existing preferences are grouped under a 'query group'
        addGroup(true);

        // Add all nodes to selection
        let qtree = $('#subsetTree');
        let nodeList = [...Array(nodeId).keys()];

        nodeList.forEach(
            function(node_id){
                const node = qtree.tree("getNodeById", node_id);

                if (node) {
                    qtree.tree("addToSelection", node);
                    if (node.name.indexOf('Query') === -1) node.editable = false;
                }
            }
        );

        // Redraw tree
        subsetData = JSON.parse($('#subsetTree').tree('toJson'));
        let state = qtree.tree('getState');
        qtree.tree('loadData', subsetData);
        qtree.tree('setState', state);

        // Store user preferences in local data
        localStorage.setItem('variablesSelected', JSON.stringify([...variablesSelected]));

        localStorage.setItem('subsetData', $('#subsetTree').tree('toJson'));
        localStorage.setItem('nodeId', nodeId);
        localStorage.setItem('groupId', groupId);
        localStorage.setItem('queryId', queryId);
    }

    let variableQuery = buildVariables();
    let subsetQuery = buildSubset(subsetData);

    console.log("Query: " + JSON.stringify(subsetQuery));
    // console.log(JSON.stringify(variableQuery, null, '  '));

    query = {
        'subsets': JSON.stringify(subsetQuery),
        'variables': JSON.stringify(variableQuery),
        'dataset': dataset,
        'datasource': datasource
    };
    makeCorsRequest(subsetURL, query, submitQueryCallback);
}

// Construct mongoDB selection (subsets columns)
function buildVariables(){
    let fieldQuery = {};
    let variablelist = [...variablesSelected];
    for (let idx in variablelist) {
        fieldQuery[variablelist[idx]] = 1;
    }
    return fieldQuery;
}

// Construct mongoDB filter (subsets rows)
function buildSubset(tree){

    if (subsetData.length === 0) return {};
    return processGroup({'children': tree});

    // Recursively traverse the tree in the right panel. For each node, call processNode

    // If node is a group, then build up the overall operator tree via processGroup
    // If node is a subset, then consider it a leaf, use processRule to build query specific to subset

    function processNode(node){
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

        // strings of rules conjuncted by 'and' operators are clotted in semigroups that act together as one rule
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
        if (group.children[group.children.length - 1]['operation'] === 'and') {
            semigroup.push(processNode(group.children[group.children.length - 1]));
            group_query['$or'].push({'$and': semigroup.slice()})

        } else {
            group_query['$or'].push(processNode(group.children[group.children.length - 1]));
        }

        // Collapse unnecessary conjunctors
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

            let rule_query_inner = {};
            for (let child_id in rule.children) {
                let child = rule.children[child_id];

                let phoenixDate = function (date) {
                    return date.getFullYear().toString() +
                        pad(date.getMonth()) +
                        pad(date.getDay());
                };

                let icewsDate = function (date) {
                    return date.getFullYear().toString() + '-' +
                        pad(date.getMonth()) + '-' +
                        pad(date.getDay())
                };

                if ('fromDate' in child) {

                    // There is an implicit cast somewhere in the code, and I cannot find it.
                    child.fromDate = new Date(child.fromDate);

                    if (dataset === "icews") {
                        rule_query_inner['$gte'] = icewsDate(child.fromDate);
                    }

                    if (dataset === "phoenix") {
                        rule_query_inner['$gte'] = phoenixDate(child.fromDate);
                    }
                }
                if ('toDate' in child) {

                    // There is an implicit cast somewhere in the code, and I cannot find it.
                    child.toDate = new Date(child.toDate);

                    if (dataset === "icews") {
                        rule_query_inner['$lte'] = icewsDate(child.toDate);
                    }

                    if (dataset === "phoenix") {
                        rule_query_inner['$lte'] = phoenixDate(child.toDate);
                    }
                }
            }
            rule_query['<date>'] = rule_query_inner;
        }

        if (rule.name === 'Location Subset'){
            let rule_query_inner = [];
            for (let child_id in rule.children) {
                rule_query_inner.push(rule.children[child_id].name);
            }

            rule_query_inner = {'$in': rule_query_inner};
            if ('negate' in rule && !rule.negate) {
                rule_query_inner = {'$not': rule_query_inner};
            }

            if (dataset === "icews") {
                rule_query['<country>'] = rule_query_inner;
            }
            if (dataset === "phoenix") {
                rule_query['<country_code>'] = rule_query_inner;
            }
        }

        if (rule.name === 'Action Subset'){
            let rule_query_inner = [];
            if (dataset === "phoenix") {
                for (let child_id in rule.children) {
                    rule_query_inner.push(parseInt(rule.children[child_id].name));
                }
                rule_query_inner = {'$in': rule_query_inner};

                if ('negate' in rule && !rule.negate) {
                    rule_query_inner = {'$not': rule_query_inner};
                }

                rule_query['<root_code>'] = rule_query_inner;
            }

            if (dataset === "icews") {
                let prefixes = [];
                for (let child_id in rule.children) {
                    prefixes.push(pad(parseInt(rule.children[child_id].name)));
                }
                rule_query_inner = {'$regex': '^(' + prefixes.join('|') + ')'}

                if ('negate' in rule && !rule.negate) {
                    rule_query_inner = {'$not': rule_query_inner};
                }

                rule_query['<cameo>'] = rule_query_inner;
            }
        }

        if (rule.name === 'Actor Subset'){
            let link_list = [];
            for (let idx in rule.children) {
                let link_rule = {};

                let sourceList = [];
                for (let idxsource in rule.children[idx].children[0].children) {
                    sourceList.push(rule.children[idx].children[0].children[idxsource].name);
                }
                link_rule['<Source>'] = {'$in': sourceList};

                let targetList = [];
                for (let idxtarget in rule.children[idx].children[1].children) {
                    targetList.push(rule.children[idx].children[1].children[idxtarget].name)
                }
                link_rule['<Target>'] = {'$in': targetList};

                link_list.push(link_rule)
            }
            rule_query['$and'] = link_list;
        }

        if (rule.name === 'Coords Subset') {

            let rule_query_inner = [];

            for (let child_id in rule.children) {
                let child = rule.children[child_id];

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
            rule_query = JSON.parse(rule.custom.replace(/\s/g,''));
        }

        return rule_query;
    }

    function pad(number) {
        if (number <= 9) {
            return ("0" + number.toString());
        }
        else {
            return number.toString()
        }
    }
}
