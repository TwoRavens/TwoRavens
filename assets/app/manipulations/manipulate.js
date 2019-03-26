import m from 'mithril';
import {TreeAggregate, TreeSubset, TreeTransform, TreeImputation} from '../views/JQTrees';
import CanvasContinuous from '../canvases/CanvasContinuous';
import CanvasDate from '../canvases/CanvasDate';
import CanvasDiscrete from '../canvases/CanvasDiscrete';
import CanvasTransform from '../canvases/CanvasTransform';

import Flowchart from '../views/Flowchart';

import Button from '../../common/views/Button';
import TextField from "../../common/views/TextField";
import PanelList from "../../common/views/PanelList";
import ButtonRadio from "../../common/views/ButtonRadio";
import Panel from "../../common/views/Panel";
import Canvas from "../../common/views/Canvas";
import * as common from '../../common/common';

import * as app from '../app';

import * as queryAbstract from './queryAbstract';
import * as queryMongo from "./queryMongo";
import hopscotch from 'hopscotch';
import CanvasImputation from "../canvases/CanvasImputation";
import {alertLog, alertError} from "../app";
import Icon from "../views/Icon";

export function menu(compoundPipeline, pipelineId) {

    return [
        // stage button
        constraintMenu && [
            m(Button, {
                id: 'btnStageCancel',
                style: {
                    right: `calc(${common.panelOpen['right'] ? '500' : '16'}px + ${common.panelMargin}*2 + 70px)`,
                    bottom: `calc(${common.heightFooter} + ${common.panelMargin} + 6px + ${app.peekInlineShown && app.peekData ? app.peekInlineHeight : '0px'})`,
                    position: 'fixed',
                    'z-index': 100,
                    'box-shadow': 'rgba(0, 0, 0, 0.3) 0px 2px 3px'
                },
                onclick: () => {
                    setConstraintMenu(undefined);
                    common.setPanelOpen('right');
                }
            }, 'Cancel'),
            m(Button, {
                id: 'btnStage',
                style: {
                    right: `calc(${common.panelOpen['right'] ? '500' : '16'}px + ${common.panelMargin}*2)`,
                    bottom: `calc(${common.heightFooter} + ${common.panelMargin} + 6px + ${app.peekInlineShown && app.peekData ? app.peekInlineHeight : '0px'})`,
                    position: 'fixed',
                    'z-index': 100,
                    'box-shadow': 'rgba(0, 0, 0, 0.3) 0px 2px 3px'
                },
                onclick: async () => {
                    let name = constraintMenu.type === 'transform' ? ''
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
            }, 'Stage')
        ],

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

    let {pipeline, variables} = queryMongo.buildPipeline(compoundPipeline, app.getSelectedDataset().variablesInitial);

    if (constraintMenu.type === 'transform') return m(CanvasTransform, {
        preferences: constraintPreferences,
        pipeline,
        variables,
        metadata: {variables: variableMetadata}
    });

    if (constraintMenu.type === 'imputation') return m(CanvasImputation, {
        preferences: constraintPreferences,
        pipeline,
        variables,
        metadata: {variables: variableMetadata}
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

    let variables = app.getSelectedDataset().variablesInitial;
    let selectedVariables = (constraintMetadata || {}).columns || [];

    if (constraintMenu) {
        let partialPipeline = constraintMenu.pipeline.slice(0, constraintMenu.pipeline.indexOf(constraintMenu.step));
        variables = [...queryMongo.buildPipeline(partialPipeline, variables)['variables']];

        if (constraintMenu.type === 'accumulator')
            variables = variables.filter(column => inferType(column) === 'discrete');
        if (constraintMenu.type === 'unit')
            variables = variables.filter(column => inferType(column) !== 'discrete');

        if (constraintMenu.type === 'imputation')
            selectedVariables = [...(constraintPreferences.selectedVariables || [])];

        if (constraintMenu.type === 'transform') {
            if (constraintPreferences.type === 'Equation' && constraintPreferences.menus.Equation.usedTerms)
                selectedVariables = [...constraintPreferences.menus.Equation.usedTerms.variables];
            if (constraintPreferences.type === 'Expansion') {
                variables = [...new Set([
                    ...Object.keys(app.getSelectedDataset().summaries),
                    ...getTransformVariables(partialPipeline)
                ])];
                selectedVariables = Object.keys(constraintPreferences.menus.Expansion.variables || {});
            }
            if (constraintPreferences.type === 'Binning') {
                selectedVariables = [constraintPreferences.menus.Binning.variableIndicator];
                variables = variables.filter(variable => variableMetadata[variable].types.indexOf('string') === -1)
            }
            if (constraintPreferences.type === 'Manual')
                selectedVariables = [constraintPreferences.menus.Manual.variableIndicator];
        }
    }

    variables = variables.sort(variableSort);

    return [
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
                'item-bordered': variableSearch === '' ? []
                    : variables.filter(variable => variable.toLowerCase().includes(variableSearch))
            },
            callback: ['transform', 'imputation'].includes(constraintMenu.type)
                ? variable => constraintPreferences.select(variable) // the select function is defined inside CanvasTransform
                : variable => setConstraintColumn(variable, constraintMenu.pipeline),
            popup: variable => app.popoverContent(variableMetadata[variable]),
            attrsItems: {'data-placement': 'right', 'data-original-title': 'Summary Statistics'},
            attrsAll: {
                style: {
                    height: 'calc(100% - 80px)',
                    overflow: 'auto'
                }
            }
        }),
        constraintMenu.type === 'subset' && constraintMetadata.type !== 'date'
        && !variableMetadata[constraintMetadata['columns'][0]]['types'].includes('string') && [
            m(ButtonRadio, {
                id: 'subsetTypeButtonBar',
                onclick: type => setConstraintType(type, constraintMenu.pipeline),
                activeSection: constraintMetadata.type,
                sections: ['continuous', 'discrete'].map(type => ({value: type}))
            })
        ],

        constraintMenu.type === 'imputation' && constraintPreferences.selectedVariables && [
            m(ButtonRadio, {
                id: 'imputationSelectAllNone',
                onclick: value => constraintPreferences.selectAll(value === 'all'),
                activeSection: {0: 'none', [variables.length]: 'all'}[constraintPreferences.selectedVariables.size] || 'intermediate',
                sections: ['all', 'none'].map(type => ({value: type}))
            })
        ]
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
            compoundPipeline: app.getSelectedDataset().hardManipulations,
            pipelineId: app.selectedDataset,
            editable: true
        }));
}

export class PipelineFlowchart {
    view(vnode) {
        // compoundPipeline is used for queries
        // pipelineId is edited and passed into the trees
        let {compoundPipeline, pipelineId, editable, aggregate} = vnode.attrs;

        let pipeline = app.manipulations[pipelineId];

        let plus = m(Icon, {name: 'plus'});
        let warn = (text) => m('[style=color:#dc3545;display:inline-block;]', text);

        let currentStepNumber = pipeline.indexOf((constraintMenu || {}).step);

        let isEnabled = () => {
            if (!pipeline.length) return true;
            let finalStep = pipeline.slice(-1)[0];
            if (finalStep.type === 'aggregate' && !finalStep.measuresAccum.length) return false;
            if (finalStep.type === 'subset' && !finalStep.abstractQuery.length) return false;
            if (finalStep.type === 'transform' && !(finalStep.transforms.length + finalStep.expansions.length + finalStep.manual.length)) return false;
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
                                onclick: () => {
                                    setConstraintMenu({type: 'transform', step, pipeline: compoundPipeline});
                                    app.setLeftTab('Variables');
                                    common.setPanelOpen('left');
                                }
                            }, plus, ' Transform')
                        )
                    }

                    if (step.type === 'subset') {
                        content = m('div', {style: {'text-align': 'left'}},
                            deleteButton,
                            m('h4[style=font-size:16px;margin-left:0.5em]', 'Subset'),
                            m(TreeSubset, {pipelineId, step, editable, redraw, setRedraw}),

                            editable && [
                                m(Button, {
                                    id: 'btnAddConstraint',
                                    class: ['btn-sm'],
                                    style: {margin: '0.5em'},
                                    onclick: () => {
                                        setConstraintMenu({type: 'subset', step, pipeline: compoundPipeline});
                                        app.setLeftTab('Variables');
                                        common.setPanelOpen('left');
                                    }
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
                                    onclick: () => {
                                        setConstraintMenu({type: 'unit', step, pipeline: compoundPipeline});
                                        app.setLeftTab('Variables');
                                        common.setPanelOpen('left');
                                    }
                                }, plus, ' Unit Measure'),
                                m(Button, {
                                    id: 'btnAddAccumulator',
                                    class: ['btn-sm' + (step.measuresAccum.length ? '' : ' is-invalid')],
                                    style: {margin: '0.5em'},
                                    onclick: () => {
                                        setConstraintMenu({type: 'accumulator', step, pipeline: compoundPipeline});
                                        app.setLeftTab('Variables');
                                        common.setPanelOpen('left');
                                    }
                                }, plus, ' Accumulator')
                            ]
                        )
                    }

                    if (step.type === 'imputation') {
                        content = m('div', {style: {'text-align': 'left'}},
                            deleteButton,
                            m('h4[style=font-size:16px;margin-left:0.5em]', 'Imputation'),

                            step.imputations.length !== 0 && m(TreeImputation, {
                                pipelineId,
                                step,
                                editable
                            }),

                            // Enable to only show button if last element: pipeline.length - 1 === i &&
                            editable && m(Button, {
                                id: 'btnAddImputation',
                                class: ['btn-sm'],
                                style: {margin: '0.5em'},
                                onclick: () => {
                                    setConstraintMenu({type: 'imputation', step, pipeline: compoundPipeline});
                                    app.setLeftTab('Variables');
                                    common.setPanelOpen('left');
                                }
                            }, plus, ' Imputation')
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
                        expansions: [],
                        binnings: [],
                        manual: []
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
                }, plus, ' Aggregate Step'),
                m(Button, {
                    id: 'btnAddImputation',
                    title: 'manage missing data',
                    disabled: !isEnabled(),
                    style: {margin: '0.5em'},
                    onclick: () => pipeline.push({
                        type: 'imputation',
                        id: 'imputation ' + pipeline.length,
                        imputations: [],
                        imputationId: 1
                    })
                }, plus, ' Imputation Step')
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
            app.getSelectedDataset().problems = [];
        }
        pendingHardManipulation = state;
    }

    // if we have an edit to the problem manipulations
    if (!app.is_manipulate_mode) {

        let selectedDataset = app.getSelectedDataset();
        let selectedProblem = app.getSelectedProblem();

        // "A": old predictors list
        // "C": old transformed variables
        // "D": new predictors list
        // "F": new transformed variables
        //
        // Must find D.
        //     D = (A union (F \ C)) \ (C \ F)
        //
        // F \ C is the set of added transformed variables
        // (A union (F \ C)) is the set of old variables and new transform variables
        // (A union (F \ C)) \ (C \ F) now remove transformed variables that are not present in the new query

        let predictorsOld = Object.keys(selectedProblem.summaries);
        let transformsOld = selectedProblem.tags.transformed;
        let transformsNew = getTransformVariables(selectedProblem.manipulations);

        let transformsRemoved = new Set([...transformsOld].filter(elem => !transformsNew.has(elem)));
        let transformsAdded = [...transformsNew].filter(elem => !transformsOld.has(elem));

        selectedProblem.predictors = [...predictorsOld, ...transformsAdded]
            .filter(elem => !transformsRemoved.has(elem));
        selectedProblem.tags.transformed = transformsNew;

        app.buildProblemPreprocess(selectedDataset, selectedProblem)
            .then(response => selectedProblem.summaries = response.variables);

        let countMenu = {type: 'menu', metadata: {type: 'count'}};
        loadMenu([...selectedDataset.hardManipulations, ...selectedProblem.manipulations], countMenu).then(count => {
            setTotalSubsetRecords(count);
            m.redraw();
        });
        app.resetPeek();
        // will trigger the call to solver, if a menu that needs that info is shown
        app.setSolverPending(true);
    }
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

export let setConstraintMenu = async (menu) => {

    // reset the constraintPreferences without breaking any object references
    Object.keys(constraintPreferences).forEach(key => delete constraintPreferences[key]);

    // simple case where the constraint menu is removed
    if (menu === undefined) {
        constraintMenu = menu;
        app.resetPeek();
        return;
    }

    // get the variables present at the new menu's position in the pipeline
    let variables = [...queryMongo.buildPipeline(
        menu.pipeline.slice(0, menu.pipeline.indexOf(menu.step)),
        app.getSelectedDataset().variablesInitial)['variables']];

    // update variable metadata
    if (!constraintMenu || (menu || {}).step !== constraintMenu.step) {
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
            alertError('The pipeline at this stage matches no records. Delete constraints to match more records.');
            constraintMenu = undefined;
            app.resetPeek();
            m.redraw();
            return;
        }
    }

    // finally set the constraintMenu, given that the variable metadata update was successful
    constraintMenu = menu;
    common.setPanelOpen('right', false);

    // special cases for constraint types
    if (constraintMenu.step.type === 'aggregate') constraintMetadata.measureType = menu.type;
    if (constraintMenu.step.type === 'transform') {
        m.redraw();
        return;
    }

    // reduce the variable list when viewing aggregate menus
    if (constraintMenu.type === 'accumulator') variables = variables.filter(column => inferType(column) === 'discrete');
    if (constraintMenu.type === 'unit') variables = variables.filter(column => inferType(column) !== 'discrete');

    // select a random variable if none selected yet, or previously selected variable no longer available
    let variable = !constraintMetadata.columns || variables.indexOf(constraintMetadata.columns[0]) === -1
        ? variables[Math.floor(Math.random() * variables.length)]
        : constraintMetadata.columns[0];

    // select the variable- also infers the best menu type (continuous, discrete, date)
    setConstraintColumn(variable);

    // load the data to draw the menu for said variable- mithril is redrawn upon completion
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

        if (varMeta.types.includes('string')) {
            alertLog(`A density plot cannot be drawn for the nominal variable ${column}. Switching to discrete.`);
            constraintMetadata.type = 'discrete';
        }

        if (varMeta.max === varMeta.min) {
            alertLog(`The max and min are the same in ${column}. Switching to discrete.`);
            constraintMetadata.type = 'discrete';
        }
    }
    Object.keys(constraintPreferences).forEach(key => delete constraintPreferences[key]);
    constraintData = undefined;
    if (pipeline) loadMenuManipulations(pipeline);
};

export let getData = async body => m.request({
    url: app.mongoURL + 'get-data',
    method: 'POST',
    data: Object.assign({
        datafile: app.getSelectedDataset().datasetUrl, // location of the dataset csv
        collection_name: app.selectedDataset // collection/dataset name
    }, body)
}).then(response => {
    console.log(' -- manipulate.js geData --');
    if (!response.success) throw response;

    // parse Infinity, -Infinity, NaN from unambiguous string literals. Coding handled in python function 'json_comply'
    let jsonParseLiteral = obj => {
        if (obj === undefined || obj === null) return obj;
        if (Array.isArray(obj)) return obj.map(jsonParseLiteral);

        if (typeof obj === 'object') return Object.keys(obj).reduce((acc, key) => {
            acc[key] = jsonParseLiteral(obj[key]);
            return acc;
        }, {});

        if (typeof obj === 'string') {
            if (obj === '***TWORAVENS_INFINITY***') return Infinity;
            if (obj === '***TWORAVENS_NEGATIVE_INFINITY') return -Infinity;
            if (obj === '***TWORAVENS_NAN***') return NaN;
        }

        return obj;
    };
    return jsonParseLiteral(response.data);
});

// download data to display a menu
export let loadMenu = async (pipeline, menu, {recount, requireMatch} = {}) => { // the dict is for optional named arguments

    // convert the pipeline to a mongo query. Note that passing menu extends the pipeline to collect menu data
    let compiled = JSON.stringify(queryMongo.buildPipeline([...pipeline, menu],
        app.getSelectedDataset().variablesInitial)['pipeline']);

    console.log("Menu Query:");
    console.log(compiled);

    let promises = [];

    // record count request
    if (recount) {
        let countMenu = {type: 'menu', metadata: {type: 'count'}};
        let compiled = JSON.stringify(queryMongo.buildPipeline([...pipeline, countMenu], app.getSelectedDataset().variablesInitial)['pipeline']);

        console.log("Count Query:");
        console.log(compiled);

        promises.push(getData({
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
        method: 'aggregate',
        query: compiled
    })
        .then(menu.type === 'menu' ? queryMongo.menuPostProcess[menu.metadata.type] : _ => _)
        .then(response => data = response));

    let success = true;
    let onError = err => {
        if (err === 'no records matched') alertError("No records match your subset. Plots will not be updated.");
        else console.error(err);
        alertError(err.message);
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


// collect the relevant data for the current constraint menu state
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

export let totalSubsetRecords;
export let setTotalSubsetRecords = records => totalSubsetRecords = records;

export async function buildDatasetUrl(problem) {
    let problemStep = {
        type: 'menu',
        metadata: {
            type: 'data',
            variables: [...problem.predictors, ...problem.targets],
            nominal: !app.is_manipulate_mode && app.nodes
                .filter(node => node.nature === 'nominal')
                .map(node => node.name)
        }
    };

    let compiled = queryMongo.buildPipeline([
        ...app.getSelectedDataset().hardManipulations,
        ...problem.manipulations,
        problemStep
    ], app.getSelectedDataset().variablesInitial)['pipeline'];

    return await getData({
        method: 'aggregate',
        query: JSON.stringify(compiled),
        export: 'dataset'
    });
}

export async function buildProblemUrl(problem) {
    let abstractPipeline = [
        ...app.getSelectedDataset().hardManipulations,
        ...problem.manipulations,
        {
            type: 'menu',
            metadata: {
                type: 'data',
                variables: ['d3mIndex', ...problem.predictors, ...problem.targets],
                nominal: !app.is_manipulate_mode && app.nodes
                    .filter(node => node.nature === 'nominal')
                    .map(node => node.name)
            }
        }
    ];

    let compiled = queryMongo.buildPipeline(abstractPipeline, app.getSelectedDataset().variablesInitial)['pipeline'];
    let metadata = queryMongo.translateDatasetDoc(compiled, app.getSelectedDataset().datasetDoc, problem);

    return await getData({
        method: 'aggregate',
        query: JSON.stringify(compiled),
        export: 'problem',
        metadata: JSON.stringify(metadata)
    });
}

export let getTransformVariables = pipeline => pipeline.reduce((out, step) => {
    if (step.type !== 'transform') return out;

    step.transforms.forEach(transform => out.add(transform.name));
    step.expansions.forEach(expansion => queryMongo.expansionTerms(expansion).forEach(term => out.add(term)));
    step.binnings.forEach(binning => out.add(binning.name));
    step.manual.forEach(manual => out.add(manual.name));

    return out;
}, new Set());
