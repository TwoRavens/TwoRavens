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
import * as results from './results';

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
import Table from '../common/views/Table';
import ListTags from "../common/views/ListTags";
import TextField from '../common/views/TextField';
import MenuHeaders from "../common/views/MenuHeaders";
import Subpanel2 from '../common/views/Subpanel';

import Popper from '../common/views/Popper';

import Datamart, {ModalDatamart} from "../common/TwoRavens/Datamart";
// EVENTDATA
import Body_EventData from './eventdata/Body_EventData';

import PreprocessInfo from "./views/PreprocessInfo";
import ForceDiagram from "./views/ForceDiagram";
import ButtonLadda from "./views/LaddaButton";
import {exploreVariate} from "./app";
import Canvas from "../common/views/Canvas";

export let bold = value => m('div', {style: {'font-weight': 'bold', display: 'inline'}}, value);
export let italicize = value => m('div', {style: {'font-style': 'italic', display: 'inline'}}, value);
export let link = url => m('a', {href: url, style: {color: 'darkblue'}, target: '_blank', display: 'inline'}, url);


// adding problemID and version for Preprocess API part
let version = 1;
let exploreVariables = [];

function leftpanel(mode) {

    if (mode === 'manipulate')
        return manipulate.leftpanel();

    if (mode === 'results')
        return results.leftpanel();

    let selectedDataset = app.getSelectedDataset();
    let selectedProblem = app.getSelectedProblem();
    if (!selectedDataset) return;

    let sections = [];

    // VARIABLES TAB
    if (selectedProblem) {
        // base dataset variables, then transformed variables from the problem
        let leftpanelVariables = Object.keys(app.variableSummaries);

        // if no search string, match nothing
        let matchedVariables = app.variableSearchText.length === 0 ? []
            : leftpanelVariables.filter(variable => variable.toLowerCase().includes(app.variableSearchText)
                || (app.variableSummaries.label || "").toLowerCase().includes(app.variableSearchText));

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
                            [app.hexToRgba(common.selVarColor)]: app.is_explore_mode ? selectedProblem.loose : exploreVariables,
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
                        popup: x => m('div', m('h4', 'Summary Statistics for ' + x), m(Table, {attrsAll: {class: 'table-sm'}, data: app.getVarSummary(app.variableSummaries[x])})),
                        popupOptions: {placement: 'right', modifiers: {preventOverflow: {escapeWithReference: true}}},
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
        problem.task,
        problem.subTask === 'taskSubtypeUndefined' ? '' : problem.subTask, // ignore taskSubtypeUndefined
        problem.metric,
        m('',
            problem.manipulations.length !== 0 && m(
                'div[style=width:100%;text-align:center]', m(Button, {
                    class: 'btn-sm',
                    disabled: problem === selectedProblem && app.rightTab === 'Manipulate' && common.panelOpen['right'],
                    title: `view manipulations for ${problem.problemID}`,
                    onclick: () => {
                        app.setRightTab('Manipulate');
                        common.setPanelOpen('right');
                    }
                }, 'View'))
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
                    selectedProblem && m('h4.card-header.clearfix',
                        m('div[style=height:50px;display:inline]', 'Current Problem'),
                        m(Button, {
                            id: 'btnSaveProblem',
                            style: {float: 'right', margin: '-5px', 'margin-right': '22px'},
                            class: 'btn-sm',
                            onclick: () => {
                                let problemCopy = app.getProblemCopy(app.getSelectedProblem());
                                selectedDataset.problems[problemCopy.problemID] = problemCopy;
                            }
                        }, 'Save')),
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
                style: {width: '100%', height: 'calc(20% - 60px)', overflow: 'auto'},
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
        hover: app.is_model_mode && !manipulate.constraintMenu,
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
        attrsAll: {style: {height: 'calc(100% - 50px)'}},
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
                        m('i', (app.variableSummaries[app.forceDiagramState.hoverPebble || app.forceDiagramState.selectedPebble] || {}).labl)),
                    m(Table, {
                        id: 'varSummaryTable',
                        data: app.getVarSummary(app.variableSummaries[app.forceDiagramState.hoverPebble || app.forceDiagramState.selectedPebble])
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
                })
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
        sections.length > 0 && m(MenuTabbed, {
            id: 'rightpanelMenu',
            currentTab: app.rightTab,
            callback: app.setRightTab,
            sections,
            attrsAll: {style: {height: 'calc(100% - 50px)'}}
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
                let node = app.variableSummaries[x];
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

            return m('div', [
                m('div', {
                        style: {
                            'margin-bottom': '1em',
                            'overflow-x': 'scroll',
                            'white-space': 'nowrap',
                            width: '100%'
                        }
                    },
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

        let discovery = app.leftTab === 'Discover';
        let overflow = app.is_explore_mode ? 'auto' : 'hidden';

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

            // manipulations menu
            (app.is_manipulate_mode || (app.is_model_mode && app.rightTab === 'Manipulate')) && manipulate.menu([
                ...app.getSelectedDataset().hardManipulations,
                ...app.getSelectedProblem().manipulations
            ],
                app.is_model_mode ? app.getSelectedDataset().selectedProblem : app.selectedDataset),  // the identifier for which pipeline to edit

            // peek
            app.peekInlineShown && this.peekTable(),

            m(`#main`, {
                    style: {
                        overflow,
                        top: common.heightHeader,
                        height: `calc(100% - ${common.heightHeader} - ${common.heightFooter})`,
                        bottom: common.heightFooter,
                        display: app.is_manipulate_mode || (app.rightTab === 'Manipulate' && manipulate.constraintMenu) ? 'none' : 'block',
                        'background-color': app.swandive ? 'grey' : 'transparent'
                    }
                },
                m(Canvas,
                    app.is_results_mode && m(results.CanvasSolutions, {problem: selectedProblem}),
                    app.is_explore_mode && [variate === 'problem' ?
                    m('',
                        m('a', {onclick: _ => m.route.set('/explore')}, '<- back to variables'),
                        m('br'),
                        exploreVars)
                    : exploreVars ?
                        m('',
                            m('a', {onclick: _ => m.route.set('/explore')}, '<- back to variables'),
                            m('br'),
                            exploreVars)
                        : m('',
                            m(ButtonRadio, {
                                id: 'exploreButtonBar',
                                attrsAll: {style: {width: '400px'}},
                                attrsButtons: {class: ['btn-sm']},
                                onclick: x => {
                                    app.setVariate(x);
                                    if (app.exploreVariate === 'Multivariate') return;
                                    let maxVariables = {
                                        Univariate: 1,
                                        Bivariate: 2,
                                        Trivariate: 3
                                    }[app.exploreVariate];
                                    exploreVariables = exploreVariables
                                        .slice(Math.max(0, exploreVariables.length - maxVariables));
                                },
                                activeSection: app.exploreVariate,
                                sections: discovery ? [{value: 'Problem'}] : [{value: 'Univariate'}, {value: 'Bivariate'}, {value: 'Trivariate'}, {value: 'Multiple'}]
                            }),
                            m(PanelButton, {
                                id: 'exploreGo',
                                classes: 'btn-success',
                                onclick: _ => {
                                    let variate = app.exploreVariate.toLowerCase();
                                    let selected = discovery ? [app.getSelectedDataset().selectedProblem] : exploreVariables;
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
                                // x could either be a problemID or a variable name
                                (discovery ? Object.keys(app.getSelectedDataset().problems) : Object.keys(app.variableSummaries)).map(x => {
                                    let selected = discovery
                                        ? x === selectedProblem.problemID
                                        : exploreVariables.includes(x);

                                    let targetName = discovery
                                        ? app.getSelectedDataset().problems[x].targets[0]
                                        : x;

                                    let show = app.exploreVariate === 'Bivariate' || app.exploreVariate === 'Trivariate';
                                    let [n0, n1, n2] = exploreVariables.map(variable => app.variableSummaries[variable]);

                                    // tile for each variable or problem
                                    let tile = m('span#exploreNodeBox', {
                                            onclick: _ => {
                                                if (discovery) {
                                                    app.setSelectedProblem(x);
                                                    exploreVariables = [x];
                                                    return;
                                                }

                                                if (exploreVariate === 'Multivariate') {
                                                    exploreVariables.includes(x)
                                                        ? app.remove(exploreVariables, x) : exploreVariables.push(x);
                                                    return;
                                                }

                                                let maxVariables = {
                                                    'Univariate': 1,
                                                    'Bivariate': 2,
                                                    'Trivariate': 3
                                                }[app.exploreVariate];

                                                if (exploreVariables.includes(x)) app.remove(exploreVariables, x);
                                                exploreVariables.push(x);
                                                exploreVariables = exploreVariables
                                                    .slice(Math.max(0, exploreVariables.length - maxVariables));
                                                exploreVariables = [...new Set(exploreVariables)];

                                            },
                                            style: {
                                                // border: '1px solid rgba(0, 0, 0, .2)',
                                                'border-radius': '5px',
                                                'box-shadow': '1px 1px 4px rgba(0, 0, 0, 0.4)',
                                                display: 'flex',
                                                'flex-direction': 'column',
                                                height: '250px',
                                                margin: '.5em',
                                                width: '250px',
                                                'align-items': 'center',
                                                'background-color': selected ? app.hexToRgba(common.selVarColor) : common.menuColor
                                            }
                                        }, m('#exploreNodePlot', {
                                            oninit() {
                                                this.node = app.variableSummaries[x];
                                            },
                                            oncreate(vnode) {
                                                let plot = (this.node || {}).plottype === 'continuous' ? plots.densityNode : plots.barsNode;
                                                this.node && plot(this.node, vnode.dom, 110, true);
                                            },
                                            onupdate(vnode) {
                                                let targetName = discovery
                                                    ? app.getSelectedDataset().problems[x].targets[0]
                                                    : x;
                                                let node = app.variableSummaries[targetName];
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

                                    if (app.variableSummaries[targetName].labl)
                                        return m(Popper, {content: () => app.variableSummaries[targetName].labl}, tile);
                                    return tile;
                                }))
                        )],
                    app.is_model_mode && selectedProblem && m(ForceDiagram, Object.assign(app.forceDiagramState,{
                        nodes: app.forceDiagramNodesReadOnly,
                        // these attributes may change dynamically, (the problem could change)
                        onDragAway: pebble => {
                            app.remove(selectedProblem.tags.loose, pebble);
                            app.remove(selectedProblem.predictors, pebble);
                            app.remove(selectedProblem.targets, pebble);
                            m.redraw();
                        },
                        labels: app.forceDiagramLabels(selectedProblem),
                        mutateNodes: app.mutateNodes(selectedProblem),
                        summaries: app.variableSummaries
                    }, app.buildForceData(selectedProblem)))),

                app.is_model_mode && !app.swandive && m("#spacetools.spaceTool", {
                    style: {right: app.panelWidth.right,'z-index': 16}
                },
                m(Button, {
                    id: 'btnAdd', style: {margin: '0px .5em'},
                    onclick: app.addProblemFromForceDiagram,
                    title: 'add model to problems'
                }, m(Icon, {name: 'plus'})),
                m(Button, {
                    id: 'btnJoin', style: {margin: '0px .5em'},
                    onclick: app.connectAllForceDiagram,
                    title: 'make all possible connections between nodes'
                }, m(Icon, {name: 'link'})),
                m(Button, {
                    id: 'btnDisconnect', style: {margin: '0px .5em'},
                    onclick: () => app.forceDiagramState.pebbleLinks = [],
                    title: 'delete all connections between nodes'
                }, m(Icon, {name: 'circle-slash'})),
                m(Button, {
                    id: 'btnForce', style: {margin: '0px .5em'},
                    onclick: () => app.forceDiagramState.isPinned = !app.forceDiagramState.isPinned,
                    title: 'pin the variable pebbles to the page'
                }, m(Icon, {name: 'pin'})),
                m(Button, {
                    id: 'btnEraser', style: {margin: '0px .5em'},
                    onclick: app.erase,
                    title: 'wipe all variables from the modeling space'
                }, m(Icon, {name: 'trashcan'}))),
                !app.is_manipulate_mode && m(Subpanel, {title: "History"}),


                app.is_model_mode && selectedProblem && m(Subpanel2, {
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

            m(Popper, {
                content: () => IS_D3M_DOMAIN && m(Table, {data: app.getSelectedDataset().datasetDoc.about})
            }, m('h4#dataName[style=display: inline-block; margin: .25em 1em]', app.selectedDataset || 'Dataset Name')),

            m('div', {style: {'flex-grow': 1}}),

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
                sections: ['Model', 'Explore', 'Results'].map(mode => ({value: mode})), // mode 'Manipulate' diabled

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


let standaloneDatamart = () => {
    return [
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
};

if (IS_EVENTDATA_DOMAIN) {
    m.route(document.body, '/home', {
        '/data': {render: () => m(Peek, {id: 'eventdata', image: '/static/images/TwoRavens.png'})},
        '/:mode': Body_EventData
    });
}
else {
    m.route(document.body, '/model', {
        '/popper': {
            render: () => m(Popper, {
                content: m("div", "popper content"),
                options: {trigger: 'hover'}
            }, m(Button, 'test button'))
        },
        '/datamart': {render: standaloneDatamart},
        '/explore/:variate/:vars...': Body,
        '/data': {render: () => m(Peek, {id: app.peekId, image: '/static/images/TwoRavens.png'})},
        '/:mode': Body
    });
}
