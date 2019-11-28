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

        if (nominals.includes(target)) return m(PlotVegaLite, {
            data,
            identifier: predictor,
            specification: {
                "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
                "description": `Empirical First Differences for ${predictor}.`,
                // data: {values: melted},
                "mark": "line",
                "encoding": {
                    "x": {"field": predictor, "type": "quantitative"},
                    "y": {"field": yLabel, "type": "quantitative", title: 'Probability'},
                    "color": {"field": 'level', "type": "nominal"},
                    'opacity': {"field": 'target', 'type': 'nominal'},
                    "tooltip": [
                        {"field": yLabel, "type": "quantitative"},
                        {"field": variableLabel, "type": "nominal"},
                        {"field": predictor, "type": "quantitative"}
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
                    "y": {"field": yLabel, "type": "quantitative", title: 'Target'},
                    'opacity': {"field": 'target', 'type': 'nominal'},
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

        // if both predictor and target are nominal, or if just predictor is nominal
        if (nominals.includes(predictor)) return m(PlotVegaLite, {
            specification: {
                "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
                "description": `Partials for ${predictor}.`,
                data: {values: data.filter(point => point[variableLabel] === target)},
                "mark": 'point',
                "encoding": {
                    "x": {"field": predictor, "type": "nominal"},
                    "y": {"field": yLabel, "type": "nominal"},
                    "color": {"field": variableLabel, "type": "nominal"},
                    "tooltip": [
                        {"field": yLabel, "type": "nominal"},
                        {"field": variableLabel, "type": "nominal"},
                        {"field": predictor, "type": "nominal"}
                    ]
                }
            }
        });

        // if target nominal and predictor is continuous
        if (nominals.includes(target)) {
            // connect continuous horizontal segments
            let horizontalGroup = 0;
            let horizontalValue = data[0][yLabel];
            data.forEach(point => {
                if (point[yLabel] !== horizontalValue) {
                    horizontalValue = point[yLabel];
                    horizontalGroup++;
                }
                point.horizontalGroup = horizontalGroup;
            });
            return m(PlotVegaLite, {
                specification: {
                    "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
                    "description": `Partials for ${predictor}.`,
                    data: {values: data.filter(point => point[variableLabel] === target)},
                    "mark": {
                        type: 'line',
                        point: true
                    },
                    "encoding": {
                        "x": {"field": predictor, "type": 'quantitative'},
                        "y": {"field": yLabel, "type": "nominal"},
                        "detail": {"field": "horizontalGroup", "type": "nominal"},
                        "tooltip": [
                            {"field": yLabel, "type": "nominal"},
                            {"field": variableLabel, "type": "nominal"},
                            {"field": predictor, "type": "quantitative"}
                        ]
                    }
                }
            });
        }

        // if both are continuous
        // LINE CHART
        return m(PlotVegaLite, {
            // data,
            specification: {
                "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
                "description": `Partials for ${predictor}.`,
                data: {values: data.filter(point => point[variableLabel] === target)},
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

        if (nominals.includes(predictor)) return 'PDP/ICE plots are not meaningful when both the predictor and target is categorical.';

        if (nominals.includes(target)) {

            let d3mIndexOriginal;
            let left;

            return m(PlotVegaLite, {
                specification: {
                    "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
                    "description": `Independent conditional expectations for ${predictor}.`,
                    'data': {
                        'values': Object.values(data.reduce((edges, point) => {
                            let right = {[target]: point[target], [predictor]: point[predictor]};
                            if (d3mIndexOriginal === point.d3mIndexOriginal) {
                                let key = JSON.stringify([left, right]);
                                edges[key] = edges[key] || {left, right, count: 0};
                                edges[key].count++;
                            } else d3mIndexOriginal = point.d3mIndexOriginal;
                            left = right;
                            return edges;
                        }, {})).flatMap((edge, i) => [
                            {
                                [predictor]: edge.left[predictor],
                                [target]: edge.left[target],
                                edgeId: i,
                                count: edge.count
                            },
                            {
                                [predictor]: edge.right[predictor],
                                [target]: edge.right[target],
                                edgeId: i,
                                count: edge.count
                            }
                        ])
                    },
                    "mark": {
                        'type': "trail",
                        'color': 'gray'
                    },
                    "encoding": {
                        "x": {"field": predictor, "type": 'quantitative'},
                        "y": {"field": target, "type": "nominal", 'title': target},
                        "size": {"field": 'count', "type": 'quantitative', "scale": {"type": "log", 'range': [2, 10]}},
                        "detail": {
                            "field": "edgeId",
                            "type": "nominal",
                            'legend': false
                        },
                        'tooltip': [
                            {'field': predictor, 'type': 'quantitative'},
                            {'field': target, 'type': 'nominal'},
                            {'field': 'count', 'type': 'quantitative'}
                        ]
                    }
                }
            })
        }

        // continuous predictor and target
        return m(PlotVegaLite, {
            identifier: predictor,
            specification: {
                "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
                "description": `Independent conditional expectations for ${predictor}.`,
                "layer": [
                    {
                        "mark": {
                            'type': "line",
                            'color': 'gray'
                        },
                        "encoding": {
                            "x": {"field": predictor, "type": 'quantitative'},
                            "y": {"field": target, "type": 'quantitative', 'title': target},
                            'detail': {"field": 'd3mIndexOriginal', 'type': 'nominal', 'legend': false}
                        }
                    },
                    {
                        "mark": {
                            'type': "line",
                            'color': common.selVarColor,
                            'size': 5
                        },
                        "encoding": {
                            "x": {
                                "field": predictor,
                                "type": 'quantitative'
                            },
                            "y": {
                                "aggregate": 'mean',
                                "field": target,
                                "type": 'quantitative'
                            },
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
