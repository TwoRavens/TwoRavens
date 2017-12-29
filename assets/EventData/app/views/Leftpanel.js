import m from 'mithril';

export default class Leftpanel {
    view(vnode) {
        return (m(".sidepanel.container.clearfix[id='leftpanel']",
            [
                m(".panelbar[id='toggleLpanelicon']", m.trust("<span>&#9679;<br/>&#9679;<br/>&#9679;<br/>&#9679;</span>")),
                m("[id='leftPanelAllContent']",
                    [
                        m("[id='subsetLeftPanelSelection']",
                            [
                                m(".panel-heading.text-center[id='leftpaneltitle']",
                                    m("h3.panel-title", "Data Selection")
                                ),
                                m(".btn-group[data-toggle='buttons'][id='leftpanelButtons']", {
                                        style: {
                                            "margin-left": "6px",
                                            "width": "calc(100% - 12px)"
                                        }
                                    },
                                    [
                                        m("label.btn.btn-default[onclick='tabLeft(\'variableTab\');'][title='Click variable name to add variables to data subset (select columns).']", {style: {"width": "50%"}},
                                            [
                                                m("input[autocomplete='off'][id='btnVariables'][name='options'][type='radio']", {style: {"width": "50%"}}),
                                                "Variables"
                                            ]
                                        ),
                                        m("label.btn.btn-default.active[id='btnSubsetLabel'][onclick='tabLeft(\'subsetTab\');'][title='Click subset name to configure subset options (select rows).']", {style: {"width": "50%"}},
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
                )
            ]
        ));
    }
}