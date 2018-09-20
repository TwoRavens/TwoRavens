import m from 'mithril';
import {TreeAggregate, TreeQuery, TreeTransform} from '../EventData/app/views/TreeSubset';
import Button from '../common/app/views/Button';
import CanvasContinuous from '../EventData/app/canvases/CanvasContinuous';
import CanvasDate from '../EventData/app/canvases/CanvasDate';
import CanvasCategorical from '../EventData/app/canvases/CanvasCategorical';
import CanvasTransform from '../EventData/app/canvases/CanvasTransform';
import Flowchart from './views/Flowchart';

import * as subset from "../EventData/app/app";
import * as app from './app';
import * as common from '../common/app/common';
import * as queryAbstract from '../EventData/app/queryAbstract';
import * as queryMongo from "../EventData/app/queryMongo";

// dataset name from app.domainIdentifier.name
// variable names from app.valueKey

// looks funny, but this isolates the flowchart so that it can be embedded in model mode with different pipelines
export function rightpanel() {
    return m(PipelineFlowchart, {pipelineId: app.domainIdentifier.name})
}

class PipelineFlowchart {
    view(vnode) {
        let {pipelineId} = vnode.attrs;

        if (!(pipelineId in subset.manipulations)) subset.manipulations[pipelineId] = [];
        let pipeline = subset.manipulations[pipelineId];

        let plus = m(`span.glyphicon.glyphicon-plus[style=color: #818181; font-size: 1em; pointer-events: none]`);
        let warn = (text) => m('[style=color:#dc3545;display:inline-block;]', text);

        let currentStepNumber = pipeline.indexOf((constraintMenu || {}).step);

        let isEnabled = () => {
            if (!pipeline.length) return true;
            let finalStep = pipeline.slice(-1)[0];
            if (finalStep.type === 'aggregate' && !finalStep.measuresAccum.length) return false;
            if (finalStep.type === 'subset' && !finalStep.abstractQuery.length) return false;
            if (finalStep.type === 'transform' && !finalStep.transforms.length) return false;
            return true;
        };

        return [
            m(Flowchart, {
                attrsAll: {style: {height: 'calc(100% - 87px)', overflow: 'auto'}},
                steps: pipeline.map((step, i) => {
                    let content;

                    let deleteButton = pipeline.length - 1 === i && m(`div#stepDelete`, {
                        onclick: () => {
                            let removedStep = pipeline.pop();
                            if (constraintMenu && constraintMenu.step === removedStep) {
                                constraintMenu = undefined;
                                Object.keys(constraintMetadata).forEach(key => delete constraintMetadata[key]);
                                Object.keys(constraintPreferences).forEach(key => delete constraintPreferences[key]);
                            }
                        },
                        style: {
                            display: 'inline-block',
                            'margin-right': '1em',
                            transform: 'scale(2, 2)',
                            float: 'right',
                            'font-weight': 'bold',
                            'line-height': '14px'
                        }
                    }, '×');

                    if (step.type === 'transform') {
                        content = m('div', {style: {'text-align': 'left'}},
                            deleteButton,
                            m('h4[style=font-size:16px;margin-left:0.5em]', 'Transformations'),
                            m(TreeTransform, {pipelineId, step}),
                            // Enable to only show button if last element: pipeline.length - 1 === i &&
                            m(Button, {
                                id: 'btnAddTransform',
                                class: ['btn-sm'],
                                style: {margin: '0.5em'},
                                onclick: () => setConstraintMenu({type: 'transform', step})
                            }, plus, ' Transform')
                        )
                    }

                    if (step.type === 'subset') {
                        content = m('div', {style: {'text-align': 'left'}},
                            deleteButton,
                            m('h4[style=font-size:16px;margin-left:0.5em]', 'Subset'),
                            m(TreeQuery, {pipelineId, step}),

                            m(Button, {
                                id: 'btnAddConstraint',
                                class: ['btn-sm'],
                                style: {margin: '0.5em'},
                                onclick: () => setConstraintMenu({type: 'subset', step})
                            }, plus, ' Constraint'),
                            m(Button, {
                                id: 'btnAddGroup',
                                class: ['btn-sm'],
                                style: {margin: '0.5em'},
                                disabled: !step.abstractQuery.filter(constraint => constraint.type === 'rule').length,
                                onclick: () => queryAbstract.addGroup(pipelineId, step)
                            }, plus, ' Group')
                        )
                    }

                    if (step.type === 'aggregate') {
                        content = m('div', {style: {'text-align': 'left'}},
                            deleteButton,
                            m('h4[style=font-size:16px;margin-left:0.5em]', 'Aggregate'),

                            step.measuresUnit.length !== 0 && [
                                m('h5', 'Unit Measures'),
                                m(TreeAggregate, {id: pipelineId + step.id + 'unit', data: step.measuresUnit}),
                            ],
                            step.measuresAccum.length !== 0 && [
                                m('h5', 'Accumulators'),
                                m(TreeAggregate, {id: pipelineId + step.id + 'accumulator', data: step.measuresAccum}),
                            ],

                            !step.measuresAccum.length && [warn('must have accumulator to output data'), m('br')],
                            // Enable to only show button if last element: pipeline.length - 1 === i &&
                            [
                                m(Button, {
                                    id: 'btnAddUnitMeasure',
                                    class: ['btn-sm'],
                                    style: {margin: '0.5em'},
                                    onclick: () => setConstraintMenu({type: 'unit measure', step})
                                }, plus, ' Unit Measure'),
                                m(Button, {
                                    id: 'btnAddEventMeasure',
                                    class: ['btn-sm' + (step.measuresAccum.length ? '' : ' is-invalid')],
                                    style: {margin: '0.5em'},
                                    onclick: () => setConstraintMenu({type: 'event measure', step})
                                }, plus, ' Event Measure')
                            ]
                        )
                    }

                    return {
                        key: 'Step ' + i,
                        color: currentStepNumber === i ? common.selVarColor : common.grayColor,
                        content
                    };
                })
            }),
            m(Button, {
                id: 'btnAddTransform',
                title: 'construct new columns',
                disabled: !isEnabled(),
                style: {margin: '0.5em'},
                onclick: () => pipeline.push({
                    type: 'transform',
                    id: 'transform ' + pipeline.length,
                    transforms: [] // transform name is used instead of nodeId
                })
            }, plus, ' Transform Step'),
            m(Button, {
                id: 'btnAddSubset',
                title: 'filter rows that match criteria',
                disabled: !isEnabled(),
                style: {margin: '0.5em'},
                onclick: () => pipeline.push({
                    type: 'subset',
                    abstractQuery: [],
                    id: 'subset ' + pipeline.length,
                    nodeId: 1,
                    groupId: 1,
                    queryId: 1
                })
            }, plus, ' Subset Step'),
            m(Button, {
                id: 'btnAddAggregate',
                title: 'group rows that match criteria',
                disabled: !isEnabled(),
                style: {margin: '0.5em'},
                onclick: () => pipeline.push({
                    type: 'aggregate',
                    id: 'aggregate ' + pipeline.length,
                    measuresUnit: [],
                    measuresAccum: [],
                    nodeId: 1 // both trees share the same nodeId counter
                })
            }, plus, ' Aggregate Step')
        ]
    }
}

export function manipulateCanvas(pipelineId) {
    let pipeline = subset.manipulations[pipelineId];

    if (isLoading) m('#loading.loader', {
        style: {
            margin: 'auto',
            position: 'relative',
            top: '40%',
            transform: 'translateY(-50%)'
        }
    });

    if (!constraintMenu) return;

    if (constraintMenu.type === 'transform') return m(CanvasTransform, {
        pipeline,
        preferences: constraintPreferences,
        variables: [...queryMongo.buildPipeline(
            pipeline.slice(pipeline.indexOf(constraintMenu.step)),
            new Set(app.valueKey))['variables']]
    });

    if (!constraintData || !constraintMetadata) return;

    return m({
        'continuous': CanvasContinuous,
        'discrete': CanvasCategorical,
        'date': CanvasDate
    }[constraintMetadata.type], {
        mode: {
            'subset': 'subset',
            'unit measure': 'aggregate',
            'event measure': 'aggregate'
        }[constraintMenu.type],
        pipeline,
        subsetName: constraintMenu.name,
        data: constraintData,
        preferences: constraintPreferences,
        metadata: constraintMetadata,
        redraw, setRedraw
    })
}

// when set, the loading spiral is shown in the canvas
export let isLoading = false;

// when set, the constraint menu will rebuild non-mithril elements (like plots) on the next redraw
export let redraw = false;
export let setRedraw = state => redraw = state;

export let constraintMenu;
// let constraintMenuExample = {
//     name: 'Subset' || 'Unit Measure' || 'Event Measure',
//     step: {
//         // varies depending on step type, which is either 'transform', 'subset' or 'aggregate'
//     },
// };
export let setConstraintMenu = async (menu) => {
    let updateVariableMetadata = !constraintMenu || menu && constraintMenu.step !== menu.step;

    constraintMenu = menu;
    Object.keys(constraintPreferences).forEach(key => delete constraintPreferences[key]);

    if (constraintMenu === undefined) return;

    let pipeline = subset.manipulations[app.domainIdentifier.name];
    let variables = [...queryMongo.buildPipeline(
        pipeline.slice(0, pipeline.indexOf(constraintMenu.step)),
        new Set(app.valueKey))['variables']];  // get the variables present at this point in the pipeline

    if (updateVariableMetadata) {
        let summaryStep = {
            type: 'menu',
            metadata: {
                type: 'summary',
                variables
            }
        };
        let candidatevariableData = await loadMenu(pipeline.slice(0, pipeline.indexOf(constraintMenu.step)), summaryStep, {recount: true});
        if (candidatevariableData) variableMetadata = candidatevariableData;
        else {
            alert('The pipeline at this stage matches no records. Delete constraints to match more records.');
            constraintMenu = undefined;
            m.redraw();
            return;
        }
    }

    if (constraintMenu.type === 'transform') return;

    // select a random variable none selected yet, or previously selected variable no longer available
    let variable = !constraintMetadata.columns || variables.indexOf(constraintMetadata.columns[0]) === -1
        ? variables[Math.floor(Math.random() * variables.length)]
        : constraintMetadata.columns[0];

    setConstraintColumn(variable, {suppress: true});

    loadMenuManipulations();
};

export let constraintMetadata = {};
// let constraintMetadataExample = {
//     // may contain additional keys like 'group_by' or 'structure'
//     type: 'continuous' || 'discrete',
//     columns: ['column_1', 'column_2']
// }

export let setConstraintColumn = (column, {suppress}={}) => {
    if ('columns' in constraintMetadata && constraintMetadata.columns[0] === column) suppress = true;
    constraintMetadata.columns = [column];

    setConstraintType(undefined, {suppress: true, infer: true});

    Object.keys(constraintPreferences).forEach(key => delete constraintPreferences[key]);
    constraintData = undefined;
    if (!suppress) loadMenuManipulations();
};


// call with infer: true to guess the most appropriate constraint type based on variableMetadata
export let setConstraintType = (type, {suppress, infer}={}) => {

    if (infer) {
        let column = constraintMetadata.columns[0];

        // initial inference based on data type
        type = variableMetadata[column].types.indexOf('string') !== -1 ? 'discrete' : 'continuous';

        // force date type if possible
        if (variableMetadata[column].types.indexOf('date') !== -1) type = 'date';

        // switch to discrete if there is a small number of unique values
        if (type === 'continuous' && variableMetadata[column].uniques <= 10) type = 'discrete';
    }

    if (constraintMetadata.type === type) suppress = true;
    constraintMetadata.type = type;
    if (constraintMetadata.type === 'continuous') {
        let varMeta = variableMetadata[constraintMetadata.columns[0]];

        constraintMetadata.max = varMeta.max;
        constraintMetadata.min = varMeta.min;
        constraintMetadata.buckets = Math.min(Math.max(10, Math.floor(varMeta.valid / 10)), 100);

        if (varMeta.types.indexOf('string') !== -1) {
            alert(`A density plot cannot be drawn for the nominal variable ${column}. Switching to discrete.`);
            constraintMetadata.type = 'discrete';
        }

        if (varMeta.max === varMeta.min) {
            alert(`The max and min are the same in ${column}. Switching to discrete.`);
            constraintMetadata.type = 'discrete';
        }
    }
    Object.keys(constraintPreferences).forEach(key => delete constraintPreferences[key]);
    constraintData = undefined;
    if (!suppress) loadMenuManipulations();
};

export let getData = async body => m.request({
    url: subset.eventdataURL + 'get-manipulations',
    method: 'POST',
    data: body
}).then(response => {
    if (!response.success) throw response;
    return response.data;
});

// download data to display a menu
export let loadMenu = async (abstractPipeline, menu, {recount, requireMatch}={}) => { // the dict is for optional named arguments

    // convert the pipeline to a mongo query. Note that passing menu extends the pipeline to collect menu data
    let compiled = JSON.stringify(queryMongo.buildPipeline([...abstractPipeline, menu], new Set(app.valueKey))['pipeline']);

    console.log("Menu Query:");
    console.log(compiled);

    let promises = [];

    // collection/dataset name
    let dataset = app.domainIdentifier.name;
    // location of the dataset csv
    let datafile = app.zparams.zd3mdata;

    // record count request
    if (recount || subset.totalSubsetRecords === undefined) {
        let countMenu = {type: 'menu', metadata: {type: 'count'}};
        let compiled = JSON.stringify(queryMongo.buildPipeline([...abstractPipeline, countMenu], new Set(app.valueKey))['pipeline']);

        console.log("Count Query:");
        console.log(compiled);

        promises.push(getData({
            datafile: datafile,
            collection_name: dataset,
            method: 'aggregate',
            query: compiled
        }).then(response => {
            let total = (response[0] || {}).total || 0;

            // intentionally breaks the entire downloading promise array and subsequent promise chain
            if (total === 0 && requireMatch) throw 'no records matched';
            subset.setTotalSubsetRecords(total);
        }));
    }

    let data;
    promises.push(getData({
        datafile: datafile,
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
        alert(err.message);
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


// manipulations mode is for global dataset edits
let loadMenuManipulations = async () => {
    // make sure basic properties are present
    if (!constraintMetadata || !['type', 'columns'].every(attr => attr in constraintMetadata)) return;
    isLoading = true;

    let newMenu = {
        type: 'menu',
        metadata: constraintMetadata,
        preferences: constraintPreferences
    };

    constraintData = await loadMenu(subset.manipulations[app.domainIdentifier.name].slice(0, -1), newMenu);
    isLoading = false;
    redraw = true;
    m.redraw();
};

// in model mode, there are different pipelines for each problem
let loadMenuD3M = async () => {
    isLoading = true;
    let newMenu = {
        type: 'menu',
        metadata: constraintMetadata,
        preferences: constraintPreferences
    };
    constraintData = await loadMenu(problemManipulations[app.selectedProblem].slice(0, -1), newMenu);
    isLoading = false;
    redraw = true;
};

// contains the menu state (which nominal variables are selected, ranges, etc.)
export let constraintPreferences = {};

// contains the raw data used to draw the constraint menu
export let constraintData;

// stores avg, min, max, valids, etc. for intermediate steps in a manipulations pipeline
export let variableMetadata = {};

export let variableSearch = '';
export let setVariableSearch = term => variableSearch = term.toLowerCase();
export let variableSort = (a, b) => {
    [a, b] = [a.toLowerCase(), b.toLowerCase()];
    if (a.includes(variableSearch) === b.includes(variableSearch)) return a.localeCompare(b);
    return a.includes(variableSearch) ? -1 : 1;
};
