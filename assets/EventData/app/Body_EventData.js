import m from 'mithril';

import * as app from './app';
import * as query from './query';
import * as tour from "./tour";

import * as common from '../../common-eventdata/common';
import Panel from '../../common-eventdata/views/Panel';
import Header from '../../common-eventdata/views/Header';
import Footer from '../../common-eventdata/views/Footer';
import Canvas from '../../common-eventdata/views/Canvas';
import MenuTabbed from '../../common-eventdata/views/MenuTabbed';
import MenuHeaders from '../../common-eventdata/views/MenuHeaders';
import PanelList from '../../common-eventdata/views/PanelList';
import TextField from '../../common-eventdata/views/TextField';
import ButtonRadio from '../../common-eventdata/views/ButtonRadio';
import Button from "../../common-eventdata/views/Button";
import ModalVanilla from "../../common-eventdata/views/ModalVanilla";
import Table from "../../common-eventdata/views/Table";

import CanvasAbout from "./canvases/CanvasAbout";
import CanvasDatasets from "./canvases/CanvasDatasets";
import CanvasSavedQueries from "./canvases/CanvasSavedQueries";

import CanvasCategorical from "./canvases/CanvasCategorical";
import CanvasDyad from "./canvases/CanvasDyad";
import CanvasDate from "./canvases/CanvasDate";
import CanvasCategoricalGrouped from "./canvases/CanvasCategoricalGrouped";
import CanvasCoordinates from "./canvases/CanvasCoordinates";
import CanvasCustom from "./canvases/CanvasCustom";
import CanvasResults from "./canvases/CanvasResults";

import SaveQuery from "./views/SaveQuery";
import {TreeQuery, TreeVariables} from "./views/TreeSubset";

export default class Body_EventData {

    oninit(vnode) {
        if (vnode.attrs.mode !== 'home') {
            m.route.set('/home');
            vnode.attrs.mode = 'home';
        }

        app.resetPeek();

        app.transformPipeline.push({
            type: 'subset',
            abstractQuery: [],
            id: app.eventdataSubsetName,
            nodeID: 1,
            groupID: 1,
            queryID: 1
        });

        // Load the metadata for all available datasets
        m.request({
            url: app.eventdataURL + 'get-metadata',
            data: {'datasets': null}, // no specific dataset passed, so it returns all
            method: 'POST'
        }).then(app.setMetadata).catch(app.laddaStopAll);
    }

    header() {

        let attrsInterface = {style: {width: 'auto'}};
        let isHome = app.selectedCanvas === app.selectedCanvasHome;

        return m(Header, {image: '/static/images/TwoRavens.png'},

            m('div', {style: {'flex-grow': 1}}),
            m("h4", m("h4#datasetLabel", {style: {margin: '.25em 1em'}},
                app.selectedDataset ? app.genericMetadata[app.selectedDataset]['name'] : '')),

            m('div', {style: {'flex-grow': 1}}),
            app.selectedDataset && !isHome && m("button#btnPeek.btn.btn-default", {
                title: 'Display a data preview',
                style: {margin: '.25em 1em'},
                onclick: () => window.open('#!/data', 'data')
            }, 'Data'),

            isHome && m(ButtonRadio, {
                id: 'homeCanvasButtons',
                sections: [
                    {value: 'Datasets', attrsInterface},
                    {value: 'Saved Queries', attrsInterface},
                    // {value: 'About', attrsInterface}
                ],
                activeSection: app.selectedCanvasHome,
                onclick: app.setSelectedCanvas,
                attrsAll: {style: {width: 'auto'}}
            }),

            // Button Reset
            app.selectedDataset && !isHome && m("button#btnReset.btn.btn-default.ladda-button[title='Reset']", {
                'data-style': 'zoom-in',
                'data-spinner-color': '#818181',
                style: {margin: '1em'},
                onclick: app.reset
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
                onclick: app.setSelectedMode,
                activeSection: app.selectedMode,
                sections: [
                    {value: 'Home', attrsInterface: {style: {'width': 'auto'}}}
                ].concat(app.selectedDataset ? [
                    {value: 'Subset', id: 'btnSubsetMode', attrsInterface: {style: {'width': 'auto'}}},
                    {value: 'Aggregate', attrsInterface: {style: {'width': 'auto'}}}
                ] : [])
            })
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
                'categorical': tour.tourStartCategorical,
                'categorical_grouped': tour.tourStartCategoricalGrouped,
                'coordinates': tour.tourStartCoordinates,
                'custom': tour.tourStartCustom
            };
            let subsetType = app.genericMetadata[app.selectedDataset]['subsets'][app.selectedSubsetName]['type'];
            tourBar = [
                m("span.label.label-default", {style: {"margin-left": "10px", "display": "inline-block"}}, "Tours"),
                m("div[id='subsetTourBar']", {style: {"display": "inline-block"}},
                    tourButton('General', tour.tourStartGeneral),
                    app.selectedCanvas === 'Subset' && tourButton(app.selectedSubsetName, tours[subsetType]),
                    app.selectedCanvas === 'Custom' && tourButton('Custom', tour.tourStartCustom))
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
            'subset': app.totalSubsetRecords,
            'aggregate': app.aggregationData && app.aggregationData.length
        }[app.selectedMode];

        let step = app.getTransformStep(app.eventdataSubsetName);
        return m(Footer, [
            tourBar,
            m("#recordBar", {style: {display: "inline-block", float: 'right'}}, [

                app.selectedMode !== 'home' && m(Button, {
                    class: 'btn-sm',
                    onclick: async () => {
                        if ('subset' === app.selectedMode && step.abstractQuery.length === 0)
                            tour.tourStartSaveQueryEmpty();
                        else if ('aggregate' === app.selectedMode && !app.eventMeasure)
                            tour.tourStartEventMeasure();
                        else {
                            if ('aggregate' === app.selectedMode && app.aggregationStaged) {
                                app.setLaddaSpinner('btnSave');
                                await query.submitAggregation();
                                app.laddaStopAll();
                            }
                            app.setShowSaveQuery(true)
                        }
                    }, style: {'margin-top': '4px'}
                }, 'Save'),

                app.selectedMode !== 'home' && m(Button, {
                    id: 'btnDownload',
                    class: 'btn-sm ladda-button',
                    style: {
                        'margin-right': '6px',
                        'margin-top': '4px',
                        'margin-left': '6px',
                        'data-style': 'zoom-in',
                        'data-spinner-color': '#818181'
                    },
                    onclick: () => {
                        if ('subset' === app.selectedMode && step.abstractQuery.length === 0)
                            tour.tourStartSaveQueryEmpty();
                        else if ('aggregate' === app.selectedMode && !app.eventMeasure)
                            tour.tourStartEventMeasure();
                        else app.download();
                    }
                }, m("span.ladda-label", "Download")),

                // Record Count
                app.selectedDataset && recordCount !== undefined && m("span.label.label-default#recordCount", {
                    style: {
                        "margin-left": "5px",
                        "margin-top": "10px",
                        "margin-right": "10px"
                    }
                }, recordCount + ' Records')
            ]),
        ]);
    }

    leftpanel(mode) {
        if (mode === 'home') {
            common.setPanelOcclusion('left', `calc(2*${common.panelMargin} + 250px)`);
        }

        if (mode === 'subset') {
            let alignedColumns = app.genericMetadata[app.selectedDataset]['alignments'];
            let metadataSubsets = app.genericMetadata[app.selectedDataset]['subsets'];

            let isAligned = (subsetName) => {
                if ('alignments' in metadataSubsets[subsetName]) return 'Aligned';
                if (metadataSubsets[subsetName]['type'] === 'dyad')
                    for (let tab of Object.values(metadataSubsets[subsetName]['tabs'])) {
                        if (tab['full'] in alignedColumns) return 'Aligned';
                        for (let filter of tab['filters']) if (filter in alignedColumns) return 'Aligned';
                    }
                else for (let column of app.coerceArray(metadataSubsets[subsetName]['columns']))
                    if (column in alignedColumns) return 'Aligned';
                return 'Unaligned';
            };

            let subsetLists = Object.keys(app.genericMetadata[app.selectedDataset]['subsets'])
                .reduce((out, subset) => {
                    out[isAligned(subset)].push(subset);
                    return out;
                }, {Aligned: [], Unaligned: []});
            subsetLists['Unaligned'].push('Custom');

            let popoverContentSubset = (subset) => {
                let metadata = app.genericMetadata[app.selectedDataset]['subsets'][subset];
                if (!metadata) return;
                let {alignments, formats, columns} = app.getSubsetMetadata(app.selectedDataset, subset);
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
                let metadata = app.genericMetadata[app.selectedDataset];
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

            return m(Panel, {
                side: 'left',
                label: 'Data Selection',
                hover: window.innerWidth < 1200,
                width: '250px'
            }, m(MenuTabbed, {
                id: 'leftPanelMenu',
                callback: app.setLeftTabSubset,
                currentTab: app.leftTabSubset,
                attrsAll: {style: {height: 'calc(100% - 39px)'}},
                sections: [
                    {
                        value: 'Variables',
                        title: 'Restrict by data column.',
                        contents: [
                            m(TextField, {
                                id: 'searchVariables',
                                placeholder: 'Search variables',
                                value: app.variableSearch,
                                oninput: app.setVariableSearch
                            }),
                            m(PanelList, {
                                id: 'variablesList',
                                items: app.genericMetadata[app.selectedDataset]['columns'].filter(col => col.includes(app.variableSearch)),
                                colors: {[common.selVarColor]: app.selectedVariables},
                                callback: app.toggleSelectedVariable,
                                attrsAll: {style: {height: 'calc(100% - 44px)', overflow: 'auto'}},
                                popup: popoverContentVariable,
                                attrsItems: {
                                    'data-placement': 'right',
                                    'data-container': '#variablesList'
                                }
                            })
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
                                        colors: {[common.selVarColor]: app.selectedCanvas === 'Custom' ? ['Custom'] : [app.selectedSubsetName]},
                                        callback: (subset) => (subset === 'Custom' ? app.setSelectedCanvas : app.setSelectedSubsetName)(subset),
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

            let timeSeries = false;
            for (let subset of Object.keys(app.unitMeasure)) {
                if (app.genericMetadata[app.selectedDataset]['subsets'][subset]['type'] === 'date') {
                    timeSeries = true;
                    break;
                }
            }
            let tempDataset = app.genericMetadata[app.selectedDataset];

            let aggregateKeys = Object.keys(app.genericMetadata[app.selectedDataset]['subsets'])
                .filter(subset => 'measures' in app.genericMetadata[app.selectedDataset]['subsets'][subset]);

            return m(Panel, {
                id: 'leftPanelMenu',
                hover: window.innerWidth < 1200,
                side: 'left',
                width: '250px',
                label: 'Data Selection',
                attrsAll: {
                    style: {
                        // subtract header, spacer, spacer, scrollbar, table, and footer
                        height: `calc(100% - ${common.heightHeader} - 2*${common.panelMargin} - ${common.canvasScroll['horizontal'] ? common.scrollbarWidth : '0px'} - ${app.tableHeight} - ${common.heightFooter})`
                    }
                }
            }, m(MenuHeaders, {
                id: 'aggregateMenu',
                attrsAll: {style: {height: 'calc(100% - 39px)', overflow: 'auto'}},
                sections: [
                    {
                        value: 'Unit of Measure',
                        contents: m(PanelList, {
                            items: aggregateKeys.filter(subset => tempDataset['subsets'][subset]['measures'].indexOf('unit') !== -1),
                            id: 'UMList',
                            colors: {[common.selVarColor]: app.selectedCanvas !== 'Results' ? [app.selectedSubsetName] : []},
                            classes: {['item-bordered']: Object.keys(app.unitMeasure).filter(key => app.unitMeasure[key])},
                            callback: app.setSelectedSubsetName
                        })
                    },
                    {
                        value: 'Event Measure',
                        contents: m(PanelList, {
                            items: aggregateKeys.filter(subset => tempDataset['subsets'][subset]['measures'].indexOf('event') !== -1),
                            id: 'EMList',
                            colors: {[common.selVarColor]: app.selectedCanvas !== 'Results' ? [app.selectedSubsetName] : []},
                            classes: {['item-bordered']: [app.eventMeasure]},
                            callback: (subset) => {
                                app.setEventMeasure(subset);
                                app.setSelectedSubsetName(subset);
                            }
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
        }

        if (mode === 'subset') {
            return m(Panel, {
                    id: 'rightPanelMenu',
                    side: 'right',
                    label: 'Query Summary',
                    hover: window.innerWidth < 1200,
                    width: '250px'
                },
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
                            "position": "absolute",
                            "bottom": '5px'
                        }
                    },
                    m("button.btn.btn-default[id='buttonAddGroup'][type='button']", {
                            style: {"float": "left"},
                            onclick: () => app.addGroup('subset', false)
                        },
                        'Group'
                    ),

                    m("button.btn.btn-default.ladda-button[data-spinner-color='#818181'][type='button']", {
                        id: 'btnUpdate',
                        style: {float: 'right'},
                        onclick: () => query.submitQuery() // wrap in anonymous function to ignore the mouseEvent
                    }, 'Update')
                ))
        }

        if (mode === 'aggregate') {
            return m(Panel, {
                    id: 'rightPanelMenu',
                    side: 'right',
                    label: 'Results',
                    hover: window.innerWidth < 1200,
                    width: '250px',
                    attrsAll: {
                        style: {
                            // subtract header, the two margins, scrollbar, table, and footer
                            height: `calc(100% - ${common.heightHeader} - 2*${common.panelMargin} - ${common.canvasScroll['horizontal'] ? common.scrollbarWidth : '0px'} - ${app.tableHeight} - ${common.heightFooter})`
                        }
                    }
                }, m(PanelList, {
                    id: 'resultsList',
                    items: ['Line Plot'],
                    colors: {[common.selVarColor]: app.selectedCanvas === 'Results' ? [app.selectedResult] : []},
                    callback: (result) => {
                        if (!app.aggregationData) {
                            tour.tourStartAggregation();
                            return;
                        }
                        app.setSelectedResult(result);
                    },
                    attrsAll: {style: {height: 'calc(100% - 78px)', overflow: 'auto'}}
                }),
                m("button.btn.btn-default.ladda-button[data-spinner-color='#818181'][type='button']", {
                    id: 'btnUpdate',
                    class: app.aggregationStaged && ['btn-success'],
                    style: {float: 'right'},
                    onclick: () => {
                        app.setAggregationStaged(false);
                        query.submitAggregation()
                    }
                }, 'Update'))
        }
    }

    canvasContent() {
        if (app.selectedCanvas === 'Subset') {
            if (app.subsetData[app.selectedSubsetName] === undefined) {

                if (!app.isLoading[app.selectedSubsetName])
                    app.loadSubset(app.selectedSubsetName);

                return m('#loading.loader', {
                    style: {
                        margin: 'auto',
                        position: 'relative',
                        top: '40%',
                        transform: 'translateY(-50%)'
                    }
                })
            }

            let subsetType = app.genericMetadata[app.selectedDataset]['subsets'][app.selectedSubsetName]['type'];

            return m({
                'date': CanvasDate,
                'dyad': CanvasDyad,
                'categorical': CanvasCategorical,
                'categorical_grouped': CanvasCategoricalGrouped,
                'coordinates': CanvasCoordinates
            }[subsetType], {
                mode: app.selectedMode,
                subsetName: app.selectedSubsetName,
                data: app.subsetData[app.selectedSubsetName],
                preferences: app.subsetPreferences[app.selectedSubsetName],
                metadata: app.genericMetadata[app.selectedDataset]['subsets'][app.selectedSubsetName],
                redraw: app.subsetRedraw[app.selectedSubsetName],
                setRedraw: (state) => app.setSubsetRedraw(app.selectedSubsetName, state)
            })
        }

        // TODO add CanvasAnalysis
        app.canvasPreferences[app.selectedCanvas] = app.canvasPreferences[app.selectedCanvas] || {};
        return m({
            'About': CanvasAbout,
            'Datasets': CanvasDatasets,
            'Saved Queries': CanvasSavedQueries,
            'Custom': CanvasCustom,
            'Results': CanvasResults
        }[app.selectedCanvas], {
            mode: app.selectedMode,
            preferences: app.canvasPreferences[app.selectedCanvas],
            redraw: app.canvasRedraw[app.selectedCanvas],
            setRedraw: (state) => app.setCanvasRedraw(app.selectedCanvas, state)
        });
    }

    aggregationTable() {
        return m("[id='aggregDataOutput']", {
                style: {
                    "position": "fixed",
                    "bottom": common.heightFooter,
                    "height": app.tableHeight,
                    "width": "100%",
                    "border-top": "1px solid #ADADAD",
                    "overflow-y": "scroll",
                    "overflow-x": "auto"
                }
            },
            app.aggregationData ? m(Table, {
                headers: [...app.aggregationHeadersUnit, ...app.aggregationHeadersEvent],
                data: app.aggregationData
            }) : "Select event measures, then click 'Update' to display aggregated data."
        );
    }

    view(vnode) {
        let {mode} = vnode.attrs;

        let logLength = app.alignmentLog.length + app.preferencesLog.length + app.variablesLog.length;
        return m('main#EventData',

            app.showSaveQuery && app.selectedMode !== 'Home' && m(ModalVanilla, {
                id: 'SaveQuery',
                setDisplay: app.setShowSaveQuery,
                contents: m(SaveQuery, {preferences: app.saveQuery[app.selectedMode]})
            }),

            app.showAlignmentLog && logLength !== 0 && m(ModalVanilla, {
                id: 'AlignmentLog',
                setDisplay: app.setShowAlignmentLog,
                contents: [
                    m('div[style=font-weight:bold]', 'Re-alignment from ' + app.previousSelectedDataset + ' to ' + app.selectedDataset),
                    app.alignmentLog.length !== 0 && [
                        m('div', 'Query re-alignments:'),
                        m('ul', app.alignmentLog.map(log => m('li', log)))
                    ],
                    app.preferencesLog.length !== 0 && [
                        m('div', 'Subset menu re-alignments:'),
                        m('ul', app.preferencesLog.map(log => m('li', log)))
                    ],
                    app.variablesLog.length !== 0 && [
                        m('div', 'Variable re-alignments:'),
                        m('ul', app.variablesLog.map(log => m('li', log)))
                    ]
                ]
            }),

            this.header(),
            this.leftpanel(mode),
            this.rightpanel(mode),
            m(Button, {
                id: 'btnStage',
                style: {
                    display: app.selectedMode === 'subset' ? 'block' : 'none',
                    right: `calc(${common.panelOcclusion['right'] || '275px'} + 5px)`,
                    bottom: `calc(${common.heightFooter} + ${common.panelMargin} + 6px)`,
                    position: 'fixed',
                    'z-index': 100,
                    'box-shadow': 'rgba(0, 0, 0, 0.3) 0px 2px 3px'
                },
                onclick: () => {
                    let step = app.getTransformStep('subset');
                    let metadata = app.genericMetadata[app.selectedDataset]['subsets'][app.selectedSubsetName];
                    let preferences = app.subsetPreferences[app.selectedSubsetName];
                    if (app.selectedSubsetName === 'Custom') preferences = app.canvasPreferences['Custom'];
                    // add a constraint to the 'subset' pipeline step, given the menu state and menu metadata
                    app.addConstraint(step, preferences, metadata);
                }
            }, 'Stage'),
            m(Canvas, {
                attrsAll: {
                    style: mode === 'aggregate'
                        ? {height: `calc(100% - ${common.heightHeader} - ${app.tableHeight} - ${common.heightFooter})`}
                        : {}
                }
            }, this.canvasContent()),
            mode === 'aggregate' && this.aggregationTable(),
            this.footer(mode)
        );
    }
}
