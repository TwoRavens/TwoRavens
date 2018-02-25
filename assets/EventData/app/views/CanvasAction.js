import m from 'mithril';
import {setupAction} from '../subsets/Action.js';
import {panelMargin} from "../../../common/app/common";

export default class CanvasAction {
    oncreate() {
        setupAction();
    }
    view(vnode) {
        let {display} = vnode.attrs;

        return (m("#canvasAction.subsetDiv", {style: {"display": display, height: '100%', 'padding-top': panelMargin + 'px'}},
            m("[id='actionSVGbin']", {
                    style: {
                        "display": "inline-block",
                        "height": "calc(100% - 10px)",
                        "width": "calc(100%)"
                    }
                },
                [
                    m(".action_graph_config[id='pentaclass_container']", {
                            style: {
                                "float": "left",
                                "display": "inline-block",
                                "vertical-align": "top",
                                "height": "100%",
                                "width": "calc(35% - 10px)"
                            }
                        },
                        [
                            m(".panel-heading.text-center[id='pentaclassLabel']", {
                                    style: {
                                        "float": "left",
                                        "padding-top": "9px"
                                    }
                                },
                                m("h3.panel-title", "Penta Classes")
                            ),
                            m("br"),
                            m("svg[height='100%'][id='actionMainGraph'][width='100%']", {style: {"background": "none"}})
                        ]
                    ),
                    m(".action_graph_config[id='rootcode_container']", {
                            style: {
                                "float": "right",
                                "display": "inline-block",
                                "vertical-align": "top",
                                "height": "100%",
                                "width": "calc(65%)"
                            }
                        },
                        [
                            m(".panel-heading.text-center[id='rootclassLabel']", {
                                    style: {
                                        "float": "left",
                                        "padding-top": "9px"
                                    }
                                },
                                m("h3.panel-title", "Root Classes")
                            ),
                            m("br"),
                            m("svg[height='100%'][id='actionSubGraph'][width='100%']", {style: {"background": "none"}})
                        ]
                    ),
                    m(".SVGtooltip")
                ]
            )
        ));
    }
}