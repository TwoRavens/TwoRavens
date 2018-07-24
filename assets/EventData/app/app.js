import m from 'mithril';
import {dateSort} from "./canvases/CanvasDate";

import * as common from '../../common-eventdata/common';
import * as query from './query';
import {swandive} from "../../app/app";

// Note: The ROOK_SVC_URL is set by django in /templates/index.html
export let subsetURL = ROOK_SVC_URL + 'eventdataapp';

// TODO login
export let username = 'TwoRavens';

// ~~~~ GLOBAL STATE / MUTATORS ~~~
// metadata for all available datasets and type formats
export let genericMetadata = {};
export let setGenericMetadata = (meta) => genericMetadata = meta;

export let formattingData = {};
export let alignmentData = {};

// metadata computed on the dataset for each subset
export let subsetData = {};

// if selectedSubsetName: true, then the loading symbol is displayed instead of the menu
export let isLoading = {};

// contains state for redrawing a canvas/subset (in a categorical_grouped subset it contains selected categories, graphed groupings, and open/closed states)
export let subsetPreferences = {};
export let subsetRedraw = {};  // if selectedSubsetName: true, then elements outside the mithril redraw are rebuilt. Typically d3 plots.
export let setSubsetRedraw = (subset, value) => subsetRedraw[subset] = value || false;

export let canvasPreferences = {};
export let canvasRedraw = {};
export let setCanvasRedraw = (canvas, value) => canvasRedraw[canvas] = value || false;

// Select which tab is shown in the left panel
export let leftTabSubset = 'Subsets';
export let setLeftTabSubset = (tab) => leftTabSubset = tab;

export let selectedDataset;
export let setSelectedDataset = (key) => {
    previousSelectedDataset = selectedDataset;
    selectedDataset = key;

    if (previousSelectedDataset !== undefined && previousSelectedDataset !== selectedDataset) {
        // trigger reloading of necessary menu elements
        subsetData = {};

        // this modifies the abstract query, preferences, selected vars to be compatible with the new dataset
        alignmentLog = query.realignQuery(previousSelectedDataset, selectedDataset);
        preferencesLog = query.realignPreferences(previousSelectedDataset, selectedDataset);
        variablesLog = query.realignVariables(previousSelectedDataset, selectedDataset);

        let subsetTree = $('#subsetTree');
        let state = subsetTree.tree('getState');
        subsetTree.tree('loadData', abstractQuery);
        subsetTree.tree('setState', state);
        showAlignmentLog = true;

        totalSubsetRecords = undefined;
    }

    // ensure each subset has a place to store settings
    Object.keys(genericMetadata[selectedDataset]['subsets']).forEach(subset => {
        subsetPreferences[subset] = subsetPreferences[subset] || {};
    });

    Object.keys(unitMeasure).forEach(unit => {
        if (!(unit in genericMetadata[selectedDataset]['subsets']) || !('measure' in genericMetadata[selectedDataset]['subsets'][unit]))
            delete unitMeasure[unit];
    });
    setEventMeasure(undefined);
    aggregationHeadersUnit = [];
    aggregationHeadersEvent = [];
    aggregationData = undefined;

    resetPeek();
};

// previous dataset and alignment logs are used for the re-alignment modal
export let previousSelectedDataset;

export let showAlignmentLog = false;
export let setShowAlignmentLog = (state) => showAlignmentLog = state;

export let alignmentLog = [];
export let preferencesLog = [];
export let variablesLog = [];

// 'home', 'subset', 'aggregate'
export let selectedMode = 'home';
export function setSelectedMode(mode) {
    mode = mode.toLowerCase();

    if (mode === selectedMode) return;

    let subsetKeys = Object.keys(genericMetadata[selectedDataset]['subsets']);
    let aggregateKeys = subsetKeys.filter(subset => 'measures' in genericMetadata[selectedDataset]['subsets'][subset]);

    // Some canvases only exist in certain modes. Fall back to default if necessary.
    if (mode === 'home' && selectedCanvas !== selectedCanvasHome)
        setSelectedCanvas(selectedCanvasHome);
    if (mode === 'subset' && (selectedCanvas !== 'Subset' || subsetKeys.indexOf(selectedSubsetName) === -1))
        setSelectedSubsetName(subsetKeys[0]);
    if (mode === 'aggregate' && (selectedCanvas !== 'Subset' || aggregateKeys.indexOf(selectedSubsetName) === -1))
        setSelectedSubsetName(aggregateKeys[0]);

    selectedMode = mode;

    m.route.set('/' + mode.toLowerCase());

    // wait until after the redraw to force a plot size update
    setTimeout(() => {
        Object.keys(genericMetadata[selectedDataset]['subsets']).forEach(subset => subsetRedraw[subset] = true);
        m.redraw();
    }, 100);
}

// corresponds to one of the keys in the subsets object in the dataset config file
export let selectedSubsetName;
export let setSelectedSubsetName = (subset) => {
    setSelectedCanvas('Subset');
    selectedSubsetName = subset;
};

let canvasTypes = ['Datasets', 'Saved Queries', 'Subset', 'Custom', 'Results', 'Analysis'];
export let selectedCanvas = 'Datasets';
export let selectedCanvasHome = selectedCanvas;
export let setSelectedCanvas = (canvasKey) => {
    if (['About', 'Datasets', 'Saved Queries'].indexOf(canvasKey) !== -1) selectedCanvasHome = canvasKey;
    selectedCanvas = canvasKey;
};

export let selectedVariables = new Set();
export let setSelectedVariables = (variables) => selectedVariables = variables;
export let toggleSelectedVariable = (variable) => selectedVariables.has(variable)
    ? selectedVariables.delete(variable)
    : selectedVariables.add(variable);

export let variableSearch = '';
export let setVariableSearch = (text) => variableSearch = text;

export let abstractQuery = [];
export let setAbstractQuery = (query) => abstractQuery = query;

export let aggregationData;
export let setAggregationData = (data) => aggregationData = data;

export let aggregationHeadersUnit = [];
export let setAggregationHeadersUnit = (headersUnit) => aggregationHeadersUnit = headersUnit || [];

export let aggregationHeadersEvent = [];
export let setAggregationHeadersEvent = (headersEvent) => aggregationHeadersEvent = headersEvent || [];

export let unitMeasure = {};

export let eventMeasure; // string
export let setEventMeasure = (measure) => eventMeasure = measure;

export let showSaveQuery = false;
export let setShowSaveQuery = (state) => showSaveQuery = state;

export let aggregationStaged = false;
export let setAggregationStaged = (state) => aggregationStaged = state;

export let selectedResult;
export let setSelectedResult = (result) => {
    selectedResult = result;
    setSelectedCanvas('Results')
};

// number of records matched by the staged subset
export let totalSubsetRecords;

export let laddaSpinners = {};
export let setLaddaSpinner = (id, state) => {
    let element = document.getElementById(id);
    if (!element) return;
    if (!(id in laddaSpinners)) laddaSpinners[id] = Ladda.create(element);
    state ? laddaSpinners[id].start() : laddaSpinners[id].stop();
};
export let laddaStopAll = () => Object.keys(laddaSpinners).forEach(id => laddaSpinners[id].stop());

// stores user info for the save query modal menu. Subset and aggregate are separate
export let saveQuery = {
    'subset': {},
    'aggregate': {}
};

// ~~~~ PAGE RESIZE HANDLING ~~~~
export function handleResize() {
    if (selectedMode === 'home') {
        common.setPanelOcclusion('left', window.innerWidth < 1000 ? `calc(${common.panelMargin}*2)` : '250px');
        common.setPanelOcclusion('right', window.innerWidth < 1000 ? `calc(${common.panelMargin}*2)` : '250px');
        m.redraw();
        return;
    }

    Object.keys(genericMetadata[selectedDataset]['subsets']).forEach(subset => subsetRedraw[subset] = true);
    canvasTypes.forEach(canvas => canvasRedraw[canvas] = true);

    m.redraw();
}

window.addEventListener('resize', handleResize);

common.setPanelCallback('right', () => {
    common.setPanelOcclusion('right', `calc(${common.panelOpen['right'] ? '250px' : '16px'} + 2*${common.panelMargin})`);
    handleResize();
});

common.setPanelCallback('left', () => {
    common.setPanelOcclusion('left', `calc(${common.panelOpen['left'] ? '250px' : '16px'} + 2*${common.panelMargin})`);
    handleResize();
});

// percent of the canvas to cover with the aggregation table
export let tableHeight = '20%';


// ~~~~ PEEK (data visualization page) ~~~~
export function resetPeek() {
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
    else if (localStorage.getItem('peekMore' + peekId) === 'true') updatePeek();
}

let peekId = 'eventdata';

let peekBatchSize = 100;
let peekSkip = 0;
let peekData = [];

let peekAllDataReceived = false;
let peekIsGetting = false;

let onStorageEvent = (e) => {
    if (e.key !== 'peekMore' + peekId || peekIsGetting) return;

    if (localStorage.getItem('peekMore' + peekId) === 'true' && !peekAllDataReceived)
        updatePeek();
};

async function updatePeek() {
    if (!selectedDataset) {
        localStorage.setItem('peekMore' + peekId, 'false');
        return;
    }

    peekIsGetting = true;

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
}
window.addEventListener('storage', onStorageEvent);

// ~~~~ GLOBAL FUNCTIONS ~~~~
export let getSubsetMetadata = (dataset, subset) => {

    let subsetMetadata = genericMetadata[dataset]['subsets'][subset];
    if (!subsetMetadata) return;

    let columns = coerceArray(subsetMetadata['columns']);
    if (subsetMetadata['type'] === 'dyad') Object.keys(subsetMetadata['tabs'])
        .forEach(tab => columns = columns.concat([subsetMetadata['tabs'][tab]['full'], ...subsetMetadata['tabs'][tab]['filters']]));

    let alignments = columns
        .filter(column => column in genericMetadata[dataset]['alignments'])
        .map(column => genericMetadata[dataset]['alignments'][column]);

    let formats = columns
        .filter(column => column in genericMetadata[dataset]['formats'])
        .map(column => genericMetadata[dataset]['formats'][column]);

    if (subsetMetadata['type'] === 'categorical')
        formats = formats.concat(coerceArray(subsetMetadata['formats']));

    columns = [...new Set(columns)];
    alignments = [...new Set(alignments)];
    formats = [...new Set(formats)];

    return {alignments, formats, columns};
};

export let loadSubset = (subsetName) => {
    if (isLoading[subsetName] || subsetName === 'Custom') return;
    isLoading[subsetName] = true;

    let stagedSubsetData = [];
    for (let child of abstractQuery) {
        if (child.type === 'query') {
            stagedSubsetData.push(child)
        }
    }

    let {alignments, formats} = getSubsetMetadata(selectedDataset, subsetName);

    m.request({
        url: subsetURL,
        data: {
            query: escape(JSON.stringify(query.buildSubset(stagedSubsetData))),
            dataset: selectedDataset,
            subset: selectedSubsetName,
            alignments: [...new Set(alignments)].filter(alignment => !(alignment in alignmentData)),
            formats: [...new Set(formats)].filter(format => !(format in formattingData)),
            countRecords: totalSubsetRecords === undefined
        },
        method: 'POST'
    }).then((data) => {
        isLoading[subsetName] = false;
        setupSubset(data);
    })
};

// Draws all subset plots, often invoked as callback after server request for new plotting data
export function setupSubset(jsondata) {
    console.log("Server returned:");
    console.log(jsondata);

    laddaStopAll();

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

export function download(queryType, dataset, queryMongo) {

    function save(data) {
        // postprocess aggregate to reformat dates to YYYY-MM-DD and collapse the dyad boolean array
        // disabled because the final file is packaged by rook. If we construct csv from the browser, then this is useful
        // ({data, headersUnit} = query.reformatAggregation(data));

        let a = document.createElement('A');
        a.href = data.download;
        a.download = data.download.substr(data.download.lastIndexOf('/') + 1);
        document.body.appendChild(a);
        a.click();

        laddaStopAll();
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

    console.log("Download Query: " + JSON.stringify(queryMongo));

    let body = {
        'query': escape(JSON.stringify(queryMongo)),
        'dataset': dataset,
        'type': 'raw'
    };

    setLaddaSpinner('btnDownload', true);
    m.request({
        url: subsetURL,
        data: body,
        method: 'POST'
    }).then(save).catch(laddaStopAll);
}

export function reset() {

    let scorchTheEarth = () => {
        abstractQuery.length = 0;
        $('#subsetTree').tree('loadData', abstractQuery);

        selectedVariables.clear();
        resetPeek();

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

    setLaddaSpinner('btnReset', true);
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
        setupSubset(jsondata)
    }).catch(laddaStopAll);
}

// since R mangles literals and singletons
export let coerceArray = (value) => Array.isArray(value) ? value : value === undefined ? [] : [value];

// we must be very particular about how months get incremented, to handle leap years etc.
export function incrementMonth(date) {
    let months = date.getFullYear() * 12 + date.getMonth() + 1;
    return new Date(Math.floor(months / 12), months % 12);
}

export let isSameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

// positive ints only
export let pad = (number, length) => '0'.repeat(length - String(number).length) + number;


// abstractQuery mutators
// the abstract query is in a format that jqtree renders

// This is the format of each node in the abstract query
// {
//     id: String(nodeId++),    // Node number with post-increment
//     type: 'rule' || 'query' || 'group
//     subset: 'date' || 'dyad' || 'categorical' || 'categorical_grouped' || 'coordinates' || 'custom' (if this.type === 'rule')
//     name: '[title]',         // 'Subsets', 'Group #', '[Selection] Subset' or tag name
//     show_op: true,           // If true, show operation menu element
//     operation: 'and',        // Stores preference of operation menu element
//     children: [],            // If children exist
//     negate: false,           // If exists, have a negation button
//     editable: true,          // If false, operation cannot be edited
//     cancellable: false       // If exists and false, disable the delete button
// }

export let nodeId = 1;
export let setNodeId = id => nodeId = id;
export let groupId = 1;
export let setGroupId = id => groupId = id;
export let queryId = 1;
export let setQueryId = id => queryId = id;

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

// don't show operator button on first element of any group
export function hideFirst(data) {
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
    m.redraw();

    if (!query) {
        let qtree = $('#subsetTree');
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

    m.redraw();
    let subsetTree = $('#subsetTree');
    subsetTree.tree('closeNode', subsetTree.tree('getNodeById', preferences['id']), false);
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
            .filter(edge => edge.source.tab in metadata['tabs'] && edge.target.tab in metadata['tabs']);

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
                    cancellable: true,
                    actors: [...filteredEdges[linkId].source.selected],
                    subset: 'node',
                    column: metadata['tabs'][Object.keys(metadata['tabs'])[0]]['full']
                }, {
                    id: String(nodeId++),
                    name: Object.keys(metadata['tabs'])[1] + ': ' + filteredEdges[linkId].target.name,
                    show_op: false,
                    cancellable: true,
                    actors: [...filteredEdges[linkId].target.selected],
                    subset: 'node',
                    column: metadata['tabs'][Object.keys(metadata['tabs'])[1]]['full']
                }]
            };

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
