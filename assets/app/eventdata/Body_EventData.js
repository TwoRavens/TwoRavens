import m from 'mithril';

import {glyph} from "../index";

import * as eventdata from './eventdata';
import * as tour from "./tour";
import '../../css/eventdata.css'

import {manipulations, looseSteps, mongoURL} from "../app";
import * as queryAbstract from '../manipulations/queryAbstract';
import * as queryMongo from '../manipulations/queryMongo';

import * as common from '../../common/common';
import '../../common/common.css';
import Panel from '../../common/views/Panel';
import Header from '../../common/views/Header';
import Footer from '../../common/views/Footer';
import Canvas from '../../common/views/Canvas';
import MenuTabbed from '../../common/views/MenuTabbed';
import MenuHeaders from '../../common/views/MenuHeaders';
import PanelList from '../../common/views/PanelList';
import TextField from '../../common/views/TextField';
import ButtonRadio from '../../common/views/ButtonRadio';
import Button from "../../common/views/Button";
import ModalVanilla from "../../common/views/ModalVanilla";
import Table from "../../common/views/Table";

import CanvasAbout from "./canvases/CanvasAbout";
import CanvasDatasets from "./canvases/CanvasDatasets";
import CanvasSavedQueries from "./canvases/CanvasSavedQueries";

import CanvasDiscrete from "../canvases/CanvasDiscrete";
import CanvasDyad from "../canvases/CanvasDyad";
import CanvasDate from "../canvases/CanvasDate";
import CanvasDiscreteGrouped from "../canvases/CanvasDiscreteGrouped";
import CanvasCoordinates from "../canvases/CanvasCoordinates";
import CanvasCustom from "./canvases/CanvasCustom";
import CanvasResults from "./canvases/CanvasResults";

import SaveQuery from "./SaveQuery";
import {TreeAggregate, TreeSubset, TreeVariables} from "../views/JQTrees";
import Icon from "../views/Icon";

export default class Body_EventData {

    oninit(vnode) {
        if (vnode.attrs.mode !== 'home') {
            m.route.set('/home');
            vnode.attrs.mode = 'home';
        }

        // all eventdata manipulations stored in one manipulations key
        manipulations['eventdata'] = [];

        looseSteps['pendingSubset'] = {
            type: 'subset',
            id: 0,
            abstractQuery: [],
            nodeId: 1,
            groupId: 1
        };

        looseSteps['eventdataAggregate'] = {
            type: 'aggregate',
            id: 'eventdataAggregate',
            measuresUnit: [],
            measuresAccum: [],
            nodeId: 1
        };

        eventdata.resetPeek();

        // Load the metadata for all available datasets
        m.request({
            url: mongoURL + 'get-metadata',
            data: {'collections': null}, // no specific dataset passed, so it returns all
            method: 'POST'
        }).then(eventdata.setMetadata).catch(eventdata.laddaStopAll);
    }

    header() {

        let userlinks = username === '' ? [
            {title: "Log in", url: login_url},
            {title: "Sign up", url: signup_url}
        ] : [{title: "Workspaces", url: workspaces_url},
            {title: "Settings", url: settings_url},
            {title: "Links", url: devlinks_url},
            {title: "Logout", url: logout_url}];

        let attrsInterface = {style: {width: 'auto'}};
        let isHome = eventdata.selectedCanvas === eventdata.selectedCanvasHome;

        return m(Header, {image: '/static/images/TwoRavens.png', aboutText: eventdata.aboutText},

            m('div', {style: {'flex-grow': 1}}),
            m("h4#datasetLabel", {style: {margin: '.25em 1em'}},
                eventdata.selectedDataset ? eventdata.genericMetadata[eventdata.selectedDataset]['name'] : ''),

            m('div', {style: {'flex-grow': 1}}),
            eventdata.selectedDataset && !isHome && m("button#btnPeek.btn.btn-default", {
                title: 'Display a data preview',
                style: {margin: '.25em 1em'},
                onclick: () => {
                    window.open('#!/data', 'data');
                    eventdata.resetPeek();
                }
            }, 'Data'),

            isHome && m(ButtonRadio, {
                id: 'homeCanvasButtons',
                sections: [
                    {value: 'Datasets', attrsInterface},
                    {value: 'Saved Queries', attrsInterface},
                    // {value: 'About', attrsInterface}
                ],
                activeSection: eventdata.selectedCanvasHome,
                onclick: eventdata.setSelectedCanvas,
                attrsAll: {style: {width: 'auto'}}
            }),

            // Button Reset
            eventdata.selectedDataset && !isHome && m("button#btnReset.btn.btn-default.ladda-button[title='Reset']", {
                'data-style': 'zoom-in',
                'data-spinner-color': '#818181',
                style: {margin: '1em'},
                onclick: eventdata.reset
            },
            m("span.ladda-label.glyphicon.glyphicon-repeat", {
                style: {
                    "font-size": ".25em 1em",
                    "color": "#818181",
                    "pointer-events": "none"
                }
            })),

            m(ButtonRadio, {
                id: 'modeButtonBar',
                attrsAll: {style: {width: 'auto', margin: '.25em 1em'}},
                onclick: eventdata.setSelectedMode,
                activeSection: eventdata.selectedMode,
                sections: [
                    {value: 'Home', attrsInterface: {style: {'width': 'auto'}}}
                ].concat(eventdata.selectedDataset ? [
                    {value: 'Subset', id: 'btnSubsetMode', attrsInterface: {style: {'width': 'auto'}}},
                    {value: 'Aggregate', attrsInterface: {style: {'width': 'auto'}}}
                ] : [])
            }),
            
            m('.dropdown[style=float: right; padding-right: 1em]',
                m('#drop.button.btn[type=button][data-toggle=dropdown][aria-haspopup=true][aria-expanded=false]',
                    [isAuthenticated ? username : m('div[style=font-style:oblique]', 'not logged in'), " ", m(Icon, {name: 'triangle-down'})]),
                m('ul.dropdown-menu[role=menu][aria-labelledby=drop]',
                    userlinks.map(link => m('a[style=padding: 0.5em]', {href: link.url}, link.title, m('br'))))),
        );
    }

    footer(mode) {

        let tourBar;

        let tourButton = (name, tour) => m(`button.btn.btn-default.btn-sm[id='tourButton${name}'][type='button']`, {
            style: {
                "margin-left": "5px",
                "margin-top": "4px"
            },
            onclick: tour
        }, name);

        if (mode === 'subset') {
            let tours = {
                'dyad': tour.tourStartDyad,
                'date': tour.tourStartDate,
                'discrete': tour.tourStartDiscrete,
                'discrete_grouped': tour.tourStartDiscreteGrouped,
                'coordinates': tour.tourStartCoordinates,
                'custom': tour.tourStartCustom
            };
            let subsetType = eventdata.genericMetadata[eventdata.selectedDataset]['subsets'][eventdata.selectedSubsetName]['type'];
            tourBar = [
                m("span.label.label-default", {style: {"margin-left": "10px", "display": "inline-block"}}, "Tours"),
                m("div[id='subsetTourBar']", {style: {"display": "inline-block"}},
                    tourButton('General', tour.tourStartGeneral),
                    eventdata.selectedCanvas === 'Subset' && tourButton(eventdata.selectedSubsetName, tours[subsetType]),
                    eventdata.selectedCanvas === 'Custom' && tourButton('Custom', tour.tourStartCustom))
            ];
        }

        if (mode === 'aggregate') {
            tourBar = [
                m("span.label.label-default", {style: {"margin-left": "10px", "display": "inline-block"}}, "Tours"),
                m("div[id='aggregTourBar']", {style: {"display": "inline-block"}}, [
                    tourButton('Aggregation', tour.tourStartAggregation)
                ])];
        }

        let recordCount = {
            'subset': eventdata.totalSubsetRecords,
            'aggregate': eventdata.tableData && eventdata.tableData.length
        }[eventdata.selectedMode];

        return m(Footer,
            tourBar,
            m("#recordBar", {style: {display: "inline-block", float: 'right'}}, [

                eventdata.selectedMode !== 'home' && m(Button, {
                    class: 'btn-sm',
                    title: isAuthenticated
                        ? 'save your constructed ' + eventdata.selectedMode
                        : 'must be logged in to save ' + eventdata.selectedMode,
                    disabled: !isAuthenticated,
                    onclick: async () => {
                        if ('subset' === eventdata.selectedMode && manipulations.eventdata.length === 0)
                            tour.tourStartSaveQueryEmpty();
                        else if ('aggregate' === eventdata.selectedMode && !looseSteps['eventdataAggregate'].measuresAccum.length)
                            tour.tourStartEventMeasure();
                        else {
                            if ('aggregate' === eventdata.selectedMode && eventdata.aggregationStaged) {
                                eventdata.setLaddaSpinner('btnSave', true);
                                await eventdata.submitAggregation();
                                eventdata.setLaddaSpinner('btnSave', false);
                            }
                            eventdata.setShowSaveQuery(true);
                            m.redraw();
                        }
                    }, style: {'margin-top': '4px'}
                }, 'Save'),

                eventdata.selectedMode !== 'home' && m(Button, {
                    id: 'btnDownload',
                    title: isAuthenticated
                        ? 'download your constructed ' + eventdata.selectedMode
                        : 'must be logged in to download ' + eventdata.selectedMode,
                    disabled: !isAuthenticated,
                    'data-style': 'zoom-in',
                    'data-spinner-color': '#818181',
                    class: 'btn-sm ladda-button',
                    style: {
                        'margin-right': '6px',
                        'margin-top': '4px',
                        'margin-left': '6px'
                    },
                    onclick: async () => {
                        if ('subset' === eventdata.selectedMode) {
                            if (manipulations.eventdata.length === 0) {
                                tour.tourStartSaveQueryEmpty();
                                return;
                            }
                            let downloadStep = {
                                type: 'menu',
                                metadata: {
                                    type: 'data',
                                    variables: (eventdata.selectedVariables.size + eventdata.selectedConstructedVariables.size) === 0
                                        ? [
                                            ...eventdata.genericMetadata[eventdata.selectedDataset]['columns'],
                                            ...eventdata.genericMetadata[eventdata.selectedDataset]['columns_constructed']
                                        ] : [
                                            ...eventdata.selectedVariables,
                                            ...eventdata.selectedConstructedVariables
                                        ]
                                }
                            };
                            let compiled = queryMongo.buildPipeline([...manipulations.eventdata, downloadStep])['pipeline'];
                            eventdata.setLaddaSpinner('btnDownload', true);
                            await eventdata.download(eventdata.selectedDataset, JSON.stringify(compiled))
                                .finally(() => eventdata.setLaddaSpinner('btnDownload', false));

                        }
                        if ('aggregate' === eventdata.selectedMode) {
                            if (looseSteps['eventdataAggregate'].measuresAccum.length === 0) {
                                tour.tourStartEventMeasure();
                                return;
                            }
                            let compiled = queryMongo.buildPipeline([...manipulations.eventdata, looseSteps['eventdataAggregate']])['pipeline'];
                            eventdata.setLaddaSpinner('btnDownload', true);
                            await eventdata.download(eventdata.selectedDataset, JSON.stringify(compiled))
                                .finally(() => eventdata.setLaddaSpinner('btnDownload', false));
                        }
                    }
                }, m("span.ladda-label", "Download")),

                // Record Count
                eventdata.selectedDataset && recordCount !== undefined && m("span.label.label-default#recordCount", {
                    style: {
                        "margin-left": "5px",
                        "margin-top": "10px",
                        "margin-right": "10px"
                    }
                }, recordCount + ' Records')
            ]),
        );
    }

    leftpanel(mode) {
        if (mode === 'home') {
            common.setPanelOcclusion('left', `calc(2*${common.panelMargin} + 250px)`);
        }

        if (mode === 'subset') {
            let alignedColumns = eventdata.genericMetadata[eventdata.selectedDataset]['alignments'];
            let metadataSubsets = eventdata.genericMetadata[eventdata.selectedDataset]['subsets'];

            let isAligned = (subsetName) => {
                if ('alignments' in metadataSubsets[subsetName]) return 'Aligned';
                if (metadataSubsets[subsetName]['type'] === 'dyad')
                    for (let tab of Object.values(metadataSubsets[subsetName]['tabs'])) {
                        if (tab['full'] in alignedColumns) return 'Aligned';
                        for (let filter of tab['filters']) if (filter in alignedColumns) return 'Aligned';
                    }
                else for (let column of metadataSubsets[subsetName]['columns'])
                    if (column in alignedColumns) return 'Aligned';
                return 'Unaligned';
            };

            let subsetLists = Object.keys(eventdata.genericMetadata[eventdata.selectedDataset]['subsets'])
                .reduce((out, subset) => {
                    out[isAligned(subset)].push(subset);
                    return out;
                }, {Aligned: [], Unaligned: []});
            subsetLists['Unaligned'].push('Custom');

            let popoverContentSubset = (subset) => {
                let metadata = eventdata.genericMetadata[eventdata.selectedDataset]['subsets'][subset];
                if (!metadata) return;
                let {alignments, formats, columns} = eventdata.getSubsetMetadata(eventdata.selectedDataset, subset);
                let text = '<table class="table table-sm table-striped" style="margin-bottom:0"><tbody>';
                let div = (name, val) =>
                    text += `<tr><th>${name}</th><td><p class="text-left">${val}</p></td></tr>`;
                columns.length && div('Columns', columns.join(', '));
                formats.length && div('Formats', formats.join(', '));
                alignments.length && div('Alignments', alignments.join(', '));

                if ('type' in metadata) div('Type', metadata['type']);
                if ('structure' in metadata) div('Structure', metadata['structure']);
                if ('tabs' in metadata) div('Tabs', Object.keys(metadata['tabs']).join(', '));
                if ('group_by' in metadata) div('Group By', metadata['group_by']);
                return text + '</tbody></table>';
            };

            let popoverContentVariable = (variable) => {
                let metadata = eventdata.genericMetadata[eventdata.selectedDataset];
                let text = '<table class="table table-sm table-striped" style="margin-bottom:0"><tbody>';
                let div = (name, val) =>
                    text += `<tr><th>${name}</th><td><p class="text-left">${val}</p></td></tr>`;

                if ('formats' in metadata) {
                    let format = metadata['formats'][variable];
                    format && div('Format', format);
                }
                if ('alignments' in metadata) {
                    let alignment = metadata['alignments'][variable];
                    alignment && div('Alignment', alignment);
                }
                if ('deconstruct' in metadata) {
                    let deconstruct = metadata['deconstruct'][variable];
                    deconstruct && div('Delimiter', deconstruct);
                }
                return text + '</tbody></table>';
            };

            let matchedVariables = eventdata.genericMetadata[eventdata.selectedDataset]['columns']
                .filter(col => col.includes(eventdata.variableSearch));

            let matchedConstructedVariables = eventdata.genericMetadata[eventdata.selectedDataset]['columns_constructed']
                .filter(col => col.includes(eventdata.variableSearch));

            return m(Panel, {
                side: 'left',
                label: 'Data Selection',
                hover: window.innerWidth < 1200,
                width: '250px'
            }, m(MenuTabbed, {
                id: 'leftPanelMenu',
                callback: eventdata.setLeftTabSubset,
                currentTab: eventdata.leftTabSubset,
                // attrsAll: {style: {height: 'calc(100% - 39px)'}},
                sections: [
                    {
                        value: 'Variables',
                        title: 'Restrict by data column.',
                        contents: [
                            m(TextField, {
                                id: 'searchVariables',
                                placeholder: 'Search variables',
                                value: eventdata.variableSearch,
                                oninput: eventdata.setVariableSearch
                            }),
                            m('div', {style: {height: 'calc(100% - 44px)', overflow: 'auto'}},
                                m(PanelList, {
                                    id: 'variablesList',
                                    items: matchedVariables,
                                    colors: {[common.selVarColor]: eventdata.selectedVariables},
                                    callback: eventdata.toggleSelectedVariable,
                                    popup: popoverContentVariable,
                                    attrsItems: {
                                        'data-placement': 'right',
                                        'data-container': '#variablesList'
                                    }
                                }),
                                m('h5', 'TwoRavens Standardized'),
                                m(PanelList, {
                                    id: 'variablesConstructedList',
                                    items: matchedConstructedVariables,
                                    colors: {[common.selVarColor]: eventdata.selectedConstructedVariables},
                                    callback: eventdata.toggleSelectedConstructedVariable
                                }))
                        ]
                    },
                    {
                        value: 'Subsets',
                        title: 'Restrict by contents of rows.',
                        contents: m(MenuHeaders, {
                            id: 'subsetsMenu',
                            attrsAll: {style: {height: '100%', overflow: 'auto'}},
                            sections: Object.keys(subsetLists)
                                .filter(key => subsetLists[key].length)
                                .map(key => ({
                                    value: key + ' Subsets',
                                    contents: m(PanelList, {
                                        id: 'subsetsList' + key,
                                        items: subsetLists[key],
                                        colors: {[common.selVarColor]: eventdata.selectedCanvas === 'Custom' ? ['Custom'] : [eventdata.selectedSubsetName]},
                                        callback: (subset) => (subset === 'Custom' ? eventdata.setSelectedCanvas : eventdata.setSelectedSubsetName)(subset),
                                        popup: popoverContentSubset,
                                        attrsItems: {
                                            'data-placement': 'right',
                                            'data-container': '#subsetsMenu',
                                            'data-delay': 500
                                        }
                                    })
                                }))
                        })
                    }
                ]
            }))
        }

        if (mode === 'aggregate') {

            let allPlots = ['Time Series'];

            return m(Panel, {
                id: 'leftPanelMenu',
                hover: window.innerWidth < 1200,
                side: 'left',
                width: '250px',
                label: 'Data Selection',
                attrsAll: {
                    style: {
                        // subtract header, spacer, spacer, scrollbar, table, and footer
                        height: `calc(100% - ${common.heightHeader} - 2*${common.panelMargin} - ${common.canvasScroll['horizontal'] ? common.scrollbarWidth : '0px'} - ${eventdata.tableHeight} - ${common.heightFooter})`
                    }
                }
            }, m(MenuHeaders, {
                id: 'aggregateMenu',
                attrsAll: {style: {height: 'calc(100% - 39px)', overflow: 'auto'}},
                sections: [
                    {
                        value: 'Unit Measures',
                        contents: m(PanelList, {
                            items: Object.keys(eventdata.genericMetadata[eventdata.selectedDataset]['subsets'])
                                .filter(subset => eventdata.genericMetadata[eventdata.selectedDataset]['subsets'][subset].measureType === 'unit'),
                            id: 'UMList',
                            colors: {[common.selVarColor]: eventdata.selectedCanvas !== 'Results' ? [eventdata.selectedSubsetName] : []},
                            callback: eventdata.setSelectedSubsetName
                        })
                    },
                    {
                        value: 'Event Measures',
                        contents: m(PanelList, {
                            items: Object.keys(eventdata.genericMetadata[eventdata.selectedDataset]['subsets'])
                                .filter(subset => eventdata.genericMetadata[eventdata.selectedDataset]['subsets'][subset].measureType === 'accumulator'),
                            id: 'EMList',
                            colors: {[common.selVarColor]: eventdata.selectedCanvas !== 'Results' ? [eventdata.selectedSubsetName] : []},
                            callback: eventdata.setSelectedSubsetName
                        })
                    },
                    {
                        value: 'Results',
                        contents: m(PanelList, {
                            id: 'resultsList',
                            items: allPlots,
                            colors: {
                                [common.grayColor]: eventdata.tableData ? [] : allPlots,
                                [common.selVarColor]: eventdata.selectedCanvas === 'Results' ? [eventdata.selectedResult] : []
                            },
                            callback: (result) => {
                                if (!eventdata.tableData) {
                                    tour.tourStartAggregation();
                                    return;
                                }
                                eventdata.setSelectedResult(result);
                            },
                            attrsAll: {style: {height: 'calc(100% - 78px)', overflow: 'auto'}}
                        })
                    }
                ]
            }))
        }
    }


    rightpanel(mode) {

        if (mode === 'home') {
            common.setPanelOcclusion('left', window.innerWidth < 1200 ? `calc(${common.panelMargin}*2)` : '250px');
            common.setPanelOcclusion('right', window.innerWidth < 1200 ? `calc(${common.panelMargin}*2)` : '250px');
            return;
        }

        return m(Panel, {
                id: 'rightPanelMenu',
                side: 'right',
                label: 'Query Summary',
                hover: window.innerWidth < 1200,
                width: '250px',
                attrsAll: {
                    style: {
                        // subtract header, the two margins, scrollbar, table, and footer
                        height: `calc(100% - ${common.heightHeader} - 2*${common.panelMargin} - ${common.canvasScroll['horizontal'] ? common.scrollbarWidth : '0px'} - ${eventdata.selectedMode === 'aggregate' ? eventdata.tableHeight : '0px'} - ${common.heightFooter})`
                    }
                }
            },
            m(MenuHeaders, {
                id: 'querySummaryMenu',
                attrsAll: {style: {height: 'calc(100% - 85px)', overflow: 'auto'}},
                sections: [
                    {
                        value: 'Subsets',
                        contents: (manipulations.eventdata.length + (eventdata.selectedMode === 'subset' ? looseSteps['pendingSubset'].abstractQuery.length : 0)) ? [
                            ...manipulations.eventdata.map(step => m(TreeSubset, {isQuery: true, step, pipelineId: 'eventdata', editable: false})),
                            m(TreeSubset, {step: looseSteps['pendingSubset'], pipelineId: 'pendingSubset', editable: true})
                        ] : [
                            m('div[style=font-style:italic]', 'Match all records'),
                            looseSteps['pendingSubset'].abstractQuery.length !== 0 && m('div[style=font-style:italic]', 'Some pending constraints are hidden. Update from subset menu to apply them.')
                        ]
                    },
                    eventdata.selectedMode === 'subset' && {
                        value: 'Variables',
                        contents: (eventdata.selectedVariables.size + eventdata.selectedConstructedVariables.size) // if there are any matches in either normal or constructed variables
                            ? m(TreeVariables)
                            : m('div[style=font-style:italic]', 'Return all Variables')
                    },
                    eventdata.selectedMode === 'aggregate' && {
                        value: 'Unit Measures',
                        contents: looseSteps['eventdataAggregate'].measuresUnit.length
                            ? m(TreeAggregate, {
                                pipelineId: 'looseStep',
                                stepId: looseSteps['eventdataAggregate'].id,
                                measure: 'unit',
                                data: looseSteps['eventdataAggregate'].measuresUnit,
                                editable: true
                            })
                            : m('div[style=font-style:italic]', 'No unit measures')
                    },
                    eventdata.selectedMode === 'aggregate' && {
                        value: 'Event Measures',
                        contents: looseSteps['eventdataAggregate'].measuresAccum.length
                            ? m(TreeAggregate, {
                                pipelineId: 'looseStep',
                                stepId: looseSteps['eventdataAggregate'].id,
                                measure: 'accumulator',
                                data: looseSteps['eventdataAggregate'].measuresAccum,
                                editable: true
                            })
                            : m('div[style=font-style:italic]', 'An event measure is required')
                    }
                ]
            }),
            m("#rightpanelButtonBar", {
                    style: {
                        width: "calc(100% - 25px)",
                        "position": "absolute",
                        "bottom": '5px'
                    }
                },
                eventdata.selectedMode === 'subset' && m(Button, {
                    id: 'btnAddGroup',
                    style: {float: 'left'},
                    onclick: () => queryAbstract.addGroup('eventdata', looseSteps['pendingSubset'])
                }, 'Group'),

                m(Button, {
                    id: 'btnUpdate',
                    class: 'ladda-button',
                    'data-style': 'zoom-in',
                    'data-spinner-color': '#818181',
                    style: {float: 'right'},
                    disabled: eventdata.selectedMode === 'subset'
                        ? looseSteps['pendingSubset'].abstractQuery.length === 0
                        : !eventdata.aggregationStaged || looseSteps['eventdataAggregate'].measuresAccum.length === 0,
                    onclick: async () => {
                        eventdata.setLaddaSpinner('btnUpdate', true);
                        await {'subset': eventdata.submitSubset, 'aggregate': eventdata.submitAggregation}[eventdata.selectedMode]();
                        eventdata.setLaddaSpinner('btnUpdate', false);

                        // weird hack, unsetting ladda unsets the disabled attribute. But it should still be disabled
                        if (eventdata.selectedMode === 'subset')
                            document.getElementById('btnUpdate').disabled = looseSteps['pendingSubset'].abstractQuery.length === 0;
                    }
                }, 'Update')
            ))

    }

    canvasContent() {
        if (eventdata.selectedCanvas === 'Subset') {
            if (eventdata.subsetData[eventdata.selectedSubsetName] === undefined) {

                if (!eventdata.isLoading[eventdata.selectedSubsetName]) {
                    let newMenu = {
                        type: 'menu',
                        name: eventdata.selectedSubsetName,
                        metadata: eventdata.genericMetadata[eventdata.selectedDataset]['subsets'][eventdata.selectedSubsetName],
                        preferences: eventdata.subsetPreferences[eventdata.selectedSubsetName]
                    };

                    // cannot await for promise resolution from here in the mithril vdom, so I moved the misc wrappings for menu loading into its own function
                    eventdata.loadMenuEventData(manipulations.eventdata, newMenu);
                }

                return m('#loading.loader', {
                    style: {
                        margin: 'auto',
                        position: 'relative',
                        top: '40%',
                        transform: 'translateY(-50%)'
                    }
                })
            }

            let subsetType = eventdata.genericMetadata[eventdata.selectedDataset]['subsets'][eventdata.selectedSubsetName]['type'];

            return m({
                'date': CanvasDate,
                'dyad': CanvasDyad,
                'discrete': CanvasDiscrete,
                'discrete_grouped': CanvasDiscreteGrouped,
                'coordinates': CanvasCoordinates
            }[subsetType], {
                mode: eventdata.selectedMode,
                subsetName: eventdata.selectedSubsetName,
                data: eventdata.subsetData[eventdata.selectedSubsetName],
                preferences: eventdata.subsetPreferences[eventdata.selectedSubsetName],
                metadata: eventdata.genericMetadata[eventdata.selectedDataset]['subsets'][eventdata.selectedSubsetName],
                formats: eventdata.genericMetadata[eventdata.selectedDataset]['formats'],
                alignments: eventdata.genericMetadata[eventdata.selectedDataset]['alignments'],
                redraw: eventdata.subsetRedraw[eventdata.selectedSubsetName],
                setRedraw: (state) => eventdata.setSubsetRedraw(eventdata.selectedSubsetName, state)
            })
        }

        eventdata.canvasPreferences[eventdata.selectedCanvas] = eventdata.canvasPreferences[eventdata.selectedCanvas] || {};
        return m({
            'About': CanvasAbout,
            'Datasets': CanvasDatasets,
            'Saved Queries': CanvasSavedQueries,
            'Custom': CanvasCustom,
            'Results': CanvasResults
        }[eventdata.selectedCanvas], {
            mode: eventdata.selectedMode,
            pipeline: manipulations.eventdata,
            preferences: eventdata.canvasPreferences[eventdata.selectedCanvas],
            redraw: eventdata.canvasRedraw[eventdata.selectedCanvas],
            setRedraw: (state) => eventdata.setCanvasRedraw(eventdata.selectedCanvas, state)
        });
    }

    aggregationTable() {
        return m("[id='aggregDataOutput']", {
                style: {
                    "position": "fixed",
                    "bottom": common.heightFooter,
                    "height": eventdata.tableHeight,
                    "width": "100%",
                    "border-top": "1px solid #ADADAD",
                    "overflow-y": "scroll",
                    "overflow-x": "auto"
                }
            },
            eventdata.tableData ? m(Table, {
                    headers: [...eventdata.tableHeaders, ...eventdata.tableHeadersEvent],
                    data: eventdata.tableData
                })
                : m('div', {style: {margin: '1em'}}, "Select event measures, then click 'Update' to display aggregated data.")
        );
    }

    view(vnode) {
        let {mode} = vnode.attrs;

        // after calling m.route.set, the params for mode, variate, vars don't update in the first redraw.
        // checking window.location.href is a workaround, permits changing mode from url bar
        if (window.location.href.includes(mode) && mode !== eventdata.selectedMode)
            eventdata.setSelectedMode(mode);

        let logLength = eventdata.alignmentLog.length + eventdata.preferencesLog.length + eventdata.variablesLog.length;
        return m('main#EventData',

            eventdata.showSaveQuery && eventdata.selectedMode !== 'Home' && m(ModalVanilla, {
                id: 'SaveQuery',
                setDisplay: eventdata.setShowSaveQuery,
                contents: m(SaveQuery, {pipeline: manipulations.eventdata, preferences: eventdata.saveQuery[eventdata.selectedMode]})
            }),

            eventdata.showAlignmentLog && logLength !== 0 && m(ModalVanilla, {
                id: 'AlignmentLog',
                setDisplay: eventdata.setShowAlignmentLog,
                contents: [
                    m('div[style=font-weight:bold]', 'Re-alignment from ' + eventdata.previousSelectedDataset + ' to ' + eventdata.selectedDataset),
                    eventdata.alignmentLog.length !== 0 && [
                        m('div', 'Query re-alignments:'),
                        m('ul', eventdata.alignmentLog.map(log => m('li', log)))
                    ],
                    eventdata.preferencesLog.length !== 0 && [
                        m('div', 'Subset menu re-alignments:'),
                        m('ul', eventdata.preferencesLog.map(log => m('li', log)))
                    ],
                    eventdata.variablesLog.length !== 0 && [
                        m('div', 'Variable re-alignments:'),
                        m('ul', eventdata.variablesLog.map(log => m('li', log)))
                    ]
                ]
            }),

            this.header(),
            this.leftpanel(mode),
            this.rightpanel(mode),
            m(Button, {
                id: 'btnStage',
                style: {
                    display: eventdata.selectedMode === 'home' ? 'none' : 'block',
                    right: `calc(${common.panelOcclusion['right'] || '275px'} + 5px)`,
                    bottom: `calc(${common.heightFooter} + ${common.panelMargin} + 6px + ${eventdata.selectedMode === 'aggregate' ? eventdata.tableHeight : '0px'})`,
                    position: 'fixed',
                    'z-index': 100,
                    'box-shadow': 'rgba(0, 0, 0, 0.3) 0px 2px 3px'
                },
                onclick: () => {
                    let metadata = eventdata.genericMetadata[eventdata.selectedDataset]['subsets'][eventdata.selectedSubsetName];
                    let preferences = eventdata.subsetPreferences[eventdata.selectedSubsetName];
                    let name = eventdata.selectedSubsetName + (eventdata.selectedMode === 'subset' ? ' Subset' : '');
                    if (eventdata.selectedCanvas === 'Custom') {
                        preferences = eventdata.canvasPreferences['Custom'];
                        name = 'Custom Subset';
                    }

                    let step = {
                        'subset': looseSteps['pendingSubset'],
                        'aggregate': looseSteps['eventdataAggregate']
                    }[eventdata.selectedMode];
                    eventdata.setAggregationStaged(true);

                    // add a constraint to either the 'pendingSubset' or 'eventdataAggregate' pipeline step, given the menu state and menu metadata
                    queryAbstract.addConstraint('eventdata', step, preferences, metadata, name);
                    common.setPanelOpen('right');
                }
            }, 'Stage'),
            m(Canvas, {
                attrsAll: {
                    style: mode === 'aggregate'
                        ? {height: `calc(100% - ${common.heightHeader} - ${eventdata.tableHeight} - ${common.heightFooter})`}
                        : {}
                }
            }, this.canvasContent()),
            mode === 'aggregate' && this.aggregationTable(),
            this.footer(mode)
        );
    }
}
