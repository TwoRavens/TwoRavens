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

        if (nominals.includes(predictor) && nominals.includes(target)) return m(PlotVegaLite, {
            // data: melted,
            specification: {
                "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
                "description": `Empirical First Differences for ${predictor}.`,
                data: {values: data},
                "mark": "rect",
                "encoding": {
                    "x": {"field": predictor, "type": "nominal"},
                    "y": {"field": variableLabel, "type": "nominal"},
                    "color": {"field": yLabel, "type": "quantitative"}
                }
            }
        });

        if (nominals.includes(predictor)) return m(PlotVegaLite, {
            // data: melted,
            specification: {
                "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
                "description": `Empirical First Differences for ${predictor}.`,
                data: {values: data},
                "mark": "bar",
                "encoding": {
                    "x": {"field": variableLabel, "type": "nominal", title: ''},
                    "y": {"field": yLabel, "type": "quantitative"},
                    "column": {"field": predictor, "type": "ordinal"},
                    "color": {"field": variableLabel, "type": "nominal"}
                }
            }
        });

        return m(PlotVegaLite, {
            data,
            specification: {
                "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
                "description": `Empirical First Differences for ${predictor}.`,
                // data: {values: melted},
                "mark": "line",
                "encoding": {
                    "x": {"field": predictor, "type": "quantitative"},
                    "y": {"field": yLabel, "type": "quantitative"},
                    "color": {"field": variableLabel, "type": "nominal"}
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