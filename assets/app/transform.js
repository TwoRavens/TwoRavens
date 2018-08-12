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


let transformPipeline = [];


export function rightpanel() {
    let plus = m(`span.glyphicon.glyphicon-plus[style=color: #818181; font-size: 1em; pointer-events: none]`);

    return [
        m(Flowchart, {
            steps: transformPipeline.map(step => {
                if (step.type === 'subset') {
                    return [
                        m(TreeQuery, {step}),

                        m("#rightpanelButtonBar", {
                                style: {
                                    width: "calc(100% - 25px)",
                                    position: "absolute",
                                    bottom: '5px'
                                }
                            },
                            m(Button, {
                                id: 'btnAddConstraint',
                                style: {float: 'left'},
                                onclick: () => setShowModalTransform(true)
                            }, plus, ' Constraint'),
                            m(Button, {
                                id: 'btnAddGroup',
                                style: {float: 'left'},
                                onclick: () => subset.addGroup(step.id, false)
                            }, plus, 'Group')
                        )
                    ]
                }
            })
        }),
        m(Button, {
            id: 'btnAddSubset',
            onclick: () => transformPipeline.push({
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
            onclick: () => transformPipeline.push({
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
        mode: subset.selectedMode,
        subsetName: subset.selectedSubsetName,
        data: subset.subsetData[subset.selectedSubsetName],
        preferences: subset.subsetPreferences[subset.selectedSubsetName],
        metadata: subset.genericMetadata[subset.selectedDataset]['subsets'][subset.selectedSubsetName],
        redraw: subset.subsetRedraw[subset.selectedSubsetName],
        setRedraw: (state) => subset.setSubsetRedraw(subset.selectedSubsetName, state)
    })
}

// if set, then the popup modal menu for constructing a new transform is displayed
export let showModalTransform = false;
export let setShowModalTransform = (state) => showModalTransform = state;
export let pendingTransformPreferences = {};

function loadSubset(subset) {
    // data source is unknown!
}

export let subsetTypes = ['Nominal', 'Continuous', 'Date', 'Coordinates'];
