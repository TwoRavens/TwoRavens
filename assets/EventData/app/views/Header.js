import m from 'mithril';

export default class Header {
    view(vnode) {
        return (m("nav.navbar.navbar-default.navbar-fixed-top[id='navbar'][role='navigation']",
            [
                m("a.navbar-brand", {style: {"margin-left": "0"}},
                    m("img[alt='TwoRavens'][onmouseout='closeabout();'][onmouseover='about();'][src='../../../images/TwoRavens.png'][width='100']", {
                        style: {
                            "margin-left": "2em",
                            "margin-top": "-0.5em"
                        }
                    })
                ),
                m("[id='navbarNav']", {style: {"margin-top": "11px"}},
                    [
                        // Button Aggregate
                        m("button.btn.btn-default.navbar-right[id='aggSubmit'][onclick='updateToAggreg()']", {style: {"margin-right": "1em"}}, "Aggregate"),

                        // Button Subset Submit
                        m("label.btn.btn-default.ladda-button.navbar-right[data-spinner-color='#818181'][data-style='zoom-in'][id='btnSubmit'][onclick='submitQuery()']", {
                                style: {
                                    "float": "right",
                                    "margin-left": "2em",
                                    "margin-right": "1em"
                                }
                            },
                            m("span.ladda-label", "Subset")
                        ),

                        // Button Reset
                        m("button.btn.btn-default.ladda-button.navbar-right[data-spinner-color='#818181'][data-style='zoom-in'][id='btnReset'][onclick='reset()'][title='Reset']", {
                                style: {
                                    "margin-left": "2.0em",
                                    "float": "right"
                                }
                            },
                            m("span.ladda-label.glyphicon.glyphicon-repeat", {
                                style: {
                                    "font-size": "1em",
                                    "color": "#818181",
                                    "pointer-events": "none"
                                }
                            })
                        ),

                        // Dataset Selection
                        m("div", {style: {"left": "calc(50% + 20px)", "position": "fixed", "margin-top": "6px"}},
                            m(".popover-markup", {style: {"display": "inline"}},
                                [
                                    m("a.trigger.btn.btn-sm.btn-default[href='#']", {style: {"height": "30px"}},
                                        m("span.glyphicon.glyphicon-chevron-down", {
                                            style: {
                                                "margin-top": "3px",
                                                "font-size": "1em",
                                                "color": "#818181",
                                                "pointer-events": "none"
                                            }
                                        })
                                    ),
                                    m(".head.hide",
                                        "Dataset"
                                    ),
                                    m(".content.hide",
                                        m(".popoverContentContainer",
                                            [
                                                m("[id='optionMenu']",
                                                    [
                                                        m("button.btn.btn-default[data-option='1'][id='option']", "Phoenix - UTDallas"),
                                                        m("button.btn.btn-default[data-option='2'][id='option']", "Cline - New York Times"),
                                                        m("button.btn.btn-default[data-option='3'][id='option']", "Cline - CIA Broadcast"),
                                                        m("button.btn.btn-default[data-option='4'][id='option']", "Cline - BBC Summary"),
                                                        m("button.btn.btn-default[data-option='5'][id='option']", "ICEWS")
                                                    ]
                                                ),

                                                m(".optionView[id='optionView1']",
                                                    [
                                                        m("button.btn.btn-sm.btn-default[data-option='1'][id='option']",
                                                            m("span.glyphicon.glyphicon-chevron-left", {
                                                                style: {
                                                                    "font-size": "1em",
                                                                    "color": "#818181",
                                                                    "pointer-events": "none"
                                                                }
                                                            })
                                                        ),
                                                        m("p", "A Phoenix-coded event dataset constructed here at The University of Texas at Dallas!"),
                                                        m("a.btn.btn-primary.btn-sm[onclick='setDataset(\'phoenix_rt\')']", "Select")
                                                    ]
                                                ),

                                                m(".optionView[id='optionView2']",
                                                    [
                                                        m("button.btn.btn-sm.btn-default[data-option='2'][id='option']",
                                                            m("span.glyphicon.glyphicon-chevron-left", {
                                                                style: {
                                                                    "font-size": "1em",
                                                                    "color": "#818181",
                                                                    "pointer-events": "none"
                                                                }
                                                            })
                                                        ),
                                                        m(".head", {style: {"margin-left": "40px"}},
                                                            m("a[href='http://www.clinecenter.illinois.edu/data/event/phoenix/']", "Cline New York Times")
                                                        ),
                                                        m("p", "This data is sourced from the New York Times and collected by the Cline Center for Advanced Social Research."),
                                                        m("a.btn.btn-primary[onclick='setDataset(\'cline_phoenix_nyt\')']", "Select")
                                                    ]
                                                ),

                                                m(".optionView[id='optionView3']",
                                                    [
                                                        m("button.btn.btn-sm.btn-default[data-option='3'][id='option']",
                                                            m("span.glyphicon.glyphicon-chevron-left", {
                                                                style: {
                                                                    "font-size": "1em",
                                                                    "color": "#818181",
                                                                    "pointer-events": "none"
                                                                }
                                                            })
                                                        ),
                                                        m(".head", {style: {"margin-left": "40px"}},
                                                            m("a[href='http://www.clinecenter.illinois.edu/data/event/phoenix/']", "Cline CIA Broadcast")
                                                        ),
                                                        m("p", "This data is sourced from the CIA Foreign Broadcast Information Service and collected by the Cline Center for Advanced Social Research."),
                                                        m("a.btn.btn-primary[onclick='setDataset(\'cline_phoenix_fbis\')']", "Select")
                                                    ]
                                                ),

                                                m(".optionView[id='optionView4']",
                                                    [
                                                        m("button.btn.btn-sm.btn-default[data-option='4'][id='option']",
                                                            m("span.glyphicon.glyphicon-chevron-left", {
                                                                style: {
                                                                    "font-size": "1em",
                                                                    "color": "#818181",
                                                                    "pointer-events": "none"
                                                                }
                                                            })
                                                        ),
                                                        m(".head", {style: {"margin-left": "40px"}},
                                                            m("a[href='http://www.clinecenter.illinois.edu/data/event/phoenix/']", "Cline BBC Summary")
                                                        ),
                                                        m("p", "This data is sourced from the BBC Summary of World Broadcasts and collected by the Cline Center for Advanced Social Research."),
                                                        m("a.btn.btn-primary[onclick='setDataset(\'cline_phoenix_swb\')']", "Select")
                                                    ]
                                                ),

                                                m(".optionView[id='optionView5']",
                                                    [
                                                        m("button.btn.btn-sm.btn-default[data-option='5'][id='option']",
                                                            m("span.glyphicon.glyphicon-chevron-left", {
                                                                style: {
                                                                    "font-size": "1em",
                                                                    "color": "#818181",
                                                                    "pointer-events": "none"
                                                                }
                                                            })
                                                        ),
                                                        m(".head", {style: {"margin-left": "40px"}},
                                                            m("a[href='https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/28075']", "ICEWS Coded Event Data")
                                                        ),
                                                        m("p", "Event data consists of coded interactions between socio-political actors (i.e., cooperative or hostile actions between individuals, groups, sectors and nation states)."),
                                                        m("a.btn.btn-primary[onclick='setDataset(\'icews\')']", "Select")
                                                    ]
                                                )
                                            ]
                                        )
                                    )
                                ]
                            )
                        ),
                        m("h4", {style: {"right": "calc(50% - 10px)", "position": "fixed"}},
                            m("span.label.label-default[id='datasetLabel']")
                        )
                    ]
                ),
                m(".panel.panel-default[id='about']", {
                        style: {
                            "margin-top": "62px",
                            "width": "500px",
                            "display": "None",
                            "z-index": "50"
                        }
                    },
                    m(".panel-body")
                )
            ]
        ));
    }
}