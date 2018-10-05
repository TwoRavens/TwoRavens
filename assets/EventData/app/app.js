import {saveAs} from 'file-saver/FileSaver';
import m from 'mithril';
import * as common from '../../common-eventdata/common';

import * as queryMongo from './queryMongo';
import * as queryAbstract from './queryAbstract';
import * as tour from "./tour";

export let eventdataURL = '/eventdata/api/';

// ~~~~ GLOBAL STATE / MUTATORS ~~~

export let manipulations = {};

// Holds steps like the pending subset or aggregation in eventdata. They aren't part of a pipeline, but still rendered somewhere
export let looseSteps = {};

export let formattingData = {};
export let alignmentData = {};

// ~~~~ EVENTDATA STATE / MUTATORS ~~~
// eventdata has a fixed pipeline of [Subset] -> [Aggregate]
export let eventdataSubsetCount = 1;

// metadata for all available eventdata datasets and type formats
export let genericMetadata = {};

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

// contains state for redrawing a canvas/subset (in a discrete_grouped subset it contains selected categories, graphed groupings, and open/closed states)
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
        alignmentLog = queryAbstract.realignQuery(looseSteps['pendingSubset'], previousSelectedDataset, selectedDataset);
        preferencesLog = queryAbstract.realignPreferences(previousSelectedDataset, selectedDataset);
        variablesLog = queryAbstract.realignVariables(previousSelectedDataset, selectedDataset);

        manipulations.eventdata.map(step => {

            alignmentLog.push(...queryAbstract.realignQuery(step, previousSelectedDataset, selectedDataset));

            let subsetTree = $('#subsetTree' + step.id);
            let state = subsetTree.tree('getState');
            subsetTree.tree('loadData', step.abstractQuery);
            subsetTree.tree('setState', state);
        });

        showAlignmentLog = true;
        totalSubsetRecords = undefined;
    }

    // ensure each subset has a place to store settings
    Object.keys(genericMetadata[selectedDataset]['subsets']).forEach(subset => {
        subsetPreferences[subset] = subsetPreferences[subset] || {};
    });

    looseSteps['eventdataAggregate'].measuresUnit.forEach((measure, i) => {
        if (!(measure.subsetName in genericMetadata[selectedDataset]['subsets']) || genericMetadata[selectedDataset]['subsets'][measure.subsetName].measureType !== measure.measureType)
            looseSteps['eventdataAggregate'].measuresUnit.splice(i, 1);
    });

    looseSteps['eventdataAggregate'].measuresAccum.forEach((measure, i) => {
        if (!(measure.subsetName in genericMetadata[selectedDataset]['subsets']) || genericMetadata[selectedDataset]['subsets'][measure.subsetName].measureType !== measure.measureType)
            looseSteps['eventdataAggregate'].measuresAccum.splice(i, 1);
    });

    tableHeaders = [];
    tableHeadersEvent = [];
    aggregationHeadersLabels = [];
    tableData = undefined;

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

    // Some canvases only exist in certain modes. Fall back to default if necessary.
    if (mode === 'home' && selectedCanvas !== selectedCanvasHome)
        setSelectedCanvas(selectedCanvasHome);
    if (mode === 'subset' && (selectedCanvas !== 'Subset' || subsetKeys.indexOf(selectedSubsetName) === -1))
        setSelectedSubsetName(subsetKeys[0]);
    if (mode === 'aggregate' && (selectedCanvas !== 'Subset' || genericMetadata[selectedDataset]['subsets'][selectedSubsetName]['measureType'] === undefined))
        setSelectedSubsetName(Object.keys(genericMetadata[selectedDataset]['subsets']).find(subset => 'measureType' in genericMetadata[selectedDataset]['subsets'][subset]));

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
    setSubsetRedraw(subset, true);
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

export let tableData;
export let setTableData = data => tableData = data;

export let tableHeaders = [];
export let setTableHeaders = headers => tableHeaders = headers;

export let tableHeadersEvent = [];
export let setTableHeadersEvent = headers => tableHeadersEvent= headers;

export let aggregationHeadersLabels = {};
export let setAggregationHeadersLabels = labels => aggregationHeadersLabels = labels;

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
export let setTotalSubsetRecords = count => totalSubsetRecords = count;

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

    let variables = (selectedVariables.size + selectedConstructedVariables.size) === 0
        ? [...genericMetadata[selectedDataset]['columns'], ...genericMetadata[selectedDataset]['columns_constructed']]
        : [...selectedVariables, ...selectedConstructedVariables];

    if (JSON.stringify(variables) !== localStorage.getItem('peekTableHeaders' + peekId)) {
        peekData = [];
        peekSkip = 0;
    }

    let peekMenu = {
        type: 'menu',
        metadata: {
            type: 'data',
            variables: variables,
            skip: peekSkip,
            limit: peekBatchSize
        }
    };

    let peekPipeline = queryMongo.buildPipeline([...manipulations.eventdata, peekMenu])['pipeline'];

    console.log("Peek Query:");
    console.log(JSON.stringify(peekPipeline));

    // cancel the request
    if (!peekIsGetting) return;

    let data = await getData({
        host: genericMetadata[selectedDataset]['host'],
        collection_name: selectedDataset,
        method: 'aggregate',
        query: JSON.stringify(peekPipeline)
    });

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
    if (!subsetMetadata) return {alignments: [], formats: [], columns: []};

    let columns = subsetMetadata['columns'] || [];
    if (subsetMetadata['type'] === 'dyad') Object.keys(subsetMetadata['tabs'])
        .forEach(tab => columns.push(subsetMetadata['tabs'][tab]['full'], ...subsetMetadata['tabs'][tab]['filters']));
    let alignments = columns
        .filter(column => column in genericMetadata[dataset]['alignments'])
        .map(column => genericMetadata[dataset]['alignments'][column]);
    let formats = columns
        .filter(column => column in genericMetadata[dataset]['formats'])
        .map(column => genericMetadata[dataset]['formats'][column]);
    if ('formats' in subsetMetadata)
        formats.push(...subsetMetadata['formats']);

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

// download data to display a menu
export let loadMenu = async (abstractPipeline, menu, {recount, requireMatch}={}) => { // the dict is for optional named arguments

    // the coordinates menu does not use data, so just return
    if (menu.type === 'menu' && menu.metadata.type === 'coordinates') return [];

    // convert the pipeline to a mongo query. Note that passing menu extends the pipeline to collect menu data
    let compiled = JSON.stringify(queryMongo.buildPipeline([...abstractPipeline, menu])['pipeline']);

    console.log("Menu Query:");
    console.log(compiled);

    let promises = [];

    // in case selectedDataset changes while Promises are resolving
    let dataset = selectedDataset;

    if (IS_EVENTDATA_DOMAIN && menu.type !== 'aggregate') {
        // metadata request
        let {alignments, formats} = getSubsetMetadata(selectedDataset, menu.name);
        alignments = [...new Set(alignments)].filter(alignment => !(alignment in alignmentData));
        formats = [...new Set(formats)].filter(format => !(format in formattingData));
        let metadata = {};
        if (alignments.length) metadata.alignments = alignments;
        if (formats.length) metadata.formats = formats;
        if (Object.keys(metadata).length) promises.push(m.request({
            url: eventdataURL + 'get-metadata',
            method: 'POST',
            data: metadata
        }).then(setMetadata));
    }

    // record count request
    if (recount || totalSubsetRecords === undefined) {
        let countMenu = {type: 'menu', metadata: {type: 'count'}};
        let compiled = JSON.stringify(queryMongo.buildPipeline([...abstractPipeline, countMenu])['pipeline']);

        console.log("Count Query:");
        console.log(compiled);

        promises.push(getData({
            host: genericMetadata[dataset]['host'],
            collection_name: dataset,
            method: 'aggregate',
            query: compiled
        }).then(response => {
            let count = queryMongo.menuPostProcess['count'](response);
            // intentionally breaks the entire downloading promise array and subsequent promise chain
            if (!count && requireMatch) throw 'no records matched';
            totalSubsetRecords = count
        }));
    }

    let data;
    promises.push(getData({
        host: genericMetadata[dataset]['host'],
        collection_name: dataset,
        method: 'aggregate',
        query: compiled
    })
        .then(menu.type === 'menu' ? queryMongo.menuPostProcess[menu.metadata.type] : _=>_)
        .then(response => data = response));

    let success = true;
    let onError = err => {
        if (err === 'no records matched') alert("No records match your subset. Plots will not be updated.");
        else console.error(err);
        success = false;
    };

    // wait until all requests have resolved
    await Promise.all(promises).catch(onError);

    if (success && data) {
        console.log("Server returned:");
        console.log(data);
        return data;
    }
};

export async function loadMenuEventData(abstractPipeline, menu, {recount, requireMatch}={}) {
    isLoading[menu.name] = true;

    let data = await loadMenu(abstractPipeline, menu, {recount, requireMatch});
    if (data) {
        subsetData[menu.name] = data;
        isLoading[menu.name] = false;
        subsetRedraw[menu.name] = true;
        m.redraw();
    }
    return Boolean(data);
}

// locks a subset manipulation step as a 'query', relevant to eventdata only
export async function submitSubset() {

    let newMenu = {
        type: 'menu',
        name: selectedSubsetName,
        metadata: genericMetadata[selectedDataset]['subsets'][selectedSubsetName],
        preferences: subsetPreferences[selectedSubsetName]
    };

    let success = await loadMenuEventData([...manipulations.eventdata, looseSteps['pendingSubset']], newMenu, {recount: true, requireMatch: true});
    if (success) {
        manipulations.eventdata.push(looseSteps['pendingSubset']);
        looseSteps['pendingSubset'] = {
            type: 'subset',
            id: eventdataSubsetCount++,
            abstractQuery: [],
            nodeId: 1,
            groupId: 1
        };

        // clear all other subset data. Note this is intentionally mutating the object, not rebinding it
        Object.keys(subsetData)
            .filter(subset => subset !== newMenu.name)
            .forEach(subset => delete subsetData[subset]);
        m.redraw();
    }
}


export async function submitAggregation() {
    if (!looseSteps['eventdataAggregate'].measuresAccum.length) {
        tour.tourStartEventMeasure();
        return;
    }

    setLaddaSpinner('btnUpdate', true);

    let cachedPipeline = queryMongo.buildPipeline([...manipulations.eventdata, looseSteps['eventdataAggregate']]);

    let data = await loadMenu(manipulations.eventdata, looseSteps['eventdataAggregate']);
    if (data) {
        tableData = data;
        let {units, accumulators, labels} = cachedPipeline;
        tableHeaders = [...units];
        tableHeadersEvent = [...accumulators];
        aggregationHeadersLabels = labels;
    }
    setLaddaSpinner('btnUpdate', false);

    m.redraw()
}

export async function download(collection_name, query) {

    console.log("Download Query:");
    console.log(query);

    let data = await getData({
        host: genericMetadata[collection_name].host,
        method: 'aggregate',
        collection_name,
        query
    });

    let variables = [...data.reduce((out, record) => {
        Object.keys(record).forEach(variable => out.add(variable));
        return out;
    }, new Set())];

    let text = data.map(record => variables.map(variable => record[variable] || '').join('\t') + '\n');

    let header = [...variables].join('\t') + '\n';
    let file = new File([header, ...text], `EventData_${collection_name}.tsv`, {type: "text/plain;charset=utf-8"});
    saveAs(file);
}

export async function reset() {

    let scorchTheEarth = () => {
        manipulations.eventdata.length = 0;

        selectedVariables.clear();
        resetPeek();

        eventdataSubsetCount = 0;
        looseSteps['pendingSubset'] = {
            type: 'subset',
            id: eventdataSubsetCount++,
            abstractQuery: [],
            nodeId: 1,
            groupId: 1
        };

        looseSteps['eventdataAggregate'] = {
            type: 'aggregate',
            id: 'eventdataAggregate',
            measuresUnit: [],
            measuresAccum: [],
            nodeId: 1
        };

        tableData = undefined;
        tableHeadersEvent = [];
        tableHeaders = [];
        aggregationHeadersLabels = [];

        Object.keys(genericMetadata[selectedDataset]['subsets']).forEach(subset => {
            subsetPreferences[subset] = {};
            subsetRedraw[subset] = true
        });
    };

    // suppress server queries from the reset button when the webpage is already reset
    if (manipulations.eventdata.length === 0) {
        scorchTheEarth();
        return;
    }

    setLaddaSpinner('btnReset', true);

    for (let member in subsetData) delete subsetData[member];
    scorchTheEarth();

    let newMenu = {
        type: 'menu',
        name: selectedSubsetName,
        metadata: genericMetadata[selectedDataset]['subsets'][selectedSubsetName],
        preferences: subsetPreferences[selectedSubsetName]
    };

    isLoading[selectedSubsetName] = true;
    let cachedSubsetName = selectedSubsetName; // if the user changes the subset while loading

    let data = await loadMenu(selectedSubsetName, newMenu, {recount: true});
    if (data) {
        isLoading[cachedSubsetName] = false;
        subsetRedraw[cachedSubsetName] = true;
        subsetData[cachedSubsetName] = data;
    }
    setLaddaSpinner('btnReset', false);
    m.redraw();
}

// we must be very particular about how months get incremented, to handle leap years etc.
export function incrementMonth(date) {
    let months = date.getFullYear() * 12 + date.getMonth() + 1;
    return new Date(Math.floor(months / 12), months % 12);
}

export let isSameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

// positive ints only
export let pad = (number, length) => '0'.repeat(length - String(number).length) + number;

export let anySort = (a, b) => {
    if (a === undefined || b === undefined) return 0;
    if (typeof a['Label'] === 'number') return a['Label'] - b['Label'];
    if (typeof a['Label'] === 'string') a['Label'].localeCompare(b['Label']);
    return comparableSort(a, b);
};

export function comparableSort(a, b) {
    if (a['Label'] === b['Label']) return 0;
    return (a['Label'] < b['Label']) ? -1 : 1;
}
