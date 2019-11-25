// handles plotting multiple groups at the same time
// xData of the form: {'group1': [...], 'group2': [...]}
export let vegaScatter = (xData, yData, xName, yName, title, legendName) => {

    return ({
        "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
        "description": "A scatterplot.",
        "title": title,
        "autosize": {
            "type": "fit",
            "contains": "padding"
        },
        "encoding": {
            "color": {"field": legendName, "type": "nominal"},
            "x": {"field": xName, "type": "quantitative", "axis": {"title": xName}},
            "y": {"field": yName, "type": "quantitative", "axis": {"title": yName}},
        },

        "layer": [
            {
                "data": {
                    "values": Object.keys(xData).flatMap(groupName => groupName in xData
                        ? xData[groupName].map((_, i) => ({
                            [xName]: xData[groupName][i],
                            [yName]: yData[groupName][i],
                            [legendName]: groupName,
                            'tworavensLabel': groupName
                        }))
                        : [])
                },
                "mark": "point",
                "encoding": {
                    "tooltip": {"field": "tworavensLabel", "type": "nominal"}
                }
            },
            {
                "mark": "line",
                "data": {
                    'values': Object.keys(xData)
                        .flatMap(groupName => (groupName in xData && groupName in yData) ? [
                            {
                                [legendName]: groupName,
                                [xName]: Math.min(...xData[groupName], ...yData[groupName]),
                                [yName]: Math.min(...xData[groupName], ...yData[groupName])
                            },
                            {
                                [legendName]: groupName,
                                [xName]: Math.max(...xData[groupName], ...yData[groupName]),
                                [yName]: Math.max(...xData[groupName], ...yData[groupName])
                            }
                        ] : [])
                }
            }
        ]
    });
};
