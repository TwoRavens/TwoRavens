
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
                    "size": {"field": countName, "type": "quantitative"}
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
