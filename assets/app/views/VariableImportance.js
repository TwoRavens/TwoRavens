import m from 'mithril';
import PlotVegaLite from "./PlotVegaLite";
import * as app from "../app";
import * as common from '../../common/common';

let axisLabels = false;

export default class VariableImportance {
    plotEFD(vnode) {
        // target doesn't matter, all are plotted together
        let {problem, data, predictor, target, summary} = vnode.attrs;

        // names of variables in melt
        let {yLabel, variableLabel} = vnode.attrs;
        let nominals = app.getNominalVariables(problem);

        // HEAT MAP
        if (nominals.includes(predictor) && nominals.includes(target)) return m(PlotVegaLite, {
            // data,
            specification: {
                "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
                "description": `Empirical First Differences for ${predictor}.`,
                'vconcat': [
                    {
                        'data': {'values': data},
                        "mark": "rect",
                        "encoding": {
                            "x": {
                                "field": predictor,
                                "type": "nominal",
                                axis: {labels: axisLabels},
                                title: false
                            },
                            "y": {"field": variableLabel, "type": "nominal"},
                            "color": {"field": yLabel, "type": "quantitative"},
                            "tooltip": [
                                {"field": yLabel, "type": "quantitative"},
                                {"field": variableLabel, "type": "nominal"},
                                {"field": predictor, "type": "nominal"}
                            ]
                        }
                    },
                    {
                        'mark': 'rect',
                        'data': {
                            'values': problem.levels[predictor]
                        },
                        'encoding': {
                            'x': {'field': 'level', 'type': 'nominal', 'title': predictor},
                            'opacity': {'field': 'count', 'type': 'quantitative', scale: {range: [0, 1]}, legend: false},
                            "tooltip": [
                                {"field": 'count', "type": "quantitative"}
                            ]
                        }
                    }
                ]
            }
        });

        // BAR CHART
        if (nominals.includes(predictor)) return m(PlotVegaLite, {
            // data,
            specification: {
                "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
                "description": `Empirical First Differences for ${predictor}.`,
                'layers': [
                    {
                        'data': {'values': data},
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
                ]
            }
        });

        let densities = getDensities(summary);

        if (nominals.includes(target)) return m(PlotVegaLite, {
            specification: {
                "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
                "description": `Empirical First Differences for ${predictor}.`,
                'vconcat': [
                    {
                        'data': {'values': data},
                        "mark": "line",
                        "encoding": {
                            "x": {
                                "field": predictor,
                                "type": "quantitative",
                                scale: {domain: [summary.min, summary.max]},
                                axis: {labels: axisLabels},
                                title: false
                            },
                            "y": {"field": yLabel, "type": "quantitative", title: 'Probability'},
                            "color": {"field": 'level', "type": "nominal", 'title': target},
                            'opacity': {"field": 'target', 'type': 'nominal'},
                            "tooltip": [
                                {"field": yLabel, "type": "quantitative"},
                                {"field": variableLabel, "type": "nominal"},
                                {"field": predictor, "type": "quantitative"}
                            ]
                        }
                    },
                    {
                        'mark': 'rect',
                        'data': {'values': densities},
                        'encoding': {
                            'x': {
                                'field': predictor,
                                'type': 'quantitative',
                                'scale': {domain: [summary.min, summary.max]},
                                'title': predictor
                            },
                            'x2': {'field': 'to', 'type': 'quantitative'},
                            'opacity': {'field': 'density', 'type': 'quantitative', scale: {range: [0, 1]}, legend: false},
                            "tooltip": [
                                {"field": 'density', "type": "quantitative"}
                            ]
                        }
                    }
                ]
            }
        });

        // LINE PLOT
        return m(PlotVegaLite, {
            specification: {
                "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
                "description": `Empirical First Differences for ${predictor}.`,
                // data: {values: melted},
                'vconcat': [
                    {
                        'data': {'values': data},
                        "mark": "line",
                        "encoding": {
                            "x": {
                                "field": predictor, "type": "quantitative",
                                scale: {domain: [summary.min, summary.max]},
                                axis: {labels: axisLabels},
                                title: false
                            },
                            "y": {"field": yLabel, "type": "quantitative", title: target},
                            'opacity': {"field": 'target', 'type': 'nominal'},
                            "tooltip": [
                                {"field": yLabel, "type": "quantitative"},
                                {"field": variableLabel, "type": "nominal"},
                                {"field": predictor, "type": "quantitative"}
                            ]
                        }
                    },
                    {
                        'mark': 'rect',
                        'data': {'values': densities},
                        'encoding': {
                            'x': {
                                'field': predictor,
                                'type': 'quantitative',
                                'scale': {domain: [summary.min, summary.max]},
                                'title': predictor
                            },
                            'x2': {'field': 'to', 'type': 'quantitative'},
                            'opacity': {'field': 'density', 'type': 'quantitative', scale: {range: [0, 1]}, legend: false},
                            "tooltip": [
                                {"field": 'density', "type": "quantitative"}
                            ]
                        }
                    }
                ]
            }
        })
    }

    plotPartials(vnode) {
        // target doesn't matter, all are plotted together
        let {problem, data, predictor, target, summary} = vnode.attrs;

        // names of variables in melt
        let {yLabel, variableLabel} = vnode.attrs;

        let nominals = app.getNominalVariables(problem);

        data = data.filter(point => point[variableLabel] === target);

        // if both predictor and target are nominal, or if just predictor is nominal
        if (nominals.includes(predictor)) return m(PlotVegaLite, {
            specification: {
                "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
                "description": `Partials for ${predictor}.`,
                'vconcat': [
                    {
                        data: {values: data},
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
                    },
                    {
                        'mark': 'rect',
                        'data': {
                            'values': problem.levels[predictor]
                        },
                        'encoding': {
                            'x': {'field': 'level', 'type': 'nominal', 'title': predictor},
                            'opacity': {'field': 'count', 'type': 'quantitative', scale: {range: [0, 1]}, legend: false},
                            "tooltip": [
                                {"field": 'count', "type": "quantitative"}
                            ]
                        }
                    }
                ]
            }
        });

        let densities = getDensities(summary);
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
                    'vconcat': [
                        {
                            data: {values: data},
                            "mark": {
                                type: 'line',
                                point: true
                            },
                            "encoding": {
                                "x": {
                                    // make sure rug plot matches with this plot's x axis
                                    "field": predictor,
                                    "type": 'quantitative',
                                    scale: {domain: [summary.min, summary.max]},
                                    axis: {labels: axisLabels},
                                    title: false
                                },
                                "y": {"field": yLabel, "type": "nominal"},
                                "detail": {"field": "horizontalGroup", "type": "nominal"},
                                "tooltip": [
                                    {"field": yLabel, "type": "nominal"},
                                    {"field": variableLabel, "type": "nominal"},
                                    {"field": predictor, "type": "quantitative"}
                                ]
                            }
                        },
                        {
                            'mark': 'rect',
                            'data': {'values': densities},
                            'encoding': {
                                'x': {
                                    'field': predictor,
                                    'type': 'quantitative',
                                    'scale': {domain: [summary.min, summary.max]},
                                    'title': predictor
                                },
                                'x2': {'field': 'to', 'type': 'quantitative'},
                                'opacity': {'field': 'density', 'type': 'quantitative', scale: {range: [0, 1]}, legend: false},
                                "tooltip": [
                                    {"field": 'density', "type": "quantitative"}
                                ]
                            }
                        }
                    ]
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
                'layer': [
                    {
                        data: {values: data},
                        "mark": "line",
                        "encoding": {
                            "x": {
                                "field": predictor,
                                "type": "quantitative",
                                scale: {domain: [summary.min, summary.max]},
                                axis: {labels: axisLabels},
                                title: false
                            },
                            "y": {"field": yLabel, "type": "quantitative"},
                            "color": {"field": variableLabel, "type": "nominal"},
                            "tooltip": [
                                {"field": yLabel, "type": "quantitative"},
                                {"field": variableLabel, "type": "nominal"},
                                {"field": predictor, "type": "quantitative"}
                            ]
                        }
                    },
                    {
                        'mark': 'rect',
                        'data': {'values': densities},
                        'encoding': {
                            'x': {
                                'field': predictor,
                                'type': 'quantitative',
                                'scale': {domain: [summary.min, summary.max]},
                                'title': predictor
                            },
                            'x2': {'field': 'to', 'type': 'quantitative'},
                            'opacity': {'field': 'density', 'type': 'quantitative', scale: {range: [0, 1]}, legend: false},
                            "tooltip": [
                                {"field": 'density', "type": "quantitative"}
                            ]
                        }
                    }
                ]
            }
        });
    }

    plotICE(vnode) {
        // target doesn't matter, all are plotted together
        let {problem, data, predictor, target, summary} = vnode.attrs;
        let nominals = app.getNominalVariables(problem);

        if (nominals.includes(predictor)) return 'PDP/ICE plots are not meaningful when both the predictor and target is categorical.';

        let densities = getDensities(summary);
        if (nominals.includes(target)) {

            let d3mIndexOriginal;
            let left;

            return m(PlotVegaLite, {
                specification: {
                    "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
                    "description": `Independent conditional expectations for ${predictor}.`,
                    'vconcat': [
                        {
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
                                "x": {
                                    "field": predictor, "type": 'quantitative',
                                    scale: {domain: [summary.min, summary.max]},
                                    axis: {labels: axisLabels},
                                    title: false
                                },
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
                        },
                        {
                            'mark': 'rect',
                            'data': {'values': densities},
                            'encoding': {
                                'x': {
                                    'field': predictor,
                                    'type': 'quantitative',
                                    'scale': {domain: [summary.min, summary.max]},
                                    'title': predictor
                                },
                                'x2': {'field': 'to', 'type': 'quantitative'},
                                'opacity': {'field': 'density', 'type': 'quantitative', scale: {range: [0, 1]}, legend: false},
                                "tooltip": [
                                    {"field": 'density', "type": "quantitative"}
                                ]
                            }
                        }
                    ]
                }
            })
        }

        // continuous predictor and target
        return m(PlotVegaLite, {
            specification: {
                "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
                "description": `Independent conditional expectations for ${predictor}.`,
                'vconcat': [
                    {
                        'data': {'values': data},
                        "layer": [
                            {
                                "mark": {
                                    'type': "line",
                                    'color': 'gray'
                                },
                                "encoding": {
                                    "x": {
                                        "field": predictor,
                                        "type": 'quantitative',
                                        'scale': {domain: [summary.min, summary.max]},
                                    },
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
                    },
                    {
                        'mark': 'rect',
                        'data': {'values': densities},
                        'encoding': {
                            'x': {
                                'field': predictor,
                                'type': 'quantitative',
                                'scale': {domain: [summary.min, summary.max]},
                                'title': predictor
                            },
                            'x2': {'field': 'to', 'type': 'quantitative'},
                            'opacity': {'field': 'density', 'type': 'quantitative', scale: {range: [0, 1]}, legend: false},
                            "tooltip": [
                                {"field": 'density', "type": "quantitative"}
                            ]
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


let getDensities = summary => {

    let pdfPlotX = [...summary.pdfPlotX];
    let pdfPlotY = [...summary.pdfPlotY];
    let len = summary.pdfPlotX.length;

    // drop observations (*) more than one point outside of min/max bounds (|)
    // x      x        x         x      x      x         x
    // *          |                  |         *         *
    let minIndex = pdfPlotX.findIndex(v => v >= summary.min);
    if (minIndex > 0) {
        pdfPlotX.splice(0, minIndex - 1);
        pdfPlotY.splice(0, minIndex - 1);
    }
    let maxIndex = pdfPlotX.findIndex(v => v >= summary.max);
    if (maxIndex !== undefined) {
        let nRemove = maxIndex - len;
        if (nRemove > 0) {
            pdfPlotX.splice(-nRemove, nRemove);
            pdfPlotY.splice(-nRemove, nRemove);
        }
    }

    //     l   c          r
    let proportion = (l, r, c) => (c - l) / (r - l);

    // if exists, move the observation outside the bound on the left and right to the bounds (linearly interpolated)
    //     x  x        x         x      x      x    x
    //     |                                        |
    if (pdfPlotX[0] < summary.min) {
        let weight = proportion(summary.pdfPlotX[0], summary.pdfPlotX[1], summary.min);
        pdfPlotX[0] = summary.min;
        pdfPlotY[0] = pdfPlotY[0] * weight + pdfPlotY[1] * (1 - weight);
    }
    if (pdfPlotX[len - 1] > summary.max) {
        let weight = proportion(summary.pdfPlotX[len - 2], summary.pdfPlotX[len - 1], summary.max);
        pdfPlotX[len - 1] = summary.max;
        pdfPlotY[len - 1] = pdfPlotY[len - 2] * weight + pdfPlotY[len - 1] * (1 - weight);

    }

    // compute edges of bins between kernel density samples
    // x      x        x         x      x      x         x
    // |  |       |        |        |      |       |     |
    let left = pdfPlotX[0];
    let densities = [];
    pdfPlotY.forEach((_, i) => {
        let right = i === pdfPlotX.length
            ? pdfPlotX[i]
            : (pdfPlotX[i] + pdfPlotX[i + 1]) / 2;

        if (left > summary.min && right < summary.max) densities.push({
            [summary.name]: left, 'to': right, 'density': pdfPlotY[i - 1]
        });
        left = right;
    });

    return densities;
}