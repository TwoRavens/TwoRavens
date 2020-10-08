import * as common from '../../common/common'
import m from 'mithril';
import PlotBars from "./views/PlotBars";
import ButtonRadio from "../../common/views/ButtonRadio";
import {alignmentData, formattingData} from "../app";
import TextField from "../../common/views/TextField";
import {omniSort} from "../utils";

// the text that separates any two observations in the manual selection text field
let delimiter = ' ';

export default class CanvasDiscrete {
    view(vnode) {
        let {mode, data, metadata, preferences, formats, alignments} = vnode.attrs;

        let masterColumn = metadata['columns'][0];
        let masterFormat = (formats || {})[masterColumn] || masterColumn;
        let alignment = (alignments || {})[masterColumn];

        let allData = {};

        // used for aggregation
        preferences['alignment'] = alignment;
        preferences['aggregation'] = preferences['aggregation'] || masterFormat; // the format to accumulate to

        preferences['format'] = preferences['format'] || masterFormat;
        preferences['selections'] = preferences['selections'] || new Set();

        preferences['selections_temp'] = preferences['selections_temp'] || '';

        if (data.length === 0) return 'No data from "' + masterColumn + '" is matched.';
        let allSelected = {};

        if (alignment) {

            let flattenedData = data.reduce((out, entry) => {
                if (masterColumn in entry) out.set(entry[masterColumn], entry['total']);
                return out;
            }, new Map());

            metadata['formats'].forEach(format => {
                allData[format] = new Map();
                allSelected[format] = new Map();
            });
            alignmentData[alignment].forEach(equivalency => {
                metadata['formats'].forEach(format => {
                    let isSet = preferences['selections'].has(equivalency[masterFormat]);
                    if (allSelected[format].has(equivalency[format]))
                        allSelected[format].get(equivalency[format]).push(isSet);
                    else
                        allSelected[format].set(equivalency[format], [isSet]);

                    allData[format].set(equivalency[format],
                        (allData[format].get(equivalency[format]) || 0) +     // preserve the existing value, or 0 if new
                        (flattenedData.get(equivalency[masterFormat]) || 0))  // add the equivalent sum from the data, or 0 if no data matched
                })
            })
        } else {
            allData[masterFormat] = new Map();
            allSelected[masterFormat] = new Map();

            data.forEach(point => {
                let isSet = preferences['selections'].has(point[masterColumn]);
                if (allSelected[masterFormat].has(point[masterColumn]))
                    allSelected[masterFormat].get(point[masterColumn]).push(isSet);
                else
                    allSelected[masterFormat].set(point[masterColumn], [isSet]);

                allData[masterFormat].set(point[masterColumn],
                    (allData[masterFormat].get(point[masterColumn]) || 0) + point.total);
            });
        }

        // change the size of the graph based on the number of available plots
        let getShape = (format) => {
            if ([...allData[format].keys()].filter(key => allData[format].get(key)).length > 50) return {
                "height": 20 * [...allData[format].keys()].filter(key => allData[format].get(key)).length + 'px',
                "width": "calc(100% - 10px)"
            };
            if (Object.keys(allData).length === 1 || mode === 'aggregation') return {
                "height": "100%",
                "width": "calc(100% - 10px)"
            };
            return {
                "height": "100%",
                "width": "calc(50% - 10px)"
            };
        };

        let createPlot = (format, dataView, selections) => {
            let maxCharacters = 0;

            // resize left margin to keep labels within svg. If greater than 25 keys, then ignore zero-value keys
            let keepZeros = dataView.size <= 25;
            let keepKeys = [...dataView.keys()]
                .filter(key => key !== undefined && (keepZeros || dataView.get(key) !== 0));
            keepKeys.forEach(entry => maxCharacters = Math.max(String(entry).length, maxCharacters));

            let total = keepKeys.map(key => dataView.get(key)).reduce((total, value) => total + value, 0);

            let plotData = keepKeys
                .map(key => {
                    let title = (formattingData[format] || {})[key];
                    if (Array.isArray(title)) title = title[0];
                    else if (title !== undefined && typeof title === 'object') title = title['name'];

                    return {
                        key: key,
                        value: dataView.get(key) / total,
                        'class': selections.get(key).every(_ => _)
                            ? 'bar-selected'
                            : selections.get(key).some(_ => _)
                                ? 'bar-some' : 'bar',
                        title: dataView.get(key) + ' ' + (title || 'Records')
                    }
                }).sort((a, b) => omniSort(a.key, b.key));

            return m(".graph-config", {
                    style: common.mergeAttributes({
                        "display": "inline-block",
                        "vertical-align": "top",
                        "margin-right": '10px',
                        "margin-bottom": '10px'
                    }, getShape(format)),
                },
                m(".card-header.text-center", {
                        style: {"float": "left", "padding-top": "9px"}
                    }, m("h3.card-title", format)
                ),
                m("br"),
                m('div', {'style': {'height': 'calc(100% - 40px)'}},
                    m(PlotBars, {
                        id: 'barPlot' + format,
                        margin: {top: 10, right: 30, bottom: 50, left: maxCharacters * 6 + 20},
                        data: plotData,
                        callbackBar: (bar) => {
                            let target_state = bar.class === 'bar-some' || bar.class === 'bar';

                            if (alignment) {
                                alignmentData[alignment]
                                    .filter(equivalency => equivalency[format] === bar.key)
                                    .forEach(equivalency => target_state
                                        ? preferences['selections'].add(equivalency[preferences['format']])
                                        : preferences['selections'].delete(equivalency[preferences['format']]))
                            } else target_state
                                ? preferences['selections'].add(bar.key)
                                : preferences['selections'].delete(bar.key);

                            preferences['selections_temp'] = [...preferences['selections']].join(delimiter)
                        },
                        orient: 'vertical',
                        yLabel: 'Density'
                    })
                )
            );
        };

        let setSelectedFromText = text => {
            preferences['selections_temp'] = text;
            let potentialMap = [...allData[masterFormat].keys()]
                .reduce((out, key) => Object.assign(out, {[key]: key}), {});
            preferences['selections'] = new Set(text.split(delimiter)
                .filter(value => value in potentialMap).map(value => potentialMap[value]));
        };

        return m("#canvasDiscrete", {
                style: {
                    height: '100%',
                    'padding-top': common.panelMargin,
                    width: `calc(100% + ${common.panelMargin})`
                }
            },

            m(ButtonRadio, {
                id: 'btnRadioAllNone',
                title: 'select all or none',
                sections: [{value: 'all'}, {value: 'none'}],
                activeSection: {0: 'none', [data.length]: 'all'}[preferences.selections.size] || 'intermediate',
                onclick: state => {
                    if (state === 'none') {
                        preferences.selections = new Set();
                        preferences.selections_temp = '';
                    }
                    if (state === 'all') {
                        preferences.selections = [];
                        data.forEach(entry => preferences.selections.push(entry[metadata.columns[0]]));
                        preferences.selections = new Set(preferences.selections.sort());
                        preferences.selections_temp = [...preferences.selections].join(delimiter);
                    }
                },
                attrsAll: {style: {width: '10em'}}
            }),
            m(TextField, {
                placeholder: 'Enter variable values',
                style: {display: 'inline', width: 'calc(100% - 14em)', 'margin-left': '2em'},
                value: preferences['selections_temp'],
                oninput: setSelectedFromText,
                onblur: setSelectedFromText
            }),

            mode === 'aggregate' && 'formats' in metadata && metadata['formats'].length > 1 && m(ButtonRadio, {
                id: 'aggregationFormat',
                onclick: format => preferences['aggregation'] = format,
                activeSection: preferences['aggregation'],
                sections: metadata['formats'].map(format => ({value: format})),
                attrsAll: {"style": {"width": "auto", 'margin': '1em'}}
            }),
            m("#SVGbin", {
                    style: {
                        "display": "inline-block",
                        "height": "calc(100% - 10px)",
                        "width": "100%"
                    }
                },
                Object.keys(allData)
                    .filter(format => mode !== 'aggregate' || format === preferences['aggregation']) // only render one plot in aggregation mode
                    .sort((a, b) => allData[a].size - allData[b].size)
                    .map(format => createPlot(format, allData[format], allSelected[format]))
            )
        );
    }
}
