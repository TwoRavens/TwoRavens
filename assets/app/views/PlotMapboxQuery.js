import PlotMapbox from "./PlotMapbox";
import * as queryMongo from "../manipulations/queryMongo";
import m from 'mithril';

export default class PlotMapboxQuery {
    view({attrs}) {

        let {getData, configuration} = attrs;
        let {abstractQuery, sampleSize, variablesInitial} = attrs;
        if (isNaN(sampleSize)) sampleSize = 5000;

        if (configuration.mark === 'point' && (!configuration.latitude || !configuration.longitude))
            return

        let mappingQuery = configuration.mark === "point" ? [
            {
                type: 'menu',
                metadata: {
                    type: 'data',
                    variables: [configuration.latitude, configuration.longitude, configuration.color].filter(_ => _),
                    limit: sampleSize
                }
            }
        ] : []

        let baseQuery = JSON.stringify([
            ...queryMongo.buildPipeline([...abstractQuery || [], ...mappingQuery], variablesInitial)['pipeline'],
            // {
            //     $project: {
            //         lat: `$${configuration.latitude}`,
            //         lon: `$${configuration.longitude}`,
            //         color: `$${configuration.color}`
            //     }
            // },
            {
                $group: {
                    _id: {lat: `$${configuration.latitude}`, lon: `$${configuration.longitude}`},
                    color: {$avg: `$${configuration.color}`}
                }
            },
            {
                $project: {
                    lat: `$_id\\.lat`,
                    lon: `$_id\\.lon`,
                    color: `$color`
                }
            },
        ])

        // unload all if base query changed
        if (baseQuery !== this.baseQuery) {
            this.baseQuery = baseQuery;
            this.dataset = undefined;
        }

        if (!this.dataset && !this.isLoading) {
            this.isLoading = true;

            getData({method: 'aggregate', query: baseQuery}).then(data => {
                this.dataset = data.map(point => ({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [point.lon, point.lat]
                    },
                    color: point.color
                }));
                this.isLoading = false;
                m.redraw()
                setTimeout(m.redraw, 200);
            });
        }


        return m(PlotMapbox, {
            data: this.dataset,
            specification: {
                mark: {"type": "geoshape"},
                data: {values: this.dataset},
                encoding: {
                    color: {field: 'color', 'type': 'quantitative'}
                }
            }
        })
    }
}