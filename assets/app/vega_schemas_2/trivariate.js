export let bubbleQQQ = ({x, y, z, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A bubbleplot for three quantitative variables.",
    "data": data,
    "mark": "point",
    "encoding": {
        "x": {"field": x, "type": "quantitative"},
        "y": {"field": y, "type": "quantitative"},
        "size": {"field": z, "type": "quantitative"}
    }
})

export let bubbleTri = ({x, y, z, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A bubble plot with groups.",
    "data": data,
    "mark": {
        "type": "circle",
        "opacity": 0.8,
        "stroke": "black",
        "strokeWidth": 1
    },
    "encoding": {
        "x": {
            "field": x,
            "type": "ordinal",
            "axis": {"labelAngle": 0}
        },
        "y": {"field": y, "type": "nominal", "axis": {"title": ""}},
        "size": {
            "field": z,
            "type": "quantitative",
            "legend": {"title": z},
            "bin": true
        },
        "color": {"field": y, "type": "nominal", "legend": null}
    }
})


export let dotDashQQN = ({x, y, z, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "Dot-dash plot.",
    "data": {
        "url": "tworavensData"
    },
    "hconcat": [
        {
            "mark": "tick",
            "description": "y-axis dash plot",
            "encoding": {
                "y": {
                    "field": y,
                    "type": "quantitative",
                    "axis": {"labels": false, "domain": false, "ticks": false}
                },
                "x": {
                    "field": z,
                    "type": "nominal",
                    "axis": {
                        "title": "",
                        "labels": false,
                        "domain": false,
                        "ticks": false
                    }
                },
                "color": {"field": z, "type": "nominal"}
            }
        },
        {
            "vconcat": [
                {
                    "mark": "point",
                    "description": "dot plot",
                    "encoding": {
                        "x": {
                            "field": x,
                            "type": "quantitative",
                            "axis": {"title": ""}
                        },
                        "y": {
                            "field": y,
                            "type": "quantitative",
                            "axis": {"title": ""}
                        },
                        "color": {"field": z, "type": "nominal"}
                    }
                },
                {
                    "mark": "tick",
                    "description": "x-axis dash plot",
                    "encoding": {
                        "x": {
                            "field": x,
                            "type": "quantitative",
                            "axis": {"labels": false, "domain": false, "ticks": false}
                        },
                        "y": {
                            "field": z,
                            "type": "nominal",
                            "axis": {
                                "title": "",
                                "labels": false,
                                "domain": false,
                                "ticks": false
                            }
                        },
                        "color": {"field": z, "type": "nominal"}
                    }
                }
            ]
        }
    ],
    "config": {
        "view": {"strokeWidth": 0},
        "axis": {
            "gridWidth": 0.3,
            "domainColor": "lightgray",
            "tickColor": "lightgray"
        },
        "axisY": {"titlePadding": -15},
        "axisX": {"titlePadding": 10}
    }
})

export let facetBox = ({x, y, z, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "faceted boxplot",
    "data": {
        "url": "tworavensData"
    },
    "facet": {
        "row": {
            "field": z,
            "type": "nominal"
        }
    },
    "spec": {
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
                        "type": "nominal"
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
                        "type": "nominal"
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
                        "type": "nominal"
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
                        "type": "nominal"
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
    }
})

export let facetHeatMap = ({x, y, z, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A faceted heatmap.",
    "data": data,
    "facet": {
        "row": {
            "field": z,
            "type": "nominal"
        }
    },
    "spec": {
        "mark": "rect",
        "encoding": {
            "y": {"field": y, "type": "nominal"},
            "x": {"field": x, "type": "nominal"},
            "color": {"aggregate": "count", "field": "*", "type": "quantitative"}
        }
    }
});

export let groupedBarNQQ = ({x, y, z, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A grouped bar chart.",
    "data": data,
    "mark": "bar",
    "encoding": {
        "column": {
            "field": x, "type": "nominal"
        },
        "y": {
            "aggregate": "sum", "field": y, "type": "quantitative",
            "axis": {"title": "tworavensY (sum)", "grid": false}
        },
        "x": {
            "field": z, "type": "quantitative",
            "bin": true,
            "scale": {"rangeStep": null},
            "axis": {"title": ""}
        },
        "color": {
            "field": z, "type": "quantitative",
            "bin": true
        }
    },
    "config": {
        "view": {"stroke": "transparent"},
        "axis": {"domainWidth": 1}
    }
});

export let groupedBarTri = ({x, y, z, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A grouped bar chart.",
    "data": data,
    "mark": "bar",
    "encoding": {
        "column": {
            "field": x, "type": "nominal"
        },
        "y": {
            "aggregate": "sum", "field": y, "type": "quantitative",
            "axis": {"title": "tworavensY (sum)", "grid": false}
        },
        "x": {
            "field": z, "type": "nominal",
            "scale": {"rangeStep": null},
            "axis": {"title": ""}
        },
        "color": {
            "field": z, "type": "nominal",
            "scale": {"range": "tworavensColors"}
        }
    },
    "config": {
        "view": {"stroke": "transparent"},
        "axis": {"domainWidth": 1}
    }
})

export let heatmapNNQ = ({x, y, z, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A heatmap.",
    "data": data,
    "encoding": {
        "y": {"field": y, "type": "nominal"},
        "x": {"field": x, "type": "nominal"}
    },
    "layer": [{
        "mark": "rect",
        "encoding": {
            "color": {"aggregate": "mean", "field": z, "type": "quantitative"}
        }
    }, {
        "mark": "text",
        "encoding": {
            "text": {"aggregate": "mean", "field": z, "type": "quantitative"},
            "color": {"value": "white"}
        }
    }],
    "config": {
        "scale": {"bandPaddingInner": 0, "bandPaddingOuter": 0},
        "text": {"baseline": "middle"}
    }
});

export let horizGroupBar = ({x, y, z, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "data": data,
    "description": "A horizontal grouped bar chart.",
    "mark": "bar",
    "encoding": {
        "x": {"aggregate": "sum", "field": x, "type": "quantitative"},
        "y": {"field": y, "type": "nominal"},
        "color": {"field": z, "type": "nominal"}
    }
});

export let scatterQQQ = ({x, y, z, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "data": data,
    "description": "An interactive scatterplot for three quantitative variables.",
    "selection": {
        "grid": {
            "type": "interval", "bind": "scales"
        }
    },
    "mark": "circle",
    "encoding": {
        "x": {
            "field": x, "type": "quantitative"
        },
        "y": {
            "field": y, "type": "quantitative"
        },
        "size": {"field": z, "type": "quantitative"}
    }
})

export let scatterTri = ({x, y, z, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A scatterplot with groups.",
    "data": data,
    "mark": "point",
    "encoding": {
        "x": {"field": x, "type": "quantitative"},
        "y": {"field": y, "type": "quantitative"},
        "color": {"field": z, "type": "nominal"},
        "shape": {"field": z, "type": "nominal"}
    }
})


export let stackedBarNNN = ({x, y, z, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A stacked bar chart.",
    "data": data,
    "mark": "bar", "encoding": {
        "x": {"timeUnit": null, "field": x, "type": "nominal", "axis": {"title": x}},
        "y": {"field": y, "aggregate": "count", "type": "nominal", "title": y},
        "color": {
            "field": y,
            "type": "nominal",
            "scale": {
                "domain": "tworavensUniqueY",
                "range": "tworavensColors"
            },
            "legend": {"title": y}
        },
        "row": {"field": z, "type": "nominal"}
    }
})

export let tableBubbleNNQ = ({x, y, z, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A table bubble.",
    "data": data,
    "mark": "circle",
    "encoding": {
        "y": {
            "field": y,
            "type": "nominal"
        },
        "x": {
            "field": x,
            "type": "nominal"
        },
        "size": {
            "field": z,
            "type": "quantitative",
            "aggregate": "sum"
        }
    }
});

export let trellisScatterQQN = ({x, y, z, data}) => ({
    "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
    "description": "A scatterplot trellis.",
    "data": data,
    "mark": "point",
    "encoding": {
        "column": {"field": z, "type": "nominal"},
        "x": {"field": x, "type": "quantitative"},
        "y": {"field": y, "type": "quantitative"}
    }
});
