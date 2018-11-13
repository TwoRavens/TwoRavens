import * as common from '../../common-eventdata/common'
import m from 'mithril';
import PlotBars from "./views/PlotBars";
import ButtonRadio from "../../common-eventdata/views/ButtonRadio";
import {alignmentData, formattingData} from "../app";

export default class CanvasDiscrete {
    view(vnode) {
        let {mode, data, metadata, preferences, formats, alignments} = vnode.attrs;

        let masterColumn = metadata['columns'][0];
        let format = (formats || {})[masterColumn] || masterColumn;
        let alignment = (alignments || {})[masterColumn];

        let allData = {};

        // used for aggregation
        preferences['alignment'] = alignment;
        preferences['aggregation'] = preferences['aggregation'] || format; // the format to accumulate to

        preferences['format'] = preferences['format'] || format;
        preferences['selections'] = preferences['selections'] || new Set();

        if (data.length === 0) return 'No data from "' + masterColumn + '" is matched.';
        let allSelected = {};

        let flattenedData = data.reduce((out, entry) => {
            if (metadata.columns[0] in entry) out[entry[metadata.columns[0]]] = entry['total'];
            return out;
        }, {});

        if (alignment) {
            metadata['formats'].forEach(format => {
                allData[format] = {};
                allSelected[format] = {};
            });
            alignmentData[alignment].forEach(equivalency => {
                metadata['formats'].forEach(format => {
                    let isSet = preferences['selections'].has(equivalency[format]);
                    if (equivalency[format] in allSelected[format])
                        allSelected[format][equivalency[format]].push(isSet);
                    else
                        allSelected[format][equivalency[format]] = [isSet];

                    allData[format][equivalency[format]] =
                        (allData[format][equivalency[format]] || 0) +     // preserve the existing value, or 0 if new
                        (flattenedData[equivalency[format]] || 0)   // add the equivalent sum from the data, or 0 if no data matched

                })
            })
        } else if (format) {
            allData[format] = {};
            allSelected[format] = {};
            if (format in formattingData) Object.keys(formattingData[format]).forEach(key => {
                allSelected[format][key] = [preferences['selections'].has(key)];
                allData[format][key] = flattenedData[key] || 0;
            });

            else data.forEach(point => {
                allSelected[format][point[format]] = [preferences['selections'].has(point[format])];
                allData[format][point[format]] = flattenedData[point[format]] || 0;
            })
        }

        // change the size of the graph based on the number of available plots
        let getShape = (format) => {
            if (Math.min(Object.keys(allData[format]).filter(key => allData[format][key]).length) > 25) return {
                "height": 20 * Object.keys(allData[format]).filter(key => allData[format][key]).length + 'px',
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
            let keepZeros = Object.keys(dataView).length <= 25;
            let keepKeys = Object.keys(dataView)
                .filter(key => key !== 'undefined' && (keepZeros || dataView[key] !== 0));
            keepKeys.forEach(entry => maxCharacters = Math.max(entry.length, maxCharacters));

            let total = keepKeys.map(key => dataView[key]).reduce((total, value) => total + value);

            let plotData = keepKeys
                .map(key => {
                    let title = (formattingData[format] || {})[key];
                    if (Array.isArray(title)) title = title[0];
                    else if (title !== undefined && typeof title === 'object') title = title['name'];

                    return {
                        key: key,
                        value: dataView[key] / total,
                        'class': selections[key].every(_ => _)
                            ? 'bar-selected'
                            : selections[key].some(_ => _)
                                ? 'bar-some' : 'bar',
                        title: dataView[key] + ' ' + (title || 'Records')
                    }
                });

            return m(".graph-config", {
                    style: common.mergeAttributes({
                        "display": "inline-block",
                        "vertical-align": "top",
                        "margin-right": '10px',
                        "margin-bottom": '10px'
                    }, getShape(format)),
                },
                m(".panel-heading.text-center", {
                        style: {"float": "left", "padding-top": "9px"}
                    }, m("h3.panel-title", format)
                ),
                m("br"),
                m('div', {'style': {'height': 'calc(100% - 40px)'}},
                    m(PlotBars, {
                        id: 'barPlot' + format,
                        margin: {top: 10, right: 30, bottom: 50, left: maxCharacters * 6 + 20},
                        data: plotData,
                        callbackBar: (bar) => {
                            if (!isNaN(parseFloat(bar.key))) {
                                let foundRecord = data.find(record => String(record[metadata.columns[0]]) === bar.key);
                                if (foundRecord && foundRecord[metadata.columns[0]] !== undefined)
                                    bar.key = foundRecord[metadata.columns[0]];
                            }

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
                        },
                        orient: 'vertical',
                        yLabel: 'Density'
                    })
                )
            );
        };

        return m("#canvasDiscrete", {style: {height: '100%', 'padding-top': common.panelMargin, width: `calc(100% + ${common.panelMargin})`}},
            mode === 'aggregate' && 'formats' in metadata && metadata['formats'].length > 1 && m(ButtonRadio, {
                id: 'aggregationFormat',
                onclick: (format) => preferences['aggregation'] = format,
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
                    .sort((a, b) => Object.keys(allData[a]).length - Object.keys(allData[b]).length)
                    .map(format => createPlot(format, allData[format], allSelected[format]))
            )
        );
    }
}