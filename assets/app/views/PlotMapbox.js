// import * as mbxClient from '@mapbox/mapbox-sdk';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css'
import m from 'mithril'
import * as vega from 'vega';
import * as d3 from "d3";
import vegaEmbed from "vega-embed";
import {geojsonData} from "../eventdata/eventdata";
import {alignmentData, locationUnits, variableSummaries} from "../app";

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;


// Specification


// ```
// m(Mapbox, {
//     *: any attribute may be passed
//     })
// ```

export default class PlotMapbox {

    oncreate({dom}) {
        this.vegaContainer = dom.querySelector("#vegaContainer")
        this.defaultElapsedTime = 0;
    }

    onupdate({attrs, dom}) {
        let {specification} = attrs;
        let data = specification.data.values;
        if (!data) return

        let isRegional = specification.encoding.region;

        if (isRegional) {

            let unit = variableSummaries[specification.encoding.region.field].locationUnit;
            // from the format in the geojson file
            let fromFormat = locationUnits[unit][0];
            // to the format currently is use
            let toFormat = variableSummaries[specification.encoding.region.field].locationFormat;

            let alignment = alignmentData[unit];
            if (!(fromFormat in geojsonData) || !alignment) return;

            // make a lookup table for the alignment
            let alignmentLookup = alignment.reduce((out, align) => Object.assign(out, {[align[fromFormat]]: align[toFormat]}), {});

            // console.log('alignmentLookup', alignmentLookup)
            // make a lookup table for geo features- from current format value to geojson representation
            let geoLookup = geojsonData[fromFormat].features
                .reduce((out, feature) => Object.assign(out, {[alignmentLookup[feature.properties[fromFormat]]]: feature}), {});

            // console.log('geoLookup', geoLookup)
            data = Object.assign({}, geojsonData[fromFormat], {features: data.map(row => {
                    let toFormatValue = row[specification.encoding.region.field];
                    return Object.assign({}, geoLookup[toFormatValue], row)
                })})
            // console.log('data', data)

            specification.data.format = {property: "features"}
        } else {
            data.forEach(point => Object.assign(point, {
                type: 'Feature', geometry: {
                    type: 'Point',
                    coordinates: [point[specification.encoding.longitude.field], point[specification.encoding.latitude.field]]
                }
            }));
        }

        delete specification.encoding.latitude;
        delete specification.encoding.longitude;
        delete specification.encoding.region;
        specification.mark = {"type": "geoshape", clip: true};
        if (!specification.encoding.opacity)
            specification.encoding.opacity = {value: 0.75}

        delete specification.selection;

        if (this.map === undefined) {
            let map = this.map = new mapboxgl.Map({
                container: dom.querySelector("#mapboxContainer"),
                style: 'mapbox://styles/mapbox/streets-v11', // stylesheet location
                center: isRegional ? [0, 0] : [
                    // longitude
                    (circular_mean(data.map(v => v.geometry.coordinates[0] / 180 + 1)) - 1) * 90,
                    // latitude
                    data.reduce((sum, v) => sum + v.geometry.coordinates[1], 0) / data.length
                ],
                scrollZoom: true,
                zoom: 3 // starting zoom
            })

            // register a d3 geoJSON stream transformation of a mapboxgl projection as a vega projection for vega-embed
            vega.projection('mapbox', () => {
                const p = d3.geoTransform({
                    point: function (lon, lat) {
                        let point = map.project(new mapboxgl.LngLat(lon, lat));
                        this.stream.point(point.x, point.y);
                    }
                });
                p.fitSize = () => {
                };
                return p;
            });
        }

        let {width, height} = dom.getBoundingClientRect();
        clearTimeout(this.redrawTimer);
        this.redrawTimer = setTimeout(() => {
            this.map.resize();
            update();
        }, this.defaultElapsedTime);

        let updateOnce = () => {
            clearTimeout(this.updateTimer);
            this.updateTimer = setTimeout(update, this.defaultElapsedTime)
        }

        let update = () => {
            let {_sw: {lat: lat_s, lng: lon_w}, _ne: {lat: lat_n, lng: lon_e}} = this.map.getBounds();

            specification.data.values = isRegional ? data : data.filter(point => {
                let [lon_c, lat_c] = point.geometry.coordinates;
                return lat_s < lat_c && lat_c < lat_n && lon_w < lon_c && lon_c < lon_e
            })
            vegaEmbed(
                this.vegaContainer,
                Object.assign(
                    {
                        projection: {type: 'mapbox'},
                        background: "transparent", width, height,
                    },
                    specification),
                {actions: false, config: {"style": {"cell": {"stroke": "transparent"}}}});
        }

        // // Every time the map changes, update the dots
        this.map.on("viewreset", updateOnce);
        this.map.on("move", updateOnce);
        this.map.on("moveend", updateOnce);
    }

    view({attrs}) {
        let vegaStyle = {position: 'absolute', top: '-5px', left: '-5px'};
        if (!!attrs.specification?.selection) vegaStyle['pointer-events'] = 'none';

        return m(`div`, {style: {width: 'calc(100% - 100px)', height: '100%', position: 'relative'}},
            m('div#mapboxContainer', {style: {width: '100%', height: '100%'}}),
            m('div#vegaContainer', {style: vegaStyle}))
    }
}

let circular_mean = data => Math.atan2(
    data.map(v => Math.sin(v)).reduce((sum, v) => sum + v, 0),
    data.map(v => Math.cos(v)).reduce((sum, v) => sum + v, 0))
