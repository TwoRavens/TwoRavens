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

import CanvasAbout from "./canvases/CanvasAbout";
import CanvasDatasets from "./canvases/CanvasDatasets";
import CanvasSavedQueries from "./canvases/CanvasSavedQueries";

import CanvasCategorical from "./canvases/CanvasCategorical";
import CanvasDyad from "./canvases/CanvasDyad";
import CanvasDate from "./canvases/CanvasDate";
import CanvasCategoricalGrouped from "./canvases/CanvasCategoricalGrouped";
import CanvasCoordinates from "./canvases/CanvasCoordinates";
import CanvasCustom from "./canvases/CanvasCustom";

import CanvasTimeSeries from "./canvases/CanvasTimeSeries";
import TableAggregation from "./views/TableAggregation";
import Button from "../../common-eventdata/views/Button";
import ModalVanilla from "../../common-eventdata/views/ModalVanilla";
import SaveQuery from "./views/SaveQuery";

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

    header() {
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
            'aggregate': app.aggregationData.length
        }[app.selectedMode];

        return m(Footer, [
            tourBar,
            m("#recordBar", {style: {display: "inline-block", float: 'right'}}, [

                app.selectedMode !== 'home' && m(Button, {
                    class: ['btn-sm'],
                    onclick: () => app.setDisplayModal(true), style: {'margin-top': '4px'}
                }, 'Save'),

                m("button.btn.btn-default.btn-sm.ladda-button[data-spinner-color='#818181'][id='buttonDownload'][type='button']", {
                        style: {
                            display: app.selectedDataset ? 'inline-block' : 'none', // don't conditionally draw, because of ladda
                            "margin-right": "6px",
                            'margin-top': '4px',
                            'margin-left': '6px',
                            "data-style": "zoom-in"
                        },
                        onclick: app.download
                    },
                    m("span.ladda-label", "Download")
                ),
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
        if (mode === 'datasets') {
            return m(Panel, {
                side: 'left',
                label: 'Navigation',
                hover: false,
                width: '250px',
                contents: m(PanelList, {
                    id: 'homePanelList',
                    items: ['About', 'Datasets', 'Saved Queries'],
                    colors: {[common.selVarColor]: [app.selectedCanvasHome]},
                    callback: app.setSelectedCanvas,
                    attrsAll: {style: {height: '100%', overflow: 'auto'}}
                })
            })
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
                                    value: app.variableSearch,
                                    oninput: app.setVariableSearch
                                }),
                                m(PanelList, {
                                    id: 'variablesList',
                                    items: app.genericMetadata[app.selectedDataset]['columns'].filter(col => col.includes(app.variableSearch)),
                                    colors: {[common.selVarColor]: app.selectedVariables},
                                    callback: app.toggleVariableSelected,
                                    attrsAll: {style: {height: 'calc(100% - 44px)', overflow: 'auto'}}
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
                                            callback: (subset) => (subset === 'Custom' ? app.setSelectedCanvas : app.setSelectedSubsetName)(subset)
                                        })
                                    }))
                            })
                        }
                    ]
                })
            })
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

            return m(Panel, {
                id: 'leftPanelMenu',
                side: 'left',
                width: '250px',
                label: 'Data Selection',
                attrsAll: {
                    style: {
                        // subtract header, spacer, spacer, scrollbar, table, and footer
                        height: `calc(100% - ${common.heightHeader} - 2*${common.panelMargin} - ${common.canvasScroll['horizontal'] ? common.scrollbarWidth : '0px'} - ${app.tableHeight} - ${common.heightFooter})`
                    }
                },
                contents: m(MenuHeaders, {
                    id: 'aggregateMenu',
                    attrsAll: {style: {height: 'calc(100% - 39px)', overflow: 'auto'}},
                    sections: [
                        {
                            value: 'Unit of Measure',
                            contents: m(PanelList, {
                                items: app.aggregateKeys().filter(subset => tempDataset['subsets'][subset]['measures'].indexOf('unit') !== -1),
                                id: 'UMList',
                                colors: {[common.selVarColor]: [app.selectedSubsetName]},
                                classes: {['item-bordered']: Object.keys(app.unitMeasure).filter(key => app.unitMeasure[key])},
                                callback: app.setSelectedSubsetName
                            })
                        },
                        {
                            value: 'Event Measure',
                            contents: m(PanelList, {
                                items: app.aggregateKeys().filter(subset => tempDataset['subsets'][subset]['measures'].indexOf('event') !== -1),
                                id: 'EMList',
                                colors: {[common.selVarColor]: [app.selectedSubsetName]},
                                classes: {['item-bordered']: [app.eventMeasure]},
                                callback: (subset) => {
                                    app.setEventMeasure(subset);
                                    app.setSelectedSubsetName(subset);
                                }
                            })
                        },
                        {
                            value: 'Results',
                            contents: m(PanelList, {
                                items: ['Time Series', 'Analysis'],
                                id: 'ResultsList',
                                colors: {
                                    [common.grayColor]: timeSeries ? [] : ['Time Series'],
                                    [common.selVarColor]: [app.selectedCanvas]
                                },
                                // only change the canvas if the canvas is not disabled
                                callback: (canvas) => (canvas !== 'Time Series' || timeSeries) && app.setSelectedCanvas(canvas)
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
            height: `calc(100% - ${common.heightHeader} - 2*${common.panelMargin} - ${common.canvasScroll['horizontal'] ? common.scrollbarWidth : '0px'} - ${app.tableHeight} - ${common.heightFooter})`
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
                                onclick: app.addGroup
                            },
                            "Group"
                        ),

                        m("button.btn.btn-default.ladda-button[data-spinner-color='#818181'][type='button']", {
                            id: 'btnUpdate',
                            style: {float: 'right'},
                            onclick: () => {
                                if (mode === 'subset') query.submitQuery();
                                if (mode === 'aggregate') query.submitAggregation();
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
                setRedraw: (state) => app.setSubsetRedraw(app.selectedSubsetName, state)
            })
        }

        // TODO add CanvasAnalysis
        app.canvasPreferences[app.selectedCanvas] = app.canvasPreferences[app.selectedCanvas] || {};
        return m({
            'About': CanvasAbout,
            'Datasets': CanvasDatasets,
            'Saved Queries': CanvasSavedQueries,
            'Time Series': CanvasTimeSeries,
            'Custom': CanvasCustom
        }[app.selectedCanvas], {
            mode: app.selectedMode,
            preferences: app.canvasPreferences[app.selectedCanvas],
            redraw: app.canvasRedraw[app.selectedCanvas],
            setRedraw: (state) => app.setCanvasRedraw(app.selectedCanvas, state)
        });
    }

    view(vnode) {
        let {mode} = vnode.attrs;

        return m('main#EventData',

            app.selectedMode !== 'Home' && m(ModalVanilla, {
                id: 'SaveQuery',
                display: app.displayModal,
                setDisplay: app.setDisplayModal,
                contents: m(SaveQuery, {preferences: app.saveQuery[app.selectedMode]})
            }),

            this.header(),
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
                        ? {height: `calc(100% - ${common.heightHeader} - ${app.tableHeight} - ${common.heightFooter})`}
                        : {}
                }
            }, this.canvasContent()),
            m(TableAggregation, {mode: mode}),
            this.footer(mode)
        );
    }
}
