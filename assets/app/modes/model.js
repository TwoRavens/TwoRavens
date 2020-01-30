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
import TextFieldSuggestion from "../../common/views/TextFieldSuggestion";
import ListTags from "../../common/views/ListTags";
import Panel from "../../common/views/Panel";
import MenuTabbed from "../../common/views/MenuTabbed";
import Dropdown from "../../common/views/Dropdown";
import ButtonRadio from "../../common/views/ButtonRadio";
import MenuHeaders from "../../common/views/MenuHeaders";
import Checkbox from "../../common/views/Checkbox";
import Popper from '../../common/views/Popper';

import ForceDiagram, {groupBuilder, groupLinkBuilder, linkBuilder, pebbleBuilderLabeled} from "../views/ForceDiagram";
import VariableSummary, {formatVariableSummary} from "../views/VariableSummary";
import ButtonLadda from "../views/LaddaButton";
import Flowchart from "../views/Flowchart";

import {bold, boldPlain, italicize, preformatted} from "../index";
import {setModal} from "../../common/views/Modal";
import {workspace} from "../app";
import {is_explore_mode} from "../app";


export class CanvasModel {

    view(vnode) {
        let {drawForceDiagram, forceData} = vnode.attrs;
        let selectedProblem = app.getSelectedProblem();

        return [
            drawForceDiagram && m(ForceDiagram, Object.assign(forceDiagramState,{
                nodes: forceDiagramNodesReadOnly,
                // these attributes may change dynamically, (the problem could change)
                onDragOut: pebble => {
                    let pebbles = forceData.summaries[pebble] && forceData.summaries[pebble].pdfPlotType === 'collapsed'
                        ? forceData.summaries[pebble].childNodes : [pebble];
                    pebbles.forEach(pebble => setGroup(selectedProblem, 'None', pebble));
                    selectedProblem.pebbleLinks = (selectedProblem.pebbleLinks || [])
                        .filter(link => link.target !== pebble && link.source !== pebble);
                    app.resetPeek();
                    m.redraw();
                },
                onDragOver: (pebble, groupId) => {
                    if (groupId === 'Loose') return;
                    let pebbles = forceData.summaries[pebble.name].pdfPlotType === 'collapsed'
                        ? forceData.summaries[pebble.name].childNodes : [pebble.name];
                    pebbles.forEach(pebble => setGroup(selectedProblem, groupId, pebble));
                    app.resetPeek();
                    m.redraw();
                },
                onDragAway: (pebble, groupId) => {
                    let pebbles = forceData.summaries[pebble.name] && forceData.summaries[pebble.name].pdfPlotType === 'collapsed'
                        ? forceData.summaries[pebble.name].childNodes : [pebble.name];
                    pebbles.forEach(pebble => setGroup(selectedProblem, 'Loose', pebble));
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
                    title: 'pin the variable pebbles to the page',
                    class: forceDiagramState.isPinned && 'active'
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
                    {
                        id: "nomButton",
                        vars: selectedProblem.tags.nominal,
                        name: 'Nominal',
                        borderColor: common.nomColor,
                        innerColor: 'white',
                        width: 1
                    },
                    {
                        id: "csButton",
                        vars: selectedProblem.tags.crossSection,
                        name: 'Cross Sec',
                        borderColor: common.csColor,
                        innerColor: 'white',
                        width: 1
                    },
                    {
                        id: "boundaryButton",
                        vars: selectedProblem.tags.boundary,
                        name: 'Boundary',
                        borderColor: common.boundaryColor,
                        innerColor: 'white',
                        width: 1
                    },
                    {
                        id: "locationButton",
                        vars: selectedProblem.tags.location,
                        name: 'Location',
                        borderColor: common.locationColor,
                        innerColor: 'white',
                        width: 1
                    },
                    {
                        id: "timeButton",
                        vars: selectedProblem.tags.time,
                        name: 'Time',
                        borderColor: common.timeColor,
                        innerColor: 'white',
                        width: 1
                    },
                    {
                        id: "weightButton",
                        vars: selectedProblem.tags.weights,
                        name: 'Weight',
                        borderColor: common.weightColor,
                        innerColor: 'white',
                        width: 1
                    },
                    {
                        id: "privilegedButton",
                        vars: selectedProblem.tags.privileged,
                        name: 'Privileged',
                        borderColor: common.privilegedColor,
                        innerColor: 'white',
                        width: 1
                    },
                    {
                        id: "exogenousButton",
                        vars: selectedProblem.tags.exogenous,
                        name: 'Exogenous',
                        borderColor: common.exogenousColor,
                        innerColor: 'white',
                        width: 1
                    },
                    {
                        id: "indexButton",
                        vars: selectedProblem.tags.indexes,
                        name: 'Index',
                        borderColor: common.indexColor,
                        innerColor: 'white',
                        width: 1
                    },
                    {
                        id: "predButton",
                        vars: selectedProblem.predictors,
                        name: 'Predictors',
                        borderColor: common.gr1Color,
                        innerColor: common.gr1Color,
                        width: 0
                    },
                    {
                        id: "targetButton",
                        vars: selectedProblem.targets,
                        name: 'Targets',
                        borderColor: common.gr2Color,
                        innerColor: common.gr2Color,
                        width: 0
                    },
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
    'Augment': '1200px',
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
                            [app.hexToRgba(common.selVarColor, .5)]: app.is_explore_mode ? selectedProblem.tags.loose : explore.exploreVariables,
                            [app.hexToRgba(common.gr1Color, .25)]: selectedProblem.predictors,
                            [app.hexToRgba(common.gr2Color, .25)]: app.is_explore_mode ? [] : selectedProblem.targets
                        },
                        classes: {
                            'item-nominal': nominalVariables,
                            'item-cross-section': selectedProblem.tags.crossSection,
                            'item-boundary': selectedProblem.tags.boundary,
                            'item-location': selectedProblem.tags.location,
                            'item-time': selectedProblem.tags.time,
                            'item-weight': selectedProblem.tags.weights,
                            'item-privileged': selectedProblem.tags.privileged,
                            'item-exogenous': selectedProblem.tags.exogenous,
                            'item-index': selectedProblem.tags.indexes,
                            'item-matched': matchedVariables
                        },
                        callback: varName => {
                            setGroup(selectedProblem, [
                                ...selectedProblem.predictors,
                                ...selectedProblem.targets,
                                ...selectedProblem.tags.loose
                            ].includes(varName) ? 'None' : 'Loose', varName);
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
                            app.setLeftTab(app.LEFT_TAB_NAME_VARIABLES);
                        }
                    }, 'Create New Variable'),
                ]
        })
    }

    // DISCOVERY TAB
    let problems = ravenConfig.problems;

    let allMeaningful = Object.keys(problems).every(probID => problems[probID].meaningful);
    let discoveryAllCheck = m(Checkbox, {
        id: 'discoveryAllCheck',
        title: `mark ${allMeaningful ? 'no' : 'all'} problems as meaningful`,
        onclick: app.setCheckedDiscoveryProblem,
        checked: allMeaningful
    });

    let discoveryHeaders = () => [
        'Name',
        !app.taskPreferences.task1_finished && m('[style=text-align:center]', 'Meaningful', m('br'), discoveryAllCheck),
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
        problem.problemId, // this is masked as the UID
        !app.taskPreferences.task1_finished && m('[style=text-align:center]', {onclick: e=> e.stopPropagation()}, m(Checkbox, {
            onclick: state => app.setCheckedDiscoveryProblem(state, problem.problemId),
            checked: problem.meaningful
        })),
        problem.targets.join(', '),
        app.getPredictorVariables(problem).join(', '),
        problem.subTask === 'taskSubtypeUndefined' ? '' : app.getSubtask(problem),
        problem.task,
        problem.metric
    ];
    selectedProblem && sections.push({
        value: 'Discover',
        attrsInterface: {class: (!app.taskPreferences.isDiscoveryClicked && !app.taskPreferences.task1_finished) ? 'btn-success' : 'btn-secondary'}, // passed into button
        contents: [
            m('div#discoveryTablesContainer', {
                    style: {
                        // height: '80%',
                        overflow: 'auto',
                        display: 'block',
                        'margin-bottom': 0,
                        'max-width': (window.innerWidth - 90) + 'px'
                    }
                },

                /*
                 *  Current Problem Table
                 */
                [
                    m('h4.card-header.clearfix',
                        m('div[style=height:50px;display:inline]', 'Current Problem'),
                        !selectedProblem.pending && m(Button, {
                            id: 'btnDeleteProblem',
                            style: {float: 'right', margin: '-5px', 'margin-right': '22px'},
                            class: 'btn-sm',
                            onclick: () => {
                                selectedProblem.pending = true;
                                selectedProblem.unedited = true;
                            },
                        }, 'Delete'),
                        selectedProblem.pending && m(Button, {
                            id: 'btnSaveProblem',
                            style: {float: 'right', margin: '-5px', 'margin-right': '22px'},
                            class: 'btn-sm',
                            onclick: () => {
                                let problemCopy = app.getProblemCopy(selectedProblem);
                                selectedProblem.pending = false;

                                ravenConfig.problems[problemCopy.problemId] = problemCopy;
                                app.setSelectedProblem(problemCopy.problemId);
                            }
                        }, 'Save'),
                        selectedProblem.manipulations.length !== 0 && m(Button, {
                            style: {float: 'right', margin: '-5px', 'margin-right': '1em'},
                            class: 'btn-sm',
                            disabled: app.rightTab === 'Manipulate' && common.panelOpen['right'],
                            title: `view manipulations for ${selectedProblem.problemId}`,
                            onclick: () => {
                                app.setRightTab('Manipulate');
                                common.setPanelOpen('right');
                            }
                        }, 'Manipulations')),

                        /*
                         * Current Problem description
                         */
                        [
                            m('h5.card-header.clearfix',
                                m('div[style=height:50px;display:inline]', 'Description')),

                            m('p', {
                                id: 'problemDescription',
                                style: {'padding-left': '2%', 'max-width': '800px'},
                            }, preformatted(app.getDescription(selectedProblem))),
                        ], // END: Current Problem description

                    m(Table, {
                        id: 'discoveryTableSelectedProblem',
                        headers: discoveryHeaders(),
                        data: [formatProblem(selectedProblem)],
                        activeRow: ravenConfig.selectedProblem,
                        // showUID: false,
                        abbreviation: 40
                    })
                ],

                /*
                 *  Generate tables for "Custom", "Discovered", and "Solved" problems
                 */
                ['solved', 'user', 'auto'].filter(key => key in problemPartition).map(partition => [
                    /*
                     *  Display the appropriate header "Custom", "Discovered", or "Solved" problems
                     */
                    m('h4.card-header', `${{
                        'user': 'Custom',
                        'auto': 'Discovered',
                        'solved': 'Solved'
                    }[partition]} Problems`),
                    /*
                     * User note for selecting "Discovered" problems
                     */
                     (partition === 'auto') && m('div', {},
                        [
                          m('p', {
                            style: {'padding-left': '3%'}
                          },
                            'Click on a Discovered problem below to make it the "Current Problem."', m('br'), boldPlain('Note: '), 'the new "Current Problem" will have the same "Target" and "Predictors" but the "Name" will be different.')
                        ]
                      ),
                    /*
                     * Problems table
                     */
                    m(Table, {
                        id: 'discoveryTable' + partition,
                        headers: discoveryHeaders(),
                        data: problemPartition[partition].map(formatProblem),
                        rowClasses: {
                            'discovery-table-highlight': selectedProblem.provenanceID
                                ? [selectedProblem.provenanceID] : []
                        },
                        onclick: problemId => {

                            let clickedProblem = problems[problemId];
                            if (clickedProblem.system === 'solved') {
                                app.setSelectedProblem(problemId);
                                app.setSelectedMode('results');
                                return;
                            }
                            if (selectedProblem.problemId === problemId) return;

                            if (clickedProblem.system === 'user') {
                                app.setSelectedProblem(problemId);
                                return;
                            }

                            // delete current problem if no changes were made
                            if (selectedProblem.pending) {
                                if (selectedProblem.unedited)
                                    delete problems[selectedProblem.problemId];
                                else if (confirm(`You have unsaved changes in the previous problem, ${selectedProblem.problemId}. Would you like to discard ${selectedProblem.problemId}?`))
                                    selectedProblem.pending = false;
                                else delete problems[selectedProblem.problemId];
                            }

                            // create a copy of the autogenerated problem
                            if (clickedProblem.system === 'auto') {
                                let copiedProblem = app.getProblemCopy(clickedProblem);
                                problems[copiedProblem.problemId] = copiedProblem;
                                app.setSelectedProblem(copiedProblem.problemId);
                            }
                        },
                        activeRow: selectedProblem.problemId,
                        abbreviation: 40,
                        sortable: true
                    })
                ]),
                /*
                 *  If this is an unfinished Task1, show the submit discovered
                 *    problem button!
                 */
                !app.taskPreferences.task1_finished && !app.is_explore_mode && m(ButtonLadda, {
                    id: 'btnSubmitDisc',
                    style: {margin: '1em'},
                    class: 'btn-success',
                    activeLadda: app.taskPreferences.isSubmittingProblems,
                    onclick: submitDiscProb,
                    title: 'Submit all checked discovered problems'
                }, 'Submit Meaningful Problems')
            )
        ]
    });

    let summaryPebble = forceDiagramState.hoverPebble || forceDiagramState.selectedPebble;
    let summaryContent;

    if (summaryPebble && forceData.pebbles.includes(summaryPebble)) {
        // if hovered over a collapsed pebble, then expand summaryPebble into all children pebbles
        let summaryPebbles = forceData.summaries[summaryPebble] && forceData.summaries[summaryPebble].pdfPlotType === 'collapsed'
            ? [...forceData.summaries[summaryPebble].childNodes]
            : [summaryPebble];

        summaryContent = summaryPebbles.sort(app.omniSort)
            .map(variableName => m(Subpanel, {
                    id: 'subpanel' + variableName,
                    header: variableName,
                    defaultShown: false,
                    shown: summaryPebbles.length === 1 || undefined
                },

                [
                    {
                        name: 'Predictor', active: selectedProblem.predictors.includes(variableName),
                        onclick: () => setGroup(selectedProblem, selectedProblem.predictors.includes(variableName) ? 'Loose' : 'Predictors', variableName),
                        title: 'Predictor variables are used to estimate the target variables.'
                    },
                    {
                        name: 'Target', active: selectedProblem.targets.includes(variableName),
                        onclick: () => setGroup(selectedProblem, selectedProblem.targets.includes(variableName) ? 'Loose' : 'Targets', variableName),
                        title: 'Target variables are the variables of interest.'
                    },
                    {
                        name: 'Loose', active: selectedProblem.tags.loose.includes(variableName),
                        onclick: () => setGroup(selectedProblem, selectedProblem.tags.loose.includes(variableName) ? undefined : 'Loose', variableName),
                        title: 'Loose variables are in the modeling space, but are not used in the model.'
                    },
                    {
                        name: 'Nominal', active: selectedProblem.tags.nominal.includes(variableName),
                        onclick: () => setLabel(selectedProblem, 'nominal', variableName),
                        title: 'Nominal variables are text-based, and handled similarly to categorical variables.'
                    },
                    {
                        name: 'Cross Section', active: selectedProblem.tags.crossSection.includes(variableName),
                        onclick: () => setLabel(selectedProblem, 'crossSection', variableName),
                        title: 'Cross sectional variables group observations into treatments.'
                    },
                    {
                        name: 'Boundary', active: selectedProblem.tags.boundary.includes(variableName),
                        onclick: () => setLabel(selectedProblem, 'boundary', variableName),
                        title: 'Boundary variables are a string vector of numeric data points.'
                    },
                    {
                        name: 'Location', active: selectedProblem.tags.location.includes(variableName),
                        onclick: () => setLabel(selectedProblem, 'location', variableName),
                        title: 'Location variables indicate a geospatial location.'
                    },
                    {
                        name: 'Time', active: selectedProblem.tags.time.includes(variableName),
                        onclick: () => setLabel(selectedProblem, 'time', variableName),
                        title: m('div', {style: {'text-align': 'left', 'margin-left': '.5em'}},
                            'Time variables indicate a temporal location.', m('br'), bold('Time Granularity:'),
                            m('br'),
                            m(TextField, {
                                id: 'timeGranularityValueTextField',
                                value: (selectedProblem.timeGranularity[variableName] || {}).value || '',
                                oninput: value => {
                                    selectedProblem.timeGranularity[variableName] = selectedProblem.timeGranularity[variableName] || {};
                                    selectedProblem.timeGranularity[variableName].value = value.replace(/[^\d.-]/g, '')
                                },
                                onblur: value => selectedProblem.timeGranularity[variableName].value =
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
                                    activeItem: (selectedProblem.timeGranularity[variableName] || {}).units || 'unspecified',
                                    onclickChild: granularity => {
                                        selectedProblem.timeGranularity[variableName] = selectedProblem.timeGranularity[variableName] || {};
                                        selectedProblem.timeGranularity[variableName].units = granularity
                                    }
                                }))
                        ),
                    },
                    {
                        name: 'Weight', active: selectedProblem.tags.weights.includes(variableName),
                        onclick: () => setLabel(selectedProblem, 'weights', variableName),
                        title: 'A weight variable indicates the importance of individual observations.'
                    },
                    {
                        name: 'Privileged', active: selectedProblem.tags.privileged.includes(variableName),
                        onclick: () => setLabel(selectedProblem, 'privileged', variableName),
                        title: 'A privileged variable may or may not exist in the test set.'
                    },
                    {
                        name: 'Exogenous', active: selectedProblem.tags.exogenous.includes(variableName),
                        onclick: () => setLabel(selectedProblem, 'exogenous', variableName),
                        title: 'An exogenous variable is determined outside of the model.'
                    },
                    {
                        name: 'Index', active: selectedProblem.tags.indexes.includes(variableName),
                        onclick: () => setLabel(selectedProblem, 'indexes', variableName),
                        title: 'An index variable typically has one unique value per observation.'
                    },
                ].map(tag =>
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

                m(VariableSummary, {variable: app.variableSummaries[variableName]})));
    }

    sections.push({
        value: 'Summary',
        title: 'Select a variable from within the visualization in the center panel to view its summary statistics.',
        display: 'none',
        contents: summaryContent
    });

    return m(Panel, {
        side: 'left',
        label: 'Data Selection',
        hover: false, // app.is_model_mode && !manipulate.constraintMenu,
        width: app.is_explore_mode && app.leftTab === 'Discover' ? '900px' : leftPanelWidths[app.leftTab],
        attrsAll: {
            onclick: () => app.setFocusedPanel('left'),
            style: {
                'z-index': 100 + (app.focusedPanel === 'left'),
                background: 'rgb(249, 249, 249, .9)',
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
            m('div#problemConfiguration', {onclick: () => {
                if (selectedProblem.system === 'solved') {
                    app.alertError(m('div', 'This problem already has solutions. Would you like to edit a copy of this problem instead?', m(Button, {
                        style: 'margin:1em',
                        onclick: () => {
                            let problemCopy = app.getProblemCopy(selectedProblem);
                            resultsKeysToAxe.forEach(key => delete problemCopy[key]);
                            Object.assign(problemCopy, {
                                solutions: {},
                                selectedSource: undefined,
                                selectedSolutions: {}
                            });
                            workspace.raven_config.problems[problemCopy.problemId] = problemCopy;
                            app.setShowModalAlerts(false);
                            app.setSelectedProblem(problemCopy.problemId);
                        }
                    }, 'Edit Copy')));
                    m.redraw();
                    return;
                }
                isLocked && hopscotch.startTour(app.lockTour())
                    }, style: 'float: left'},
                m('label', 'Task Type'),
                m(Dropdown, {
                    id: 'taskType',
                    items: app.workspace.raven_config.advancedMode
                        ? Object.keys(app.d3mTaskType)
                        : ['classification', 'regression', 'forecasting'],
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

                selectedProblem.task === 'forecasting' && [
                    m('label', 'Forecast along a temporal variable.'),
                    selectedProblem.tags.time.length > 0 ? m(Dropdown, {
                        id: 'forecastingColumnDropdown',
                        items: selectedProblem.tags.time,
                        activeItem: (selectedProblem.forecastingHorizon || {}).column,
                        onclickChild: column => {
                            if (isLocked) return;
                            selectedProblem.forecastingHorizon = selectedProblem.forecastingHorizon || {};
                            selectedProblem.forecastingHorizon.column = column;
                        },
                        style: {'margin': '1em', 'margin-top': '0'},
                        disabled: isLocked
                    }) : [
                        m('br'),
                        italicize('No variables have been tagged as temporal. Click a node in the graph, and then tag it as "time" from the left panel.'),
                        m('br'),  m('br')
                    ],
                    m('label', 'Horizon value. Choose how many time steps to forecast.'),
                    m(TextField, {
                        id: 'horizonValueTextField',
                        disabled: isLocked,
                        placeholder: 10,
                        value: (selectedProblem.forecastingHorizon || {}).value || '',
                        oninput: !isLocked && (value => {
                            selectedProblem.forecastingHorizon = selectedProblem.forecastingHorizon || {};
                            selectedProblem.forecastingHorizon.value = Math.max(0, parseInt(value.replace(/\D/g,''))) || undefined
                        }),
                        style: {'margin-bottom': '1em'}
                    })
                ],

                selectedProblem.task === 'clustering' && [
                    m('label', 'Number of Clusters (optional)'),
                    m(TextField, {
                        id: 'numClustersTextField',
                        disabled: isLocked,
                        value: selectedProblem.numClusters,
                        oninput: !isLocked && (value => selectedProblem.numClusters = Math.max(0, parseInt(value.replace(/\D/g,''))) || undefined),
                        style: {'margin-bottom': '1em'}
                    })
                ],

                m('label', 'Primary Performance Metric. Models are trained to maximize this metric.'),
                m(Dropdown, {
                    id: 'performanceMetric',
                    // TODO: filter based on https://datadrivendiscovery.org/wiki/display/work/Matrix+of+metrics
                    items: app.applicableMetrics[selectedProblem.task][app.getSubtask(selectedProblem)],
                    activeItem: selectedProblem.metric,
                    onclickChild: metric => app.setMetric(metric, selectedProblem),
                    style: {'margin': '1em', 'margin-top': '0'},
                    disabled: isLocked
                }),

                m('label[style=margin-top:0.5em]', 'Advanced Options. If enabled, then more problem types, splitting, search and score options may be configured.'),
                m(ButtonRadio, {
                    id: 'advancedModeOption',
                    onclick: !isLocked && (value => app.workspace.raven_config.advancedMode = value === 'True'),
                    activeSection: app.workspace.raven_config.advancedMode ? 'True' : 'False',
                    sections: ['True', 'False'].map(type => ({value: type, attrsInterface: {disabled: isLocked}}))
                }),

                app.workspace.raven_config.advancedMode && app.applicableMetrics[selectedProblem.task][app.getSubtask(selectedProblem)].length - 1 > selectedProblem.metrics.length && m(Dropdown, {
                    id: 'performanceMetrics',
                    items: app.applicableMetrics[selectedProblem.task][app.getSubtask(selectedProblem)]
                        .filter(metric => metric !== selectedProblem.metric && !selectedProblem.metrics.includes(metric)),
                    activeItem: 'Add Secondary Metric',
                    onclickChild: metric => {
                        selectedProblem.metrics = [...selectedProblem.metrics, metric].sort(app.omniSort);
                        delete selectedProblem.unedited;
                    },
                    style: {'margin': '1em', 'margin-top': '0'},
                    disabled: isLocked
                }),
                app.workspace.raven_config.advancedMode && m(ListTags, {
                    readonly: isLocked,
                    tags: selectedProblem.metrics,
                    ondelete: metric => app.remove(selectedProblem.metrics, metric)
                }),

                app.workspace.raven_config.advancedMode && [selectedProblem.metric, ...selectedProblem.metrics].find(metric => ['f1', 'precision', 'recall'].includes(metric)) && [
                    m('label', 'Positive Class. Used for f1, precision, and recall metrics.'),
                    m(Dropdown, {
                        id: 'positiveClass',
                        items: Object.keys(app.variableSummaries[selectedProblem.targets[0]].plotValues || {}),
                        activeItem: selectedProblem.positiveLabel,
                        onclickChild: label => selectedProblem.positiveLabel = label,
                        style: {'margin': '1em', 'margin-top': '0'},
                        disabled: isLocked
                    }),
                ],

                app.workspace.raven_config.advancedMode && [selectedProblem.metric, ...selectedProblem.metrics].find(metric => metric === 'precisionAtTopK') && [
                    m('label', 'K, for Precision at top K'),
                    m(TextField, {
                        id: 'precisionAtTopKTextField',
                        disabled: isLocked,
                        value: selectedProblem.precisionAtTopK === undefined ? '' : selectedProblem.precisionAtTopK,
                        oninput: !isLocked && (value => selectedProblem.precisionAtTopK = Math.max(0, parseInt(value.replace(/\D/g,''))) || undefined),
                        style: {'margin-bottom': '1em'}
                    })
                ],

                app.workspace.raven_config.advancedMode && m(Subpanel, {
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
                        m('label[style=margin-top:0.5em]', 'Stratify'),
                        m(ButtonRadio, {
                            id: 'stratifiedSplitOption',
                            onclick: value => {
                                if (isLocked) return;
                                selectedProblem.splitOptions.stratified = value === 'True';
                            },
                            activeSection: selectedProblem.splitOptions.stratified ? 'True' : 'False',
                            sections: ['True', 'False'].map(type => ({value: type, attrsInterface: {disabled: isLocked}}))
                        }),
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
                                oninput: !isLocked && (value => selectedProblem.splitOptions.randomSeed = parseFloat(value.replace(/\D/g,'')) || undefined),
                                style: {'margin-bottom': '1em'}
                            })
                        ],
                        m('label[style=margin-top:0.5em]', 'Splits file (optional)'),
                        m(TextField, {
                            id: 'textFieldSampleSplitsFile',
                            disabled: isLocked,
                            value: selectedProblem.splitOptions.splitsFile,
                            onblur: !isLocked && (value => selectedProblem.splitOptions.splitsFile = value),
                            style: {'margin-bottom': '1em'}
                        }),
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
                app.workspace.raven_config.advancedMode && m(Subpanel, {
                        header: 'Search Options',
                        defaultShown: false,
                        style: {margin: '1em'}
                    },
                    m('label', 'Approximate time bound for overall pipeline search, in minutes. Leave empty for unlimited time.'),
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
                        oninput: !isLocked && (value => selectedProblem.searchOptions.solutionsLimit = Math.max(0, parseInt(value.replace(/\D/g,''))) || undefined),
                        style: {'margin-bottom': '1em'}
                    })
                ),
                app.workspace.raven_config.advancedMode && m(Subpanel, {
                        header: 'Score Options',
                        defaultShown: false,
                        style: {margin: '1em'}
                    },
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
                            oninput: !isLocked && (value => selectedProblem.scoreOptions.folds = parseFloat(value.replace(/\D/g,'')) || undefined),
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
                    m('label', 'Stratify'),
                    m(ButtonRadio, {
                        id: 'stratifiedScoreOption',
                        onclick: value => {
                            if (isLocked) return;
                            selectedProblem.scoreOptions.stratified = value === 'True';
                        },
                        activeSection: selectedProblem.scoreOptions.stratified ? 'True' : 'False',
                        sections: ['True', 'False'].map(type => ({value: type, attrsInterface: {disabled: isLocked}}))
                    }),
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
                            oninput: !isLocked && (value => selectedProblem.scoreOptions.randomSeed = parseFloat(value.replace(/\D/g,'')) || undefined),
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
                                content: m('div', {style: {'text-align': 'left', 'white-space': 'normal'}},
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
            label: 'Problem Configuration',
            hover: is_explore_mode,
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

    let supervised = !['clustering', 'linkPrediction', 'communityDetection'].includes(problem.task);

    if (forceDiagramMode === 'variables') {
        groups = [
            {
                name: "Predictors",
                color: common.gr1Color,
                colorBackground: app.swandive && 'grey',
                nodes: new Set(problem.predictors),
                opacity: 0.3
            },
            supervised && {
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
                nodes: new Set([
                    ...problem.tags.loose,
                    ...supervised ? [] : problem.targets
                ]),
                opacity: 0.0
            },
            {
                name: 'Structural',
                color: "transparent",
                colorBackground: app.swandive && 'grey',
                nodes: new Set([
                    ...problem.tags.crossSection,
                    ...problem.tags.time,
                    ...problem.tags.weights,
                ]),
                opacity: 0.3
            }
            // {
            //     name: "Priors",
            //     color: common.warnColor,
            //     colorBackground: "transparent",
            //     nodes: new Set(['INSTM', 'pctfedited^2', 'test', 'PCTFLOAN^3']),
            //     opacity: 0.4
            // }
        ].filter(_=>_);

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
    let maxNodes = 30;

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
                    pdfPlotType: 'collapsed',
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

// TODO: move these keys into a .results sub-key that can just be deleted
let resultsKeysToAxe = ["solutions", "selectedSolutions", "solverState", "datasetPaths", "datasetSchemas", "datasetPathsManipulated", "datasetSchemasManipulated", "levels", "domains", "datasetColumnNames"];

export let setGroup = (problem, group, name) => {
    if (problem.system === 'solved') {
        app.alertError(m('div', 'This problem already has solutions. Would you like to edit a copy of this problem instead?', m(Button, {
            style: 'margin:1em',
            onclick: () => {
                let problemCopy = app.getProblemCopy(problem);
                resultsKeysToAxe.forEach(key => delete problemCopy[key]);
                Object.assign(problemCopy, {
                    solutions: {},
                    selectedSource: undefined,
                    selectedSolutions: {}
                });
                workspace.raven_config.problems[problemCopy.problemId] = problemCopy;
                app.setShowModalAlerts(false);
                app.setSelectedProblem(problemCopy.problemId);
                setGroup(problemCopy, group, name);
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
        other: {variable: name, problem: problem.problemId }
      }

  //  console.log('problem: ' + problem.problemId);
//    console.log('problem: ' + JSON.stringify(problem))
    if (group === 'Loose') {
        !problem.tags.loose.includes(name) && problem.tags.loose.push(name);
        app.remove(problem.targets, name);
        app.remove(problem.predictors, name);
        logParams.feature_id = 'MODEL_ADD_VARIABLE';
    }
    else if (group === 'Predictors') {
        !problem.predictors.includes(name) && problem.predictors.push(name);
        app.remove(problem.targets, name);
        app.remove(problem.tags.loose, name);
        logParams.feature_id = 'MODEL_ADD_VARIABLE_AS_PREDICTOR';
    }
    else if (group === 'Targets') {
        !problem.targets.includes(name) && problem.targets.push(name);
        app.remove(problem.predictors, name);
        app.remove(problem.tags.loose, name);
        logParams.feature_id = 'MODEL_ADD_VARIABLE_AS_TARGET';
    }
    else if (group === 'None' || group === undefined) {
        app.remove(problem.predictors, name);
        app.remove(problem.tags.loose, name);
        app.remove(problem.targets, name);
        logParams.feature_id = 'MODEL_REMOVE_VARIABLE';
    }
    // console.log(logParams);
    app.saveSystemLogEntry(logParams);

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
    if (selectedProblem.system === 'solved') {
        app.alertError(m('div', 'This problem already has solutions. Would you like to edit a copy of this problem instead?', m(Button, {
            style: 'margin:1em',
            onclick: () => {
                let problemCopy = app.getProblemCopy(selectedProblem);
                resultsKeysToAxe.forEach(key => delete problemCopy[key]);
                Object.assign(problemCopy, {
                    solutions: {},
                    selectedSource: undefined,
                    selectedSolutions: {}
                });
                workspace.raven_config.problems[problemCopy.problemId] = problemCopy;
                app.setShowModalAlerts(false);
                app.setSelectedProblem(problemCopy.problemId);
            }
        }, 'Edit Copy')));
        m.redraw();
        return;
    }

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
            if (firstSummaryMouseover && app.tutorial_mode && !hopscotch.getCurrTour())
                hopscotch.startTour(summaryTour());
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
    let matchedVariables = variableSearchText.length === 0 ? []
        : pebbles.filter(variable => variable.toLowerCase().includes(variableSearchText));

    // the order of the keys indicates precedence, lower keys are more important
    let params = {
        predictors: new Set(problem.predictors),
        targets: new Set(problem.targets),
        loose: new Set(problem.tags.loose),
        transformed: new Set(problem.tags.transformed),
        nominal: new Set(app.getNominalVariables(problem)),
        crossSection: new Set(problem.tags.crossSection),
        boundary: new Set(problem.tags.boundary),
        location: new Set(problem.tags.location),
        time: new Set(problem.tags.time),
        weights: new Set(problem.tags.weights),
        privileged: new Set(problem.tags.privileged),
        exogenous: new Set(problem.tags.exogenous),
        indexes: new Set(problem.tags.indexes),
        matched: new Set(matchedVariables),
    };

    let strokeWidths = {
        predictors: 4,
        targets: 4,
        nominal: 4,
        crossSection: 4,
        boundary: 4,
        location: 4,
        time: 4,
        weights: 4,
        privileged: 4,
        exogenous: 4,
        indexes: 4,
        matched: 4
    };

    let nodeColors = {
        targets: common.taggedColor,
        nominal: common.taggedColor,
        crossSection: common.taggedColor,
        boundary: common.taggedColor,
        location: common.taggedColor,
        time: common.taggedColor,
        weights: common.taggedColor,
        privileged: common.taggedColor,
        exogenous: common.taggedColor,
        indexes: common.taggedColor,
        matched: common.taggedColor,
        loose: common.taggedColor,
    };

    let strokeColors = {
        nominal: common.nomColor,
        crossSection: common.csColor,
        boundary: common.boundaryColor,
        location: common.locationColor,
        time: common.timeColor,
        weights: common.weightColor,
        privileged: common.privilegedColor,
        exogenous: common.exogenousColor,
        indexes: common.indexColor,
        matched: common.matchedColor
    };

    // set the base color of each node
    pebbles.forEach(pebble => {
        if (state.summaries[pebble] && state.summaries[pebble].pdfPlotType === 'collapsed') {
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
                    setGroup(problem, problem.predictors.includes(d) ? 'Loose' : 'Predictors', d);
                    forceDiagramState.setSelectedPebble(d);
                    app.resetPeek();
                }
            },
            {
                id: 'Target',
                name: 'Target',
                attrs: {fill: common.gr2Color},
                onclick: d => {
                    setGroup(problem, problem.targets.includes(d) ? 'Loose' : 'Targets', d);
                    forceDiagramState.setSelectedPebble(d);
                    app.resetPeek();
                }
            },
        ]
    },
    {
        id: 'GroupLabel',
        name: 'Structural',
        attrs: {fill: common.nomColor},
        onclick: forceDiagramState.setSelectedPebble,
        children: [
            {
                id: 'Nominal',
                name: 'Nominal',
                attrs: {fill: common.nomColor},
                onclick: d => setLabel(problem, 'nominal', d)
            },
            {
                id: 'Cross',
                name: 'Cross',
                attrs: {fill: common.csColor},
                onclick: d => setLabel(problem, 'crossSection', d)
            },
            {
                id: 'Time',
                name: 'Time',
                attrs: {fill: common.timeColor},
                onclick: d => setLabel(problem, 'time', d)
            },
            {
                id: 'Exogenous',
                name: 'Exog',
                attrs: {fill: common.exogenousColor},
                onclick: d => setLabel(problem, 'exogenous', d)
            }
        ]
    }
].filter(_ => _);

let setLabel = (problem, label, name) => {
    if (label === 'nominal') {
        if (app.variableSummaries[name].numchar === 'character') {
            app.alertLog(`Cannot convert column "${name}" to numeric, because the column is character-based.`);
            return;
        }
        if (problem.tags.nominal.includes(name)) {
            app.remove(problem.tags.crossSection, name);
            app.remove(problem.tags.boundary, name);
            app.remove(problem.tags.location, name);
            app.remove(problem.tags.indexes, name);
        }
        delete problem.unedited;
        app.toggle(problem.tags.nominal, name);
    }

    delete problem.unedited;

    if (label === 'crossSection') {
        if (!problem.tags.crossSection.includes(name)) {
            app.remove(problem.tags.weights, name);
        }
        app.toggle(problem.tags.crossSection, name);
    }

    if (label === 'location') {
        if (!problem.tags.location.includes(name)) {
            app.remove(problem.tags.boundary, name);
            app.remove(problem.tags.time, name);
            app.remove(problem.tags.weights, name);
            app.remove(problem.tags.indexes, name);
            app.add(problem.tags.nominal, name);
        }
        app.toggle(problem.tags.location, name);
    }

    if (label === 'boundary') {
        if (!problem.tags.boundary.includes(name)) {
            app.remove(problem.tags.location, name);
            app.remove(problem.tags.time, name);
            app.remove(problem.tags.weights, name);
            app.remove(problem.tags.indexes, name);
            app.add(problem.tags.nominal, name);
        }
        app.toggle(problem.tags.boundary, name);
    }

    if (label === 'time') {
        if (!problem.tags.time.includes(name)) {
            app.remove(problem.tags.location, name);
            app.remove(problem.tags.boundary, name);
        }
        app.toggle(problem.tags.time, name);
    }

    if (label === 'weights') {
        if (app.variableSummaries[name].numchar === 'character') {
            app.alertLog(`Cannot label column "${name}" to weight, because the column is character-based.`);
            return;
        }
        if (!problem.tags.weights.includes(name)) {
            app.remove(problem.tags.nominal, name);
            app.remove(problem.tags.crossSection, name);
            app.remove(problem.tags.boundary, name);
            app.remove(problem.tags.location, name);
            app.remove(problem.tags.time, name);
            app.remove(problem.tags.indexes, name);
        }
        if (problem.tags.weights.includes(name))
            problem.tags.weights = [];
        else
            problem.tags.weights = [name];
    }

    if (label === 'privileged') {
        if (!problem.tags.privileged.includes(name)) {
            app.remove(problem.tags.indexes, name);
        }
        app.toggle(problem.tags.privileged, name);
    }
    if (label === 'exogenous') {
        if (!problem.tags.exogenous.includes(name)) {
            app.remove(problem.tags.indexes, name);
        }
        app.toggle(problem.tags.exogenous, name);
    }

    if (label === 'indexes') {
        if (!problem.tags.indexes.includes(name)) {
            app.remove(problem.tags.boundary, name);
            app.remove(problem.tags.location, name);
            app.remove(problem.tags.weights, name);
            app.remove(problem.tags.time, name);
        }
        if (problem.tags.indexes.includes(name))
            problem.tags.indexes = [];
        else
            problem.tags.indexes = [name];
    }
    forceDiagramState.setSelectedPebble(name);
    app.resetPeek()
};

// Used for left panel variable search
export let variableSearchText = "";
export let setVariableSearchText = text => variableSearchText = text.toLowerCase();


// creates a new problem from the force diagram problem space and adds to disco
export async function addProblemFromForceDiagram() {
    let problemCopy = app.getProblemCopy(app.getSelectedProblem());
    app.workspace.raven_config.problems[problemCopy.problemId] = problemCopy;

    app.setSelectedProblem(problemCopy.problemId);
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
            "targets": problem.targets.map((target, i) => ({
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

        if(problem.manipulations.length === 0){
            // construct and write out the api call and problem description for each discovered problem
            let problemApiCall = solverD3M.GRPC_SearchSolutionsRequest(problem, 10);
            let problemProblemSchema = D3M_problemDoc(problem);
            let filename_api = problem.problemId + '/ss_api.json';
            let filename_ps = problem.problemId + '/problem_schema.json';
            m.request(D3M_SVC_URL + '/store-user-problem', {
                method: 'POST',
                data: {filename: filename_api, data: problemApiCall}
            });
            m.request(D3M_SVC_URL + '/store-user-problem', {
                method: 'POST',
                data: {filename: filename_ps, data: problemProblemSchema}
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
        data: {filename: 'labels.csv', data: outputCSV.join('\n')}
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
