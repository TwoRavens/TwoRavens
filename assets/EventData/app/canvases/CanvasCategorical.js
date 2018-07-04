import * as app from '../app';
import * as common from '../../../common-eventdata/common'
import {panelMargin} from '../../../common-eventdata/common'
import m from 'mithril';
import PlotBars from "../views/PlotBars";
import ButtonRadio from "../../../common-eventdata/views/ButtonRadio";

export default class CanvasCategorical {
    view(vnode) {
        let {mode, data, metadata, preferences} = vnode.attrs;

        let masterFormat = app.genericMetadata[app.selectedDataset]['formats'][app.coerceArray(metadata['columns'])[0]];
        let allData = {};

        preferences['aggregation'] = preferences['aggregation'] || masterFormat;
        preferences['format'] = preferences['format'] || masterFormat;
        preferences['selections'] = preferences['selections'] || new Set();

        if (data.length === 0) return 'No data from "' + app.coerceArray(metadata['columns'])[0] + '" is matched.';
        let allSelected = {};

        let flattenedData = data.reduce((out, entry) => {
            out[entry[masterFormat]] = entry['total'];
            return out;
        }, {});

        if ('alignments' in metadata) {
            metadata['formats'].forEach(format => {
                allData[format] = {};
                allSelected[format] = {};
            });
            app.alignmentData[app.coerceArray(metadata['alignments'])[0]].forEach(equivalency => {
                metadata['formats'].forEach(format => {
                    let isSet = preferences['selections'].has(equivalency[masterFormat]);
                    if (equivalency[format] in allSelected[format])
                        allSelected[format][equivalency[format]].push(isSet);
                    else
                        allSelected[format][equivalency[format]] = [isSet];

                    allData[format][equivalency[format]] =
                        (allData[format][equivalency[format]] || 0) +     // preserve the existing value, or 0 if new
                        (flattenedData[equivalency[masterFormat]] || 0)   // add the equivalent sum from the data, or 0 if no data matched

                })
            })
        } else if ('formats' in metadata) {
            allData[masterFormat] = {};
            allSelected[masterFormat] = {};
            Object.keys(app.formattingData[masterFormat]).forEach(key => {
                allSelected[masterFormat][key] = [preferences['selections'].has(key)];
                allData[masterFormat][key] = flattenedData[key] || 0
            })
        }

        // change the size of the graph based on the number of available plots
        let getShape = (format) => {
            if (Object.keys(allData[format]).length > 25) return {
                "height": 20 * Object.keys(allData[format]).length + 'px',
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

        return m("#canvasCategorical", {style: {height: '100%', 'padding-top': panelMargin}},
            mode === 'aggregate' && app.coerceArray(metadata['formats']).length > 1 && m(ButtonRadio, {
                id: 'aggregationFormat',
                onclick: (format) => preferences['aggregation'] = format,
                activeSection: preferences['aggregation'],
                sections: app.coerceArray(metadata['formats']).map(format => ({value: format})),
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
                    .map(format => this.createPlot(vnode, format, allData[format], allSelected[format], getShape(format)))
            )
        );
    }

    createPlot(vnode, format, data, selections, shape) {
        let {metadata, preferences} = vnode.attrs;
        let maxCharacters = 0;

        // resize left margin to keep labels within svg. If greater than 25 keys, then ignore zero-value keys
        let keepZeros = Object.keys(data).length <= 25;
        let keepKeys = Object.keys(data)
            .filter(key => key !== 'undefined' && (keepZeros || data[key] !== 0));
        keepKeys.forEach(entry => maxCharacters = Math.max(entry.length, maxCharacters));

        let total = keepKeys.map(key => data[key]).reduce((total, value) => total + value);

        let plotData = keepKeys.sort()
            .map((key) => {
                let title = app.formattingData[format][key];
                if (Array.isArray(app.formattingData[format][key])) title = title[0];
                else if (title !== undefined && typeof title === 'object') title = title['name'];

                return {
                    key: key,
                    value: data[key] / total,
                    'class': selections[key].every(_ => _)
                        ? 'bar-selected'
                        : selections[key].some(_ => _)
                            ? 'bar-some' : 'bar',
                    title: data[key] + ' ' + title
                }
            });

        return m(".graph-config", {
                style: common.mergeAttributes({
                    "display": "inline-block",
                    "vertical-align": "top",
                    "margin-right": '10px',
                    "margin-bottom": '10px'
                }, shape),
            },
            [
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
                            let target_state = bar.class === 'bar-some' || bar.class === 'bar';

                            if ('alignments' in metadata) {
                                app.alignmentData[app.coerceArray(metadata['alignments'])[0]]
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
            ]
        );
    }
}