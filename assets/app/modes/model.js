import * as d3 from "d3";
import m from "mithril";
import hopscotch from 'hopscotch';

import * as app from "../app";
import * as manipulate from "../manipulations/manipulate";
import * as explore from "./explore";
import * as solverD3M from "../solvers/d3m";

import * as common from "../../common/common";
import Button from "../../common/views/Button";
import Icon from "../../common/views/Icon";
import Subpanel from "../../common/views/Subpanel";
import TextField from "../../common/views/TextField";
import PanelList from "../../common/views/PanelList";
import Table from "../../common/views/Table";
import ListTags from "../../common/views/ListTags";
import Panel from "../../common/views/Panel";
import MenuTabbed from "../../common/views/MenuTabbed";
import Dropdown from "../../common/views/Dropdown";
import ButtonRadio from "../../common/views/ButtonRadio";
import MenuHeaders from "../../common/views/MenuHeaders";
import Popper from '../../common/views/Popper';

import ForceDiagram, {groupBuilder, groupLinkBuilder, linkBuilder, pebbleBuilderLabeled} from "../views/ForceDiagram";
import VariableSummary, {formatVariableSummary} from "../views/VariableSummary";
import Flowchart from "../views/Flowchart";

import {setModal} from "../../common/views/Modal";
import {add, bold, generateID, italicize, linkURLwithText, omniSort, remove, toggle} from "../utils";
import {
    buildEmptyProblem,
    defaultGroupDescriptions,
    erase, generateProblemID,
    getDescription,
    getGeographicVariables,
    getNominalVariables,
    getOrderingTimeUnit,
    getOrdinalVariables,
    getPredictorVariables,
    getProblemCopy,
    getProblemTrees,
    getSelectedProblem,
    getSubtask,
    getTargetGroups,
    getTargetVariables,
    loadProblemPreprocess,
    setMetric,
    setSelectedProblem,
    setSubTask,
    setTask
} from "../problem";
import ForceDiagramGroup from "../views/ForceDiagramGroup";
import TreeRender from "../views/TreeRender";
import {workspace} from "../app";


export class CanvasModel {

    view(vnode) {
        let {drawForceDiagram, forceData} = vnode.attrs;
        let selectedProblem = getSelectedProblem();

        if (Object.keys(app.variableSummaries).length === 0)
            return m('div[style=height:100%;position:relative]',
                m('div[style=top:calc(50% - 60px);left:calc(50% - 60px);position:fixed]',
                    common.loader('forceDiagramLoader')))

        let selectedLinks = [];
        if (app.isModelMode && selectedProblem)
            selectedLinks = [
                ...(selectedProblem.pebbleLinks || []).filter(link => link.selected),
                ...selectedProblem.groupLinks.filter(link => link.selected)
            ];

        let linkIcons = {
            minus: m(Icon, {name: 'dash'}),
            none: undefined,
            plus: m(Icon, {name: 'plus'}),
        }

        return [
            drawForceDiagram && m(ForceDiagram, Object.assign(forceDiagramState, {
                nodes: forceDiagramNodesReadOnly,
                // these attributes may change dynamically, (the problem could change)
                // drag pebble out of screen
                onDragOut: pebble => {
                    let pebbles = forceData.summaries[pebble] && forceData.summaries[pebble].pdfPlotType === 'collapsed'
                        ? forceData.summaries[pebble].childNodes : [pebble];
                    pebbles.forEach(pebble => toggleGroup(selectedProblem, 'None', pebble));
                    selectedProblem.pebbleLinks = (selectedProblem.pebbleLinks || [])
                        .filter(link => link.target !== pebble && link.source !== pebble);
                    app.resetPeek();
                    m.redraw();
                },
                onDragOver: (pebble, groupId) => {
                    console.log("pebble dragged over group:", pebble, groupId);
                    if (groupId === 'Loose') return;
                    let pebbles = forceData.summaries[pebble.name].pdfPlotType === 'collapsed'
                        ? forceData.summaries[pebble.name].childNodes : [pebble.name];
                    pebbles.forEach(pebble => toggleGroup(selectedProblem, groupId, pebble));
                    app.resetPeek();
                    m.redraw();
                },
                // drag pebble away from group, but not out of screen
                onDragAway: (pebble, groupId) => {
                    let pebbles = forceData.summaries[pebble.name] && forceData.summaries[pebble.name].pdfPlotType === 'collapsed'
                        ? forceData.summaries[pebble.name].childNodes : [pebble.name];
                    let selectedProblem = getSelectedProblem();
                    pebbles.forEach(pebble => {
                        if (groupId !== 'Loose') toggleGroup(selectedProblem, 'Loose', pebble)
                    });
                    app.resetPeek();
                    m.redraw();
                },

                labels: forceDiagramLabels(selectedProblem),
                mutateNodes: mutateNodes(selectedProblem),
                pebbleLinks: selectedProblem.pebbleLinks,
                onclickLink: (e, d) => {
                    let originalLink = selectedProblem.pebbleLinks.find(link => d.source === link.source && d.target === link.target);
                    if (!originalLink) return;
                    originalLink.selected = !originalLink.selected
                    app.resetPeek();
                },
                onclickGroupLink: (e, d) => {
                    let originalLink = selectedProblem.groupLinks.find(link => d.source === link.source && d.target === link.target);
                    if (!originalLink) return;
                    originalLink.selected = !originalLink.selected
                    app.resetPeek();
                }
            }, forceData)),


            app.isModelMode && !app.swandive && m("#spacetools.spaceTool", {
                    style: {right: app.panelWidth.right, 'z-index': 16}
                },
                // m(Button, {
                //     id: 'btnAdd', style: {margin: '0px .5em'},
                //     onclick: addProblemFromForceDiagram,
                //     title: 'copy this problem'
                // }, m(Icon, {name: 'plus'})),
                m(Button, {
                    id: 'btnJoin', style: {margin: '0px .5em'},
                    onclick: () => {
                        if (selectedProblem.system === "solved") {
                            alertEditCopy();
                            return;
                        }
                        connectAllForceDiagram();
                    },
                    title: 'make all possible connections between nodes'
                }, m(Icon, {name: 'link'})),
                m(Button, {
                    id: 'btnDisconnect', style: {margin: '0px .5em'},
                    onclick: () => {
                        if (selectedProblem.system === "solved") {
                            alertEditCopy();
                            return;
                        }
                        selectedProblem.pebbleLinks = []
                    },
                    title: 'delete all connections between nodes'
                }, m(Icon, {name: 'circle-slash'})),
                m(Button, {
                    id: 'btnForce', style: {margin: '0px .5em'},
                    onclick: () => forceDiagramState.isPinned = !forceDiagramState.isPinned,
                    title: 'pin the variable pebbles to the page',
                    class: forceDiagramState.isPinned && 'active'
                }, m(Icon, {name: 'pin'})),
                m(Button, {
                    id: 'btnEraser', style: {margin: '0px .5em'},
                    onclick: () => {
                        if (selectedProblem.system === "solved") {
                            alertEditCopy();
                            return;
                        }
                        erase(selectedProblem)
                    },
                    title: 'wipe all variables from the modeling space'
                }, m(Icon, {name: 'trashcan'}))),

            selectedLinks.length > 0 && m(Subpanel, {
                id: 'selectedLinksSubpanel', header: 'Selected Link' + (selectedLinks.length > 1 ? 's' : ''),
                shown: true,
                setShown: () => selectedLinks.forEach(link => delete link.selected),
                style: {
                    left: app.panelWidth['left'],
                    bottom: `calc(${common.panelMargin} + ${app.peekInlineShown ? app.peekInlineHeight + ' + 23px' : '0px'})`,
                    position: 'absolute',
                    width: '200px'
                }
            },
                m('div', {style: {width: '110px', display: 'inline-block'}},
                    m(ButtonRadio, {
                        id: 'pebbleLinkButtonBar',
                        onclick: linkIcon => {
                            let action = Object.entries(linkIcons).find(([name, icon]) => linkIcon === icon)[0];
                            selectedLinks.forEach(selectedLink => {
                                if (action === "none") {delete selectedLink.sign} else selectedLink.sign = action;
                            })
                        },
                        activeSection: selectedLinks.every(link => link.sign === selectedLinks[0].sign) && selectedLinks[0].sign || 'none',
                        sections: Object.entries(linkIcons).map(([key, icon]) => ({id: key, value: icon}))
                    })),
                m(Button, {
                    style: {display: 'inline-block', 'margin-left': '.8em'},
                    onclick: () => {
                        selectedProblem.pebbleLinks = (selectedProblem.pebbleLinks || []).filter(link => !selectedLinks.includes(link))
                        selectedProblem.groupLinks = selectedProblem.groupLinks.filter(link => !selectedLinks.includes(link))
                    }
                }, m(Icon, {name: 'trashcan'}))
            ),

            app.isModelMode && selectedProblem && m(Subpanel, {
                    id: 'legend', header: 'Legend', class: 'legend',
                    style: {
                        right: app.panelWidth['right'],
                        bottom: `calc(${common.panelMargin} + ${app.peekInlineShown ? app.peekInlineHeight + ' + 23px' : '0px'})`,
                        position: 'absolute',
                        width: '150px'
                    }
                }, [
                    {
                        id: "indexButton",
                        vars: selectedProblem.tags.indexes,
                        name: 'Index',
                        borderColor: app.colors.index,
                        innerColor: 'white',
                        width: 1
                    },
                    {
                        id: "weightButton",
                        vars: selectedProblem.tags.weights,
                        name: 'Weight',
                        borderColor: app.colors.weight,
                        innerColor: 'white',
                        width: 1
                    },
                    {
                        id: "ordinalButton",
                        vars: getOrdinalVariables(selectedProblem),
                        name: 'Ordinal',
                        borderColor: app.colors.ordinal,
                        innerColor: 'white',
                        width: 1
                    },
                    {
                        id: "privilegedButton",
                        vars: selectedProblem.tags.privileged,
                        name: 'Privileged',
                        borderColor: app.colors.privileged,
                        innerColor: 'white',
                        width: 1
                    },
                    {
                        id: "exogenousButton",
                        vars: selectedProblem.tags.exogenous,
                        name: 'Exogenous',
                        borderColor: app.colors.exogenous,
                        innerColor: 'white',
                        width: 1
                    },
                    {
                        id: "featurizeButton",
                        vars: selectedProblem.tags.featurize,
                        name: 'Featurize',
                        borderColor: app.colors.featurize,
                        innerColor: 'white',
                        width: 1
                    },
                    {
                        id: "randomizeButton",
                        vars: selectedProblem.tags.randomize,
                        name: 'Randomize',
                        borderColor: app.colors.randomize,
                        innerColor: 'white',
                        width: 1
                    },
                    {
                        id: "nomButton",
                        vars: selectedProblem.tags.nominal,
                        name: 'Nominal',
                        borderColor: app.colors.nominal,
                        innerColor: 'white',
                        width: 1
                    },
                    {
                        id: "csButton",
                        vars: selectedProblem.tags.crossSection,
                        name: 'Cross Sec',
                        borderColor: app.colors.crossSection,
                        innerColor: 'white',
                        width: 1
                    },
                    {
                        id: "boundaryButton",
                        vars: selectedProblem.tags.boundary,
                        name: 'Boundary',
                        borderColor: app.colors.boundary,
                        innerColor: 'white',
                        width: 1
                    },
                    {
                        id: "geographicButton",
                        vars: getGeographicVariables(),
                        name: 'Geographic',
                        borderColor: app.colors.location,
                        innerColor: 'white',
                        width: 1
                    },
                    {
                        id: "temporalButton",
                        vars: Object.keys(app.variableSummaries)
                            .filter(variable => app.variableSummaries[variable].timeUnit),
                        name: 'Temporal',
                        borderColor: app.colors.time,
                        innerColor: 'white',
                        width: 1
                    },
                    {
                        id: "orderingButton",
                        vars: selectedProblem.tags.ordering,
                        name: 'Ordering',
                        borderColor: app.colors.order,
                        innerColor: app.colors.order,
                        width: 0
                    },
                    {
                        id: "locationButton",
                        vars: selectedProblem.tags.location,
                        name: 'Location',
                        borderColor: app.colors.location,
                        innerColor: app.colors.location,
                        width: 0
                    },
                    ...selectedProblem.groups.map(group => ({
                        id: String(group.id).replace(/\W/g, '_'),
                        vars: group.nodes,
                        name: group.name,
                        borderColor: group.color,
                        innerColor: group.color,
                        width: 0
                    }))
                ].filter(row => row.vars.length > 0).map(row =>
                    m(`#${row.id}[style=width:100% !important]`,
                        m(".rectColor[style=display:inline-block]", m("svg[style=width: 20px; height: 20px]",
                            m(`circle[cx=10][cy=10][fill=${row.innerColor}][fill-opacity=0.6][r=9][stroke=${row.borderColor}][stroke-opacity=${row.width}][stroke-width=2]`))),
                        m(".rectLabel[style=display:inline-block;vertical-align:text-bottom;margin-left:.5em]", row.name)))
            ),

            selectedProblem && selectedProblem.manipulations.filter(step => step.type === 'subset').length !== 0 && m(Subpanel, {
                id: 'subsetSubpanel',
                header: 'Subsets',
                style: {
                    left: app.panelWidth['left'],
                    top: common.panelMargin,
                    position: 'absolute'
                }
            }, selectedProblem.manipulations
                .filter(step => step.type === 'subset')
                .map(step => m('div', step.id))
                .concat([`${manipulate.totalSubsetRecords} Records`])),
        ]
    }
}

export let renderProblemNode = (problem, parentArray) => {
    let selectedProblem = getSelectedProblem();
    let baseProblem = workspace.raven_config.problems[problem.problemId];

    return m('div', {
            onclick: () => {
                let problems = workspace.raven_config.problems;
                let problemId = problem.problemId;
                let clickedProblem = problems[problemId];

                if (selectedProblem.problemId === problemId) return;

                // delete current problem if no changes were made
                if (selectedProblem.pending) {
                    if (selectedProblem.unedited)
                        delete problems[selectedProblem.problemId];
                    else if (confirm(`You have unsaved changes in the previous problem, ${selectedProblem.problemId}. Would you like to save ${selectedProblem.problemId}?`))
                        selectedProblem.pending = false;
                    else delete problems[selectedProblem.problemId];
                }

                if (problem.system === 'user') {
                    setSelectedProblem(problemId);
                    return;
                }

                // create a copy of the autogenerated problem
                if (clickedProblem.system === 'discovered') {
                    let copiedProblem = getProblemCopy(clickedProblem);
                    problems[copiedProblem.problemId] = copiedProblem;
                    setSelectedProblem(copiedProblem.problemId);
                }
            },
            oncreate({dom}) {
                dom.style.border = '3px solid transparent'
            }
        },

        m('div', {
                style: {
                    'border-bottom': selectedProblem.problemId === problem.problemId ? `2px solid ${common.selVarColor}` : 'transparent',
                    outline: '0px solid transparent',
                },
            },
            // problem name
            !problem.pending && m('div[style=display:inline]', {
                contenteditable: true,
                oninput: v => baseProblem.name = v.target.innerHTML
            }, m.trust(baseProblem.name || baseProblem.problemId)),
            // indicator for solved or discovered problem
            baseProblem.system !== 'user' && m('div[style=margin-left:.5em;font-style:italic;display:inline;float:right]', baseProblem.system),
            // don't show the problem id if this is a floating problem
            baseProblem.pending && m('div[style=font-style:italic;display:inline]', 'floating problem', m(Button, {
                class: 'btn-xs',
                style: 'margin-left:.5em',
                onclick: () => delete workspace.raven_config.problems[problem.problemId].pending
            }, 'save'))),
    );
}

export let leftPanelWidths = {
    'Variables': '300px',
    'Problems': '300px',
    'Groups': '300px',
    'Summary': '300px'
};

export let rightPanelWidths = {
    Problem: '300px',
    Manipulate: '485px'
};

let leftpanelState = {
    problemLineageState: {}
}
window.leftpanelState = leftpanelState;

export let leftpanel = forceData => {

    let ravenConfig = app.workspace.raven_config;
    let selectedProblem = getSelectedProblem();

    if (!ravenConfig) return;

    let sections = [];
    // base dataset variables, then transformed variables from the problem
    let leftpanelVariables = Object.keys(app.variableSummaries)
        .filter(variable => app.variableSummaries[variable].validCount > 0);

    // VARIABLES TAB
    if (selectedProblem) {

        // if no search string, match nothing
        let matchedVariables = variableSearchText.length === 0 ? []
            : leftpanelVariables.filter(variable => variable.toLowerCase().includes(variableSearchText)
                || (app.variableSummaries.label || "").toLowerCase().includes(variableSearchText));

        // reorder leftpanel variables
        leftpanelVariables = [
            ...matchedVariables,
            ...leftpanelVariables.filter(variable => !matchedVariables.includes(variable))
        ];

        sections.push({
            value: 'Variables',
            title: 'Click variable name to add or remove the variable pebble from the modeling space.',
            contents: app.isModelMode && app.rightTab === 'Manipulate' && manipulate.constraintMenu
                ? manipulate.varList()
                : [
                    m(TextField, {
                        id: 'searchVar',
                        placeholder: 'Search variables and labels',
                        oninput: setVariableSearchText,
                        onblur: setVariableSearchText,
                        value: variableSearchText
                    }),
                    m(PanelList, {
                        id: 'varList',
                        items: leftpanelVariables,
                        colors: Object.assign(
                            selectedProblem.groups.reduce((out, group) =>
                                Object.assign(out, {[app.hexToRgba(group.color, .25)]: group.nodes}), {}),
                            {
                                [app.hexToRgba(common.selVarColor, .5)]: app.isExploreMode ? selectedProblem.tags.loose : explore.explorePreferences.variables,
                                [app.hexToRgba(app.colors.order, .25)]: selectedProblem.tags.ordering,
                                [app.hexToRgba(app.colors.location, .25)]: selectedProblem.tags.location
                            }),
                        classes: {
                            // keep this order aligned with params in mutateNodes
                            'item-nominal': getNominalVariables(selectedProblem),
                            'item-location': getGeographicVariables(),
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
                            'item-matched': matchedVariables,
                            'item-hovered': [leftpanelHoveredVariableName, forceDiagramState.selectedPebble].filter(_ => _)
                        },
                        eventsItems: {
                            onclick: varName => {
                                toggleGroup(selectedProblem, [
                                    ...selectedProblem.groups.flatMap(group => group.nodes),
                                    ...selectedProblem.tags.loose,
                                    ...selectedProblem.tags.crossSection,
                                    ...selectedProblem.tags.ordering
                                ].includes(varName) ? 'None' : 'Loose', varName);
                                app.resetPeek();
                            },
                            onmouseover: varName => leftpanelHoveredVariableName = varName,
                            onmouseout: () => leftpanelHoveredVariableName = undefined,
                        },
                        popup: variableName => m('div', {
                                onmouseover: () => leftpanelHoveredVariableName = variableName,
                                onmouseout: () => leftpanelHoveredVariableName = undefined
                            },
                            m('div',
                                // m('div', {
                                //     style: {'margin': '0.5em', 'display': 'inline-block', width: 'auto'},
                                //     onclick: () => setSelectedPebble(variableName)
                                // }, m(Icon, {name: "info"})),
                                m(ButtonRadio, {
                                    id: 'summaryPopupButtonRadio',
                                    style: {width: 'auto', display: 'inline'},
                                    activeSection: leftpanelHoveredVariablePopper,
                                    onclick: state => leftpanelHoveredVariablePopper = state,
                                    sections: [
                                        {value: 'Tags'},
                                        {value: 'Summary'},
                                    ]
                                })
                            ),
                            leftpanelHoveredVariablePopper === 'Tags' && [
                                ...variableTagMetadata(selectedProblem, variableName).map(tag =>
                                    m('div', {
                                        style: {'margin': '0.5em', 'display': 'inline-block', width: 'auto'}
                                    }, m(Button, {
                                        style: {width: 'auto'},
                                        onclick: tag.onclick,
                                        class: (tag.active ? 'active' : '') + ' btn-sm'
                                    }, tag.name)))
                            ],
                            leftpanelHoveredVariablePopper === 'Summary' && [
                                m('div',
                                    // m('h4', 'Summary Statistics'),
                                    m(Table, {
                                        class: 'table-sm',
                                        style: {height: "250px", overflow: 'auto', display: 'inline-block', margin: 0},
                                        data: formatVariableSummary(app.variableSummaries[variableName])
                                    }))
                            ]
                        ),
                        popupOptions: {placement: 'right', modifiers: {preventOverflow: {escapeWithReference: true}}},
                        style: {
                            height: 'calc(100% - 120px)',
                            overflow: 'auto'
                        }
                    }),
                    m(Button, {
                        id: 'btnCreateVariable',
                        style: {width: '100%', 'margin-top': '10px'},
                        onclick: async () => {

                            let problemPipeline = getSelectedProblem().manipulations;
                            if ((problemPipeline[problemPipeline.length - 1] || {}).type !== 'transform') {
                                problemPipeline.push({
                                    type: 'transform',
                                    id: 'transform ' + problemPipeline.length,
                                    transforms: [],
                                    expansions: [],
                                    binnings: [],
                                    manual: []
                                })
                            }
                            app.setRightTab('Manipulate');
                            manipulate.setConstraintMenu({
                                type: 'transform',
                                step: problemPipeline[problemPipeline.length - 1],
                                pipeline: problemPipeline
                            });
                            common.setPanelOpen('left');
                            app.setLeftTab(app.LEFT_TAB_NAME_VARIABLES);
                        }
                    }, 'Create New Variable'),
                ]
        })
    }

    if (selectedProblem) {
        // TODO: groupLinks
        let {groups, groupLinks} = buildGroupingState(selectedProblem);

        sections.push({
            value: 'Groups',
            contents: [
                m(Button, {
                    style: {margin: '.5em', width: 'calc(100% - 1em)'},
                    onclick: () => selectedProblem.groups.unshift({
                        id: selectedProblem.groupCount++,
                        name: '',
                        description: '',
                        nodes: [],
                        color: common.colorPalette[(selectedProblem.groupCount + 1) % common.colorPalette.length],
                        opacity: 0.3,
                        editable: true
                    })
                }, m(Icon, {name: 'plus'}), ' Group'),
                groups.map(group => m(ForceDiagramGroup, {
                    group, variables: leftpanelVariables, problem: selectedProblem
                }))
            ]
        })
    }

    // PROBLEMS TAB
    selectedProblem && sections.push({
        value: 'Problems',
        contents: [
            m('h4.card-header', 'Problem Lineage'),
            "Problems that are active in the current workspace.",
            m(TreeRender, {
                data: getProblemTrees(),
                state: leftpanelState.problemLineageState,
                renderNode: renderProblemNode
            }),
            m('[style=margin:.5em 0]',
                m(Button, {
                    style: {'margin-left': '.5em', 'display': 'inline'},
                    onclick: () => {
                        let problems = workspace.raven_config.problems;
                        // delete current problem if no changes were made
                        if (selectedProblem.pending) {
                            if (selectedProblem.unedited)
                                delete problems[selectedProblem.problemId];
                            else if (confirm(`You have unsaved changes in the previous problem, ${selectedProblem.problemId}. Would you like to save ${selectedProblem.problemId}?`))
                                selectedProblem.pending = false;
                            else delete problems[selectedProblem.problemId];
                        }

                        let problemId = 'base ' + generateProblemID();
                        let newProblem = buildEmptyProblem(problemId);
                        workspace.raven_config.problems[problemId] = newProblem;
                        setSelectedProblem(newProblem.problemId);
                    }
                }, 'new empty ', m(Icon, {name: 'plus'})),
                m(Button, {
                    style: {'margin-left': '.5em', 'display': 'inline'},
                    onclick: () => {
                        if (selectedProblem.pending) {
                            alert("Please save the current problem before branching.")
                            return
                        }
                        addProblemFromForceDiagram()
                    }
                }, 'new child ', m(Icon, {name: 'git-branch'}))),
            m('h4.card-header', 'Discover Problems'),
            "Preset problems that show interesting relationships mined from the dataset.",
            m(Button, {
                style: {'margin-left': '.5em'},
                onclick: () => app.setShowModalProblems(true)
            }, 'Browse Presets')
        ]
    });

    let summaryPebble = forceDiagramState.hoverPebble || forceDiagramState.selectedPebble;
    let summaryContent;

    if (summaryPebble && forceData) {
        // if hovered over a collapsed pebble, then expand summaryPebble into all children pebbles
        let summaryPebbles = forceData.summaries?.[summaryPebble]?.pdfPlotType === 'collapsed'
            ? [...forceData.summaries[summaryPebble].childNodes]
            : [summaryPebble];

        summaryContent = summaryPebbles.sort(omniSort)
            .map(variableName => m(Subpanel, {
                    id: 'subpanel' + variableName,
                    header: variableName,
                    defaultShown: false,
                    shown: summaryPebbles.length === 1 || undefined
                },

                variableTagMetadata(selectedProblem, variableName).map(tag =>
                    m('div', {
                        style: {'margin': '0.5em', 'display': 'inline-block', width: 'auto'},
                    }, m(Popper, {
                        content: () => tag.title,
                        popperDuration: 10
                    }, m(Button, {
                        style: {width: 'auto'},
                        onclick: tag.onclick,
                        class: (tag.active ? 'active' : '') + ' btn-sm'
                    }, tag.name)))),

                (selectedProblem.tags.ordering.includes(variableName) || app.variableSummaries[variableName].timeUnit) && m('div', {
                    style: {
                        'text-align': 'left',
                        'margin-left': '.5em'
                    }
                },

                bold('Time Format'), m('br'),
                'Data units in ', linkURLwithText('https://strftime.org/', 'strftime'), ' format',
                m(TextField, {
                    id: 'timeFormatTextField',
                    value: app.variableSummaries[variableName].timeUnit,
                    oninput: value => app.setVariableSummaryAttr(variableName, 'timeUnit', value),
                    onblur: value => app.setVariableSummaryAttr(variableName, 'timeUnit', value),
                })),

                (selectedProblem.tags.location.includes(variableName) || app.variableSummaries[variableName].locationUnit) && m('div', {
                    style: {
                        'text-align': 'left',
                        'margin-left': '.5em'
                    }
                },

                m('', {style: 'margin: 0.5em'},
                    bold('Location Format'), m('br'),
                    'Units',
                    m(Dropdown, {
                        id: 'locationUnitsDropdown',
                        items: Object.keys(app.locationUnits).concat(app.variableSummaries[variableName].locationUnit ? ['none'] : []),
                        activeItem: app.variableSummaries[variableName].locationUnit || 'unknown',
                        onclickChild: value => {
                            if (value === 'none') {
                                delete app.variableSummaries[variableName].locationUnit
                                return
                            }
                            if (value === app.variableSummaries[variableName].locationUnit) return;
                            app.setVariableSummaryAttr(variableName, 'locationUnit', value)
                            app.setVariableSummaryAttr(variableName, 'locationFormat', undefined);
                            app.inferLocationFormat(variableName)
                        }
                    }),
                    app.variableSummaries[variableName].locationUnit && m('div',
                        {style: 'margin-bottom: 1em'},
                        'Format',
                        m(Dropdown, {
                            id: 'locationFormatDropdown',
                            items: app.locationUnits[app.variableSummaries[variableName].locationUnit],
                            activeItem: app.variableSummaries[variableName].locationFormat,
                            onclickChild: value => app.setVariableSummaryAttr(variableName, 'locationFormat', value)
                        }),
                    ))),

                m(VariableSummary, {variable: app.variableSummaries[variableName]})));
    }

    sections.push({
        value: 'Summary',
        title: "Select" + " a variable from within the visualization in the center panel to view its summary statistics.",
        display: 'none',
        contents: summaryContent
    });

    return m(Panel, {
        side: 'left',
        label: 'Data Selection',
        hover: false, // app.isModelMode && !manipulate.constraintMenu,
        width: app.isExploreMode && app.leftTab === 'Discover' ? '900px' : leftPanelWidths[app.leftTab],
        attrsAll: {
            onclick: () => app.setFocusedPanel('left'),
            style: {
                'z-index': 100 + (app.focusedPanel === 'left'),
                background: app.hexToRgba(common.menuColor, .9),
                height: `calc(100% - ${common.heightHeader} - 2*${common.panelMargin} - ${app.peekInlineShown ? app.peekInlineHeight : '0px'} - ${common.heightFooter})`
            }
        }
    }, m(MenuTabbed, {
        id: 'leftpanelMenu',
        attrsAll: {style: {height: 'calc(100% - 50px)'}},
        currentTab: app.leftTab,
        callback: app.setLeftTab,
        sections: sections
    }));
};

export let rightpanel = () => {

    let sections = [];

    let ravenConfig = app.workspace.raven_config;
    let selectedProblem = getSelectedProblem();

    let isLocked = app.isLocked(selectedProblem);

    if (!ravenConfig) return;

    // PROBLEM TAB
    selectedProblem && sections.push({
        value: 'Problem',
        idSuffix: 'Type',
        contents: [
            m(Button, {
                id: 'btnLock',
                class: isLocked ? 'active' : '',
                onclick: () => app.setLockToggle(!isLocked),
                title: 'Lock selection of problem description',
                style: 'right:2em;position:fixed;z-index:1000;margin:0.5em',
                disabled: selectedProblem.system === 'solved'
            }, m(Icon, {name: isLocked ? 'lock' : 'pencil'})),
            m('div#problemConfiguration', {
                    onclick: () => {
                        if (selectedProblem.system === 'solved') {
                            alertEditCopy();
                            return;
                        }
                        isLocked && hopscotch.startTour(app.lockTour())
                    }, style: 'float: left'
                },
                m('label', 'Description'),
                m('p', {
                    id: 'problemDescription',
                    style: {
                        'max-height': '200px',
                        'overflow': 'auto',
                        'background': isLocked ? 'transparent' : '#e6e5e5',
                        'border-radius': '.5em',
                        'padding': '1em',
                    },
                }, m('pre', {
                    style: 'margin:0',
                    contenteditable: !isLocked,
                    oninput: v => {
                        selectedProblem.description = v.target.innerHTML
                        selectedProblem.unedited = false
                    }
                }, m.trust(getDescription(selectedProblem)))),
                m('label', 'Modeling Mode'),
                m(ButtonRadio, {
                    id: 'modelingModeButtonBar',
                    attrsAll: {style: 'width:180px;margin:1em;margin-top:0'},
                    onclick: !isLocked && (mode => selectedProblem.modelingMode = mode),
                    activeSection: selectedProblem.modelingMode || "predict",
                    sections: [
                        {value: 'predict', attrsInterface: {disabled: isLocked}},
                        {value: 'causal', attrsInterface: {disabled: isLocked}},
                    ]
                }),
                m('br'),
                m('label', 'Task Type'),
                m(Dropdown, {
                    id: 'taskType',
                    items: Object.keys(app.d3mTaskType),
                    // items: app.workspace.raven_config.advancedMode
                    //     ? Object.keys(app.d3mTaskType)
                    //     : ['classification', 'regression', 'forecasting'],
                    activeItem: selectedProblem.task,
                    onclickChild: task => setTask(task, selectedProblem),
                    style: {'margin': '1em', 'margin-top': '0'},
                    disabled: isLocked
                }),
                Object.keys(app.applicableMetrics[selectedProblem.task]).length !== 1 && [
                    m('label', 'Task Subtype'),
                    m(Dropdown, {
                        id: 'taskSubType',
                        items: Object.keys(app.applicableMetrics[selectedProblem.task]),
                        activeItem: getSubtask(selectedProblem),
                        onclickChild: subTask => setSubTask(subTask, selectedProblem),
                        style: {'margin': '1em', 'margin-top': '0'},
                        disabled: isLocked
                    })
                ],

                selectedProblem.task === 'forecasting' && [

                    m('label', 'Time Granularity (optional). Specify the gap between observations.'),
                    m(TextField, {
                        id: 'timeGranularityValueTextField',
                        value: selectedProblem.timeGranularity?.value || '',
                        oninput: value => selectedProblem.timeGranularity.value =
                            value.replace(/[^\d.-]/g, ''),
                        onblur: value => selectedProblem.timeGranularity.value =
                            Math.max(0, parseFloat(value.replace(/[^\d.-]/g, ''))) || undefined,
                        style: {
                            'margin-bottom': '1em',
                            width: 'calc(100% - 150px)',
                            display: 'inline-block'
                        }
                    }),
                    m('div', {style: {display: 'inline-block', width: '92px'}},
                        m(Dropdown, {
                            id: 'timeGranularityUnitsDropdown',
                            items: ["seconds", "minutes", "days", "weeks", "years", "unspecified"],
                            activeItem: selectedProblem.timeGranularity.units || 'unspecified',
                            onclickChild: granularity => selectedProblem.timeGranularity.units = granularity
                        })),
                    m('label', 'Horizon value. Choose how many granular steps to forecast.'),
                    m(TextField, {
                        id: 'horizonValueTextField',
                        disabled: isLocked,
                        placeholder: 10,
                        value: selectedProblem.forecastingHorizon || '',
                        oninput: !isLocked && (value => selectedProblem.forecastingHorizon =
                            Math.max(0, parseInt(value.replace(/\D/g, ''))) || undefined),
                        style: {'margin-bottom': '1em'}
                    })
                ],

                selectedProblem.task === 'clustering' && [
                    m('label', 'Number of Clusters (optional)'),
                    m(TextField, {
                        id: 'numClustersTextField',
                        disabled: isLocked,
                        value: selectedProblem.numClusters,
                        oninput: !isLocked && (value => selectedProblem.numClusters = Math.max(0, parseInt(value.replace(/\D/g, ''))) || undefined),
                        style: {'margin-bottom': '1em'}
                    })
                ],

                m('label', 'Primary Performance Metric. Models are trained to maximize this metric.'),
                m(Dropdown, {
                    id: 'performanceMetric',
                    // TODO: filter based on https://datadrivendiscovery.org/wiki/display/work/Matrix+of+metrics
                    items: app.applicableMetrics[selectedProblem.task][getSubtask(selectedProblem)],
                    activeItem: selectedProblem.metric,
                    onclickChild: metric => setMetric(metric, selectedProblem),
                    style: {'margin': '1em', 'margin-top': '0'},
                    disabled: isLocked
                }),

                // m('label[style=margin:0.5em]', 'Advanced Options. If enabled, then more problem types, splitting, search and score options may be configured.'),
                // m(ButtonRadio, {
                //     id: 'advancedModeOption',
                //     attrsAll: {style: {margin: '1em', width: 'calc(100% - 2em)'}},
                //     onclick: !isLocked && (value => app.workspace.raven_config.advancedMode = value === 'True'),
                //     activeSection: app.workspace.raven_config.advancedMode ? 'True' : 'False',
                //     sections: ['True', 'False'].map(type => ({value: type, attrsInterface: {disabled: isLocked}}))
                // }),

                // app.workspace.raven_config.advancedMode &&
                app.applicableMetrics[selectedProblem.task][getSubtask(selectedProblem)].length - 1 > selectedProblem.metrics.length && m(Dropdown, {
                    id: 'performanceMetrics',
                    items: app.applicableMetrics[selectedProblem.task][getSubtask(selectedProblem)]
                        .filter(metric => metric !== selectedProblem.metric && !selectedProblem.metrics.includes(metric)),
                    activeItem: 'Add Secondary Metric',
                    onclickChild: metric => {
                        selectedProblem.metrics = [...selectedProblem.metrics, metric].sort(omniSort);
                        delete selectedProblem.unedited;
                    },
                    style: {'margin': '1em', 'margin-top': '0'},
                    disabled: isLocked
                }),
                // app.workspace.raven_config.advancedMode &&
                m(ListTags, {
                    tags: selectedProblem.metrics,
                    ondelete: !isLocked && (metric => remove(selectedProblem.metrics, metric))
                }),

                // app.workspace.raven_config.advancedMode &&
                [selectedProblem.metric, ...selectedProblem.metrics].find(metric => ['f1', 'precision', 'recall'].includes(metric)) && getTargetVariables(selectedProblem).length > 0 && [
                    m('label', 'Positive Class. Used for f1, precision, and recall metrics.'),
                    m(Dropdown, {
                        id: 'positiveClass',
                        items: Object.keys(app.variableSummaries[getTargetVariables(selectedProblem)[0]]?.plotValues || {}),
                        activeItem: selectedProblem.positiveLabel,
                        onclickChild: label => selectedProblem.positiveLabel = label,
                        style: {'margin': '1em', 'margin-top': '0'},
                        disabled: isLocked
                    }),
                ],

                // app.workspace.raven_config.advancedMode &&
                [selectedProblem.metric, ...selectedProblem.metrics].find(metric => metric === 'precisionAtTopK') && [
                    m('label', 'K, for Precision at top K'),
                    m(TextField, {
                        id: 'precisionAtTopKTextField',
                        disabled: isLocked,
                        value: selectedProblem.precisionAtTopK === undefined ? '' : selectedProblem.precisionAtTopK,
                        oninput: !isLocked && (value => selectedProblem.precisionAtTopK = Math.max(0, parseInt(value.replace(/\D/g, ''))) || undefined),
                        style: {'margin-bottom': '1em'}
                    })
                ],

                // app.workspace.raven_config.advancedMode &&
                m(Subpanel, {
                        header: 'Split Options',
                        defaultShown: false,
                        style: {margin: '1em'}
                    },
                    m('label', 'Prepare in/out-of-sample splits.'),
                    m(ButtonRadio, {
                        id: 'outOfSampleSplit',
                        onclick: value => {
                            if (isLocked) return;
                            selectedProblem.splitOptions.outOfSampleSplit = value === 'True';
                    },
                    activeSection: selectedProblem.splitOptions.outOfSampleSplit ? 'True' : 'False',
                    sections: ['True', 'False'].map(type => ({value: type, attrsInterface: {disabled: isLocked}}))
                }),
                selectedProblem.splitOptions.outOfSampleSplit && [
                    m('label[style=margin-top:0.5em]', 'In-sample-ratio. This ratio is used for model training, the rest is used for out-of-sample scoring and diagnostics.'),
                    m(TextField, {
                        id: 'ratioSplitsOption',
                        disabled: isLocked,
                        value: selectedProblem.splitOptions.trainTestRatio || 0,
                        onblur: !isLocked && (value => selectedProblem.splitOptions.trainTestRatio = Math.max(0, Math.min(1, parseFloat(value.replace(/[^\d.-]/g, '')) || 0))),
                        style: {'margin-bottom': '1em'}
                    }),
                    // m('label[style=margin-top:0.5em]', 'Stratify'),
                    // m(ButtonRadio, {
                    //     id: 'stratifiedSplitOption',
                    //     onclick: value => {
                    //         if (isLocked) return;
                    //         selectedProblem.splitOptions.stratified = value === 'True';
                    //     },
                    //     activeSection: selectedProblem.splitOptions.stratified ? 'True' : 'False',
                    //     sections: ['True', 'False'].map(type => ({value: type, attrsInterface: {disabled: isLocked}}))
                    // }),
                    m('label[style=margin-top:0.5em]', 'Shuffle'),
                    m(ButtonRadio, {
                        id: 'shuffleSplitsOption',
                        onclick: !isLocked && (value => selectedProblem.splitOptions.shuffle = value === 'True'),
                        activeSection: selectedProblem.splitOptions.shuffle ? 'True' : 'False',
                        sections: ['True', 'False'].map(type => ({value: type, attrsInterface: {disabled: isLocked}}))
                    }),
                    selectedProblem.splitOptions.shuffle && [
                        m('label[style=margin-top:0.5em]', 'Random seed'),
                        m(TextField, {
                            id: 'randomSeedSplitsOption',
                            disabled: isLocked,
                            value: selectedProblem.splitOptions.randomSeed || 0,
                            oninput: !isLocked && (value => selectedProblem.splitOptions.randomSeed = parseFloat(value.replace(/\D/g, '')) || undefined),
                            style: {'margin-bottom': '1em'}
                        })
                    ],
                        // m('label[style=margin-top:0.5em]', 'Splits file (optional)'),
                        // m(TextField, {
                        //     id: 'textFieldSampleSplitsFile',
                        //     disabled: isLocked,
                        //     value: selectedProblem.splitOptions.splitsFile,
                        //     onblur: !isLocked && (value => selectedProblem.splitOptions.splitsFile = value),
                        //     style: {'margin-bottom': '1em'}
                        // }),
                        m('label', 'Maximum record count per data split'),
                        m(TextField, {
                            id: 'maxRecordCountOption',
                            disabled: isLocked,
                            value: selectedProblem.splitOptions.maxRecordCount || '',
                            oninput: !isLocked && (value => selectedProblem.splitOptions.maxRecordCount = value.replace(/[^\d.-]/g, '')),
                            onblur: !isLocked && (value => selectedProblem.splitOptions.maxRecordCount = parseFloat(value.replace(/[^\d.-]/g, '')) || undefined),
                            style: {'margin-bottom': '1em'}
                        }),
                    ]),
                // app.workspace.raven_config.advancedMode &&
                m(Subpanel, {
                        header: 'Search Options',
                        defaultShown: false,
                        style: {margin: '1em'}
                    },
                    m('label', 'Approximate time bound for overall pipeline search, in minutes.'), //  Leave empty for unlimited time.
                    m(TextField, {
                        id: 'timeBoundOption',
                        value: selectedProblem.searchOptions.timeBoundSearch || '',
                        disabled: isLocked,
                        oninput: !isLocked && (value => selectedProblem.searchOptions.timeBoundSearch = value.replace(/[^\d.-]/g, '')),
                    onblur: !isLocked && (value => selectedProblem.searchOptions.timeBoundSearch = Math.max(0, parseFloat(value.replace(/[^\d.-]/g, ''))) || undefined),
                    style: {'margin-bottom': '1em'}
                }),
                m('label', 'Approximate time bound for predicting with a single pipeline, in minutes. Leave empty for unlimited time.'),
                m(TextField, {
                    id: 'timeBoundRunOption',
                    disabled: isLocked,
                    value: selectedProblem.searchOptions.timeBoundRun || '',
                    oninput: !isLocked && (value => selectedProblem.searchOptions.timeBoundRun = value.replace(/[^\d.-]/g, '')),
                    onblur: !isLocked && (value => selectedProblem.searchOptions.timeBoundRun = Math.max(0, parseFloat(value.replace(/[^\d.-]/g, ''))) || undefined),
                    style: {'margin-bottom': '1em'}
                }),
                m('label', 'Priority'),
                m(TextField, {
                    id: 'priorityOption',
                    disabled: isLocked,
                    value: selectedProblem.searchOptions.priority || '',
                    oninput: !isLocked && (value => selectedProblem.searchOptions.priority = value.replace(/[^\d.-]/g, '')),
                    onblur: !isLocked && (value => selectedProblem.searchOptions.priority = parseFloat(value.replace(/[^\d.-]/g, '')) || undefined),
                    style: {'margin-bottom': '1em'}
                }),
                    m('label', 'Limit on number of solutions'),
                    m(TextField, {
                        id: 'solutionsLimitOption',
                        disabled: isLocked,
                        value: selectedProblem.searchOptions.solutionsLimit || '',
                        oninput: !isLocked && (value => selectedProblem.searchOptions.solutionsLimit = Math.max(0, parseInt(value.replace(/\D/g, ''))) || undefined),
                        style: {'margin-bottom': '1em'}
                    })),
                // app.workspace.raven_config.advancedMode &&
                m(Subpanel, {
                        header: 'Score Options',
                        defaultShown: false,
                        style: {margin: '1em'},
                    },
                    m('label[style=margin-top:0.5em]', 'Custom Scoring Configuration'),
                    m(ButtonRadio, {
                        id: 'customScoringConfiguration',
                        onclick: !isLocked && (value => selectedProblem.scoreOptions.userSpecified = value === 'True'),
                        activeSection: selectedProblem.scoreOptions.userSpecified ? 'True' : 'False',
                        sections: ['True', 'False'].map(type => ({value: type, attrsInterface: {disabled: isLocked}}))
                    }),
                    selectedProblem.scoreOptions.userSpecified && [
                        m('label', 'Evaluation Method'),
                        m(Dropdown, {
                            id: 'evaluationMethodScoreOption',
                            items: Object.keys(app.d3mEvaluationMethods),
                            activeItem: selectedProblem.scoreOptions.evaluationMethod,
                            onclickChild: child => {
                                selectedProblem.scoreOptions.evaluationMethod = child;
                                delete selectedProblem.unedited;
                            },
                            style: {'margin-bottom': '1em'},
                            disabled: isLocked
                        }),
                        selectedProblem.scoreOptions.evaluationMethod === 'kFold' && [
                            m('label[style=margin-top:0.5em]', 'Number of Folds'),
                            m(TextField, {
                                id: 'foldsScoreOption',
                                disabled: isLocked,
                                value: selectedProblem.scoreOptions.folds || '',
                                oninput: !isLocked && (value => selectedProblem.scoreOptions.folds = parseFloat(value.replace(/\D/g, '')) || undefined),
                                style: {'margin-bottom': '1em'}
                            }),
                        ],
                        selectedProblem.scoreOptions.evaluationMethod === 'holdOut' && [
                            m('label[style=margin-top:0.5em]', 'Train/Test Ratio'),
                            m(TextField, {
                                id: 'ratioScoreOption',
                                disabled: isLocked,
                                value: selectedProblem.scoreOptions.trainTestRatio || 0,
                                onblur: !isLocked && (value => selectedProblem.scoreOptions.trainTestRatio = Math.max(0, Math.min(1, parseFloat(value.replace(/[^\d.-]/g, '')) || 0))),
                                style: {'margin-bottom': '1em'}
                            })
                        ],
                        // m('label', 'Stratify'),
                        // m(ButtonRadio, {
                        //     id: 'stratifiedScoreOption',
                        //     onclick: value => {
                        //         if (isLocked) return;
                        //         selectedProblem.scoreOptions.stratified = value === 'True';
                        //     },
                        //     activeSection: selectedProblem.scoreOptions.stratified ? 'True' : 'False',
                        //     sections: ['True', 'False'].map(type => ({value: type, attrsInterface: {disabled: isLocked}}))
                        // }),
                        m('label[style=margin-top:0.5em]', 'Shuffle'),
                        m(ButtonRadio, {
                            id: 'shuffleScoreOption',
                            onclick: !isLocked && (value => selectedProblem.scoreOptions.shuffle = value === 'True'),
                            activeSection: selectedProblem.scoreOptions.shuffle ? 'True' : 'False',
                            sections: ['True', 'False'].map(type => ({value: type, attrsInterface: {disabled: isLocked}}))
                        }),
                        selectedProblem.scoreOptions.shuffle && [
                            m('label[style=margin-top:0.5em]', 'Random seed'),
                            m(TextField, {
                                id: 'randomSeedScoreOption',
                                disabled: isLocked,
                                value: selectedProblem.scoreOptions.randomSeed || 0,
                                oninput: !isLocked && (value => selectedProblem.scoreOptions.randomSeed = parseFloat(value.replace(/\D/g, '')) || undefined),
                                style: {'margin-bottom': '1em'}
                            })
                        ],
                    ]
                ),
            )
        ]
    });

    // MANIPULATE TAB
    selectedProblem && sections.push({
        value: 'Manipulate',
        title: 'Apply transformations and subsets to a problem',
        contents: m(MenuHeaders, {
            id: 'aggregateMenu',
            attrsAll: {style: {height: '100%', overflow: 'auto'}},
            sections: [
                (ravenConfig.priorManipulations || []).length !== 0 && {
                    value: 'Prior Pipeline',
                    contents: m(manipulate.PipelineFlowchart, {
                        compoundPipeline: ravenConfig.priorManipulations,
                        pipeline: ravenConfig.priorManipulations,
                        editable: false
                    })
                },
                ravenConfig.hardManipulations.length !== 0 && {
                    value: 'Dataset Pipeline',
                    contents: m(manipulate.PipelineFlowchart, {
                        compoundPipeline: ravenConfig.hardManipulations,
                        pipeline: ravenConfig.hardManipulations,
                        editable: false
                    })
                },
                {
                    value: 'Problem Pipeline',
                    contents: [
                        m(manipulate.PipelineFlowchart, {
                            compoundPipeline: [
                                ...ravenConfig.hardManipulations,
                                ...selectedProblem.manipulations
                            ],
                            pipeline: selectedProblem.manipulations,
                            editable: selectedProblem.systemId !== 'solved',
                            hard: false
                        }),
                        selectedProblem.tags.nominal.length > 0 && m(Flowchart, {
                            attrsAll: {style: {height: 'calc(100% - 87px)', overflow: 'auto'}},
                            labelWidth: '5em',
                            steps: [{
                                key: 'Nominal',
                                color: app.hexToRgba(app.colors.nominal, .5),
                                content: m('div', {style: {'text-align': 'left', 'white-space': 'normal'}},
                                    m(ListTags, {
                                        tags: selectedProblem.tags.nominal,
                                        ondelete: name => remove(selectedProblem.tags.nominal, name)
                                    }))
                            }]
                        }),
                        selectedProblem.tags.ordering.length > 1 && m(Flowchart, {
                            attrsAll: {style: {height: 'calc(100% - 87px)', overflow: 'auto'}},
                            labelWidth: '5em',
                            steps: [{
                                key: 'Ordering',
                                color: app.hexToRgba(app.colors.order, .5),
                                content: m(Table, {
                                    style: {margin: '-4px', width: 'calc(100% + 8px)'},
                                    data: [
                                        [
                                            m(Popper, {content: () => "Drag to reorder. Click to select the pebble and customize the format."}, "Unit Ordering"),
                                            m(ListTags, {
                                                tags: selectedProblem.tags.ordering,
                                                reorderable: true,
                                                onreorder: () =>     // update preprocess
                                                    loadProblemPreprocess(selectedProblem)
                                                        .then(app.setPreprocess)
                                                        .then(m.redraw),
                                                onclick: setSelectedPebble
                                            })
                                        ],
                                        [
                                            "Output Time Units",
                                            italicize(getOrderingTimeUnit(selectedProblem))
                                        ],
                                        [
                                            "Output Name",
                                            m(TextField, {
                                                value: selectedProblem.orderingName,
                                                placeholder: selectedProblem.tags.ordering.join("-"),
                                                oninput: value => {
                                                    if (value === selectedProblem.tags.ordering.join("-") || !value)
                                                        delete selectedProblem.orderingName
                                                    else selectedProblem.orderingName = value
                                                },
                                                onblur: value => {
                                                    if (value === selectedProblem.tags.ordering.join("-") || !value)
                                                        delete selectedProblem.orderingName
                                                    else selectedProblem.orderingName = value;

                                                    loadProblemPreprocess(selectedProblem)
                                                        .then(app.setPreprocess)
                                                        .then(m.redraw)
                                                }
                                            })
                                        ]
                                    ]
                                })
                            }]
                        })
                    ]
                },
            ]
        })
    });

    return m(Panel, {
            side: 'right',
            label: 'Problem Configuration',
            hover: app.isExploreMode,
            width: rightPanelWidths[app.rightTab],
            attrsAll: {
                onclick: () => app.setFocusedPanel('right'),
                style: {
                    'z-index': 100 + (app.focusedPanel === 'right'),
                    height: `calc(100% - ${common.heightHeader} - 2*${common.panelMargin} - ${app.peekInlineShown ? app.peekInlineHeight : '0px'} - ${common.heightFooter})`,
                }
            }
        },
        sections.length > 0 && m(MenuTabbed, {
            id: 'rightpanelMenu',
            currentTab: app.rightTab,
            callback: app.setRightTab,
            sections,
            attrsAll: {style: {height: 'calc(100% - 50px)'}}
        })
    );
}

// initial color scale used to establish the initial colors of nodes
// allNodes.push() below establishes a field for the master node array allNodes called "nodeCol" and assigns a color from this scale to that field
// everything there after should refer to the nodeCol and not the color scale, this enables us to update colors and pass the variable type to R based on its coloring
export let colors = d3.scaleOrdinal(d3.schemeCategory10);

const intersect = sets => sets.reduce((a, b) => new Set([...a].filter(x => b.has(x))));


let buildGroupingState = problem => {
    return {
        groups: [
            variableSearchText.length > 0 && {
                id: 'Search',
                name: `Search: ${variableSearchText}`,
                color: app.colors.matched,
                description: `Snapshot of variables containing "${variableSearchText}".`,
                nodes: Object.keys(app.variableSummaries).filter(variable => variable.toLowerCase().includes(variableSearchText)),
                opacity: 0.3
            },
            ...problem.groups.map(group => Object.assign({}, group, {nodes: new Set(group.nodes), editable: true})),
            {
                id: 'Loose',
                name: "Loose",
                description: defaultGroupDescriptions.loose,
                color: common.menuColor,
                nodes: new Set(problem.tags.loose),
                opacity: 0.0
            },
            {
                id: "Cross-Sectional",
                name: 'Cross-Sectional',
                description: defaultGroupDescriptions.crossSection,
                color: app.colors.crossSection,
                nodes: new Set(problem.tags.crossSection),
                opacity: 0.3
            },
            {
                id: 'Ordering',
                name: "Ordering",
                color: app.colors.order,
                description: defaultGroupDescriptions.ordering,
                nodes: new Set(problem.tags.ordering),
                opacity: 0.3
            },
            {
                id: 'Location',
                name: "Location",
                color: app.colors.location,
                description: defaultGroupDescriptions.location,
                nodes: new Set(problem.tags.location),
                opacity: 0.3
            }
        ].filter(_ => _),
        groupLinks: [
            ...problem.groupLinks,
            ...getTargetGroups(problem).flatMap(group => [
                {
                    color: app.colors.order,
                    source: 'Ordering',
                    target: group.id
                },
                {
                    color: app.colors.crossSection,
                    source: 'Cross-Sectional',
                    target: group.id
                },
            ])
        ]
    }
};

export let buildForceData = problem => {

    if (!problem) return;

    let summaries = Object.assign({}, app.variableSummaries);

    // collapse group intersections with more than maxNodes into a single node
    let maxNodes = 30;

    let removedPebbles = new Set();
    let addedPebbles = new Set();

    let {groups, groupLinks} = buildGroupingState(problem);

    let combinedGroups = new Map(common.deepCopy(groups).map(group => [group.id, group]));

    // TODO: can be linearized with a hashmap
    // for any combination of groups, collapse their intersection if their intersection is large enough
    // https://stackoverflow.com/questions/12303989/cartesian-product-of-multiple-arrays-in-javascript
    const cartesian = (...a) => a.length === 0 ? []
        : a.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())), []);

    cartesian(...groups.map(group => [{group, include: true}, {group, include: false}]))
        .forEach(combination => {

            let includedGroups = combination
                .filter(comb => comb.include)
                .map(comb => comb.group);
            if (includedGroups.length === 0) return;

            let partition = new Set([
                ...intersect(includedGroups.map(group => group.nodes))
            ].filter(pebble => !combination
                .filter(comb => !comb.include)
                .some(comb => comb.group.nodes.has(pebble))));

            let mergedName = includedGroups.map(group => group.name).join(' & ');

            if (partition.size > maxNodes) {

                addedPebbles.add(mergedName);
                let partitionArray = [...partition];
                partitionArray.forEach(pebble => removedPebbles.add(pebble));

                // app.remove pebbles that were collapsed from their parent groups
                includedGroups
                    .forEach(group => combinedGroups.get(group.id).nodes = new Set([...group.nodes].filter(node => !partition.has(node))));
                // add the pebble that represents the merge to each parent group
                includedGroups
                    .forEach(group => combinedGroups.get(group.id).nodes.add(mergedName));

                summaries[mergedName] = {
                    pdfPlotType: 'collapsed',
                    childNodes: partition
                };

                // when merging, attempt to use the positions of existing modes
                if (!(mergedName in forceDiagramNodesReadOnly)) {
                    let preexistingPebbles = partitionArray.filter(pebble => pebble in forceDiagramNodesReadOnly)
                    if (preexistingPebbles.length > 0) forceDiagramNodesReadOnly[mergedName] = {
                        id: mergedName.replace(/\W/g, '_'),
                        name: mergedName,
                        x: preexistingPebbles.reduce((sum, pebble) => sum + forceDiagramNodesReadOnly[pebble].x, 0) / preexistingPebbles.length,
                        y: preexistingPebbles.reduce((sum, pebble) => sum + forceDiagramNodesReadOnly[pebble].y, 0) / preexistingPebbles.length
                    }
                }
            }
        });

    // all pebbles to draw in the plot
    let pebbles = [...new Set([
        ...groups.flatMap(group => [...group.nodes]).filter(pebble => !removedPebbles.has(pebble)),
        ...addedPebbles
    ])];
    groups = [...combinedGroups.values()];

    return {pebbles, groups, groupLinks, summaries};
};


export let forceDiagramNodesReadOnly = {};

export let leftpanelHoveredVariableName;
let leftpanelHoveredVariablePopper = 'Summary';

export let forceDiagramState = {
    builders: [pebbleBuilderLabeled, groupBuilder, linkBuilder, groupLinkBuilder],
    hoverPebble: undefined,
    contextPebble: undefined,
    contextGroup: undefined,
    selectedPebble: undefined,
    hoverTimeout: undefined,
    isPinned: false,
    hullRadius: 50,
    defaultPebbleRadius: 40,
    hoverTimeoutDuration: 150, // milliseconds to wait before showing/hiding the pebble handles
    selectTransitionDuration: 300, // milliseconds of pebble resizing animations
    arcHeight: 16,
    arcGap: 1
};
window.forceDiagramState = forceDiagramState;

let setContextGroup = (e, group) => {

    let selectedProblem = getSelectedProblem();
    if (selectedProblem.system === 'solved') {
        alertEditCopy();
        return;
    }

    delete selectedProblem.unedited;
    if (e) e.preventDefault(); // block browser context menu
    if (forceDiagramState.contextGroup) {

        if (forceDiagramState.contextGroup !== group) {
            let link = {
                source: forceDiagramState.contextGroup.id,
                target: group.id,
                color: forceDiagramState.contextGroup.color
            };
            selectedProblem.groupLinks.push(link);
        }
        forceDiagramState.contextGroup = undefined;
    }
    m.redraw();
};

let setContextPebble = (e, pebble) => {
    let selectedProblem = getSelectedProblem();
    if (selectedProblem.system === 'solved') {
        alertEditCopy();
        return;
    }

    delete selectedProblem.unedited;
    if (e) e.preventDefault(); // block browser context menu
    if (forceDiagramState.contextPebble) {

        if (forceDiagramState.contextPebble !== pebble) {
            selectedProblem.pebbleLinks = selectedProblem.pebbleLinks || [];
            let link = {
                source: forceDiagramState.contextPebble,
                target: pebble,
                right: true,
                selected: true
            };
            selectedProblem.pebbleLinks.push(link);
        }
        forceDiagramState.contextPebble = undefined;
    } else {
        if (getTargetVariables(selectedProblem).includes(pebble)) {
            app.alertWarn("Targets may not be predictors!")
            return
        }
        forceDiagramState.contextPebble = pebble;
    }
    app.resetPeek();
    m.redraw();
};

let setSelectedPebble = pebble => {
    forceDiagramState.selectedPebble = pebble;

    if (pebble) {
        app.setLeftTabHidden(app.leftTab);
        app.setLeftTab('Summary');
    } else if (app.leftTabHidden) {
        app.setLeftTab(app.leftTabHidden);
    }
    m.redraw();
};

Object.assign(forceDiagramState, {
    setSelectedPebble,
    groupEvents: {
        click: setContextGroup,
        contextmenu: (e, group) => {
            if (e) e.preventDefault(); // block browser context menu
            forceDiagramState.contextGroup = group;

            m.redraw();
        }
    },
    pebbleEvents: {
        click: (e, pebble) => {
            if (forceDiagramState.contextPebble)
                setContextPebble(e, pebble);
            else if (forceDiagramState.contextGroup)
                setContextGroup(e, buildGroupingState(getSelectedProblem()).groups.find(group => group.nodes.has(pebble)))
            else setSelectedPebble(pebble)
        },
        mouseover: (e, pebble) => {
            if (firstSummaryMouseover && app.tutorial_mode && !hopscotch.getCurrTour())
                hopscotch.startTour(summaryTour());
            clearTimeout(forceDiagramState.hoverTimeout);
            forceDiagramState.hoverTimeout = setTimeout(() => {
                if (!forceDiagramState.contextPebble && !forceDiagramState.contextGroup)
                    forceDiagramState.hoverPebble = pebble;
                if (app.leftTab !== 'Summary') app.setLeftTabHidden(app.leftTab);
                app.setLeftTab('Summary');
                m.redraw()
            }, forceDiagramState.hoverTimeoutDuration)
        },
        mouseout: () => {
            clearTimeout(forceDiagramState.hoverTimeout);
            forceDiagramState.hoverTimeout = setTimeout(() => {
                forceDiagramState.hoverPebble = undefined;
                if (!forceDiagramState.selectedPebble)
                    app.setLeftTab(app.leftTabHidden)

                m.redraw()
            }, forceDiagramState.hoverTimeoutDuration)
        },
        contextmenu: setContextPebble
    }
});

let variableTagMetadata = (selectedProblem, variableName) => [
    ...selectedProblem.groups.map(group => ({
        name: group.name,
        active: group.nodes.includes(variableName),
        onclick: () => toggleGroup(selectedProblem, group.nodes.includes(variableName) ? 'Loose' : group.id, variableName),
        title: group.description
    })),
    {
        name: 'Loose', active: selectedProblem.tags.loose.includes(variableName),
        onclick: () => toggleGroup(selectedProblem, selectedProblem.tags.loose.includes(variableName) ? 'None' : 'Loose', variableName),
        title: defaultGroupDescriptions.loose
    },
    {
        name: 'Ordering', active: selectedProblem.tags.ordering.includes(variableName),
        onclick: () => toggleGroup(selectedProblem, 'Ordering', variableName),
        title: defaultGroupDescriptions.ordering
    },
    {
        name: 'Location', active: selectedProblem.tags.location.includes(variableName),
        onclick: () => toggleGroup(selectedProblem, 'Location', variableName),
        title: defaultGroupDescriptions.location
    },
    {
        name: 'Nominal', active: selectedProblem.tags.nominal.includes(variableName),
        onclick: () => toggleTag(selectedProblem, 'nominal', variableName),
        title: defaultGroupDescriptions.nominal,
    },
    {
        name: 'Ordinal', active: getOrdinalVariables(selectedProblem).includes(variableName),
        onclick: () => toggleGroup(selectedProblem, 'ordinal', variableName),
        title: defaultGroupDescriptions.ordinal
    },
    {
        name: 'Cross Section', active: selectedProblem.tags.crossSection.includes(variableName),
        onclick: () => toggleGroup(selectedProblem, 'crossSection', variableName),
        title: defaultGroupDescriptions.crossSection
    },
    {
        name: 'Boundary', active: selectedProblem.tags.boundary.includes(variableName),
        onclick: () => toggleTag(selectedProblem, 'boundary', variableName),
        title: defaultGroupDescriptions.boundary
    },
    {
        name: 'Weight', active: selectedProblem.tags.weights.includes(variableName),
        onclick: () => toggleTag(selectedProblem, 'weights', variableName),
        title: defaultGroupDescriptions.weight
    },
    {
        name: 'Privileged', active: selectedProblem.tags.privileged.includes(variableName),
        onclick: () => toggleTag(selectedProblem, 'privileged', variableName),
        title: defaultGroupDescriptions.privileged
    },
    {
        name: 'Exogenous', active: selectedProblem.tags.exogenous.includes(variableName),
        onclick: () => toggleTag(selectedProblem, 'exogenous', variableName),
        title: defaultGroupDescriptions.exogenous
    },
    {
        name: 'Featurize', active: selectedProblem.tags.featurize.includes(variableName),
        onclick: () => toggleTag(selectedProblem, 'featurize', variableName),
        title: defaultGroupDescriptions.featurize
    },
    {
        name: 'Randomize', active: selectedProblem.tags.randomize.includes(variableName),
        onclick: () => toggleTag(selectedProblem, 'randomize', variableName),
        title: defaultGroupDescriptions.randomize
    },
    {
        name: 'Index', active: selectedProblem.tags.indexes.includes(variableName),
        onclick: () => toggleTag(selectedProblem, 'indexes', variableName),
        title: defaultGroupDescriptions.index
    },
].filter(_ => _)

// appears when a user attempts to edit when the toggle is set
let firstSummaryMouseover = true;
export let summaryTour = () => ({
    id: "lock_toggle",
    i18n: {doneBtn: 'Ok'},
    showCloseButton: true,
    scrollDuration: 300,
    onEnd: () => firstSummaryMouseover = false,
    steps: [
        app.step("leftpanel", "right", "Variable Summaries",
            `<p>A summary is shown for the pebble you are hovering over. Keep the variable summary open by clicking on its associated pebble.</p>`)
    ]
});

export let mutateNodes = problem => (state, context) => {
    let pebbles = Object.keys(context.nodes);

    // set radius of each node. Members of groups are scaled down if group gets large.
    pebbles.forEach(pebble => {
        let upperSize = 10;
        let maxNodeGroupSize = Math.max(...context.filtered.groups
            .filter(group => group.nodes.has(pebble))
            .map(group => group.nodes.size), upperSize);
        context.nodes[pebble].radius = state.defaultPebbleRadius * Math.sqrt(upperSize / maxNodeGroupSize);

        if (pebble === state.selectedPebble)
            context.nodes[pebble].radius = Math.min(context.nodes[pebble].radius * 1.5, state.defaultPebbleRadius);
    });

    // if no search string, match nothing
    // let matchedVariables = variableSearchText.length === 0 ? []
    //     : pebbles.filter(variable => variable.toLowerCase().includes(variableSearchText));

    // the order of the keys indicates precedence, lower keys are more important
    let params = new Map([
        ...problem.groups.map(group => [group.id, new Set(group.nodes)]),
        ['loose', new Set(problem.tags.loose)],
        ['transformed', new Set(problem.tags.transformed)],
        ['nominal', new Set(getNominalVariables(problem))],
        ['geographic', new Set(getGeographicVariables())],
        ['ordinal', new Set(getOrdinalVariables(selectedProblem))],
        ['boundary', new Set(problem.tags.boundary)],
        ['temporal', new Set(Object.keys(app.variableSummaries)
            .filter(variable => app.variableSummaries[variable].timeUnit))],
        ['weights', new Set(problem.tags.weights)],
        ['privileged', new Set(problem.tags.privileged)],
        ['exogenous', new Set(problem.tags.exogenous)],
        ['featurize', new Set(problem.tags.featurize)],
        ['randomize', new Set(problem.tags.randomize)],
        ['crossSection', new Set(problem.tags.crossSection)],
        ['indexes', new Set(problem.tags.indexes)],
            // ['matched', new Set(matchedVariables)],
    ]);

    let strokeWidths = Object.assign(
        problem.groups.reduce((out, group) =>
            Object.assign(out, {[group.id]: 4}), {}),
        {
            nominal: 4,
            ordinal: 4,
            crossSection: 4,
            boundary: 4,
            geographic: 4,
            temporal: 4,
            weights: 4,
            privileged: 4,
            exogenous: 4,
            featurize: 4,
            randomize: 4,
            indexes: 4,
            // matched: 4
        });

    let nodeColors = {
        nominal: common.taggedColor,
        ordinal: common.taggedColor,
        crossSection: common.taggedColor,
        boundary: common.taggedColor,
        geographic: common.taggedColor,
        temporal: common.taggedColor,
        weights: common.taggedColor,
        privileged: common.taggedColor,
        exogenous: common.taggedColor,
        featurize: common.taggedColor,
        randomize: common.taggedColor,
        indexes: common.taggedColor,
        // matched: common.taggedColor,
        loose: common.taggedColor,
    };

    let strokeColors = {
        nominal: app.colors.nominal,
        ordinal: app.colors.ordinal,
        crossSection: app.colors.crossSection,
        boundary: app.colors.boundary,
        geographic: app.colors.location,
        temporal: app.colors.time,
        weights: app.colors.weight,
        privileged: app.colors.privileged,
        exogenous: app.colors.exogenous,
        featurize: app.colors.featurize,
        randomize: app.colors.randomize,
        indexes: app.colors.index,
        // matched: app.colors.matched
    };

    // set the base color of each node
    pebbles.forEach(pebble => {
        if (state.summaries[pebble] && state.summaries[pebble].pdfPlotType === 'collapsed') {
            context.nodes[pebble].strokeWidth = 0;
            context.nodes[pebble].nodeCol = 'transparent';
            context.nodes[pebble].strokeColor = 'transparent';
        } else {
            context.nodes[pebble].strokeWidth = 1;
            context.nodes[pebble].nodeCol = colors(generateID(pebble));
            context.nodes[pebble].strokeColor = 'transparent';
        }
    });

    // set additional styling for each node
    pebbles.forEach(pebble => params.keys()
        // only apply styles on classes the variable is a member of
        .filter(label => params.get(label).has(pebble))
        .forEach(label => {
            if (label in strokeWidths) context.nodes[pebble].strokeWidth = strokeWidths[label];
            if (label in nodeColors) context.nodes[pebble].nodeCol = nodeColors[label];
            if (label in strokeColors) context.nodes[pebble].strokeColor = strokeColors[label];
        }));
};

export let forceDiagramLabels = problem => pebble => [
    {
        id: 'Group',
        name: 'Group',
        attrs: {fill: app.colors.predictor},
        onclick: (e, pebble) => {
            forceDiagramState.setSelectedPebble(pebble);
            toggleGroup(problem, 'Loose', pebble);
        },
        children: [
            ...problem.groups.map(group => ({
                id: String(group.id).replace(/\W/g, '_'),
                name: group.name,
                attrs: {fill: group.color},
                onclick: (_, d) => {
                    toggleGroup(problem, group.nodes.includes(d) ? 'Loose' : group.id, d);
                    forceDiagramState.setSelectedPebble(d);
                    app.resetPeek();
                }
            })),
            {
                id: 'Ordering',
                name: 'Order',
                attrs: {fill: app.colors.order},
                onclick: (_, d) => {
                    toggleGroup(problem, 'Ordering', d);
                    forceDiagramState.setSelectedPebble(d);
                }
            },
            problem.task === "forecasting" && {
                id: 'Cross',
                name: 'Cross',
                attrs: {fill: app.colors.crossSection},
                onclick: (_, d) => {
                    toggleGroup(problem, 'crossSection', d);
                    forceDiagramState.setSelectedPebble(d);
                }
            },
            {
                id: 'Location',
                name: 'Loc',
                attrs: {fill: app.colors.location},
                onclick: (_, d) => {
                    toggleGroup(problem, 'Location', d);
                    forceDiagramState.setSelectedPebble(d);
                }
            },
        ].filter(_ => _)
    },
    {
        id: 'Label',
        name: 'Label',
        attrs: {fill: app.colors.nominal},
        onclick: (e, pebble) => {
            forceDiagramState.setSelectedPebble(pebble);
            app.alertLog("Labels are descriptors for individual variables.");
            m.redraw();
        },
        children: [
            // if cross-sectional, then it must be nominal
            !problem.tags.crossSection.includes(pebble) && {
                id: 'Nominal',
                name: 'Nominal',
                attrs: {fill: app.colors.nominal},
                onclick: (_, d) => {
                    toggleTag(problem, 'nominal', d);
                    forceDiagramState.setSelectedPebble(d);
                }
            },
            {
                id: 'Ordinal',
                name: 'Ord',
                attrs: {fill: app.colors.ordinal},
                onclick: (_, d) => {
                    toggleTag(problem, 'ordinal', d);
                    forceDiagramState.setSelectedPebble(d);
                }
            },
            problem.modelingMode !== "causal" && {
                id: 'Weight',
                name: 'Weight',
                attrs: {fill: app.colors.weight},
                onclick: (_, d) => {
                    toggleTag(problem, 'weights', d);
                    forceDiagramState.setSelectedPebble(d);
                }
            },
            problem.modelingMode !== "causal" && problem.task === "forecasting" && {
                id: 'Exogenous',
                name: 'Exog',
                attrs: {fill: app.colors.exogenous},
                onclick: (_, d) => {
                    toggleTag(problem, 'exogenous', d);
                    forceDiagramState.setSelectedPebble(d);
                }
            },
            problem.modelingMode === "causal" && {
                id: 'Randomize',
                name: 'Rand',
                attrs: {fill: app.colors.randomize},
                onclick: (_, d) => {
                    toggleTag(problem, 'randomize', d);
                    forceDiagramState.setSelectedPebble(d);
                }
            },
            problem.modelingMode === "causal" && {
                id: 'Featurize',
                name: 'Feat',
                attrs: {fill: app.colors.featurize},
                onclick: (_, d) => {
                    toggleTag(problem, 'featurize', d);
                    forceDiagramState.setSelectedPebble(d);
                }
            }
        ].filter(_ => _)
    }
].filter(_ => _);

export let toggleGroup = (problem, tag, name) => {
    if (problem.system === 'solved') {
        app.alertError(m('div', 'This problem already has solutions. Would you like to edit a copy of this problem instead?', m(Button, {
            style: 'margin:1em',
            onclick: () => {
                let problemCopy = getProblemCopy(problem);
                app.workspace.raven_config.problems[problemCopy.problemId] = problemCopy;
                app.setShowModalAlerts(false);
                setSelectedProblem(problemCopy.problemId);
                toggleGroup(problemCopy, tag, name);
            }
        }, 'Edit Copy')));
        m.redraw();
        return;
    }

    delete problem.unedited;

    // behavioral logging
    let logParams = {
        feature_id: `TOGGLE_INCLUSION_IN_${String(tag).toUpperCase()}`,
        activity_l1: 'PROBLEM_DEFINITION',
        activity_l2: 'PROBLEM_SPECIFICATION',
        other: {variable: name, problem: problem.problemId}
    }

    if (tag === 'None') {
        // variable is completely removed from diagram
        problem.groups.forEach(group => remove(group.nodes, name))
        remove(problem.tags.loose, name);
        remove(problem.tags.ordering, name);
        remove(problem.tags.crossSection, name);
        logParams.feature_id = 'MODEL_REMOVE_VARIABLE';
    } else if (tag === "Ordering") {
        // if we are going to include in the ordering group
        if (!(problem.tags.ordering).includes(name)) {
            problem.groups.forEach(group => remove(group.nodes, name))
            remove(problem.tags.location, name);
            remove(problem.tags.boundary, name);
            remove(problem.tags.loose, name);
            remove(problem.tags.crossSection, name);
            add(problem.tags.ordering, name);
            if (problem.task !== 'forecasting')
                setTask('forecasting', problem)
        } else {
            remove(problem.tags.ordering, name);
            add(problem.tags.loose, name);
        }
        loadProblemPreprocess(problem)
            .then(app.setPreprocess)
            .then(m.redraw)
    } else if (tag === "Loose") {
        // if we are going to include in the loose group
        if (!problem.tags.loose.includes(name)) {
            remove(problem.tags.ordering, name);
            remove(problem.tags.crossSection, name);
            problem.groups.forEach(group => remove(group.nodes, name))
        }
        toggle(problem.tags.loose, name);
    } else if (tag === "Location") {
        // if we are going to include in the location group
        if (!(problem.tags.location).includes(name)) {
            remove(problem.tags.ordering, name);
            remove(problem.tags.boundary, name);
            add(problem.tags.location, name);
        } else {
            remove(problem.tags.location, name);
        }
    } else if (tag === "Cross-Sectional" || tag === 'crossSection') {
        // if we are going to add to the cross sectional group
        if (!problem.tags.crossSection.includes(name)) {
            remove(problem.tags.weights, name);
            problem.groups.forEach(group => remove(group.nodes, name))
            remove(problem.tags.ordering, name);
            if (problem.task !== 'forecasting')
                setTask('forecasting', problem)
        }
        toggle(problem.tags.crossSection, name);
    } else {
        logParams.feature_id = `TOGGLE_INCLUSION_IN_${(problem.groups.find(group => group.id === tag)?.name ?? '?').toUpperCase()}`;
        // toggle inclusion in user-defined group, remove from all other groups
        problem.groups.forEach(group => (group.id === tag ? toggle : remove)(group.nodes, name))

        if (problem.groups.some(group => group.nodes.includes(name))) {
            // if in a user-defined group, remove from the special groups
            remove(problem.tags.loose, name);
            remove(problem.tags.ordering, name);
            remove(problem.tags.crossSection, name);
        } else {
            // if no longer in a user-defined group, add to loose
            add(problem.tags.loose, name)
        }
    }
    if ((problem.tags.ordering.length + problem.tags.crossSection.length === 0) && problem.task === 'forecasting')
        setTask('regression', problem)

    app.saveSystemLogEntry(logParams);
}

/**
 * Toggle if a pebble name is present in a problem's tag set
 * @param problem
 * @param tag
 * @param name
 */
export let toggleTag = (problem, tag, name) => {
    if (problem.system === 'solved') {
        app.alertError(m('div', 'This problem already has solutions. Would you like to edit a copy of this problem instead?', m(Button, {
            style: 'margin:1em',
            onclick: () => {
                let problemCopy = getProblemCopy(problem);
                app.workspace.raven_config.problems[problemCopy.problemId] = problemCopy;
                app.setShowModalAlerts(false);
                setSelectedProblem(problemCopy.problemId);
                toggleTag(problemCopy, tag, name);
            }
        }, 'Edit Copy')));
        m.redraw();
        return;
    }

    delete problem.unedited;

    // behavioral logging
    let logParams = {
        feature_id: 'blank',
        activity_l1: 'PROBLEM_DEFINITION',
        activity_l2: 'PROBLEM_SPECIFICATION',
        other: {variable: name, problem: problem.problemId}
    }


    // LABELS
    if (tag === 'nominal') {
        // if we are going to add the tag
        if (!getNominalVariables(problem).includes(name)) {
            if (app.variableSummaries[name].numchar === 'character') {
                app.alertLog(`Cannot interpret "${name}" as non-nominal, because the column is character-based. Use a manipulation to parse the strings.`);
                return;
            }
            add(problem.tags.nominal, name);
            remove(problem.tags.ordinal, name);
            remove(problem.tags.boundary, name);
            remove(problem.tags.location, name);
            remove(problem.tags.weights, name);
        }
        // we are going to remove
        else {
            // if the tag is at the dataset level
            if (app.variableSummaries[name].nature === 'nominal') {
                if (confirm("Do you want to remove the dataset-level nominal annotation?")) {
                    app.setVariableSummaryAttr(name, 'nature', 'nominal')
                }
            } else {
                remove(problem.tags.crossSection, name);

                remove(problem.tags.nominal, name);
            }
        }
        loadProblemPreprocess(problem)
            .then(app.setPreprocess)
            .then(m.redraw)
    }

    else if (tag === "ordinal") {
        remove(problem.tags.nominal, name);
        if (getNominalVariables(problem).includes(name)) {
            if (confirm("Ordinal variables must be orderable. Would you like to define an ordering?")) {
                let pipeline = [...app.workspace.raven_config.hardManipulations, problem.manipulations];
                let step = {
                    type: 'transform',
                    id: 'transform ' + pipeline.length,
                    transforms: [],
                    expansions: [],
                    binnings: [],
                    manual: []
                }
                problem.manipulations.push(step);
                pipeline.push(step);

                manipulate.setConstraintMenu({type: 'transform', pipeline, step})
                    .then(() => manipulate.setConstraintPreferences({
                        menus: {
                            "Binning": {},
                            "Equation": {},
                            "Expansion": {},
                            "Manual": {
                                "indicatorKeys": [],
                                "userValues": [],
                                "variableName": name,
                                "variableNameError": false,
                                "variableType": "Numeric",
                                "variableDefault": -1
                            }
                        },
                        "type": "Manual"
                    }))
                    // HACK: wait for .select to be applied to the preferences object
                    .then(m.redraw)
                    .then(() => new Promise(resolve => setTimeout(() => resolve(), 1000)))
                    .then(() => manipulate.constraintPreferences.select(name))
            }
        } else {
            remove(problem.tags.boundary, name);
            remove(problem.tags.location, name);

            toggle(problem.tags.ordinal, name)
        }
    }

    else if (tag === 'boundary') {
        if (!problem.tags.boundary.includes(name)) {
            remove(problem.tags.location, name);
            remove(problem.tags.ordering, name);
            remove(problem.tags.weights, name);
            remove(problem.tags.indexes, name);
            add(problem.tags.nominal, name);
        }
        toggle(problem.tags.boundary, name);
    }

    else if (tag === 'weights') {
        if (app.variableSummaries[name].numchar === 'character') {
            app.alertLog(`Cannot label column "${name}" to weight, because the column is character-based.`);
            return;
        }
        if (!problem.tags.weights.includes(name)) {
            if (getNominalVariables(problem).includes(name)) toggleTag(problem, 'nominal', name);
            remove(problem.tags.crossSection, name);
            remove(problem.tags.boundary, name);
            remove(problem.tags.indexes, name);
        }
        if (problem.tags.weights.includes(name))
            problem.tags.weights = [];
        else
            problem.tags.weights = [name];
    }

    else if (tag === 'privileged') {
        if (!problem.tags.privileged.includes(name)) {
            remove(problem.tags.indexes, name);
        }
        toggle(problem.tags.privileged, name);
    }
    else if (tag === 'exogenous') {
        if (!problem.tags.exogenous.includes(name)) {
            remove(problem.tags.indexes, name);
        }
        toggle(problem.tags.exogenous, name);
    }

    else if (tag === 'indexes') {
        if (!problem.tags.indexes.includes(name)) {
            remove(problem.tags.boundary, name);
            remove(problem.tags.location, name);
            remove(problem.tags.weights, name);
            remove(problem.tags.ordering, name);
        }
        if (problem.tags.indexes.includes(name))
            problem.tags.indexes = [];
        else
            problem.tags.indexes = [name];
    }
    else if (tag === 'featurize') {
        if (!problem.tags.featurize.includes(name)) {
            remove(problem.tags.indexes, name);
        }
        toggle(problem.tags.featurize, name);
    }
    else if (tag === 'randomize') {
        if (!problem.tags.randomize.includes(name)) {
            remove(problem.tags.indexes, name);
        }
        toggle(problem.tags.randomize, name);
    }
    app.resetPeek()
    app.saveSystemLogEntry(logParams);
};

// Used for left panel variable search
export let variableSearchText = "";
export let setVariableSearchText = text => variableSearchText = (text ?? '').toLowerCase();


// creates a new problem from the force diagram problem space and adds to disco
export async function addProblemFromForceDiagram() {
    let problemCopy = getProblemCopy(getSelectedProblem());
    app.workspace.raven_config.problems[problemCopy.problemId] = problemCopy;

    setSelectedProblem(problemCopy.problemId);
    app.setLeftTab('Problems');
    m.redraw();
}

export function connectAllForceDiagram() {
    let problem = getSelectedProblem();

    let targets = getTargetVariables(problem);
    problem.pebbleLinks = getPredictorVariables(problem)
        .flatMap(source => targets.map(target => ({source, target, right: true})))
    m.redraw();
}

let D3M_problemDoc = problem => ({
    data: {
        "problemId": problem.problemId,
        "problemName": "NULL",
        "taskType": problem.taskType,
        "taskSubType": problem.taskSubType,
        "problemVersion": "2.0",
        "problemSchemaVersion": "3.2.0"
    },
    inputs: {
        data: {
            "datasetID": app.workspace.datasetDoc.about.datasetID,
            "targets": getTargetVariables(problem).map((target, i) => ({
                targetIndex: i,
                resID: problem.resourceId,
                colIndex: Object.keys(app.variableSummaries).indexOf(target),
                colName: target
            }))
        },
        dataSplits: Object.entries({
            method: problem.scoreOptions.evaluationMethod,
            testSize: problem.scoreOptions.trainTestRatio,
            stratified: problem.scoreOptions.stratified,
            shuffle: problem.scoreOptions.shuffle,
            randomSeed: problem.scoreOptions.randomSeed,
            splitsFile: problem.scoreOptions.splitsFile
        })
            // remove keys with undefined values
            .filter(entry => entry[1] !== undefined)
            .reduce((out, entry) => Object.assign(out, {[entry[0]]: entry[1]}), {}),
        performanceMetrics: [problem.metric, ...problem.metrics].map(metric => ({metric})),
    },
    expectedOutputs: {
        predictionsFile: 'predictions.csv'
    }
});


export async function submitDiscProb() {
    let problems = app.workspace.raven_config.problems;
    app.taskPreferences.isSubmittingProblems = true;
    m.redraw();


    /* -------------------------------------
     * Iterate through problems, writing them
     *  to an output directory and building
     *  rows for a .csv file
     */

    //let outputCSV =
    let outputCSV = ['problem_id,system,meaningful'];

    Object.keys(problems).reduce((out, problemId) => {
        let problem = problems[problemId];

        if (problem.manipulations.length === 0) {
            // construct and write out the api call and problem description for each discovered problem
            let problemApiCall = solverD3M.GRPC_SearchSolutionsRequest(
                problem,
                app.workspace.datasetDoc,
                app.workspace.d3m_config.dataset_schema);

            let problemProblemSchema = D3M_problemDoc(problem);
            let filename_api = problem.problemId + '/ss_api.json';
            let filename_ps = problem.problemId + '/problem_schema.json';
            m.request(D3M_SVC_URL + '/store-user-problem', {
                method: 'POST',
                body: {filename: filename_api, data: problemApiCall}
            });
            m.request(D3M_SVC_URL + '/store-user-problem', {
                method: 'POST',
                body: {filename: filename_ps, data: problemProblemSchema}
            });

            let meaningful = problem.meaningful ? 'yes' : 'no';
            let lineForCSV = `${problem.problemId},${problem.system},${meaningful}`;
            outputCSV.push(lineForCSV);
        } else {
            console.log('omitting:');
            console.log(problem);
        }
    });

    // write the CSV file requested by NIST that describes properties of the solutions
    console.log(outputCSV);
    let res3 = await m.request(D3M_SVC_URL + '/store-user-problem', {
        method: 'POST',
        body: {filename: 'labels.csv', data: outputCSV.join('\n')}
    });

    // Remove the button Submit Discovered problem button
    //
    app.taskPreferences.task1_finished = true;
    m.redraw();

    //setModal("Data preview error: " + msg_data.user_message,
    //       "Data materialization Failed", true, "Close", true);

    setModal("Your discovered problems have been submitted.",
        "Task 1 Complete",
        true,
        "Close",
        true);
}


let alertEditCopy = () => {
    app.alertError(m('div', 'This problem already has solutions. Would you like to edit a copy of this problem instead?', m(Button, {
        style: 'margin:1em',
        onclick: () => {
            let selectedProblem = getSelectedProblem();
            let problemCopy = getProblemCopy(selectedProblem);
            app.workspace.raven_config.problems[problemCopy.problemId] = problemCopy;
            app.setShowModalAlerts(false);
            setSelectedProblem(problemCopy.problemId);
        }
    }, 'Edit Copy')))
    m.redraw();
}
