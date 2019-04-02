import $ from 'jquery';
// import 'bootstrap/dist/css/bootstrap.css';

import 'bootstrap';
import 'bootswatch/dist/materia/bootstrap.css';
import '../css/app.css';
import '../../node_modules/hopscotch/dist/css/hopscotch.css';


import hopscotch from 'hopscotch';

import m from 'mithril';

import * as app from './app';
import * as exp from './explore';
import * as plots from './plots';

import * as manipulate from './manipulations/manipulate';

import PanelButton from './views/PanelButton';
import Subpanel from './views/Subpanel';
import Flowchart from './views/Flowchart';
import Icon from './views/Icon';

import * as common from '../common/common';
import ButtonRadio from '../common/views/ButtonRadio';
import Button from '../common/views/Button';
import Dropdown from '../common/views/Dropdown';
import Footer from '../common/views/Footer';
import Header from '../common/views/Header';
import MenuTabbed from '../common/views/MenuTabbed';
import Modal from '../common/views/Modal';
import ModalVanilla from "../common/views/ModalVanilla";
import Panel from '../common/views/Panel';
import PanelList from '../common/views/PanelList';
import Peek from '../common/views/Peek';
import DataTable from './views/DataTable';
import Table from '../common/views/Table';
import ListTags from "../common/views/ListTags";
import TextField from '../common/views/TextField';
import MenuHeaders from "../common/views/MenuHeaders";
import Subpanel2 from '../common/views/Subpanel';

import Datamart, {ModalDatamart} from "../common/TwoRavens/Datamart";
// EVENTDATA
import Body_EventData from './eventdata/Body_EventData';
import ConfusionMatrix from "./views/ConfusionMatrix"

import vegaEmbed from "vega-embed";
import PreprocessInfo from "./PreprocessInfo";
import ForceDiagram from "./views/ForceDiagram";
import ButtonLadda from "./views/LaddaButton";
import TwoPanel from "../common/views/TwoPanel";

export let bold = value => m('div', {style: {'font-weight': 'bold', display: 'inline'}}, value);
export let italicize = value => m('div', {style: {'font-style': 'italic', display: 'inline'}}, value);
export let link = url => m('a', {href: url, style: {color: 'darkblue'}, target: '_blank', display: 'inline'}, url);


// adding problemID and version for Preprocess API part
let version = 1;
let nodesExplore = [];

function leftpanel(mode) {

    if (mode === 'manipulate')
        return manipulate.leftpanel();

    let selectedDataset = app.getSelectedDataset();
    let selectedProblem = app.getSelectedProblem();
    if (!selectedDataset) return;

    let sections = [];

    // VARIABLES TAB
    if (selectedProblem) {
        // base dataset variables, then transformed variables from the problem
        let leftpanelVariables = Object.keys(selectedProblem.summaries);

        // if no search string, match nothing
        let matchedVariables = app.variableSearchText.length === 0 ? []
            : leftpanelVariables.filter(variable => variable.toLowerCase().includes(app.variableSearchText)
                || (selectedProblem.summaries.label || "").toLowerCase().includes(app.variableSearchText));

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
                        oninput: app.setVariableSearchText,
                        onblur: app.setVariableSearchText,
                        value: app.variableSearchText
                    }),
                    m(PanelList, {
                        id: 'varList',
                        items: leftpanelVariables,
                        colors: {
                            [app.hexToRgba(common.selVarColor)]: app.is_explore_mode ? selectedProblem.loose : nodesExplore.map(node => node.name),
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

                            if (selectedProblem.predictors.includes(x))
                                app.remove(selectedProblem.predictors, x);
                            else if (selectedProblem.targets.includes(x))
                                app.remove(selectedProblem.targets, x);
                            else if (selectedProblem.tags.loose.includes(x))
                                app.remove(selectedProblem.tags.loose, x);
                            else selectedProblem.tags.loose.push(x);
                        },
                        popup: {content: variable => app.popoverContent(selectedProblem.summaries[variable])},
                        attrsItems: {'data-placement': 'right', 'data-original-title': 'Summary Statistics'},
                    }),
                    m(Button, {
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
    let problems = selectedDataset.problems;

    let allMeaningful = Object.keys(problems).every(probID => problems[probID].meaningful);
    let discoveryAllCheck = m('input#discoveryAllCheck[type=checkbox]', {
        onclick: m.withAttr("checked", app.setCheckedDiscoveryProblem),
        checked: allMeaningful,
        title: `mark ${allMeaningful ? 'no' : 'all'} problems as meaningful`
    });

    let discoveryHeaders = [
        'problemID',
        m('[style=text-align:center]', 'Meaningful', m('br'), discoveryAllCheck),
        'User', 'Target', 'Predictors',
        Object.values(problems).some(prob => prob.model !== 'modelUndefined') ? 'Model' : '',
        'Task',
        Object.values(problems).some(prob => prob.subTask !== 'taskSubtypeUndefined') ? 'Subtask' : '',
        'Metric', 'Manipulations'
    ];

    let formatProblem = problem => [
        problem.problemID, // this is masked as the UID
        m('input[type=checkbox][style=width:100%]', {
            onclick: m.withAttr("checked", checked => app.setCheckedDiscoveryProblem(checked, problem.problemID)),
            checked: problem.meaningful,
            title: `mark ${problem.problemID} as meaningful`
        }),
        problem.system === 'user' && m('div[title="user created problem"]', m(Icon, {name: 'person'})),
        problem.targets.join(', '),
        problem.predictors.join(', '),
        problem.model === 'modelUndefined' || !problem.model ? '' : problem.model,
        problem.task,
        problem.subTask === 'taskSubtypeUndefined' ? '' : problem.subTask, // ignore taskSubtypeUndefined
        problem.metric,
        m('',
            problem.manipulations.length !== 0 && m(
                'div[style=width:100%;text-align:center]', m(Button, {
                    disabled: problem === selectedProblem && app.rightTab === 'Manipulate' && common.panelOpen['right'],
                    title: `view manipulations for ${problem.problemID}`,
                    onclick: () => {
                        app.setRightTab('Manipulate');
                        common.setPanelOpen('right');
                    }
                }, 'View')),
            problem === selectedProblem && m(Button, {
                id: 'btnSaveProblem',
                onclick: () => {
                    let problemCopy = app.getProblemCopy(app.getSelectedProblem());
                    selectedDataset.problems[problemCopy.problemID] = problemCopy;
                }
            }, 'Save')
        )
    ];
    sections.push({
        value: 'Discover',
        attrsInterface: {class: app.buttonClasses.btnDiscover}, // passed into button
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
                [
                    selectedProblem && m('h4.card-header.clearfix', 'Current Problem'),
                    selectedProblem && m(Table, {
                        id: 'discoveryTableManipulations',
                        headers: discoveryHeaders,
                        data: [formatProblem(selectedProblem)],
                        activeRow: selectedDataset.selectedProblem,
                        showUID: false,
                        abbreviation: 40
                    }),
                    m('h4.card-header', 'All Problems')
                ],
                m(Table, {
                    id: 'discoveryTable',
                    headers: discoveryHeaders,
                    data: [ // I would sort system via (a, b) => a.system === b.system ? 0 : a.system === 'user' ? -1 : 1, but javascript sort isn't stable
                        ...Object.values(problems).filter(prob => prob.system === 'user'),
                        ...Object.values(problems).filter(prob => prob.system !== 'user')
                    ].map(formatProblem),
                    activeRow: selectedDataset.resultsProblem,
                    onclick: problemID => {
                        if (selectedProblem.problemID === problemID) return;
                        delete problems[selectedProblem.problemID];
                        let copiedProblem = app.getProblemCopy(problems[problemID]);
                        problems[copiedProblem.problemID] = copiedProblem;
                        app.setSelectedProblem(copiedProblem.problemID);
                    },
                    showUID: false,
                    abbreviation: 40,
                    sortable: true
                })),
            selectedProblem && m(TextField, {
                id: 'discoveryInput',
                textarea: true,
                style: {width: '100%', height: 'calc(20% - 50px)', overflow: 'auto'},
                value: selectedProblem.description || app.getDescription(selectedProblem), // description is autogenerated if not edited
                oninput: value => selectedProblem.description = value,
                onblur: value => selectedProblem.description = value
            }),
            selectedProblem && m(Button, {
                id: 'btnDelete',
                disabled: selectedProblem || selectedProblem.system === 'auto',
                style: 'float:right',
                onclick: () => setTimeout(() => app.deleteProblem(selectedProblem.problemID, version, 'id_000003'), 500),
                title: 'Delete the user created problem'
            }, 'Delete Problem'),
            !app.is_explore_mode && m(ButtonLadda, {
                id: 'btnSubmitDisc',
                class: app.buttonClasses.btnSubmitDisc,
                activeLadda: app.buttonLadda.btnSubmitDisc,
                style: {float: 'right'},
                onclick: app.submitDiscProb,
                title: 'Submit all checked discovered problems'
            }, 'Submit Disc. Probs.')
        ]
    });

    return m(Panel, {
        side: 'left',
        label: 'Data Selection',
        hover: !(app.is_manipulate_mode || app.rightTab === 'Manipulate'),
        width: app.modelLeftPanelWidths[app.leftTab],
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
        // attrsAll: {style: {height: 'calc(100% - 39px)'}},
        currentTab: app.leftTab,
        callback: app.setLeftTab,
        sections: sections.concat([
            {
                value: app.preprocessTabName,
                id: 'preprocessInfoTab',
                display: 'none',
                title: 'Data Log',
                contents: m(PreprocessInfo,{})
            },
            {
                value: 'Augment',
                contents: m(Datamart, {
                    preferences: app.datamartPreferences,
                    dataPath: selectedDataset.datasetUrl,
                    endpoint: app.datamartURL,
                    labelWidth: '10em'
                })
            },
            {
                value: 'Summary',
                title: 'Select a variable from within the visualization in the center panel to view its summary statistics.',
                display: 'none',
                contents: (app.forceDiagramState.hoverPebble || app.forceDiagramState.selectedPebble) && [
                    m('center',
                        m('b', app.forceDiagramState.hoverPebble || app.forceDiagramState.selectedPebble),
                        m('br'),
                        m('i', (selectedProblem.summaries[app.forceDiagramState.hoverPebble || app.forceDiagramState.selectedPebble] || {}).labl)),
                    m(Table, {
                        id: 'varSummaryTable',
                        data: app.getVarSummary(selectedProblem.summaries[app.forceDiagramState.hoverPebble || app.forceDiagramState.selectedPebble])
                    })
                ]
            }
        ])
    }));
}

function rightpanel(mode) {
    if (mode === 'results') return; // returns undefined, which mithril ignores
    if (mode === 'explore') return;
    if (mode === 'manipulate') return manipulate.rightpanel();

    // mode == null (model mode)

    let sections = [];

    let selectedDataset = app.getSelectedDataset();
    let selectedProblem = app.getSelectedProblem();
    let resultsProblem = app.getResultsProblem();

    // PROBLEM TAB
    selectedDataset && selectedProblem && sections.push({
        value: 'Problem',
        idSuffix: 'Type',
        contents: [
            m(`button#btnLock.btn.btn-default`, {
                class: app.lockToggle ? 'active' : '',
                onclick: () => app.setLockToggle(!app.lockToggle),
                title: 'Lock selection of problem description',
                style: 'float: right',
            }, m(Icon, {name: app.lockToggle ? 'lock' : 'pencil'})),
            m('', {style: 'float: left'},
                m(Dropdown, {
                    id: 'taskType',
                    items: Object.keys(app.d3mTaskType),
                    activeItem: selectedProblem.task,
                    onclickChild: child => {
                        selectedProblem.task = child;
                        selectedProblem.model = 'modelUndefined';
                        // will trigger the call to solver, if a menu that needs that info is shown
                        app.setSolverPending(true);
                    },
                    style: {'margin-bottom': '1em'},
                    disabled: app.lockToggle
                }),
                m(Dropdown, {
                    id: 'taskSubType',
                    items: Object.keys(app.d3mTaskSubtype),
                    activeItem: selectedProblem.subTask,
                    onclickChild: child => {
                        selectedProblem.subTask = child;
                        // will trigger the call to solver, if a menu that needs that info is shown
                        app.setSolverPending(true);
                    },
                    style: {'margin-bottom': '1em'},
                    disabled: app.lockToggle
                }),
                m(Dropdown, {
                    id: 'performanceMetrics',
                    items: Object.keys(app.d3mMetrics),
                    activeItem: selectedProblem.metric,
                    onclickChild: child => {
                        selectedProblem.metric = child;
                        // will trigger the call to solver, if a menu that needs that info is shown
                        app.setSolverPending(true);
                    },
                    style: {'margin-bottom': '1em'},
                    disabled: app.lockToggle
                }),
                app.twoRavensModelTypes[selectedProblem.task] && m(Dropdown, {
                    id: 'modelType',
                    items: app.twoRavensModelTypes[selectedProblem.task],
                    activeItem: selectedProblem.model,
                    onclickChild: child => {
                        selectedProblem.model = child;
                        // will trigger the call to solver, if a menu that needs that info is shown
                        app.setSolverPending(true);
                    },
                    style: {'margin-bottom': '1em'},
                    disabled: app.lockToggle
                }),
            )
        ]
    });

    // MANIPULATE TAB
    selectedDataset && selectedProblem && sections.push({
        value: 'Manipulate',
        title: 'Apply transformations and subsets to a problem',
        contents: m(MenuHeaders, {
            id: 'aggregateMenu',
            attrsAll: {style: {height: '100%', overflow: 'auto'}},
            sections: [
                app.getSelectedDataset().hardManipulations.length !== 0 && {
                    value: 'Dataset Pipeline',
                    contents: m(manipulate.PipelineFlowchart, {
                        compoundPipeline: app.getSelectedDataset().hardManipulations,
                        pipelineId: app.selectedDataset,
                        editable: false
                    })
                },
                {
                    value: 'Problem Pipeline',
                    contents: [
                        m(manipulate.PipelineFlowchart, {
                            compoundPipeline: selectedProblem.manipulations,
                            pipelineId: selectedProblem.problemID,
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

    // RESULTS TAB
    if (selectedDataset && resultsProblem) {
        // reload the results if on the results tab and there are pending changes
        // Automatic reloading only when running in TwoRavens mode
        if (!IS_D3M_DOMAIN && app.rightTab === 'Results' && app.solverPending) app.callSolver(app.getSelectedProblem());

        let plotScatter = ({state, attrs, dom}) => {
            let xData = {};
            let yData = {};

            [...app.selectedPipelines].forEach((pipelineID) => {
                let xDataGroup = app.pipelineAdapter[pipelineID].actualValues;
                let yDataGroup = app.pipelineAdapter[pipelineID].fittedValues;

                if (xDataGroup && yDataGroup) {
                    Object.assign(xData, {[pipelineID]: xDataGroup});
                    Object.assign(yData, {[pipelineID]: yDataGroup})
                }
            });

            vegaEmbed(dom, plots.vegaScatter(
                xData, yData,
                "Actuals", "Predicted",
                "Actuals vs. Predicted: Pipeline " + selectedProblem.problemID,
                "pipeline"
            ), {actions: false, width: dom.offsetWidth, height: dom.offsetHeight});
        };

        let firstSelectedPipelineID = app.selectedPipelines.values().next().value;

        let confusionData = [];
        let showPredictionSummary = (common.panelOpen['right'] && app.rightTab === 'Results'
            && app.selectedResultsMenu === 'Prediction Summary' && firstSelectedPipelineID in app.pipelineAdapter);
        if (showPredictionSummary && selectedProblem.task === 'classification')
            confusionData = [...app.selectedPipelines]
                .map(pipelineID => Object.assign({pipelineID}, app.generateConfusionData(
                    app.pipelineAdapter[pipelineID].actualValues,
                    app.pipelineAdapter[pipelineID].fittedValues, app.confusionFactor) || {}))
                .filter(instance => 'data' in instance)
                .sort((a, b) => app.sortPipelineTable(app.pipelineAdapter[a.pipelineID].score, app.pipelineAdapter[b.pipelineID].score));

        // only called if the pipeline flowchart is rendered
        let pipelineFlowchartPrep = pipeline => {
            let steps = pipeline.steps.map((pipeStep, i) => ({
                key: 'Step ' + i,
                color: common.grayColor,
                // special coloring is not enabled for now
                // color: {
                //     'data': common.grayColor,
                //     'byudml': common.dvColor,
                //     'sklearn_wrap': common.csColor
                // }[pipeStep.primitive.python_path.split('.')[2]] || common.grayColor,
                // the table is overkill, but we could certainly add more info here
                summary: m(Table, {
                    id: 'pipelineFlowchartSummary' + i,
                    abbreviation: 40,
                    data: {
                        'Name': pipeStep['primitive']['primitive'].name,
                        // 'Method': pipeStep['primitive']['primitive']['pythonPath'].split('.').slice(-1)[0]
                    },
                    attrsAll: {style: {'margin-bottom': 0, padding: '1em'}}
                }),
                content: m(Table, {
                    id: 'pipelineTableStep' + i,
                    abbreviation: 40,
                    data: pipeStep,
                    nest: true
                })
            }));

            let inputs = 'inputs' in pipeline && m(Table, {
                id: 'pipelineInputsTable',
                data: pipeline.inputs,
                attrsAll: {style: {'margin-bottom': 0, 'padding': '1em'}}
            });
            let outputs = 'outputs' in pipeline && m(Table, {
                id: 'pipelineOutputsTable',
                data: pipeline.outputs,
                attrsAll: {style: {'margin-bottom': 0, 'padding': '1em'}}
            });

            return [
                {color: common.csColor, key: 'Inputs', summary: inputs, content: inputs},
                ...steps,
                {color: common.csColor, key: 'Outputs', summary: outputs, content: outputs}
            ];
        };

        sections.push({
            value: 'Results',
            display: !app.swandive || IS_D3M_DOMAIN ? 'block' : 'none',
            idSuffix: 'Setx',
            contents: [
                Object.keys(app.pipelineAdapter).length === 0 && m('#loading.loader', {
                    style: {
                        margin: 'auto',
                        position: 'relative',
                        top: '40%',
                        transform: 'translateY(-50%)'
                    }
                }),

                m('#resultsContent', {style: {display: Object.keys(app.pipelineAdapter).length === 0 ? 'none' : 'block', height: '100% '}},
                    m('#setxRight[style=float: right; width: 23%; height: 100%; overflow:auto; margin-right: 1px]',
                        m('div#modelComparisonOption',
                            m('input#modelComparisonCheck[type=checkbox]', {
                                onclick: m.withAttr("checked", app.setModelComparison),
                                checked: app.modelComparison,
                                style: {margin: '.25em'}
                            }),
                            m('label#modelComparisonLabel', {
                                title: 'select multiple models to compare',
                                style: {display: 'inline-block'}
                            }, 'Model Comparison')
                        ),
                        app.selectedPipelines.size > 0 && [
                            bold('Score Metric: '), resultsProblem.metric, m('br'),
                            (app.reverseSet.includes(resultsProblem.metric)
                                ? 'Smaller' : 'Larger') + ' numbers are better fits'
                        ],
                        m(Table, {
                            id: 'pipelineTable',
                            headers: ['PipelineID', 'Score'],
                            data: Object.keys(app.pipelineAdapter)
                                .filter(pipelineID => pipelineID !== 'rookpipe')
                                .map(pipelineID => [pipelineID, app.pipelineAdapter[pipelineID].score]),
                            sortHeader: 'Score',
                            sortFunction: app.sortPipelineTable,
                            activeRow: app.selectedPipelines,
                            onclick: app.setSelectedPipeline,
                            tableTags: m('colgroup',
                                m('col', {span: 1}),
                                m('col', {span: 1, width: '30%'}))
                        })),

                    m(ButtonRadio, {
                        id: 'resultsButtonBar',
                        attrsAll: {style: {width: 'auto'}},
                        attrsButtons: {class: ['btn-sm'], style: {width: 'auto'}},
                        onclick: app.setSelectedResultsMenu,
                        activeSection: app.selectedResultsMenu,
                        sections: [
                            {value: 'Problem Description', id: 'btnPredData'},
                            {value: 'Prediction Summary', id: 'btnPredPlot'},
                            {value: 'Generate New Predictions', id: 'btnGenPreds', attrsInterface: {disabled: app.modelComparison || String(firstSelectedPipelineID).includes('raven')}},
                            {value: 'Visualize Pipeline', id: 'btnVisPipe', attrsInterface: {disabled: app.modelComparison || String(firstSelectedPipelineID).includes('raven')}},
                            {value: 'Solution Table', id: 'btnSolTable', attrsInterface: {disabled: app.modelComparison || !String(firstSelectedPipelineID).includes('raven')}}
                        ]
                    }),
                    resultsProblem && m(`div#problemDescription`, {
                        display: app.selectedResultsMenu === 'Problem Description' ? 'block' : 'none',
                        height: "calc(100% - 30px)",
                        overflow: "auto",
                        width: "70%"
                    },
                    m(Table, {
                        headers: ['Variable', 'Data'],
                        data: [
                            ['Dependent Variable', resultsProblem.targets],
                            ['Predictors', resultsProblem.predictors],
                            ['Description', resultsProblem.description],
                            ['Task', resultsProblem.task],
                            ['Model', resultsProblem.model]
                        ],
                        nest: true,
                        attrsAll: {
                            style: {
                                width: 'calc(100% - 2em)',
                                overflow: 'auto',
                                border: '1px solid #ddd',
                                margin: '1em',
                                'box-shadow': '0px 5px 10px rgba(0, 0, 0, .2)'
                            }
                        }
                    })
                    // m('#setPredictionDataLeft[style=display:block; width: 100%; height:100%; margin-top:1em; overflow: auto; background-color: white; padding : 1em; margin-top: 1em]')
                    ),
                    m(`div#predictionSummary`, {
                            display: app.selectedResultsMenu === 'Prediction Summary' ? 'block' : 'none',
                            height:"calc(100% - 30px)",
                            overflow: "auto",
                            width: "70%"
                        },
                        m('#setxLeftPlot[style=float:left; background-color:white; overflow:auto;]'),
                        m('#setxLeft[style=display:none; float: left; overflow: auto; background-color: white]'),

                        showPredictionSummary && selectedProblem.task === 'regression' && [...app.selectedPipelines].some(pipeID => app.pipelineAdapter[pipeID].fittedValues) && m('#resultsScatter', {
                            oncreate(vnode) {
                                plotScatter(vnode)
                            },
                            onupdate(vnode) {
                                this.pipelinesShown = this.pipelinesShown || [];
                                if (this.pipelinesShown.length !== app.selectedPipelines.size || this.pipelinesShown.some(a => !app.selectedPipelines.has(a))) {
                                    this.pipelinesShown = [...app.selectedPipelines];
                                    plotScatter(vnode);
                                }
                            },
                            style: {width: '100%', height: 'calc(100% - 30px)'}
                        }),

                        confusionData.map((confusionInstance, i) => [
                            i === 0 && m('div[style=margin-top:.5em]',
                                m('label#confusionFactorLabel', 'Confusion Matrix Factor: '),
                                m('[style=display:inline-block]', m(Dropdown, {
                                    id: 'confusionFactorDropdown',
                                    items: ['undefined', ...confusionInstance.allClasses],
                                    activeItem: app.confusionFactor,
                                    onclickChild: app.setConfusionFactor,
                                    style: {'margin-left': '1em'}
                                }))),
                            confusionInstance.data.length === 2 && m(Table, {
                                id: 'resultsPerformanceTable',
                                headers: ['metric', 'score'],
                                data: app.generatePerformanceData(confusionInstance.data),
                                attrsAll: {style: {width: 'calc(100% - 2em)', margin: '1em'}}
                            }),
                            confusionInstance.data.length < 100 ? m(ConfusionMatrix, Object.assign({}, confusionInstance, {
                                id: 'resultsConfusionMatrixContainer' + confusionInstance.pipelineID,
                                title: "Confusion Matrix: Pipeline " + confusionInstance.pipelineID,
                                startColor: '#ffffff', endColor: '#e67e22',
                                margin: {left: 10, right: 10, top: 50, bottom: 10},
                                attrsAll: {
                                    style: {height: '600px'},
                                }
                            })) : 'Too many classes for confusion matrix!'
                        ])
                    ),
                    m(`#setxLeftGen[style=display:${app.selectedResultsMenu === 'Generate New Predictions' ? 'block' : 'none'}; float: left; width: 70%; height:calc(100% - 30px); overflow: auto; background-color: white]`,
                        m('#setxLeftTop[style=display:block; float: left; width: 100%; height:50%; overflow: auto; background-color: white]',
                            m('#setxLeftTopLeft[style=display:block; float: left; width: 30%; height:100%; overflow: auto; background-color: white]'),
                            m('#setxLeftTopRight[style=display:block; float: left; width: 70%; height:100%; overflow: auto; background-color: white]')),
                        m('#setxLeftBottomLeft[style=display:block; float: left; width: 70%; height:50%; overflow: auto; background-color: white]',
                            // m(PanelList, {
                            //     id: 'setxLeftBottomLeftList',
                            //     items: app.pipelineAdapter[firstSelectedPipelineID].predictors,
                            //     colors: {
                            //         [app.hexToRgba(common.selVarColor)]: [...(this.selectedPredictors || new Set())]
                            //     },
                            //     callback: variable => {
                            //         this.selectedPredictors = this.selectedPredictors || new Set();
                            //         this.selectedPredictors.has(variable)
                            //             ? this.selectedPredictors.delete(variable)
                            //             : this.selectedPredictors.add(variable);
                            //     }
                            // })
                        ),
                        m('#setxLeftBottomRightTop[style=display:block; float: left; width: 30%; height:10%; overflow: auto; background-color: white]',
                            // m(PanelButton, {
                            //     id: 'btnExecutePipe',
                            //     classes: 'btn-default.ladda-button[data-spinner-color=#000000][data-style=zoom-in]',
                            //     onclick: app.executepipeline,
                            //     style: {
                            //         display: app.selectedPipelines.size === 0 ? 'none' : 'block',
                            //         float: 'left',
                            //         'margin-right': '10px'
                            //     },
                            //     title: 'Execute pipeline'
                            // }, m('span.ladda-label[style=pointer-events: none]', 'Execute Generation'))
                        ),
                        m('#setxLeftBottomRightBottom[style=display:block; float: left; width: 30%; height:40%; overflow: auto; background-color: white]')),
                    app.selectedResultsMenu === 'Visualize Pipeline' && app.selectedPipelines.size === 1 && [...app.selectedPipelines][0] in resultsProblem.solutions.d3m && m('div', {
                        style: {
                            width: '70%',
                            height: 'calc(100% - 30px)',
                            overflow: 'auto'
                        }
                    },
                    m('div', {style: {'font-weight': 'bold', 'margin': '1em'}}, 'Overview: '),
                    m(Table, {
                        id: 'pipelineOverviewTable',
                        data: Object.keys(resultsProblem.solutions.d3m[[...app.selectedPipelines][0]].pipeline).reduce((out, entry) => {
                            if (['inputs', 'steps', 'outputs'].indexOf(entry) === -1)
                                out[entry] = resultsProblem.solutions.d3m[[...app.selectedPipelines][0]].pipeline[entry];
                            return out;
                        }, {}),
                        attrsAll: {
                            style: {
                                margin: '1em',
                                width: 'calc(100% - 2em)',
                                border: common.borderColor,
                                'box-shadow': '0px 5px 5px rgba(0, 0, 0, .2)'
                            }
                        },
                        nest: true
                    }),
                    m('div', {style: {'font-weight': 'bold', 'margin': '1em'}}, 'Steps: '),
                    m(Flowchart, {
                        labelWidth: '5em',
                        steps: pipelineFlowchartPrep(resultsProblem.solutions.d3m[[...app.selectedPipelines][0]].pipeline)
                    })),
                    // TODO: call solver backend has changed, stargazer may not behave the same anymore
                    m(`div#solutionTable[style=display:${app.selectedResultsMenu === 'Solution Table' ? 'block' : 'none'};height:calc(100% - 30px); overflow: auto; width: 70%;]`,
                        firstSelectedPipelineID in resultsProblem.solutions.rook && m(DataTable, {
                            data: resultsProblem.solutions.rook[firstSelectedPipelineID].stargazer,
                            variable: app.pipelineAdapter[firstSelectedPipelineID].targets
                        })
                    )
                )]
        });
    }

    // },{
    // value: 'Discovery',
    //  idSuffix: 'disc',
    //  contents: [
    //    m(ButtonRadio, {
    //        id: 'discoveryButtonBar',
    //        attrsAll: {style: {'margin-left':'5%',width: 'auto'}},
    //        attrsButtons: {class: ['btn-sm'], style: { padding:'0.5em',width:'auto'}},
    //        onclick: app.setSelectedDiscoverySolutionMenu,
    //        activeSection: app.selectedDiscoverySolutionMenu,
    //        sections: [
    //            {value: 'Prediction Data', id: 'btnPredData'},
    //            {value: 'Solution Plot', id: 'btnSolPlot'}
    //        ]
    //    }),
    //     m('div', {style: {'font-weight': 'bold', 'margin': '1em', 'height': '100%', 'float':'right', 'width': '50%' }},
    //    m(DataTable, {data: app.stargazer})),
    //    m(`div#predictionData[style=display:${app.selectedDiscoverySolutionMenu === 'Prediction Data' ? 'block' : 'none'};height:"90%"; overflow: auto; width: 50%, 'float':'left']`,
    //      m('#setPredictionDataLeft[style=display:block; float: left; width: 100%; height:100%; margin-top:1em; overflow: auto; background-color: white]')
    //    ),
    //    m(`div#solutionPlot[style=display:${app.selectedDiscoverySolutionMenu === 'Solution Plot' ? 'block' : 'none'};height:"90%"; overflow: auto; width: 50%, 'float':'left']`,
    //          m('#setPredictionSolutionPlot[style=display:block; float: left; width: 100%; height:100%; overflow: auto; background-color: black]')
    //    )
    //  ]}

    return selectedDataset && m(Panel, {
            side: 'right',
            label: 'Model Selection',
            hover: true,
            width: app.modelRightPanelWidths[app.rightTab],
            attrsAll: {
                onclick: () => app.setFocusedPanel('right'),
                style: {
                    'z-index': 100 + (app.focusedPanel === 'right'),
                    height: `calc(100% - ${common.heightHeader} - 2*${common.panelMargin} - ${app.peekInlineShown ? app.peekInlineHeight : '0px'} - ${common.heightFooter})`,
                }
            }
        },
        m(MenuTabbed, {
            id: 'rightpanelMenu',
            currentTab: app.rightTab,
            callback: app.setRightTab,
            sections,
            // attrsAll: {style: {height: 'calc(100% - 39px)'}}
        })
    );
}

class Body {
    oninit() {
        app.setRightTab(IS_D3M_DOMAIN ? 'Problem' : 'Models');
        app.set_mode('model');

        this.cite = false;
        this.citeHidden = false;
    }

    oncreate() {
        let extract = (name, key, offset, replace) => {
            key = key + '=';
            let loc = window.location.toString();
            let val = loc.indexOf(key) > 0 ? loc.substring(loc.indexOf(key) + offset) : '';
            let idx = val.indexOf('&');
            val = idx > 0 ? val.substring(0, idx) : val;
            val = val.replace('#!/model', '');
            console.log(name, ': ', val);
            return replace ?
                val
                    .replace(/%25/g, '%')
                    .replace(/%3A/g, ':')
                    .replace(/%2F/g, '/')
                : val;
        };
        app.main(
            extract('fileid', 'dfId', 5),
            extract('hostname', 'host', 5),
            extract('ddiurl', 'ddiurl', 7, true),
            extract('dataurl', 'dataurl', 8, true),
            extract('apikey', 'key', 4));
    }

    view(vnode) {
        let {mode, variate, vars} = vnode.attrs;

        // after calling m.route.set, the params for mode, variate, vars don't update in the first redraw.
        // checking window.location.href is a workaround, permits changing mode from url bar
        if (window.location.href.includes(mode) && mode !== app.currentMode)
            app.set_mode(mode);

        let expnodes = [];
        vars = vars ? vars.split('/') : [];

        let exploreVars = (() => {
            vars.forEach(x => {
                let node = findNode(x);
                node && expnodes.push(node);
            });
            if (variate === "problem") {
                return m('', [
                    m('#plot', {style: 'display: block', oncreate: _ => exp.plot([], "", app.getSelectedProblem())})
                ]);
            }
            if (!expnodes[0] && !expnodes[1]) {
                return;
            }

            let plotMap = {
                scatter: "Scatter Plot",
                tableheat: "Heatmap",
                line: "Line Chart",
                stackedbar: "Stacked Bar",
                box: "Box Plot",
                groupedbar: "Grouped Bar",
                strip: "Strip Plot",
                aggbar: "Aggregate Bar",
                binnedscatter: "Binned Scatter",
                step: "Step Chart",
                area: "Area Chart",
                binnedtableheat: "Binned Heatmap",
                averagediff: "Diff. from Avg.",
                scattermeansd: "Scatter with Overlays",
                scattermatrix: "Scatter Matrix",
                simplebar: "Simple Bar Uni",
                histogram: "Histogram Uni",
                areauni: "Area Chart Uni",
                histogrammean: "Histogram with Mean Uni",
                trellishist: "Histogram Trellis",
                interactivebarmean: "Interactive Bar with Mean",
                dot: "Simple Dot Plot",
                horizon: "Horizon Plot",
                binnedcrossfilter: "Binned Cross Filter",
                scattertri: "Scatterplot with Groups",
                groupedbartri: "Grouped Bar",
                horizgroupbar: "Horizontal Grouped Bar",
                bubbletri: "Bubble Plot with Groups",
                bubbleqqq: "Bubble Plot with Binned Groups",
                scatterqqq: "Interactive Scatterplot with Binned Groups",
                trellisscatterqqn: "Scatterplot Trellis",
                heatmapnnq: "Heatmap with Mean Z",
                dotdashqqn: "Dot-dash Plot",
                tablebubblennq: "Table Bubble Plot",
                stackedbarnnn: "Stacked Bar Plot",
                facetbox: "Faceted Box Plot",
                facetheatmap: "Faceted Heatmap",
                groupedbarnqq: "Grouped Bar with Binned Z"
            };
            let schemas = {
                univariate: 'areauni dot histogram histogrammean simplebar',
                bivariate: 'aggbar area averagediff binnedscatter binnedtableheat box'
                    + ' groupedbar horizon interactivebarmean line scatter scattermatrix scattermeansd stackedbar step strip tableheat trellishist',
                trivariate: 'bubbletri groupedbartri horizgroupbar scattertri bubbleqqq scatterqqq trellisscatterqqn heatmapnnq dotdashqqn tablebubblennq stackedbarnnn facetbox facetheatmap groupedbarnqq',
                multiple: 'binnedcrossfilter scattermatrix'
            };
            let filtered = schemas[variate];
            if (variate === 'bivariate' || variate === 'trivariate') {
                filtered = `${filtered} ${schemas.multiple}`;
            }

            let plot = expnodes[0] && expnodes[0].plottype === 'continuous' ? plots.density : plots.bars;

            return m('', [
                m('', {style: 'margin-bottom: 1em; max-width: 1000px; overflow: scroll; white-space: nowrap'},
                    filtered.split(' ').map(x => {
                        return m("figure", {style: 'display: inline-block'}, [
                            m(`img#${x}_img[alt=${x}][height=140px][width=260px][src=/static/images/${x}.png]`, {
                                onclick: _ => exp.plot(expnodes, x),
                                style: exp.thumbsty(expnodes, x)
//                              style: {border: "2px solid #ddd", "border-radius": "3px", padding: "5px", margin: "3%", cursor: "pointer"}
                            }),
                            m("figcaption", {style: {"text-align": "center"}}, plotMap[x])
                        ]);
                    })),
                m('#plot', {
                    style: 'display: block',
                    oncreate: _ => expnodes.length > 1 ? exp.plot(expnodes) : plot(expnodes[0], 'explore', true)
                })
            ]);
        })();

        let spaceBtn = (id, onclick, title, icon) =>
            m(`button#${id}.btn.btn-default`, {onclick, title, style: {'margin-left': '.5em'}}, icon);
        let discovery = app.leftTab === 'Discover';
        let overflow = app.is_explore_mode ? 'auto' : 'hidden';
        let style = `position: absolute; left: ${app.panelWidth.left}; top: 0; margin-top: 10px`;

        let selectedDataset = app.getSelectedDataset();
        let selectedProblem = app.getSelectedProblem();

        return m('main',
            m(Modal),
            app.alertsShown && m(ModalVanilla, {
                id: 'alertsModal',
                setDisplay: () => {
                    app.alertsLastViewed.setTime(new Date().getTime());
                    app.setAlertsShown(false)
                }
            },[
                m('h4[style=width:3em;display:inline-block]', 'Alerts'),
                m(Button, {
                    title: 'Clear Alerts',
                    style: {display: 'inline-block', 'margin-right': '0.75em'},
                    onclick: () => app.alerts.length = 0,
                    disabled: app.alerts.length === 0
                }, m(Icon, {name: 'check'})),
                app.alerts.length === 0 && italicize('No alerts recorded.'),
                app.alerts.length > 0 && m(Table, {
                    data: [...app.alerts].reverse().map(alert => [
                        alert.time > app.alertsLastViewed && m(Icon, {name: 'primitive-dot'}),
                        m(`div[style=background:${app.hexToRgba({
                            'log': common.menuColor,
                            'warn': common.warnColor,
                            'error': common.errorColor
                        }[alert.type], .5)}]`, alert.time.toLocaleTimeString().replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3")),
                        alert.description
                    ]),
                    attrsAll: {style: {'margin-top': '1em'}},
                    tableTags: m('colgroup',
                        m('col', {span: 1, width: '10px'}),
                        m('col', {span: 1, width: '75px'}),
                        m('col', {span: 1}))
                })
            ]),
            selectedDataset && m(ModalDatamart, {
                preferences: app.datamartPreferences,
                endpoint: app.datamartURL,
                dataPath: selectedDataset.datasetUrl
            }),

            this.header(app.currentMode),
            this.footer(app.currentMode),
            leftpanel(app.currentMode),
            rightpanel(app.currentMode),

            (app.is_manipulate_mode || (app.is_model_mode && app.rightTab === 'Manipulate')) && manipulate.menu([
                ...app.getSelectedDataset().hardManipulations,
                ...app.getSelectedProblem().manipulations
            ],
                app.is_model_mode ? app.getSelectedDataset().selectedProblem : app.selectedDataset),  // the identifier for which pipeline to edit
            app.peekInlineShown && this.peekTable(),

            m(`#main`, {
                    style: {
                        overflow,
                        top: common.heightHeader,
                        height: `calc(100% - ${common.heightHeader} - ${common.heightFooter})`,
                        bottom: common.heightFooter,
                        display: app.is_manipulate_mode || (app.rightTab === 'Manipulate' && manipulate.constraintMenu) ? 'none' : 'block'
                    }
                },
                m("#innercarousel.carousel-inner", {style: {height: '100%', overflow}},
                    app.is_explore_mode && [variate === 'problem' ?
                    m('', {style},
                        m('a', {onclick: _ => m.route.set('/explore')}, '<- back to variables'),
                        m('br'),
                        exploreVars)
                    //                        JSON.stringify(app.disco[app.selectedProblem.problemID]))
                    : exploreVars ?
                        m('', {style},
                            m('a', {onclick: _ => m.route.set('/explore')}, '<- back to variables'),
                            m('br'),
                            exploreVars)
                        : m('', {style},
                            m(ButtonRadio, {
                                id: 'exploreButtonBar',
                                attrsAll: {style: {width: '400px'}},
                                attrsButtons: {class: ['btn-sm']},
                                onclick: x => {
                                    nodesExplore = [];
                                    app.setVariate(x)
                                },
                                activeSection: app.exploreVariate,
                                sections: discovery ? [{value: 'Problem'}] : [{value: 'Univariate'}, {value: 'Bivariate'}, {value: 'Trivariate'}, {value: 'Multiple'}]
                            }),
                            m(PanelButton, {
                                id: 'exploreGo',
                                classes: 'btn-success',
                                onclick: _ => {
                                    let variate = app.exploreVariate.toLowerCase();
                                    let selected = discovery ? [app.getSelectedDataset().selectedProblem] : nodesExplore.map(x => x.name);
                                    let len = selected.length;
                                    if (variate === 'univariate' && len != 1
                                        || variate === 'problem' && len != 1
                                        || variate === 'bivariate' && len != 2
                                        || variate === 'trivariate' && len != 3
                                        || variate === 'multiple' && len < 2) {
                                        return;
                                    }
                                    m.route.set(`/explore/${variate}/${selected.join('/')}`);
                                }
                            }, 'go'),
                            m('br'),
                            m('', {style: 'display: flex; flex-direction: row; flex-wrap: wrap'},
                                (discovery ? app.getSelectedDataset().problems : Object.keys(app.getSelectedProblem().summaries)).map(x => { // entry could either be a problem or a variable name
                                    let selected = discovery ? x === app.getSelectedProblem() : nodesExplore.map(y => y.name).includes(x);
                                    let targetName = x.targets[0] || x;

                                    let show = app.exploreVariate === 'Bivariate' || app.exploreVariate === 'Trivariate';
                                    let [n0, n1, n2] = nodesExplore;
                                    return m('span#exploreNodeBox', {
                                            onclick: _ => discovery ? app.setSelectedProblem(x) : undefined, // used to clickVar if in explore mode, need to debug (Shoeboxam)
                                            onmouseover: function () {
                                                $(this).popover('toggle');
                                                $('body div.popover')
                                                    .addClass('variables');
                                                $('body div.popover div.popover-content')
                                                    .addClass('form-horizontal');
                                            },
                                            onmouseout: "$(this).popover('toggle');",
                                            'data-container': 'body',
                                            'data-content': findNode(targetName).labl || '<i>none provided</i>',
                                            'data-html': 'true',
                                            'data-original-title': 'Description',
                                            'data-placement': 'top',
                                            'data-toggle': 'popover',
                                            'data-trigger': 'hover',
                                            style: {
                                                border: '1px solid rgba(0, 0, 0, .2)',
                                                'border-radius': '5px',
                                                'box-shadow': '0px 5px 10px rgba(0, 0, 0, .2)',
                                                display: 'flex',
                                                'flex-direction': 'column',
                                                height: '250px',
                                                margin: '.5em',
                                                width: '250px',
                                                'align-items': 'center',
                                                'background-color': app.hexToRgba(common[selected ? 'selVarColor' : 'varColor'])
                                            }
                                        }, m('#exploreNodePlot', {
                                            oninit() {
                                                this.node = findNode(x);
                                            },
                                            oncreate(vnode) {
                                                let plot = (this.node || {}).plottype === 'continuous' ? plots.densityNode : plots.barsNode;
                                                this.node && plot(this.node, vnode.dom, 110, true);
                                            },
                                            onupdate(vnode) {
                                                let node = findNode(typeof x === 'object' ? x.targets[0] : x);
                                                if (node && node !== this.node) {
                                                    let plot = node.plottype === 'continuous' ? plots.densityNode : plots.barsNode;
                                                    plot(node, vnode.dom, 110, true);
                                                    this.node = node;
                                                }
                                            },
                                            style: 'height: 65%'
                                        }),
                                        m('#exploreNodeLabel', {style: 'margin: 1em'},
                                            show && n0 && n0.name === x ? `${x} (x)`
                                                : show && n1 && n1.name === x ? `${x} (y)`
                                                : show && n2 && n2.name === x ? `${x} (z)`
                                                    : x.predictors ? [
                                                            m('b', x),
                                                            m('p', x.predictors.join(', '))]
                                                        : x)
                                    );
                                }))
                        )],
                    selectedProblem && m(ForceDiagram, Object.assign(app.forceDiagramState,{
                        // these attributes may change dynamically, (the problem could change)
                        onDragAway: pebble => {
                            app.remove(selectedProblem.tags.loose, pebble);
                            app.remove(selectedProblem.predictors, pebble);
                            app.remove(selectedProblem.targets, pebble);
                            m.redraw();
                        },
                        labels: app.forceDiagramLabels(selectedProblem),
                        mutateNodes: app.mutateNodes(selectedProblem),
                        summaries: selectedProblem.summaries
                    }, app.buildForceData(selectedProblem))),

                    // selectedProblem && m(TwoPanel, {
                    //     left: m(ForceDiagram, Object.assign(app.forceDiagramState,{
                    //         // these attributes may change dynamically, (the problem could change)
                    //         onDragAway: pebble => {
                    //             app.remove(selectedProblem.tags.loose, pebble);
                    //             app.remove(selectedProblem.predictors, pebble);
                    //             app.remove(selectedProblem.targets, pebble);
                    //             m.redraw();
                    //         },
                    //         labels: app.forceDiagramLabels(selectedProblem),
                    //         mutateNodes: app.mutateNodes(selectedProblem),
                    //         summaries: selectedProblem.summaries
                    //     }, app.buildForceData(selectedProblem))),
                    //     right: m(ForceDiagram, Object.assign(app.forceDiagramState,{
                    //         // these attributes may change dynamically, (the problem could change)
                    //         onDragAway: pebble => {
                    //             app.remove(selectedProblem.tags.loose, pebble);
                    //             app.remove(selectedProblem.predictors, pebble);
                    //             app.remove(selectedProblem.targets, pebble);
                    //             m.redraw();
                    //         },
                    //         labels: app.forceDiagramLabels(selectedProblem),
                    //         mutateNodes: app.mutateNodes(selectedProblem),
                    //         summaries: selectedProblem.summaries
                    //     }, app.buildForceData(selectedProblem)))
                    // })
                ),

                app.is_model_mode && m("#spacetools.spaceTool", {style: {right: app.panelWidth.right, 'z-index': 16}}, [
                    spaceBtn('btnAdd', app.addProblemFromForceDiagram, 'add model to problems', m(Icon, {name: 'plus'})),
                    spaceBtn('btnJoin', app.connectAllForceDiagram, 'Make all possible connections between nodes', m(Icon, {name: 'link'})),
                    spaceBtn('btnDisconnect', () => app.forceDiagramState.pebbleLinks = [], 'Delete all connections between nodes', m(Icon, {name: 'circle-slash'})),
                    spaceBtn('btnForce', () => app.forceDiagramState.isPinned = !app.forceDiagramState.isPinned, 'Pin the variable pebbles to the page', m(Icon, {name: 'pin'})),
                    spaceBtn('btnEraser', app.erase, 'Wipe all variables from the modeling space', m(Icon, {name: 'trashcan'}))
                ]),
                app.currentMode !== 'manipulate' && m(Subpanel, {title: "History"}),


                app.currentMode !== 'explore' && selectedProblem && m(Subpanel2, {
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
                    {id: "priorsButton", vars: selectedProblem.predictors, name: 'Priors', borderColor: common.warnColor, innerColor: common.warnColor, width: 0},
                ].filter(group => group.vars.length > 0).map(group =>
                    m(`#${group.id}[style=width:100% !important]`,
                        m(".rectColor[style=display:inline-block]", m("svg[style=width: 20px; height: 20px]",
                            m(`circle[cx=10][cy=10][fill=${group.innerColor}][fill-opacity=0.6][r=9][stroke=${group.borderColor}][stroke-opacity=${group.width}][stroke-width=2]`))),
                        m(".rectLabel[style=display:inline-block;vertical-align:text-bottom;margin-left:.5em]", group.name)))
                ),

                selectedProblem && selectedProblem.manipulations.filter(step => step.type === 'subset').length !== 0 && m(Subpanel2, {
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
            )
        );
    }

    header() {
        let userlinks = username === '' ? [
            {title: "Log in", url: login_url},
            {title: "Sign up", url: signup_url}
        ] : [{title: "Workspaces", url: workspaces_url},
            {title: "Settings", url: settings_url},
            {title: "Links", url: devlinks_url},
            {title: "Logout", url: logout_url}];

        let resultsProblem = app.getResultsProblem();

        return m(Header, {
                image: '/static/images/TwoRavens.png',
                aboutText: 'TwoRavens v0.1 "Dallas" -- ' +
                    'The Norse god Odin had two talking ravens as advisors, who would fly out into the world and report back all they observed. ' +
                    'In the Norse, their names were "Thought" and "Memory". ' +
                    'In our coming release, our thought-raven automatically advises on statistical model selection, ' +
                    'while our memory-raven accumulates previous statistical models from Dataverse, to provide cumulative guidance and meta-analysis.',
                attrsInterface: {style: app.is_explore_mode ? {'background-image': '-webkit-linear-gradient(top, #fff 0, rgb(227, 242, 254) 100%)'} : {}}
            },
            m('div', {style: {'flex-grow': 1}}),
            m('h4#dataName[style=display: inline-block; margin: .25em 1em]', {
                    onclick: _ => this.cite = this.citeHidden = !this.citeHidden,
                    onmouseout: _ => this.citeHidden || (this.cite = false),
                    onmouseover: _ => this.cite = true
                },
                app.selectedDataset || 'Dataset Name'),
            m('div', {style: {'flex-grow': 1}}),
            app.selectedDataset && m('#cite.panel.panel-default',
                {style: `display: ${this.cite ? 'block' : 'none'}; margin-top: 2.5em; right: 50%; width: 380px; text-align: left; z-index: 50; position:absolute`},
                m('.panel-body', IS_D3M_DOMAIN && m(Table, {data: app.getSelectedDataset().datasetDoc.about}))),

            resultsProblem && Object.keys(resultsProblem.solutions.d3m).length > 0 && m(Button, {
                id: 'btnEndSession',
                class: 'ladda-label ladda-button',
                onclick: app.endsession,
                style: {margin: '0.25em 1em', 'data-spinner-color': 'black', 'data-style': 'zoom-in'}
            }, 'Mark Problem Finished'),

            m(Button, {
                id: 'btnReset',
                class: 'ladda-label ladda-button',
                title: 'Reset',
                onclick: app.reset,
                style: {margin: '0.25em 1em', 'data-spinner-color': 'black', 'data-style': 'zoom-in'}
            }, m(Icon, {name: 'sync'})),

            m('div.btn-group.btn-group-toggle[data-toggle=buttons][style=margin:.25em 1em;display:flex]',
                m('button.btn.btn-secondary', {
                    id: 'btnTA2',
                    onclick: _ => hopscotch.startTour(app.mytour(), 0)
                }, 'Help Tour ', m(Icon, {name: 'milestone'})),
                m(Button, {id: 'btnTA2', onclick: _ => app.helpmaterials('video')}, 'Video ', m(Icon, {name: 'file-media'})),
                m(Button, {id: 'btnTA2', onclick: _ => app.helpmaterials('manual')}, 'Manual ', m(Icon, {name: 'file-pdf'}))),

            IS_D3M_DOMAIN && app.is_model_mode && m(ButtonLadda, {
                id: 'btnEstimate',
                class: app.buttonClasses.btnEstimate,
                activeLadda: app.buttonLadda.btnEstimate,
                onclick: app.estimate,
                style: {margin: '0.25em 1em', 'data-spinner-color': 'black', 'data-style': 'zoom-in'}
            }, 'Solve This Problem'),
            // mode !== 'model' ? null : navBtn('btnEstimate.btn-default', 1, 1, app.estimate, m("span.ladda-label", mode === 'explore' ? 'Explore' : 'Solve This Problem'), '150px'),

            m('.dropdown[style=float: right; padding-right: 1em]',
                m('#drop.button.btn[type=button][data-toggle=dropdown][aria-haspopup=true][aria-expanded=false]',
                    [username, " ", m(Icon, {name: 'triangle-down'})]),
                m('ul.dropdown-menu[role=menu][aria-labelledby=drop]',
                    userlinks.map(link => m('a[style=padding: 0.5em]', {href: link.url}, link.title, m('br'))))),
        );
    }

    peekTable() {
        let pipeline = [
            ...app.getSelectedDataset().hardManipulations,
            ...(app.is_model_mode ? app.getSelectedProblem().manipulations : [])
        ];
        if (app.peekInlineShown && !app.peekData && !app.peekIsExhausted) app.resetPeek(pipeline);

        return m('div#previewTable', {
                style: {
                    "position": "fixed",
                    "bottom": common.heightFooter,
                    "height": app.peekInlineHeight,
                    "width": "100%",
                    "border-top": "1px solid #ADADAD",
                    "overflow-y": "scroll",
                    "overflow-x": "auto",
                    'z-index': 100,
                    'background': 'rgba(255,255,255,.6)'
                },
                onscroll: () => {
                    // don't apply infinite scrolling when list is empty
                    if ((app.peekData || []).length === 0) return;

                    let container = document.querySelector('#previewTable');
                    let scrollHeight = container.scrollHeight - container.scrollTop;
                    if (scrollHeight < container.offsetHeight + 100) app.updatePeek(pipeline);
                }
            },
            m('#horizontalDrag', {
                style: {
                    position: 'absolute',
                    top: '-4px',
                    left: 0,
                    right: 0,
                    height: '12px',
                    cursor: 'h-resize',
                    'z-index': 1000
                },
                onmousedown: (e) => {
                    app.setPeekInlineIsResizing(true);
                    document.body.classList.add('no-select');
                    app.peekMouseMove(e);
                }
            }),
            m(Table, {
                id: 'previewTable',
                data: app.peekData || []
            })
        );
    }

    footer(mode) {

        return m(Footer, [
            m(ButtonRadio, {
                id: 'modeButtonBar',
                attrsAll: {style: {margin: '8px', width: 'auto'}, class: 'navbar-left'},
                attrsButtons: {class: 'btn-sm', style: {width: "auto"}},
                onclick: app.set_mode,
                activeSection: mode || 'model',
                sections: [{value: 'Model'}, {value: 'Explore'}], // {value: 'Manipulate'} disabled

                // attrsButtons: {class: ['btn-sm']}, // if you'd like small buttons (btn-sm should be applied to individual buttons, not the entire component)
                // attrsButtons: {style: {width: 'auto'}}
            }),

            m("span", {"class": "footer-info-break"}, "|"),
            m("a", {"href" : "/dev-raven-links", "target": "=_blank"}, "raven-links"),
            m("span", {"class": "footer-info-break"}, "|"),
            m("span", {"class": "footer-info", "id": "ta2-server-name"}, `TA2: ${TA2_SERVER}`),
            m("span", {"class": "footer-info-break"}, "|"),
            m("span", {"style": "color:#337ab7"}, `TA3 API: ${TA3TA2_API_VERSION}`),
            m("span", {"class": "footer-info-break"}, "|"),
            m("span", {"class": "footer-info", "id": "user-workspace-id"}, '(ws)'),
            m("span", {"class": "footer-info-break"}, "|"),

            m(Button, {
                style: {'margin': '8px'},
                title: 'alerts',
                class: ['btn-sm'],
                onclick: () => app.setAlertsShown(true)
            }, m(Icon, {name: 'bell', style: `color: ${app.alerts.length > 0 && app.alerts[0].time > app.alertsLastViewed ? common.selVarColor : '#818181'}`})),
            m('div.btn.btn-group', {style: 'float: right; padding: 0px;margin:5px'},
                m(Button, {
                    class: ['btn-sm'].concat(app.peekInlineShown ? ['active'] : []),
                    onclick: () => app.setPeekInlineShown(!app.peekInlineShown)
                }, 'Peek'),
                m(Button, {onclick: () => window.open('#!/data', 'data'), class: 'btn-sm'}, m(Icon, {name: 'link-external'}))),
            manipulate.totalSubsetRecords !== undefined && m("span.badge.badge-pill.badge-secondary#recordCount", {
                style: {
                    float: 'right',
                    "margin-left": "5px",
                    "margin-top": "10px",
                    "margin-right": "2em"
                }
            }, manipulate.totalSubsetRecords + ' Records')
        ]);
    }
}


if (IS_EVENTDATA_DOMAIN) {
    m.route(document.body, '/home', {
        '/data': {render: () => m(Peek, {id: 'eventdata', image: '/static/images/TwoRavens.png'})},
        '/:mode': Body_EventData
    });
}
else {
    m.route(document.body, '/model', {
        '/datamart': {
            render: () => [
                m(Header, {
                    image: '/static/images/TwoRavens.png',
                    aboutText: 'TwoRavens, ISI',
                }, [
                    m('img#ISILogo', {
                        src: '/static/images/formal_viterbi_card_black_on_white.jpg',
                        style: {
                            'max-width': '140px',
                            'max-height': '62px'
                        }
                    }),
                    m('div', {style: {'flex-grow': 1}}),
                    m('img#datamartLogo', {
                        src: '/static/images/datamart_logo.png',
                        style: {
                            'max-width': '140px',
                            'max-height': '62px'
                        }
                    }),
                    m('div', {style: {'flex-grow': 1}}),
                ]),
                m('div', {style: {margin: 'auto', 'margin-top': '1em', 'max-width': '1000px'}},
                    m(Datamart, {
                        preferences: app.datamartPreferences,
                        dataPath: selectedDataset.datasetUrl,
                        endpoint: app.datamartURL,
                        labelWidth: '10em'
                    })),
                m(ModalDatamart, {
                    preferences: app.datamartPreferences,
                    endpoint: app.datamartURL,
                    dataPath: selectedDataset.datasetUrl
                })
            ]
        },
        '/explore/:variate/:vars...': Body,
        '/data': {render: () => m(Peek, {id: app.peekId, image: '/static/images/TwoRavens.png'})},
        '/:mode': Body,

        /*'/results': {
          onmatch() {
          app.set_mode('results');
          state.get_pipelines();
          layout.init();
            },
            render() {
                return m(Body, {mode: 'results'});
            }
        },*/
    });
}
