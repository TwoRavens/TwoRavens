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
        if (nominals.includes(predictor) && nominals.includes(target)) {
            // vega-lite emits an invalid canvas gradient when all colors are equal. Fixed in newer version
            if (data.every(point => point[yLabel] === data[0][yLabel])) return 'All probabilities are equal.';
            return m(PlotVegaLite, {
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
                                    "field": "predictor",
                                    "type": "nominal",
                                    axis: {labels: axisLabels},
                                    title: false
                                },
                                "y": {"field": variableLabel, "type": "nominal"},
                                "color": {"field": yLabel, "type": "quantitative", title: 'Probability'},
                                "tooltip": [
                                    {"field": yLabel, "type": "quantitative", title: 'Probability'},
                                    {"field": variableLabel, "type": "nominal"},
                                    {"field": "predictor", "type": "nominal"}
                                ]
                            }
                        },
                        predictor in problem.levels ? {
                            'mark': 'rect',
                            'data': {
                                'values': problem.levels[predictor]
                            },
                            'encoding': {
                                'x': {'field': 'level', 'type': 'nominal', 'title': predictor},
                                'opacity': {
                                    'field': 'count',
                                    'type': 'quantitative',
                                    'scale': {
                                        domain: [0, Math.max(0, ...problem.levels[predictor].map(point => point.count))],
                                        range: [0, 1]
                                    },
                                    'legend': false
                                },
                                "tooltip": [
                                    {"field": 'count', "type": "quantitative"}
                                ]
                            }
                        } : {}
                    ]
                }
            });
        }

        // BAR CHART
        if (nominals.includes(predictor)) return m(PlotVegaLite, {
            // data,
            specification: {
                "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
                "description": `Empirical First Differences for ${predictor}.`,
                'vconcat': [
                    {
                        'data': {'values': data},
                        "mark": "bar",
                        "encoding": {
                            "x": {
                                "field": variableLabel,
                                "type": "nominal", title: ''
                            },
                            "y": {"field": yLabel, "type": "quantitative"},
                            "column": {"field": "predictor", "type": "ordinal"},
                            "color": {"field": variableLabel, "type": "nominal"},
                            "tooltip": [
                                {"field": yLabel, "type": "quantitative"},
                                {"field": variableLabel, "type": "nominal"},
                                {"field": "predictor", "type": "nominal"}
                            ]
                        }
                    }
                ]
            }
        });

        let predictorSupport = data.map(point => point["predictor"]);
        let predictorMin = Math.min(...predictorSupport);
        let predictorMax = Math.max(...predictorSupport);

        let densities = getDensities(summary, predictorMin, predictorMax);

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
                                "field": "predictor",
                                "type": "quantitative",
                                scale: {domain: [predictorMin, predictorMax]},
                                axis: {labels: densities === undefined ? true : axisLabels},
                                title: densities === undefined ? predictor : false
                            },
                            "y": {"field": yLabel, "type": "quantitative", title: 'Probability'},
                            "color": {"field": 'level', "type": "nominal", 'title': target},
                            'opacity': {"field": 'target', 'type': 'nominal'},
                            "tooltip": [
                                {"field": yLabel, "type": "quantitative", title: 'Probability'},
                                {"field": variableLabel, "type": "nominal"},
                                {"field": "predictor", "type": "quantitative"}
                            ]
                        }
                    }
                ].concat(densities ? [
                    {
                        'mark': 'rect',
                        'data': {'values': densities},
                        'encoding': {
                            'x': {
                                'field': predictor,
                                'type': 'quantitative',
                                'scale': {domain: [predictorMin, predictorMax]},
                                'title': predictor
                            },
                            'x2': {'field': 'to', 'type': 'quantitative'},
                            'opacity': {'field': 'density', 'type': 'quantitative', scale: {range: [0, 1]}, legend: false},
                            "tooltip": [
                                {"field": 'density', "type": "quantitative"}
                            ]
                        }
                    }
                ] : [])
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
                                "field": "predictor", "type": "quantitative",
                                scale: {domain: [predictorMin, predictorMax]},
                                axis: {labels: densities === undefined ? true : axisLabels},
                                title: densities === undefined ? predictor : false
                            },
                            "y": {"field": yLabel, "type": "quantitative", title: target},
                            'opacity': {"field": 'target', 'type': 'nominal'},
                            "tooltip": [
                                {"field": yLabel, "type": "quantitative", title: target},
                                {"field": variableLabel, "type": "nominal"},
                                {"field": "predictor", "type": "quantitative"}
                            ]
                        }
                    }
                ].concat(densities ? [
                    {
                        'mark': 'rect',
                        'data': {'values': densities},
                        'encoding': {
                            'x': {
                                'field': predictor,
                                'type': 'quantitative',
                                'scale': {domain: [predictorMin, predictorMax]},
                                'title': predictor
                            },
                            'x2': {'field': 'to', 'type': 'quantitative'},
                            'opacity': {'field': 'density', 'type': 'quantitative', scale: {range: [0, 1]}, legend: false},
                            "tooltip": [
                                {"field": 'density', "type": "quantitative"}
                            ]
                        }
                    }
                ] : [])
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
                            "x": {
                                 "field": predictor, "type": "nominal",
                                axis: {labels: axisLabels},
                                title: false
                            },
                            "y": {"field": yLabel, "type": "nominal"},
                            "color": {"field": variableLabel, "type": "nominal"},
                            "tooltip": [
                                {"field": yLabel, "type": "nominal"},
                                {"field": variableLabel, "type": "nominal"},
                                {"field": predictor, "type": "nominal"}
                            ]
                        }
                    },
                    predictor in problem.levels ? {
                        'mark': 'rect',
                        'data': {
                            'values': problem.levels[predictor]
                        },
                        'encoding': {
                            'x': {'field': 'level', 'type': 'nominal', 'title': predictor},
                            'opacity': {
                                'field': 'count',
                                'type': 'quantitative',
                                'scale': {
                                    domain: [0, Math.max(...problem.levels[predictor].map(point => point.count))],
                                    range: [0, 1]
                                },
                                'legend': false
                            },
                            "tooltip": [
                                {"field": 'count', "type": "quantitative"}
                            ]
                        }
                    } : {}
                ]
            }
        });

        let predictorSupport = data.map(point => point[predictor]);
        let predictorMin = Math.min(...predictorSupport);
        let predictorMax = Math.max(...predictorSupport);

        let densities = getDensities(summary, predictorMin, predictorMax);
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
                                    scale: {domain: [predictorMin, predictorMax]},
                                    axis: {labels: densities === undefined ? true : axisLabels},
                                    title: densities === undefined ? predictor : false
                                },
                                "y": {"field": yLabel, "type": "nominal", title: target, scale: {zero: false}},
                                "detail": {"field": "horizontalGroup", "type": "nominal"},
                                "tooltip": [
                                    {"field": yLabel, "type": "nominal"},
                                    {"field": variableLabel, "type": "nominal"},
                                    {"field": predictor, "type": "quantitative"}
                                ]
                            }
                        }
                    ].concat(densities ? [
                        {
                            'mark': 'rect',
                            'data': {'values': densities},
                            'encoding': {
                                'x': {
                                    'field': predictor,
                                    'type': 'quantitative',
                                    'scale': {domain: [predictorMin, predictorMax]},
                                    'title': predictor
                                },
                                'x2': {'field': 'to', 'type': 'quantitative'},
                                'opacity': {'field': 'density', 'type': 'quantitative', scale: {range: [0, 1]}, legend: false},
                                "tooltip": [
                                    {"field": 'density', "type": "quantitative"}
                                ]
                            }
                        }
                    ] : [])
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
                'vconcat': [
                    {
                        data: {values: data},
                        "mark": "line",
                        "encoding": {
                            "x": {
                                "field": predictor,
                                "type": "quantitative",
                                scale: {domain: [predictorMin, predictorMax]},
                                axis: {labels: densities === undefined ? true : axisLabels},
                                title: densities === undefined ? predictor : false
                            },
                            "y": {"field": yLabel, "type": "quantitative", title: target, scale: {zero: false}},
                            "color": {"field": variableLabel, "type": "nominal"},
                            "tooltip": [
                                {"field": yLabel, "type": "quantitative"},
                                {"field": variableLabel, "type": "nominal"},
                                {"field": predictor, "type": "quantitative"}
                            ]
                        }
                    }
                ].concat(densities ? [
                    {
                        'mark': 'rect',
                        'data': {'values': densities},
                        'encoding': {
                            'x': {
                                'field': predictor,
                                'type': 'quantitative',
                                'scale': {domain: [predictorMin, predictorMax]},
                                'title': predictor
                            },
                            'x2': {'field': 'to', 'type': 'quantitative'},
                            'opacity': {'field': 'density', 'type': 'quantitative', scale: {range: [0, 1]}, legend: false},
                            "tooltip": [
                                {"field": 'density', "type": "quantitative"}
                            ]
                        }
                    }
                ] : [])
            }
        });
    }

    plotICE(vnode) {
        // target doesn't matter, all are plotted together
        let {problem, data, predictor, target, summary} = vnode.attrs;
        let nominals = app.getNominalVariables(problem);

        if (nominals.includes(predictor)) return 'PDP/ICE plots are not meaningful when both the predictor and target is categorical.';

        let predictorSupport = data.map(point => point[predictor]);
        let predictorMin = Math.min(...predictorSupport);
        let predictorMax = Math.max(...predictorSupport);

        let densities = getDensities(summary, predictorMin, predictorMax);
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
                                    scale: {domain: [predictorMin, predictorMax]},
                                    axis: {labels: densities === undefined ? true : axisLabels},
                                    title: densities === undefined ? predictor : false
                                },
                                "y": {"field": target, "type": "nominal", title: target, scale: {zero: false}},
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
                    ].concat(densities ? [
                        {
                            'mark': 'rect',
                            'data': {'values': densities},
                            'encoding': {
                                'x': {
                                    'field': predictor,
                                    'type': 'quantitative',
                                    'scale': {domain: [predictorMin, predictorMax]},
                                    'title': predictor
                                },
                                'x2': {'field': 'to', 'type': 'quantitative'},
                                'opacity': {'field': 'density', 'type': 'quantitative', scale: {range: [0, 1]}, legend: false},
                                "tooltip": [
                                    {"field": 'density', "type": "quantitative"}
                                ]
                            }
                        }
                    ] : [])
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
                                        'scale': {domain: [predictorMin, predictorMax]},
                                        axis: {labels: densities === undefined ? true : axisLabels},
                                        title: densities === undefined ? predictor : false
                                    },
                                    "y": {"field": target, "type": 'quantitative', title: target, scale: {zero: false}},
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
                ].concat(densities ? [
                    {
                        'mark': 'rect',
                        'data': {'values': densities},
                        'encoding': {
                            'x': {
                                'field': predictor,
                                'type': 'quantitative',
                                'scale': {domain: [predictorMin, predictorMax]},
                                'title': predictor
                            },
                            'x2': {'field': 'to', 'type': 'quantitative'},
                            'opacity': {'field': 'density', 'type': 'quantitative', scale: {range: [0, 1]}, legend: false},
                            "tooltip": [
                                {"field": 'density', "type": "quantitative"}
                            ]
                        }
                    }
                ] : [])
            }
        })
    }

    view(vnode) {
        let {mode} = vnode.attrs;

        let importanceTypes = {EFD: this.plotEFD, Partials: this.plotPartials, ICE: this.plotICE};
        return mode in importanceTypes && m('div', {
            // HACK: vconcat width is unsupported in vega-lite- the legends are not included in the fit calculation
            //       the maximum legend size is 223px
            style: {width: 'calc(100% - 223px)'}
        }, importanceTypes[mode](vnode))
    }
}


let getDensities = (summary, min, max) => {

    if (summary.pdfPlotType) {
        let pdfPlotX = [...summary.pdfPlotX];
        let pdfPlotY = [...summary.pdfPlotY];
        let len = summary.pdfPlotX.length;

        // drop observations (*) more than one point outside of min/max bounds (|)
        // x      x        x         x      x      x         x
        // *          |                  |         *         *
        let minIndex = pdfPlotX.findIndex(v => v >= min);
        if (minIndex > 0) {
            pdfPlotX.splice(0, minIndex - 1);
            pdfPlotY.splice(0, minIndex - 1);
        }
        let maxIndex = pdfPlotX.findIndex(v => v >= max);
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
        if (pdfPlotX[0] < min) {
            let weight = proportion(summary.pdfPlotX[0], summary.pdfPlotX[1], min);
            pdfPlotX[0] = min;
            pdfPlotY[0] = pdfPlotY[0] * weight + pdfPlotY[1] * (1 - weight);
        }
        if (pdfPlotX[len - 1] > max) {
            let weight = proportion(summary.pdfPlotX[len - 2], summary.pdfPlotX[len - 1], max);
            pdfPlotX[len - 1] = max;
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

            if (left > min && right < max) densities.push({
                [summary.name]: left, 'to': right, 'density': pdfPlotY[i - 1]
            });
            left = right;
        });

        return densities;
    }
};
