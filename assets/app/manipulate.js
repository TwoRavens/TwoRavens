import m from 'mithril';
import {TreeAggregate, TreeQuery, TreeTransform} from '../EventData/app/views/TreeSubset';
import CanvasContinuous from '../EventData/app/canvases/CanvasContinuous';
import CanvasDate from '../EventData/app/canvases/CanvasDate';
import CanvasDiscrete from '../EventData/app/canvases/CanvasDiscrete';
import CanvasTransform from '../EventData/app/canvases/CanvasTransform';

import Flowchart from './views/Flowchart';

import Button from '../common/app/views/Button';
import TextField from "../common/app/views/TextField";
import PanelList from "../common/app/views/PanelList";
import ButtonRadio from "../common/app/views/ButtonRadio";
import Panel from "../common/app/views/Panel";
import Table from "../common/app/views/Table";
import Canvas from "../common/app/views/Canvas";

import * as subset from "../EventData/app/app";
import * as app from './app';
import * as common from '../common/app/common';
import * as queryAbstract from '../EventData/app/queryAbstract';
import * as queryMongo from "../EventData/app/queryMongo";

// dataset name from app.domainIdentifier.name
// variable names from app.valueKey

export function menu() {

    return [
        // stage button
        constraintMenu && m(Button, {
            id: 'btnStage',
            style: {
                right: `calc(${common.panelOpen['right'] ? '500' : '16'}px + ${common.panelMargin}*2)`,
                bottom: `calc(${common.heightFooter} + ${common.panelMargin} + 6px + ${subset.tableData ? subset.tableHeight : '0px'})`,
                position: 'fixed',
                'z-index': 100,
                'box-shadow': 'rgba(0, 0, 0, 0.3) 0px 2px 3px'
            },
            onclick: () => {
                let name = constraintMenu.type === 'transform' ? ''
                    : constraintMetadata.type  + ': ' + constraintMetadata.columns[0];

                let success = queryAbstract.addConstraint(
                    app.domainIdentifier.name,  // the pipeline identifier
                    constraintMenu.step,  // the step the user is currently editing
                    constraintPreferences,  // the menu state for the constraint the user currently editing
                    constraintMetadata,  // info used to draw the menu (variables, menu type),
                    name
                );

                // clear the constraint menu
                if (success) {
                    setConstraintMenu(undefined);
                    common.setPanelOpen('right');
                    updatePreviewTable({reset: true});
                }
            }
        }, 'Stage'),

        m(Canvas, {
            attrsAll: {style: {height: `calc(100% - ${common.heightHeader} - ${subset.tableData ? subset.tableHeight : '0px'} - ${common.heightFooter})`}}
        }, canvas(app.domainIdentifier.name)),
        subset.tableData && previewTable()
    ];
}

export function canvas(pipelineId) {
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
        'discrete': CanvasDiscrete,
        'date': CanvasDate
    }[constraintMetadata.type], {
        mode: {
            'subset': 'subset',
            'unit': 'aggregate',
            'accumulator': 'aggregate'
        }[constraintMenu.type],
        pipeline,
        subsetName: constraintMenu.name,
        data: constraintData,
        preferences: constraintPreferences,
        metadata: constraintMetadata,
        redraw, setRedraw
    })
}

export function previewTable() {
    return m("[id='previewTable']", {
            style: {
                "position": "fixed",
                "bottom": common.heightFooter,
                "height": subset.tableHeight,
                "width": "100%",
                "border-top": "1px solid #ADADAD",
                "overflow-y": "scroll",
                "overflow-x": "auto",
                'z-index': 100
            },
            onscroll: () => {
                // don't apply infinite scrolling when list is empty
                if (subset.tableData === 0) return;

                let container = document.querySelector('#previewTable');
                let scrollHeight = container.scrollHeight - container.scrollTop;
                if (scrollHeight < container.offsetHeight + 100) updatePreviewTable();
            }
        },
        m(Table, {
            // headers: [...subset.tableHeaders, ...subset.tableHeadersEvent],
            data: subset.tableData || []
        })
    );
}

export function leftpanel() {
    if (!app.domainIdentifier || !subset.manipulations[app.domainIdentifier.name] || !constraintMenu)
        return;

    let pipeline = subset.manipulations[app.domainIdentifier.name];
    let baseVariables = app.allNodes.map(node => node.name);

    let variables = (constraintMenu
        ? [...queryMongo.buildPipeline(pipeline.slice(0, pipeline.indexOf(constraintMenu.step)),
            new Set(baseVariables))['variables']]
        : baseVariables).sort(variableSort);

    if (constraintMenu.type === 'accumulator') variables = variables.filter(column => inferType(column) === 'discrete');
    if (constraintMenu.type === 'unit') variables = variables.filter(column => inferType(column) !== 'discrete');

    return m(Panel, {
            side: 'left',
            label: 'Constraint Configuration',
            hover: !app.is_manipulate_mode,
            width: app.modelLeftPanelWidths[app.leftTab],
            attrsAll: {
                style: {
                    'z-index': 101,
                    // subtract header, spacer, spacer, scrollbar, table, and footer
                    height: `calc(100% - ${common.heightHeader} - 2*${common.panelMargin} - ${subset.tableData ? subset.tableHeight : '0px'} - ${common.heightFooter})`
                }
            }
        },
        constraintMenu.type !== 'transform' && constraintMetadata.type !== 'date' && [
            m(ButtonRadio, {
                id: 'subsetTypeButtonBar',
                onclick: setConstraintType,
                activeSection: constraintMetadata.type,
                sections: ['continuous', 'discrete'].map(type => ({value: type}))
            })
        ],
        m(TextField, {
            id: 'searchVar',
            placeholder: 'Search variables',
            oninput: setVariableSearch
        }),
        m(PanelList, {
            id: 'varList',
            items: variables,
            colors: constraintMenu.type === 'transform' && constraintPreferences.usedTerms
                ? {[common.selVarColor]: [...constraintPreferences.usedTerms.variables]}
                : {[app.hexToRgba(common.selVarColor)]: (constraintMetadata || {}).columns || []},
            classes: {
                'item-bordered': variables.filter(variable =>
                    variableSearch !== '' && variable.toLowerCase().includes(variableSearch))
            },
            callback: constraintMenu.type !== 'transform'
                ? x => setConstraintColumn(x)
                : x => constraintPreferences.insert(x),
            popup: variable => app.popoverContent(variableMetadata[variable]),
            attrsItems: {'data-placement': 'right', 'data-original-title': 'Summary Statistics'},
            attrsAll: {
                style: {
                    height: 'calc(100% - 116px)',
                    overflow: 'auto'
                }
            }
        })
    )
}


export function rightpanel() {

    return m(Panel, {
        side: 'right',
        label: 'Pipeline',
        hover: true,
        width: '500px',
        attrsAll: {
            style: {
                'z-index': 101,
                // subtract header, spacer, spacer, scrollbar, table, and footer
                height: `calc(100% - ${common.heightHeader} - 2*${common.panelMargin} - ${subset.tableData ? subset.tableHeight : '0px'} - ${common.heightFooter})`
            }
        }
    }, m(PipelineFlowchart, {pipelineId: app.domainIdentifier.name}));
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
                                m('h5', 'Column Accumulations'),
                                m(TreeAggregate, {id: pipelineId + step.id + 'accumulator', data: step.measuresAccum}),
                            ],

                            !step.measuresAccum.length && [warn('must have accumulator to output data'), m('br')],
                            // Enable to only show button if last element: pipeline.length - 1 === i &&
                            [
                                m(Button, {
                                    id: 'btnAddUnitMeasure',
                                    class: ['btn-sm'],
                                    style: {margin: '0.5em'},
                                    onclick: () => setConstraintMenu({type: 'unit', step})
                                }, plus, ' Unit Measure'),
                                m(Button, {
                                    id: 'btnAddAccumulator',
                                    class: ['btn-sm' + (step.measuresAccum.length ? '' : ' is-invalid')],
                                    style: {margin: '0.5em'},
                                    onclick: () => setConstraintMenu({type: 'accumulator', step})
                                }, plus, ' Accumulator')
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

// when set, the loading spiral is shown in the canvas
export let isLoading = false;

// when set, the constraint menu will rebuild non-mithril elements (like plots) on the next redraw
export let redraw = false;
export let setRedraw = state => redraw = state;

export let constraintMenu;
// let constraintMenuExample = {
//     type: 'transform' || 'subset' || 'unit' || 'accumulator',
//     step: {
//         // varies depending on step type, which is either 'transform', 'subset' or 'aggregate'
//     },
// };

// WARNING: this is a fragile function
export let setConstraintMenu = async (menu) => {
    let updateVariableMetadata = !constraintMenu || (menu || {}).step !== constraintMenu.step;

    Object.keys(constraintPreferences).forEach(key => delete constraintPreferences[key]);

    if (menu === undefined) {
        constraintMenu = menu;
        updatePreviewTable({reset: true});
        return;
    }

    let pipeline = subset.manipulations[app.domainIdentifier.name];
    let variables = [...queryMongo.buildPipeline(
        pipeline.slice(0, pipeline.indexOf(menu.step)),
        new Set(app.valueKey))['variables']];  // get the variables present at this point in the pipeline

    if (updateVariableMetadata) {
        let summaryStep = {
            type: 'menu',
            metadata: {
                type: 'summary',
                variables
            }
        };
        let candidatevariableData = await loadMenu(pipeline.slice(0, pipeline.indexOf(menu.step)), summaryStep, {recount: true});
        if (candidatevariableData) variableMetadata = candidatevariableData;
        else {
            alert('The pipeline at this stage matches no records. Delete constraints to match more records.');
            constraintMenu = undefined;
            updatePreviewTable({reset: true});
            m.redraw();
            return;
        }
    }

    constraintMenu = menu;
    common.setPanelOpen('right', false);

    if (constraintMenu.step.type === 'aggregate')
        constraintMetadata.measureType = menu.type;

    if (constraintMenu.step.type === 'transform') {
        updatePreviewTable({reset: true});
        m.redraw();
        return;
    }

    if (constraintMenu.type === 'accumulator') variables = variables.filter(column => inferType(column) === 'discrete');
    if (constraintMenu.type === 'unit') variables = variables.filter(column => inferType(column) !== 'discrete');

    // select a random variable none selected yet, or previously selected variable no longer available
    let variable = !constraintMetadata.columns || variables.indexOf(constraintMetadata.columns[0]) === -1
        ? variables[Math.floor(Math.random() * variables.length)]
        : constraintMetadata.columns[0];

    setConstraintColumn(variable, {suppress: true});

    loadMenuManipulations();
    updatePreviewTable({reset: true});
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

    setConstraintType(inferType(column), {suppress: true});

    Object.keys(constraintPreferences).forEach(key => delete constraintPreferences[key]);
    constraintData = undefined;
    if (!suppress) loadMenuManipulations();
};

export let inferType = variable => {
    // initial inference based on data type
    let type = variableMetadata[variable].types.indexOf('string') !== -1 ? 'discrete' : 'continuous';

    // force date type if possible
    if (variableMetadata[variable].types.indexOf('date') !== -1) type = 'date';

    // switch to discrete if there is a small number of unique values
    if (type === 'continuous' && variableMetadata[variable].uniques <= 10) type = 'discrete';
    return type;
};

export let setConstraintType = (type, {suppress}={}) => {

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


export let updatePreviewTable = async ({reset}={}) => {

    if (reset || !constraintMenu) {
        previewSkip = 0;
        subset.setTableData(undefined);
    }

    if (!constraintMenu || (subset.tableData || []).length - previewSkip < 0) return;

    let previewMenu = {
        type: 'menu',
        metadata: {
            type: 'peek',
            skip: previewSkip,
            limit: previewBatchSize
        }
    };
    previewSkip += previewBatchSize;

    let pipeline = subset.manipulations[app.domainIdentifier.name];
    let data = await loadMenu(
        pipeline.slice(0, pipeline.indexOf(stage => stage === constraintMenu.step)),
        previewMenu
    );

    if (data.length) {
        subset.setTableData((subset.tableData || []).concat(data));
        m.redraw();
    }
};

// for the data preview at the bottom of the page
let previewSkip = 0;
let previewBatchSize = 100;
