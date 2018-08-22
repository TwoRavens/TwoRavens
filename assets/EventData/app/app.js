import {saveAs} from 'file-saver/FileSaver';
import m from 'mithril';
import * as common from '../../common-eventdata/common';

import * as queryMongo from './queryMongo';
import * as queryAbstract from './queryMongo';
import * as tour from "./tour";

export let eventdataURL = '/eventdata/api/';

// TODO login
export let username = 'TwoRavens';

// ~~~~ GLOBAL STATE / MUTATORS ~~~

export let abstractManipulations = [];
export let getTransformStep = (stepID) => abstractManipulations.find(step => step.id === stepID);

export let formattingData = {};
export let alignmentData = {};

// ~~~~ EVENTDATA STATE / MUTATORS ~~~
// eventdata has a fixed pipeline of [Subset] -> [Aggregate]
export let eventdataSubsetName = 'EventDataSubset';
export let eventdataSubsetCount = 0;

export let pendingSubset = {
    name: eventdataSubsetName + eventdataSubsetCount++,
    abstractQuery: [],
    nodeId: 1,
    groupId: 1
};

export let eventdataAggregateStep = {
    type: 'aggregate',
    measuresUnit: [],
    measuresAccum: [],
    nodeId: 1
};

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
        alignmentLog = queryAbstract.realignQuery(previousSelectedDataset, selectedDataset);
        preferencesLog = queryAbstract.realignPreferences(previousSelectedDataset, selectedDataset);
        variablesLog = queryAbstract.realignVariables(previousSelectedDataset, selectedDataset);

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

export let selectedConstructedVariables = new Set();
export let setSelectedConstructedVariables = (variables) => selectedConstructedVariables = variables;
export let toggleSelectedConstructedVariable = (variable) => selectedConstructedVariables.has(variable)
    ? selectedConstructedVariables.delete(variable)
    : selectedConstructedVariables.add(variable);

export let variableSearch = '';
export let setVariableSearch = (text) => variableSearch = text;

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

    let variables = (selectedVariables.size + selectedConstructedVariables.size) === 0
        ? [...genericMetadata[selectedDataset]['columns'], genericMetadata[selectedDataset]['columns_constructed']]
        : [...selectedVariables, ...selectedConstructedVariables];

    if (JSON.stringify(variables) !== localStorage.getItem('peekTableHeaders' + peekId)) {
        peekData = [];
        peekSkip = 0;
    }

    let peekMenu = {
        type: 'peek',
        metadata: {
            variables: variables,
            skip: peekSkip,
            limit: peekBatchSize
        }
    };

    let peekPipeline = queryMongo.buildPipeline([...abstractManipulations, peekMenu]);

    console.log("Peek Query:");
    console.log(JSON.stringify(peekPipeline));

    let body = {
        host: genericMetadata[selectedDataset]['host'],
        collection_name: selectedDataset,
        method: 'aggregate',
        query: JSON.stringify(peekPipeline)
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
export let loadMenu = async (abstractPipeline, menu, setIsLoading, setRedraw, setData, {recount, requireMatch}={}) => { // the dict is for optional named arguments

    setIsLoading(true);

    // convert the pipeline to a mongo query. Note that passing menu extends the pipeline to collect menu data
    let compiled = queryMongo.buildPipeline([...abstractPipeline, menu])['pipeline'];

    console.log("Menu Query:");
    console.log(JSON.stringify(compiled));

    let promises = [];

    // in case selectedDataset changes while Promises are resolving
    let dataset = selectedDataset;

    if (IS_EVENTDATA_DOMAIN) {
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
    if (recount || totalSubsetRecords === undefined) promises.push(getData({
        host: genericMetadata[dataset]['host'],
        collection_name: dataset,
        method: 'count',
        query: queryMongo.buildPipeline(abstractPipeline)['pipeline']
    }).then(count => {
        // intentionally breaks the entire downloading promise array and subsequent promise chain
        if (!count && requireMatch) throw 'no records matched';
        totalSubsetRecords = count
    }));

    let data;
    promises.push(getData({
        host: genericMetadata[dataset]['host'],
        dataset: dataset,
        method: 'aggregate',
        query: compiled
    })
        .then(queryMongo.menuPostProcess[menu.type])
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

        setIsLoading(false);
        setData(data);

        setRedraw(true);
        m.redraw();
    }
};

// locks a subset manipulation step as a 'query', relevant to eventdata only
export async function submitSubset() {

    abstractManipulations.push(pendingSubset);
    pendingSubset = {
        id: eventdataSubsetName + eventdataSubsetCount++,
        abstractQuery: [],
        nodeId: 1,
        groupId: 1
    };

    let newMenu = {
        name: selectedSubsetName,
        metadata: genericMetadata[selectedDataset]['subsets'][selectedSubsetName],
        step: pendingSubset
    };

    await loadMenu(
        abstractManipulations, newMenu,
        state => isLoading[selectedSubsetName] = state,
        state => subsetRedraw[selectedSubsetName] = state,
        data => {
            // clear all other subset data. Note this is intentionally mutating the object, not rebinding it
            Object.keys(subsetData)
                .filter(subset => subset !== selectedSubsetName)
                .forEach(subset => delete subsetData[subset]);
            subsetData[selectedSubsetName] = data;
        },
        {recount: true, requireMatch: true});
}


export function submitAggregation() {
    if (!eventMeasure) {
        tour.tourStartEventMeasure();
        return;
    }

    loadMenu(abstractManipulations,
        eventdataAggregateStep,
        state => setLaddaSpinner('btnUpdate', state),
        Function, // no forced redraws needed
        data => aggregationData = data);

    // TODO check setting of aggregation headers (unit and event)
}

// this function makes many dirty assumptions about page state and is very touchy. Sorry for the headache. -Mike
export async function download(queryType, dataset, query) {

    console.log(query);
    // fall back to document state if args are not passed
    if (!queryType) queryType = selectedMode;
    if (!dataset) dataset = selectedDataset;

    let variables = [];

    if (!query) {
        if (queryType === 'subset') {

            variables = (selectedVariables.size + selectedConstructedVariables.size) === 0
                ? [...genericMetadata[dataset]['columns'], genericMetadata[dataset]['columns_constructed']]
                : [...selectedVariables, ...selectedConstructedVariables];
            // when only the _id is ignored (_id: 0) then all other columns are returned (mongo behavior)
            let menuDownload = {
                type: 'menu',
                metadata: {variables}
            };

            query = queryMongo.buildPipeline([...abstractManipulations, menuDownload])
        }
        else if (queryType === 'aggregate')
            query = queryMongo.buildPipeline([...abstractManipulations, aggregationStaged]);
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
    loadMenu(selectedSubsetName, {recount: true});
}

// we must be very particular about how months get incremented, to handle leap years etc.
export function incrementMonth(date) {
    let months = date.getFullYear() * 12 + date.getMonth() + 1;
    return new Date(Math.floor(months / 12), months % 12);
}

export let isSameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

// positive ints only
export let pad = (number, length) => '0'.repeat(length - String(number).length) + number;
