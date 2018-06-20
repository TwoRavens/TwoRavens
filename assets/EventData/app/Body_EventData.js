import m from 'mithril';

import * as app from './app';
import * as aggreg from './aggreg/aggreg';
import * as tour from "./tour";

import * as common from '../../common/common';
import Panel from '../../common/views/Panel';
import Header from '../../common/views/Header';
import Footer from '../../common/views/Footer';
import Canvas from '../../common/views/Canvas';
import MenuTabbed from '../../common/views/MenuTabbed';
import MenuHeaders from '../../common/views/MenuHeaders';
import PanelList from '../../common/views/PanelList';
import TextField from '../../common/views/TextField';
import ButtonRadio from '../../common/views/ButtonRadio';

import CanvasDatasets from "./views/CanvasDatasets";
import CanvasCategorical from "./views/CanvasCategorical";
import CanvasDyad from "./views/CanvasDyad";
import CanvasDate from "./views/CanvasDate";
import CanvasCategoricalGrouped from "./views/CanvasCategoricalGrouped";
import CanvasRootCode from "./views/CanvasRootCode";
import CanvasAggregTS from "./views/CanvasAggregTS";

import TableAggregation from "./views/TableAggregation";
import CanvasCoordinates from "./views/CanvasCoordinates";
import {selectedDataset} from "./app";
import {datasource} from "./app";
import {genericMetadata} from "./app";

export default class Body_EventData {

    oninit(vnode) {
        if (vnode.attrs.mode !== 'datasets') {
            m.route.set('/datasets');
            vnode.attrs.mode = 'datasets';
        }
        // reset peeked data on page load
        localStorage.removeItem('peekTableData');
    }

    oncreate() {
        app.setupBody();
        app.setupQueryTree();
    }

    header(mode) {
        return m(Header, {image: '/static/images/TwoRavens.png'},

            m('div', {style: {'flex-grow': 1}}),
            m("h4", m("h4#datasetLabel", {style: {margin: '.25em 1em'}},
                app.selectedDataset ? app.genericMetadata[app.selectedDataset]['name'] : '')),

            m('div', {style: {'flex-grow': 1}}),
            app.selectedDataset && m("button#btnPeek.btn.btn-default", {
                title: 'Display a data preview',
                style: {margin: '.25em 1em'},
                onclick: () => window.open('#!/data', 'data')
            },
            'Data'
            ),

            // Button Reset
            m("button#btnReset.btn.btn-default.ladda-button[title='Reset']", {
                    'data-style': 'zoom-in',
                    'data-spinner-color': '#818181',
                    style: {margin: '1em', display: app.selectedDataset ? 'block' : 'none'},
                    onclick: app.reset
                },
                m("span.ladda-label.glyphicon.glyphicon-repeat", {
                    style: {
                        "font-size": ".25em 1em",
                        "color": "#818181",
                        "pointer-events": "none"
                    }
                })
            ),

            m(ButtonRadio, {
                id: 'modeButtonBar',
                attrsAll: {style: {width: 'auto', margin: '.25em 1em'}},
                onclick: (mode) => {
                    app.setSelectedMode(mode);
                    // the route set doesn't work inside setSelectedMode... no clue why
                },
                activeSection: app.selectedMode,
                sections: [
                    {value: 'Datasets'}
                ].concat(app.selectedDataset ? [
                    {value: 'Subset', id: 'btnSubsetSubmit'},
                    {value: 'Aggregate', id: 'aggSubmit'}
                ] : [])
            })
        );
    }

    footer(mode) {

        let tourBar;

        let tourButton = (name, tour) => m("button.btn.btn-default.btn-sm[id='tourButton${name}'][type='button']", {
            style: {
                "margin-left": "5px",
                "margin-top": "4px"
            },
            onclick: tour
        }, name);

        if (mode === 'subset') {
            let tours = {
                'General': tour.tourStartGeneral,
                'Actor': tour.tourStartActor,
                'Date': tour.tourStartDate,
                'Action': tour.tourStartAction,
                'Location': tour.tourStartLocation,
                'Coordinates': tour.tourStartCoordinates,
                'Custom': tour.tourStartCustom
            };

            tourBar = [
                m("span.label.label-default", {style: {"margin-left": "10px", "display": "inline-block"}}, "Tours"),
                m("div[id='subsetTourBar']", {style: {"display": "inline-block"}}, Object.keys(tours).map(name => tourButton(name, tours[name])))];
        }

        if (mode === 'aggregate') {
            tourBar = [
                m("span.label.label-default", {style: {"margin-left": "10px", "display": "inline-block"}}, "Tours"),
                m("div[id='aggregTourBar']", {style: {"display": "inline-block"}}, [
                    tourButton('Aggregation', tour.tourStartAggregation)
                ])];
        }

        return m(Footer, [
            tourBar,
            m("#recordBar", {style: {display: "inline-block", float: 'right'}}, [

                m("button.btn.btn-default.btn-sm.ladda-button[data-spinner-color='#818181'][id='buttonDownload'][type='button']", {
                        style: {
                            display: app.selectedDataset ? 'inline-block' : 'none',
                            "margin-right": "6px",
                            'margin-top': '4px',
                            'margin-left': '6px',
                            "data-style": "zoom-in"
                        },
                        onclick: app.download
                    },
                    m("span.ladda-label",
                        "Download"
                    )
                ),
                // Record Count
                app.selectedDataset && m("span.label.label-default#recordCount", {
                    style: {
                        "margin-left": "5px",
                        "margin-top": "10px",
                        "margin-right": "10px"
                    }
                }, {
                    'subset': app.totalSubsetRecords,
                    'aggregate': aggreg.totalAggregRecords
                }[app.selectedMode] + ' Records')
            ]),
        ]);
    }

    leftpanel(mode) {
        if (mode === 'datasets') {
            common.setPanelOcclusion('left', `calc(2*${common.panelMargin} + 250px)`);
        }

        if (mode === 'subset') {
            return m(Panel, {
                side: 'left',
                label: 'Data Selection',
                hover: false,
                width: '250px',
                contents: m(MenuTabbed, {
                    id: 'leftPanelMenu',
                    callback: app.setLeftTab,
                    currentTab: app.leftTab,
                    attrsAll: {style: {height: 'calc(100% - 39px)'}},
                    sections: [
                        {
                            value: 'Variables',
                            title: 'Restrict by data column.',
                            contents: [
                                m(TextField, {
                                    id: 'searchVariables',
                                    placeholder: 'Search variables',
                                    oninput: app.setVariableSearch
                                }),
                                m(PanelList, {
                                    id: 'variablesList',
                                    items: Object.keys(app.genericMetadata[app.selectedDataset]['columns']).filter(col => col.includes(app.variableSearch)),
                                    colors: {[common.selVarColor]: app.selectedVariables},
                                    callback: app.toggleVariableSelected,
                                    attrsAll: {style: {height: 'calc(100% - 44px)', overflow: 'auto'}}
                                })
                            ]
                        },
                        {
                            value: 'Subsets',
                            title: 'Restrict by contents of rows.',
                            contents: m(PanelList, {
                                id: 'subsetsList',
                                items: Object.keys(app.genericMetadata[app.selectedDataset]['subsets']),
                                colors: {[common.selVarColor]: [app.selectedSubsetName]},
                                callback: app.setSelectedSubsetName,
                                attrsAll: {style: {height: 'calc(100% - 39px)', overflow: 'auto'}}
                            })
                        }
                    ]
                })
            })
        }

        if (mode === 'aggregate') {

            let disabledResults = [];
            if (!aggreg.aggregResultsDate) disabledResults.push('Time Series');
            if (!aggreg.aggregResults) disabledResults = ['Time Series', 'Analysis'];

            return m(Panel, {
                id: 'leftPanelMenu',
                side: 'left',
                width: '250px',
                label: 'Data Selection',
                attrsAll: {
                    style: {
                        // subtract header, spacer, spacer, scrollbar, table, and footer
                        height: `calc(100% - ${common.heightHeader} - 2*${common.panelMargin} - ${common.canvasScroll['horizontal'] ? common.scrollbarWidth : '0px'} - ${aggreg.tableHeight} - ${common.heightFooter})`
                    }
                },
                contents: m(MenuHeaders, {
                    id: 'aggregateMenu',
                    attrsAll: {style: {height: 'calc(100% - 39px)', overflow: 'auto'}},
                    sections: [
                        {
                            value: 'Unit of Measure',
                            contents: m(PanelList, {
                                items: ['Actor', 'Date'],
                                id: 'UMList',
                                colors: {[common.selVarColor]: [app.selectedCanvas]},
                                callback: app.setSelectedCanvas
                            })
                        },
                        {
                            value: 'Event Measure',
                            contents: m(PanelList, {
                                items: ['Penta Class', 'Root Code'],
                                id: 'EMList',
                                colors: {[common.selVarColor]: [app.selectedCanvas]},
                                classes: {['item-bordered']: [aggreg.eventMeasure]},
                                callback: app.setSelectedCanvas
                            })
                        },
                        {
                            value: 'Results',
                            contents: m(PanelList, {
                                items: ['Time Series', 'Analysis'],
                                id: 'ResultsList',
                                colors: {
                                    [common.grayColor]: disabledResults,
                                    [common.selVarColor]: [app.selectedCanvas]
                                },
                                classes: {['item-bordered']: [aggreg.eventMeasure]},
                                // only change the canvas if the canvas is not disabled
                                callback: (canvas) => disabledResults.indexOf(canvas) === -1 && app.setSelectedCanvas(canvas)
                            })
                        }
                    ]
                })
            })
        }
    }

    rightpanel(mode) {

        let styling = {};
        if (mode === 'datasets') styling = {display: 'none'};
        if (mode === 'aggregate') styling = {
            // subtract header, the two margins, scrollbar, table, and footer
            height: `calc(100% - ${common.heightHeader} - 2*${common.panelMargin} - ${common.canvasScroll['horizontal'] ? common.scrollbarWidth : '0px'} - ${aggreg.tableHeight} - ${common.heightFooter})`
        };

        return m(Panel, {
            id: 'rightPanelMenu',
            side: 'right',
            label: 'Query Summary',
            width: '250px',
            attrsAll: {style: styling},
            contents: [
                m(MenuHeaders, {
                    id: 'querySummaryMenu',
                    attrsAll: {style: {height: 'calc(100% - 85px)', overflow: 'auto'}},
                    sections: [
                        {value: 'Variables', contents: m('div#variableTree')},
                        {value: 'Subsets', contents: m('div#subsetTree')}
                    ]
                }),
                m("#rightpanelButtonBar", {
                        style: {
                            width: "calc(100% - 25px)",
                            "position": "absolute",
                            "bottom": '5px'
                        }
                    },
                    [
                        m("button.btn.btn-default[id='buttonAddGroup'][type='button']", {
                                style: {
                                    "float": "left"
                                },
                                onclick: addGroup
                            },
                            "Group"
                        ),

                        m("button.btn.btn-default.ladda-button[data-spinner-color='#818181'][type='button']", {
                            id: 'btnUpdate',
                            style: {float: 'right'},
                            onclick: () => {
                                if (mode === 'subset') app.submitQuery();
                                if (mode === 'aggregate') aggreg.makeAggregQuery("aggreg");
                            }
                        }, 'Update')
                    ])
            ]
        })
    }

    canvasContent() {
        if (app.selectedCanvas === 'Subset') {
            if (app.subsetData[app.selectedSubsetName] === undefined) {

                if (!app.isLoading[app.selectedSubsetName])
                    app.reloadSubset(app.selectedSubsetName);

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
                setRedraw: app.setSubsetRedraw
            })
        }

        // TODO add CanvasAnalysis
        return m({
            'Datasets': CanvasDatasets,
            'PentaClass': CanvasDatasets,
            'RootCode': CanvasRootCode,
            'Time Series': CanvasAggregTS
        }[app.selectedCanvas], {
            mode: app.selectedMode,
            preferences: app.canvasPreferences[app.selectedCanvas],
            redraw: app.canvasRedraw[app.selectedCanvas],
            setRedraw: app.setCanvasRedraw
        });
    }

    view(vnode) {
        let {mode} = vnode.attrs;

        return m('main#EventData',
            this.header(mode),
            this.leftpanel(mode),
            this.rightpanel(mode),
            m("button#btnStage.btn.btn-default[type='button']", {
                style: {
                    display: app.selectedMode === 'subset' ? 'block' : 'none',
                    right: `calc(${common.panelOcclusion['right'] || '275px'} + 5px)`,
                    bottom: `calc(${common.heightFooter} + ${common.panelMargin} + 6px)`,
                    position: 'fixed',
                    'z-index': 100
                },
                onclick: app.addRule
            }, "Stage"),
            m(Canvas, {
                attrsAll: {
                    style: mode === 'aggregate'
                        ? {height: `calc(100% - ${common.heightHeader} - ${aggreg.tableHeight} - ${common.heightFooter})`}
                        : {}
                }
            }, this.canvasContent()),
            m(TableAggregation, {mode: mode}),
            this.footer(mode)
        );
    }
}
