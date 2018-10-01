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

export function menu(compoundPipeline, pipelineId) {

    return [
        // stage button
        constraintMenu && m(Button, {
            id: 'btnStage',
            style: {
                right: `calc(${common.panelOpen['right'] ? '500' : '16'}px + ${common.panelMargin}*2)`,
                bottom: `calc(${common.heightFooter} + ${common.panelMargin} + 6px + ${subset.tableData ? tableSize : '0px'})`,
                position: 'fixed',
                'z-index': 100,
                'box-shadow': 'rgba(0, 0, 0, 0.3) 0px 2px 3px'
            },
            onclick: () => {
                let name = constraintMenu.type === 'transform' ? ''
                    : constraintMetadata.type  + ': ' + constraintMetadata.columns[0];

                let success = queryAbstract.addConstraint(
                    pipelineId,
                    constraintMenu.step,  // the step the user is currently editing
                    constraintPreferences,  // the menu state for the constraint the user currently editing
                    constraintMetadata,  // info used to draw the menu (variables, menu type),
                    name
                );

                // clear the constraint menu
                if (success) {
                    setConstraintMenu(undefined);
                    common.setPanelOpen('right');
                }
            }
        }, 'Stage'),

        m(Canvas, {
            attrsAll: {style: {height: `calc(100% - ${common.heightHeader} - ${common.heightFooter})`}}
        }, canvas(pipelineId)),
        previewTable(compoundPipeline)
    ];
}

export function canvas(compoundPipeline) {

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
        pipeline: compoundPipeline,
        preferences: constraintPreferences,
        variables: [...queryMongo.buildPipeline(
            constraintMenu.pipeline.slice(constraintMenu.pipeline.indexOf(constraintMenu.step)),
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
        pipeline: compoundPipeline,
        subsetName: constraintMenu.name,
        data: constraintData,
        preferences: constraintPreferences,
        metadata: constraintMetadata,
        redraw, setRedraw
    })
}

export function previewTable(pipeline) {
    if (!subset.tableData) {
        subset.setTableData([]);
        updatePreviewTable('reset', pipeline);
        return;
    }

    return m("[id='previewTable']", {
            style: {
                "position": "fixed",
                "bottom": common.heightFooter,
                "height": tableSize,
                "width": "100%",
                "border-top": "1px solid #ADADAD",
                "overflow-y": "scroll",
                "overflow-x": "auto",
                'z-index': 100,
                'background': 'rgba(255,255,255,.6)'
            },
            onscroll: () => {
                // don't apply infinite scrolling when list is empty
                if (subset.tableData.length === 0) return;

                let container = document.querySelector('#previewTable');
                let scrollHeight = container.scrollHeight - container.scrollTop;
                if (scrollHeight < container.offsetHeight + 100) updatePreviewTable('more', pipeline);
            }
        },
        m('#horizontalDrag', {
            style: {
                position: 'absolute',
                top: '-4px',
                left: 0,
                right: 0,
                height: '12px',
                cursor: 'h-resize',
                'z-index': 1000
            },
            onmousedown: resizeMenu
        }),
        m(Table, {
            // headers: [...subset.tableHeaders, ...subset.tableHeadersEvent],
            id: 'previewTable',
            data: subset.tableData || []
        })
    );
}

export function leftpanel() {
    if (!app.domainIdentifier || !constraintMenu)
        return;

    return m(Panel, {
            side: 'left',
            label: 'Constraint Configuration',
            hover: false,
            width: '300px',
            attrsAll: {
                style: {
                    'z-index': 101,
                    // subtract header, spacer, spacer, scrollbar, table, and footer
                    height: `calc(100% - ${common.heightHeader} - 2*${common.panelMargin} - ${subset.tableData ? tableSize : '0px'} - ${common.heightFooter})`
                }
            }
        },
        varList()
    )
}

export function varList() {
    let baseVariables = app.allNodes.map(node => node.name);

    let variables = (constraintMenu
        ? [...queryMongo.buildPipeline(constraintMenu.pipeline.slice(0, constraintMenu.pipeline.indexOf(constraintMenu.step)),
            new Set(baseVariables))['variables']]
        : baseVariables).sort(variableSort);

    if (constraintMenu.type === 'accumulator') variables = variables.filter(column => inferType(column) === 'discrete');
    if (constraintMenu.type === 'unit') variables = variables.filter(column => inferType(column) !== 'discrete');

    return [
        constraintMenu.type === 'subset' && constraintMetadata.type !== 'date' && variableMetadata[constraintMetadata['columns'][0]]['types'].indexOf('string') === -1 && [
            m(ButtonRadio, {
                id: 'subsetTypeButtonBar',
                onclick: type => setConstraintType(type, constraintMenu.pipeline),
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
                ? variable => setConstraintColumn(variable, constraintMenu.pipeline)
                : variable => constraintPreferences.insert(variable),
            popup: variable => app.popoverContent(variableMetadata[variable]),
            attrsItems: {'data-placement': 'right', 'data-original-title': 'Summary Statistics'},
            attrsAll: {
                style: {
                    height: 'calc(100% - 116px)',
                    overflow: 'auto'
                }
            }
        })
    ]
}


// hardcoded to manipulations mode
export function rightpanel() {

    if (!('name' in app.domainIdentifier)) return;
    if (!(app.domainIdentifier.name in subset.manipulations)) subset.manipulations[app.domainIdentifier.name] = [];

    return m(Panel, {
        side: 'right',
        label: 'Pipeline',
        hover: true,
        width: app.modelRightPanelWidths['Manipulate'],
        attrsAll: {
            style: {
                'z-index': 101,
                // subtract header, spacer, spacer, scrollbar, table, and footer
                height: `calc(100% - ${common.heightHeader} - 2*${common.panelMargin} - ${subset.tableData ? tableSize : '0px'} - ${common.heightFooter})`
            }
        }
    }, m(PipelineFlowchart, {
        compoundPipeline: subset.manipulations[app.domainIdentifier.name],
        pipelineId: app.domainIdentifier.name,
        editable: true
    }));
}

export class PipelineFlowchart {
    view(vnode) {
        // compoundPipeline is used for queries
        // pipelineId is edited and passed into the trees
        let {compoundPipeline, pipelineId, editable, aggregate} = vnode.attrs;

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

                    let deleteButton = editable && pipeline.length - 1 === i && m(`div#stepDelete`, {
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
                            m(TreeTransform, {pipelineId, step, editable}),
                            // Enable to only show button if last element: pipeline.length - 1 === i &&
                            editable && m(Button, {
                                id: 'btnAddTransform',
                                class: ['btn-sm'],
                                style: {margin: '0.5em'},
                                onclick: () => setConstraintMenu({type: 'transform', step, pipeline: compoundPipeline})
                            }, plus, ' Transform')
                        )
                    }

                    if (step.type === 'subset') {
                        content = m('div', {style: {'text-align': 'left'}},
                            deleteButton,
                            m('h4[style=font-size:16px;margin-left:0.5em]', 'Subset'),
                            m(TreeQuery, {pipelineId, step, editable}),

                            editable && [
                                m(Button, {
                                    id: 'btnAddConstraint',
                                    class: ['btn-sm'],
                                    style: {margin: '0.5em'},
                                    onclick: () => setConstraintMenu({type: 'subset', step, pipeline: compoundPipeline})
                                }, plus, ' Constraint'),
                                m(Button, {
                                    id: 'btnAddGroup',
                                    class: ['btn-sm'],
                                    style: {margin: '0.5em'},
                                    disabled: !step.abstractQuery.filter(constraint => constraint.type === 'rule').length,
                                    onclick: () => queryAbstract.addGroup(pipelineId, step)
                                }, plus, ' Group')
                            ]
                        )
                    }

                    if (step.type === 'aggregate') {
                        content = m('div', {style: {'text-align': 'left'}},
                            deleteButton,
                            m('h4[style=font-size:16px;margin-left:0.5em]', 'Aggregate'),

                            step.measuresUnit.length !== 0 && [
                                m('h5', 'Unit Measures'),
                                m(TreeAggregate, {
                                    id: pipelineId + step.id + 'unit',
                                    data: step.measuresUnit,
                                    editable
                                }),
                            ],
                            step.measuresAccum.length !== 0 && [
                                m('h5', 'Column Accumulations'),
                                m(TreeAggregate, {
                                    id: pipelineId + step.id + 'accumulator',
                                    data: step.measuresAccum,
                                    editable
                                }),
                            ],

                            !step.measuresAccum.length && [warn('must have accumulator to output data'), m('br')],
                            // Enable to only show button if last element: pipeline.length - 1 === i &&
                            editable && [
                                m(Button, {
                                    id: 'btnAddUnitMeasure',
                                    class: ['btn-sm'],
                                    style: {margin: '0.5em'},
                                    onclick: () => setConstraintMenu({type: 'unit', step, pipeline: compoundPipeline})
                                }, plus, ' Unit Measure'),
                                m(Button, {
                                    id: 'btnAddAccumulator',
                                    class: ['btn-sm' + (step.measuresAccum.length ? '' : ' is-invalid')],
                                    style: {margin: '0.5em'},
                                    onclick: () => setConstraintMenu({type: 'accumulator', step, pipeline: compoundPipeline})
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
            editable && [
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
                aggregate !== false && m(Button, {
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

    if (!app.is_manipulate_mode) {
        app.setLeftTab('Variables');
        common.setPanelOpen('left');
    }

    Object.keys(constraintPreferences).forEach(key => delete constraintPreferences[key]);

    if (menu === undefined) {
        constraintMenu = menu;
        updatePreviewTable('clear');
        return;
    }

    let variables = [...queryMongo.buildPipeline(
        menu.pipeline.slice(0, menu.pipeline.indexOf(menu.step)),
        new Set(app.valueKey))['variables']];  // get the variables present at this point in the pipeline

    if (updateVariableMetadata) {
        let summaryStep = {
            type: 'menu',
            metadata: {
                type: 'summary',
                variables
            }
        };
        let candidatevariableData = await loadMenu(menu.pipeline.slice(0, menu.pipeline.indexOf(menu.step)), summaryStep, {recount: true});
        if (candidatevariableData) variableMetadata = candidatevariableData;
        else {
            alert('The pipeline at this stage matches no records. Delete constraints to match more records.');
            constraintMenu = undefined;
            updatePreviewTable('clear');
            m.redraw();
            return;
        }
    }

    constraintMenu = menu;
    common.setPanelOpen('right', false);

    if (constraintMenu.step.type === 'aggregate') constraintMetadata.measureType = menu.type;
    if (constraintMenu.step.type === 'transform') {m.redraw(); return;}

    if (constraintMenu.type === 'accumulator') variables = variables.filter(column => inferType(column) === 'discrete');
    if (constraintMenu.type === 'unit') variables = variables.filter(column => inferType(column) !== 'discrete');

    // select a random variable none selected yet, or previously selected variable no longer available
    let variable = !constraintMetadata.columns || variables.indexOf(constraintMetadata.columns[0]) === -1
        ? variables[Math.floor(Math.random() * variables.length)]
        : constraintMetadata.columns[0];

    setConstraintColumn(variable, menu.pipeline);

    loadMenuManipulations(menu.pipeline);
};

export let constraintMetadata = {};
// let constraintMetadataExample = {
//     // may contain additional keys like 'group_by' or 'structure'
//     type: 'continuous' || 'discrete',
//     columns: ['column_1', 'column_2']
// }

export let setConstraintColumn = (column, pipeline) => {
    if ('columns' in constraintMetadata && constraintMetadata.columns[0] === column) pipeline = undefined;
    constraintMetadata.columns = [column];

    setConstraintType(inferType(column));

    Object.keys(constraintPreferences).forEach(key => delete constraintPreferences[key]);
    constraintData = undefined;
    if (pipeline) loadMenuManipulations(pipeline);
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

export let setConstraintType = (type, pipeline) => {

    if (constraintMetadata.type === type) pipeline = undefined;
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
    if (pipeline) loadMenuManipulations(pipeline);
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
export let loadMenu = async (pipeline, menu, {recount, requireMatch}={}) => { // the dict is for optional named arguments

    // convert the pipeline to a mongo query. Note that passing menu extends the pipeline to collect menu data
    let compiled = JSON.stringify(queryMongo.buildPipeline([...pipeline, menu], new Set(app.valueKey))['pipeline']);

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
        let compiled = JSON.stringify(queryMongo.buildPipeline([...pipeline, countMenu], new Set(app.valueKey))['pipeline']);

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
let loadMenuManipulations = async (pipeline) => {
    // make sure basic properties are present
    if (!constraintMetadata || !['type', 'columns'].every(attr => attr in constraintMetadata)) return;
    isLoading = true;

    let newMenu = {
        type: 'menu',
        metadata: constraintMetadata,
        preferences: constraintPreferences
    };

    constraintData = await loadMenu(pipeline.slice(0, -1), newMenu);
    isLoading = false;
    redraw = true;
    m.redraw();
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

export function formatPrecision(value) {
    if (isNaN(value)) return value;

    let precision = 4;

    // convert to Number
    value *= 1;
    // determine number of digits in value
    let digits = Math.max(Math.floor(Math.log10(Math.abs(Number(String(value).replace(/[^0-9]/g, ''))))), 0) + 1;

    if (digits <= precision || precision === 0) return value;
    return value.toPrecision(precision);
}

export let updatePreviewTable = async (option, pipeline) => {

    if (option === 'clear' || option === 'reset') {
        previewSkip = 0;
        subset.setTableData(undefined);
    }

    if (previewIsLoading || option === 'clear' || pipeline === undefined || (subset.tableData || []).length - previewSkip < 0)
        return;

    let variables = [];

    if (app.is_model_mode && app.selectedProblem) {
        let problem = app.disco.find(entry => entry.problem_id === app.selectedProblem);
        variables = [...problem.predictors, problem.target];
    }

    let previewMenu = {
        type: 'menu',
        metadata: {
            type: 'peek',
            skip: previewSkip,
            limit: previewBatchSize,
            variables
        }
    };
    previewSkip += previewBatchSize;

    previewIsLoading = true;
    let data = await loadMenu(
        constraintMenu
            ? pipeline.slice(0, pipeline.indexOf(stage => stage === constraintMenu.step))
            : pipeline,
        previewMenu
    );

    if (data.length === 0 && option === 'reset')
        alert('The pipeline at this stage matches no records. Delete constraints to match more records.');

    data = data.map(record => Object.keys(record).reduce((out, entry) => {
        out[entry] = typeof record[entry] === 'number' ? formatPrecision(record[entry]) : record[entry];
        return out;
    }, {}));
    subset.setTableData((subset.tableData || []).concat(data));
    previewIsLoading = false;
    m.redraw();
};

// for the data preview at the bottom of the page
let previewSkip = 0;
let previewBatchSize = 100;
let previewIsLoading = false;

// window resizing
let isResizingMenu = false;
export let tableSize = `calc(20% + ${common.heightFooter})`;
export let resizeMenu = (e) => {
    isResizingMenu = true;
    document.body.classList.add('no-select');
    resizeMenuTick(e);
};

let resizeMenuTick = (e) => {
    let percent = (1 - e.clientY / app.byId(app.is_manipulate_mode ? 'canvas' : 'main').clientHeight) * 100;
    tableSize = `calc(${Math.max(percent, 0)}% + ${common.heightFooter})`;
    m.redraw();
};

document.onmousemove = (e) => isResizingMenu && resizeMenuTick(e);

document.onmouseup = () => {
    if (isResizingMenu) {
        isResizingMenu = false;
        document.body.classList.remove('no-select');
    }
};