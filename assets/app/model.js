import * as d3 from "d3";
import m from "mithril";
import hopscotch from 'hopscotch';

import * as app from "./app";
import * as manipulate from "./manipulations/manipulate";
import * as explore from "./explore";
import * as solverD3M from "./solvers/d3m";

import * as common from "../common/common";
import Button from "../common/views/Button";
import Icon from "../common/views/Icon";
import Subpanel from "../common/views/Subpanel";
import TextField from "../common/views/TextField";
import PanelList from "../common/views/PanelList";
import Table from "../common/views/Table";
import TextFieldSuggestion from "../common/views/TextFieldSuggestion";
import ListTags from "../common/views/ListTags";
import Panel from "../common/views/Panel";
import MenuTabbed from "../common/views/MenuTabbed";
import Dropdown from "../common/views/Dropdown";
import ButtonRadio from "../common/views/ButtonRadio";
import MenuHeaders from "../common/views/MenuHeaders";

import ForceDiagram, {groupBuilder, groupLinkBuilder, linkBuilder, pebbleBuilderLabeled} from "./views/ForceDiagram";
import VariableSummary, {formatVariableSummary} from "./views/VariableSummary";
import ButtonLadda from "./views/LaddaButton";
import PreprocessInfo from "./views/PreprocessInfo";
import Flowchart from "./views/Flowchart";

import Datamart from "./datamart/Datamart";

import {bold} from "./index";
import {locationReload, setModal} from "../common/views/Modal";


export class CanvasModel {
    // onbeforeremove(vnode) {
    //     vnode.dom.classList.add("exit-left");
    //     return new Promise(function(resolve) {
    //         vnode.dom.addEventListener("animationend", resolve)
    //     })
    // }

    view(vnode) {
        let {drawForceDiagram, forceData} = vnode.attrs;
        let selectedProblem = app.getSelectedProblem();

        return [
            drawForceDiagram && m(ForceDiagram, Object.assign(forceDiagramState,{
                nodes: forceDiagramNodesReadOnly,
                // these attributes may change dynamically, (the problem could change)
                onDragOut: pebble => {
                    delete selectedProblem.unedited;

                    let pebbles = forceData.summaries[pebble].plottype === 'collapsed'
                        ? forceData.summaries[pebble].childNodes : [pebble];

                    pebbles.forEach(pebble => {
                        app.remove(selectedProblem.tags.loose, pebble);
                        app.remove(selectedProblem.predictors, pebble);
                        app.remove(selectedProblem.targets, pebble);
                    });
                    selectedProblem.pebbleLinks = (selectedProblem.pebbleLinks || [])
                        .filter(link => link.target !== pebble && link.source !== pebble);
                    app.resetPeek();
                    m.redraw();
                },
                onDragOver: (pebble, groupId) => {
                    delete selectedProblem.unedited;

                    let pebbles = forceData.summaries[pebble.name].plottype === 'collapsed'
                        ? forceData.summaries[pebble.name].childNodes : [pebble.name];

                    pebbles.forEach(pebble => {
                        if (groupId === 'Predictors' && !selectedProblem.predictors.includes(pebble)) {
                            selectedProblem.predictors.push(pebble);
                            app.remove(selectedProblem.targets, pebble);
                            app.remove(selectedProblem.tags.loose, pebble);
                        }
                        if (groupId === 'Targets' && !selectedProblem.targets.includes(pebble)) {
                            selectedProblem.targets.push(pebble);
                            app.remove(selectedProblem.predictors, pebble);
                            app.remove(selectedProblem.tags.loose, pebble);
                        }
                    });
                    app.resetPeek();
                    m.redraw();
                },
                onDragAway: (pebble, groupId) => {
                    delete selectedProblem.unedited;
                    let pebbles = forceData.summaries[pebble.name].plottype === 'collapsed'
                        ? forceData.summaries[pebble.name].childNodes : [pebble.name];

                    pebbles.forEach(pebble => {
                        if (groupId === 'Predictors')
                            app.remove(selectedProblem.predictors, pebble);
                        if (groupId === 'Targets')
                            app.remove(selectedProblem.targets, pebble);
                        if (!selectedProblem.tags.loose.includes(pebble))
                            selectedProblem.tags.loose.push(pebble);
                    });
                    app.resetPeek();
                    m.redraw();
                },

                labels: forceDiagramLabels(selectedProblem),
                mutateNodes: mutateNodes(selectedProblem),
                pebbleLinks: selectedProblem.pebbleLinks,
                onclickLink: d => {
                    let originalLink = selectedProblem.pebbleLinks.find(link =>  d.source === link.source && d.target === link.target);
                    if (!originalLink) return;
                    app.remove(selectedProblem.pebbleLinks, originalLink);
                    app.resetPeek();
                }
            }, forceData)),


            app.is_model_mode && !app.swandive && m("#spacetools.spaceTool", {
                    style: {right: app.panelWidth.right,'z-index': 16}
                },
                m(Button, {
                    id: 'btnAdd', style: {margin: '0px .5em'},
                    onclick: addProblemFromForceDiagram,
                    title: 'add model to problems'
                }, m(Icon, {name: 'plus'})),
                m(Button, {
                    id: 'btnJoin', style: {margin: '0px .5em'},
                    onclick: connectAllForceDiagram,
                    title: 'make all possible connections between nodes'
                }, m(Icon, {name: 'link'})),
                m(Button, {
                    id: 'btnDisconnect', style: {margin: '0px .5em'},
                    onclick: () => selectedProblem.pebbleLinks = [],
                    title: 'delete all connections between nodes'
                }, m(Icon, {name: 'circle-slash'})),
                m(Button, {
                    id: 'btnForce', style: {margin: '0px .5em'},
                    onclick: () => forceDiagramState.isPinned = !forceDiagramState.isPinned,
                    title: 'pin the variable pebbles to the page'
                }, m(Icon, {name: 'pin'})),
                m(Button, {
                    id: 'btnEraser', style: {margin: '0px .5em'},
                    onclick: app.erase,
                    title: 'wipe all variables from the modeling space'
                }, m(Icon, {name: 'trashcan'}))),


            app.is_model_mode && selectedProblem && m(Subpanel, {
                    id: 'legend', header: 'Legend', class: 'legend',
                    style: {
                        right: app.panelWidth['right'],
                        bottom: `calc(2*${common.panelMargin} + ${app.peekInlineShown ? app.peekInlineHeight + ' + 23px' : '0px'})`,
                        position: 'absolute',
                        width: '150px'
                    }
                }, [
                    {id: "timeButton", vars: selectedProblem.tags.time, name: 'Time', borderColor: common.timeColor, innerColor: 'white', width: 1},
                    {id: "csButton", vars: selectedProblem.tags.crossSection, name: 'Cross Sec', borderColor: common.csColor, innerColor: 'white', width:  1},
                    {id: "dvButton", vars: selectedProblem.targets, name: 'Dep Var', borderColor: common.dvColor, innerColor: 'white', width: 1},
                    {id: "nomButton", vars: selectedProblem.tags.nominal, name: 'Nominal', borderColor: common.nomColor, innerColor: 'white', width: 1},
                    {id: "weightButton", vars: selectedProblem.tags.weights, name: 'Weight', borderColor: common.weightColor, innerColor: 'white', width: 1},
                    {id: "predButton", vars: selectedProblem.predictors, name: 'Predictors', borderColor: common.gr1Color, innerColor: common.gr1Color, width: 0},
                    // {id: "priorsButton", vars: selectedProblem.predictors, name: 'Priors', borderColor: common.warnColor, innerColor: common.warnColor, width: 0},
                ].filter(group => group.vars.length > 0).map(group =>
                    m(`#${group.id}[style=width:100% !important]`,
                        m(".rectColor[style=display:inline-block]", m("svg[style=width: 20px; height: 20px]",
                            m(`circle[cx=10][cy=10][fill=${group.innerColor}][fill-opacity=0.6][r=9][stroke=${group.borderColor}][stroke-opacity=${group.width}][stroke-width=2]`))),
                        m(".rectLabel[style=display:inline-block;vertical-align:text-bottom;margin-left:.5em]", group.name)))
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
                .concat([`${manipulate.totalSubsetRecords} Records`]))
        ]
    }
}

export let preprocessTabName = 'Preprocess Log';

export let leftPanelWidths = {
    [preprocessTabName]: '500px',
    'Variables': '300px',
    'Discover': 'auto',
    'Augment': '600px',
    'Summary': '300px'
};

export let rightPanelWidths = {
    Problem: '300px',
    Manipulate: '485px'
};

export let leftpanel = forceData => {

    let ravenConfig = app.workspace.raven_config;
    let selectedProblem = app.getSelectedProblem();

    if (!ravenConfig) return;

    let sections = [];

    // VARIABLES TAB
    if (selectedProblem) {
        // base dataset variables, then transformed variables from the problem
        let leftpanelVariables = Object.keys(app.variableSummaries);

        // if no search string, match nothing
        let matchedVariables = variableSearchText.length === 0 ? []
            : leftpanelVariables.filter(variable => variable.toLowerCase().includes(variableSearchText)
                || (app.variableSummaries.label || "").toLowerCase().includes(variableSearchText));

        // reorder leftpanel variables
        leftpanelVariables = [
            ...matchedVariables,
            ...leftpanelVariables.filter(variable => !matchedVariables.includes(variable))
        ];

        let nominalVariables = app.getNominalVariables();

        sections.push({
            value: 'Variables',
            title: 'Click variable name to add or remove the variable pebble from the modeling space.',
            contents: app.is_model_mode && app.rightTab === 'Manipulate' && manipulate.constraintMenu
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
                        colors: {
                            [app.hexToRgba(common.selVarColor)]: app.is_explore_mode ? selectedProblem.loose : explore.exploreVariables,
                            [app.hexToRgba(common.gr1Color, .25)]: selectedProblem.predictors,
                            [app.hexToRgba(common.selVarColor, .5)]: selectedProblem.tags.loose,
                            [app.hexToRgba(common.taggedColor)]: app.is_explore_mode ? [] : selectedProblem.targets
                        },
                        classes: {
                            'item-dependent': app.is_explore_mode ? [] : selectedProblem.targets,
                            'item-nominal': nominalVariables,
                            'item-bordered': matchedVariables,
                            'item-cross-section': selectedProblem.tags.crossSection,
                            'item-time': selectedProblem.tags.time,
                            'item-weight': selectedProblem.tags.weights
                        },
                        callback: x => {
                            let selectedProblem = app.getSelectedProblem();
                            delete selectedProblem.unedited;

                            if (selectedProblem.predictors.includes(x))
                                app.remove(selectedProblem.predictors, x);
                            else if (selectedProblem.targets.includes(x))
                                app.remove(selectedProblem.targets, x);
                            else if (selectedProblem.tags.loose.includes(x))
                                app.remove(selectedProblem.tags.loose, x);
                            else selectedProblem.tags.loose.push(x);

                            app.resetPeek();
                        },
                        popup: x => m('div', m('h4', 'Summary Statistics for ' + x), m(Table, {attrsAll: {class: 'table-sm'}, data: formatVariableSummary(app.variableSummaries[x])})),
                        popupOptions: {placement: 'right', modifiers: {preventOverflow: {escapeWithReference: true}}},
                    }),
                    !IS_D3M_DOMAIN && m(Button, {
                        id: 'btnCreateVariable',
                        style: {width: '100%', 'margin-top': '10px'},
                        onclick: async () => {

                            let problemPipeline = app.getSelectedProblem().manipulations;
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
                            app.setLeftTab('Variables');
                        }
                    }, 'Create New Variable'),
                ]
        })
    }

    // DISCOVERY TAB
    let problems = ravenConfig.problems;

    let allMeaningful = Object.keys(problems).every(probID => problems[probID].meaningful);
    let discoveryAllCheck = m('input#discoveryAllCheck[type=checkbox]', {
        onclick: m.withAttr("checked", app.setCheckedDiscoveryProblem),
        checked: allMeaningful,
        title: `mark ${allMeaningful ? 'no' : 'all'} problems as meaningful`
    });

    let discoveryHeaders = [
        'Name',
        m('[style=text-align:center]', 'Meaningful', m('br'), discoveryAllCheck),
        'Target', 'Predictors',
        Object.values(problems).some(prob => prob.subTask !== 'taskSubtypeUndefined') ? 'Subtask' : '',
        'Task',
        'Metric'
    ];

    let problemPartition = Object.keys(problems)
        .filter(problemId => !problems[problemId].pending)
        .reduce((out, problemId) => {
            out[problems[problemId].system] = out[problems[problemId].system] || [];
            out[problems[problemId].system].push(problems[problemId]);
            return out;
        }, {});

    let formatProblem = problem => [
        problem.problemID, // this is masked as the UID
        m('[style=text-align:center]', m('input[type=checkbox]', {
            onclick: m.withAttr("checked", state => app.setCheckedDiscoveryProblem(state, problem.problemID)),
            checked: problem.meaningful
        })),
        problem.targets.join(', '),
        app.getPredictorVariables(problem).join(', '),
        problem.subTask === 'taskSubtypeUndefined' ? '' : app.getSubtask(problem),
        problem.task,
        problem.metric
    ];
    sections.push({
        value: 'Discover',
        attrsInterface: {class: (!isDiscoveryClicked && !app.task1_finished) ? 'btn-success' : 'btn-secondary'}, // passed into button
        contents: [
            m('div#discoveryTablesContainer', {
                    style: {
                        height: '80%',
                        overflow: 'auto',
                        display: 'block',
                        'margin-bottom': 0,
                        'max-width': (window.innerWidth - 90) + 'px'
                    }
                },
                selectedProblem && [
                    m('h4.card-header.clearfix',
                        m('div[style=height:50px;display:inline]', 'Current Problem'),
                        m(Button, {
                            id: 'btnSaveProblem',
                            style: {float: 'right', margin: '-5px', 'margin-right': '22px'},
                            class: 'btn-sm',
                            onclick: () => {
                                let problemCopy = app.getProblemCopy(selectedProblem);
                                selectedProblem.pending = false;

                                ravenConfig.problems[problemCopy.problemID] = problemCopy;
                                app.setSelectedProblem(problemCopy.problemID);
                            }
                        }, 'Save')),
                    m(Table, {
                        id: 'discoveryTableSelectedProblem',
                        headers: discoveryHeaders,
                        data: [formatProblem(selectedProblem)],
                        activeRow: ravenConfig.selectedProblem,
                        // showUID: false,
                        abbreviation: 40
                    })
                ],

                // Object.keys(problemPartition)
                ['solved', 'user', 'auto'].filter(key => key in problemPartition).map(partition => [
                    m('h4.card-header', `${{
                        'user': 'Custom',
                        'auto': 'Discovered',
                        'solved': 'Solved'
                    }[partition]} Problems`),
                    m(Table, {
                        id: 'discoveryTable' + partition,
                        headers: discoveryHeaders,
                        data: problemPartition[partition].map(formatProblem),
                        rowClasses: {
                            'discovery-table-highlight': selectedProblem.provenanceID
                                ? [selectedProblem.provenanceID] : []
                        },
                        onclick: problemID => {

                            let clickedProblem = problems[problemID];
                            if (clickedProblem.system === 'solved') {
                                app.setResultsProblem(problemID);
                                app.set_mode('results');
                                return;
                            }
                            if (selectedProblem.problemID === problemID) return;

                            if (clickedProblem.system === 'user') {
                                app.setSelectedProblem(problemID);
                                return;
                            }

                            // delete current problem if no changes were made
                            if (selectedProblem.pending) {
                                if (selectedProblem.unedited)
                                    delete problems[selectedProblem.problemID];
                                else if (confirm('You have unsaved changes in the previous problem, "' + selectedProblem.problemID + '". Would you like to save it before progressing?'))
                                    selectedProblem.pending = false;
                                else delete problems[selectedProblem.problemID];
                            }

                            // create a copy of the autogenerated problem
                            if (clickedProblem.system === 'auto') {
                                let copiedProblem = app.getProblemCopy(clickedProblem);
                                problems[copiedProblem.problemID] = copiedProblem;
                                app.setSelectedProblem(copiedProblem.problemID);
                            }
                        },
                        activeRow: selectedProblem.problemID,
                        abbreviation: 40,
                        sortable: true
                    })
                ])
            ),


            selectedProblem && [
                m(TextField, {
                    id: 'discoveryInput',
                    textarea: true,
                    style: {width: '100%', height: 'calc(20% - 60px)', overflow: 'auto'},
                    value: selectedProblem.description || app.getDescription(selectedProblem), // description is autogenerated if not edited
                    oninput: value => selectedProblem.description = value,
                    onblur: value => selectedProblem.description = value
                }),
                // m('div', {style: {display: 'inline-block', margin: '.75em'}},
                //     m('input[type=checkbox]', {
                //         onclick: m.withAttr("checked", checked => app.setCheckedDiscoveryProblem(checked, selectedProblem.problemID)),
                //         checked: selectedProblem.meaningful
                //     }), m('label[style=margin-left:1em]', `Mark ${selectedProblem.problemID} as meaningful`))
                selectedProblem.manipulations.length !== 0 && m(
                    'div', m(Button, {
                        style: {float: 'left'},
                        disabled: app.rightTab === 'Manipulate' && common.panelOpen['right'],
                        title: `view manipulations for ${selectedProblem.problemID}`,
                        onclick: () => {
                            app.setRightTab('Manipulate');
                            common.setPanelOpen('right');
                        }
                    }, 'View Manipulations')
                ),
                !selectedProblem.pending && m(Button, {
                    id: 'btnDelete',
                    style: 'float:left',
                    onclick: () => {
                        selectedProblem.pending = true;
                        selectedProblem.unedited = true;
                    },
                }, 'Delete Problem')
            ],
            !app.is_explore_mode && m(ButtonLadda, {
                id: 'btnSubmitDisc',
                class: app.buttonClasses.btnSubmitDisc,
                activeLadda: app.buttonLadda.btnSubmitDisc,
                style: {float: 'right'},
                onclick: submitDiscProb,
                title: 'Submit all checked discovered problems'
            }, 'Submit Disc. Probs.')
        ]
    });

    let summaryPebble = forceDiagramState.hoverPebble || forceDiagramState.selectedPebble;
    let summaryContent;

    if (summaryPebble && forceData.pebbles.includes(summaryPebble)) {
        // if hovered over a collapsed pebble, then expand summaryPebble into all children pebbles
        let summaryPebbles = forceData.summaries[summaryPebble].plottype === 'collapsed'
            ? [...forceData.summaries[summaryPebble].childNodes]
            : [summaryPebble];

        summaryContent = summaryPebbles.sort(app.omniSort)
            .map(variableName => m(Subpanel, {
                    id: 'subpanel' + variableName,
                    header: variableName,
                    attrsBody: {style: {padding: '0.5em'}},
                    defaultShown: false,
                    shown: summaryPebbles.length === 1 || undefined
                }, m(TextFieldSuggestion, {
                    id: 'groupSuggestionBox',
                    suggestions: [
                        !selectedProblem.tags.loose.includes(variableName) && 'Loose',
                        !selectedProblem.targets.includes(variableName) && 'Targets',
                        !selectedProblem.predictors.includes(variableName) && 'Predictors'
                    ].filter(_=>_),
                    enforce: true,
                    attrsAll: {placeholder: 'add to group'},
                    oninput: value => setGroup(value, variableName),
                    onblur: value => setGroup(value, variableName),
                }),
                m('div', {style: {width: '100%'}}, bold('Member of: '), m(ListTags, {
                    tags: [
                        // selectedProblem.tags.loose.includes(variableName) && 'Loose',
                        selectedProblem.targets.includes(variableName) && 'Targets',
                        selectedProblem.predictors.includes(variableName) && 'Predictors'
                    ].filter(_=>_),
                    ondelete: tag => {
                        delete selectedProblem.unedited;
                        app.remove({
                            'Loose': selectedProblem.tags.loose,
                            'Targets': selectedProblem.targets,
                            'Predictors': selectedProblem.predictors
                        }[tag], variableName);
                        app.resetPeek()
                    }
                })),
                m(VariableSummary, {variable: app.variableSummaries[variableName]})));
    }

    return m(Panel, {
        side: 'left',
        label: 'Data Selection',
        hover: app.is_model_mode && !manipulate.constraintMenu,
        width: leftPanelWidths[app.leftTab],
        attrsAll: {
            onclick: () => app.setFocusedPanel('left'),
            style: {
                'z-index': 100 + (app.focusedPanel === 'left'),
                background: 'rgb(249, 249, 249, .8)',
                height: `calc(100% - ${common.heightHeader} - 2*${common.panelMargin} - ${app.peekInlineShown ? app.peekInlineHeight : '0px'} - ${common.heightFooter})`
            }
        }
    }, m(MenuTabbed, {
        id: 'leftpanelMenu',
        attrsAll: {style: {height: 'calc(100% - 50px)'}},
        currentTab: app.leftTab,
        callback: app.setLeftTab,
        sections: sections.concat([
            {
                value: preprocessTabName,
                id: 'preprocessInfoTab',
                display: 'none',
                title: 'Data Log',
                contents: m(PreprocessInfo,{})
            },
            {
                value: 'Augment',
                contents: m(Datamart, {
                    preferences: app.datamartPreferences,
                    dataPath: app.workspace.datasetUrl,
                    endpoint: app.datamartURL,
                    labelWidth: '10em'
                })
            },
            {
                value: 'Summary',
                title: 'Select a variable from within the visualization in the center panel to view its summary statistics.',
                display: 'none',
                contents: summaryContent
            }
        ])
    }));
};

export let rightpanel = () => {

    let sections = [];

    let ravenConfig = app.workspace.raven_config;
    let selectedProblem = app.getSelectedProblem();

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
            m('div#problemConfiguration', {onclick: () => isLocked && hopscotch.startTour(app.lockTour(selectedProblem)), style: 'float: left'},
                m('label', 'Task Type'),
                m(Dropdown, {
                    id: 'taskType',
                    items: app.supportedTasks,
                    activeItem: selectedProblem.task,
                    onclickChild: task => app.setTask(task, selectedProblem),
                    style: {'margin': '1em', 'margin-top': '0'},
                    disabled: isLocked
                }),
                Object.keys(app.applicableMetrics[selectedProblem.task]).length !== 1 && [
                    m('label', 'Task Subtype'),
                    m(Dropdown, {
                        id: 'taskSubType',
                        items: Object.keys(app.applicableMetrics[selectedProblem.task]),
                        activeItem: app.getSubtask(selectedProblem),
                        onclickChild: subTask => app.setSubTask(subTask, selectedProblem),
                        style: {'margin': '1em', 'margin-top': '0'},
                        disabled: isLocked
                    })
                ],
                m('label', 'Primary Performance Metric'),
                m(Dropdown, {
                    id: 'performanceMetric',
                    // TODO: filter based on https://datadrivendiscovery.org/wiki/display/work/Matrix+of+metrics
                    items: app.applicableMetrics[selectedProblem.task][app.getSubtask(selectedProblem)],
                    activeItem: selectedProblem.metric,
                    onclickChild: metric => app.setMetric(metric, selectedProblem),
                    style: {'margin': '1em', 'margin-top': '0'},
                    disabled: isLocked
                }),

                app.applicableMetrics[selectedProblem.task][selectedProblem.subTask].length - 1 > selectedProblem.metrics.length && m(Dropdown, {
                    id: 'performanceMetrics',
                    items: app.applicableMetrics[selectedProblem.task][selectedProblem.subTask]
                        .filter(metric => metric !== selectedProblem.metric && !selectedProblem.metrics.includes(metric)),
                    activeItem: 'Add Secondary Metric',
                    onclickChild: metric => {
                        selectedProblem.metrics = [...selectedProblem.metrics, metric].sort(app.omniSort);
                        delete selectedProblem.unedited;
                        // will trigger the call to solver, if a menu that needs that info is shown
                        app.setSolverPending(true);
                    },
                    style: {'margin': '1em', 'margin-top': '0'},
                    disabled: isLocked
                }),
                selectedProblem.metrics.length > 0 && m('label', 'Secondary Performance Metrics'),
                m(ListTags, {readonly: isLocked, tags: selectedProblem.metrics, ondelete: metric => app.remove(selectedProblem.metrics, metric)}),
                m(Subpanel, {
                        header: 'Search Options',
                        defaultShown: false,
                        style: {margin: '1em'}
                    },
                    m('label', 'Approximate time bound for overall pipeline search, in minutes. Leave empty for unlimited time.'),
                    m(TextField, {
                        id: 'timeBoundOption',
                        value: selectedProblem.timeBound || '',
                        disabled: isLocked,
                        oninput: !isLocked && (value => selectedProblem.timeBound = value.replace(/[^\d.-]/g, '')),
                        onblur: !isLocked && (value => selectedProblem.timeBound = Math.max(0, parseFloat(value.replace(/[^\d.-]/g, ''))) || undefined),
                        style: {'margin-bottom': '1em'}
                    }),
                    m('label', 'Approximate time bound for predicting with a single pipeline, in minutes. Leave empty for unlimited time.'),
                    m(TextField, {
                        id: 'timeBoundPipelineOption',
                        disabled: isLocked,
                        value: selectedProblem.timeBoundRun || '',
                        oninput: !isLocked && (value => selectedProblem.timeBoundRun = value.replace(/[^\d.-]/g, '')),
                        onblur: !isLocked && (value => selectedProblem.timeBoundRun = Math.max(0, parseFloat(value.replace(/[^\d.-]/g, ''))) || undefined),
                        style: {'margin-bottom': '1em'}
                    }),
                    m('label', 'Priority'),
                    m(TextField, {
                        id: 'priorityOption',
                        disabled: isLocked,
                        value: selectedProblem.priority || '',
                        oninput: !isLocked && (value => selectedProblem.priority = value.replace(/[^\d.-]/g, '')),
                        onblur: !isLocked && (value => selectedProblem.priority = parseFloat(value.replace(/[^\d.-]/g, '')) || undefined),
                        style: {'margin-bottom': '1em'}
                    }),
                    m('label', 'Limit on number of solutions'),
                    m(TextField, {
                        id: 'solutionsLimitOption',
                        disabled: isLocked,
                        value: selectedProblem.solutionsLimit || '',
                        oninput: !isLocked && (value => selectedProblem.solutionsLimit = Math.max(0, parseInt(value.replace(/\D/g,''))) || undefined),
                        style: {'margin-bottom': '1em'}
                    })
                ),
                m(Subpanel, {
                        header: 'Scoring Options',
                        defaultShown: false,
                        style: {margin: '1em'}
                    },
                    m('label', 'Evaluation Method'),
                    m(Dropdown, {
                        id: 'evaluationMethodScoringOption',
                        items: Object.keys(app.d3mEvaluationMethods),
                        activeItem: selectedProblem.evaluationMethod,
                        onclickChild: child => {
                            selectedProblem.evaluationMethod = child;
                            delete selectedProblem.unedited;
                            // will trigger the call to solver, if a menu that needs that info is shown
                            app.setSolverPending(true);
                        },
                        style: {'margin-bottom': '1em'},
                        disabled: isLocked
                    }),
                    selectedProblem.evaluationMethod === 'kFold' && [
                        m('label[style=margin-top:0.5em]', 'Number of Folds'),
                        m(TextField, {
                            id: 'foldsScoringOption',
                            disabled: isLocked,
                            value: selectedProblem.folds || '',
                            oninput: !isLocked && (value => selectedProblem.folds = parseFloat(value.replace(/\D/g,'')) || undefined),
                            style: {'margin-bottom': '1em'}
                        }),
                        m('label', 'Stratified Folds'),
                        m(ButtonRadio, {
                            id: 'shuffleScoringOption',
                            onclick: value => {
                                if (isLocked) return;
                                selectedProblem.stratified = value === 'True';
                            },
                            activeSection: selectedProblem.stratified ? 'True' : 'False',
                            sections: ['True', 'False'].map(type => ({value: type, attrsInterface: {disabled: isLocked}}))
                        }),
                    ],
                    selectedProblem.evaluationMethod === 'holdout' && [
                        m('label[style=margin-top:0.5em]', 'Train/Test Ratio'),
                        m(TextField, {
                            id: 'ratioOption',
                            disabled: isLocked,
                            value: selectedProblem.trainTestRatio || 0,
                            onblur: !isLocked && (value => selectedProblem.trainTestRatio = Math.max(0, Math.min(1, parseFloat(value.replace(/[^\d.-]/g, '')) || 0))),
                            style: {'margin-bottom': '1em'}
                        })
                    ],
                    m('label[style=margin-top:0.5em]', 'Shuffle'),
                    m(ButtonRadio, {
                        id: 'shuffleScoringOption',
                        onclick: !isLocked && (value => selectedProblem.shuffle = value === 'True'),
                        activeSection: selectedProblem.shuffle ? 'True' : 'False',
                        sections: ['True', 'False'].map(type => ({value: type, attrsInterface: {disabled: isLocked}}))
                    }),
                    selectedProblem.shuffle && [
                        m('label[style=margin-top:0.5em]', 'Shuffle random seed'),
                        m(TextField, {
                            id: 'shuffleSeedScoringOption',
                            disabled: isLocked,
                            value: selectedProblem.shuffleRandomSeed || 0,
                            oninput: !isLocked && (value => selectedProblem.shuffleRandomSeed = parseFloat(value.replace(/\D/g,'')) || undefined),
                            style: {'margin-bottom': '1em'}
                        })
                    ],
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
                            editable: true,
                            aggregate: false
                        }),
                        selectedProblem.tags.nominal.length > 0 && m(Flowchart, {
                            attrsAll: {style: {height: 'calc(100% - 87px)', overflow: 'auto'}},
                            labelWidth: '5em',
                            steps: [{
                                key: 'Nominal',
                                color: common.nomColor,
                                content: m('div', {style: {'text-align': 'left'}},
                                    m(ListTags, {
                                        tags: selectedProblem.tags.nominal,
                                        ondelete: name => app.remove(selectedProblem.tags.nominal, name)
                                    }))
                            }]
                        })
                    ]
                },
            ]
        })
    });

    return m(Panel, {
            side: 'right',
            label: 'Model Selection',
            hover: true,
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
export let colors = d3.scaleOrdinal(d3.schemeCategory20);
let isDiscoveryClicked = false;

const k_combinations = (list, k) => {
    if (k > list.length || k <= 0) return []; // no valid combinations of size k
    if (k === list.length) return [list]; // one valid combination of size k
    if (k === 1) return list.reduce((acc, cur) => [...acc, [cur]], []); // k combinations of size k

    let combinations = [];

    for (let i = 0; i <= list.length - k + 1; i++) {
        let subcombinations = k_combinations(list.slice(i + 1), k - 1);
        for (let j = 0; j < subcombinations.length; j++) {
            combinations.push([list[i], ...subcombinations[j]])
        }
    }

    return combinations
};

// used to compute interaction terms of degree lte k
const lte_k_combinations = (set, k) =>
    Array(k).fill(null).reduce((acc, _, idx) => [...acc, ...k_combinations(set, idx + 1)], []);

const intersect = sets => sets.reduce((a, b) => new Set([...a].filter(x => b.has(x))));


// layout for force diagram pebbles. Can be 'variables', 'pca', 'clustering' etc. (ideas)
export let forceDiagramMode = 'variables';
export let setForceDiagramMode = mode => forceDiagramMode = mode;

export let buildForceData = problem => {

    if (!problem) return;

    let pebbles = [...problem.predictors, ...problem.targets, ...problem.tags.loose];
    let groups = [];
    let groupLinks = [];

    if (forceDiagramMode === 'variables') {
        groups = [
            {
                name: "Predictors",
                color: common.gr1Color,
                colorBackground: app.swandive && 'grey',
                nodes: new Set(problem.predictors),
                opacity: 0.3
            },
            {
                name: "Targets",
                color: common.gr2Color,
                colorBackground: app.swandive && 'grey',
                nodes: new Set(problem.targets),
                opacity: 0.3
            },
            {
                name: "Loose",
                color: common.selVarColor,
                colorBackground: "transparent",
                nodes: new Set(problem.tags.loose),
                opacity: 0.0
            },
            // {
            //     name: "Priors",
            //     color: common.warnColor,
            //     colorBackground: "transparent",
            //     nodes: new Set(['INSTM', 'pctfedited^2', 'test', 'PCTFLOAN^3']),
            //     opacity: 0.4
            // }
        ];

        groupLinks = [
            {
                color: common.gr1Color,
                source: 'Predictors',
                target: 'Targets'
            }
        ];
    }

    // TODO: if clustering information is present in the problem, this is where alternative views would be implemented
    if (forceDiagramMode === 'clusters') {

    }

    let summaries = Object.assign({}, app.variableSummaries);

    // collapse group intersections with more than maxNodes into a single node
    let maxNodes = 20;

    let removedPebbles = new Set();
    let addedPebbles = new Set();

    let combinedGroups = common.deepCopy(groups)
        .reduce((out, group) => Object.assign(out, {[group.name]: group}), {});

    // TODO: can be linearized with a hashmap
    // for any combination of groups, collapse their intersection if their intersection is large enough
    // https://stackoverflow.com/questions/12303989/cartesian-product-of-multiple-arrays-in-javascript
    const f = (a, b) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
    const cartesian = (a, b, ...c) => (b ? cartesian(f(a, b), ...c) : a);

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
                    .forEach(group => combinedGroups[group.name].nodes = new Set([...group.nodes].filter(node => !partition.has(node))));
                // add the pebble that represents the merge to each parent group
                includedGroups
                    .forEach(group => combinedGroups[group.name].nodes.add(mergedName));

                summaries[mergedName] = {
                    plottype: 'collapsed',
                    childNodes: partition
                };

                // when merging, attempt to use the positions of existing modes
                if (!(mergedName in forceDiagramNodesReadOnly)) {
                    let preexistingPebbles = partitionArray.filter(pebble => pebble in forceDiagramNodesReadOnly)
                    if (preexistingPebbles.length > 0) forceDiagramNodesReadOnly[mergedName] = {
                        id: mergedName.replace(/\W/g,'_'),
                        name: mergedName,
                        x: preexistingPebbles.reduce((sum, pebble) => sum + forceDiagramNodesReadOnly[pebble].x, 0) / preexistingPebbles.length,
                        y: preexistingPebbles.reduce((sum, pebble) => sum + forceDiagramNodesReadOnly[pebble].y, 0) / preexistingPebbles.length
                    }
                }
            }
        });

    pebbles = [...pebbles.filter(pebble => !removedPebbles.has(pebble)), ...addedPebbles];
    groups = Object.values(combinedGroups);

    return {pebbles, groups, groupLinks, summaries};
};


export let setGroup = (group, name) => {
    let selectedProblem = app.getSelectedProblem();
    delete selectedProblem.unedited;
    ({
        'Loose': () => {
            !selectedProblem.tags.loose.includes(name) && selectedProblem.tags.loose.push(name);
            app.remove(selectedProblem.targets, name);
            app.remove(selectedProblem.predictors, name);
        },
        'Predictors': () => {
            !selectedProblem.predictors.includes(name) && selectedProblem.predictors.push(name);
            app.remove(selectedProblem.targets, name);
            app.remove(selectedProblem.tags.loose, name);
        },
        'Targets': () => {
            !selectedProblem.targets.includes(name) && selectedProblem.targets.push(name);
            app.remove(selectedProblem.predictors, name);
            app.remove(selectedProblem.tags.loose, name);
        }
    }[group] || Function)();
    app.resetPeek();
};

export let forceDiagramNodesReadOnly = {};

export let forceDiagramState = {
    builders: [pebbleBuilderLabeled, groupBuilder, linkBuilder, groupLinkBuilder],
    hoverPebble: undefined,
    contextPebble: undefined,
    selectedPebble: undefined,
    hoverTimeout: undefined,
    isPinned: false,
    hullRadius: 40,
    defaultPebbleRadius: 40,
    hoverTimeoutDuration: 150, // milliseconds to wait before showing/hiding the pebble handles
    selectTransitionDuration: 300, // milliseconds of pebble resizing animations
    arcHeight: 16,
    arcGap: 1
};

let setContextPebble = pebble => {
    let selectedProblem = app.getSelectedProblem();

    delete selectedProblem.unedited;
    d3.event.preventDefault(); // block browser context menu
    if (forceDiagramState.contextPebble) {

        if (forceDiagramState.contextPebble !== pebble) {
            selectedProblem.pebbleLinks = selectedProblem.pebbleLinks || [];
            selectedProblem.pebbleLinks.push({
                source: forceDiagramState.contextPebble,
                target: pebble,
                right: true
            });
        }
        forceDiagramState.contextPebble = undefined;
    } else forceDiagramState.contextPebble = pebble;
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
    pebbleEvents: {
        click: pebble => {
            if (forceDiagramState.contextPebble) setContextPebble(pebble);
            else setSelectedPebble(pebble)
        },
        mouseover: pebble => {
            clearTimeout(forceDiagramState.hoverTimeout);
            forceDiagramState.hoverTimeout = setTimeout(() => {
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
    let matchedVariables = variableSearchText.length === 0 ? []
        : pebbles.filter(variable => variable.toLowerCase().includes(variableSearchText));

    // the order of the keys indicates precedence, lower keys are more important
    let params = {
        predictors: new Set(problem.predictors),
        loose: new Set(problem.tags.loose),
        transformed: new Set(problem.tags.transformed),
        crossSection: new Set(problem.tags.crossSection),
        time: new Set(problem.tags.time),
        nominal: new Set(app.getNominalVariables(problem)),
        weight: new Set(problem.tags.weights),
        targets: new Set(problem.targets),
        matched: new Set(matchedVariables),
    };

    let strokeWidths = {
        matched: 4,
        crossSection: 4,
        time: 4,
        nominal: 4,
        targets: 4,
        weight: 4
    };

    let nodeColors = {
        crossSection: common.taggedColor,
        time: common.taggedColor,
        nominal: common.taggedColor,
        targets: common.taggedColor,
        weight: common.taggedColor,
        loose: common.selVarColor,
    };
    let strokeColors = {
        matched: 'black',
        crossSection: common.csColor,
        time: common.timeColor,
        nominal: common.nomColor,
        targets: common.dvColor,
        weight: common.weightColor
    };

    // set the base color of each node
    pebbles.forEach(pebble => {
        if (state.summaries[pebble].plottype === 'collapsed') {
            context.nodes[pebble].strokeWidth = 0;
            context.nodes[pebble].nodeCol = 'transparent';
            context.nodes[pebble].strokeColor = 'transparent';
        }
        else {
            context.nodes[pebble].strokeWidth = 1;
            context.nodes[pebble].nodeCol = colors(app.generateID(pebble));
            context.nodes[pebble].strokeColor = 'transparent';
        }
    });

    // set additional styling for each node
    pebbles.forEach(pebble => Object.keys(params)
    // only apply styles on classes the variable is a member of
        .filter(label => params[label].has(pebble))
        .forEach(label => {
            if (label in strokeWidths) context.nodes[pebble].strokeWidth = strokeWidths[label];
            if (label in nodeColors) context.nodes[pebble].nodeCol = nodeColors[label];
            if (label in strokeColors) context.nodes[pebble].strokeColor = strokeColors[label];
        }));
};

export let forceDiagramLabels = problem => pebble => ['Predictors', 'Loose', 'Targets'].includes(pebble) ? [] : [
    {
        id: 'Group',
        name: 'Group',
        attrs: {fill: common.gr1Color},
        children: [
            {
                id: 'Predictor',
                name: 'Predictor',
                attrs: {fill: common.gr1Color},
                onclick: d => {
                    delete problem.unedited;
                    app.toggle(problem.tags.loose, d);
                    app.remove(problem.targets, d);
                    app.toggle(problem.predictors, d);
                    forceDiagramState.setSelectedPebble(d);
                    app.resetPeek();
                }
            },
            {
                id: 'Dep',
                name: 'Dep Var',
                attrs: {fill: common.dvColor},
                onclick: d => {
                    delete problem.unedited;
                    app.toggle(problem.tags.loose, d);
                    app.remove(problem.predictors, d);
                    app.toggle(problem.targets, d);
                    forceDiagramState.setSelectedPebble(d);
                    app.resetPeek();
                }
            }
        ]
    },
    {
        id: 'GroupLabel',
        name: 'Labels',
        attrs: {fill: common.nomColor},
        onclick: forceDiagramState.setSelectedPebble,
        children: [
            {
                id: 'Nominal',
                name: 'Nom',
                attrs: {fill: common.nomColor},
                onclick: d => {
                    if (app.variableSummaries[d].numchar === 'character') {
                        app.alertLog(`Cannot convert column "${d}" to numeric, because the column is character-based.`);
                        return;
                    }
                    delete problem.unedited;
                    app.toggle(problem.tags.nominal, d);
                    forceDiagramState.setSelectedPebble(d);
                    app.resetPeek()
                }
            },
            {
                id: 'Time',
                name: 'Time',
                attrs: {fill: common.timeColor},
                onclick: d => {
                    delete problem.unedited;
                    app.toggle(problem.tags.time, d);
                    forceDiagramState.setSelectedPebble(d);
                    app.resetPeek()
                }
            },
            {
                id: 'Cross',
                name: 'Cross',
                attrs: {fill: common.csColor},
                onclick: d => {
                    delete problem.unedited;
                    app.toggle(problem.tags.crossSection, d);
                    forceDiagramState.setSelectedPebble(d);
                    app.resetPeek()
                }
            },
            {
                id: 'Weight',
                name: 'Weight',
                attrs: {fill: common.weightColor},
                onclick: d => {
                    delete problem.unedited;
                    if (problem.tags.weights.includes(d))
                        problem.tags.weights = [];
                    else {
                        problem.tags.weights = [d];
                        app.remove(problem.targets, d);
                        app.remove(problem.tags.time, d);
                        app.remove(problem.tags.nominal, d);
                        app.remove(problem.tags.crossSection, d);
                    }
                    forceDiagramState.setSelectedPebble(d);
                    app.resetPeek()
                }
            }
        ]
    },
];

// Used for left panel variable search
export let variableSearchText = "";
export let setVariableSearchText = text => variableSearchText = text.toLowerCase();


// creates a new problem from the force diagram problem space and adds to disco
export async function addProblemFromForceDiagram() {
    let problemCopy = app.getProblemCopy(app.getSelectedProblem());
    app.workspace.raven_config.problems[problemCopy.problemID] = problemCopy;

    app.setSelectedProblem(problemCopy.problemID);
    app.setLeftTab('Discover');
    m.redraw();
}

export function connectAllForceDiagram() {
    let problem = app.getSelectedProblem();

    problem.pebbleLinks = problem.pebbleLinks || [];
    if (app.is_explore_mode) {
        let pebbles = [...problem.predictors, ...problem.targets];
        problem.pebbleLinks = pebbles
            .flatMap((pebble1, i) => pebbles.slice(i + 1, pebbles.length)
                .map(pebble2 => ({
                    source: pebble1, target: pebble2
                })))
    }
    else problem.pebbleLinks = problem.predictors
        .flatMap(source => problem.targets
            .map(target => ({
                source, target, right: true
            })));
    m.redraw();
}


export async function submitDiscProb() {
    let problems = app.workspace.raven_config.problems;
    app.buttonLadda['btnSubmitDisc'] = true;
    m.redraw();

    let outputCSV = Object.keys(problems).reduce((out, problemID) => {
        let problem = problems[problemID];


        if(problem.manipulations.length === 0){
            // construct and write out the api call and problem description for each discovered problem
            let problemApiCall = solverD3M.GRPC_SearchSolutionsRequest(problem, 10);
            let problemProblemSchema = solverD3M.GRPC_ProblemDescription(problem);
            let filename_api = problem.problemID + '/ss_api.json';
            let filename_ps = problem.problemID + '/schema.json';
            app.makeRequest(D3M_SVC_URL + '/store-user-problem', {filename: filename_api, data: problemApiCall } );
            app.makeRequest(D3M_SVC_URL + '/store-user-problem', {filename: filename_ps, data: problemProblemSchema } );
        } else {
            console.log('omitting:');
            console.log(problem);
        }
    });

    // write the CSV file requested by NIST that describes properties of the solutions
    console.log(outputCSV);
    let res3 = await app.makeRequest(D3M_SVC_URL + '/store-user-problem', {filename: 'labels.csv', data: outputCSV});

    app.buttonLadda.btnSubmitDisc = false;
    app.buttonClasses.btnSubmitDisc = 'btn-secondary';
    app.buttonClasses.btnDiscover = 'btn-secondary';
    if (!app.task2_finished) app.buttonClasses.btnEstimate = 'btn-secondary';

    app.setTask1_finished(true);
    m.redraw();

    if (!app.problemDocExists)
        setModal("Your discovered problems have been submitted.", "Task Complete", true, false, false, locationReload);
}
