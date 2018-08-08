import m from 'mithril';
import MenuHeaders from "../common-eventdata/views/MenuHeaders";
import {TreeQuery, TreeVariables} from "../EventData/app/views/TreeSubset";
import Button from '../common/app/views/Button';
import * as subset from "../EventData/app/app";
import * as query from "../EventData/app/query";
import CanvasDate from "../EventData/app/canvases/CanvasDate";
import CanvasDyad from "../EventData/app/canvases/CanvasDyad";
import CanvasCategorical from "../EventData/app/canvases/CanvasCategorical";
import CanvasCategoricalGrouped from "../EventData/app/canvases/CanvasCategoricalGrouped";
import CanvasCoordinates from "../EventData/app/canvases/CanvasCoordinates";



export function rightpanel() {
    return [
        m(MenuHeaders, {
            id: 'querySummaryMenu',
            attrsAll: {style: {height: 'calc(100% - 85px)', overflow: 'auto'}},
            sections: [
                {value: 'Variables', contents: m(TreeVariables)},
                {value: 'Subsets', contents: m(TreeQuery)}
            ]
        }),
        m("#rightpanelButtonBar", {
                style: {
                    width: "calc(100% - 25px)",
                    position: "absolute",
                    bottom: '5px'
                }
            },
            m(Button, {
                id: 'btnAddGroup',
                style: {float: 'left'},
                onclick: () => subset.addGroup(false)
            }, 'Group'),
            m(Button, {
                id: 'btnUpdate',
                style: {float: 'right'},
                onclick: () => query.submitQuery()
            }, 'Update')
        )
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
export let showModalSubset = false;
export let setShowModalSubset = (state) => showModalSubset = state;
export let pendingSubsetPreferences = {};

function loadSubset(subset) {
    // data source is unknown!
}

