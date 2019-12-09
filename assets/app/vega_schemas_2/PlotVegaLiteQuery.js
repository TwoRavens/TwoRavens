import m from 'mithril';
import PlotVegaLite from "../views/PlotVegaLite";
import * as queryMongo from '../manipulations/queryMongo';

export default class PlotVegaLiteQuery {
    oninit() {
        this.baseQuery = undefined;
        this.datasets = {};
        this.isLoading = {};
    }

    view(vnode) {
        let {getData, specification} = vnode.attrs;

        let {abstractQuery, summaries} = vnode.attrs;

        // unload all if base query changed
        let baseQuery = JSON.stringify(abstractQuery);
        if (baseQuery !== this.baseQuery) this.datasets = {};

        // load each data source if not loaded
        ([
            specification,
            ...(specification.layers || []),
            ...(specification.vconcat || []),
            ...(specification.hconcat || [])
        ])
            .filter(layer => 'transform' in layer)
            .forEach(layer => {
                let layerSchema = JSON.stringify(layer);
                if (!(layerSchema in this.datasets) && !(layerSchema in this.isLoading)) {
                    this.datasets[layerSchema] = undefined;
                    this.isLoading[layerSchema] = true;
                    let dataQuery = [];
                    if (abstractQuery)
                        dataQuery.push(...queryMongo.buildPipeline(abstractQuery, workspace.variablesInitial)['pipeline']);
                    if (layer.transform)
                        dataQuery.push(...translateVegaLite(layer.transform, summaries));

                    getData(dataQuery).then(data => {
                        this.datasets[layerSchema] = data;
                        this.isLoading[layerSchema] = false;
                    });
                }
            });

        // strip down schema, re-add if data is loaded
        let specificationStripped = Object.assign({}, specification);
        delete specificationStripped.layers;
        delete specificationStripped.vconcat;
        delete specificationStripped.hconcat;

        let baseSpecification = JSON.stringify(specification);
        if (baseSpecification in this.datasets) {
            if (!this.datasets[baseSpecification]) return;
            specification.data = {values: this.datasets[baseSpecification]};
        }

        let pruneSpec = label => {
            let subSpec = (specification[label] || [])
                .filter(layer => JSON.stringify(layer) in this.datasets)
                .map(layer => Object.assign({data: {values: this.datasets[JSON.stringify(layer)]}}, layer));
            if (subSpec.length > 0) specificationStripped[label] = subSpec;
        };
        pruneSpec('level');
        pruneSpec('hconcat');
        pruneSpec('vconcat');

        // draw plot
        return m(PlotVegaLite, {specification: specificationStripped})
    }
}

// n linearly spaced points between min and max
let linspace = (min, max, n) => Array.from({length: n})
    .map((_, i) => min + (max - min) / (n - 1) * i);


let translateVegaLite = (transforms, summaries) => transforms.flatMap(transform => {

    if ('aggregate' in transform) {
        let pipelinePre = [];
        let pipelinePost = [];

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
            if (measure.op === 'variance') pipelinePost.push(
                {$addFields: {variance: {$pow: ['$' + measure.field, 2]}}},
                {$project: {[measure.field]: 0}},
            );

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
                average: {$avg: '$' + measure.field},
                stdDev: {$stdDevSamp: measure.field},
                min: {$min: '$' + measure.field},
                max: {$max: '$' + measure.field},
                q1: {$push: measure.field},
                median: {$push: measure.field},
                q3: {$push: measure.field}
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
});