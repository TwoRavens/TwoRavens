import m from 'mithril';

import * as app from './app';
import * as aggreg from './aggreg/aggreg';
import * as tour from "./tour";

import {tableHeight} from "./aggreg/aggreg";
import {resizeActorSVG} from "./subsets/Actor";

import * as common from '../../common/app/common';
import {panelMargin, heightHeader, heightFooter, canvasScroll, scrollbarWidth} from "../../common/app/common";

import Panel from '../../common/app/views/Panel';
import Header from '../../common/app/views/Header';
import Footer from '../../common/app/views/Footer';
import Canvas from '../../common/app/views/Canvas';
import MenuTabbed from '../../common/app/views/MenuTabbed';
import MenuHeaders from '../../common/app/views/MenuHeaders';
import PanelList from '../../common/app/views/PanelList';
import TextField from '../../common/app/views/TextField';
import DropdownPopup from '../../common/app/views/DropdownPopup';
import ButtonRadio from '../../common/app/views/ButtonRadio';

import CanvasAction from "./views/CanvasAction";
import CanvasActor from "./views/CanvasActor";
import CanvasCoordinates from "./views/CanvasCoordinates";
import CanvasCustom from "./views/CanvasCustom";
import CanvasDate from "./views/CanvasDate";
import CanvasLocation from "./views/CanvasLocation";
import CanvasPentaClass from "./views/CanvasPentaClass";
import CanvasRootCode from "./views/CanvasRootCode";

import TableAggregation from "./views/TableAggregation";

export default class Body_EventData {

    oninit(vnode) {
        if (vnode.attrs.mode !== 'subset') {
            m.route.set('/subset');
            vnode.attrs.mode = 'subset';
        }
    }

    oncreate() {
        app.setupBody();
        app.setupQueryTree();
        aggreg.setupAggregation();
    }

    header(mode) {
        let datasets = [
            {
                name: 'Phoenix - UTDallas',
                content: [
                    m("p", "A real-time Phoenix-coded event dataset constructed at The University of Texas at Dallas."),
                ]
            },
            {
                name: 'Cline - New York Times',
                content: [
                    m(".head", {style: {"margin-left": "40px"}},
                        m("a[href='http://www.clinecenter.illinois.edu/data/event/phoenix/']", {style: {color: '#337ab7'}}, "Cline New York Times")
                    ),
                    m("p", "This data is sourced from the New York Times and collected by the Cline Center for Advanced Social Research."),
                ]
            },
            {
                name: 'Cline - CIA Broadcast',
                content: [
                    m(".head", {style: {"margin-left": "40px"}},
                        m("a[href='http://www.clinecenter.illinois.edu/data/event/phoenix/']", {style: {color: '#337ab7'}}, "Cline CIA Broadcast")
                    ),
                    m("p", "This data is sourced from the CIA Foreign Broadcast Information Service and collected by the Cline Center for Advanced Social Research."),
                ]
            },
            {
                name: 'Cline - BBC Summary',
                content: [
                    m(".head", {style: {"margin-left": "40px"}},
                        m("a[href='http://www.clinecenter.illinois.edu/data/event/phoenix/']", {style: {color: '#337ab7'}}, "Cline BBC Summary")
                    ),
                    m("p", "This data is sourced from the BBC Summary of World Broadcasts and collected by the Cline Center for Advanced Social Research."),
                ]
            },
            {
                name: 'ICEWS',
                content: [
                    m(".head", {style: {"margin-left": "40px"}},
                        m("a[href='https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/28075']", {style: {color: '#337ab7'}}, "ICEWS Coded Event Data")
                    ),
                    m("p", "Event data consists of coded interactions between socio-political actors (i.e., cooperative or hostile actions between individuals, groups, sectors and nation states).")
                ]
            }
        ];

        return m(Header, {
            contents: [
                // Button Reset
                m("button.btn.btn-default.ladda-button[data-spinner-color='#818181'][data-style='zoom-in'][id='btnReset'][title='Reset']", {
                        style: {
                            "margin-left": "2.0em",
                            "float": "right"
                        },
                        onclick: app.reset
                    },
                    m("span.ladda-label.glyphicon.glyphicon-repeat", {
                        style: {
                            "font-size": "1em",
                            "color": "#818181",
                            "pointer-events": "none"
                        }
                    })
                ),

                m(ButtonRadio, {
                    id: 'modeButtonBar',
                    attrsAll: {style: {width: '18em', margin: '0 2em'}, class: 'navbar-right'},
                    onclick: (mode) => {
                        app.setOpMode(mode);
                        // the route set doesn't work inside setOpMode... no clue why
                        m.route.set('/' + mode.toLowerCase());
                    },
                    activeSection: app.opMode,
                    sections: [
                        {value: 'Subset', id: 'btnSubsetSubmit'},
                        {value: 'Peek'},
                        {value: 'Aggregate', id: 'aggSubmit'}
                    ]
                }),

                // Dataset Selection
                m(DropdownPopup, {
                    header: 'Dataset Selection',
                    sections: datasets,
                    callback: app.setDataset,
                    attrsAll: {
                        style: {
                            position: "fixed",
                            top: '15px',
                            left: "calc(50% + 20px)"
                        }
                    },
                }),
                m("h4", {style: {"right": "calc(50% - 10px)", "position": "fixed"}},
                    m("span.label.label-default[id='datasetLabel']")
                )
            ]
        });
    }

    footer(mode) {
        return m(Footer, [
            m("span.label.label-default", {style: {"margin-left": "10px", "display": "inline-block"}}, "Tours"),
            (mode === 'subset') ?
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
                ]) :
            m("div[id='aggregTourBar']", {style: {"display": "inline-block"}}, [
                m("button.btn.btn-default.btn-sm[id='tourButtonAggreg'][type='button']", {
                    style: {
                        "margin-left": "5px",
                        "margin-top": "4px"
                    },
                    onclick: tour.tourStartAggregation
                }, "Aggregation")
            ]),
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
                        height: `calc(100% - ${heightHeader + heightFooter}px - ${2 * panelMargin}px - ${canvasScroll['horizontal'] ? scrollbarWidth : 0}px - ${tableHeight})`
                    }
                },
                contents: m(MenuHeaders, {
                    id: 'aggregateMenu',
                    sections: [
                        {
                            value: 'Unit of Measure',
                            contents: m(PanelList, {
                                items: ['Date', 'Actor'],
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
        return m(Panel, {
            id: 'rightPanelMenu',
            side: 'right',
            label: 'Query Summary',
            width: '250px',
            attrsAll: {
                style: mode === 'aggregate' ? {
                    height: `calc(100% - ${heightHeader + heightFooter}px - ${2 * panelMargin}px - ${canvasScroll['horizontal'] ? scrollbarWidth : 0}px - ${tableHeight})`
                } : {}
            },
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
        app.setOpMode(mode);

        // Some canvases only exist in certain modes. Fall back to default if necessary.
        if (mode === 'subset' && app.subsetKeys.indexOf(app.canvasKeySelected) === -1) app.showCanvas('Actor');
        if (mode === 'aggregate' && app.aggregateKeys.indexOf(app.canvasKeySelected) === -1) app.showCanvas('Date');

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
                        display: app.canvasKeySelected !== 'Custom' && app.opMode === 'subset' ? 'block' : 'none',
                        right: `calc(${common.panelOcclusion['right'] || '275px'} + 5px)`,
                        bottom: common.heightFooter + common.panelMargin + 6 + 'px',
                        position: 'fixed',
                        'z-index': 100
                    },
                    onclick: app.addRule
                }, "Stage"),
                m(Canvas, {
                    contents: [
                        m(CanvasActor, {mode: mode, display: display('Actor')}),
                        m(CanvasDate, {mode: mode, display: display('Date')}),
                        m(CanvasAction, {mode: mode, display: display('Action')}),
                        m(CanvasLocation, {mode: mode, display: display('Location')}),
                        m(CanvasCoordinates, {mode: mode, display: display('Coordinates')}),
                        m(CanvasCustom, {mode: mode, display: display('Custom')}),
                        m(CanvasPentaClass, {mode: mode, display: display('Penta Class')}),
                        m(CanvasRootCode, {mode: mode, display: display('Root Code')})
                    ],
                    attrsAll: {style: mode === 'aggregate' ? {height: `calc(100% - ${heightHeader + heightFooter}px - ${tableHeight})`} : {}}
                }),
                m(TableAggregation, {mode: mode}),
                this.footer(mode)
            ]
        );
    }
}
