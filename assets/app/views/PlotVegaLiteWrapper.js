import m from 'mithril';

import TwoPanel from "../../common/views/TwoPanel";
import PlotVegaLiteQuery from "./PlotVegaLiteQuery";
import PlotVegaLiteEditor from "./PlotVegaLiteEditor";
import PlotMapbox from "./PlotMapbox";
import PlotVegaLite from "./PlotVegaLite";

export default class PlotVegaLiteWrapper {

    view(vnode) {
        let {mapping, configuration, getData, abstractQuery, summaries, nominals, sampleSize, variablesInitial} = vnode.attrs;
        let varTypes = Object.keys(summaries).reduce((types, variable) => Object.assign(types, {
            [variable]: nominals.has(variable)
                ? 'nominal' : summaries[variable].nature === 'ordinal'
                    ? 'quantitative' // using 'ordinal' makes the axis discrete, which breaks sizing
                    : 'quantitative'
        }), {});

        window.configuration = configuration;

        let specification;
        try {
            specification = makeSpecification(configuration, varTypes);
        } catch (err) {
            console.warn(err);
        }

        let plot;
        if (specification) {
            let countEncodings = spec => [spec, spec.layers || []]
                .reduce((sum, layer) => sum + Object.keys(layer.encoding || {}).length, 0);
            let encodingsCount = [
                specification,
                ...(specification.vconcat || []),
                ...(specification.hconcat || [])
            ].map(countEncodings).reduce((sum, count) => sum + count, 0);

            // both need to be set for mapping
            if (mapping && (!specification?.encoding?.latitude?.field || !specification?.encoding?.longitude?.field))
                encodingsCount = 0

            // 5px margin keeps the drag bar visible
            plot = encodingsCount > 0 && m('div[style=margin-left:5px;height:100%]', m(PlotVegaLiteQuery, {
                component: mapping ? PlotMapbox : PlotVegaLite,
                getData,
                specification,
                abstractQuery,
                summaries,
                sampleSize,
                variablesInitial,
                mapping
            }))
        }

        return m(TwoPanel, {
            left: m(PlotVegaLiteEditor, {
                mapping,
                configuration,
                variables: Object.keys(summaries)
            }),
            right: plot
        })
    }
}

let makeSpecification = (configuration, varTypes) => {

    let specification = {
        "$schema": "https://vega.github.io/schema/vega-lite/v4.json"
    };

    // base encodings/transforms
    Object.assign(specification, makeLayer(configuration, varTypes));

    if ('layers' in configuration)
        specification.layer = configuration.layers.map(layer => makeLayer(layer, varTypes)).filter(_=>_);

    let concat = 'vconcat' in configuration ? 'vconcat' : ('hconcat' in configuration) && 'hconcat';

    if (concat) {
        specification[concat] = [
            {
                mark: specification.mark,
                transform: specification.transform,
                encoding: specification.encoding,
                layer: specification.layer
            },
            ...configuration[concat].map(layer => makeLayer(layer, varTypes)).filter(_=>_)
        ];
        delete specification.mark;
        delete specification.transform;
        delete specification.encoding;
        delete specification.layer;
    }

    return specification;
};


let makeLayer = (layer, varTypes) => {
    let channels = (layer.channels || [])
        .filter(channel => !channel.delete && (channel.variable || (channel.variables || []).length));
    if (channels.length === 0) return;
    let orientation = channels.find(channel => channel.name === 'primary axis')?.orientation || 'x';
    let spec = {};

    if ('mark' in layer) spec.mark = {type: layer.mark};
    if (['line', 'area'].includes(layer.mark)) {
        if (layer.interpolation) spec.mark.interpolate = layer.interpolation;
        if (layer.point) spec.mark.point = layer.point;
    }

    if (!('nice' in layer)) layer.nice = true;

    spec.encoding = channels.reduce((encodings, channel) => {
        if (channel.name === 'primary axis') {
            return Object.assign(encodings, {
                [orientation]: {
                    bin: configuration.bin,
                    field: channel.variable,
                    type: varTypes[channel.variable],
                    scale: {zero: layer.zero ?? false, nice: layer.nice ?? false}
                }
            })
        }

        if (channel.name === 'secondary axis') {
            if ((channel.variables || []).length === 0) return encodings;
            if (!channel.variables.every(variable => varTypes[variable] === varTypes[channel.variables[0]])) {
                throw "Type mismatch. Types of secondary variables must match"
            }

            spec.transform = spec.transform || [];

            if (channel.variables.length === 1) {
                if (channel.aggregation !== 'none') {
                    let field = channel.variables.length === 1
                        ? channel.variables[0]
                        : channel.value;
                    spec.transform.push({
                        aggregate: [{
                            op: channel.aggregation,
                            field,
                            as: field
                        }],
                        groupBy: channels.filter(channel => ['primary axis', 'color', 'detail', 'opacity', 'row', 'column', 'strokeWidth'].includes(channel.name)).map(channel => channel.variable)
                    })
                }

                return Object.assign(encodings, {
                    [orientation === 'x' ? 'y' : 'x']: {
                        field: channel.variables[0],
                        type: varTypes[channel.variables[0]],
                        scale: {zero: layer.zero ?? false, nice: layer.nice ?? false}
                    }
                });
            }

            if (channel.value === "") return
            if (channel.field === "") return

            spec.transform.push({
                fold: channel.variables,
                as: [channel.key, channel.value]
            });

            if (channel.aggregation !== 'none') {
                spec.transform.push({
                    aggregate: [{
                        op: channel.aggregation,
                        field: channel.value,
                        as: channel.value
                    }],
                    groupBy: channels.filter(channel => ['primary axis', 'color', 'detail', 'opacity', 'row', 'column', 'strokeWidth'].includes(channel.name)).map(channel => channel.variable)
                })
            }

            return Object.assign(encodings, {
                [orientation === 'x' ? 'y' : 'x']: {
                    field: channel.value,
                    type: varTypes[channel.variables[0]],
                    scale: {zero: layer.zero ?? false, nice: layer.nice ?? false}
                }
            })
        }

        // all other channels
        return Object.assign(encodings, {
            [channel.name]: {
                field: channel.variable,
                type: varTypes[channel.variable] || 'nominal',
                scale: {zero: layer.zero ?? false, nice: layer.nice ?? false}
            }
        })
    }, {});

    let makeTooltipSpec = variable => ({
        field: variable, type: varTypes[variable] || 'nominal'
    })
    spec.encoding.tooltip = channels
        .filter(channel => !channel.delete)
        .map(channel => channel.variable
            ? makeTooltipSpec(channel.variable)
            : (channel.variables || []).length === 1
                ? makeTooltipSpec(channel.variables[0])
                : makeTooltipSpec(channel.value)).filter(_ => _)

    if (layer.interactive && layer.mark !== 'bars') spec.selection = {
        "grid": {
            "type": "interval", "bind": "scales"
        }
    };
    return spec;
};