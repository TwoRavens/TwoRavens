import m from 'mithril';

import TwoPanel from "../../common/views/TwoPanel";
import PlotVegaLiteQuery from "./PlotVegaLiteQuery";
import PlotVegaLiteConfigure from "./PlotVegaLiteConfigure";

export default class PlotVegaLiteEditor {

    view(vnode) {
        let {configuration, getData, abstractQuery, summaries, nominals} = vnode.attrs;
        let varTypes = Object.keys(summaries).reduce((types, variable) => Object.assign(types, {
            [variable]: nominals.has(variable)
                ? 'nominal' : summaries[variable].nature === 'ordinal'
                    ? 'ordinal'
                    : 'quantitative'
        }), {});

        return m(TwoPanel, {
            left: m(PlotVegaLiteQuery, {
                getData,
                specification: makeSpecification(configuration, varTypes),
                abstractQuery,
                summaries
            }),
            right: m(PlotVegaLiteConfigure, {
                configuration,
                variables: Object.keys(summaries)
            })
        })
    }
}

let makeSpecification = (configuration, varTypes) => {
    return Object.assign(
        {
            "$schema": "https://vega.github.io/schema/vega-lite/v3.json"
        },
        configuration.layers ? {
            layer: (configuration.layers || []).map(layer => makeLayer(layer, varTypes))
        } : {},
        configuration.vconcat ? {
            vconcat: (configuration.vconcat || []).map(layer => makeLayer(layer, varTypes))
        } : {},
        configuration.layers ? {
            hconcat: (configuration.hconcat || []).map(layer => makeLayer(layer, varTypes))
        } : {},
        makeLayer(configuration, varTypes))
};

let makeLayer = (layer, varTypes) => {
    if ((layer.channels || []).length === 0) return {};
    let orientation = (layer.channels || []).find(channel => channel.name === 'primary axis').orientation || 'x';
    let spec = {};

    spec.encodings = layer.channels.reduce((spec, channel) => {
        if (channel.name === 'primary axis') {
            return Object.assign(spec, {
                [orientation]: {field: channel.variable, type: varTypes[channel.variable]}
            })
        }

        if (channel.name === 'secondary axis') {
            if (channel.variables.length === 0) return spec;
            if (!channel.variables.every(variable => varTypes[variable] === varTypes[channel.variables[0]])) {
                throw "Type mismatch. Types of secondary variables must match"
            }
            if (channel.variables.length === 1) return Object.assign({
                [orientation === 'x' ? 'y' : 'x']: {field: channel.variable, type: varTypes[channel.variable]}
            });

            spec.transforms = spec.transforms || [];
            // TODO: add folding transform
            spec.transforms.push({
                fold: '',
                as: 'folded'
            });

            return Object.assign(spec, {
                [orientation === 'x' ? 'y' : 'x']: {field: 'folded', type: varTypes[channel.variables[0]]}
            })
        }

        // TODO: more detailed marks
        if ('mark' in layer) spec.mark = layer.mark;

        // all other channels
        return Object.assign(spec, {
            [channel.name]: {field: channel.variable, type: varTypes[channel.variable]}
        })
    }, {});
    return spec;
};
