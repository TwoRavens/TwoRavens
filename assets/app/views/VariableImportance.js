import m from 'mithril';
import PlotVegaLite from "./PlotVegaLite";
import * as app from "../app";
import * as common from '../../common/common';

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
                // data: {values: melted},
                "mark": "line",
                "encoding": {
                    "x": {"field": predictor, "type": "quantitative"},
                    "y": {"field": yLabel, "type": "quantitative"},
                    // "color": {"field": variableLabel, "type": "nominal"},
                    'opacity': {"field": 'target', 'type': 'nominal'},
                    'color': {"field": 'level', 'type': 'nominal'},
                    "tooltip": [
                        {"field": yLabel, "type": "quantitative"},
                        {"field": variableLabel, "type": "nominal"},
                        {"field": predictor, "type": "quantitative"}
                    ]
                }
            }
        })
    }

    plotPartials(vnode) {
        // target doesn't matter, all are plotted together
        let {problem, data, predictor, target} = vnode.attrs;

        // names of variables in melt
        let {yLabel, variableLabel} = vnode.attrs;

        let nominals = app.getNominalVariables(problem);

        // SCATTER PLOT
        if (nominals.includes(predictor) || nominals.includes(target)) return m(PlotVegaLite, {
            // data,
            specification: {
                "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
                "description": `Partials for ${predictor}.`,
                data: {values: data},
                "mark": "line",
                "encoding": {
                    "x": {"field": predictor, "type": nominals.includes(predictor) ? "nominal" : 'quantitative'},
                    "y": {"field": yLabel, "type": nominals.includes(target) ? "nominal" : "quantitative"},
                    "color": {"field": variableLabel, "type": "nominal"},
                    "tooltip": [
                        {"field": yLabel, "type": nominals.includes(target) ? "nominal" : "quantitative"},
                        {"field": variableLabel, "type": "nominal"},
                        {"field": predictor, "type": nominals.includes(predictor) ? "nominal" : "quantitative"}
                    ]
                }
            }
        });

        // LINE CHART
        return m(PlotVegaLite, {
            // data,
            specification: {
                "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
                "description": `Partials for ${predictor}.`,
                data: {values: data},
                "mark": "line",
                "encoding": {
                    "x": {"field": predictor, "type": "quantitative"},
                    "y": {"field": yLabel, "type": "quantitative"},
                    "color": {"field": variableLabel, "type": "nominal"},
                    "tooltip": [
                        {"field": yLabel, "type": "quantitative"},
                        {"field": variableLabel, "type": "nominal"},
                        {"field": predictor, "type": "quantitative"}
                    ]
                }
            }
        });
    }

    plotICE(vnode) {
        // target doesn't matter, all are plotted together
        let {problem, data, predictor, target} = vnode.attrs;
        let nominals = app.getNominalVariables(problem);

        // TODO: how should the combinations of categorical predictor/targets work?
        // LINE PLOT
        return m(PlotVegaLite, {
            data,
            identifier: predictor,
            specification: {
                "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
                "description": `Independent conditional expectations for ${predictor}.`,
                // data: {values: melted},
                "layer": [
                    {
                        "mark": "line",
                        "encoding": {
                            "x": {"field": predictor, "type": nominals.includes(predictor) ? "nominal" : 'quantitative'},
                            "y": {"field": target, "type": nominals.includes(target) ? "nominal" : 'quantitative', title: target},
                            'color': {
                                "field": 'd3mIndexOriginal',
                                'type': 'nominal',
                                "scale": {"range": ["gray"]},
                                'legend': false
                            }
                        }
                    },
                    {
                        "mark": "line",
                        "encoding": {
                            "x": {"field": predictor, "type": nominals.includes(predictor) ? "nominal" : 'quantitative'},
                            "y": {"aggregate": 'mean', "field": target, "type": nominals.includes(target) ? "nominal" : 'quantitative'},
                            "color": {"value": common.selVarColor},
                            "size": {"value": 5}
                        }
                    }
                ]
            }
        })
    }

    view(vnode) {
        let {mode} = vnode.attrs;

        let importanceTypes = {EFD: this.plotEFD, Partials: this.plotPartials, ICE: this.plotICE};
        return mode in importanceTypes && importanceTypes[mode](vnode)
    }
}
