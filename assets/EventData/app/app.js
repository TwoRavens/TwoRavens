import {saveAs} from 'file-saver/FileSaver';
import m from 'mithril';
import * as common from '../../common-eventdata/common';

import {dateSort} from "./canvases/CanvasDate";
import * as query from './query';
import * as transform from "../../app/transform";

export let eventdataURL = '/eventdata/api/';

// TODO login
export let username = 'TwoRavens';
export let eventdataSubsetName = 'EventDataSubset';

// ~~~~ GLOBAL STATE / MUTATORS ~~~
// metadata for all available datasets and type formats
export let genericMetadata = {};
export let formattingData = {};
export let alignmentData = {};

export let setMetadata = (data) => Object.keys(data).forEach(key =>
    Object.keys(data[key]).forEach(identifier => ({
        'datasets': genericMetadata,
        'formats': formattingData,
        'alignments': alignmentData
    }[key][identifier] = data[key][identifier])));

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
        let step = getTransformStep(eventdataSubsetName);
        subsetTree.tree('loadData', step.abstractQuery);
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

export let transformPipeline = [];
export let getTransformStep = (stepID) => transformPipeline.find(step => step.id === stepID);

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
export let laddaStopAll = (value) => {
    value && console.error(value);
    Object.keys(laddaSpinners).forEach(id => laddaSpinners[id].stop());
};

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

    let step = getTransformStep(eventdataSubsetName);

    let stagedSubsetData = [];
    for (let child of step.abstractQuery) {
        if (child.type === 'query') {
            stagedSubsetData.push(child)
        }
    }
    let subsetQuery = query.buildSubset(stagedSubsetData);

    let variables = selectedVariables.size ? [...selectedVariables] : genericMetadata[selectedDataset]['columns'];

    if (JSON.stringify(variables) !== localStorage.getItem('peekTableHeaders' + peekId)) {
        peekData = [];
        peekSkip = 0;
    }

    let projection = variables.reduce((out, entry) => {out[entry] = 1; return out;}, {});
    let peekQuery = [{$match: subsetQuery}, {$project: projection}, {$skip: peekSkip}, {$limit: peekBatchSize}];

    console.log("Peek Update");
    console.log("Query: " + JSON.stringify(peekQuery));

    let body = {
        host: genericMetadata[selectedDataset]['host'],
        dataset: selectedDataset,
        method: 'aggregate',
        query: peekQuery
    };

    // cancel the request
    if (!peekIsGetting) return;

    let data = await getData(body);

    peekIsGetting = false;

    if (data.length === 0) {
        peekAllDataReceived = true;
        return;
    }

    peekData = peekData.concat(data);
    peekSkip += data.length;

    // this gets noticed by the peek window
    localStorage.setItem('peekHeader' + peekId, selectedDataset);
    localStorage.setItem('peekTableHeaders' + peekId, JSON.stringify(variables));
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

export let getData = async body => m.request({
    url: eventdataURL + 'get-data',
    method: 'POST',
    data: body
}).then(response => {
    if (!response.success) throw response;
    return response.data;
});

// download data for a subset
export let loadSubset = async (subsetName, {includePending, recount, requireMatch, monadSearch}={}) => {
    if (isLoading[subsetName] || subsetName === 'Custom') return;
    isLoading[subsetName] = true;

    let promises = [];

    // in case selectedDataset changes while Promises are resolving
    let dataset = selectedDataset;

    let step = getTransformStep(eventdataSubsetName);

    // prep the query
    let stagedSubsetData = [];
    let pendingStage = [];
    for (let child of step.abstractQuery) {
        if (child.type === 'query') stagedSubsetData.push(child);
        else pendingStage.push(child);
    }
    if (includePending && pendingStage.length !== 0) stagedSubsetData.push({
        type: 'query',
        children: pendingStage
    });
    let subsetQuery = query.buildSubset(stagedSubsetData);

    console.log("Subset Query:");
    console.log(JSON.stringify(subsetQuery));

    // metadata request
    let {alignments, formats} = getSubsetMetadata(selectedDataset, subsetName);
    alignments = [...new Set(alignments)].filter(alignment => !(alignment in alignmentData));
    formats = [...new Set(formats)].filter(format => !(format in formattingData));
    let metadata = {};
    if (alignments.length) metadata['alignments'] = alignments;
    if (formats.length) metadata['formats'] = formats;
    if (Object.keys(metadata).length) promises.push(m.request({
        url: eventdataURL + 'get-metadata',
        method: 'POST',
        data: metadata
    }).then(setMetadata));

    // record count request
    if (recount) promises.push(getData({
        host: genericMetadata[dataset]['host'],
        dataset: dataset,
        method: 'count',
        query: JSON.stringify(subsetQuery)
    }).then(count => {
        // intentionally breaks the entire downloading promise array and subsequent promise chain
        if (!count && requireMatch) throw 'no records matched';
        totalSubsetRecords = data
    }));

    let config = genericMetadata[dataset]['subsets'][subsetName];
    let data = [];

    if (config['type'] === 'dyad') {
        if (monadSearch) data = subsetData[subsetName];
        else data = Object.keys(config['tabs']).reduce((out, tab) => {
            out[tab] = {filters: {}};
            return out;
        }, {});

        Object.keys(config['tabs']).forEach(tab => {

            if (!monadSearch || tab === monadSearch) {
                let monadQuery = subsetQuery;

                if ('tabs' in subsetPreferences[subsetName]) {
                    let preferences = subsetPreferences[subsetName]['tabs'][tab];
                    let tabFilters = Object.keys(preferences['filters']).reduce((out, column) => {
                        if (preferences['filters'][column]['selected'].size === 0) return out;
                        let filter = {};
                        let deconstruct = genericMetadata[dataset]['deconstruct'] || {};

                        if (column in deconstruct) filter[column] = {
                            $regex: `^(.*${deconstruct[column]})*(${[...preferences['filters'][column]['selected']].join('|')})`,
                            $options: 'i'
                        };
                        else filter[column] = {$in: [...preferences['filters'][column]['selected']]};
                        return out.concat([filter]);
                    }, []);

                    // If no filters are set, don't add any filtering
                    if (tabFilters.length !== 0) {
                        if (Object.keys(subsetQuery).length)
                            monadQuery = {'$and': [subsetQuery, {$and: tabFilters}]};
                        else
                            monadQuery = {$and: tabFilters}; // permits mongo indexing optimization
                    }
                }

                promises.push(getData({
                    host: genericMetadata[dataset]['host'],
                    dataset: dataset,
                    method: 'distinct',
                    distinct: config['tabs'][tab]['full'],
                    query: JSON.stringify(monadQuery)
                }).then(response => data[tab]['full'] = response));
            }

            if (!monadSearch) promises = promises.concat(config['tabs'][tab]['filters'].map(filter => getData({
                host: genericMetadata[dataset]['host'],
                dataset: dataset,
                method: 'distinct',
                distinct: filter,
                query: JSON.stringify(subsetQuery)
            }).then(response => data[tab]['filters'][filter] = response)))
        });
    }
    else if (config['type'] === 'date') {
        let dateQuery = [
            {$match: subsetQuery},
            {
                $group: {
                    _id: {year: {$year: '$' + config['columns'][0]}, month: {$month: '$' + config['columns'][0]}},
                    total: {$sum: 1}
                }
            },
            {$project: {year: '$_id.year', month: '$_id.month', _id: 0, total: 1}}
        ];

        promises.push(getData({
            host: genericMetadata[dataset]['host'],
            dataset: dataset,
            method: 'aggregate',
            query: JSON.stringify(dateQuery)
        }).then(response => data = response
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
            }, [])));
    }
    else if (config['type'] === 'categorical' || config['type'] === 'categorical_grouped') {
        let format = genericMetadata[dataset]['formats'][config['columns'][0]] || config['columns'][0];

        let categoricalQuery = [
            {$match: subsetQuery},
            {$group: {_id: {[format]: '$' + config['columns'][0]}, total: {$sum: 1}}},
            {$project: {[format]: '$_id.' + format, _id: 0, total: 1}}
        ];

        promises.push(getData({
            host: genericMetadata[dataset]['host'],
            dataset: dataset,
            method: 'aggregate',
            query: JSON.stringify(categoricalQuery)
        }).then(response => data = response))
    }

    let success = true;
    let onError = err => {
        if (err === 'no records matched') alert("No records match your subset. Plots will not be updated.");
        else console.error(err);
        success = false;
    };

    // wait until all requests have resolved
    await Promise.all(promises).catch(onError);

    laddaStopAll();
    isLoading[subsetName] = false;

    if (dataset !== selectedDataset) return false;
    if (!success) return false;

    console.log("Server returned:");
    console.log(data);

    subsetData[subsetName] = data;
    subsetRedraw[subsetName] = true;
    m.redraw();

    return true;
};

export async function download(queryType, dataset, queryMongo) {

    // fall back to document state if args are not passed
    if (!queryType) queryType = selectedMode;
    if (!dataset) dataset = selectedDataset;

    let variables = selectedVariables.size === 0 ? genericMetadata[dataset]['columns'] : [...selectedVariables];

    let step = getTransformStep(eventdataSubsetName);

    if (!queryMongo) {
        if (queryType === 'subset') {
            queryMongo = [
                {"$match": query.buildSubset(step.abstractQuery)},
                {
                    "$project": variables.reduce((out, variable) => {
                        out[variable] = 1;
                        return out;
                    }, {'_id': 0})
                }
            ];
        }
        else if (queryType === 'aggregate')
            queryMongo = query.buildAggregation(step.abstractQuery, subsetPreferences);
    }

    console.log("Download Query: " + JSON.stringify(queryMongo));

    setLaddaSpinner('btnDownload', true);
    let data = await getData({
        host: genericMetadata[dataset]['host'],
        dataset: dataset,
        method: 'aggregate',
        query: JSON.stringify(queryMongo)
    }).catch(laddaStopAll);

    // postprocess aggregate to reformat dates to YYYY-MM-DD and collapse the dyad boolean array
    if (selectedMode === 'aggregate') {
        ({data} = query.reformatAggregation(data));
        variables = [...aggregationHeadersUnit, ...aggregationHeadersEvent];
    }

    let text = data.map(record => variables.map(variable => record[variable] || '').join(',') + '\n');
    let header = variables.join(',') + '\n';
    let file = new File([header, ...text], 'EventData_' + selectedDataset + '.csv', {type: "text/plain;charset=utf-8"});
    saveAs(file);
    laddaStopAll();
}

export function reset() {
    let step = getTransformStep(eventdataSubsetName);

    let scorchTheEarth = () => {
        step.abstractQuery.length = 0;
        $('#subsetTree').tree('loadData', step.abstractQuery);

        selectedVariables.clear();
        resetPeek();

        step.nodeId = 1;
        step.groupId = 1;
        step.queryId = 1;

        Object.keys(genericMetadata[selectedDataset]['subsets']).forEach(subset => {
            subsetPreferences[subset] = {};
            subsetRedraw[subset] = true
        });
    };

    // suppress server queries from the reset button when the webpage is already reset
    if (step.abstractQuery.length === 0) {
        scorchTheEarth();
        return;
    }

    setLaddaSpinner('btnReset', true);

    for (let member in subsetData) delete subsetData[member];
    scorchTheEarth();
    loadSubset(selectedSubsetName, {recount: true});
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
//     id: String(step.nodeId++),    // Node number with post-increment
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

export function addGroup(stepId, query = false) {
    let step = transformPipeline.find(step => step.id === stepId);

    // When the query argument is set, groups will be included under a 'query group'
    let movedChildren = [];
    let removeIds = [];

    // If everything is deleted, then restart the ids
    if (step.abstractQuery.length === 0) {
        step.groupId = 1;
        step.queryId = 1;
    }

    // Make list of children to be moved
    for (let child_id in step.abstractQuery) {
        let child = step.abstractQuery[child_id];

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
        step.abstractQuery.splice(removeIds[i], 1);
    }

    if (query) {
        for (let child_id in movedChildren) {
            movedChildren[child_id] = disableEditRecursive(movedChildren[child_id]);
        }
        step.abstractQuery.push({
            id: step.id + '-' + String(step.nodeId++),
            name: 'Query ' + String(step.queryId++),
            operation: 'and',
            editable: true,
            cancellable: true,
            type: 'query',
            children: movedChildren,
            show_op: step.abstractQuery.length > 0
        });
    } else {
        step.abstractQuery.push({
            id: step.id + '-' + String(step.nodeId++),
            name: 'Group ' + String(step.groupId++),
            operation: 'and',
            type: 'group',
            children: movedChildren,
            show_op: step.abstractQuery.length > 0
        });
    }

    hideFirst(step.abstractQuery);
    m.redraw();

    if (!query) {
        let qtree = $('#subsetTree');
        qtree.tree('openNode', qtree.tree('getNodeById', step.nodeId - 1), true);
    }
}

/**
 * @param step: pipeline stepID
 * @param preferences: menu state
 * @param metadata: menu type, column names, etc.
 */
export function addConstraint(step, preferences, metadata) {
    let abstractBranch = makeAbstractBranch(step, preferences, metadata);

    // Don't add an empty constraint
    if (Object.keys(abstractBranch).length === 0) {
        alert("No options have been selected. Please make a selection.");
        return;
    }

    common.setPanelOpen('right');

    if (step.type === 'subset') {

        // Don't show the boolean operator on the first element
        if (step.abstractQuery.length === 0) {
            abstractBranch['show_op'] = false;
        }

        step.abstractQuery.push(abstractBranch);

        m.redraw();
        let subsetTree = $('#subsetTree');
        subsetTree.tree('closeNode', subsetTree.tree('getNodeById', abstractBranch['id']), false);
    }

    if (step.type === 'aggregate' && metadata.measureType === 'unit')
        step.measuresUnit.push(abstractBranch);

    if (step.type === 'aggregate' && metadata.measureType === 'accumulator')
        step.measuresAccum.push(abstractBranch);
}

// Convert the subset panel state to an abstract query branch
function makeAbstractBranch(step, preferences, metadata) {

    if (selectedCanvas === 'Custom') {
        return {
            id: step.id + '-' + String(step.nodeId++),
            name: 'Custom Subset',
            type: 'rule',
            subset: 'custom',
            custom: JSON.parse(preferences['text'])
        }
    }

    if (metadata['type'] === 'dyad') {
        // Make parent node
        let subset = {
            id: step.id + '-' + String(step.nodeId++),
            name: selectedSubsetName + ' Subset',
            operation: 'and',
            type: 'rule',
            subset: metadata['type'],
            children: []
        };

        // ignore edges from shared dyad menus in other datasets
        let filteredEdges = preferences['edges']
            .filter(edge => edge.source.tab in metadata['tabs'] && edge.target.tab in metadata['tabs']);

        for (let linkId in filteredEdges) {

            // Add each link to the parent node as another rule
            let link = {
                id: step.id + '-' + String(step.nodeId++),
                name: 'Link ' + String(linkId),
                show_op: linkId !== '0',
                operation: 'or',
                subset: 'link',
                children: [{
                    id: step.id + '-' + String(step.nodeId++),
                    name: Object.keys(metadata['tabs'])[0] + ': ' + filteredEdges[linkId].source.name,
                    show_op: false,
                    cancellable: true,
                    actors: [...filteredEdges[linkId].source.selected],
                    subset: 'node',
                    column: metadata['tabs'][Object.keys(metadata['tabs'])[0]]['full']
                }, {
                    id: step.id + '-' + String(step.nodeId++),
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

    if (metadata['type'] === 'date') {

        if (step['type'] === 'aggregate') {
            return {
                id: step.id + '-' + String(step.nodeId++),
                name: 'Date (' + preferences['measure'] + ')', // what jqtree shows
                measureName: metadata['name'], // the name of the subset menu. In Eventdata comes from dataset configs, in TwoRavens it is autogenerated
                subset: 'date',
                cancellable: true,
                unit: preferences['unit'],
                column: metadata['columns'][0]
            }
        }

        // For mapping numerical months to strings in the child node name
        let monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June",
            "July", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return {
            id: step.id + '-' + String(step.nodeId++),
            name: selectedSubsetName + ' Subset',
            type: 'rule',
            subset: metadata['type'],
            structure: metadata['structure'],
            children: [
                {
                    id: step.id + '-' + String(step.nodeId++),
                    name: 'From: ' + monthNames[preferences['userLower'].getMonth()] + ' ' + preferences['userLower'].getDate() + ' ' + String(preferences['userLower'].getFullYear()),
                    fromDate: new Date(preferences['userLower'].getTime()),
                    cancellable: false,
                    show_op: false,
                    column: coerceArray(metadata['columns'])[0]
                },
                {
                    id: step.id + '-' + String(step.nodeId++),
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

    if (['categorical', 'categorical_grouped'].indexOf(metadata['type']) !== -1) {
        // Make parent node
        let subset = {
            id: step.id + '-' + String(step.nodeId++),
            name: selectedSubsetName + ' Subset',
            operation: 'and',
            negate: 'false',
            column: coerceArray(metadata['columns'])[0],
            formatSource: metadata['format'],
            formatTarget: preferences['aggregate'],
            alignment: metadata['alignment'],
            type: 'rule',
            subset: metadata['type'],
            children: []
        };

        // Add each selection to the parent node as another rule
        [...preferences['selections']]
            .sort((a, b) => typeof a === 'number' ? a - b : a.localeCompare(b))
            .forEach(selection => subset['children'].push({
                id: step.id + '-' + String(step.nodeId++),
                name: String(selection),
                show_op: false
            }));

        // Don't add a rule and ignore the stage if no selections are made
        if (subset['children'].length === 0) return {};
        return subset
    }

    if (metadata['type'] === 'coordinates') {
        let valLeft = parseFloat(document.getElementById('lonLeft').value);
        let valRight = parseFloat(document.getElementById('lonRight').value);

        let valUpper = parseFloat(document.getElementById('latUpper').value);
        let valLower = parseFloat(document.getElementById('latLower').value);

        // Make parent node
        let subset = {
            id: step.id + '-' + String(step.nodeId++),
            name: selectedSubsetName + ' Subset',
            operation: 'and',
            type: 'rule',
            subset: metadata['type'],
            // negate: 'false',
            children: []
        };

        let latitude = {
            id: step.id + '-' + String(step.nodeId++),
            name: 'Latitude',
            column: coerceArray(metadata['columns'])[0],
            // negate: 'false',
            children: []
        };

        latitude.children.push({
            id: step.id + '-' + String(step.nodeId++),
            name: valUpper > valLower ? valUpper : valLower
        });

        latitude.children.push({
            id: step.id + '-' + String(step.nodeId++),
            name: valUpper < valLower ? valUpper : valLower
        });

        let longitude = {
            id: step.id + '-' + String(step.nodeId++),
            name: 'Longitude',
            operation: 'and',
            column: coerceArray(metadata['columns'])[1],
            children: []
        };

        longitude.children.push({
            id: step.id + '-' + String(step.nodeId++),
            name: valLeft > valRight ? valLeft : valRight
        });

        longitude.children.push({
            id: step.id + '-' + String(step.nodeId++),
            name: valLeft < valRight ? valLeft : valRight
        });

        subset.children.push(latitude);
        subset.children.push(longitude);

        return subset
    }
}
