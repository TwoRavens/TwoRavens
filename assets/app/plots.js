
// handles plotting multiple groups at the same time
export let vegaLiteScatter = (data, xName, yName, groupName, countName, title='') => {

    return ({
        "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
        "description": "A scatterplot.",
        "title": title,
        "autosize": {
            "type": "fit",
            "contains": "padding"
        },
        "encoding": {
            "color": {"field": groupName, "type": "nominal"},
            "x": {"field": xName, "type": "quantitative", "axis": {"title": xName}, "scale": {"zero": false}},
            "y": {"field": yName, "type": "quantitative", "axis": {"title": yName}, "scale": {"zero": false}}
        },

        "layer": [
            {
                "selection": {
                    "grid": {
                        "type": "interval", "bind": "scales"
                    }
                },
                "data": {
                    "values": data
                },

                "mark": "point",
                "encoding": {
                    "tooltip": [
                        {"field": groupName, "type": "nominal"},
                        {"field": countName, "type": "quantitative"},
                    ],
                    "size": {"field": countName, "type": "quantitative", "bin": {'binned': true, "minstep": 1}}
                }
            },
            {
                "mark": "line",
                "data": {
                    'values': Object.entries(data.reduce((extrema, point) => Object.assign(extrema, {
                        [point[groupName]]: {
                            min: Math.min((extrema[point[groupName]] || {min: point[xName]}).min, point[xName], point[yName]),
                            max: Math.max((extrema[point[groupName]] || {max: point[xName]}).max, point[xName], point[yName]),
                        }
                    }), {}))
                        .flatMap(entry => [
                            {[groupName]: entry[0], [xName]: entry[1].min, [yName]: entry[1].min},
                            {[groupName]: entry[0], [xName]: entry[1].max, [yName]: entry[1].max}
                        ])
                }
            }
        ]
    });
};

export let vegaLiteForecast = (data, xName, yName, splitName, groupName, crossSectionName, title='') => {

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
        "data": {
            "values": data
        },
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
            "x": {"field": xName, "type": "quantitative", "axis": {"title": xName}, "scale": {"zero": false}},
            "y": {"field": yName, "type": "quantitative", "axis": {"title": yName}, "scale": {"zero": false}},
            "opacity": {"field": splitName, "type": "nominal"},
            "detail": {"field": crossSectionName, "type": "nominal"}
        }
    });
};


export let vegaLiteForecastConfidence = (data, xName, yName, splitName, groupName, crossSectionName, title='') => {

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
            "x": {"field": xName, "type": "quantitative", "axis": {"title": xName}, "scale": {"zero": false}}
        },
        "data": {
            "values": data
        },
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
                    "y": {"aggregate": 'mean', "field": yName, "type": "quantitative", "axis": {"title": yName}, "scale": {"zero": false}}
                }
            }
        ]
    });
};

export let vegaLiteConfusionMatrix = (data, classes, xName, yName, countName, title) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
    'data': {'values': data},
    'title': title,
    'transform': [
        {"calculate": 'datum.Predicted === datum.Actual', 'as': 'diagonal'}
    ],
    'encoding': {
        "x": {"field": xName, "type": "nominal", "scale": {"domain": classes}, spacing: 0},
        "y": {"field": yName, "type": "nominal", "scale": {"domain": classes}, spacing: 0},
    },
    'layer': [
        {
            "mark": "rect",
            "encoding": {
                "fill": {"field": 'microCount', "type": "quantitative", "scale": {"range": ['#ffffff', '#e67e22']}, legend: {title: 'Significance'}},
                "stroke": {"field": 'diagonal', "type": "nominal", "scale": {"range": ['#ffffff', '#7e3d20']}},
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
                    'color': {'field': 'density', 'type': 'quantitative', scale: {range: ['white', 'black']}, legend: false}
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