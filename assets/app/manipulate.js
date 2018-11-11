import m from 'mithril';
import {TreeAggregate, TreeQuery, TreeTransform} from '../EventData/app/views/TreeSubset';
import CanvasContinuous from '../EventData/app/canvases/CanvasContinuous';
import CanvasDate from '../EventData/app/canvases/CanvasDate';
import CanvasDiscrete from '../EventData/app/canvases/CanvasDiscrete';
import CanvasTransform from '../EventData/app/canvases/CanvasTransform';
import CanvasExpansion from '../EventData/app/canvases/CanvasExpansion';

import Flowchart from './views/Flowchart';

import Button from '../common/app/views/Button';
import TextField from "../common/app/views/TextField";
import PanelList from "../common/app/views/PanelList";
import ButtonRadio from "../common/app/views/ButtonRadio";
import Panel from "../common/app/views/Panel";
import Canvas from "../common/app/views/Canvas";

import * as subset from "../EventData/app/app";
import * as app from './app';
import * as common from '../common/app/common';
import * as queryAbstract from '../EventData/app/queryAbstract';
import * as queryMongo from "../EventData/app/queryMongo";
import hopscotch from 'hopscotch';

// dataset name from app.configurations.name
// variable names from the keys of the initial preprocess variables object


// stores all variable data from preprocess on initial page load
// when hard manipulations are applied, app.preprocess is overwritten,
// but additional hard manipulations and pipeline construction still needs the original preprocess variables
let variablesInitial;
export let setVariablesInitial = vars => variablesInitial = vars;


export function menu(compoundPipeline, pipelineId) {

    return [
        // stage button
        constraintMenu && m(Button, {
            id: 'btnStage',
            style: {
                right: `calc(${common.panelOpen['right'] ? '500' : '16'}px + ${common.panelMargin}*2)`,
                bottom: `calc(${common.heightFooter} + ${common.panelMargin} + 6px + ${app.peekInlineShown && app.peekData ? app.peekInlineHeight : '0px'})`,
                position: 'fixed',
                'z-index': 100,
                'box-shadow': 'rgba(0, 0, 0, 0.3) 0px 2px 3px'
            },
            onclick: () => {
                let name = ['transform', 'expansion'].includes(constraintMenu.type) ? ''
                    : constraintMetadata.type + ': ' + constraintMetadata.columns[0];

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
                    setQueryUpdated(true);
                    common.setPanelOpen('right');
                }
            }
        }, 'Stage'),

        m(Canvas, {
            attrsAll: {style: {height: `calc(100% - ${common.heightHeader} - ${common.heightFooter})`}}
        }, canvas(compoundPipeline))
    ];
}

function canvas(compoundPipeline) {

    if (isLoading) m('#loading.loader', {
        style: {
            margin: 'auto',
            position: 'relative',
            top: '40%',
            transform: 'translateY(-50%)'
        }
    });

    if (!constraintMenu) return;

    let variables = queryMongo.buildPipeline(compoundPipeline, Object.keys(variablesInitial))['variables'];

    if (constraintMenu.type === 'transform') return m(CanvasTransform, {preferences: constraintPreferences, variables});
    if (constraintMenu.type === 'expansion') return m(CanvasExpansion, {preferences: constraintPreferences, variables, metadata: constraintMetadata});

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
        subsetName: constraintMenu.name,
        data: constraintData,
        preferences: constraintPreferences,
        metadata: constraintMetadata,
        redraw, setRedraw
    })
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
                onclick: () => app.setFocusedPanel('left'),
                style: {
                    'z-index': 100 + (app.focusedPanel === 'left'),
                    // subtract header, spacer, spacer, scrollbar, table, and footer
                    height: `calc(100% - ${common.heightHeader} - 2*${common.panelMargin} - ${app.peekInlineShown && app.peekData ? app.peekInlineHeight : '0px'} - ${common.heightFooter})`
                }
            }
        },
        varList()
    )
}

export function varList() {

    let variables = (constraintMenu
        ? [...queryMongo.buildPipeline(constraintMenu.pipeline.slice(0, constraintMenu.pipeline.indexOf(constraintMenu.step)),
            Object.keys(variablesInitial))['variables']]
        : Object.keys(variablesInitial)).sort(variableSort);

    if (constraintMenu.type === 'accumulator') variables = variables.filter(column => inferType(column) === 'discrete');
    if (constraintMenu.type === 'unit') variables = variables.filter(column => inferType(column) !== 'discrete');

    let selectedVariables;
    if (constraintMenu.type === 'transform' && constraintPreferences.usedTerms)
        selectedVariables = [...constraintPreferences.usedTerms.variables];
    else if (constraintMenu.type === 'expansion')
        selectedVariables = Object.keys(constraintPreferences.variables | {});
    else
        selectedVariables = (constraintMetadata || {}).columns || [];

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
            colors: {[app.hexToRgba(common.selVarColor)]: selectedVariables},
            classes: {
                'item-bordered': variables.filter(variable =>
                    variableSearch !== '' && variable.toLowerCase().includes(variableSearch))
            },
            callback: ['transform', 'expansion'].includes(constraintMenu.type)
                ? variable => constraintPreferences.select(variable) // the insert function is defined inside CanvasTransform or CanvasExpansion
                : variable => setConstraintColumn(variable, constraintMenu.pipeline),
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

    return m(Panel, {
        side: 'right',
        label: 'Pipeline',
        hover: true,
        width: app.modelRightPanelWidths['Manipulate'],
        attrsAll: {
            onclick: () => app.setFocusedPanel('right'),
            style: {
                'z-index': 100 + (app.focusedPanel === 'right'),
                // subtract header, spacer, spacer, scrollbar, table, and footer
                height: `calc(100% - ${common.heightHeader} - 2*${common.panelMargin} - ${app.peekInlineShown && app.peekData ? app.peekInlineHeight : '0px'} - ${common.heightFooter})`
            }
        }
    }, m(PipelineFlowchart, {
        compoundPipeline: getPipeline(),
        pipelineId: app.configurations.name,
        editable: true
    }));
}

export class PipelineFlowchart {
    view(vnode) {
        // compoundPipeline is used for queries
        // pipelineId is edited and passed into the trees
        let {compoundPipeline, pipelineId, editable, aggregate} = vnode.attrs;

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
                labelWidth: '5em',
                steps: pipeline.map((step, i) => {
                    let content;

                    let deleteButton = editable && pipeline.length - 1 === i && m(`div#stepDelete`, {
                        onclick: () => {
                            let removedStep = pipeline.pop();
                            setQueryUpdated(true);
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
                            m(TreeTransform, {pipelineId, step, editable, redraw, setRedraw}),
                            // Enable to only show button if last element: pipeline.length - 1 === i &&
                            editable && m(Button, {
                                id: 'btnAddTransform',
                                class: ['btn-sm'],
                                style: {margin: '0.5em'},
                                title: 'Construct a new variable from other variables',
                                onclick: () => setConstraintMenu({type: 'transform', step, pipeline: compoundPipeline})
                            }, plus, ' Transform'),
                            editable && m(Button, {
                                id: 'btnAddExpansion',
                                class: ['btn-sm'],
                                style: {margin: '0.5em'},
                                title: 'Basis expansions, variable codings, interaction terms',
                                onclick: () => setConstraintMenu({type: 'expansion', step, pipeline: compoundPipeline})
                            }, plus, ' Expansion')
                        )
                    }

                    if (step.type === 'subset') {
                        content = m('div', {style: {'text-align': 'left'}},
                            deleteButton,
                            m('h4[style=font-size:16px;margin-left:0.5em]', 'Subset'),
                            m(TreeQuery, {pipelineId, step, editable, redraw, setRedraw}),

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
                                    onclick: () => {
                                        setQueryUpdated(true);
                                        queryAbstract.addGroup(pipelineId, step);
                                    }
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
                                    pipelineId,
                                    stepId: step.id,
                                    measure: 'unit',
                                    data: step.measuresUnit,
                                    editable,
                                    redraw, setRedraw
                                }),
                            ],
                            step.measuresAccum.length !== 0 && [
                                m('h5', 'Column Accumulations'),
                                m(TreeAggregate, {
                                    pipelineId,
                                    stepId: step.id,
                                    measure: 'unit',
                                    data: step.measuresAccum,
                                    editable,
                                    redraw, setRedraw
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
                                    onclick: () => setConstraintMenu({
                                        type: 'accumulator',
                                        step,
                                        pipeline: compoundPipeline
                                    })
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
                        transforms: [], // transform name is used instead of nodeId
                        expansions: []
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

let datasetChangedTour = {
    id: "changed_dataset",
    i18n: {doneBtn: 'Ok'},
    showCloseButton: true,
    scrollDuration: 300,
    steps: [
        {
            target: 'btnModel',
            placement: 'top',
            title: 'Dataset Changed',
            content: 'The dataset has changed. Upon switching back to model mode, new problems will be inferred and any existing problem pipelines will be erased.'
        }
    ]
};

export let pendingHardManipulation = false;
// called when a query is updated
export let setQueryUpdated = async state => {

    // the first time we have an edit to the hard manipulations:
    if (app.is_manipulate_mode) {
        if (!pendingHardManipulation && state) {
            hopscotch.startTour(datasetChangedTour, 0);
            Object.keys(subset.manipulations)
                .filter(key => key !== app.configurations.name)
                .forEach(key => delete subset.manipulations[key])
        }
        pendingHardManipulation = state;
    }

    // if we have an edit to the problem manipulations
    if (!app.is_manipulate_mode) {
        let problem = app.disco.find(prob => prob.problem_id === app.selectedProblem);
        if (!problem) return;

        // promote the problem to a user problem if it is a system problem
        if (problem.system === 'auto') {

            problem = app.getProblemCopy(app.selectedProblem);
            // this will force the automatic pipeline to get rebuilt without user edits
            delete subset.manipulations[app.selectedProblem];
            problem.predictorsInitial = [...problem.predictors]; // the predictor list will be edited to include transformed variables
            app.disco.push(problem);

            redraw = true;

            app.setSelectedProblem(problem.problem_id);
        }

        if (!problem.predictorsInitial) problem.predictorsInitial = problem.predictors;

        let problemPipeline = getProblemPipeline(app.selectedProblem) || [];

        let transformVars = getTransformVariables(problemPipeline);
        problem.transform = getTransformString(problemPipeline);
        problem.predictors = [...new Set([...problem.predictorsInitial, ...transformVars])];
        problem.pending = true;

        // if the predictors changed, then redraw the force diagram
        if (app.nodes.length !== problem.predictors.length || app.nodes.some(node => !problem.predictors.includes(node.name)))
            app.discoveryClick(app.selectedProblem);

        let countMenu = {type: 'menu', metadata: {type: 'count'}};
        loadMenu([...getPipeline(), ...problemPipeline], countMenu).then(count => {
            setTotalSubsetRecords(count);
            m.redraw();
        });
        app.resetPeek();
    }
};

// returns the fragment of a pipeline representing a problem
export let getProblemPipeline = problemId => {
    let problem = app.disco.find(prob => prob.problem_id === problemId);
    if (!problem) return;
    if (!(problem.problem_id in subset.manipulations)) subset.manipulations[problem.problem_id] = [];

    return subset.manipulations[problem.problem_id];
};

export let getPipeline = (problemId) => {
    if (!(app.configurations.name in subset.manipulations)) subset.manipulations[app.configurations.name] = [];
    return [...subset.manipulations[app.configurations.name], ...(getProblemPipeline(problemId) || [])];
};

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
        app.resetPeek();
        return;
    }

    if (!variablesInitial) setVariablesInitial(app.preprocess);

    let variables = [...queryMongo.buildPipeline(
        menu.pipeline.slice(0, menu.pipeline.indexOf(menu.step)),
        Object.keys(variablesInitial))['variables']];  // get the variables present at this point in the pipeline

    // variable metadata
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
            app.resetPeek();
            m.redraw();
            return;
        }
    }

    constraintMenu = menu;
    common.setPanelOpen('right', false);

    if (constraintMenu.step.type === 'aggregate') constraintMetadata.measureType = menu.type;
    if (constraintMenu.step.type === 'transform') {
        m.redraw();
        return;
    }

    if (constraintMenu.type === 'accumulator') variables = variables.filter(column => inferType(column) === 'discrete');
    if (constraintMenu.type === 'unit') variables = variables.filter(column => inferType(column) !== 'discrete');

    // select a random variable none selected yet, or previously selected variable no longer available
    let variable = !constraintMetadata.columns || variables.indexOf(constraintMetadata.columns[0]) === -1
        ? variables[Math.floor(Math.random() * variables.length)]
        : constraintMetadata.columns[0];

    setConstraintColumn(variable);
    loadMenuManipulations(menu.pipeline);
};

export let constraintMetadata = {};
// let constraintMetadataExample = {
//     // may contain additional keys like 'group_by' or 'structure'
//     type: 'continuous' || 'discrete',
//     columns: ['column_1', 'column_2']
// }

export let setConstraintColumn = (column, pipeline) => {
    if ('columns' in constraintMetadata && constraintMetadata.columns[0] === column) return;
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

export let setExpansionType = (type) => {
    constraintMetadata.type = type;
};

export let getData = async body => m.request({
    url: subset.eventdataURL + 'get-data',
    method: 'POST',
    data: body
}).then(response => {
    if (!response.success) throw response;
    return response.data;
});

// download data to display a menu
export let loadMenu = async (pipeline, menu, {recount, requireMatch} = {}) => { // the dict is for optional named arguments

    if (!variablesInitial) setVariablesInitial(app.preprocess);

    // convert the pipeline to a mongo query. Note that passing menu extends the pipeline to collect menu data
    let compiled = JSON.stringify(queryMongo.buildPipeline([...pipeline, menu],
        Object.keys(variablesInitial))['pipeline']);

    console.log("Menu Query:");
    console.log(compiled);

    let promises = [];

    // collection/dataset name
    let dataset = app.configurations.name;
    // location of the dataset csv
    let datafile = app.zparams.zd3mdata;

    // record count request
    if (recount) {
        let countMenu = {type: 'menu', metadata: {type: 'count'}};
        let compiled = JSON.stringify(queryMongo.buildPipeline([...pipeline, countMenu], Object.keys(variablesInitial))['pipeline']);

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
            setTotalSubsetRecords(total);
        }));
    }

    let data;
    promises.push(getData({
        datafile: datafile,
        collection_name: dataset,
        method: 'aggregate',
        query: compiled
    })
        .then(menu.type === 'menu' ? queryMongo.menuPostProcess[menu.metadata.type] : _ => _)
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

export let rebuildPreprocess = async () => {

    let menuDownload = {
        type: 'menu',
        metadata: {
            type: 'data'
        }
    };

    let compiled = JSON.stringify(queryMongo.buildPipeline(
        [...getPipeline(), menuDownload],
        Object.keys(variablesInitial))['pipeline']);

    let dataPath = await getData({
        datafile: app.zparams.zd3mdata,
        collection_name: app.configurations.name,
        method: 'aggregate',
        query: compiled,
        export: true
    });

    let targetPath = dataPath.split('/').slice(0, dataPath.split('/').length - 1).join('/') + '/preprocess.json';

    let response = await m.request({
        method: 'POST',
        url: ROOK_SVC_URL + 'preprocessapp',
        data: {
            data: dataPath,
            target: targetPath,
            datastub: app.configurations.name,
            delimiter: '\t'
        }
    });

    console.log("preprocess response");
    console.log(response);

    if (!response) {
        console.log('preprocess failed');
        alert('preprocess failed. ending user session.');
        app.endsession();
        return;
    }

    // update state with new preprocess metadata
    response.dataset.private !== undefined && app.setPriv(response.dataset.private);

    app.setPreprocess(response.variables);
    app.setValueKey(Object.keys(response.variables));
    app.setAllNodes(app.valueKey.map((variable, i) => jQuery.extend(true, {
        id: i,
        reflexive: false,
        name: variable,
        labl: 'no label',
        data: [5, 15, 20, 0, 5, 15, 20],
        count: [.6, .2, .9, .8, .1, .3, .4],
        nodeCol: common.colors(i),
        baseCol: common.colors(i),
        strokeColor: common.selVarColor,
        strokeWidth: "1",
        subsetplot: false,
        subsetrange: ["", ""],
        setxplot: false,
        setxvals: ["", ""],
        grayout: false,
        group1: false,
        group2: false,
        forefront: false
    }, app.preprocess[variable])));

    app.restart();
    hopscotch.endTour();

    app.setDisco(app.discovery(response));
    app.setMytarget(app.disco[0].target);
    app.setSelectedProblem(undefined);

    setQueryUpdated(false);
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

export let totalSubsetRecords;
export let setTotalSubsetRecords = records => totalSubsetRecords = records;

export async function buildDatasetUrl(problem) {
    let problemStep = {
        type: 'menu',
        metadata: {
            type: 'data',
            variables: [...problem.predictors, problem.target]
        }
    };

    let compiled = queryMongo.buildPipeline([...getPipeline(problem.problem_id), problemStep], Object.keys(variablesInitial))['pipeline'];

    return await getData({
        datafile: app.zparams.zd3mdata,  // location of the dataset csv
        collection_name: app.configurations.name,
        method: 'aggregate',
        query: JSON.stringify(compiled),
        export: true
    });
}

export let getTransformVariables = pipeline => pipeline.reduce((out, step) => {
    if (step.type !== 'transform') return out;
    step.transforms.forEach(transform => out.add(transform.name));
    step.expansions.forEach(expansion => queryMongo.expansionTerms(expansion).forEach(term => out.add(term)));

    return out;
}, new Set());

export let getTransformString = pipeline => pipeline
    .filter(step => step.type === 'transform')
    .map(step => step.transforms.map(transform => `${transform.name} = ${transform.equation}`).join(', '))
    .join(', ');
