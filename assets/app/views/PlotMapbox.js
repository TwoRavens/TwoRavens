// import * as mbxClient from '@mapbox/mapbox-sdk';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css'
import m from 'mithril'
import * as vega from 'vega';
import * as d3 from "d3";
import vegaEmbed from "vega-embed";

mapboxgl.accessToken = 'pk.eyJ1Ijoic2hvZWJveGFtIiwiYSI6ImNrZzhlZGEyeDAydnUydXF4NXltMmpwcWIifQ.R1HkwcfcG0dbQOsSxwBunA'

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

        data.forEach(point => Object.assign(point, {type: 'Feature', geometry: {
            type: 'Point',
            coordinates: [point[specification.encoding.longitude.field], point[specification.encoding.latitude.field]]
        }}));

        delete specification.encoding.latitude;
        delete specification.encoding.longitude;
        specification.mark = {"type": "geoshape"};

        delete specification.selection;

        if (this.map === undefined) {
            let map = this.map = new mapboxgl.Map({
                container: dom.querySelector("#mapboxContainer"),
                style: 'mapbox://styles/mapbox/streets-v11', // stylesheet location
                center: [
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
            specification.data.values = data.filter(point => {
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
        let vegaStyle = {position: 'absolute', top: 0, left: 0};
        if (!!attrs.specification?.selection) vegaStyle['pointer-events'] = 'none';

        return m(`div`, {style: {width: '100%', height: '100%', position: 'relative'}},
            m('div#mapboxContainer', {style: {width: '100%', height: '100%'}}),
            m('div#vegaContainer', {style: vegaStyle}))
    }
}

let circular_mean = data => Math.atan2(
    data.map(v => Math.sin(v)).reduce((sum, v) => sum + v, 0),
    data.map(v => Math.cos(v)).reduce((sum, v) => sum + v, 0))
