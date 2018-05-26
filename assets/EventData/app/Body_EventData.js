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
import CanvasAction from "./views/CanvasAction";
import CanvasActor from "./views/CanvasActor";
import CanvasCoordinates from "./views/CanvasCoordinates";
import CanvasCustom from "./views/CanvasCustom";
import CanvasDate from "./views/CanvasDate";
import CanvasLocation from "./views/CanvasLocation";
import CanvasPentaClass from "./views/CanvasPentaClass";
import CanvasRootCode from "./views/CanvasRootCode";
import CanvasAggregTS from "./views/CanvasAggregTS";

import TableAggregation from "./views/TableAggregation";

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
        aggreg.setupAggregation();
    }

    header(mode) {
        return m(Header, {image: '/static/images/TwoRavens.png'},

            m('div', {style: {'flex-grow': 1}}),
            m("h4", m("span#datasetLabel.label.label-default", {style: {margin: '.25em 1em'}}, app.dataset)),

            m('div', {style: {'flex-grow': 1}}),
            m("button#btnPeek.btn.btn-default", {
                    title: 'Display a data preview',
                    style: {margin: '.25em 1em'},
                    onclick: () => window.open('#!/peek', 'peek')
                },
                'Peek'
            ),

            // Button Reset
            m("button#btnReset.btn.btn-default.ladda-button[data-spinner-color='#818181'][data-style='zoom-in'][title='Reset']", {
                    style: {margin: '1em'},
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
                attrsAll: {style: {width: '18em', margin: '.25em 1em'}},
                onclick: (mode) => {
                    app.setOpMode(mode);
                    // the route set doesn't work inside setOpMode... no clue why
                    m.route.set('/' + mode.toLowerCase());
                },
                activeSection: app.opMode,
                sections: [
                    {value: 'Datasets'},
                    {value: 'Subset', id: 'btnSubsetSubmit'},
                    {value: 'Aggregate', id: 'aggSubmit'}
                ]
            })
        );
    }

    footer(mode) {

        let tours;

        if (mode === 'subset') {
            tours = [
                m("span.label.label-default", {style: {"margin-left": "10px", "display": "inline-block"}}, "Tours"),
                m("div[id='subsetTourBar']", {style: {"display": "inline-block"}}, [
                    m("button.btn.btn-default.btn-sm[id='tourButtonGeneral'][type='button']", {
                        style: {
                            "margin-left": "5px",
                            "margin-top": "4px"
                        },
                        onclick: tour.tourStartGeneral
                    }, "General"),
                    m("button.btn.btn-default.btn-sm[id='tourButtonActor'][type='button']", {
                        style: {
                            "margin-left": "5px",
                            "margin-top": "4px"
                        },
                        onclick: tour.tourStartActor
                    }, "Actor"),
                    m("button.btn.btn-default.btn-sm[id='tourButtonDate'][type='button']", {
                        style: {
                            "margin-left": "5px",
                            "margin-top": "4px"
                        },
                        onclick: tour.tourStartDate
                    }, "Date"),
                    m("button.btn.btn-default.btn-sm[id='tourButtonAction'][type='button']", {
                        style: {
                            "margin-left": "5px",
                            "margin-top": "4px"
                        },
                        onclick: tour.tourStartAction
                    }, "Action"),
                    m("button.btn.btn-default.btn-sm[id='tourButtonLocation'][type='button']", {
                        style: {
                            "margin-left": "5px",
                            "margin-top": "4px"
                        },
                        onclick: tour.tourStartLocation
                    }, "Location"),
                    m("button.btn.btn-default.btn-sm[id='tourButtonCoordinates'][type='button']", {
                        style: {
                            "margin-left": "5px",
                            "margin-top": "4px"
                        },
                        onclick: tour.tourStartCoordinates
                    }, "Coordinates"),
                    m("button.btn.btn-default.btn-sm[id='tourButtonCustom'][type='button']", {
                        style: {
                            "margin-left": "5px",
                            "margin-top": "4px"
                        },
                        onclick: tour.tourStartCustom
                    }, "Custom")
                ])];
        }

        if (mode === 'aggregate') {
            tours = [
                m("span.label.label-default", {style: {"margin-left": "10px", "display": "inline-block"}}, "Tours"),
                m("div[id='aggregTourBar']", {style: {"display": "inline-block"}}, [
                    m("button.btn.btn-default.btn-sm[id='tourButtonAggreg'][type='button']", {
                        style: {
                            "margin-left": "5px",
                            "margin-top": "4px"
                        },
                        onclick: tour.tourStartAggregation
                    }, "Aggregation")
                ])];
        }

        return m(Footer, [
            tours,
            m("#recordBar", {style: {display: "inline-block", float: 'right'}}, [

                m("button.btn.btn-default.btn-sm.ladda-button[data-spinner-color='#818181'][id='buttonDownload'][type='button']", {
                        style: {
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
                m("span.label.label-default#recordCount", {
                    style: {
                        "display": "inline-block",
                        "margin-left": "5px",
                        "margin-top": "10px",
                        "margin-right": "10px"
                    }
                })
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
                                    oninput: app.reloadLeftpanelVariables
                                }),
                                m(PanelList, {
                                    id: 'variablesList',
                                    items: app.matchedVariables,
                                    colors: {[common.selVarColor]: app.variablesSelected},
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
                                items: app.subsetKeys,
                                colors: {[common.selVarColor]: [app.canvasKeySelected]},
                                callback: app.showCanvas,
                                attrsAll: {style: {height: 'calc(100% - 39px)', overflow: 'auto'}}
                            })
                        }
                    ]
                })
            })
        }

        if (mode === 'aggregate') {
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
                    sections: [
                        {
                            value: 'Unit of Measure',
                            contents: m(PanelList, {
                                items: ['Actor', 'Date'],
                                id: 'UMList',
                                colors: {[common.selVarColor]: [app.canvasKeySelected]},
                                callback: app.showCanvas
                            })
                        },
                        {
                            value: 'Event Measure',
                            contents: m(PanelList, {
                                items: ['Penta Class', 'Root Code'],
                                id: 'EMList',
                                colors: {[common.selVarColor]: [app.canvasKeySelected]},
                                classes: {['item-bordered']: [aggreg.eventMeasure]},
                                callback: app.showCanvas
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
                m("#rightpanelButtonBar", {style: {width: "calc(100% - 25px)", "position": "absolute", "bottom": '5px'}},
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
                                if (mode === 'aggregate') aggreg.updateToAggreg();
                            }
                        }, 'Update')
                    ])
            ]
        })
    }

    view(vnode) {
        let {mode} = vnode.attrs;

        // Typically with mithril you would just render the pages that are visible. This works when there is no local state.
        // Eventdata was written before we used mithril, so the canvases were written with local state.
        // To preserve state, all pages are always rendered, but use css to hide inactive canvases.
        let display = (canvas) => {
            if (!app.initialLoad) return 'none';
            return (canvas === app.canvasKeySelected) ? 'block' : 'none';
        };

        return m('main',
            [
                this.header(mode),
                this.leftpanel(mode),
                this.rightpanel(mode),
                m("button#btnStage.btn.btn-default[type='button']", {
                    style: {
                        display: app.opMode === 'subset' ? 'block' : 'none',
                        right: `calc(${common.panelOcclusion['right'] || '275px'} + 5px)`,
                        bottom: `calc(${common.heightFooter} + ${common.panelMargin} + 6px)`,
                        position: 'fixed',
                        'z-index': 100
                    },
                    onclick: app.addRule
                }, "Stage"),
                m(Canvas, {attrsAll: {style: mode === 'aggregate' ? {height: `calc(100% - ${common.heightHeader} - ${aggreg.tableHeight} - ${common.heightFooter})`} : {}}},
                    [
                        m(CanvasDatasets, {mode: mode, display: ('Datasets' === app.canvasKeySelected) ? 'block' : 'none'}),
                        m(CanvasActor, {mode: mode, display: display('Actor')}),
                        m(CanvasDate, {mode: mode, display: display('Date')}),
                        m(CanvasAction, {mode: mode, display: display('Action')}),
                        m(CanvasLocation, {mode: mode, display: display('Location')}),
                        m(CanvasCoordinates, {mode: mode, display: display('Coordinates')}),
                        m(CanvasCustom, {mode: mode, display: display('Custom')}),
                        m(CanvasPentaClass, {mode: mode, display: display('Penta Class')}),
                        m(CanvasRootCode, {mode: mode, display: display('Root Code')}),
                        m(CanvasAggregTS, {mode: mode, display: display('Time Series')})
                    ]
                ),
                m(TableAggregation, {mode: mode}),
                this.footer(mode)
            ]
        );
    }
}
