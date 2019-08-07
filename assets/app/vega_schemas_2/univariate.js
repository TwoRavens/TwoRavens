export let histogram = ({x, count, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A histogram.",
    "data": {"url": "tworavensData"},
    "mark": "bar",
    "encoding": {
        "x": {
            "field": x,
            "type": "quantitative"
        },
        "y": {
            "field": count,
            "type": "quantitative"
        }
    }
});

export let specDot = ({x, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A dot plot.",
    "data": data,
    "mark": "tick",
    "encoding": {
        "x": {"field": x, "type": "quantitative"}
    }
});

export let specAreaUni = ({x, count, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "An area plot.",
    "data": data,
    "mark": "area",
    "encoding": {
        "x": {
            "field": x, "type": "quantitative", "axis": {"title": x}
        },
        "y": {
            "field": count, "type": "quantitative", "axis": {"title": count}
        }
    }
});

export let histogramMean = ({x, count, data, mean}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A histogram with mean highlighted.",
    "data": {"url": "tworavensData"},
    "layer": [
        {
            data: data,
            "mark": "bar",
            "encoding": {
                "x": {
                    "field": x,
                    "type": "quantitative"
                },
                "y": {
                    field: count,
                    "type": "quantitative"
                }
            }
        }, {
            data: {value: [{x: mean}]},
            "mark": "rule",
            "encoding": {
                "x": {
                    "field": x,
                    "type": "quantitative"
                },
                "color": {"value": "red"},
                "size": {"value": 5}
            }
        }]
});


export let simpleBar = ({x, count, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A simple bar chart.",
    "data": {"url": "tworavensData"},
    "mark": "bar",
    "encoding": {
        "x": {"field": x, "type": "ordinal"},
        "y": {field: count, "type": "quantitative"}
    }
});
