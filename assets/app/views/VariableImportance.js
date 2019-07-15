import m from 'mithril';
import PlotVegaLite from "./PlotVegaLite";
import * as app from "../app";

export default class VariableImportance {
    plotEFD(vnode) {
        // target doesn't matter, all are plotted together
        let {problem, data, predictor, target} = vnode.attrs;

        // names of variables in melt
        let {yLabel, variableLabel} = vnode.attrs;

        let nominals = app.getNominalVariables(problem);

        // HEAT MAP
        if (nominals.includes(predictor) && nominals.includes(target)) return m(PlotVegaLite, {
            // data,
            specification: {
                "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
                "description": `Empirical First Differences for ${predictor}.`,
                data: {values: data},
                "mark": "rect",
                "encoding": {
                    "x": {"field": predictor, "type": "nominal"},
                    "y": {"field": variableLabel, "type": "nominal"},
                    "color": {"field": yLabel, "type": "quantitative"},
                    "tooltip": [
                        {"field": yLabel, "type": "quantitative"},
                        {"field": variableLabel, "type": "nominal"},
                        {"field": predictor, "type": "nominal"}
                    ]
                }
            }
        });

        // BAR CHART
        if (nominals.includes(predictor)) return m(PlotVegaLite, {
            // data,
            specification: {
                "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
                "description": `Empirical First Differences for ${predictor}.`,
                data: {values: data},
                "mark": "bar",
                "encoding": {
                    "x": {"field": variableLabel, "type": "nominal", title: ''},
                    "y": {"field": yLabel, "type": "quantitative"},
                    "column": {"field": predictor, "type": "ordinal"},
                    "color": {"field": variableLabel, "type": "nominal"},
                    "tooltip": [
                        {"field": yLabel, "type": "quantitative"},
                        {"field": variableLabel, "type": "nominal"},
                        {"field": predictor, "type": "nominal"}
                    ]
                }
            }
        });

        // LINE PLOT
        return m(PlotVegaLite, {
            data,
            identifier: predictor,
            specification: {
                "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
                "description": `Empirical First Differences for ${predictor}.`,
                "config": {"point": {"opacity": 0.0}},
                "encoding": {
                    "x": {"field": predictor, "type": "quantitative"}
                },
                "layer": [
                    {
                        "mark": {type: "line", update: {strokeDash: [8, 8]}},
                        "selection": {
                            "grid": {
                                "type": "interval", "bind": "scales"
                            }
                        },
                        "strokeDash": [8, 8],
                        encode: {
                            update: {strokeDash: [8, 8]},
                        },
                        "encoding": {
                            // "x": {"field": predictor, "type": "quantitative"},
                            "y": {"field": yLabel, "type": "quantitative"},
                            "color": {"field": variableLabel, "type": "nominal"},
                            "size": {
                                "condition": {
                                    "selection": {"not": "highlight"}, "value": 1
                                },
                                "value": 3
                            },
                            "tooltip": [
                                {"field": yLabel, "type": "quantitative"},
                                {"field": variableLabel, "type": "nominal"},
                                // {"field": predictor, "type": "quantitative"}
                            ]
                        }
                    },
                    {
                        "mark": "point",
                        "selection": {
                            "highlight": {
                                "type": "single",
                                "on": "mouseover",
                                "nearest": "true", "fields": [variableLabel]
                            }
                        },
                        "encoding": {
                            // "x": {"field": predictor, "type": "quantitative"},
                            "y": {"field": yLabel, "type": "quantitative"},
                            "color": {"field": variableLabel, "type": "nominal"},
                            // "tooltip": [
                            //     {"field": yLabel, "type": "quantitative"},
                            //     {"field": variableLabel, "type": "nominal"},
                            //     {"field": predictor, "type": "quantitative"}
                            // ]
                        }
                    }
                ],
                "resolve": {
                    "scale": {"x": "scales", y: "scales"}
                }

            }
        })
    }

    plotPDP(vnode) {

    }

    view(vnode) {
        let {mode} = vnode.attrs;

        let importanceTypes = {EFD: this.plotEFD, PDP: this.plotPDP};
        return mode in importanceTypes && importanceTypes[mode](vnode)
    }
}