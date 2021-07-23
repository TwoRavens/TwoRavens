// retrieve data for, and render a vega-lite specification
// replaces data transforms with equivalent mongo queries
// transforms are replaced by database queries so that aggregations and sampling are applied before loading data on the frontend

import m from 'mithril';
import * as queryMongo from '../manipulations/queryMongo';
import * as app from '../app';
import * as common from '../../common/common';
import {alignmentData, locationUnits, mongoURL} from "../app";
import {geojsonData, setMetadata} from "../eventdata/eventdata";
import PlotMapbox from "./PlotMapbox";
import PlotVegaLite from "./PlotVegaLite";
import {setDeep, setDefaultDeep} from "../utils";

export default class PlotVegaLiteQuery {
    oninit() {
        this.baseQuery = undefined;
        this.datasets = {};
        this.isLoading = {};
    }

    view(vnode) {
        let {mapping, getData, specification} = vnode.attrs;
        let {abstractQuery, summaries, sampleSize, variablesInitial} = vnode.attrs;
        let {initViewport, setInitViewport} = vnode.attrs;

        if (isNaN(sampleSize)) sampleSize = 5000;

        abstractQuery = abstractQuery || [];

        // unload all if base query changed
        let baseQuery = JSON.stringify(abstractQuery);
        if (baseQuery !== this.baseQuery) {
            this.baseQuery = baseQuery;
            this.datasets = {};
        }

        // strip down schema, re-add if data is loaded
        let specificationStripped = Object.assign({}, specification);
        delete specificationStripped.layer;
        delete specificationStripped.vconcat;
        delete specificationStripped.hconcat;

        // load each data source if not loaded
        ([
            specification,
            ...(specification.layer || []),
            ...(specification.vconcat || []),
            ...(specification.hconcat || [])
        ])
            .forEach(layer => {
                // skip the root level if layers are present
                if (!layer.encoding) return;
                let {query, datasets} = getQuery(abstractQuery, layer, summaries, sampleSize, variablesInitial);
                let compiled = JSON.stringify(query);
                if (!(compiled in this.datasets) && !(compiled in this.isLoading)) {
                    this.datasets[compiled] = undefined;
                    this.isLoading[compiled] = true;

                    // m.request data
                    getData({
                        method: 'aggregate',
                        query: compiled,
                        datasets,
                        comment: {message: 'preparing custom data visualization layer', specification: layer}
                    }).then(data => {
                        this.datasets[compiled] = data;
                        this.isLoading[compiled] = false;
                        setTimeout(m.redraw, 10)
                    })

                    if (layer.encoding.region) {
                        let unit = summaries[layer.encoding.region.field].locationUnit;
                        if (unit && (unit in app.locationUnits)) {
                            m.request({
                                url: mongoURL + 'get-metadata',
                                method: 'POST',
                                body: {alignments: [unit], geojson: [app.locationUnits[unit][0]]}
                            }).then(setMetadata).then(m.redraw)
                        }
                    }
                }

                if (this.datasets[compiled]) {
                    layer.data = {values: this.datasets[compiled]};
                    delete layer.transform;
                }
            });

        if (specification.data) {
            specificationStripped.data = specification.data;
            delete specificationStripped.transform
        }

        let pruneSpec = label => {
            let subSpec = (specification[label] || []).filter(layer => layer.data?.values);
            if (subSpec.length > 0) specificationStripped[label] = subSpec;
        };
        pruneSpec('layer');
        pruneSpec('hconcat');
        pruneSpec('vconcat');

        if (mapping && !translateGeojson(specificationStripped, summaries)) return;

        let countData = spec => [spec, ...(spec.layer || [])].filter(layer => layer.data?.values).length;
        if ([specificationStripped, ...(specificationStripped.vconcat || []), ...(specificationStripped.hconcat || [])]
            .every(layer => countData(layer) === 0)) {
            if (Object.values(this.isLoading).some(_=>_))
                return common.loader('plotLoader')
            return
        }

        // draw plot
        return m(mapping ? PlotMapbox : PlotVegaLite, {specification: specificationStripped, initViewport, setInitViewport})
    }
}

// n linearly spaced points between min and max
let linspace = (min, max, n) => Array.from({length: n})
    .map((_, i) => min + (max - min) / (n - 1) * i);


let translateVegaLite = (transforms, summaries) => transforms.flatMap(transform => {

    if ('aggregate' in transform) {
        let pipelinePre = [];
        let pipelinePost = [
            {
                $addFields: transform.groupBy.reduce((fields, grouper) => Object.assign(fields, {
                    [grouper]: '$_id\\.' + grouper
                }), {})
            },
            // {
            //     $project: {_id: 0}
            // }
        ];

        let isOrderStatistic = measure => ['q1', 'median', 'q3'].includes(measure.op);
        let orderStatistics = transform.aggregate.filter(isOrderStatistic);

        if (orderStatistics.length > 1)
            throw "aggregations may not contain multiple order statistics with a MongoDB backend";
        if (orderStatistics.length === 1) {
            if (!transform.aggregate.find(measure => measure.op === 'count'))
                transform.aggregate.push({op: 'count', as: 'tworavensInternalCount'});
            pipelinePre.push({$sort: {[orderStatistics[0].field]: 1}});
        }

        let getAggregator = measure => {
            // postprocess stdDev to variance
            if (measure.op === 'variance')
                pipelinePost.push({$addFields: {[measure.as]: {$pow: ['$' + measure.as, 2]}}});

            if (isOrderStatistic(measure)) {
                let countMeasure = transform.aggregate.find(measure => measure.op === 'count');
                let divisor = {'q1': 4 / 1, 'median': 4 / 2, 'q3': 4 / 3}[measure.op];
                // index the ordered statistic from the ordered array
                pipelinePost.push({
                    $addFields: {
                        [measure.as]: {
                            $arrayElemAt: [
                                "$" + measure.as,
                                {$toInt: {$divide: ["$" + countMeasure.as, divisor]}}]
                        }
                    }
                });
            }

            return ({
                count: {$sum: 1},
                valid: {$sum: {$cond: [{$ne: ['$' + measure.field, undefined]}, 1, 0]}},
                missing: {$sum: {$cond: [{$ne: ['$' + measure.field, undefined]}, 0, 1]}},
                sum: {$sum: '$' + measure.field},
                mean: {$avg: '$' + measure.field},
                'absolute mean': {$avg: {$abs: '$' + measure.field}},
                average: {$avg: '$' + measure.field},
                stdDev: {$stdDevSamp: '$' + measure.field},
                variance: {$stdDevSamp: '$' + measure.field}, // this is postprocessed by pipelinePost
                min: {$min: '$' + measure.field},
                max: {$max: '$' + measure.field},
                q1: {$push: '$' + measure.field},
                median: {$push: '$' + measure.field},
                q3: {$push: '$' + measure.field},
                first: {$first: '$' + measure.field},
                last: {$last: '$' + measure.field},
                push: {$push: '$' + measure.field},
                addToSet: {$addToSet: '$' + measure.field}
            })[measure.op];
        };

        return [
            ...pipelinePre,
            {
                $group: transform.aggregate.reduce((_id, measure) => Object.assign(_id, {
                        [measure.as]: getAggregator(measure)
                    }),
                    {
                        _id: transform.groupBy.reduce((_id, identifier) => Object.assign(_id, {
                            [identifier]: '$' + identifier
                        }), {})
                    })
            },
            ...pipelinePost
        ];
    }

    if ('bin' in transform) {
        // only for continuous variables
        let partitions = linspace(summaries[transform.field].min, summaries[transform.field].max, 10);
        return {
            $addFields: {
                [transform.as + '_end']: {
                    $switch: {
                        branches: partitions.map(partition => ({
                            case: {$lte: ['$' + partition, partition]}, then: partition
                        })),
                        default: undefined // pos infinity
                    }
                },
                [transform.as]: {
                    $switch: {
                        branches: partitions.reverse().map(partition => ({
                            case: {$gte: ['$' + partition, partition]}, then: partition
                        })),
                        default: undefined // neg infinity
                    }
                }
            }
        }
    }

    if ('calculate' in transform) return {
        $addFields: {
            [transform.as]: queryMongo.buildEquation(
                transform.calculate.replace('datum.', ''),
                Object.keys(summaries)).query
        }
    };

    if ('filter' in transform) {
        let getBranch = query => {
            // need a way to build a function with match syntax, not aggregate syntax, may not work
            if (typeof query === 'string') return queryMongo.buildEquation(
                query.filter.replace('datum.', ''),
                Object.keys(summaries)).query;

            if ('and' in query) return {$and: query.and.map(getBranch)};
            if ('or' in query) return {$or: query.or.map(getBranch)};
            if ('equal' in query) return {['$' + query.field]: {$eq: query.equal}};

            if ('lt' in query) return {['$' + query.field]: {$lt: query.lt}};
            if ('gt' in query) return {['$' + query.field]: {$gt: query.gt}};
            if ('lte' in query) return {['$' + query.field]: {$lte: query.lte}};
            if ('gte' in query) return {['$' + query.field]: {$gte: query.gte}};

            if ('range' in query) return {['$' + query.field]: {$gte: query.range[0], $lte: query.range[1]}};
            if ('oneOf' in query) return {['$' + query.field]: {$in: query.oneOf}};
        };
        return getBranch(transform)
    }

    if ('flatten' in transform) {
        let steps = transform.flatten.map(field => ({$unwind: field}));
        if ('as' in transform) {
            steps.push({$addFields: transform.as.reduce((fields, fieldName, i) => Object.assign(fields, {
                    [transform.as[i]]: '$' + transform.flatten[i]
                }), {})});
            steps.push({$project: transform.flatten.reduce((fields, fieldName) => Object.assign(fields, {
                    [fieldName]: 0
                }), {})});
        }
        return steps;
    }

    if ('pivot' in transform) return [
        {
            $group: {
                _id: transform.groupBy.reduce((_id, field) => Object.assign(_id, {
                    [field]: '$' + field
                }), {}),
                items: {
                    $addToSet: {
                        name: '$' + transform.pivot,
                        value: '$' + transform.value
                    }
                }
            }
        },
        {
            $project: {
                temp: Object.assign({
                        $arrayToObject:
                            {$zip: {inputs: ["$items\\.name", "$items\\.value"]}}
                    },
                    transform.groupBy.reduce((out, field) => Object.assign(out, {
                        ['temp\\.' + field]: '$_id\\.' + field
                    }), {}))
            }
        },
        {
            $replaceWith: {newRoot: "$temp"}
        }
    ];

    if ('sample' in transform) return [{$sample: {size: transform.sample}}];

    if ('fold' in transform) {
        if (!transform.as) transform.as = ['key', 'value'];
        return [
            {
                $facet: transform.fold.reduce((facets, variable) => Object.assign(facets, {[variable]: [
                        {$addFields: {[transform.as[0]]: variable, [transform.as[1]]: '$' + variable}},
                        {$project: {[variable]: 0, _id: 0}}
                    ]}), {})
            },
            {
                $project: {'combine': {$setUnion: transform.fold.map(variable => '$' + variable)}}
            },
            {
                $unwind: "$combine"
            },
            {
                $replaceRoot: {newRoot: "$combine"}
            },
            {
                $project: {_id: 0}
            },
            {
                $sort: {[transform.as[0]]: 1}
            }
        ]
    }
});


let getQuery = (abstractQuery, layer, summaries, sampleSize, variablesInitial) => {

    let datasets;
    let dataQuery = [];
    if (abstractQuery) {
        let result = queryMongo.buildPipeline([...abstractQuery, ...(layer.manipulations || [])], variablesInitial);
        dataQuery.push(...result['pipeline']);
        datasets = result['datasets'];
    }
    if (layer.transform)
        dataQuery.push(...translateVegaLite(layer.transform, summaries));
    dataQuery.push({$project: {_id: 0}});
    // projecting down to columns in fields is not necessarily faster, because it can cause cache misses
    dataQuery.push({$sample: {size: sampleSize}});

    return {'query': dataQuery, datasets};
};

let translateGeojson = (specification, summaries) => {
    if ('layer' in specification) {
        specification.layer = specification.layer.filter(layer => translateGeojsonLayer(layer, summaries));
        specification.layer.forEach(layer => delete layer.selection);
        return true
    }
    else
        return translateGeojsonLayer(specification, summaries)
}

let translateGeojsonLayer = (layer, summaries) => {
    if (!layer.data) return;

    if (layer.encoding?.region) {
        let unit = summaries[layer.encoding.region.field].locationUnit;
        // from the format in the geojson file
        if (!(unit in locationUnits)) return;
        let fromFormat = locationUnits[unit][0];
        // to the format currently is use
        let toFormat = summaries[layer.encoding.region.field].locationFormat;

        let alignment = alignmentData[unit];
        if (!(fromFormat in geojsonData) || !alignment) return;

        // make a lookup table for the alignment
        let alignmentLookup = alignment.reduce((out, align) => Object.assign(out, {[align[fromFormat]]: align[toFormat]}), {});

        // make a lookup table for geo features- from current format value to geojson representation
        let geoLookup = geojsonData[fromFormat].features
            .reduce((out, feature) => Object.assign(out, {[alignmentLookup[feature.properties[fromFormat]]]: feature}), {});

        layer.data.values = Object.assign({}, geojsonData[fromFormat], {
            features: layer.data.values.map(row => {
                let toFormatValue = row[layer.encoding.region.field];
                return Object.assign({}, geoLookup[toFormatValue], row)
            })
                .filter(feature => feature?.geometry)
        })
    } else if (layer.encoding?.latitude && layer.encoding?.longitude) {
        layer.data.values.forEach(point => Object.assign(point, {
            type: 'Feature', geometry: {
                type: 'Point',
                coordinates: [point[layer.encoding.longitude.field], point[layer.encoding.latitude.field]]
            }
        }));
        layer.data.values = {features: layer.data.values};
    } else return

    setDeep(layer, ['data', 'format', 'property'], 'features');
    delete layer.encoding?.latitude;
    delete layer.encoding?.longitude;
    delete layer.encoding?.region;
    layer.mark = {"type": "geoshape", clip: true};
    setDefaultDeep(layer, ['encoding', 'opacity'], {value: 0.75})
    return true
}
