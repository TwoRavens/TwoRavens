import * as app from '../app';
import * as common from '../../../common/common'
import {panelMargin} from '../../../common/common'
import m from 'mithril';
import PlotBars from "./PlotBars";

// because R doesn't have scalars
let coerceArray = (value) => Array.isArray(value) ? value : [value];

export default class CanvasCategorical {
    createPlot(format, data, preferences, shape) {
        let maxCharacters = 0;

        let keepZeros = Object.keys(data).length <= 25;
        let keepKeys = Object.keys(data)
            .filter(key => key !== 'undefined' && (keepZeros || data[key] !== 0));
        keepKeys.forEach(entry => maxCharacters = Math.max(entry.length, maxCharacters));

        let plotData = keepKeys.sort()
            .map((key) => {
                let title = app.formattingData[format][key];
                if (Array.isArray(app.formattingData[format][key])) title = title[0];
                else if (title !== undefined && typeof title === 'object') title = title['name'];

                return {
                    key: key,
                    value: data[key],
                    'class': 'bar',
                    title: data[key] + ' ' + title
                }
            });

        return m(".action_graph_config[id='pentaclass_container']", {
                style: common.mergeAttributes({
                    "display": "inline-block",
                    "vertical-align": "top",
                    "margin-right": '10px',
                    "margin-bottom": '10px'
                }, shape),
            },
            [
                m(".panel-heading.text-center[id='pentaclassLabel']", {
                        style: {"float": "left", "padding-top": "9px"}
                    }, m("h3.panel-title", format)
                ),
                m("br"),
                m('div', {'style': {'height': 'calc(100% - 40px)'}},
                    m(PlotBars, {
                        id: 'barPlot' + format,
                        margin: {top: 10, right: 30, bottom: 50, left: maxCharacters * 5 + 20},
                        data: plotData,
                        // callbackBar: (bar) => {
                        //     let target_state = bar.class === 'bar-some' || bar.class === 'bar';
                        //     actionMap.forEach((penta, i) => {
                        //         if (penta === bar.key) preferences['action_codes'][i] = target_state
                        //     });
                        // },
                        orient: 'vertical',
                        yLabel: 'Frequency'
                    })
                )
            ]
        );
    }

    view(vnode) {
        let {data, metadata, preferences} = vnode.attrs;

        let masterFormat = app.genericMetadata[app.selectedDataset]['formats'][metadata['columns']];
        let allData = {};

        let flattenedData = data.reduce((out, entry) => {
            out[entry[masterFormat]] = entry['total'];
            return out;
        }, {});

        if ('alignments' in metadata) {
            metadata['formats'].forEach(format => allData[format] = {});
            app.alignmentData[coerceArray(metadata['alignments'])[0]].forEach(equivalency => {
                metadata['formats'].forEach(format => allData[format][equivalency[format]] =
                    (allData[equivalency[format]] || 0) +              // preserve the existing value, or 0 if new
                    (flattenedData[equivalency[masterFormat]] || 0))   // add the equivalent sum from the data, or 0 if no data matched
            })
        } else if ('formats' in metadata) {
            allData[masterFormat] = {};
            Object.keys(app.formattingData[masterFormat]).forEach(key => allData[masterFormat][key] = flattenedData[key] || 0)
        }

        // preferences['action_codes'] = preferences['action_codes'] || Array(20).fill(false);
        //
        // let ploverData = data.map((quantity, i) => ({
        //     key: i,
        //     value: quantity,
        //     'class': preferences['action_codes'][i] ? 'bar-selected' : 'bar'
        //     // TODO: 'title': ''
        // }));
        //
        // // determine style
        // let clusteredPreferences = Array(5).fill(0).map(() => []);
        // actionMap.forEach((penta, i) => clusteredPreferences[penta].push(preferences['action_codes'][i]));
        //
        // // determine quantities
        // let clusteredQuantities = Array(5).fill(0);
        // data.forEach((quantity, i) => clusteredQuantities[actionMap[i]] += quantity);
        //
        // let pentaData = Array(5).fill(0).map((_, i) => ({
        //     key: i,
        //     value: clusteredQuantities[i],
        //     'class': clusteredPreferences[i].every(_ => _) ? 'bar-selected' : clusteredPreferences[i].some(_ => _) ? 'bar-some' : 'bar',
        //     // TODO: 'title': ''
        // }));

        // change the size of the graph based on the number of available plots
        let getShape = (format) => {
            if (Object.keys(allData[format]).length > 25) return {
                "height": 20 * Object.keys(allData[format]).length + 'px',
                "width": "calc(100% - 10px)"
            };
            if (Object.keys(allData).length === 1) return {
                "height": "100%",
                "width": "calc(100% - 10px)"
            };
            return {
                "height": "100%",
                "width": "calc(50% - 10px)"
            };
        };

        return (m("#canvasAction", {style: {height: '100%', 'padding-top': panelMargin}},
            m("[id='actionSVGbin']", {
                    style: {
                        "display": "inline-block",
                        "height": "calc(100% - 10px)",
                        "width": "calc(100%)"
                    }
                },
                Object.keys(allData)
                    .sort((a, b) => Object.keys(allData[a]).length - Object.keys(allData[b]).length)
                    .map(format => this.createPlot(format, allData[format], preferences, getShape(format)))
            )
        ));
    }
}