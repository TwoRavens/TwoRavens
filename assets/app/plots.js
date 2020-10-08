// handles plotting multiple groups at the same time
export let vegaLiteScatter = (data, xName, yName, groupName, countName, title = '', groupCount = 1) => {

    return ({
        "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
        "description": "A scatterplot.",
        "title": title,
        "autosize": {
            "type": "fit",
            "contains": "padding"
        },
        "encoding": {
            "x": {"field": xName, "type": "quantitative", "axis": {"title": xName}, "scale": {"zero": false}},
            "y": {"field": yName, "type": "quantitative", "axis": {"title": yName}, "scale": {"zero": false}}
        },
        "layer": [
            {
                "mark": "line",
                "data": {
                    'values': [
                        {
                            [xName]: Math.min(...data.map(point => point[xName]).filter(v => !isNaN(v))),
                            [yName]: Math.min(...data.map(point => point[yName]).filter(v => !isNaN(v)))
                        },
                        {
                            [xName]: Math.max(...data.map(point => point[xName]).filter(v => !isNaN(v))),
                            [yName]: Math.max(...data.map(point => point[yName]).filter(v => !isNaN(v)))
                        }
                    ],
                },
                "encoding": {
                    "color": {"value": "black"},
                    "opacity": {"value": 0.5}
                }
            },
            {
                "selection": {
                    // "grid": {
                    //     "type": "interval", "bind": "scales"
                    // },
                    "Solution Name": {
                        "type": "multi", "fields": [groupName], "bind": "legend"
                    },
                    "panner": {"type": "interval"}
                },
                "data": {
                    "values": data
                },

                "mark": "circle",
                "encoding": {
                    "color": {
                        "condition": {
                            "selection": "panner",
                            "field": groupName,
                            "type": "nominal",
                            "legend": {"symbolOpacity": 1}
                        },
                        "value": "gray"
                    },
                    "tooltip": [
                        {"field": groupName, "type": "nominal"},
                        {"field": countName, "type": "quantitative"},
                        {"field": "Fitted Value", "type": "quantitative"},
                        {"field": "Actual Value", "type": "quantitative"}
                    ],
                    "size": {
                        "field": countName,
                        "type": "quantitative",
                        // "bin": {'binned': true, "minstep": 1},
                        // log scale, with points scaled down when multiple plots are graphed
                        "scale": {"type": "log", "base": 10, "range": [0, 200 / Math.sqrt(groupCount || 1)]},
                        "legend": {"symbolOpacity": 1},
                        "title": "log(count)"
                    },
                    "opacity": {
                        "condition": {
                            "selection": "Solution Name",
                            "field": "count",
                            "scale": {"range": [0.05, 0.9], "type": "log"}
                        },
                        "value": 0.05
                    }
                }
            }
        ]
    });
};

export let vegaLiteForecast = (data, xName, yName, splitName, groupName, crossSectionName, title = '', timeFormat) => {

    return ({
        "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
        "description": "A scatterplot.",
        "title": title,
        "autosize": {
            "type": "fit",
            "contains": "padding"
        },
        "selection": {
            "grid": {
                "type": "interval", "bind": "scales"
            }
        },
        "data": Object.assign(
            {"values": data},
            timeFormat
                ? {"format": {"parse": {[xName]: `date:'${timeFormat}'`}}}
                : {}),
        "mark": {
            "type": "line",
            // "point": true
        },
        "encoding": {
            "tooltip": [
                {"field": groupName, "type": "nominal"},
                {"field": yName, "type": "quantitative"},
                {"field": splitName, "type": "nominal"},
                {"field": crossSectionName, "type": "nominal"},
            ],
            "color": {"field": groupName, "type": "nominal"},
            "x": {
                "field": xName,
                "type": timeFormat ? "temporal" : "quantitative",
                "axis": {"title": xName},
                "scale": {"zero": false}
            },
            "y": {
                "field": yName,
                "type": "quantitative",
                "axis": {"title": yName},
                "scale": {"zero": false}
            },
            "opacity": {"field": splitName, "type": "nominal"},
            "detail": {"field": crossSectionName, "type": "nominal"}
        }
    });
};


export let vegaLiteForecastConfidence = (
    data,
    xName, yName, splitName, groupName, crossSectionName,
    title = '', timeFormat
) => {

    return ({
        "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
        "description": "A scatterplot.",
        "title": title,
        "autosize": {
            "type": "fit",
            "contains": "padding"
        },
        "selection": {
            "grid": {
                "type": "interval", "bind": "scales"
            }
        },
        "encoding": {
            "color": {"field": groupName, "type": "nominal"},
            "x": {
                "field": xName,
                "type": timeFormat ? "temporal" : "quantitative",
                "axis": {"title": xName},
                "scale": {"zero": false}
            }
        },
        "data": Object.assign(
            {"values": data},
            timeFormat
                ? {"format": {"parse": {[xName]: `date:'${timeFormat}'`}}}
                : {}),
        "layer": [
            {
                "mark": {
                    "type": "errorband",
                    "extent": "ci"
                },
                "encoding": {
                    "y": {"field": yName, "type": "quantitative", "axis": {"title": yName}, "scale": {"zero": false}}
                }
            },
            {
                "mark": {
                    "type": "line",
                    // "point": true
                },
                "encoding": {
                    "y": {
                        "aggregate": 'mean',
                        "field": yName,
                        "type": "quantitative",
                        "axis": {"title": yName},
                        "scale": {"zero": false}
                    }
                }
            }
        ]
    });
};

export let vegaLiteConfusionMatrix = (
    data, classes,
    xName, yName, countName,
    title
) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
    'data': {'values': data},
    'title': title,
    'transform': [
        {"calculate": 'datum.Predicted === datum.Actual', 'as': 'diagonal'}
    ],
    'encoding': {
        "x": {"field": xName, "type": "nominal", "scale": {"domain": classes}},
        "y": {"field": yName, "type": "nominal", "scale": {"domain": classes}},
    },
    "selection": {
        "selector": {"type": "single"}
    },
    'layer': [
        {
            "selection": {
                "selector": {"type": "multi"}
            },
            "mark": {
                "type": "rect",
                "strokeWidth": 3
            },
            "encoding": {
                "fill": {
                    "field": 'microCount',
                    "type": "quantitative",
                    "scale": {
                        "range": ['transparent', '#e67e22']
                    },
                    legend: {title: 'Significance'}
                },
                "stroke": {
                    "condition": [
                        {
                            "test": {
                                "and": [
                                    {"selection": "selector"},
                                    "length(data(\"selector_store\"))"
                                ]
                            },
                            "value": "black"
                        },
                        {
                            "test": "length(data(\"selector_store\"))",
                            "value": "transparent"
                        }
                    ],
                    "field": "diagonal",
                    "type": "nominal",
                    "scale": {"range": ["transparent", "#7e3d20"]},
                    "legend": null
                },
                "tooltip": [
                    {"field": 'explanation', "type": "nominal"},
                    {"field": 'significance', "type": "nominal"}
                ]
            }
        },
        {
            "mark": "text",
            "encoding": {
                "text": {"field": countName, "type": "quantitative"},
                "color": {
                    "condition": {"test": `datum.microCount < 0.5`, "value": "black"},
                    "value": "white"
                },
                "tooltip": [
                    {"field": 'explanation', "type": "nominal"},
                    {"field": 'significance', "type": "nominal"}
                ]
            }
        }
    ]
});

// alternative to rug plot
export let vegaLiteDensityHeatmap = summary => {

    let pdfPlotX = [...summary.pdfPlotX];
    let pdfPlotY = [...summary.pdfPlotY];
    let left = pdfPlotX[0];
    let densities = [];
    pdfPlotY.forEach((_, i) => {
        let right = i === pdfPlotX.length
            ? pdfPlotX[i]
            : (pdfPlotX[i] + pdfPlotX[i + 1]) / 2;
        densities.push({
            [summary.name]: left, 'to': right, 'density': pdfPlotY[i - 1]
        });
        left = right;
    });

    return {
        "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
        "description": `Densities for ${summary.name}.`,
        'layer': [
            {
                'mark': 'bar',
                'data': {'values': densities},
                'encoding': {
                    'x': {
                        'field': summary.name,
                        'type': 'quantitative',
                        'scale': {domain: [summary.min, summary.max]},
                        'title': summary.name
                    },
                    'x2': {'field': 'to', 'type': 'quantitative'},
                    'color': {
                        'field': 'density',
                        'type': 'quantitative',
                        scale: {range: ['white', 'black']},
                        legend: false
                    }
                }
            }
        ]
    }
};

export let vegaLiteImportancePlot = (data, comparison) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
    "description": `Variable importance scores`,
    "mark": "bar",
    "data": {
        "values": data
    },
    "encoding": {
        "x": {
            "field": "solution ID",
            "type": "nominal",
            "sort": false,
            "title": ''
        },
        [comparison ? "column" : 'x']: {
            "field": "predictor",
            "type": "nominal",
            "header": {"labelAngle": 20},
            "axis": {"labelAngle": -20},
            "title": "",
            "sort": comparison ? [...new Set(data.map(datum => datum.predictor))] : false
        },
        "y": {
            "field": "importance",
            "type": "quantitative"
        },
        "color": {
            "field": "solution ID",
            "type": "nominal",
            "legend": null
        },
        "tooltip": [
            {"field": 'importance', "type": "quantitative"},
            {"field": 'predictor', "type": "nominal"},
            {"field": 'solution ID', "type": "nominal"}
        ]
    }
});