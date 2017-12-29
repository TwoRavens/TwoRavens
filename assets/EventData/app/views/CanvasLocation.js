import m from 'mithril';

export default class CanvasLocation {
    view(vnode) {
        return (m(".subsetDiv[id='subsetLocation']", {style: {"display": "none"}},
            [
                m("[tabindex='0']", {
                        style: {
                            "outline": "none",
                            "width": "480px",
                            "float": "left",
                            "margin-top": "10px",
                            "margin-left": "10px"
                        }
                    },
                    [
                        // Global Graph
                        m(".graph_config[align='center'][id='main_graph_td_div']", {
                                style: {
                                    "width": "480px",
                                    "border": "1px solid #ADADAD",
                                    "padding-top": "3px",
                                    "background": "rgb(249, 249, 249)"
                                }
                            },
                            [
                                // World Regions text header
                                m(".panel-heading.text-center[id='regionLabel']", {
                                        style: {
                                            "float": "left",
                                            "padding-top": "9px"
                                        }
                                    },
                                    m("h3.panel-title", "World Regions")
                                ),

                                // Expand/collapse
                                m("label.hide_label[id='Expand_Collapse_Main_Text']", "Collapse"),
                                m("button.btn.btn-default[onclick='maingraphAction(\'Expand_Collapse\')']", {
                                        style: {
                                            "cursor": "pointer",
                                            "float": "right",
                                            "margin-right": "5px"
                                        }
                                    },
                                    m("span.glyphicon.glyphicon-resize-small[id='Exp_Col_Icon']", {style: {"color": "#818181"}})
                                ),

                                // Plot all/none
                                m("button.btn.btn-default[data-toggle='tooltip'][id='Expand_All'][onclick='maingraphAction(\'All\')'][type='button']", {
                                    style: {
                                        "float": "right",
                                        "margin-right": "5px"
                                    }
                                }, "Plot All"),
                                m("button.btn.btn-default[data-toggle='tooltip'][id='Collapse_All'][onclick='maingraphAction(\'None\')'][type='button']", {
                                    style: {
                                        "float": "right",
                                        "margin-right": "5px"
                                    }
                                }, "Plot None")
                            ]
                        ),

                        // Bin for all region graphs
                        m("[id='sub_graph_td_div']")
                    ]
                ),

                // Country Table
                m("[id='country_table']", {
                        style: {
                            "position": "fixed",
                            "margin-left": "10px",
                            "margin-top": "10px",
                            "width": "250px",
                            "height": "calc(100% - 122px)",
                            "max-height": "432px",
                            "display": "inline-block",
                            "background": "rgb(249, 249, 249)",
                            "border": "1px solid #ADADAD"
                        }
                    },
                    [
                        m("[id='countryTableHeader']", {style: {"width": "250px", "display": "inline-block"}},
                            [
                                // Title
                                m("h3.panel-title", {
                                    style: {
                                        "padding-left": "10px",
                                        "padding-top": "12px",
                                        "float": "left",
                                        "width": "calc(100% - 100px)"
                                    }
                                }, "Selected Countries"),
                                // Reset Button
                                m("button.btn.btn-default[onclick='d3loc()']", {
                                    style: {
                                        "cursor": "pointer",
                                        "float": "right",
                                        "margin-top": "5px",
                                        "margin-right": "7px"
                                    }
                                }, "Reset")
                            ]
                        ),

                        // Contains list of countries
                        m("div", {
                                style: {
                                    "position": "fixed",
                                    "height": "calc(100% - 168px)",
                                    "max-height": "386px",
                                    "overflow-y": "scroll",
                                    "margin-left": "5px",
                                    "width": "243px"
                                }
                            },
                            m("table[align='left'][id='country_list_tab']")
                        )
                    ]
                )
            ]
        ));
    }
}
