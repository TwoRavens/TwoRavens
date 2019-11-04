
// handles plotting multiple groups at the same time
// xData of the form: {'group1': [...], 'group2': [...]}
export let vegaScatter = (xData, yData, xName, yName, title, legendName) => {

    return ({
        "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
        "description": "A scatterplot.",
        "title": title,
        "data": {
            "values": Object.keys(xData).reduce((out, groupName) =>
                out.concat((xData[groupName] || []).map((_, i) => ({
                    [xName]: xData[groupName][i],
                    [yName]: yData[groupName][i],
                    [legendName]: groupName,
                    'tworavensLabel': groupName
                }))), [])
        },
        "autosize": {
            "type": "fit",
            "contains": "padding"
        },

        "layer": [
            {
                "mark": "point",
                "encoding": {
                    "x": {"field": xName, "type": "quantitative", "axis": {"title": xName}},
                    "y": {"field": yName, "type": "quantitative", "axis": {"title": yName}},
                    "color": {"field": legendName, "type": "nominal"},
                    "tooltip": {"field": "tworavensLabel", "type": "nominal"}
                }
            },

            {
                "mark": {
                    "type": "rule",
                    "style": "boxWhisker"
                },
                "encoding": {
                    "color": {"field": legendName, "type": "nominal"},
                    "x": {
                        "field": xName,
                        "type": "quantitative",
                        "aggregate": "min"
                    },
                    "x2": {
                        "field": xName,
                        "type": "quantitative",
                        "aggregate": "max"
                    },
                    "y": {
                        "field": yName,
                        "type": "quantitative",
                        "aggregate": "min"
                    },
                    "y2": {
                        "field": yName,
                        "type": "quantitative",
                        "aggregate": "max"
                    }
                }
            }
        ]
    });
}

export let vegaScatterV2 = (xData, yData, xName, yName, title, legendName) => {

    return ({
        "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
        "description": "A scatterplot.",
        "title": title,
        "data": {
            "values": Object.keys(xData).reduce((out, groupName) =>
                out.concat((xData[groupName] || []).map((_, i) => ({
                    [xName]: xData[groupName][i],
                    [yName]: yData[groupName][i],
                    [legendName]: groupName,
                    'tworavensLabel': groupName
                }))), [])
        },
        "autosize": {
            "type": "fit",
            "contains": "padding"
        },

        "layer": [
            {
                "mark": "point",
                "encoding": {
                    "x": {"field": xName, "type": "quantitative", "axis": {"title": xName}},
                    "y": {"field": yName, "type": "quantitative", "axis": {"title": yName}},
                    "color": {"field": legendName, "type": "nominal"},
                    "tooltip": {"field": "tworavensLabel", "type": "nominal"}
                }
            },
        ]
    });
}

