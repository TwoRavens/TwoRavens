import m from 'mithril';
import {dateSort} from "./canvases/CanvasDate";

import * as common from '../../common-eventdata/common';
import * as query from './query';
import {subset} from "../../app/app";
import {saveAs} from 'file-saver/FileSaver';

export let eventdataURL = '/eventdata/api/';

// TODO login
export let username = 'TwoRavens';

// ~~~~ GLOBAL STATE / MUTATORS ~~~
// metadata for all available datasets and type formats
export let genericMetadata = {};
export let formattingData = {};
export let alignmentData = {};

export let setMetadata = (data) => Object.keys(data).forEach(key =>
    Object.keys(data[key]).forEach(identifier => ({
        'collections': genericMetadata,
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

export let selectedConstructedVariables = new Set();
export let setSelectedConstructedVariables = (variables) => selectedConstructedVariables = variables;
export let toggleSelectedConstructedVariable = (variable) => selectedConstructedVariables.has(variable)
    ? selectedConstructedVariables.delete(variable)
    : selectedConstructedVariables.add(variable);

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

    let stagedSubsetData = [];
    for (let child of abstractQuery) {
        if (child.type === 'query') {
            stagedSubsetData.push(child)
        }
    }
    let subsetQuery = query.buildSubset(stagedSubsetData);

    let variables = (selectedVariables.size + selectedConstructedVariables.size) === 0
        ? [...genericMetadata[selectedDataset]['columns'], genericMetadata[selectedDataset]['columns_constructed']]
        : [...selectedVariables, ...selectedConstructedVariables];

    if (JSON.stringify(variables) !== localStorage.getItem('peekTableHeaders' + peekId)) {
        peekData = [];
        peekSkip = 0;
    }

    let projection = variables.reduce((out, entry) => {
        out[entry] = 1;
        return out;
    }, {_id: 0});
    let peekQuery = [{$match: subsetQuery}, {$project: projection}, {$skip: peekSkip}, {$limit: peekBatchSize}];

    console.log("Peek Update");
    console.log("Query: " + JSON.stringify(peekQuery));

    let body = {
        host: genericMetadata[selectedDataset]['host'],
        collection_name: selectedDataset,
        method: 'aggregate',
        query: JSON.stringify(peekQuery)
    };

    // cancel the request
    if (!peekIsGetting) return;

    let data = await getData(body);
    data.forEach(record => variables.forEach(variable => {
        if (typeof record[variable] === 'object' && '$date' in record[variable])
            record[variable] = new Date(record[variable]['$date']).toISOString().slice(0, 10);
    }));

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
export let loadSubset = async (subsetName, {includePending, recount, requireMatch, monadSearch} = {}) => {
    if (isLoading[subsetName] || subsetName === 'Custom') return;
    isLoading[subsetName] = true;

    let promises = [];

    // in case selectedDataset changes while Promises are resolving
    let dataset = selectedDataset;

    // prep the query
    let stagedSubsetData = [];
    let pendingStage = [];
    for (let child of abstractQuery) {
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
    if (recount || totalSubsetRecords === undefined) promises.push(getData({
        host: genericMetadata[dataset]['host'],
        collection_name: dataset,
        method: 'count',
        query: JSON.stringify(subsetQuery)
    }).then(count => {
        // intentionally breaks the entire downloading promise array and subsequent promise chain
        if (!count && requireMatch) throw 'no records matched';
        totalSubsetRecords = count
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
                    collection_name: dataset,
                    method: 'distinct',
                    distinct: config['tabs'][tab]['full'],
                    query: JSON.stringify(monadQuery)
                }).then(response => data[tab]['full'] = response));
            }

            if (!monadSearch) promises = promises.concat(config['tabs'][tab]['filters'].map(filter => getData({
                host: genericMetadata[dataset]['host'],
                collection_name: dataset,
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
            collection_name: dataset,
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
            collection_name: dataset,
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

// this function makes many dirty assumptions about page state and is very touchy. Sorry for the headache. -Mike
export async function download(queryType, dataset, queryMongo) {

    console.log(queryMongo);
    // fall back to document state if args are not passed
    if (!queryType) queryType = selectedMode;
    if (!dataset) dataset = selectedDataset;

    let variables = [];

    if (!queryMongo) {
        if (queryType === 'subset') {

            variables = (selectedVariables.size + selectedConstructedVariables.size) === 0
                ? [...genericMetadata[dataset]['columns'], genericMetadata[dataset]['columns_constructed']]
                : [...selectedVariables, ...selectedConstructedVariables];
            // when only the _id is ignored (_id: 0) then all other columns are returned (mongo behavior)
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
    // queryMongo is set when called from Saved Queries, but variables is unknown. Infer variables from the projection stage of the pipeline
    // aggregation queries handle inferring variables from inside reformatAggregation, so this only applies to subset
    else if (queryType === 'subset') variables =
        Object.keys(queryMongo[queryMongo.length - 1]['$project']).filter(key => key !== '_id');

    console.log("Download Query: " + JSON.stringify(queryMongo));

    setLaddaSpinner('btnDownload', true);
    let data = await getData({
        host: genericMetadata[dataset]['host'],
        collection_name: dataset,
        method: 'aggregate',
        query: JSON.stringify(queryMongo)
    }).catch(laddaStopAll);

    if ('success' in data && !data.success) {
        laddaStopAll();
        alert("Download failed. " + data.message);
        return;
    }

    // postprocess aggregate to reformat dates to YYYY-MM-DD and collapse the dyad boolean array
    if (selectedMode === 'aggregate') {
        let headersUnit, headersEvent;
        ({data, headersUnit, headersEvent} = query.reformatAggregation(data));
        variables = [...headersUnit, ...headersEvent];
    }

    let text = data.map(record => variables.map(variable => {
        if (typeof record[variable] === 'object' && '$date' in record[variable])
            return new Date(record[variable]['$date']).toISOString().slice(0, 10);
        return record[variable] || '';
    }).join('\t') + '\n');

    let header = variables.map(variable => {
        if (variable.endsWith('_constructed')) return 'TwoRavens_' + variable.replace('_constructed', '');
        return variable;
    }).join('\t') + '\n';

    let file = new File([header, ...text], 'EventDataSaved.csv', {type: "text/plain;charset=utf-8"});
    saveAs(file);
    laddaStopAll();
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
            // when rev is set, then column names are switched
            let reversed = filteredEdges[linkId].rev;

            // Add each link to the parent node as another rule
            let link = {
                id: String(nodeId++),
                name: 'Link ' + String(linkId),
                show_op: linkId !== '0',
                operation: 'or',
                subset: 'link',
                children: [{
                    id: String(nodeId++),
                    name: Object.keys(metadata['tabs'])[reversed ? 1 : 0] + ': ' + filteredEdges[linkId].source.name,
                    show_op: false,
                    cancellable: true,
                    actors: [...filteredEdges[linkId].source.selected],
                    subset: 'node',
                    column: metadata['tabs'][Object.keys(metadata['tabs'])[reversed ? 1 : 0]]['full']
                }, {
                    id: String(nodeId++),
                    name: Object.keys(metadata['tabs'])[reversed ? 0 : 1] + ': ' + filteredEdges[linkId].target.name,
                    show_op: false,
                    cancellable: true,
                    actors: [...filteredEdges[linkId].target.selected],
                    subset: 'node',
                    column: metadata['tabs'][Object.keys(metadata['tabs'])[reversed ? 0 : 1]]['full']
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
