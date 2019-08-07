export let aggBar = ({x, y, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "An aggregate bar chart.",
    "data": data,
    "transform": null,
    "mark": "bar",
    "encoding": {
        "y": {
            "field": y, "type": "nominal",
            "scale": {"rangeStep": null}
        },
        "x": {
            "field": x, "type": "quantitative",
            "axis": {"title": x}
        }
    }
});

export let area = ({x, y, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "An area plot.",
    "data": data,
    "mark": "area",
    "encoding": {
        "x": {
            "field": x, "type": "quantitative",
            "axis": {"title": x}
        },
        "y": {
            field: y, "type": "quantitative",
            "axis": {"title": y}
        }
    }
});

// TODO: windowed average
export let averageDiff = ({x, y, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "Difference from the average.",
    "data": data,
    "transform": [
        {
            "window": [{
                "op": "mean",
                "field": x,
                "as": "AverageRating"
            }],
            "frame": [
                null,
                null
            ]
        }
    ],
    "layer": [
        {
            "mark": "bar",
            "encoding": {
                "x": {
                    "field": x, "type": "quantitative",
                    "axis": {"title": x}
                },
                "y": {"field": y, "type": "nominal"}
            }
        },
        {
            "mark": {"type": "rule", "color": "red"},
            "encoding": {
                "x": {
                    "field": "AverageRating",
                    "type": "quantitative"
                }
            }
        }
    ]
});

// TODO: 2D auto binning
export let binnedScatter = ({x, y, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A binned scatterplot.",
    "data": data,
    "mark": "circle",
    "encoding": {
        "x": {
            "bin": {"maxbins": 10},
            "field": x,
            "type": "quantitative"
        },
        "y": {
            "bin": {"maxbins": 10},
            "field": y,
            "type": "quantitative"
        },
        "size": {
            "aggregate": "count",
            "type": "quantitative"
        }
    }
});

// TODO: 2D auto binning
export let binnedTableHeat = ({x, y, count, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A binned heatmap table.",
    "data": data,
    "mark": "rect",
    "encoding": {
        "x": {
            "field": x,
            "type": "quantitative"
        },
        "y": {
            "field": y,
            "type": "quantitative"
        },
        "color": {
            "field": count,
            "type": "quantitative"
        }
    },
    "config": {
        "range": {
            "heatmap": {
                "scheme": "greenblue"
            }
        },
        "view": {
            "stroke": "transparent"
        }
    }
});

export let box2D = ({x, y, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A 2D box plot showing median, min, and max.",
    "data": data,
    "transform": [
        {
            "aggregate": [
                {
                    "op": "q1",
                    "field": y,
                    "as": "lowerBox"
                },
                {
                    "op": "q3",
                    "field": y,
                    "as": "upperBox"
                },
                {
                    "op": "median",
                    "field": y,
                    "as": "midBox"
                },
                {
                    "op": "min",
                    "field": y,
                    "as": "lowerWhisker"
                },
                {
                    "op": "max",
                    "field": y,
                    "as": "upperWhisker"
                }
            ],
            "groupby": [
                x
            ]
        }
    ],
    "layer": [
        {
            "mark": {
                "type": "rule",
                "style": "boxWhisker"
            },
            "encoding": {
                "y": {
                    "field": "lowerWhisker",
                    "type": "quantitative",
                    "axis": {
                        "title": y
                    }
                },
                "y2": {
                    "field": "lowerBox",
                    "type": "quantitative"
                },
                "x": {
                    "field": x,
                    "type": "ordinal"
                }
            }
        },
        {
            "mark": {
                "type": "rule",
                "style": "boxWhisker"
            },
            "encoding": {
                "y": {
                    "field": "upperBox",
                    "type": "quantitative"
                },
                "y2": {
                    "field": "upperWhisker",
                    "type": "quantitative"
                },
                "x": {
                    "field": x,
                    "type": "ordinal"
                }
            }
        },
        {
            "mark": {
                "type": "bar",
                "style": "box"
            },
            "encoding": {
                "y": {
                    "field": "lowerBox",
                    "type": "quantitative"
                },
                "y2": {
                    "field": "upperBox",
                    "type": "quantitative"
                },
                "x": {
                    "field": x,
                    "type": "ordinal"
                },
                "size": {
                    "value": 5
                }
            }
        },
        {
            "mark": {
                "type": "tick",
                "style": "boxMid"
            },
            "encoding": {
                "y": {
                    "field": "midBox",
                    "type": "quantitative"
                },
                "x": {
                    "field": x,
                    "type": "ordinal"
                },
                "color": {
                    "value": "white"
                },
                "size": {
                    "value": 5
                }
            }
        }
    ]
});

export let groupedBar = ({x, y, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A grouped bar chart.",
    "data": data,
    "mark": "bar",
    "encoding": {
        "column": {
            "field": x, "type": "nominal"
        },
        "y": {
            "field": y, "type": "nominal",
            "axis": {"title": y, "grid": false}
        },
        "x": {
            "field": y, "type": "nominal",
            "scale": {"rangeStep": null},
            "axis": {"title": ""}
        },
        "color": {
            "field": y, "type": "nominal",
            // "scale": {"range": "tworavensColors"}
        }
    },
    "config": {
        "view": {"stroke": "transparent"},
        "axis": {"domainWidth": 1}
    }
});

// TODO: transform difference of vars
export let horizon = ({x, y, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "Horizon graph",
    "data": data,
    "layer": [{
        "mark": {"type": "area", "clip": true, "orient": "vertical"},
        "encoding": {
            "x": {
                "field": x, "type": "quantitative",
                "scale": {"zero": false, "nice": false}
            },
            "y": {
                "field": y, "type": "quantitative",
                "scale": {"domain": [0, "tworavensMeanY"]}
            },
            "opacity": {"value": 0.6}
        }
    }, {
        "transform": [
            {
                "calculate": "datum.tworavensY - tworavensMeanY",
                "as": "ny"
            }
        ],
        "mark": {"type": "area", "clip": true, "orient": "vertical"},
        "encoding": {
            "x": {
                "field": x, "type": "quantitative"
            },
            "y": {
                "field": "ny", "type": "quantitative",
                "scale": {"domain": [0, "tworavensMeanY"]},
                "axis": {"title": y}
            },
            "opacity": {"value": 0.3}
        }
    }],
    "config": {
        "area": {"interpolate": "monotone"}
    }
});

// RAW DATA
export let interactiveBarMean = ({x, y, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "data": data,
    "layer": [{
        "selection": {
            "brush": {
                "type": "interval",
                "encodings": ["x"]
            }
        },
        "mark": "bar",
        "encoding": {
            "x": {
                "field": x,
                "type": "nominal"
            },
            "y": {
                "aggregate": "mean",
                "field": y,
                "type": "quantitative"
            },
            "opacity": {
                "condition": {
                    "selection": "brush", "value": 1
                },
                "value": 0.7
            }
        }
    }, {
        "transform": [{
            "filter": {"selection": "brush"}
        }],
        "mark": "rule",
        "encoding": {
            "y": {
                "aggregate": "mean",
                "field": y,
                "type": "quantitative"
            },
            "color": {"value": "firebrick"},
            "size": {"value": 3}
        }
    }]
});


export let line = ({x, y, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A line chart.",
    "data": data,
    "mark": "line",
    "encoding": {
        "x": {"field": x, "type": "quantitative"},
        "y": {"field": y, "type": "quantitative"}
    }
});

export let scatter = ({x, y, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A scatterplot.",
    "data": data,
    "mark": "point",
    "encoding": {
        "x": {"field": x, "type": "quantitative"},
        "y": {"field": y, "type": "quantitative"}
    }
});

// TODO: unique Y in domain
export let stackedBar = ({x, y, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A stacked bar chart.",
    "data": data,
    "mark": "bar",
    "encoding": {
        "x": {
            "timeUnit": null,
            "field": x,
            "type": "nominal",
            "axis": {"title": x}
        },
        "y": {
            "field": y,
            "aggregate": "count",
            "type": "nominal",
            "title": y
        },
        "color": {
            "field": y,
            "type": "nominal",
            "scale": {
                "domain": "tworavensUniqueY",
                "range": "tworavensColors"
            },
            "legend": {
                "title": y
            }
        }
    }
});

export let step = ({x, y, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A step chart.",
    "data": data,
    "transform": null,
    "mark": {
        "type": "line",
        "interpolate": "step-after"
    },
    "encoding": {
        "x": {"field": x, "type": "quantitative"},
        "y": {"field": y, "type": "quantitative"}
    }
});

export let strip = ({x, y, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A strip plot.",
    "data": data,
    "mark": "tick",
    "encoding": {
        "x": {"field": x, "type": "quantitative"},
        "y": {"field": y, "type": "nominal"}
    }
});

export let tableHeat = ({x, y, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A heatmap.",
    "data": data,
    "encoding": {
        "y": {"field": "tworavensX", "type": "nominal"},
        "x": {"field": "tworavensY", "type": "nominal"}
    },
    "layer": [{
        "mark": "rect",
        "encoding": {
            "color": {"aggregate": "count", "field": "*", "type": "quantitative"}
        }
    }, {
        "mark": "text",
        "encoding": {
            "text": {"aggregate": "count", "field": "*", "type": "quantitative"},
            "color": {
                "condition": {"test": "datum['count_*'] > 100", "value": "black"},
                "value": "white"
            }
        }
    }],
    "config": {
        "scale": {"bandPaddingInner": 0, "bandPaddingOuter": 0},
        "text": {"baseline": "middle"}
    }
});

export let scatterMeansSD = ({x, y, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A scatterplot with mean and standard deviation overlay.",
    "data": data,
    "layer": [
        {
            "mark": "point",
            "encoding": {
                "x": {
                    "field": "tworavensX",
                    "type": "quantitative"
                },
                "y": {
                    "field": "tworavensY",
                    "type": "quantitative"
                }
            }
        },
        {
            "transform": [
                {
                    "aggregate": [
                        {
                            "op": "mean",
                            "field": "tworavensY",
                            "as": "meanY"
                        },
                        {
                            "op": "stdev",
                            "field": "tworavensY",
                            "as": "devY"
                        }
                    ],
                    "groupby": []
                },
                {
                    "calculae": "datum.meanY-datum.devY",
                    "as": "lower"
                },
                {
                    "calculate": "datum.meanY+datum.devY",
                    "as": "upper"
                }
            ],
            "layer": [
                {
                    "mark": "rule",
                    "encoding": {
                        "y": {
                            "field": "meanY",
                            "type": "quantitative",
                            "axis": null
                        }
                    }
                },
                {
                    "mark": "rect",
                    "encoding": {
                        "y": {
                            "field": "lower",
                            "type": "quantitative",
                            "axis": null
                        },
                        "y2": {
                            "field": "upper",
                            "type": "quantitative"
                        },
                        "opacity": {
                            "value": 0.2
                        }
                    }
                }
            ]
        }
    ]
});

export let trellisHist = ({x, y, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A histogram trellis.",
    "data": data,
    "mark": "bar",
    "encoding": {
        "x": {
            "bin": {"maxbins": 10},
            "field": "tworavensX",
            "type": "quantitative"
        },
        "y": {
            "aggregate": "count",
            "type": "quantitative"
        },
        "row": {"field": "tworavensY", "type": "nominal"}
    }
});
