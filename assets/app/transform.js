import m from 'mithril';
import {TreeQuery} from "../EventData/app/views/TreeSubset";
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

    let currentStepNumber = subset.transformPipeline.indexOf((constraintMenu || {}).step);

    return [
        m(Flowchart, {
            steps: subset.transformPipeline.map((step, i) => {
                let content;

                if (step.type === 'subset') {
                    content = m('div', {style: {'text-align': 'left'}},
                        m('h4', 'Subset'),
                        m(TreeQuery, {step}),

                        m(Button, {
                            id: 'btnAddConstraint',
                            style: {margin: '0.5em'},
                            onclick: () => setPendingConstraintMenu({name: 'Subset', step})
                        }, plus, ' Constraint'),
                        m(Button, {
                            id: 'btnAddGroup',
                            style: {margin: '0.5em'},
                            disabled: step.abstractQuery.every(constraint => constraint.type !== 'subset'),
                            onclick: () => subset.addGroup(step.id, false)
                        }, plus, ' Group')
                    )
                }

                if (step.type === 'aggregate') {
                    content = m('div', {style: {'text-align': 'left'}},
                        m('h4', 'Aggregate'),
                        m(Button, {
                            id: 'btnAddUnitMeasure',
                            style: {margin: '0.5em'},
                            onclick: () => setPendingConstraintMenu({name: 'Aggregate Unit Measure', step})
                        }, plus, ' Unit Measure'),
                        m(Button, {
                            id: 'btnAddAccumulator',
                            style: {margin: '0.5em'},
                            onclick: () => setPendingConstraintMenu({name: 'Aggregate Accumulator', step})
                        }, plus, ' Accumulator')
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
            id: 'btnAddSubset',
            style: {margin: '0.5em'},
            onclick: () => subset.transformPipeline.push({
                type: 'subset',
                abstractQuery: [],
                id: 'subset',
                nodeID: 1,
                groupID: 1,
                queryID: 1
            })
        }, plus, ' Subset Step'),
        m(Button, {
            id: 'btnAddAggregate',
            style: {margin: '0.5em'},
            onclick: () => subset.transformPipeline.push({
                type: 'aggregate',
                measuresUnit: [],
                measuresAccum: []
            })
        }, plus, ' Aggregate Step')
    ]
}

export function subsetCanvas() {
    if (subset.subsetData[subset.selectedSubsetName] === undefined) {

        if (!subset.isLoading[subset.selectedSubsetName])
            loadSubset(subset.selectedSubsetName);

        return m('#loading.loader', {
            style: {
                margin: 'auto',
                position: 'relative',
                top: '40%',
                transform: 'translateY(-50%)'
            }
        })
    }

    let subsetType = subset.genericMetadata[subset.selectedDataset]['subsets'][subset.selectedSubsetName]['type'];


    return m({
        'date': CanvasDate,
        'dyad': CanvasDyad,
        'categorical': CanvasCategorical,
        'categorical_grouped': CanvasCategoricalGrouped,
        'coordinates': CanvasCoordinates
    }[subsetType], {
        mode: {
            'Subset': 'subset',
            'Aggregate Unit Measure': 'aggregate',
            'Aggregate Accumulator': 'aggregate'
        }[constraintMenu.name],
        subsetName: constraintMenu.name,
        data: constraintData,
        preferences: constraintPreferences,
        metadata: constraintMetadata,
        redraw: subset.subsetRedraw[constraintMenu.name],
        setRedraw: (state) => subset.setSubsetRedraw(constraintMenu.name, state)
    })
}

// if set, then the popup modal menu for constructing a new transform is displayed {name: '', step}
export let pendingConstraintMenu;
export let setPendingConstraintMenu = (state) => pendingConstraintMenu = state;

// when stage is clicked, preferences are shifted into the pipeline using this metadata {name: '', step}
export let constraintMenu = {};
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
export let constraintData = {};

// menu state within the modal
export let modalPreferences = {};

function loadSubset(subset) {
    // data source is unknown!
}

export let constraintTypes = ['Nominal', 'Continuous', 'Date', 'Coordinates'];
