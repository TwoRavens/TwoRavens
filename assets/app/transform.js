import m from 'mithril';
import {TreeQuery, TreeTransform, TreeAggregate} from "../EventData/app/views/TreeSubset";
import Button from '../common/app/views/Button';
import CanvasDate from "../EventData/app/canvases/CanvasDate";
import CanvasDyad from "../EventData/app/canvases/CanvasDyad";
import CanvasCategorical from "../EventData/app/canvases/CanvasCategorical";
import CanvasCategoricalGrouped from "../EventData/app/canvases/CanvasCategoricalGrouped";
import CanvasCoordinates from "../EventData/app/canvases/CanvasCoordinates";
import Flowchart from "./views/Flowchart";

import * as subset from "../EventData/app/app";
import * as common from '../common/app/common';


export function rightpanel() {
    let plus = m(`span.glyphicon.glyphicon-plus[style=color: #818181; font-size: 1em; pointer-events: none]`);
    let warn = (text) => m('[style=color:#dc3545;display:inline-block;]', text);

    let currentStepNumber = subset.abstractManipulations.indexOf((constraintMenu || {}).step);

    let isEnabled = (stepType) => {
        if (!subset.abstractManipulations.length) return true;
        let finalStep = subset.abstractManipulations.slice(-1)[0];

        if (finalStep.type === stepType) return false;
        if (finalStep.type === 'aggregate' && !finalStep.measuresAccum.length) return false;
        if (finalStep.type === 'transform' && !finalStep.transforms.length) return false;
        return true;
    };

    return [
        m(Flowchart, {
            attrsAll: {style: {height: 'calc(100% - 87px)', overflow: 'auto'}},
            steps: subset.abstractManipulations.map((step, i) => {
                let content;

                let deleteButton = subset.abstractManipulations.length - 1 === i && m(`div#stepDelete`, {
                    onclick: () => {
                        let removedStep = subset.abstractManipulations.pop();
                        if (constraintMenu && constraintMenu.step === removedStep) {
                            constraintMenu = undefined;
                            constraintPreferences = {};
                            constraintMetadata = undefined;
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
                        m(TreeTransform, {step}),

                        subset.abstractManipulations.length - 1 === i && m(Button, {
                            id: 'btnAddTransform',
                            class: ['btn-sm'],
                            style: {margin: '0.5em'},
                            onclick: () => setPendingConstraintMenu({name: 'Transform', step})
                        }, plus, ' Transform')
                    )
                }

                if (step.type === 'subset') {
                    content = m('div', {style: {'text-align': 'left'}},
                        deleteButton,
                        m('h4[style=font-size:16px;margin-left:0.5em]', 'Subset'),
                        m(TreeQuery, {step}),

                        m(Button, {
                            id: 'btnAddConstraint',
                            class: ['btn-sm'],
                            style: {margin: '0.5em'},
                            onclick: () => setPendingConstraintMenu({name: 'Subset Constraint', step})
                        }, plus, ' Constraint'),
                        m(Button, {
                            id: 'btnAddGroup',
                            class: ['btn-sm'],
                            style: {margin: '0.5em'},
                            disabled: step.abstractQuery.every(constraint => constraint.type !== 'subset'),
                            onclick: () => subset.addGroup(step.id, false)
                        }, plus, ' Group')
                    )
                }

                if (step.type === 'aggregate') {
                    content = m('div', {style: {'text-align': 'left'}},
                        deleteButton,
                        m('h4[style=font-size:16px;margin-left:0.5em]', 'Aggregate'),

                        step.measuresUnit.length !== 0 && [
                            m('h5', 'Unit Measures'),
                            m(TreeAggregate, {data: step.measuresUnit}),
                        ],
                        step.measuresAccum.length !== 0 && [
                            m('h5', 'Unit Measures'),
                            m(TreeAggregate, {data: step.measuresAccum}),
                        ],

                        !step.measuresAccum.length && [warn('must have accumulator to output data'), m('br')],
                        subset.abstractManipulations.length - 1 === i && [
                            m(Button, {
                                id: 'btnAddUnitMeasure',
                                class: ['btn-sm'],
                                style: {margin: '0.5em'},
                                onclick: () => setPendingConstraintMenu({name: 'Aggregate Unit Measure', step})
                            }, plus, ' Unit Measure'),
                            m(Button, {
                                id: 'btnAddAccumulator',
                                class: ['btn-sm' + (step.measuresAccum.length ? '' : ' is-invalid')],
                                style: {margin: '0.5em'},
                                onclick: () => setPendingConstraintMenu({name: 'Aggregate Accumulator', step})
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
            disabled: !isEnabled('transform'),
            style: {margin: '0.5em'},
            onclick: () => subset.abstractManipulations.push({
                type: 'transform',
                id: 'transform ' + subset.abstractManipulations.length,
                transforms: [] // transform name is used instead of nodeId
            })
        }, plus, ' Transform Step'),
        m(Button, {
            id: 'btnAddSubset',
            title: 'filter rows that match criteria',
            disabled: !isEnabled('subset'),
            style: {margin: '0.5em'},
            onclick: () => subset.abstractManipulations.push({
                type: 'subset',
                abstractQuery: [],
                id: 'subset ' + subset.abstractManipulations.length,
                nodeID: 1,
                groupID: 1,
                queryID: 1
            })
        }, plus, ' Subset Step'),
        m(Button, {
            id: 'btnAddAggregate',
            title: 'group rows that match criteria',
            disabled: !isEnabled('aggregate'),
            style: {margin: '0.5em'},
            onclick: () => subset.abstractManipulations.push({
                type: 'aggregate',
                id: 'aggregate ' + subset.abstractManipulations.length,
                measuresUnit: [],
                measuresAccum: [],
                nodeId: 1 // both trees share the same nodeId counter
            })
        }, plus, ' Aggregate Step')
    ]
}

export function subsetCanvas() {
    if (!constraintMenu) return;

    if (constraintData === undefined) {

        if (!isLoading) subset.loadMenu(constraintMenu, setIsLoading);

        return m('#loading.loader', {
            style: {
                margin: 'auto',
                position: 'relative',
                top: '40%',
                transform: 'translateY(-50%)'
            }
        })
    }

    return m({
        'date': CanvasDate,
        'dyad': CanvasDyad,
        'categorical': CanvasCategorical,
        'categorical_grouped': CanvasCategoricalGrouped,
        'coordinates': CanvasCoordinates
    }[constraintMetadata.type], {
        mode: {
            'Subset': 'subset',
            'Aggregate Unit Measure': 'aggregate',
            'Aggregate Accumulator': 'aggregate'
        }[constraintMenu.name],
        subsetName: constraintMenu.name,
        data: constraintData,
        preferences: constraintPreferences,
        metadata: constraintMetadata,
        redraw, setRedraw
    })
}

// when set, the loading spiral is shown in the canvas
export let isLoading = false;
export let setIsLoading = (state) => isLoading = state;

// when set, the next time the constraint menu is drawn, it will rebuild non-mithril elements (like plots)
export let redraw = false;
export let setRedraw = (state) => redraw = state;

// if set, then the popup modal menu for constructing a new transform is displayed {name: '', step}
export let pendingConstraintMenu;
export let setPendingConstraintMenu = (state) => pendingConstraintMenu = state;

// when stage is clicked, preferences are shifted into the pipeline using this metadata {name: '', step}
export let constraintMenu;
export let setConstraintMenu = step => {
    constraintMenu = step;
    if (!constraintMenu) return;
    subset.setSubsetRedraw(constraintMenu.name, true);
};

// contains the constraint type, columns and (if needed) date structure, dyad tabs, group_by, etc.
export let constraintMetadata = {};
export let setConstraintMetadata = (meta) => constraintMetadata = meta;

// contains the menu state (which nominal variables are selected, ranges, etc.)
export let constraintPreferences = {};

// contains the raw data used to draw the constraint menu
export let constraintData;

// menu state within the modal
export let modalPreferences = {};

export let constraintTypes = ['Nominal', 'Continuous', 'Date', 'Coordinates', 'Monad', 'Dyad'];
