import m from 'mithril';

import * as eventdata from './eventdata';
import * as tour from "./tour";
import '../../css/eventdata.css'

import * as app from '../app';
import {looseSteps, mongoURL} from "../app";
import {getModalEventDataInfo, isEvtDataInfoWindowOpen, setEvtDataInfoWindowOpen, getModalGenericMetadata, isGenericMetadataInfoWindowOpen, setGenericMetadataInfoWindowOpen} from "./modelEventDataInfo";

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
import {TreeAggregate, TreeSubset, TreeVariables} from "../views/QueryTrees";
import Icon from "../../common/views/Icon";
import CanvasContinuous from "../canvases/CanvasContinuous";
import {italicize} from "../utils";
import {setLightTheme} from "../../common/common";

export default class Body_EventData {

    oninit(vnode) {
        setLightTheme()
        if (vnode.attrs.mode !== 'home') {
            m.route.set('/home');
            vnode.attrs.mode = 'home';
        }

        // all eventdata manipulations stored in one manipulations key
        // eventdata.manipulations = [];

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
            body: {'collections': null}, // no specific dataset passed, so it returns all
            method: 'POST'
        }).then(eventdata.setMetadata).catch(eventdata.laddaStopAll);
    }

    /*
     * Show EventData Info
     */
    modalEventDataInfo(){
      return getModalEventDataInfo();
    } // end: modalBasicInfo


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
            }, m(Icon, {name: 'sync'})),
            // m("span.ladda-label.glyphicon.glyphicon-repeat", {
            //     style: {
            //         "font-size": ".25em 1em",
            //         "color": "#818181",
            //         "pointer-events": "none"
            //     }
            // })),

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
                m("span.badge.badge-pill.badge-secondary", {style: {"margin-left": "10px", "display": "inline-block"}}, "Tours"),
                m("div[id='subsetTourBar']", {style: {"display": "inline-block"}},
                    tourButton('General', tour.tourStartGeneral),
                    eventdata.selectedCanvas === 'Subset' && tourButton(eventdata.selectedSubsetName, tours[subsetType]),
                    eventdata.selectedCanvas === 'Custom' && tourButton('Custom', tour.tourStartCustom))
            ];
        }

        if (mode === 'aggregate') {
            tourBar = [
                m("span.badge.badge-pill.badge-secondary", {style: {"margin-left": "10px", "display": "inline-block"}}, "Tours"),
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
            m(Button, {
                class: `btn-sm ${isEvtDataInfoWindowOpen ? 'active' : ''}`,

                style: {'margin-right': '6px',
                        'margin-top': '4px',
                        'margin-left': '6px'},
                onclick: _ => {
                        setEvtDataInfoWindowOpen(true);
                        m.redraw();
                }},
              'Info'),
            m(Button, {
                class: `btn-sm ${isGenericMetadataInfoWindowOpen ? 'active' : ''}`,

                style: {'margin-right': '6px',
                        'margin-top': '4px',
                        'margin-left': '6px'},
                onclick: _ => {
                        setGenericMetadataInfoWindowOpen(true);
                        m.redraw();
                }},
              'Generic Metadata'),
            m(Button, {
                style: {'margin': '8px'},
                title: 'alerts',
                class: 'btn-sm',
                onclick: () => app.setShowModalAlerts(true)
            }, m(Icon, {name: 'bell', style: `color: ${app.alerts.length > 0 && app.alerts[0].time > app.alertsLastViewed ? common.colors.selVar : '#818181'}`})),

            m("#recordBar", {style: {display: "inline-block", float: 'right'}}, [

                // -------------------------
                // Start: Save Button
                // -------------------------
                eventdata.selectedMode !== 'home' && m(Button, {
                    class: 'btn-sm',
                    title: isAuthenticated
                        ? 'save your constructed ' + eventdata.selectedMode
                        : 'must be logged in to save ' + eventdata.selectedMode,
                    disabled: !isAuthenticated,
                    onclick: async () => {
                        if ('subset' === eventdata.selectedMode && eventdata.manipulations.length === 0)
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
                // -------------------------
                // End: Save Button
                // -------------------------

                // -------------------------
                // Start: Download Button
                // -------------------------
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
                            if (eventdata.manipulations.length === 0) {
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
                            let compiled = queryMongo.buildPipeline([...eventdata.manipulations, downloadStep])['pipeline'];
                            eventdata.setLaddaSpinner('btnDownload', true);
                            await eventdata.download(eventdata.selectedDataset, JSON.stringify(compiled))
                                .finally(() => eventdata.setLaddaSpinner('btnDownload', false));

                        }
                        if ('aggregate' === eventdata.selectedMode) {
                            if (looseSteps['eventdataAggregate'].measuresAccum.length === 0) {
                                tour.tourStartEventMeasure();
                                return;
                            }
                            let compiled = queryMongo.buildPipeline([...eventdata.manipulations, looseSteps['eventdataAggregate']])['pipeline'];
                            eventdata.setLaddaSpinner('btnDownload', true);
                            await eventdata.download(eventdata.selectedDataset, JSON.stringify(compiled))
                                .finally(() => eventdata.setLaddaSpinner('btnDownload', false));
                        }
                    }
                }, m("span.ladda-label", "Export")),
                // -------------------------
                // End: Download Button
                // -------------------------

                // -------------------------
                // Start: TwoRavens Button
                // -------------------------
                eventdata.selectedMode !== 'home' && m(Button, {
                    id: 'btnRavenView',
                    title: isAuthenticated
                        ? 'View your constructed ' + eventdata.selectedMode + ' on TwoRavens'
                        : 'must be logged in to view your constructed ' + eventdata.selectedMode + ' on TwoRavens',
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
                        let compiled = queryMongo.buildPipeline([...eventdata.manipulations])['pipeline'];
                        console.log('compiled', compiled);

                        await eventdata.createEvtDataFile();
                        if ('subset' === eventdata.selectedMode) {
                            if (eventdata.manipulations.length === 0) {
                                tour.tourStartSaveQueryEmpty();
                                return;
                            }
                        }
                        /*
                        if ('subset' === eventdata.selectedMode) {
                            if (eventdata.manipulations.length === 0) {
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
                            let compiled = queryMongo.buildPipeline([...eventdata.manipulations, downloadStep])['pipeline'];
                            eventdata.setLaddaSpinner('btnDownload', true);
                            await eventdata.download(eventdata.selectedDataset, JSON.stringify(compiled))
                                .finally(() => eventdata.setLaddaSpinner('btnDownload', false));

                        }
                        if ('aggregate' === eventdata.selectedMode) {
                            if (looseSteps['eventdataAggregate'].measuresAccum.length === 0) {
                                tour.tourStartEventMeasure();
                                return;
                            }
                            let compiled = queryMongo.buildPipeline([...eventdata.manipulations, looseSteps['eventdataAggregate']])['pipeline'];
                            eventdata.setLaddaSpinner('btnDownload', true);
                            await eventdata.download(eventdata.selectedDataset, JSON.stringify(compiled))
                                .finally(() => eventdata.setLaddaSpinner('btnDownload', false));
                        }
                        */
                    }
                }, m("span.ladda-label", "TwoRavens View")),

                // -------------------------
                // Start: DataMart Button
                // -------------------------
                eventdata.selectedMode !== 'home' && m(Button, {
                    id: 'btnExportDatamart',
                    title: isAuthenticated
                        ? 'export your constructed ' + eventdata.selectedMode
                        : 'must be logged in to export ' + eventdata.selectedMode,
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
                            if (eventdata.manipulations.length === 0) {
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
                            let compiled = queryMongo.buildPipeline([...eventdata.manipulations, downloadStep])['pipeline'];
                            eventdata.setLaddaSpinner('btnExportDatamart', true);
                            await eventdata.exportDatamart(eventdata.selectedDataset, JSON.stringify(compiled))
                                .finally(() => eventdata.setLaddaSpinner('btnExportDatamart', false));

                        }
                        if ('aggregate' === eventdata.selectedMode) {
                            if (looseSteps['eventdataAggregate'].measuresAccum.length === 0) {
                                tour.tourStartEventMeasure();
                                return;
                            }
                            let compiled = queryMongo.buildPipeline([...eventdata.manipulations, looseSteps['eventdataAggregate']])['pipeline'];
                            eventdata.setLaddaSpinner('btnExportDatamart', true);
                            await eventdata.download(eventdata.selectedDataset, JSON.stringify(compiled))
                                .finally(() => eventdata.exportDatamart('btnExportDatamart', false));
                        }
                    }
                }, "Datamart"),
                // -------------------------
                // End: TwoRavens Button
                // -------------------------

                // -------------------------
                // Start: Record Count
                // -------------------------
                eventdata.selectedDataset && recordCount !== undefined && m("span.badge.badge-pill.badge-secondary#recordCount", {
                    style: {
                        "margin-left": "5px",
                        "margin-top": "10px",
                        "margin-right": "10px"
                    }
                }, recordCount + ' Records')
                // -------------------------
                // End: Record Count
                // -------------------------

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

            let popoverContentSubset = subset => {
                let metadata = eventdata.genericMetadata[eventdata.selectedDataset]['subsets'][subset];
                if (!metadata) return;
                let {alignments, formats, columns} = eventdata.getSubsetMetadata(eventdata.selectedDataset, subset);

                let data = {};
                if (columns.length) data.Columns = columns;
                if (formats.length) data.Formats = formats;
                if (alignments.length) data.Alignments = alignments;

                if ('type' in metadata) data.Type = metadata.type;
                if ('structure' in metadata) data.Structure = metadata.structure;
                if ('tabs' in metadata) data.Tabs = Object.keys(metadata.tabs);
                if ('group_by' in metadata) data['Group By'] = metadata.group_by;
                return m(Table, {class: 'table-sm', data})
            };

            let popoverContentVariable = variable => {
                let metadata = eventdata.genericMetadata[eventdata.selectedDataset];
                let data = {};
                if ('formats' in metadata && variable in metadata.formats)
                    data.Format = metadata.formats[variable];
                if ('alignments' in metadata && variable in metadata.alignments)
                    data.Alignment = metadata.alignments[variable];
                if ('deconstruct' in metadata && metadata.deconstruct[variable])
                    data.Delimiter = metadata.deconstruct[variable];
                return m(Table, {class: 'table-sm', data})
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
                attrsAll: {style: {height: 'calc(100% - 50px)'}},
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
                            m('div', {style: {height: 'calc(100% - 61px)', overflow: 'auto'}},
                                m(PanelList, {
                                    id: 'variablesList',
                                    items: matchedVariables,
                                    colors: {[common.colors.selVar]: eventdata.selectedVariables},
                                    callback: eventdata.toggleSelectedVariable,
                                    popup: popoverContentVariable,
                                    popupOptions: {placement: 'right', modifiers: {preventOverflow: {escapeWithReference: true}}},
                                    attrsItems: {
                                        'data-placement': 'right',
                                        'data-container': '#variablesList'
                                    }
                                }),
                                m('h5', 'TwoRavens Standardized'),
                                m(PanelList, {
                                    id: 'variablesConstructedList',
                                    items: matchedConstructedVariables,
                                    colors: {[common.colors.selVar]: eventdata.selectedConstructedVariables},
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
                                        colors: {[common.colors.selVar]: eventdata.selectedCanvas === 'Custom' ? ['Custom'] : [eventdata.selectedSubsetName]},
                                        callback: (subset) => (subset === 'Custom' ? eventdata.setSelectedCanvas : eventdata.setSelectedSubsetName)(subset),
                                        popup: popoverContentSubset,
                                        popupOptions: {placement: 'right', modifiers: {preventOverflow: {escapeWithReference: true}}},
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
                            colors: {[common.colors.selVar]: eventdata.selectedCanvas !== 'Results' ? [eventdata.selectedSubsetName] : []},
                            callback: eventdata.setSelectedSubsetName
                        })
                    },
                    {
                        value: 'Event Measures',
                        contents: m(PanelList, {
                            items: Object.keys(eventdata.genericMetadata[eventdata.selectedDataset]['subsets'])
                                .filter(subset => eventdata.genericMetadata[eventdata.selectedDataset]['subsets'][subset].measureType === 'accumulator'),
                            id: 'EMList',
                            colors: {[common.colors.selVar]: eventdata.selectedCanvas !== 'Results' ? [eventdata.selectedSubsetName] : []},
                            callback: eventdata.setSelectedSubsetName
                        })
                    },
                    {
                        value: 'Results',
                        contents: m(PanelList, {
                            id: 'resultsList',
                            items: allPlots,
                            colors: {
                                [common.colors.gray]: eventdata.tableData ? [] : allPlots,
                                [common.colors.selVar]: eventdata.selectedCanvas === 'Results' ? [eventdata.selectedResult] : []
                            },
                            callback: (result) => {
                                if (!eventdata.tableData) {
                                    tour.tourStartAggregation();
                                    return;
                                }
                                eventdata.setSelectedResult(result);
                            },
                            style: {height: 'calc(100% - 78px)', overflow: 'auto'}
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
                        contents: (eventdata.manipulations.length + (eventdata.selectedMode === 'subset' ? looseSteps['pendingSubset'].abstractQuery.length : 0)) ? [
                            ...eventdata.manipulations.map(step => m(TreeSubset, {isQuery: true, step, editable: false})),
                            m(TreeSubset, {step: looseSteps['pendingSubset'], editable: true})
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
                                data: looseSteps['eventdataAggregate'].measuresUnit,
                                editable: true
                            })
                            : m('div[style=font-style:italic]', 'No unit measures')
                    },
                    eventdata.selectedMode === 'aggregate' && {
                        value: 'Event Measures',
                        contents: looseSteps['eventdataAggregate'].measuresAccum.length
                            ? m(TreeAggregate, {
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
                    onclick: () => queryAbstract.addGroup(looseSteps['pendingSubset'])
                }, 'Group'),

                // -------------------------
                // End: Update Button
                // -------------------------
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
                        await {'subset': eventdata.submitSubset,
                               'aggregate': eventdata.submitAggregation}[eventdata.selectedMode]();

                        eventdata.setLaddaSpinner('btnUpdate', false);

                        // weird hack, unsetting ladda unsets the disabled attribute. But it should still be disabled
                        if (eventdata.selectedMode === 'subset'){
                          document.getElementById('btnUpdate').disabled =  looseSteps['pendingSubset'].abstractQuery.length === 0;
                        }
                    }
                }, 'Update')
                // -------------------------
                // End: Update Button
                // -------------------------
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
                    eventdata.loadMenuEventData(eventdata.manipulations, newMenu);
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
                'coordinates': CanvasCoordinates,
                'continuous': CanvasContinuous,
            }[subsetType], {
                mode: eventdata.selectedMode,
                subsetName: eventdata.selectedSubsetName,
                data: eventdata.subsetData[eventdata.selectedSubsetName],
                preferences: eventdata.subsetPreferences[eventdata.selectedSubsetName],
                pipeline: eventdata.manipulations,
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
            pipeline: eventdata.manipulations,
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
                setDisplay: eventdata.setShowSaveQuery
            }, m(SaveQuery, {
                pipeline: eventdata.manipulations,
                preferences: eventdata.saveQuery[eventdata.selectedMode]
            })),

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
                            'log': common.colors.menu,
                            'warn': common.colors.warn,
                            'error': common.colors.error
                        }[alert.type], .5)}]`, alert.time.toLocaleTimeString().replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3")),
                        alert.description
                    ]),
                    style: {'margin-top': '1em'},
                    tableTags: m('colgroup',
                        m('col', {span: 1, width: '10px'}),
                        m('col', {span: 1, width: '75px'}),
                        m('col', {span: 1}))
                })
            ]),

            eventdata.showAlignmentLog && logLength !== 0 && m(ModalVanilla, {
                id: 'AlignmentLog',
                setDisplay: eventdata.setShowAlignmentLog,
            }, [
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
            ]),

            this.header(),
            this.leftpanel(mode),
            this.rightpanel(mode),

            isEvtDataInfoWindowOpen && this.modalEventDataInfo(),

            isGenericMetadataInfoWindowOpen && getModalGenericMetadata(),
            // -------------------------
            // Start: Stage
            // -------------------------
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
                    queryAbstract.addConstraint(step, preferences, metadata, name);
                    common.setPanelOpen('right');
                }
            }, 'Stage'),
            // -------------------------
            // End: Stage
            // -------------------------

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
