import '../css/app.css';
import '../pkgs/bootstrap/css/bootstrap-theme.min.css';
import '../pkgs/Ladda/dist/ladda-themeless.min.css';
import '../../node_modules/hopscotch/dist/css/hopscotch.css';


import hopscotch from 'hopscotch';

import m from 'mithril';

import * as app from './app';
import * as exp from './explore';
import * as plots from './plots';
import * as results from './results';

import * as manipulate from './manipulations/manipulate';

import PanelButton from './views/PanelButton';
import Subpanel from './views/Subpanel';
import Flowchart from './views/Flowchart';

import * as common from '../common/common';
import ButtonRadio from '../common/views/ButtonRadio';
import Button from '../common/views/Button';
import Dropdown from '../common/views/Dropdown';
import Footer from '../common/views/Footer';
import Header from '../common/views/Header';
import MenuTabbed from '../common/views/MenuTabbed';
import Modal from '../common/views/Modal';
import Panel from '../common/views/Panel';
import PanelList from '../common/views/PanelList';
import Peek from '../common/views/Peek';
import DataTable from './views/DataTable';
import Table from '../common/views/Table';
import ListTags from "../common/views/ListTags";
import TextField from '../common/views/TextField';
import MenuHeaders from "../common/views/MenuHeaders";
import Subpanel2 from '../common/views/Subpanel';

// EVENTDATA
import Body_EventData from './eventdata/Body_EventData';

import Recode from './Recode';
import {setConstraintMenu} from "./manipulations/manipulate";

export let bold = (value) => m('div', {style: {'font-weight': 'bold', display: 'inline'}}, value);
export let italicize = (value) => m('div', {style: {'font-style': 'italic', display: 'inline'}}, value);
export let link = (url) => m('a', {href: url, style: {color: 'darkblue'}, target: '_blank', display: 'inline'}, url);


let state = {
    pipelines: [],
    async get_pipelines() {
        this.pipelines = await app.listpipelines();
        m.redraw();
    }
};


// adding problem_id and version for Preprocess API part
let problem_id = 1;
let version = 1;
let nodesExplore = [];

function setBackgroundColor(color) {
    return function () {
        this.style['background-color'] = color;
    };
}

function leftpanel(mode) {

    if (mode === 'results')
        return results.leftpanel(Object.keys(app.allPipelineInfo));

    if (mode === 'manipulate')
        return manipulate.leftpanel();

    let selectedDisco = app.disco.find(problem => problem.problem_id === app.selectedProblem);
    let transformVars = [...manipulate.getTransformVariables(manipulate.getProblemPipeline(app.selectedProblem) || [])];

    let discoveryAllCheck = m('input#discoveryAllCheck[type=checkbox]', {
        onclick: m.withAttr("checked", (checked) => app.setCheckedDiscoveryProblem(checked)),
        checked: app.disco.length === app.checkedDiscoveryProblems.size,
        title: `mark ${app.disco.length === app.checkedDiscoveryProblems.size ? 'no' : 'all'} problems as meaningful`
    });

    let discoveryHeaders = [
        'problem_id',
        m('[style=text-align:center]', 'Meaningful', m('br'), discoveryAllCheck),
        app.disco.some(prob => prob.system === 'user') ? 'User' : '',
        'Target', 'Predictors', 'Task',
        app.disco.some(prob => prob.subTask !== 'taskSubtypeUndefined') ? 'Subtask' : '',
        'Metric', 'Manipulations'
    ];

    let formatProblem = problem => [
        problem.problem_id, // this is masked as the UID
        m('input[type=checkbox][style=width:100%]', {
            onclick: m.withAttr("checked", (checked) => app.setCheckedDiscoveryProblem(checked, problem.problem_id)),
            checked: app.checkedDiscoveryProblems.has(problem.problem_id),
            title: `mark ${problem.problem_id} as meaningful`
        }),
        problem.system === 'user' && m('div[title="user created problem"]', glyph('user')),
        problem.target,
        problem.predictors.join(', '),
        problem.task,
        problem.subTask === 'taskSubtypeUndefined' ? '' : problem.subTask, // ignore taskSubtypeUndefined
        problem.metric,
        // the view manipulations button
        (!!problem.subsetObs || !!problem.transform || (app.manipulations[problem.problem_id] || []).length !== 0) && m(
            'div[style=width:100%;text-align:center]', m(Button, {
                disabled: problem.problem_id === app.selectedProblem && app.rightTab === 'Manipulate' && common.panelOpen['right'],
                title: `view manipulations for ${problem.problem_id}`,
                onclick: () => {
                    app.setRightTab('Manipulate');
                    common.setPanelOpen('right');
                }
            }, 'View'))
    ];

    let nodes = app.is_explore_mode ? nodesExplore : app.nodes;

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
        attrsAll: {style: {height: 'calc(100% - 39px)'}},
        currentTab: app.leftTab,
        callback: app.setLeftTab,
        sections: [
            {
                value: 'Variables',
                title: 'Click variable name to add or remove the variable pebble from the modeling space.',
                contents: app.is_model_mode && app.rightTab === 'Manipulate' && manipulate.constraintMenu ? [
                    m('h5', 'Constraint Type'),
                    manipulate.varList()
                ] : [
                    m(TextField, {
                        id: 'searchVar',
                        placeholder: 'Search variables and labels',
                        oninput: app.searchVariables
                    }),
                    m(PanelList, {
                        id: 'varList',
                        items: app.valueKey.concat(transformVars),
                        colors: {
                            [app.hexToRgba(common.selVarColor)]: nodes.map(n => n.name),
                            [app.hexToRgba(common.gr1Color, .25)]: app.zparams.zgroup1,
                            [app.hexToRgba(common.gr2Color)]: app.zparams.zgroup2,
                            [app.hexToRgba(common.taggedColor)]: app.zparams.znom,
                            [app.hexToRgba(common.taggedColor)]: app.is_explore_mode ? [] : app.zparams.zdv
                        },
                        classes: {
                            'item-dependent': app.is_explore_mode ? [] : app.zparams.zdv,
                            'item-nominal': app.zparams.znom,
                            'item-bordered': app.matchedVariables
                        },
                        callback: x => app.clickVar(x, nodes),
                        popup: variable => app.popoverContent(app.findNode(variable)),
                        attrsItems: {'data-placement': 'right', 'data-original-title': 'Summary Statistics'},
                        attrsAll: {style: {height: 'calc(100% - 90px)', overflow: 'auto'}}
                    }),
                    m(Button, {
                        id: 'btnCreateVariable',
                        style: {width: '100%', 'margin-top': '10px'},
                        onclick: async () => {
                            if (!app.selectedProblem) await app.addProblemFromForceDiagram();
                            let problemPipeline = manipulate.getProblemPipeline(app.selectedProblem);
                            if ((problemPipeline[problemPipeline.length - 1] || {}).type !== 'transform') {
                                problemPipeline.push({
                                    type: 'transform',
                                    id: 'transform ' + problemPipeline.length,
                                    transforms: [],
                                    expansions: [],
                                    manual: []
                                })
                            }
                            app.setRightTab('Manipulate');
                            manipulate.setConstraintMenu({
                                type: 'transform',
                                step: problemPipeline[problemPipeline.length - 1],
                                pipeline: manipulate.getPipeline(app.selectedProblem)});
                            common.setPanelOpen('right');
                        }
                    }, 'Create New Variable'),
                ]
            },
            {
                value: 'Discovery',
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
                        app.selectedProblem !== undefined && [
                            m('h4', [
                                'Current Problem',
                                m(`div#deselectProblem`, {
                                    onclick: () => {
                                        app.erase('Discovery');
                                        app.setSelectedProblem(undefined);
                                        app.layout();
                                        let targetNode = app.findNode(app.mytarget);
                                        if (targetNode.strokeColor !== app.dvColor)
                                            app.setColors(targetNode, app.dvColor);
                                        app.restart();
                                        // the dependent variable force needs a kick
                                        document.getElementById('whitespace0').click();
                                    },
                                    title: 'deselect problem',
                                    style: {
                                        display: 'inline-block',
                                        'margin-right': '1em',
                                        transform: 'scale(1.5, 1.5)',
                                        float: 'right',
                                        'font-weight': 'bold',
                                        'line-height': '14px'
                                    }
                                }, '×'),
                                selectedDisco.pending && m(Button, {
                                    id: 'saveProblemBtn',
                                    onclick: () => delete selectedDisco['pending'],
                                    title: 'save problem',
                                    style: {float: 'right', margin: '-.5em 1em 0 0'}
                                }, 'Save Problem')
                            ]),
                            m(Table, {
                                id: 'discoveryTableManipulations',
                                headers: discoveryHeaders,
                                data: [formatProblem(selectedDisco)],
                                activeRow: app.selectedProblem,
                                showUID: false,
                                abbreviation: 40
                            }),
                            m('h4', 'All Problems')
                        ],
                        m(Table, {
                            id: 'discoveryTable',
                            headers: discoveryHeaders,
                            data: [ // I would sort system via (a, b) => a.system === b.system ? 0 : a.system === 'user' ? -1 : 1, but javascript sort isn't stable
                                ...app.disco.filter(prob => prob.system === 'user'),
                                ...app.disco.filter(prob => prob.system !== 'user')
                            ].filter(prob => !prob.pending).map(formatProblem),
                            activeRow: app.selectedProblem,
                            onclick: app.discoveryClick,
                            showUID: false,
                            abbreviation: 40,
                            sortable: true
                        })),
                    m('textarea#discoveryInput[style=display:block; float: left; width: 100%; height:calc(20% - 35px); overflow: auto; background-color: white]', {
                        value: selectedDisco === undefined ? '' : selectedDisco.description
                    }),
                    m(Button, {
                        id: 'btnDelete',
                        disabled: !selectedDisco || selectedDisco.system === 'auto',
                        style: 'float:right',
                        onclick: _ => {
                            setTimeout(_ => {
                                let deleteProbleAPI = app.deleteProblem(problem_id, version, 'id_000003');
                                console.log("have to delete this ", selectedDisco)
                                app.deleteFromDisc(selectedDisco)

                            }, 500);
                        }, title: 'Delete the user created problem'
                    }, 'Delete Problem.'),
                    m(PanelButton, {
                        id: 'btnSave',
                        onclick: app.saveDisc,
                        title: 'Saves your revised problem description.'
                    }, 'Save Desc.'),
                    m(PanelButton, {
                        id: 'btnSubmitDisc',
                        classes: 'btn-success',
                        style: 'float: right',
                        onclick: app.submitDiscProb,
                        title: 'Submit all checked discovered problems.'
                    }, 'Submit Disc. Probs.')
                ]
            },
            {
                value: 'Summary',
                title: 'Select a variable from within the visualization in the center panel to view its summary statistics.',
                display: 'none',
                contents: [
                    m('center',
                        m('b', app.summary.name),
                        m('br'),
                        m('i', app.summary.labl)),
                    m(Table, {
                        id: 'varSummaryTable',
                        data: app.summary.data
                    })
                ]
            }
        ]
    }));
}

function rightpanel(mode) {
    if (mode === 'results') return; // returns undefined, which mithril ignores
    if (mode === 'explore') return;
    if (mode === 'manipulate') return manipulate.rightpanel();


    let selectedProblem = app.disco.find(prob => prob.problem_id === app.selectedProblem);
    // mode == null (model mode)

    // only called if the pipeline flowchart is rendered
    function pipelineFlowchartPrep(pipeline) {
        let steps = pipeline.steps.map((pipeStep, i) => ({
            key: 'Step ' + i,
            color: common.grayColor,
            // special coloring is not enabled for now
            // color: {
            //     'data': common.grayColor,
            //     'byudml': common.dvColor,
            //     'sklearn_wrap': common.csColor
            // }[pipeStep.primitive.python_path.split('.')[2]] || common.grayColor,
            summary: m(Table, {
                id: 'pipelineFlowchartSummary' + i,
                abbreviation: 40,
                data: {
                    'Name': pipeStep['primitive']['primitive'].name,
                    'Method': pipeStep['primitive']['primitive']['pythonPath'].split('.').slice(-1)[0]
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
    }

    let sections = [
        app.selectedProblem && {
            value: 'Problem',
            idSuffix: 'Type',
            contents: [
                m(`button#btnLock.btn.btn-default`, {
                    class: app.locktoggle ? 'active' : '',
                    onclick: () => app.lockDescription(!app.locktoggle),
                    title: 'Lock selection of problem description',
                    style: 'float: right',
                }, glyph(app.locktoggle ? 'lock' : 'pencil', true)),
                m('', {style: 'float: left'},
                    m(Dropdown, {
                        id: 'taskType',
                        items: Object.keys(app.d3mTaskType),
                        activeItem: selectedProblem.task,
                        onclickChild: child => {
                            if (selectedProblem.system === 'auto') {
                                selectedProblem = app.getProblemCopy(app.selectedProblem);
                                selectedProblem.pending = true;
                                app.disco.push(selectedProblem);
                                app.setSelectedProblem(selectedProblem.problem_id);
                            }
                            selectedProblem.task = child;
                        },
                        style: {'margin-bottom': '1em'},
                        disabled: app.locktoggle
                    }),
                    m(Dropdown, {
                        id: 'taskSubType',
                        items: Object.keys(app.d3mTaskSubtype),
                        activeItem: selectedProblem.subTask,
                        onclickChild: child => {
                            if (selectedProblem.system === 'auto') {
                                selectedProblem = app.getProblemCopy(app.selectedProblem);
                                selectedProblem.pending = true;
                                app.disco.push(selectedProblem);
                                app.setSelectedProblem(selectedProblem.problem_id);
                            }
                            selectedProblem.subTask = child;
                        },
                        style: {'margin-bottom': '1em'},
                        disabled: app.locktoggle
                    }),
                    m(Dropdown, {
                        id: 'performanceMetrics',
                        items: Object.keys(app.d3mMetrics),
                        activeItem: selectedProblem.metric,
                        onclickChild: child => {
                            if (selectedProblem.system === 'auto') {
                                selectedProblem = app.getProblemCopy(app.selectedProblem);
                                selectedProblem.pending = true;
                                app.disco.push(selectedProblem);
                                app.setSelectedProblem(selectedProblem.problem_id);
                            }
                            selectedProblem.metric = child;
                        },
                        style: {'margin-bottom': '1em'},
                        disabled: app.locktoggle
                    })
                )
            ]
        },
        app.selectedProblem && {
            value: 'Manipulate',
            title: 'Apply transformations and subsets to a problem',
            contents: m(MenuHeaders, {
                id: 'aggregateMenu',
                attrsAll: {style: {height: '100%', overflow: 'auto'}},
                sections: [
                    manipulate.getPipeline().length !== 0 && {
                        value: 'Dataset Pipeline',
                        contents: m(manipulate.PipelineFlowchart, {
                            compoundPipeline: manipulate.getPipeline(),
                            pipelineId: app.configurations.name,
                            editable: false
                        })
                    },
                    {
                        value: 'Problem Pipeline',
                        contents: [
                            m(manipulate.PipelineFlowchart, {
                                compoundPipeline: manipulate.getPipeline(app.selectedProblem),
                                pipelineId: app.disco.find(prob => prob.problem_id === app.selectedProblem).problem_id,
                                editable: true,
                                aggregate: false
                            }),
                            app.nodes.filter(node => node.nature === 'nominal').length !== 0 && m(Flowchart, {
                                attrsAll: {style: {height: 'calc(100% - 87px)', overflow: 'auto'}},
                                labelWidth: '5em',
                                steps: [{
                                    key: 'Nominal',
                                    color: common.nomColor,
                                    content: m('div', {style: {'text-align': 'left'}},
                                        m(ListTags, {
                                            tags: app.nodes
                                                .filter(node => node.nature === 'nominal')
                                                .map(node => node.name),
                                            ondelete: name => {
                                                app.setColors(app.nodes.find(node => node.name === name), app.nomColor);
                                                app.restart();
                                            }
                                        }))
                                }]
                            })
                        ]
                    },
                ]
            })
        },
        {
            value: 'Results',
            display: !app.swandive || IS_D3M_DOMAIN ? 'block' : 'none',
            idSuffix: 'Setx',
            contents: [
                m('#setxRight[style=float: right; width: 23%; height: 100%; overflow:auto; margin-right: 1px]',
                    app.selectedPipeline && [
                        bold('Score Metric: '), app.d3mProblemDescription.performanceMetrics[0].metric, m('br'),
                        app.resultsMetricDescription
                    ],
                    app.pipelineTable.length !== 0 && m(Table, {
                        id: 'pipelineTable',
                        headers: app.pipelineHeader,
                        data: app.pipelineTable,
                        activeRow: app.selectedPipeline,
                        onclick: app.setSelectedPipeline,
                        abbreviation: 20,
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
                        {value: 'Prediction Summary', id: 'btnPredPlot'},
                        {value: 'Generate New Predictions', id: 'btnGenPreds'},
                        {value: 'Visualize Pipeline', id: 'btnVisPipe'},
                        {value: 'Prediction Description', id: 'btnPredData'},
                        {value: 'Solution Table', id: 'btnSolTable'}
                    ]
                }),
                m(`div#predictionSummary[style=display:${app.selectedResultsMenu === 'Prediction Summary' ? 'block' : 'none'};height:calc(100% - 30px); overflow: auto; width: 70%]`,
                    m('#setxLeftPlot[style=float:left; background-color:white; overflow:auto;]'),
                    m('#setxLeft[style=display:none; float: left; overflow: auto; background-color: white]'),
                ),
                m(`#setxLeftGen[style=display:${app.selectedResultsMenu === 'Generate New Predictions' ? 'block' : 'none'}; float: left; width: 70%; height:calc(100% - 30px); overflow: auto; background-color: white]`,
                    m('#setxLeftTop[style=display:block; float: left; width: 100%; height:50%; overflow: auto; background-color: white]',
                        m('#setxLeftTopLeft[style=display:block; float: left; width: 30%; height:100%; overflow: auto; background-color: white]'),
                        m('#setxLeftTopRight[style=display:block; float: left; width: 70%; height:100%; overflow: auto; background-color: white]')),
                    m('#setxLeftBottomLeft[style=display:block; float: left; width: 70%; height:50%; overflow: auto; background-color: white]'),
                    m('#setxLeftBottomRightTop[style=display:block; float: left; width: 30%; height:10%; overflow: auto; background-color: white]',
                        m(PanelButton, {
                            id: 'btnExecutePipe',
                            classes: 'btn-default.ladda-button[data-spinner-color=#000000][data-style=zoom-in]',
                            onclick: app.executepipeline,
                            style: {
                                display: app.selectedPipeline === undefined ? 'none' : 'block',
                                float: 'left',
                                'margin-right': '10px'
                            },
                            title: 'Execute pipeline'
                        }, m('span.ladda-label[style=pointer-events: none]', 'Execute Generation'))),
                    m('#setxLeftBottomRightBottom[style=display:block; float: left; width: 30%; height:40%; overflow: auto; background-color: white]')),
                app.selectedResultsMenu === 'Visualize Pipeline' && app.selectedPipeline in app.allPipelineInfo && m('div', {
                        style: {
                            width: '70%',
                            height: 'calc(100% - 30px)',
                            overflow: 'auto'
                        }
                    },
                    m('div', {style: {'font-weight': 'bold', 'margin': '1em'}}, 'Overview: '),
                    m(Table, {
                        id: 'pipelineOverviewTable',
                        data: Object.keys(app.allPipelineInfo[app.selectedPipeline].pipeline).reduce((out, entry) => {
                            if (['inputs', 'steps', 'outputs'].indexOf(entry) === -1)
                                out[entry] = app.allPipelineInfo[app.selectedPipeline].pipeline[entry];
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
                        steps: pipelineFlowchartPrep(app.allPipelineInfo[app.selectedPipeline].pipeline)
                    })
                ),
                m(`div#predictionData[style=display:${app.selectedResultsMenu === 'Prediction Description' ? 'block' : 'none'};height:calc(100% - 30px); overflow: auto; width: 70%]`,
                    m('#setPredictionDataLeft[style=display:block; width: 100%; height:100%; margin-top:1em; overflow: auto; background-color: white; padding : 1em; margin-top: 1em]')
                ),
                m(`div#solutionTable[style=display:${app.selectedResultsMenu === 'Solution Table' ? 'block' : 'none'};height:calc(100% - 30px); overflow: auto; width: 70%, padding : 1em]`,
                    selectedProblem && m(DataTable, {data: app.stargazer, variable: selectedProblem.target})
                )
            ]
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
    ];

    return m(Panel, {
        side: 'right',
        label: 'Model Selection',
        hover: true,
        width: app.modelRightPanelWidths[app.rightTab],
        attrsAll: {
            onclick: () => app.setFocusedPanel('right'),
            style: {
                'z-index': 100 + (app.focusedPanel === 'right'),
                height: `calc(100% - ${common.heightHeader} - 2*${common.panelMargin} - ${app.peekInlineShown ? app.peekInlineHeight : '0px'} - ${common.heightFooter})`,
                display: selectedProblem ? 'block' : 'none'
            }
        }
    }, m(MenuTabbed, {
        id: 'rightpanelMenu',
        currentTab: app.rightTab,
        callback: app.setRightTab,
        sections: sections,
        attrsAll: {style: {height: 'calc(100% - 39px)'}}
    }));
}

export let glyph = (icon, unstyled) =>
    m(`span.glyphicon.glyphicon-${icon}` + (unstyled ? '' : '[style=color: #818181; font-size: 1em; pointer-events: none]'));

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
                let node = app.findNode(x);
                node && expnodes.push(node);
            });
            if (variate === "problem") {
                let problem = app.disco.find(problem => problem.problem_id === app.selectedProblem);
                return m('', [
                    m('#plot', {style: 'display: block', oncreate: _ => exp.plot([], "", problem)})
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
            m(`button#${id}.btn.btn-default`, {onclick, title}, glyph(icon, true));
        let discovery = app.leftTab === 'Discovery';
        let overflow = app.is_explore_mode ? 'auto' : 'hidden';
        let style = `position: absolute; left: ${app.panelWidth.left}; top: 0; margin-top: 10px`;

        return m('main', [
            m(Modal),
            this.header(app.currentMode),
            this.footer(app.currentMode),
            leftpanel(app.currentMode),
            rightpanel(app.currentMode),

            (app.is_manipulate_mode || (app.is_model_mode && app.rightTab === 'Manipulate')) && manipulate.menu(
                manipulate.getPipeline(app.selectedProblem), // the complete pipeline to build menus with
                app.is_model_mode ? app.selectedProblem : app.configurations.name),  // the identifier for which pipeline to edit
            app.peekInlineShown && this.peekTable(),

            m(`#main`, {
                    style: {
                        overflow,
                        display: app.is_manipulate_mode || (app.rightTab === 'Manipulate' && manipulate.constraintMenu) ? 'none' : 'block'
                    }
                },
                m("#innercarousel.carousel-inner", {style: {height: '100%', overflow}},
                    app.is_explore_mode && [variate === 'problem' ?
                    m('', {style},
                        m('a', {onclick: _ => m.route.set('/explore')}, '<- back to variables'),
                        m('br'),
                        exploreVars)
                    //                        JSON.stringify(app.disco[app.selectedProblem]))
                    : exploreVars ?
                        m('', {style},
                            m('a', {onclick: _ => m.route.set('/explore')}, '<- back to variables'),
                            m('br'),
                            exploreVars)
                        : m('', {style},
                            m(ButtonRadio,
                                {
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
                                    let selected = discovery ? [app.selectedProblem] : nodesExplore.map(x => x.name);
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
                                (discovery ? app.disco : app.valueKey).map((x, i) => {
                                    let {problem_id} = x;
                                    let selected = discovery ? problem_id === app.selectedProblem : nodesExplore.map(x => x.name).includes(x);
                                    let {predictors} = x;
                                    if (x.predictors) {
                                        x = x.target;
                                    }
                                    let node = app.findNode(x);
                                    let show = app.exploreVariate === 'Bivariate' || app.exploreVariate === 'Trivariate';
                                    let [n0, n1, n2] = nodesExplore;
                                    return m('span', {
                                            onclick: _ => discovery ? app.setSelectedProblem(problem_id) : app.clickVar(x, nodesExplore),
                                            onmouseover: function () {
                                                $(this).popover('toggle');
                                                $('body div.popover')
                                                    .addClass('variables');
                                                $('body div.popover div.popover-content')
                                                    .addClass('form-horizontal');
                                            },
                                            onmouseout: "$(this).popover('toggle');",
                                            'data-container': 'body',
                                            'data-content': node.labl || '<i>none provided</i>',
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
                                        }, m('', {
                                            oninit() {
                                                this.node = app.findNode(x);
                                            },
                                            oncreate(vnode) {
                                                let plot = this.node.plottype === 'continuous' ? plots.densityNode : plots.barsNode;
                                                plot(this.node, vnode.dom, 110, true);
                                            },
                                            onupdate(vnode) {
                                                let node = app.findNode(x);
                                                if (node != this.node) {
                                                    let plot = node.plottype === 'continuous' ? plots.densityNode : plots.barsNode;
                                                    plot(node, vnode.dom, 110, true);
                                                    this.node = node;
                                                }
                                            },
                                            style: 'height: 65%'
                                        }),
                                        m('', {style: 'margin: 1em'},
                                            show && n0 && n0.name === x ? `${x} (x)`
                                                : show && n1 && n1.name === x ? `${x} (y)`
                                                : show && n2 && n2.name === x ? `${x} (z)`
                                                    : predictors ? [
                                                            m('b', x),
                                                            m('p', predictors.join(', '))]
                                                        : x)
                                    );
                                }))
                        )],
                    m('svg#whitespace')),
                app.is_model_mode && m("#spacetools.spaceTool", {style: {right: app.panelWidth.right, 'z-index': 16}}, [
                    spaceBtn('btnAdd', app.addProblemFromForceDiagram, 'add model to problems', 'plus'),
                    spaceBtn('btnJoin', app.connectAllForceDiagram, 'Make all possible connections between nodes', 'link'),
                    spaceBtn('btnDisconnect', () => app.restart([]), 'Delete all connections between nodes', 'remove-circle'),
                    spaceBtn('btnForce', app.forceSwitch, 'Pin the variable pebbles to the page', 'pushpin'),
                    spaceBtn('btnEraser', app.erase, 'Wipe all variables from the modeling space', 'magnet')
                ]),
                app.currentMode !== 'manipulate' && m(Subpanel, {title: "History"}),

                ['zgroup1', 'zgroup2', 'ztime', 'zcross', 'zdv', 'znom'].reduce((acc, elem) => acc + app.zparams[elem].length, 0) > 0 && m(Subpanel2, {
                    id: 'legend', header: 'Legend', class: 'legend',
                    style: {
                        right: app.panelWidth['right'],
                        bottom: `calc(2*${common.panelMargin} + ${app.peekInlineShown ? app.peekInlineHeight + ' + 23px' : '0px'})`,
                        position: 'absolute',
                        width: '150px'
                    }
                }, [
                    ['timeButton', 'ztime', 'Time', app.dvColor, 'white', 1],
                    ['csButton', 'zcross', 'Cross Sec', app.csColor, 'white', 1],
                    ['dvButton', 'zdv', 'Dep Var', app.timeColor, 'white', 1],
                    ['nomButton', 'znom', 'Nom Var', app.nomColor, 'white', 1],
                    ['gr1Button', 'zgroup1', 'Group 1', app.gr1Color, app.gr1Color, 0],
                    ['gr2Button', 'zgroup2', 'Group 2', app.gr2Color, app.gr2Color, 0]
                ].map(btn =>
                    m(`#${btn[0]}.${app.zparams[btn[1]].length === 0 ? "hide" : "show"}[style=width:100% !important]`,
                        m(".rectColor[style=display:inline-block]", m("svg[style=width: 20px; height: 20px]",
                            m(`circle[cx=10][cy=10][fill=${btn[4]}][fill-opacity=0.6][r=9][stroke=${btn[3]}][stroke-opacity=${btn[5]}][stroke-width=2]`))),
                        m(".rectLabel[style=display:inline-block;vertical-align:text-bottom;margin-left:.5em]", btn[2])))
                ),

                (app.manipulations[app.selectedProblem] || []).filter(step => step.type === 'subset').length !== 0 && m(Subpanel2, {
                    id: 'subsetSubpanel',
                    header: 'Subsets',
                    style: {
                        left: app.panelWidth['left'],
                        top: common.panelMargin,
                        position: 'absolute'
                    }
                }, app.manipulations[app.selectedProblem]
                    .filter(step => step.type === 'subset')
                    .map(step => m('div', step.id))
                    .concat([`${manipulate.totalSubsetRecords} Records`]))
            )
        ]);
    }

    header(mode) {
        let userlinks = username === '' ? [
            {title: "Log in", url: login_url},
            {title: "Sign up", url: signup_url}
        ] : [{title: "Workspaces", url: workspaces_url},
            {title: "Settings", url: settings_url},
            {title: "Links", url: devlinks_url},
            {title: "Logout", url: logout_url}];

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
                'Dataset Name'),
            m('div', {style: {'flex-grow': 1}}),
            m('#cite.panel.panel-default',
                {style: `display: ${this.cite ? 'block' : 'none'}; margin-top: 2.5em; right: 50%; width: 380px; text-align: left; z-index: 50; position:absolute`},
                m('.panel-body')),

            m(Button, {
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
            }, glyph('repeat')),

            m('div.btn-group[role=group][aria-label="..."][style=margin:.25em 1em;display:flex]',
                m(Button, {
                    id: 'btnTA2',
                    onclick: _ => hopscotch.startTour(app.mytour, 0)
                }, 'Help Tour ', glyph('road')),
                m(Button, {id: 'btnTA2', onclick: _ => app.helpmaterials('video')}, 'Video ', glyph('expand')),
                m(Button, {id: 'btnTA2', onclick: _ => app.helpmaterials('manual')}, 'Manual ', glyph('book'))),

            app.is_model_mode && m(Button, {
                id: 'btnEstimate',
                class: 'ladda-label ladda-button',
                onclick: app.estimate,
                style: {margin: '0.25em 1em', 'data-spinner-color': 'black', 'data-style': 'zoom-in'}
            }, 'Solve This Problem'),
            // mode !== 'model' ? null : navBtn('btnEstimate.btn-default', 1, 1, app.estimate, m("span.ladda-label", mode === 'explore' ? 'Explore' : 'Solve This Problem'), '150px'),

            m('.dropdown[style=float: right; padding-right: 1em]',
                m('#drop.button.btn[type=button][data-toggle=dropdown][aria-haspopup=true][aria-expanded=false]',
                    [username, " ", glyph('triangle-bottom')]),
                m('ul.dropdown-menu[role=menu][aria-labelledby=drop]',
                    userlinks.map(link => m('a[style=padding: 0.5em]', {href: link.url}, link.title, m('br'))))),
        );
    }

    peekTable() {
        let pipeline = manipulate.getPipeline(app.is_model_mode && app.selectedProblem);
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
                    if (app.peekData.length === 0) return;

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
                attrsAll: {style: {margin: '2px', width: 'auto'}, class: 'navbar-left'},
                onclick: app.set_mode,
                activeSection: mode || 'model',
                sections: [{value: 'Model'}, {value: 'Explore'}, {value: 'Manipulate'}],

                // attrsButtons: {class: ['btn-sm']}, // if you'd like small buttons (btn-sm should be applied to individual buttons, not the entire component)
                attrsButtons: {style: {width: 'auto'}}
            }),
            m("a#logID[href=somelink][target=_blank]", "Replication"),
            m("span[style=color:#337ab7]", " | "),
            // dev links...
            m("a[href='/dev-raven-links'][target=_blank]", "raven-links"),
            m("span[style=color:#337ab7]", " | "),
            m("span[style=color:#337ab7]", `TA2: ${TA2_SERVER}`),
            m("span[style=color:#337ab7]", " | "),
            m("span[style=color:#337ab7]", `TA3TA2 api: ${TA3TA2_API_VERSION}`),
            m(Button, {
                id: 'datasetConsoleLogUrl',
                onclick: async () =>
                    console.log(await manipulate.buildDatasetUrl(app.disco.find(prob => prob.problem_id === app.selectedProblem)))
            }, 'LOG DATASET URL'),
            m('div.btn.btn-group', {style: 'float: right; padding: 0px'},
                m(Button, {
                    class: app.peekInlineShown && ['active'],
                    onclick: () => app.setPeekInlineShown(!app.peekInlineShown)
                }, 'Peek'),
                m(Button, {onclick: () => window.open('#!/data', 'data')}, glyph('new-window'))),
            manipulate.totalSubsetRecords !== undefined && m("span.label.label-default#recordCount", {
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
        '/explore/:variate/:vars...': Body,
        '/recode': Recode,
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
