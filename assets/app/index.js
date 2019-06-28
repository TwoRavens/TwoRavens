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

import * as solverRook from "./solvers/rook";
import * as solverD3M from "./solvers/d3m";

import * as common from '../common/common';
import ButtonRadio from '../common/views/ButtonRadio';
import Button from '../common/views/Button';
import ButtonPlain from '../common/views/ButtonPlain';
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
import Canvas from "../common/views/Canvas";
import Subpanel from '../common/views/Subpanel';
import Popper from '../common/views/Popper';
import Datamart, {ModalDatamart} from "./datamart/Datamart";

import PreprocessInfo from "./views/PreprocessInfo";
import PanelButton from './views/PanelButton';
import Flowchart from './views/Flowchart';
import Icon from '../common/views/Icon';
import ForceDiagram from "./views/ForceDiagram";
import ButtonLadda from "./views/LaddaButton";
import ModalWorkspace from "./views/ModalWorkspace";
import VariableSummary, {formatVariableSummary} from "./views/VariableSummary";

// EVENTDATA
import Body_EventData from './eventdata/Body_EventData';
import TextFieldSuggestion from "../common/views/TextFieldSuggestion";
import BodyDataset from "./views/BodyDataset";
import {variableSummaries} from "./app";
import {endAllSearches} from "./solvers/d3m";
import {stopAllSearches} from "./solvers/d3m";
import {endsession} from "./solvers/d3m";
import {handleENDGetSearchSolutionsResults} from "./solvers/d3m";

export let bold = value => m('div', {style: {'font-weight': 'bold', display: 'inline'}}, value);
export let italicize = value => m('div', {style: {'font-style': 'italic', display: 'inline'}}, value);
export let link = url => m('a', {href: url, style: {color: 'darkblue'}, target: '_blank', display: 'inline'}, url);


// adding problemID and version for Preprocess API part
let exploreVariables = [];

class Body {
    oninit() {
        app.setRightTab(IS_D3M_DOMAIN ? 'Problem' : 'Models');
        app.set_mode('model');
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
            return replace
                ? val
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
        //app.alertLog(m(TextField, {value: JSON.stringify(app.workspaces)}));

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

        let ravenConfig = (app.workspace || {}).raven_config;
        let selectedProblem = app.getSelectedProblem();
        let resultsProblem = app.getResultsProblem();

        let drawForceDiagram = app.is_model_mode && selectedProblem && Object.keys(app.variableSummaries).length > 0;
        let forceData = drawForceDiagram && app.buildForceData(selectedProblem);

        return m('main',

            this.construct_modals(),
            this.header(app.currentMode),
            this.footer(app.currentMode),
            app.workspace && this.leftpanel(app.currentMode, drawForceDiagram && forceData),
            app.workspace && this.rightpanel(app.currentMode),
            app.workspace && this.manipulations(),

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
                    app.is_results_mode && m(results.CanvasSolutions, {problem: resultsProblem}),
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
                                    let selected = discovery ? [ravenConfig.selectedProblem] : exploreVariables;
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
                                (discovery ? Object.keys(ravenConfig.problems) : Object.keys(app.variableSummaries)).map(x => {
                                    let selected = discovery
                                        ? x === selectedProblem.problemID
                                        : exploreVariables.includes(x);

                                    let targetName = discovery
                                        ? ravenConfig.problems[x].targets[0]
                                        : x;

                                    let show = app.exploreVariate === 'Bivariate' || app.exploreVariate === 'Trivariate';
                                    let [n0, n1, n2] = exploreVariables.map(variable => app.variableSummaries[variable]);
                                    let predictorVariables = app.getPredictorVariables(selectedProblem);

                                    // tile for each variable or problem
                                    let tile = m('span#exploreNodeBox', {
                                            onclick: _ => {
                                                if (discovery) {
                                                    app.setSelectedProblem(x);
                                                    exploreVariables = [x];
                                                    return;
                                                }

                                                if (app.exploreVariate === 'Multivariate') {
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
                                                    ? ravenConfig.problems[x].targets[0]
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
                                                    : predictorVariables ? [
                                                            m('b', x),
                                                            m('p', predictorVariables.join(', '))]
                                                        : x)
                                    );

                                    if (app.variableSummaries[targetName].labl)
                                        return m(Popper, {content: () => app.variableSummaries[targetName].labl}, tile);
                                    return tile;
                                }))
                        )],
                    drawForceDiagram && m(ForceDiagram, Object.assign(app.forceDiagramState,{
                        nodes: app.forceDiagramNodesReadOnly,
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

                        labels: app.forceDiagramLabels(selectedProblem),
                        mutateNodes: app.mutateNodes(selectedProblem),
                        pebbleLinks: selectedProblem.pebbleLinks,
                        onclickLink: d => {
                            let originalLink = selectedProblem.pebbleLinks.find(link =>  d.source === link.source && d.target === link.target);
                            if (!originalLink) return;
                            app.remove(selectedProblem.pebbleLinks, originalLink);
                            app.resetPeek();
                        }
                    }, forceData))),

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
                    onclick: () => selectedProblem.pebbleLinks = [],
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
            )
        );
    }

    header() {
        let userlinks = username === '' ? [
            {title: "Log in", url: login_url},
            {title: "Sign up", url: signup_url}
        ] : [{title: "Workspaces", url: workspaces_url},
            {title: "Clear Workspaces", url: '/user-workspaces/clear-user-workspaces'},
            {title: "Settings", url: settings_url},
            {title: "Links", url: devlinks_url},
            {title: "Behavioral Logs", url: behavioral_log_url},
            {title: "Logout", url: logout_url}];

        let resultsProblem = app.getResultsProblem();
        let selectedProblem = app.getSelectedProblem();

        let createBreadcrumb = () => {
            let path = [
                m(Popper, {content: () => m(Table, {data: app.workspace.datasetDoc.about})},
                    m('h4#dataName', {
                            style: {display: 'inline-block', margin: '.25em 1em'},
                        },
                        app.workspace.d3m_config.name || 'Dataset Name', m('br'),
                        app.workspace.name !== app.workspace.d3m_config.name && m('div', {style: {
                                'font-style': 'italic', float: 'right', 'font-size': '14px',
                            }}, `workspace: ${app.workspace.name}`)
                    ))
            ];

            let pathProblem = {
                'model': selectedProblem, 'results': resultsProblem
            }[app.currentMode];

            if (pathProblem) path.push(m(Icon, {name: 'chevron-right'}), m(Popper, {
                content: () => m(Table, {
                    data: {'targets': pathProblem.targets, 'predictors': pathProblem.predictors,'description': pathProblem.description}
                })
            }, m('h4[style=display: inline-block; margin: .25em 1em]', pathProblem.problemID)));

            let selectedSolutions = app.getSolutions(resultsProblem);
            if (app.is_results_mode && selectedSolutions.length === 1 && selectedSolutions[0]) {
                path.push(m(Icon, {name: 'chevron-right'}), m('h4[style=display: inline-block; margin: .25em 1em]', ({
                    'rook': solverRook, 'd3m': solverD3M
                })[selectedSolutions[0].source].getName(pathProblem, selectedSolutions[0])))
            }

            return path;
        };

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

            m(Button, {
                onclick: () => window.open('/#!/dataset')
            }, 'Dataset Description'),
            app.workspace && createBreadcrumb(),

            m('div', {style: {'flex-grow': 1}}),



            app.currentMode === 'results' && resultsProblem && Object.keys(resultsProblem.solutions.d3m).length > 0 && m(Button, {
                id: 'btnEndSession',
                class: 'ladda-label ladda-button',
                onclick: solverD3M.endsession,
                style: {margin: '0.25em 1em', 'data-spinner-color': 'black', 'data-style': 'zoom-in'}
            }, 'Mark Problem Finished'),


            // m(Button, {onclick: () => app.alertWarn(JSON.stringify(app.getResultsProblem()))}, 'debug'),
            m(ButtonRadio, {
                id: 'modeButtonBar',
                attrsAll: {style: {margin: '0px 1em', width: 'auto'}, class: 'navbar-left'},
                attrsButtons: {
                    // class: 'btn-sm',
                    style: {width: "auto"}},
                onclick: app.set_mode,
                activeSection: app.currentMode || 'model',
                sections: ['Model', 'Explore', 'Results'].map(mode => ({value: mode})), // mode 'Manipulate' diabled

                // attrsButtons: {class: ['btn-sm']}, // if you'd like small buttons (btn-sm should be applied to individual buttons, not the entire component)
                // attrsButtons: {style: {width: 'auto'}}
            }),

            // m(Button, {
            //     id: 'btnReset',
            //     class: 'ladda-label ladda-button',
            //     title: 'Reset',
            //     onclick: app.reset,
            //     style: {margin: '0.25em 1em', 'data-spinner-color': 'black', 'data-style': 'zoom-in'}
            // }, m(Icon, {name: 'sync'})),

            // IS_D3M_DOMAIN && app.is_model_mode && m(ButtonLadda, {
            //     id: 'btnEstimate',
            //     class: app.buttonClasses.btnEstimate,
            //     activeLadda: Object.values(app.solverPending).some(_=>_),
            //     onclick: app.estimate,
            //     style: {margin: '0.25em 1em', 'data-spinner-color': 'black', 'data-style': 'zoom-in'}
            // }, 'Solve This Problem'),
            // mode !== 'model' ? null : navBtn('btnEstimate.btn-default', 1, 1, app.estimate, m("span.ladda-label", mode === 'explore' ? 'Explore' : 'Solve This Problem'), '150px'),

            m(Dropdown, {
                id: 'loginDropdown',
                items: userlinks.map(link => link.title),
                activeItem: username,
                onclickChild: child => window.open(userlinks.find(link => link.title === child).url)
            })
            // m('.dropdown[style=float: right; padding-right: 1em]',
            //     m('#drop.button.btn[type=button][data-toggle=dropdown][aria-haspopup=true][aria-expanded=false]',
            //         [username, " ", m(Icon, {name: 'triangle-down'})]),
            //     m('ul.dropdown-menu[role=menu][aria-labelledby=drop]',
            //         userlinks.map(link => m('a[style=padding: 0.5em]', {href: link.url}, link.title, m('br'))))),
        );
    }

    peekTable() {

        let pipeline = [
            ...app.workspace.raven_config.hardManipulations,
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

    footer() {

        return m(Footer, [
            m('div.btn.btn-group[style=margin:5px;padding:0px]',
                m(Button, {id: 'btnTA2',class: 'btn-sm', onclick: _ => hopscotch.startTour(app.mytour(), 0)}, 'Help Tour ', m(Icon, {name: 'milestone'})),
                m(Button, {id: 'btnTA2', class: 'btn-sm', onclick: _ => app.helpmaterials('video')}, 'Video ', m(Icon, {name: 'file-media'})),
                m(Button, {id: 'btnTA2', class: 'btn-sm', onclick: _ => app.helpmaterials('manual')}, 'Manual ', m(Icon, {name: 'file-pdf'})),
                m(Button, {
                        id: 'btnAPIInfoWindow',
                        class: `btn-sm ${app.isAPIInfoWindowOpen ? 'active' : ''}`,
                        onclick: _ => app.setAPIInfoWindowOpen(true),
                    },
                    `Basic Info (id: ${app.getCurrentWorkspaceId()})`
                )
            ),
            app.workspace && m('div.btn.btn-group[style=margin:5px;padding:0px]',
                !app.workspace.is_original_workspace && m(ButtonPlain, {
                    id: 'btnSaveWorkspace',
                    class: `btn-sm btn-secondary ${app.saveCurrentWorkspaceWindowOpen ? 'active' : ''}`,
                    onclick: _ => {
                      if (app.workspace.is_original_workspace){
                          // we want to preserve the original, so force
                          // it to be a new workspace
                          app.setSaveNameModalOpen(true);
                      }else{
                          app.saveUserWorkspace();
                      }
                    }
                  },
                  'Save '),

                m(ButtonPlain, {
                    id: 'btnSaveAsNewWorkspace',
                    // 'aria-pressed': `${app.isSaveNameModelOpen ? 'true' : 'false'}`,
                    class: `btn-sm btn-secondary ${app.showModalSaveName ? 'active' : ''}`,
                    onclick: _ => app.setShowModalSaveName(true)
                  },
                  'Save As New ',
                ),
                m(ButtonPlain, {
                        id: 'btnLoadWorkspace',
                        // 'aria-pressed': `${app.isSaveNameModelOpen ? 'true' : 'false'}`,
                        class: `btn-sm btn-secondary ${app.showModalWorkspace? 'active' : ''}`,
                        onclick: () => app.setShowModalWorkspace(true)
                    },
                    'Load',
                )
              ),
            m(Button, {
                style: {'margin': '8px'},
                title: 'alerts',
                class: 'btn-sm',
                onclick: () => app.setShowModalAlerts(true)
            }, m(Icon, {name: 'bell', style: `color: ${app.alerts.length > 0 && app.alerts[0].time > app.alertsLastViewed ? common.selVarColor : '#818181'}`})),

            m(Button, {
                style: {'margin': '8px'},
                title: 'ta2 debugger',
                class: 'btn-sm',
                onclick: () => app.setShowModalTA2Debug(true)
            }, m(Icon, {name: 'bug'})),

            m(Button, {
                style: {'margin': '8px'},
                title: 'ta2 debugger',
                class: 'btn-sm',
                onclick: () => {
                    solverD3M.endAllSearches();
                    solverD3M.stopAllSearches();
                    // solverD3M.endsession();
                    // solverD3M.handleENDGetSearchSolutionsResults();
                }
            }, m(Icon, {name: 'stop'})),

            // m("span", {"class": "footer-info-break"}, "|"),
            // m("a", {"href" : "/dev-raven-links", "target": "=_blank"}, "raven-links"),

            m('div.btn.btn-group', {style: 'float: right; padding: 0px;margin:5px'},


                // m(Button, {
                //     class: 'btn-sm',
                //     onclick: app.downloadPeek
                // }, 'Download'),
                m(Button, {
                    class: 'btn-sm' + (app.peekInlineShown ? ' active' : ''),
                    onclick: () => app.setPeekInlineShown(!app.peekInlineShown)
                }, 'Peek'),
                m(Button,{
                    onclick: () => window.open('#!/data', 'data') && app.logEntryPeekUsed(true),
                    class: 'btn-sm'
                  },
                  m(Icon, {name: 'link-external'}))
                ),
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

    /*
     * Start: Construct potential modal boxes for the page.
     */
    construct_modals() {
        this.TA2URL = D3M_SVC_URL + '/SearchDescribeFitScoreSolutions';
        return [
            m(Modal),
            this.modalSaveCurrentWorkspace(),
            app.showModalWorkspace && m(ModalWorkspace, {
                    workspace: app.workspace,
                    setDisplay: app.setShowModalWorkspace,
                    loadWorkspace: app.loadWorkspace
                }
            ),
            /*
             * Alerts modal.  Displays the list of alerts, if any.
             */
            app.showModalAlerts && m(ModalVanilla, {
                id: 'alertsModal',
                setDisplay: () => {
                    app.alertsLastViewed.setTime(new Date().getTime());
                    app.setShowModalAlerts(false)
                }
            }, [
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
            /*
             * Datamart Modal
             */
            app.workspace && m(ModalDatamart, {
                preferences: app.datamartPreferences,
                endpoint: app.datamartURL,
                dataPath: app.workspace.datasetUrl
            }),

            // Show basic API and Workspace Info
            this.modalBasicInfo(),

            /*
             * Save as new workspace modal.
             *  - prompt user for new workspace name
             */
            app.showModalSaveName && m(ModalVanilla, {
                id: "modalNewWorkspacename",
                setDisplay: () => {
                  app.setShowModalSaveName(false);
                },
              },
                m('div', {'class': 'row'},
                  m('div', {'class': 'col-sm'},
                    [
                      app.workspace.is_original_workspace &&  m('h3', {}, 'Save Workspace.'),

                      !app.workspace.is_original_workspace &&  m('h3', {}, 'Save as a New Workspace.'),

                      m('p', {}, 'Please enter a workspace name.'),

                      m('p', {},
                        m('b', '- Current workspace name: '),
                        m('span', `"${app.getCurrentWorkspaceName()}"`),
                        m('span', ` (id: ${app.getCurrentWorkspaceId()})`),
                      ),

                      // Text field to enter new workspace name
                      m(TextField, {
                        id: 'newNameModal',
                        placeholder: 'New Workspace Name',
                        oninput: app.setNewWorkspaceName,
                        onblur: app.setNewWorkspaceName,
                        value: app.newWorkspaceName
                      }),

                      // Display user messages
                      m('div', {
                          id: 'newNameMessage',
                          style: 'padding:20px 0;'
                        },
                        m('p', {class: "lead"}, app.getnewWorkspaceMessage())
                      ),
                      // Close Button Row - used if save is successful
                      app.displayCloseButtonRow && m('div', {
                          id: 'rowCloseModalButton',
                          class: 'row',
                        },
                        m('div', {'class': 'col-sm'},
                          // Close
                          m(ButtonPlain, {
                            id: 'btnRowCloseModalButton',
                            class: 'btn-sm btn-primary',
                            onclick: _ => {
                              app.setShowModalSaveName(false);},
                            },
                            'Close'),
                          )
                      ),


                      // Button Row
                      app.displaySaveNameButtonRow && m('div', {
                          id: 'rowSaveWorkspaceButtons',
                          class: 'row',
                        },
                        m('div', {'class': 'col-sm'},

                          // Cancel button
                          m(ButtonPlain, {
                            id: 'btnModalCancelSaveAsNewWorkspace',
                            class: 'btn-sm btn-secondary',
                            style: 'margin-right: 15px;',
                            onclick: _ => {
                              app.setNewWorkspaceName('');
                              app.setShowModalSaveName(false);},
                            },
                            'Cancel'),

                          // Save Button
                          m(ButtonPlain, {
                            id: 'btnModalSaveAsNewWorkspace',
                            class: 'btn-sm btn-primary',
                            onclick: _ => {
                              console.log('save clicked...');

                              // clear any error messages
                              app.setNewWorkspaceMessageSuccess('Attempting to save...')

                              // attempt to save the name
                              app.saveAsNewWorkspace();
                          },
                        },
                        'Save'),
                    )
                  )
              /*
               * END: Save as new workspace modal.
               */
              ]),
            )
          ),

            app.showModalTA2Debug && m(ModalVanilla, {
                    id: 'modalTA2Debug',
                    setDisplay: app.setShowModalTA2Debug
                },
                m('h4', 'TA2 System Debugger'),
                m(Button, {
                    style: {margin: '1em'},
                    onclick: async () => {

                        let selectedProblem = app.getSelectedProblem();
                        let searchSolutionParams = solverD3M.GRPC_SearchSolutionsRequest(selectedProblem);

                        let nominalVars = new Set(app.getNominalVariables(selectedProblem));

                        let hasManipulation = selectedProblem.manipulations.length > 0;
                        let hasNominal = [...selectedProblem.targets, ...app.getPredictorVariables(selectedProblem)]
                            .some(variable => nominalVars.has(variable));

                        let needsProblemCopy = hasManipulation || hasNominal;

                        // TODO: upon deleting or reassigning datasetDocProblemUrl, server-side temp directories may be deleted
                        if (needsProblemCopy) {
                            let {metadata_path} = await manipulate.buildProblemUrl(selectedProblem);
                            selectedProblem.datasetDocPath = metadata_path;
                        } else delete selectedProblem.datasetDocPath;

                        // initiate rook solver
                        // - TO-FIX 5/22/2019
                        //callSolver(selectedProblem, datasetPath);

                        let datasetDocPath = selectedProblem.datasetDocPath || app.workspace.d3m_config.dataset_schema;

                        this.TA2Post = JSON.stringify({
                            searchSolutionParams: searchSolutionParams,
                            fitSolutionDefaultParams: solverD3M.GRPC_GetFitSolutionRequest(datasetDocPath),
                            produceSolutionDefaultParams: solverD3M.GRPC_ProduceSolutionRequest(datasetDocPath),
                            scoreSolutionDefaultParams: solverD3M.GRPC_ScoreSolutionRequest(selectedProblem, datasetDocPath)
                        });
                        m.redraw()
                    }
                }, 'Prepare'),
                m(Button, {
                    style: {margin: '1em'},
                    onclick: () => app.makeRequest(D3M_SVC_URL + '/SearchDescribeFitScoreSolutions', JSON.parse(this.TA2Post))
                        .then(response => this.TA2Response = response).then(m.redraw)
                }, 'Send'),
                m('div#URL', {style: {margin: '1em'}},
                    'URL',
                    m(TextField, {
                        value: this.TA2URL,
                        oninput: value => this.TA2URL = value,
                        onblur: value => this.TA2URL = value
                    })),
                m('div#searchContainer', {style: {margin: '1em'}},
                    'POST',
                    m(TextField, {
                        value: this.TA2Post,
                        oninput: value => this.TA2Post = value,
                        onblur: value => this.TA2Post = value
                    })),
                this.TA2Response && m('div#searchContainer', {style: {margin: '1em'}},
                    'Response Successful: ' + this.TA2Response.success,
                    m(TextField, {
                        value: this.TA2Response.message,
                        oninput: _ => _, onblur: _ => _
                    })
                )
            )
        ]
    }

    /*
     * Show basic API and Workspace Info
     */
    modalBasicInfo(){

      return app.isAPIInfoWindowOpen && m(ModalVanilla, {
          id: "modalAPIInfo",
          setDisplay: () => {
            app.setAPIInfoWindowOpen(false);
          },
        },
        // Row 1 - info
        m('div', {'class': 'row'},
          m('div', {'class': 'col-sm'},
            [
              m('h3', {}, 'Basic Information'),
              m('hr'),
              m('p', [
                  m('b', 'Workspace Id: '),
                  m('span', app.getCurrentWorkspaceId())
                ]),
                m('p', [
                    m('b', 'Workspace Name: '),
                    m('span', app.getCurrentWorkspaceName())
                  ]),
              m('hr'),
              m('p', [
                  m('b', 'TA2: '),
                  m('span', app.TA2ServerInfo)
                ]),
              m('p', [
                  m('b', 'TA3 API: '),
                  m('span', `${TA3TA2_API_VERSION}`)
                ]),
              m('hr'),
            ]
          ),
        ),
        // Row 2 - info
        m('div', {'class': 'row'},
          m('div', {'class': 'col-sm text-left'},
            // Close
            m(ButtonPlain, {
              id: 'btnInfoCloseModalButton',
              class: 'btn-sm btn-primary',
              onclick: _ => {
                app.setAPIInfoWindowOpen(false);},
              },
              'Close'),
            )
          )
        )
    } // end: modalBasicInfo

    /*
     * Save current workspace modal.
     */
    modalSaveCurrentWorkspace(){

      return app.saveCurrentWorkspaceWindowOpen && m(ModalVanilla, {
          id: "modalCurrentWorkspaceMessage",
          setDisplay: () => {
            app.setSaveCurrentWorkspaceWindowOpen(false);
          },
        },
        m('div', {'class': 'row'},
          m('div', {'class': 'col-sm'},
              [
                m('h3', {}, 'Save Current Workspace'),
                m('hr'),
                m('p', {},
                  m('b', '- Current workspace name: '),
                  m('span', `"${app.getCurrentWorkspaceName()}"`),
                  m('span', ` (id: ${app.getCurrentWorkspaceId()})`),
                ),

                // Display user messages
                m('div', {
                    id: 'divSaveCurrentMessage',
                    style: 'padding:20px 0;'
                  },
                  m('p', {class: "lead"}, app.getCurrentWorkspaceMessage())
                ),
                m('hr'),
            ]
          )
        ),
          // Close Button Row
          m('div', {
              id: 'rowCloseModalButton',
              class: 'row',
            },
            m('div', {'class': 'col-sm'},
              // Close
              m(ButtonPlain, {
                id: 'btnRowCloseModalButton',
                class: 'btn-sm btn-primary',
                onclick: _ => {
                  app.setSaveCurrentWorkspaceWindowOpen(false);},
                },
                'Close'),
              )
          ),
        );
      /*
       * END: Save current workspace modal.
       */

    }

    /*
     * End: Construct potential modal boxes for the page.
     */

    leftpanel(mode, forceData) {

        if (mode === 'manipulate')
            return manipulate.leftpanel();

        if (mode === 'results')
            return results.leftpanel();

        let ravenConfig = app.workspace.raven_config;
        let selectedProblem = app.getSelectedProblem();

        if (!ravenConfig) return;

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
                    ['user', 'auto', 'solved'].filter(key => key in problemPartition).map(partition => [
                        m('h4.card-header', `${{
                            'user': 'Custom',
                            'auto': 'Discovered',
                            'solved': 'Solved'
                        }[partition]} Problems`),
                        m(Table, {
                            id: 'discoveryTable' + partition,
                            headers: discoveryHeaders,
                            data: problemPartition[partition].map(formatProblem),
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
                    onclick: app.submitDiscProb,
                    title: 'Submit all checked discovered problems'
                }, 'Submit Disc. Probs.')
            ]
        });

        let summaryPebble = app.forceDiagramState.hoverPebble || app.forceDiagramState.selectedPebble;
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
                        oninput: value => app.setGroup(value, variableName),
                        onblur: value => app.setGroup(value, variableName),
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
                        dataPath: ravenConfig.datasetUrl,
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
    }

    rightpanel(mode) {
        if (mode === 'results') return; // returns undefined, which mithril ignores
        if (mode === 'explore') return;
        if (mode === 'manipulate') return manipulate.rightpanel();

        // mode == null (model mode)

        let sections = [];

        let ravenConfig = app.workspace.raven_config;
        let selectedProblem = app.getSelectedProblem();

        if (!ravenConfig) return;

        // PROBLEM TAB
        selectedProblem && sections.push({
            value: 'Problem',
            idSuffix: 'Type',
            contents: [
                m(Button, {
                    id: 'btnLock',
                    class: app.lockToggle ? 'active' : '',
                    onclick: () => app.setLockToggle(!app.lockToggle),
                    title: 'Lock selection of problem description',
                    style: 'right:2em;position:fixed;z-index:1000;margin:0.5em',
                }, m(Icon, {name: app.lockToggle ? 'lock' : 'pencil'})),
                m('', {style: 'float: left'},
                    m('label', 'Task Type'),
                    m(Dropdown, {
                        id: 'taskType',
                        items: app.supportedTasks,
                        activeItem: selectedProblem.task,
                        onclickChild: task => app.setTask(task, selectedProblem),
                        style: {'margin': '1em', 'margin-top': '0'},
                        disabled: app.lockToggle
                    }),
                    Object.keys(app.applicableMetrics[selectedProblem.task]).length !== 1 && [
                        m('label', 'Task Subtype'),
                        m(Dropdown, {
                            id: 'taskSubType',
                            items: Object.keys(app.applicableMetrics[selectedProblem.task]),
                            activeItem: app.getSubtask(selectedProblem),
                            onclickChild: subTask => app.setSubTask(subTask, selectedProblem),
                            style: {'margin': '1em', 'margin-top': '0'},
                            disabled: app.lockToggle
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
                        disabled: app.lockToggle
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
                        disabled: app.lockToggle
                    }),
                    selectedProblem.metrics.length > 0 && m('label', 'Secondary Performance Metrics'),
                    m(ListTags, {readonly: app.lockToggle, tags: selectedProblem.metrics, ondelete: metric => app.remove(selectedProblem.metrics, metric)}),
                    m(Subpanel, {
                        header: 'Search Options',
                        defaultShown: false,
                        style: {margin: '1em'}
                    },
                        m('label', 'Approximate time bound for overall pipeline search, in minutes. Leave empty for unlimited time.'),
                        m(TextField, {
                            id: 'timeBoundOption',
                            value: selectedProblem.timeBound || '',
                            disabled: app.lockToggle,
                            oninput: !app.lockToggle && (value => selectedProblem.timeBound = value.replace(/[^\d.-]/g, '')),
                            onblur: !app.lockToggle && (value => selectedProblem.timeBound = Math.max(0, parseFloat(value.replace(/[^\d.-]/g, ''))) || undefined),
                            style: {'margin-bottom': '1em'}
                        }),
                        m('label', 'Approximate time bound for predicting with a single pipeline, in minutes. Leave empty for unlimited time.'),
                        m(TextField, {
                            id: 'timeBoundPipelineOption',
                            disabled: app.lockToggle,
                            value: selectedProblem.timeBoundRun || '',
                            oninput: !app.lockToggle && (value => selectedProblem.timeBoundRun = value.replace(/[^\d.-]/g, '')),
                            onblur: !app.lockToggle && (value => selectedProblem.timeBoundRun = Math.max(0, parseFloat(value.replace(/[^\d.-]/g, ''))) || undefined),
                            style: {'margin-bottom': '1em'}
                        }),
                        m('label', 'Priority'),
                        m(TextField, {
                            id: 'priorityOption',
                            disabled: app.lockToggle,
                            value: selectedProblem.priority || '',
                            oninput: !app.lockToggle && (value => selectedProblem.priority = value.replace(/[^\d.-]/g, '')),
                            onblur: !app.lockToggle && (value => selectedProblem.priority = parseFloat(value.replace(/[^\d.-]/g, '')) || undefined),
                            style: {'margin-bottom': '1em'}
                        }),
                        m('label', 'Limit on number of solutions'),
                        m(TextField, {
                            id: 'solutionsLimitOption',
                            disabled: app.lockToggle,
                            value: selectedProblem.solutionsLimit || '',
                            oninput: !app.lockToggle && (value => selectedProblem.solutionsLimit = Math.max(0, parseInt(value.replace(/\D/g,''))) || undefined),
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
                            disabled: app.lockToggle
                        }),
                        selectedProblem.evaluationMethod === 'kFold' && [
                            m('label[style=margin-top:0.5em]', 'Number of Folds'),
                            m(TextField, {
                                id: 'foldsScoringOption',
                                disabled: app.lockToggle,
                                value: selectedProblem.folds || '',
                                oninput: !app.lockToggle && (value => selectedProblem.folds = parseFloat(value.replace(/\D/g,'')) || undefined),
                                style: {'margin-bottom': '1em'}
                            }),
                            m('label', 'Stratified Folds'),
                            m(ButtonRadio, {
                                id: 'shuffleScoringOption',
                                onclick: value => {
                                    if (app.lockToggle) return;
                                    selectedProblem.stratified = value === 'True';
                                },
                                activeSection: selectedProblem.stratified ? 'True' : 'False',
                                sections: ['True', 'False'].map(type => ({value: type, attrsInterface: {disabled: app.lockToggle}}))
                            }),
                        ],
                        selectedProblem.evaluationMethod === 'holdout' && [
                            m('label[style=margin-top:0.5em]', 'Train/Test Ratio'),
                            m(TextField, {
                                id: 'ratioOption',
                                disabled: app.lockToggle,
                                value: selectedProblem.trainTestRatio || 0,
                                onblur: !app.lockToggle && (value => selectedProblem.trainTestRatio = Math.max(0, Math.min(1, parseFloat(value.replace(/[^\d.-]/g, '')) || 0))),
                                style: {'margin-bottom': '1em'}
                            })
                        ],
                        m('label[style=margin-top:0.5em]', 'Shuffle'),
                        m(ButtonRadio, {
                            id: 'shuffleScoringOption',
                            onclick: !app.lockToggle && (value => selectedProblem.shuffle = value === 'True'),
                            activeSection: selectedProblem.shuffle ? 'True' : 'False',
                            sections: ['True', 'False'].map(type => ({value: type, attrsInterface: {disabled: app.lockToggle}}))
                        }),
                        selectedProblem.shuffle && [
                            m('label[style=margin-top:0.5em]', 'Shuffle random seed'),
                            m(TextField, {
                                id: 'shuffleSeedScoringOption',
                                disabled: app.lockToggle,
                                value: selectedProblem.shuffleRandomSeed || 0,
                                oninput: !app.lockToggle && (value => selectedProblem.shuffleRandomSeed = parseFloat(value.replace(/\D/g,'')) || undefined),
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

    manipulations() {
        let selectedProblem = app.getSelectedProblem();
        return (app.is_manipulate_mode || (app.is_model_mode && app.rightTab === 'Manipulate')) && manipulate.menu([
            ...app.workspace.raven_config.hardManipulations,
            ...(app.is_model_mode ? selectedProblem.manipulations : [])
        ])  // the identifier for which pipeline to edit
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
                dataPath: app.workspace.datasetUrl,
                endpoint: app.datamartURL,
                labelWidth: '10em'
            })),
        m(ModalDatamart, {
            preferences: app.datamartPreferences,
            endpoint: app.datamartURL,
            dataPath: app.workspace.datasetUrl
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
        '/dataset': {render: () => m(BodyDataset, {image: '/static/images/TwoRavens.png'})},
        '/datamart': {render: standaloneDatamart},
        '/explore/:variate/:vars...': Body,
        '/data': {render: () => m(Peek, {id: app.peekId, image: '/static/images/TwoRavens.png'})},
        '/:mode': Body
    });
}
