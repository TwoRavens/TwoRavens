import m from 'mithril';

import {panelMargin} from "../../common/common";
import TextField from '../../common/views/TextField';
import PlotContinuous from './views/PlotContinuous';
import * as d3 from "d3";


export function interpolate(data, label) {
    let allLabelsInt = [];
    for (let entry of data) {
        allLabelsInt.push(entry['Label'])
    }

    let lower = allLabelsInt[0];
    let upper = allLabelsInt[allLabelsInt.length - 1];

    for (let candidate in allLabelsInt) {
        if (allLabelsInt[candidate] > lower && allLabelsInt[candidate] < label) {
            lower = allLabelsInt[candidate];
        }
        if (allLabelsInt[candidate] < upper && allLabelsInt[candidate] > label) {
            upper = allLabelsInt[candidate];
        }
    }

    let lowerFreq = data[0]['Freq'];
    let upperFreq = data[data.length - 1]['Freq'];

    for (let candidate of data) {
        if (candidate['Label'] === lower) lowerFreq = candidate['Freq'];
        if (candidate['Label'] === upper) upperFreq = candidate['Freq'];
    }

    let interval_lower = label - lower;
    let timespan = upper - lower;

    let weight = interval_lower / timespan;
    return (1 - weight) * lowerFreq + weight * upperFreq;
}

export default class CanvasContinuous {

    view(vnode) {
        let {mode, data, metadata, preferences, redraw, setRedraw} = vnode.attrs;

        if (preferences['measure'] === undefined) preferences['measure'] = metadata.buckets;

        let setHandles = (handles) => {
            preferences['handleLower'] = handles[0];
            preferences['handleUpper'] = handles[1];
        };

        // only draw the graph if there are multiple datapoints
        let drawGraph = data.length > 1;
        let dataProcessed;
        if (redraw && drawGraph) {
            setRedraw(false);

            data.unshift({Freq: data[0].Freq, Label: metadata.min});
            data.push({Freq: data[data.length - 1].Freq, Label: metadata.max});

            let allLabels = [...data.sort(anySort)];

            preferences['userLower'] = preferences['userLower'] || data[0]['Label'];
            preferences['userUpper'] = preferences['userUpper'] || data[data.length - 1]['Label'];

            preferences['handleLower'] = preferences['handleLower'] || data[0]['Label'];
            preferences['handleUpper'] = preferences['handleUpper'] || data[data.length - 1]['Label'];

            preferences['minLabel'] = data[0]['Label'];
            preferences['maxLabel'] = data[data.length - 1]['Label'];

            // make sure the handles are valid when switching datasets
            if (preferences['userLower'] < preferences['minLabel']) {
                preferences['userLower'] = preferences['minLabel'];
                preferences['handleLower'] = preferences['userLower']
            }
            if (preferences['userLower'] > preferences['maxLabel']) {
                preferences['userLower'] = preferences['minLabel'];
                preferences['handleLower'] = preferences['userLower']
            }
            if (preferences['userUpper'] > preferences['maxLabel']) {
                preferences['userUpper'] = preferences['maxLabel'];
                preferences['handleUpper'] = preferences['userUpper']
            }
            if (preferences['userUpper'] < preferences['minLabel']) {
                preferences['userUpper'] = preferences['maxLabel'];
                preferences['handleUpper'] = preferences['userUpper']
            }

            // Filter highlighted data by label picked
            let selectedLabels = data.filter(function (row) {
                return row.Label >= preferences['userLower'] && row.Label <= preferences['userUpper'];
            });

            if (preferences['userLower'] !== data[0]['Label']) {
                let interpolatedMin = {
                    "Label": preferences['userLower'],
                    "Freq": interpolate(allLabels, preferences['userLower'])
                };

                selectedLabels.unshift(interpolatedMin);
                allLabels.push(interpolatedMin);
            }

            if (preferences['userUpper'] !== data[data.length - 1]['Label']) {
                let interpolatedMax = {
                    "Label": preferences['userUpper'],
                    "Freq": interpolate(allLabels, preferences['userUpper'])
                };
                selectedLabels.push(interpolatedMax);
                allLabels.push(interpolatedMax);
            }

            allLabels = allLabels.sort(anySort);

            dataProcessed = {
                "#ADADAD": allLabels,
                "steelblue": selectedLabels
            }
        }

        let rightMenu = [
            mode === 'subset' && m("[id='labelOptions']",
                m(".form-group[id='labelInterval']",
                    [
                        // Set label from slider
                        m("button.btn.btn-default[type='button']", {
                            id: 'setLabelfromSlider',
                            style: {
                                "margin-top": "10px",
                                "text-align": "center"
                            },
                            onclick: function () {
                                preferences['userLower'] = preferences['handleLower'];
                                preferences['userUpper'] = preferences['handleUpper'];

                                // hard redraw plots
                                setRedraw(true);
                            }
                        }, "Bring Label from Slider"),

                        // From label
                        m("label[for='fromlabel'][id='labelFromLab']", {
                            style: {
                                "text-align": "left",
                                "width": "100%",
                                "margin-top": "10px"
                            }
                        }, "From:"),
                        m(TextField, {
                            id: 'fromLabel',
                            type: 'text',
                            class: 'form-control',
                            onblur: value => {
                                setRedraw(true);
                                value = isNaN(parseFloat(value)) ? value : Math.min(Math.max(parseFloat(value), preferences['minLabel']), preferences['maxLabel']);

                                if (value > preferences['userUpper']) {
                                    preferences['userLower'] = preferences['userUpper'];
                                    preferences['userUpper'] = value;
                                }
                                else preferences['userLower'] = value;
                            },
                            value: preferences['userLower']
                        }),

                        // To label
                        m("label[for='tolabel'][id='labelToLab']", {
                            style: {
                                "text-align": "left",
                                "width": "100%",
                                "margin-top": "10px"
                            }
                        }, "To:"),
                        m(TextField, {
                            id: 'toLabel',
                            type: 'text',
                            class: 'form-control',
                            onblur: value => {
                                setRedraw(true);
                                value = isNaN(parseFloat(value)) ? value : Math.min(Math.max(parseFloat(value), preferences['minLabel']), preferences['maxLabel']);

                                if (value < preferences['userLower']) {
                                    preferences['userUpper'] = preferences['userLower'];
                                    preferences['userLower'] = value;
                                }
                                else preferences['userUpper'] = value;
                            },
                            value: preferences['userUpper']
                        })
                    ]
                )
            ),
            mode === 'aggregate' && m("label[for='discreteAggreg'][id='labelDiscreteAggreg']", {
                style: {
                    "text-align": "left",
                    "width": "100%",
                    "margin-top": "10px"
                }
            }, "Bin Count:"),
            mode === 'aggregate' && m('#discreteAggreg', m(TextField, {
                id: 'textFieldAggregOption',
                class: preferences.error && ['is-invalid'],
                attrsAll: {style: {width: '80px'}},
                title: 'integer number of linearly spaced bins to aggregate into',
                oninput: aggregation => {
                    if (aggregation.length === 0) {
                        preferences['measure'] = '';
                        preferences.error = true;
                    }
                    if (parseInt(aggregation) > 0) {
                        preferences['measure'] = Math.min(parseInt(aggregation), 10000);
                        preferences.error = false;
                    }
                },
                value: preferences['measure']
            }))
        ];

        return m("#canvasLabel", {style: {'height': '100%', 'width': '100%', 'padding-top': panelMargin}},

            m("[id='continuousSVGdiv']", {
                    style: {
                        "height": "550px",
                        "width": "500px",
                        "display": "inline-block"
                    }
                },
                drawGraph && m(PlotContinuous, {
                    id: 'continuousSVG',
                    data: dataProcessed,
                    handles: [preferences['handleLower'], preferences['handleUpper']],
                    callbackHandles: setHandles,
                    dataProcessed,
                    labelY: 'Frequency'
                })),
            m("div",
                {
                    style: {
                        "display": "inline-block",
                        "vertical-align": "top",
                        "width": "20%",
                        "margin": "20px"
                    }
                },
                rightMenu
            )
        );
    }
}


export let anySort = (a, b) => {
    if (a === undefined || b === undefined) return 0;
    if (typeof a['Label'] === 'number') return a['Label'] - b['Label'];
    if (typeof a['Label'] === 'string') return a['Label'].localeCompare(b['Label']);
    return comparableSort(a, b);
};

export function comparableSort(a, b) {
    if (a['Label'] === b['Label']) return 0;
    return (a['Label'] < b['Label']) ? -1 : 1;
}
