
export let scatterMatrix = ({vars, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A scatterplot matrix.",
    "repeat": {
        "row": vars.map(variable => `"${variable}"`).join(','),
        "column": vars.map(variable => `"${variable}"`).join(',')
    },
    "spec": {
        "data": data,
        "mark": "point",
        "selection": {
            "brush": {
                "type": "interval",
                "resolve": "union"
            }
        },
        "encoding": {
            "x": {"field": {"repeat": "column"}, "type": "quantitative"},
            "y": {"field": {"repeat": "row"}, "type": "quantitative"},
            "color": {
                "condition": {"selection": "brush"},
                "value": "grey"
            }
        }
    }
});

export let binnedCrossFilter = ({vars, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "Crossfilter binned barplots.",
    "data": data,
    "repeat": {"column": vars},
    "spec": {
        "layer": [{
            "selection": {
                "brush": {"type": "interval", "encodings": ["x"]}
            },
            "mark": "bar",
            "encoding": {
                "x": {
                    "field": {"repeat": "column"},
                    "bin": {"maxbins": 20},
                    "type": "quantitative"
                },
                "y": {"aggregate": "count", "type": "quantitative"}
            }
        }, {
            "transform": [{"filter": {"selection": "brush"}}],
            "mark": "bar",
            "encoding": {
                "x": {
                    "field": {"repeat": "column"},
                    "bin": {"maxbins": 20},
                    "type": "quantitative"
                },
                "y": {"aggregate": "count", "type": "quantitative"},
                "color": {"value": "goldenrod"}
            }
        }]
    }
});
