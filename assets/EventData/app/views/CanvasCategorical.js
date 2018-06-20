import m from 'mithril';
import {panelMargin} from "../../../common/common";
import PlotBars from "./PlotBars";

let actionMap = [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 3, 4, 4, 4, 4];

export default class CanvasCategorical {
    view(vnode) {
        let {data, preferences} = vnode.attrs;
        preferences['action_codes'] = preferences['action_codes'] || Array(20).fill(false);

        let ploverData = data.map((quantity, i) => ({
            key: i,
            value: quantity,
            'class': preferences['action_codes'][i] ? 'bar-selected' : 'bar'
            // TODO: 'title': ''
        }));

        // determine style
        let clusteredPreferences = Array(5).fill(0).map(() => []);
        actionMap.forEach((penta, i) => clusteredPreferences[penta].push(preferences['action_codes'][i]));

        // determine quantities
        let clusteredQuantities = Array(5).fill(0);
        data.forEach((quantity, i) => clusteredQuantities[actionMap[i]] += quantity);

        let pentaData = Array(5).fill(0).map((_, i) => ({
            key: i,
            value: clusteredQuantities[i],
            'class': clusteredPreferences[i].every(_=>_) ? 'bar-selected' : clusteredPreferences[i].some(_=>_) ? 'bar-some' : 'bar',
            // TODO: 'title': ''
        }));

        return (m("#canvasAction", {style: {height: '100%', 'padding-top': panelMargin}},
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
                            m(PlotBars, {
                                id: 'barPlotPenta',
                                margin: {top: 10, right: 30, bottom: 50, left: 30},
                                data: pentaData,
                                callbackBar: (bar) => {
                                    let target_state = bar.class === 'bar-some' || bar.class === 'bar';
                                    actionMap.forEach((penta, i) => {
                                        if (penta === bar.key) preferences['action_codes'][i] = target_state
                                    });
                                },
                                orient: 'vertical',
                                xLabel: 'Penta Class',
                                yLabel: 'Frequency'
                            })
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
                            m(PlotBars, {
                                id: 'barPlotPlover',
                                margin: {top: 10, right: 30, bottom: 50, left: 30},
                                data: ploverData,
                                callbackBar: (bar) => preferences['action_codes'][bar.key] = bar.class === 'bar',
                                orient: 'vertical',
                                xLabel: 'Plover Root ID',
                                yLabel: 'Frequency'
                            })
                        ]
                    ),
                    m(".SVGtooltip")
                ]
            )
        ));
    }
}