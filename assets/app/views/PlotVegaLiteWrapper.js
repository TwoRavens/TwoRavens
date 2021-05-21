// wrapper for using PlotVegaLiteQuery and PlotVegaLiteEditor together
// translates a tworavens plot configuration to a vega-lite plot specification

import m from 'mithril';

import TwoPanel from "../../common/views/TwoPanel";
import PlotVegaLiteQuery from "./PlotVegaLiteQuery";
import PlotVegaLiteEditor, {schemes} from "./PlotVegaLiteEditor";

export default class PlotVegaLiteWrapper {

    oninit() {
        let clientWidth = document.body.clientWidth;
        this.rightPanelSize = 70;
        let leftPixels = Math.max(clientWidth * (1 - this.rightPanelSize / 100), 500);
        this.rightPanelSize = (clientWidth - leftPixels) / clientWidth * 100;
    }

    view(vnode) {
        let {editor, plot} = preparePanels(vnode.attrs);

        return m(TwoPanel, {
            rightPanelSize: this.rightPanelSize,
            setRightPanelSize: value => this.rightPanelSize = value,
            left: editor,
            right: plot
        })
    }
}

export let preparePanels = state => {
    let {
        mapping, configuration, getData, abstractQuery, summaries, setSummaryAttr,
        categoricals, sampleSize, variablesInitial, initViewport, setInitViewport
    } = state;
    let varTypes = Object.keys(summaries).reduce((types, variable) => Object.assign(types, {
        [variable]: categoricals.has(variable)
            ? 'nominal' : summaries[variable].nature === 'ordinal'
                ? 'quantitative' // using 'ordinal' makes the axis discrete, which breaks sizing
                : 'quantitative'
    }), {});

    window.configuration = configuration;

    let specification;
    try {
        specification = makeSpecification(configuration, varTypes, summaries);
    } catch (err) {
        console.warn(err);
    }

    let plot;
    if (specification) {

        let countEncodings = spec => [spec, ...(spec.layer || [])]
            .reduce((sum, layer) => sum + Object.keys(layer.encoding || {}).length, 0);
        let encodingsCount = [
            specification,
            ...(specification.vconcat || []),
            ...(specification.hconcat || [])
        ].map(countEncodings).reduce((sum, count) => sum + count, 0);

        // either region or both latitude and longitude need to be set for mapping
        let isValidMapLayer = spec => spec?.encoding?.region?.field
            || (spec?.encoding?.latitude?.field && spec?.encoding?.longitude?.field);

        if (mapping) {
            if (specification.layer) {
                specification.layer = specification.layer.filter(isValidMapLayer);
                if (specification.layer.length === 0) encodingsCount = 0;
            } else if (!isValidMapLayer(specification)) encodingsCount = 0;
        }

        // 5px margin keeps the drag bar visible
        plot = encodingsCount > 0 && m('div[style=margin-left:5px;height:100%]',
            m(PlotVegaLiteQuery, {
                mapping,
                getData,
                specification,
                abstractQuery,
                summaries,
                sampleSize,
                variablesInitial,
                initViewport, setInitViewport
            }))
    }

    return {
        editor: m(PlotVegaLiteEditor, {
            mapping,
            configuration,
            variables: Object.keys(summaries),
            summaries, setSummaryAttr,
            categoricals,
            abstractQuery
        }),
        plot
    }
}

let makeSpecification = (configuration, varTypes, summaries) => {

    let specification = {
        "$schema": "https://vega.github.io/schema/vega-lite/v4.json"
    };

    // base encodings/transforms
    Object.assign(specification, makeLayer(configuration, varTypes, summaries));

    if ('layer' in configuration) {
        specification.layer = configuration.layer.map(layer => makeLayer(layer, varTypes, summaries)).filter(v=>v);
        let baseLayer = Object.assign({}, specification);
        let layerKeys = new Set(['data', 'encoding', 'mark', 'transform', 'manipulations']);
        Object.keys(baseLayer).forEach(k => delete (layerKeys.has(k) ? specification : baseLayer)[k])
        specification.layer.unshift(baseLayer)
        specification.resolve = {
            scale: {
                color: "independent",
                x: configuration.resolve_x || 'shared',
                y: configuration.resolve_y || 'shared'
            }
        }
    }

    let concat = 'vconcat' in configuration ? 'vconcat' : ('hconcat' in configuration) && 'hconcat';

    if (concat) {
        specification[concat] = [
            {
                mark: specification.mark,
                transform: specification.transform,
                encoding: specification.encoding,
                layer: specification.layer
            },
            ...configuration[concat].map(layer => makeLayer(layer, varTypes, summaries)).filter(_=>_)
        ];
        delete specification.mark;
        delete specification.transform;
        delete specification.encoding;
        delete specification.layer;
    }

    return specification;
};


let makeLayer = (layer, varTypes, summaries) => {
    let channels = (layer.channels || [])
        .filter(channel => !channel.delete && (channel.variable || channel.variables?.length || channel.colorValue));
    if (channels.length === 0) return;
    let orientation = channels.find(channel => channel.name === 'primary axis')?.orientation || 'x';
    let spec = {};
    spec.manipulations = layer.manipulations;

    if ('mark' in layer) spec.mark = {type: layer.mark};
    if ('mapboxStyle' in layer) spec.mapboxStyle = layer.mapboxStyle;

    if (['line', 'area'].includes(layer.mark)) {
        if (layer.interpolation) spec.mark.interpolate = layer.interpolation;
        if (layer.point) spec.mark.point = layer.point;
    }

    if (!('nice' in layer)) layer.nice = true;

    if (layer.mark === "region") {
        spec.transform = spec.transform || [];
        let regionChannel = channels.find(channel => channel.name === "region");
        if (!regionChannel) return;
        spec.transform.push({
            aggregate: channels
                .filter(channel => channel.name !== "region")
                .map(channel => ({
                    op: channel.aggregation || "mean",
                    field: channel.variable,
                    as: channel.variable
                })),
            groupBy: [regionChannel.variable]
        })
    }

    spec.encoding = channels.reduce((encodings, channel) => {
        if (channel.name === 'primary axis') {
            return Object.assign(encodings, {
                [orientation]: {
                    // bin: configuration.bin,
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

        if (channel.name === "color") {
            if (!channel.variable) return Object.assign(encodings, {
                [channel.name]: {value: channel.colorValue}
            })
            let varType = varTypes[channel.variable] || 'nominal';
            let scale = {zero: layer.zero ?? false, nice: layer.nice ?? false};
            let schemeCategory = channel.schemeCategory || (summaries[channel.variable]?.numchar === "character" ? 'categorical' : 'sequential-single');
            if (schemes[schemeCategory].includes(channel.scheme?.[schemeCategory]))
                scale.scheme = channel.scheme?.[schemeCategory];
            return Object.assign(encodings, {
                [channel.name]: {
                    field: channel.variable,
                    type: varType,
                    scale
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