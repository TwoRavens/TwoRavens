// import * as mbxClient from '@mapbox/mapbox-sdk';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css'
import m from 'mithril'
import * as d3 from "d3";
import PlotVegaLite from "./PlotVegaLite";

mapboxgl.accessToken = 'pk.eyJ1Ijoic2hvZWJveGFtIiwiYSI6ImNrZzhlZGEyeDAydnUydXF4NXltMmpwcWIifQ.R1HkwcfcG0dbQOsSxwBunA'

// Specification


// ```
// m(Mapbox, {
//     *: any attribute may be passed
//     })
// ```

export default class PlotMapbox {

    onupdate({attrs, dom}) {
        let {data} = attrs;
        if (!data) return

        if (this.projection !== undefined) return

        let map = new mapboxgl.Map({
            container: dom.querySelector("#mapboxContainer"),
            style: 'mapbox://styles/mapbox/streets-v11', // stylesheet location
            center: [
                // longitude
                (circular_mean(data.map(v => v.geometry.coordinates[0] / 180 + 1)) - 1) * 90,
                // latitude
                data.reduce((sum, v) => sum + v.geometry.coordinates[1], 0) / data.length
            ],
            zoom: 3 // starting zoom
        })

        this.projection = () => {
            const p = d3.geoTransform({
                point: function (lon, lat) {
                    let point = map.project(new mapboxgl.LngLat(lon, lat));
                    this.stream.point(point.x, point.y);
                }
            });
            p.fitSize = () => {};
            return p;
        };

        // // Every time the map changes, update the dots
        map.on("viewreset", m.redraw);
        map.on("move", m.redraw);
        map.on("moveend", m.redraw);
    }

    view(vnode) {

        let {specification, data} = vnode.attrs;
        return m(`div`, {style: {width: '100%', height: '100%', position: 'relative'}},
            m('div#mapboxContainer', {style: {width: '100%', height: '100%'}}),
            this.projection && m(PlotVegaLite, {
                force: true,
                attrsAll: {style: {position: 'absolute', top: 0, left: 0, 'pointer-events': 'none'}},
                options: {actions: false,
                    config: {
                        "style": {
                            "cell": {
                                "stroke": "transparent"
                            }
                        }
                    }
                },
                specification: Object.assign({
                    data: {values: data},
                    projection: {type: 'mapbox'},
                    background: "transparent"
                }, specification),
                projections: {'mapbox': this.projection}
            }))
    }
}

let circular_mean = data => Math.atan2(
    data.map(v => Math.sin(v)).reduce((sum, v) => sum + v, 0),
    data.map(v => Math.cos(v)).reduce((sum, v) => sum + v, 0))
