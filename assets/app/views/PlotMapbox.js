// render a vega-lite specification over a mapbox layer

import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css'
import geoViewport from '@mapbox/geo-viewport';
import m from 'mithril'
import * as vega from 'vega';
import * as d3 from "d3";
import vegaEmbed from "vega-embed";
import * as common from "../../common/common";

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;


// Specification


// ```
// m(Mapbox, {
//     *: any attribute may be passed
//     specification: vega-lite specification with custom lat, lon, region channels
//     initViewport: {center: [lon, lat], zoom: int} map initialization view
//     setInitViewport: view => console.log("setter for updating initial viewport")
//     })
// ```

export let mapStyles = {
    'streets': 'streets-v11',
    'light': 'light-v10',
    'dark': 'dark-v10',
    'outdoors': 'outdoors-v11',
    'satellite': 'satellite-v9'
}
let getMapStyle = name => `mapbox://styles/mapbox/${mapStyles[name] || mapStyles.light}`

export default class PlotMapbox {

    oncreate({dom}) {
        this.vegaContainer = dom.querySelector("#vegaContainer");
        this.mapboxContainer = dom.querySelector("#mapboxContainer")
    }

    onupdate({attrs, dom}) {
        let {specification, initViewport, setInitViewport} = attrs;
        specification.mapboxStyle = specification.mapboxStyle || {light: 'light', dark: 'dark'}[common.theme];
        let {width, height} = dom.getBoundingClientRect();
        window.specification = specification;
        delete specification.selection;
        if (this.map === undefined) {
            let bounds = [
                specification.data?.values?.features || [],
                ...(specification.layer || []).map(layer => layer.data.values.features)
            ].flatMap(getOuter).reduce(
                ([w, s, e, n], [x, y]) => [Math.min(w, x), Math.min(s, y), Math.max(e, x), Math.max(n, y)],
                [180, 90, -180, -90]);

            this.style = specification.mapboxStyle;

            let map = this.map = new mapboxgl.Map(Object.assign({
                container: this.mapboxContainer,
                style: getMapStyle(this.style), // stylesheet location
                // center: getLocationCenter(bounds),
                scrollZoom: true,
            }, initViewport || geoViewport.viewport(bounds, [width, height])))

            // register a d3 geoJSON stream transformation of a mapboxgl projection as a vega projection for vega-embed
            vega.projection('mapbox', () => {
                const p = d3.geoTransform({
                    point: function (lon, lat) {
                        let point = map.project(new mapboxgl.LngLat(
                            Math.max(-180, Math.min(lon, 180)),
                            Math.max(-90, Math.min(lat, 90))));
                        this.stream.point(point.x, point.y);
                    }
                });
                p.fitSize = () => {
                };
                return p;
            });
        }

        if (this.style !== specification.mapboxStyle) {
            this.map.setStyle(getMapStyle(specification.mapboxStyle))
            this.style = specification.mapboxStyle
        }

        if (this.update) {
            this.map.off("viewreset", this.update);
            this.map.off("move", this.update);
            this.map.off("moveend", this.update);
        }

        this.update = () => {
            let center = this.map.getCenter();
            setInitViewport(Object.assign({zoom: this.map.getZoom(), center: [center.lng, center.lat]}));
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

        // Every time the map changes, update the dots
        this.map.on("viewreset", this.update);
        this.map.on("move", this.update);
        this.map.on("moveend", this.update);

        this.update();
    }

    view({attrs}) {
        let vegaStyle = {position: 'absolute', top: '-5px', left: '-4px'};
        if (!!attrs.specification?.selection) vegaStyle['pointer-events'] = 'none';

        return m(`div`, {style: {width: 'calc(100% - 100px)', height: '100%', position: 'relative'}},
            m('div#mapboxContainer', {style: {width: '100%', height: '100%'}}),
            m('div#vegaContainer', {style: vegaStyle}))
    }
}

// retrieve the outer layer of points in a flat array. useful for approximating the center
let getOuter = data => data.flatMap(v => {
    if (!v?.geometry?.type) return []
    if (v.geometry.type === "Point")
        return [v.geometry.coordinates]
    if (v.geometry.type === "LineString")
        return v.geometry.coordinates;
    if (v.geometry.type === "Polygon")
        return v.geometry.coordinates[0]; // only take outermost layer
    if (v.geometry.type === "MultiPoint")
        return v.geometry.coordinates;
    if (v.geometry.type === "MultiLineString")
        return v.geometry.coordinates.flatMap(v => v)
    if (v.geometry.type === "MultiPolygon")
        return v.geometry.coordinates.flatMap(v => v[0])
    if (v.geometry.type === "GeometryCollection")
        return v.geometry.geometries.flatMap(geom => getOuter({geometry: geom}))
    return []
})


// let circularMean = data => Math.atan2(
//     data.map(v => Math.sin(v)).reduce((sum, v) => sum + v, 0),
//     data.map(v => Math.cos(v)).reduce((sum, v) => sum + v, 0))
//
// let getLocationCenter = bounds => {
//     let [lons, lats] = bounds.reduce(([lons, lats], elem) => {
//         lons.push(elem[0]);
//         lats.push(elem[1]);
//         return [lons, lats];
//     }, [[], []]);
//
//     return [
//         // longitude
//         circularMean(lons.map(v => v / 180)) * 180,
//         // latitude
//         lats.reduce((sum, v) => sum + v, 0) / lats.length
//     ]
// }