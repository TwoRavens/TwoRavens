import m from 'mithril';
import {tabLeft} from '../app'
import Panel from "../../../app/views/Panel";

export default class Leftpanel {
    view(vnode) {
        return m(Panel, {
                side: 'left',
                title: 'Data Selection',
                buttons: []
            },
            [
                m("[id='subsetLeftPanelSelection']",
                    {
                        style: {
                            display: "block"
                        }
                    },
                    [
                        m(".btn-group[data-toggle='buttons'][id='leftpanelButtons']", {
                                style: {
                                    "margin-left": "6px",
                                    "width": "calc(100% - 12px)"
                                }
                            },
                            [
                                m("label.btn.btn-default[title='.']",
                                    {
                                        style: {"width": "50%"},
                                        onclick: function (e) {
                                            tabLeft('variableTab');
                                            e.redraw = false;
                                        }
                                    },
                                    [
                                        m("input[autocomplete='off'][id='btnVariables'][name='options'][type='radio']", {style: {"width": "50%"}}),
                                        "Variables"
                                    ]
                                ),
                                m("label.btn.btn-default.active[id='btnSubsetLabel'][title='Click subset name to configure subset options (select rows).']",
                                    {
                                        style: {"width": "50%"},
                                        onclick: function (e) {
                                            tabLeft('subsetTab');
                                            e.redraw = false;
                                        }
                                    },
                                    [
                                        m("input[autocomplete='off'][checked=''][id='btnSubset'][name='options'][type='radio']", {style: {"width": "50%"}}),
                                        "Subsets"
                                    ]
                                )
                            ]
                        ),
                        m("[id='leftpanelContent']",
                            [
                                m("[id='variableTab']", {
                                        style: {
                                            "display": "block",
                                            "padding": "10px 8px",
                                            "text-align": "center",
                                            "width": "100%"
                                        }
                                    },
                                    [
                                        m("input.form-control[id='searchvar'][placeholder='Search Variables and Labels'][type='text']", {
                                            style: {
                                                "width": "100%",
                                                "margin-bottom": "5px"
                                            }
                                        }),
                                        m("[id='variableList']", {
                                            style: {
                                                "display": "inline",
                                                "text-align": "center",
                                                "position": "absolute",
                                                "left": "6px",
                                                "top": "128px",
                                                "height": "calc(100% - 128px)",
                                                "width": "226px",
                                                "overflow-y": "scroll"
                                            }
                                        })
                                    ]
                                ),
                                m("[id='subsetTab']", {
                                        style: {
                                            "display": "none",
                                            "padding": "10px 8px",
                                            "text-align": "center",
                                            "width": "100%",
                                            "height": "100%"
                                        }
                                    },
                                    m("[id='subsetList']", {
                                        style: {
                                            "display": "inline",
                                            "text-align": "center",
                                            "position": "absolute",
                                            "left": "6px",
                                            "width": "226px"
                                        }
                                    })
                                )
                            ]
                        )
                    ]
                ),
                m("[id='aggregLeftPanelSelection']", {style: {"display": "none"}},
                    [
                        m("[id='aggregUnitSelection']",
                            [
                                m(".panel-heading",
                                    m("h3.panel-title", "Unit of Measure")
                                ),
                                m("[id='aggregOptions']",
                                    [
                                        m("p[id='aggregDateToggle']", {
                                            style: {
                                                "width": "100%",
                                                "text-align": "center"
                                            }
                                        }, "Date"),
                                        m("p[id='aggregActorToggle']", {
                                            style: {
                                                "width": "100%",
                                                "text-align": "center"
                                            }
                                        }, "Actors")
                                    ]
                                )
                            ]
                        ),
                        m("[id='aggregEventSelection']",
                            [
                                m(".panel-heading",
                                    m("h3.panel-title",
                                        "Event Measure"
                                    )
                                ),
                                m("[id='aggregEventOptions']",
                                    [
                                        m("p[id='aggregPentaToggle']", {
                                            style: {
                                                "width": "100%",
                                                "text-align": "center"
                                            }
                                        }, "Penta Class"),
                                        m("p[id='aggregRootToggle']", {
                                            style: {
                                                "width": "100%",
                                                "text-align": "center"
                                            }
                                        }, "Rootcode")
                                    ]
                                )
                            ]
                        )
                    ]
                )
            ]
        );
    }
}