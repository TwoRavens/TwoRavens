import * as fileSaver from 'file-saver';
import m from 'mithril';

import {mongoURL, looseSteps, alignmentData, formattingData, alertError, alertLog} from "../app";
import * as common from '../../common/common';

import * as queryMongo from '../manipulations/queryMongo';
import * as tour from "./tour";
import {datamartURL} from "../app";

export let link = url => m('a', {href: url, style: {color: 'darkblue'}, target: '_blank', display: 'inline'}, url);

// ~~~~ EVENTDATA STATE / MUTATORS ~~~

export let aboutText = 'TwoRavens for Event Data v1.0 "Back Bay" -- ' +
    'Event data contains information for descriptive, predictive and inferential statistical analysis of political and social actions. ' +
    'TwoRavens for Event Data (v1.0) allows researchers to access event data collections, visualize the data, and construct subsets and aggregations. ' +
    'Newly constructed datasets may be curated and saved for reuse.';

// eventdata has a fixed pipeline of [Subset] -> [Aggregate]
export let eventdataSubsetCount = 1;

// metadata for all available eventdata datasets and type formats
export let genericMetadata = {};

// geojson region data for specific formats
export let geojsonData = {};
window.geojsonData = geojsonData;

export let manipulations = [];
window.manipulations = manipulations;

export let setMetadata = (data) => Object.keys(data).forEach(key =>
    Object.keys(data[key]).forEach(identifier => ({
        'collections': genericMetadata,
        'formats': formattingData,
        'alignments': alignmentData,
        'geojson': geojsonData,
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
        alignmentLog = realignQuery(looseSteps['pendingSubset'], previousSelectedDataset, selectedDataset);
        preferencesLog = realignPreferences(previousSelectedDataset, selectedDataset);
        variablesLog = realignVariables(previousSelectedDataset, selectedDataset);

        manipulations.map(step => {

            alignmentLog.push(...realignQuery(step, previousSelectedDataset, selectedDataset));

            /*
            let subsetTree = $('#subsetTree' + step.id);
            let state = subsetTree.tree('getState');
            subsetTree.tree('loadData', step.abstractQuery);
            subsetTree.tree('setState', state);
            */
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
    if (mode === 'subset' && (selectedCanvas !== 'Subset' || !subsetKeys.includes(selectedSubsetName)))
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
    if (['About', 'Datasets', 'Saved Queries'].includes(canvasKey)) selectedCanvasHome = canvasKey;
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

if (IS_EVENTDATA_DOMAIN) {
    window.addEventListener('resize', handleResize);

    common.setPanelCallback('right', () => {
        common.setPanelOcclusion('right', `calc(${common.panelOpen['right'] ? '250px' : '16px'} + 2*${common.panelMargin})`);
        handleResize();
    });

    common.setPanelCallback('left', () => {
        common.setPanelOcclusion('left', `calc(${common.panelOpen['left'] ? '250px' : '16px'} + 2*${common.panelMargin})`);
        handleResize();
    });
}

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

    let peekPipeline = queryMongo.buildPipeline([...manipulations, peekMenu])['pipeline'];

    console.log("Peek Query:");
    console.log(JSON.stringify(peekPipeline));

    // cancel the request
    if (!peekIsGetting) return;

    let data = await getEventData({
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

/**
 *  Return the metadata used for both downloading
 *  as well as writing a file to the server
 *
 *  If available, retrieve the selected and selected constructed variables
 *  else default to using all variables
 */
export let getManipPipelineVariables = () => {

  let manipPipelineVariables = {
      type: 'menu',
      metadata: {
          type: 'data',
          variables: (selectedVariables.size + selectedConstructedVariables.size) === 0
              ? [
                  ...genericMetadata[selectedDataset]['columns'],
                  ...genericMetadata[selectedDataset]['columns_constructed']
              ] : [
                  ...selectedVariables,
                  ...selectedConstructedVariables
              ]
      }
  };
  return manipPipelineVariables;
}

/*
 *  Send Mongo query to create file on the server
 *  - build the same pipeline as the download step
 *
 */
export let createEvtDataFile = async () => {
    // Local copy of the manipulations array.
    // TODO: An undefined is making its way into the manipulations pipeline
    let exportManipulations = manipulations.filter(_=>_);

    if ('subset' === selectedMode)
        exportManipulations.push(getManipPipelineVariables());

    if ('aggregate' === selectedMode) {
        if (looseSteps['eventdataAggregate'].measuresAccum.length === 0) {
            tour.tourStartEventMeasure();
            return;
        }
        exportManipulations.push(looseSteps['eventdataAggregate']);
    }

    let compiled = queryMongo.buildPipeline(exportManipulations)['pipeline'];
    //let compiled = queryMongo.buildPipeline([...manipulations])['pipeline'];
    let collection_name = selectedDataset;

    console.log('compiled', compiled);
    let evt_data = {
        host: genericMetadata[collection_name].host,
        collection_name: collection_name,
        method: 'aggregate',
        query: JSON.stringify(compiled)
    };

    setLaddaSpinner('btnRavenView', true);

    console.log('->> evt_data', evt_data)

    return m.request({
        url: mongoURL + 'create-evtdata-file',
        method: 'POST',
        body: evt_data
    }).then(response => {
        console.log('response', response)
        if (!response.success) {
            console.log('It failed!!');
        } else {
            console.log('It worked!!');
            if (('data' in response) && ('tworavens_url' in response.data)) {
                //window.location.href = response.data.tworavens_url;
                window.open(response.data.tworavens_url, "_blank");
            }
        }
        console.log(response.message);
        //return response.data;
    }).finally(() => setLaddaSpinner('btnRavenView', false))
};


 /*
  *  Retrieve event data from Mongo
  *
  *   Example request:
  *   { host: "TwoRavens",
  *     collection_name: "cline_speed",
  *     method: "aggregate",
  *     query: "[{"$match":{"EV_TYPE":{"$in":["1"]}}},{"$count":"total"}]"
  *   }
  *
  *
  */
export let getEventData = async body => {
  // console.log('getEventData body', body);
  return m.request({
      url: mongoURL + 'get-eventdata',
      method: 'POST',
      body
  }).then(response => {
      if (!response.success) throw response;
      return response.data;
  });
}  // End: getEventData



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
            url: mongoURL + 'get-metadata',
            method: 'POST',
            body: metadata
        }).then(setMetadata));
    }

    // record count request
    if (recount || totalSubsetRecords === undefined) {
        let countMenu = {type: 'menu', metadata: {type: 'count'}};
        let compiled = JSON.stringify(queryMongo.buildPipeline([...abstractPipeline, countMenu])['pipeline']);

        console.log("Count Query:");
        console.log(compiled);

        promises.push(getEventData({
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
    promises.push(getEventData({
        host: genericMetadata[dataset]['host'],
        collection_name: dataset,
        method: 'aggregate',
        query: compiled
    })
        .then(menu.type === 'menu' ? queryMongo.menuPostProcess[menu.metadata.type] : _=>_)
        .then(response => data = response));

    let success = true;
    let onError = err => {
        if (err === 'no records matched') alertError("No records match your subset. Plots will not be updated.");
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

/* -------------------------------------------------------
  Submit a staged subset.
  -> Triggered by the right panel "Update" button
 ------------------------------------------------------- */
export async function submitSubset() {

    let newMenu = {
        type: 'menu',
        name: selectedSubsetName,
        metadata: genericMetadata[selectedDataset]['subsets'][selectedSubsetName],
        preferences: subsetPreferences[selectedSubsetName]
    };

    let success = await loadMenuEventData([...manipulations, looseSteps['pendingSubset']], newMenu, {recount: true, requireMatch: true});

    if (success) {

        manipulations.push(looseSteps['pendingSubset']);

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
        canvasTypes.forEach(canvas => canvasRedraw[canvas] = true);
        m.redraw();
    } else {
      console.log('loadMenuEventData Failed!!')
    }
}


export async function submitAggregation() {
    if (!looseSteps['eventdataAggregate'].measuresAccum.length) {
        tour.tourStartEventMeasure();
        return;
    }

    setLaddaSpinner('btnUpdate', true);

    let cachedPipeline = queryMongo.buildPipeline([...manipulations, looseSteps['eventdataAggregate']]);

    let data = await loadMenu(manipulations, looseSteps['eventdataAggregate']);
    if (data) {
        tableData = data;
        let {units, accumulators, labels} = cachedPipeline;
        tableHeaders = [...units];
        tableHeadersEvent = [...accumulators];
        aggregationHeadersLabels = labels;
    }
    setLaddaSpinner('btnUpdate', false);

    canvasTypes.forEach(canvas => canvasRedraw[canvas] = true);
    m.redraw()
}




/**
 *  Frontend download using npm `file-saver`
 */
export async function download(collection_name, query) {

    console.log("Download Query:");
    console.log(query);

    let data = await getEventData({
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
    fileSaver.saveAs(file);
}

export async function exportDatamart(collection_name, query) {

    console.log("Export Query:");
    console.log(query);

    let csvPath = await getEventData({
        host: genericMetadata[collection_name].host,
        method: 'aggregate',
        export: 'csv',
        collection_name,
        query
    });


    let response = await m.request(datamartURL + "index", {
        method: 'POST',
        body: {
            source: 'NYU',
            indices: {
                name: 'TwoRavens_EventData_' + collection_name,
                description: JSON.stringify(query),
                data_path: csvPath
            }
        }
    })

    console.warn(response)

    if (!response.success)
        alertError("NYU datamart upload failed: " + response.error)

    alertLog(m('div',
        "Data successfully uploaded (",
        link(response.data),
        "). It may take a few minutes for the link to activate."))
}

export async function reset() {

    let scorchTheEarth = () => {

        console.log('---- scorchTheEarth ----');
        manipulations.length = 0;

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
    if (manipulations.length === 0) {
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

// ~~~~ abstract query realignment ~~~~
// Take an abstract query for one dataset, and turn it into a query for another - with descriptive logs
export function realignQuery(step, source, target) {
    let log = [];
    let sourceSubsets = genericMetadata[source]['subsets'];
    let targetSubsets = genericMetadata[target]['subsets'];

    let toVariableString = (variables) => String(variables.map(variable => variable.replace('TwoRavens_', '')));

    let realignBranch = (query) => {
        return query.map(branch => {
            if (branch.type !== 'rule') {
                branch.children = realignBranch(branch.children);
                if (branch.children.length === 0) {
                    log.push('Removed ' + branch.name + ', because it has no children.');
                    return;
                }
                return branch
            }

            let subsetName = branch.name.replace(' Subset', '');
            if (!(subsetName in targetSubsets)) {
                log.push('Removed ' + branch.name + ', because it does not have an alignment in ' + target + '.');
                return;
            }

            if (branch.subset === 'dyad') {
                let sourceTabs = Object.keys(sourceSubsets[subsetName]['tabs']);
                let targetTabs = Object.keys(targetSubsets[subsetName]['tabs']);

                // This is a bit of a shortcut
                if (sourceTabs.some((_, i) => sourceTabs[i] !== targetTabs[i])) {
                    log.push('Removed ' + branch.name + ', because the column formats are not comparable.');
                    return;
                }

                let sourceFull = sourceTabs.map(tab => sourceSubsets[subsetName]['tabs'][tab]['full']);
                let targetFull = targetTabs.map(tab => targetSubsets[subsetName]['tabs'][tab]['full']);

                let sourceFormats = sourceFull.map(column => genericMetadata[source]['formats'][column]);
                let targetFormats = targetFull.map(column => genericMetadata[target]['formats'][column]);

                // if full column formats are already matching, then return
                if ([sourceFormats, targetFormats].every(formats => formats.every(format => format)) // exists
                    && [0, 1].every(i => sourceFormats[i] === targetFormats[i])) {                   // and equal
                    return branch;
                }

                log.push('Removed ' + branch.name + ', because ' + String(sourceFormats) + ' are not comparable with ' + String(targetFormats));
                return;

                // actor alignments script is on hold
                // // else if realignment can be achieved via filters
                // let sourceFilters = sourceTabs.map(tab => sourceSubsets[subsetName]['tabs'][tab]['filters']);
                // let targetFilters = targetTabs.map(tab => targetSubsets[subsetName]['tabs'][tab]['filters']);
                //
                // let sourceAlignment = app.genericMetadata[source]['alignments'][sourceFull];
                // let targetAlignment = app.genericMetadata[target]['alignments'][targetFull];
                //
                // let relabelDyad = () => branch.children.forEach((monad, i) => monad['column'] = targetFull[i]);
                // if (sourceFormats.every((format, i) => format === targetFormats[i])) {
                //     relabelDyad();
                //     log.push('Relabeled dyad columns in ' + branch.name + '.');
                //     return branch;
                // }
                // else if ((!sourceAlignment || !targetAlignment || sourceAlignment !== targetAlignment)
                //     && targetFormats.some((format, i) => format !== sourceFormats[i])) {
                //     log.push('Removed ' + branch.name + ', because ' + String(sourceFormats) + ' are not comparable with ' + String(targetFormats))
                //     return;
                // }
                //
                // if (sourceAlignment && targetAlignment && sourceAlignment === targetAlignment) {
                //     log.push('Realigned dyad columns in ' + branch.name + '.');
                // }
                // return branch;
            }

            if (branch.subset === 'discrete' || branch.subset === 'discrete_grouped') {
                let sourceColumn = sourceSubsets[subsetName]['columns'][0];
                let targetColumn = targetSubsets[subsetName]['columns'][0];

                let sourceFormat = genericMetadata[source]['formats'][sourceColumn];
                let targetFormat = genericMetadata[target]['formats'][targetColumn];

                if (!sourceFormat || !targetFormat || sourceFormat !== targetFormat) {
                    log.push('Removed ' + branch.name + ', because the column formats are not comparable.');
                    return
                }

                if (branch.column !== targetColumn)
                    log.push('Relabeled column in ' + branch.name + '.');
                branch.column = targetColumn;
                return branch;
            }

            if (branch.subset === 'date') {
                let sourceColumns = sourceSubsets[subsetName]['columns'];
                let targetColumns = targetSubsets[subsetName]['columns'];
                if (branch.children.some((handle, i) => handle['column'] !== targetColumns[i % targetColumns.length]))
                    log.push('Relabeled column intervals in ' + branch.name
                        + ' from ' + toVariableString(sourceColumns) + ' to ' + toVariableString(targetColumns) + '.');

                // the modular indexing is for handling conversions between point and interval date structures
                branch.children.forEach((handle, i) => handle['column'] = targetColumns[i % targetColumns.length]);
                return branch;
            }


            if (branch.subset === 'coordinates') {
                let targetColumns = targetSubsets[subsetName]['columns'];
                if (branch.children.some((orient, i) => orient['column'] !== targetColumns[i]))
                    log.push('Relabeled columns in ' + branch.name + ' from ' + String(branch.children.map(child => child['column'])) + ' to ' + String(targetColumns));
                branch.children.forEach((orient, i) => orient['column'] = targetColumns[i]);
                return branch;
            }

            if (branch.subset === 'custom') {
                log.push('Removed ' + branch.name + ', because custom queries do not have ontological alignments.');
                return;
            }

        }).filter(branch => branch !== undefined) // prune subsets and groups that didn't transfer
    };

    step.abstractQuery = realignBranch(step.abstractQuery);
    return log;
}

export function realignPreferences(source, target) {
    let log = [];
    let sourceSubsets = genericMetadata[source]['subsets'];
    let targetSubsets = genericMetadata[target]['subsets'];

    Object.keys(subsetPreferences).forEach(subset => {
        if (Object.keys(subsetPreferences[subset]).length === 0) return;
        if (!(subset in targetSubsets)) {
            log.push(subset + ' is not available for ' + target + ', but subset preferences have been cached.');
            return;
        }

        if (!sourceSubsets[subset]) {
            return
        }

        let subsetType = targetSubsets[subset]['type'];

        if (subsetType === 'dyad') {
            let sourceTabs = Object.keys(sourceSubsets[subset]['tabs']);
            let targetTabs = Object.keys(targetSubsets[subset]['tabs']);
            // This is a bit of a shortcut
            if (sourceTabs.some((_, i) => sourceTabs[i] !== targetTabs[i])) {
                log.push(subset + ' has a different alignment, so the groups and links from ' + source + ' have been cached and are not visible from ' + target + '.')
            }
        }

        if (subsetType === 'discrete' || subsetType === 'discrete_grouped') {
            let sourceColumn = sourceSubsets[subset]['columns'][0];
            let targetColumn = targetSubsets[subset]['columns'][0];

            let sourceFormat = genericMetadata[source]['formats'][sourceColumn];
            let targetFormat = genericMetadata[target]['formats'][targetColumn];

            if (!sourceFormat || !targetFormat || sourceFormat !== targetFormat) {
                log.push('Cleared menu preferences in ' + subset + ', because the column formats are not comparable.');
                subsetPreferences[subset] = {}
            }
        }
    });
    return log;
}


export function realignVariables(source, target) {
    let log = [];
    let newSelectedVariables = new Set();
    selectedVariables.forEach(variable => {
        if (!(variable in genericMetadata[source]['formats'])) {
            log.push('De-selected ' + variable + ', because it has no recorded equivalent in ' + target + '.');
            return;
        }
        Object.keys(genericMetadata[target]['formats']).forEach(targetVar => {
            let targetFormat = genericMetadata[target]['formats'][targetVar];
            if (targetFormat === genericMetadata[source]['formats'][variable])
                newSelectedVariables.add(targetVar);
        })
    });
    let equivalents = [...newSelectedVariables].filter(x => !selectedVariables.has(x));
    if (equivalents.length !== 0) log.push('Selected equivalent variables: ' + String(equivalents));

    setSelectedVariables(newSelectedVariables);
    setSelectedConstructedVariables(new Set());
    return log;
}

// positive ints only
export let pad = (number, length) => '0'.repeat(length - String(number).length) + number;
