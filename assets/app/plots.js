
// handles plotting multiple groups at the same time
export let vegaScatter = (data, xName, yName, groupName, countName, title='') => {

    return ({
        "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
        "description": "A scatterplot.",
        "title": title,
        "autosize": {
            "type": "fit",
            "contains": "padding"
        },
        "encoding": {
            "color": {"field": groupName, "type": "nominal"},
            "x": {"field": xName, "type": "quantitative", "axis": {"title": xName}},
            "y": {"field": yName, "type": "quantitative", "axis": {"title": yName}}
        },

        "layer": [
            {
                "data": {
                    "values": data
                },
                "mark": "point",
                "encoding": {
                    "tooltip": [
                        {"field": groupName, "type": "nominal"},
                        {"field": countName, "type": "quantitative"},
                    ],
                    "size": {"field": countName, "type": "quantitative", "bin": true}
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

export let vegaConfusionMatrix = (data, classes, xName, yName, countName, title) => ({
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
export let vegaDensityHeatmap = summary => {

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
        "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
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
