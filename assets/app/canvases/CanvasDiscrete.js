import * as common from '../../common/common'
import m from 'mithril';
import PlotBars from "./views/PlotBars";
import ButtonRadio from "../../common/views/ButtonRadio";
import {alignmentData, formattingData} from "../app";
import TextField from "../../common/views/TextField";

// the text that separates any two observations in the manual selection text field
let delimiter = ' ';

export default class CanvasDiscrete {
    view(vnode) {
        let {mode, data, metadata, preferences, formats, alignments} = vnode.attrs;

        let masterColumn = metadata['columns'][0];
        let format = (formats || {})[masterColumn] || masterColumn;
        let format_original = format;
        let alignment = (alignments || {})[masterColumn];

        let allData = {};

        // used for aggregation
        preferences['alignment'] = alignment;
        preferences['aggregation'] = preferences['aggregation'] || format; // the format to accumulate to

        preferences['format'] = preferences['format'] || format;
        preferences['selections'] = preferences['selections'] || new Set();

        preferences['selections_temp'] = preferences['selections_temp'] || '';

        if (data.length === 0) return 'No data from "' + masterColumn + '" is matched.';
        let allSelected = {};

        let flattenedData = data.reduce((out, entry) => {
            if (metadata.columns[0] in entry) out[entry[metadata.columns[0]]] = entry['total'];
            return out;
        }, {});

        // console.log('----> flattenedData' + JSON.stringify([equivalency[format]]));

        if (alignment) {
            metadata['formats'].forEach(format => {
                allData[format] = {};
                allSelected[format] = {};
            });
            alignmentData[alignment].forEach(equivalency => {
                metadata['formats'].forEach(format => {

                    let isSet = preferences['selections'].has(equivalency[format_original]);
                    if (equivalency[format] in allSelected[format])
                        allSelected[format][equivalency[format]].push(isSet);
                    else
                        allSelected[format][equivalency[format]] = [isSet];

                    //console.log('----> [equivalency[format]]' + JSON.stringify([equivalency[format]]));

                    allData[format][equivalency[format]] =
                        (allData[format][equivalency[format]] || 0) +     // preserve the existing value, or 0 if new
                        (flattenedData[equivalency[format_original]] || 0)   // add the equivalent sum from the data, or 0 if no data matched

                })

            })
            // console.log('allSelected - allSelected');
            // console.log(allSelected);
            //
            // console.log('preferences - selections');
            // console.log(preferences['selections']);
            // console.log('---- allData' + JSON.stringify(allData));
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

        let typedLookup = data.reduce((out, entry) => {
            out[entry[metadata.columns[0]]] = entry[metadata.columns[0]];
            return out;
        }, {});

        // console.log('---- typedLookup' + JSON.stringify(typedLookup));


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


            // console.log('---- plotData.format: ' + format);
            // console.log('---- plotData: ', plotData);


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
                            bar.key = typedLookup[bar.key];
                            // console.log("bar key" , bar.key)

                            let target_state = bar.class === 'bar-some' || bar.class === 'bar';

                            if (alignment) {
                                alignmentData[alignment]
                                // .map(x => {
                                //   console.log(x);
                                //   return x;
                                // })
                                    .filter(equivalency => equivalency[format] !== undefined && equivalency[format] === bar.key)
                                    .forEach(equivalency => {
                                      console.log('equivalency', equivalency);
                                      target_state
                                        ? preferences['selections'].add(equivalency[preferences['format']])
                                        : preferences['selections'].delete(equivalency[preferences['format']])})
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
                oninput: value => {
                    preferences['selections_temp'] = value;
                    preferences['selections'] = new Set(value.split(delimiter)
                        .map(value => typedLookup[value]).filter(value => value in typedLookup))
                }
            }),

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
