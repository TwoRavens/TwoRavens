import hopscotch from 'hopscotch';
import m from 'mithril';

import * as app from "../app";
import * as queryAbstract from './queryAbstract';
import * as queryMongo from "./queryMongo";
import * as datamart from '../datamart/Datamart';

import {TreeAggregate, TreeAugment, TreeImputation, TreeSubset, TreeTransform} from '../views/QueryTrees';
import CanvasContinuous from '../canvases/CanvasContinuous';
import CanvasDate from '../canvases/CanvasDate';
import CanvasDiscrete from '../canvases/CanvasDiscrete';
import CanvasTransform from '../canvases/CanvasTransform';
import CanvasImputation from "../canvases/CanvasImputation";

import Flowchart from '../views/Flowchart';

import * as common from '../../common/common';
import Button from '../../common/views/Button';
import TextField from "../../common/views/TextField";
import PanelList from "../../common/views/PanelList";
import ButtonRadio from "../../common/views/ButtonRadio";
import Panel from "../../common/views/Panel";
import Canvas from "../../common/views/Canvas";
import Table from "../../common/views/Table";
import Icon from "../../common/views/Icon";

import {formatVariableSummary} from '../views/VariableSummary';

import {
    getGeographicVariables, getLocationVariables,
    getCategoricalVariables,
    getOrdinalVariables,
    getSelectedProblem,
    getTransformVariables,
    loadProblemPreprocess
} from "../problem";


export function menu(compoundPipeline) {


    return [
        // stage button
        constraintMenu && [
            m(Button, {
                id: 'btnStageCancel',
                style: {
                    right: `calc(${common.panelOpen['right'] ? '500' : '16'}px + ${common.panelMargin}*2 + 70px)`,
                    bottom: `calc(${common.heightFooter} + ${common.panelMargin} + 6px + ${app.peekInlineShown && app.peekData ? app.peekInlineHeight : '0px'})`,
                    position: 'fixed',
                    'z-index': 101,
                    'box-shadow': 'rgba(0, 0, 0, 0.3) 0px 2px 3px'
                },
                onclick: () => {
                    setConstraintMenu(undefined);
                    app.updateRightPanelWidth();
                    app.updateLeftPanelWidth();
                    common.setPanelOpen('right');
                }
            }, 'Cancel'),
            constraintMenu.step.type !== 'augment' && m(Button, {
                id: 'btnStage',
                class: 'btn-success',
                style: {
                    right: `calc(${common.panelOpen['right'] ? '500' : '16'}px + ${common.panelMargin}*2)`,
                    bottom: `calc(${common.heightFooter} + ${common.panelMargin} + 6px + ${app.peekInlineShown && app.peekData ? app.peekInlineHeight : '0px'})`,
                    position: 'fixed',
                    'z-index': 101,
                    'box-shadow': 'rgba(0, 0, 0, 0.3) 0px 2px 3px'
                },
                onclick: async () => {
                    let name = constraintMenu.type === 'transform' ? ''
                        : constraintMetadata.type + ': ' + constraintMetadata.columns[0];

                    let success = queryAbstract.addConstraint(
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
                        app.updateRightPanelWidth();
                        app.updateLeftPanelWidth();
                    }
                }
            }, 'Stage')
        ],

        m(Canvas, {
            attrsAll: {
                style: {
                    height: `calc(100% - ${common.heightHeader} - ${common.heightFooter})`,
                    'z-index': 99,
                    background: common.colors.base
                }
            }
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

    let {pipeline, variables} = queryMongo.buildPipeline(compoundPipeline, app.workspace.raven_config.variablesInitial);

    if (constraintMenu.type === 'augment') return m(datamart.CanvasDatamart, {
        preferences: app.datamartPreferences,
        dataPath: constraintMenu.step.dataPath,
        manipulations: app.workspace.raven_config?.hardManipulations,
        endpoint: app.datamartURL,
        labelWidth: '10em',
    });

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
    if (!app.workspace.d3m_config.name || !constraintMenu)
        return;

    if (constraintMenu.step.type === 'augment')
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

    let selectedProblem = getSelectedProblem();
    let variables = app.workspace.raven_config.variablesInitial;
    let selectedVariables = constraintMetadata?.columns ?? [];

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
                    ...Object.keys(app.variableSummaries),
                    ...getTransformVariables(partialPipeline)
                ])];
                selectedVariables = Object.keys(constraintPreferences.menus.Expansion.variables || {});
            }
            if (constraintPreferences.type === 'Binning') {
                selectedVariables = [constraintPreferences.menus.Binning.variableIndicator];
                variables = variables.filter(variable => !variableMetadata[variable].types.includes('string'))
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
            colors: Object.assign(
                selectedProblem.groups.reduce((out, group) =>
                    Object.assign(out, {[app.hexToRgba(group.color, .2)]: group.nodes}), {}),
                {
                    [app.hexToRgba(common.colors.selVar, .5)]: selectedVariables,
                    [app.hexToRgba(app.colors.order, .2)]: selectedProblem.tags.ordering,
                    [app.hexToRgba(app.colors.location, .2)]: selectedProblem.tags.location
                }),
            classes: {
                // keep this order aligned with params in mutateNodes
                'item-categorical': getCategoricalVariables(selectedProblem),
                'item-geographic': getGeographicVariables(),
                'item-ordinal': getOrdinalVariables(selectedProblem),
                'item-boundary': selectedProblem.tags.boundary,
                'item-time': Object.keys(app.variableSummaries)
                    .filter(variable => app.variableSummaries[variable].timeUnit),
                'item-weight': selectedProblem.tags.weights,
                'item-privileged': selectedProblem.tags.privileged,
                'item-exogenous': selectedProblem.tags.exogenous,
                'item-featurize': selectedProblem.tags.featurize,
                'item-randomize': selectedProblem.tags.randomize,
                'item-cross-section': selectedProblem.tags.crossSection,
                'item-index': selectedProblem.tags.indexes,
                'item-matched': variableSearch === '' ? []
                    : variables.filter(variable => variable.toLowerCase().includes(variableSearch))
            },
            callback: ['transform', 'imputation'].includes(constraintMenu.type)
                ? variable => constraintPreferences.select(variable) // the select function is defined inside CanvasTransform
                : variable => setConstraintColumn(variable, constraintMenu.pipeline),
            popup: x => m('div',
                m('h4', 'Summary Statistics for ' + x),
                m(Table, {
                    style: {height: "250px", 'overflow-y': 'scroll', display: 'inline-block', margin: 0},
                    class: 'table-sm',
                    data: formatVariableSummary(app.variableSummaries[x])
                })),
            popupOptions: {placement: 'right', modifiers: {preventOverflow: {escapeWithReference: true}}},
            attrsItems: {
                'data-placement': 'right',
                'data-original-title': 'Summary Statistics',
                style: {'border-width': '2px'}
            },
            style: {
                height: 'calc(100% - 110px)',
                overflow: 'auto'
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

export let makeSubsetTreeMenu = (step, editable, compoundPipeline) => [
    m(TreeSubset, {step, editable, redraw, setRedraw}),

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
        }, m(Icon, {name: 'plus'}), ' Constraint'),
        m(Button, {
            id: 'btnAddGroup',
            class: ['btn-sm'],
            style: {margin: '0.5em'},
            disabled: !step.abstractQuery.filter(constraint => constraint.type === 'rule').length,
            onclick: () => {
                setQueryUpdated(true);
                queryAbstract.addGroup(step);
            }
        }, m(Icon, {name: 'plus'}), ' Group')
    ]
]

export class PipelineFlowchart {
    view(vnode) {
        // compoundPipeline is used for queries, pipeline is the array to be edited
        let {compoundPipeline, pipeline, editable, hard, subsetOnly} = vnode.attrs;

        let plus = m(Icon, {name: 'plus'});
        let warn = (text) => m('[style=color:#dc3545;display:inline-block;]', text);

        let currentStepNumber = pipeline.indexOf((constraintMenu || {}).step);

        let isEnabled = () => {
            if (!pipeline.length) return true;
            let finalStep = pipeline.slice(-1)[0];
            if (finalStep.type === 'augment') return false;
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

                    if (step.type === 'augment') {
                        content = m('div', {style: {'text-align': 'left'}},
                            // deleteButton, // TODO: undo augmentation by switching to previous workspace
                            m('h4[style=font-size:16px;margin-left:0.5em]', 'Augmentation'),
                            m(TreeAugment, {step, editable, redraw, setRedraw})
                        )
                    }

                    if (step.type === 'transform') {
                        content = m('div', {style: {'text-align': 'left'}},
                            deleteButton,
                            m('h4[style=font-size:16px;margin-left:0.5em]', 'Transformations'),
                            m(TreeTransform, {step, editable, redraw, setRedraw}),
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
                            !subsetOnly && deleteButton,
                            m('h4[style=font-size:16px;margin-left:0.5em]', 'Subset'),
                            makeSubsetTreeMenu(step, editable, compoundPipeline))
                    }

                    if (step.type === 'aggregate') {
                        content = m('div', {style: {'text-align': 'left'}},
                            deleteButton,
                            m('h4[style=font-size:16px;margin-left:0.5em]', 'Aggregate'),

                            step.measuresUnit.length !== 0 && [
                                m('h5', 'Unit Measures'),
                                m(TreeAggregate, {
                                    data: step.measuresUnit,
                                    editable
                                }),
                            ],
                            step.measuresAccum.length !== 0 && [
                                m('h5', 'Column Accumulations'),
                                m(TreeAggregate, {
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
                        color: currentStepNumber === i ? common.colors.selVar : common.colors.gray,
                        content
                    };
                })
            }),
            !subsetOnly && editable && [
                DISPLAY_DATAMART_UI && m(Button, {
                    id: 'btnAddAugment',
                    title: hard ? 'join columns with another dataset' : 'augment is only available in dataset mode',
                    disabled: !isEnabled(),
                    class: hard ? 'btn-success' : 'disabled',
                    style: {margin: '0.5em'},
                    onclick: async () => {
                        if (!hard) {
                            app.alertLog("Augment is only available in dataset mode.");
                            return;
                        }

                        // write out manipulated dataset as input to datamart component, if there are hard manipulations
                        let dataPath = workspace.datasetPath;
                        if (workspace.raven_config.hardManipulations.length) dataPath = await app.getData({
                            method: 'aggregate',
                            query: JSON.stringify(queryMongo.buildPipeline(
                                workspace.raven_config.hardManipulations,
                                workspace.raven_config.variablesInitial)['pipeline']),
                            export: 'csv',
                            comment: 'exporting csv of data to send to datamart'
                        });
                        let step = {type: 'augment', id: 'augment ' + pipeline.length, dataPath};

                        setConstraintMenu({type: 'augment', step, pipeline: compoundPipeline});
                    }
                }, plus, ' Augment Step'),
                // D3M primitives don't support transforms
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
                        // abstractQuery: [{"id":"1","name":"continuous: Walks","type":"rule","subset":"continuous","column":"Walks","children":[{"id":"2","name":"From: 83.2675","fromLabel":83.2675,"cancellable":false,"show_op":false},{"id":"3","name":"To: 1281.18","toLabel":1281.18,"cancellable":false,"show_op":false}],"operation":"and","show_op":false}],
                        id: 'subset ' + pipeline.length,
                        nodeId: 4,
                        groupId: 1,
                        queryId: 1
                    })
                }, plus, ' Subset Step'),
                // D3M primitives don't support aggregations
                m(Button, {
                    id: 'btnAddAggregate',
                    title: hard ? 'group rows that match criteria' : 'aggregate is only available in dataset mode',
                    disabled: !isEnabled(),
                    style: {margin: '0.5em'},
                    class: !hard && "disabled",
                    onclick: () => {
                        if (!hard) {
                            app.alertLog("Aggregate is only available in dataset mode.")
                            return;
                        }
                        pipeline.push({
                            type: 'aggregate',
                            id: 'aggregate ' + pipeline.length,
                            measuresUnit: [],
                            measuresAccum: [],
                            nodeId: 1 // both trees share the same nodeId counter
                        })
                    }
                }, plus, ' Aggregate Step'),
               m(Button, {
                    id: 'btnAddImputation',
                    title: 'manage missing data',
                    disabled: !hard && !isEnabled(),
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
            placement: 'bottom',
            title: 'Dataset Changed',
            content: 'The dataset has changed. Upon switching back to model mode, new problems will be inferred and any existing problem pipelines will be erased.'
        }
    ]
};

export let pendingHardManipulation = false;
export let setPendingHardManipulation = state => pendingHardManipulation = state;

// called when a query is updated
export let setQueryUpdated = async state => {

    // the first time we have an edit to the hard manipulations:
    if (app.isDatasetMode) {
        if (!pendingHardManipulation && state) {
            hopscotch.startTour(datasetChangedTour, 0);
            app.workspace.raven_config.problems = [];
        }
        pendingHardManipulation = state;
    }

    // if we have an edit to the problem manipulations
    if (!app.isDatasetMode) {

        let selectedProblem = getSelectedProblem();

        let ravenConfig = app.workspace.raven_config;

        selectedProblem.tags.transformed = [...getTransformVariables(selectedProblem.manipulations)];

        loadProblemPreprocess(selectedProblem)
            .then(app.setPreprocess)
            .then(m.redraw)

        let countMenu = {type: 'menu', metadata: {type: 'count'}};
        loadMenu([...ravenConfig.hardManipulations, ...selectedProblem.manipulations], countMenu).then(count => {
            setTotalSubsetRecords(count);
            m.redraw();
        });
        app.resetPeek();
    }
};

// when set, the constraint menu will rebuild non-mithril elements (like plots) on the next redraw
export let redraw = false;
export let setRedraw = state => redraw = state;

export let constraintMenu;
// window.getConstraintMenu = () => constraintMenu;
// let constraintMenuExample = {
//     type: 'transform' || 'subset' || 'unit' || 'accumulator',
//     step: {
//         // varies depending on step type, which is either 'transform', 'subset' or 'aggregate'
//     },
// };

export let setConstraintMenu = async menu => {

    // reset the constraintPreferences without breaking any object references
    Object.keys(constraintPreferences).forEach(key => delete constraintPreferences[key]);

    // simple case where the constraint menu is removed
    if (menu === undefined) {
        constraintMenu = menu;
        app.resetPeek();
        return;
    }

    // augment does not need most of the checks that the other manipulations need
    if (menu.type === 'augment') {
        constraintMenu = menu;
        common.setPanelOpen('right', false);
        return;
    }

    // get the variables present at the new menu's position in the pipeline
    let variables = [...queryMongo.buildPipeline(
        menu.pipeline.slice(0, menu.pipeline.indexOf(menu.step)),
        app.workspace.raven_config.variablesInitial)['variables']];

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
            app.alertError('The pipeline at this stage matches no records. Delete constraints to match more records.');
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
    let variable = !constraintMetadata.columns || !variables.includes(constraintMetadata.columns[0])
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
    let type = variableMetadata[variable].types.includes('string') ? 'discrete' : 'continuous';

    // force date type if possible
    if (variableMetadata[variable].types.includes('date')) type = 'date';

    // switch to discrete if there is a small number of unique values
    if (type === 'continuous' && variableMetadata[variable].uniqueCount <= 10) type = 'discrete';
    return type;
};

export let setConstraintType = (type, pipeline) => {

    if (constraintMetadata.type === type) pipeline = undefined;
    constraintMetadata.type = type;
    if (constraintMetadata.type === 'continuous') {
        let column = constraintMetadata.columns[0];
        let varMeta = variableMetadata[column];

        constraintMetadata.max = varMeta.max;
        constraintMetadata.min = varMeta.min;
        constraintMetadata.buckets = Math.min(Math.max(10, Math.floor(varMeta.validCount / 10)), 100);

        if (varMeta.types.includes('string')) {
            app.alertLog(`A density plot cannot be drawn for the categorical variable ${column}. Switching to discrete.`);
            constraintMetadata.type = 'discrete';
        }

        if (varMeta.max === varMeta.min) {
            app.alertLog(`The max and min are the same in ${column}. Switching to discrete.`);
            constraintMetadata.type = 'discrete';
        }
    }
    Object.keys(constraintPreferences).forEach(key => delete constraintPreferences[key]);
    constraintData = undefined;
    if (pipeline) loadMenuManipulations(pipeline);
};

// download data to display a menu
export let loadMenu = async (
    pipeline, menu,
    // the dict is for optional named arguments
    {recount, requireMatch, datasetDetails} = {datasetDetails: {}}
) => {

    let ravenConfig = app.workspace.raven_config;
    // convert the pipeline to a mongo query. Note that passing menu extends the pipeline to collect menu data
    let compiled = JSON.stringify(queryMongo.buildPipeline([...pipeline, menu],
        ravenConfig.variablesInitial)['pipeline']);

    console.log("Menu Query:");
    console.log(compiled);

    let promises = [];

    // record count request
    if (recount) {
        let countMenu = {type: 'menu', metadata: {type: 'count'}};
        let compiled = JSON.stringify(queryMongo.buildPipeline([...pipeline, countMenu], ravenConfig.variablesInitial)['pipeline']);

        console.log("Count Query:");
        console.log(compiled);

        promises.push(app.getData(Object.assign({
            method: 'aggregate',
            query: compiled,
            comment: 'count of the number of observations'
        }, datasetDetails)).then(response => {
            let total = (response[0] || {}).total || 0;

            // intentionally breaks the entire downloading promise array and subsequent promise chain
            if (total === 0 && requireMatch) throw 'no records matched';
            setTotalSubsetRecords(total);
        }));
    }

    let data;
    promises.push(app.getData({
        method: 'aggregate',
        query: compiled,
        comment: `preparing data for menu: ${menu.type === 'menu' ? menu.metadata.type : menu.type}`
    })
        .then(menu.type === 'menu' ? queryMongo.menuPostProcess[menu.metadata.type] : _ => _)
        .then(response => data = response));

    let success = true;
    let onError = err => {
        if (err === 'no records matched') app.alertError("No records match your subset. Plots will not be updated.");
        else app.alertError(err.message);
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

// contains the menu state (which categorical variables are selected, ranges, etc.)
export let constraintPreferences = {};
// window.getConstraintPreferences = () => constraintPreferences;
export let setConstraintPreferences = preferences => {
    // this is strange to avoid breaking the object reference. May or may not be necessary
    Object.keys(constraintPreferences).forEach(key => delete constraintPreferences[key])
    Object.assign(constraintPreferences, preferences)
}

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
