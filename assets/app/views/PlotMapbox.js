// import * as mbxClient from '@mapbox/mapbox-sdk';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css'
import geoViewport from '@mapbox/geo-viewport';
import m from 'mithril'
import * as vega from 'vega';
import * as d3 from "d3";
import vegaEmbed from "vega-embed";
import {geojsonData} from "../eventdata/eventdata";
import {alignmentData, locationUnits, variableSummaries} from "../app";
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
let getMapStyle = name => `mapbox://styles/mapbox/${mapStyles[name] || mapStyles.streets}`

export default class PlotMapbox {

    oncreate({dom}) {
        this.vegaContainer = dom.querySelector("#vegaContainer");
        this.mapboxContainer = dom.querySelector("#mapboxContainer")
    }

    onupdate({attrs, dom}) {
        let {specification, initViewport, setInitViewport} = attrs;
        specification.mapboxStyle = specification.mapboxStyle || {light: 'streets', dark: 'dark'}[common.theme];
        let {width, height} = dom.getBoundingClientRect();
        let data = specification.data.values;
        if (!data) return

        let isRegional = specification.encoding.region;

        if (isRegional) {

            let unit = variableSummaries[specification.encoding.region.field].locationUnit;
            // from the format in the geojson file
            if (!(unit in locationUnits)) return;
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
            data = Object.assign({}, geojsonData[fromFormat], {
                features: data.map(row => {
                    let toFormatValue = row[specification.encoding.region.field];
                    return Object.assign({}, geoLookup[toFormatValue], row)
                })
            })
            // console.log('data', data)
        } else {
            data.forEach(point => Object.assign(point, {
                type: 'Feature', geometry: {
                    type: 'Point',
                    coordinates: [point[specification.encoding.longitude.field], point[specification.encoding.latitude.field]]
                }
            }));
            data = {features: data};
        }

        specification.data.format = {property: "features"}

        delete specification.encoding.latitude;
        delete specification.encoding.longitude;
        delete specification.encoding.region;
        specification.mark = {"type": "geoshape", clip: true};
        if (!specification.encoding.opacity)
            specification.encoding.opacity = {value: 0.75}

        delete specification.selection;

        if (this.map === undefined && data.features) {
            let bounds = getOuter(data.features).reduce(([w, s, e, n], [x, y]) =>
                [Math.min(w, x), Math.min(s, y), Math.max(e, x), Math.max(n, y)],
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
                        let point = map.project(new mapboxgl.LngLat(lon, lat));
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
            specification.data.values = data;
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

let getOuter = data => data.flatMap(v => {
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