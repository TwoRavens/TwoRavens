// import * as mbxClient from '@mapbox/mapbox-sdk';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css'
import m from 'mithril'
import * as d3 from "d3";

window.mapboxgl = mapboxgl;
window.d3 = d3;

mapboxgl.accessToken = 'pk.eyJ1Ijoic2hvZWJveGFtIiwiYSI6ImNrZzhlZGEyeDAydnUydXF4NXltMmpwcWIifQ.R1HkwcfcG0dbQOsSxwBunA'

// Specification


// ```
// m(Mapbox, {
//     *: any attribute may be passed
//     })
// ```

export default class PlotMapbox {
    oncreate({dom}) {
        let map = new mapboxgl.Map({
            container: dom,
            style: 'mapbox://styles/mapbox/streets-v11', // stylesheet location
            center: [7.5, 13.5], // starting position [lng, lat]
            zoom: 3 // starting zoom
        })
        window.map = map;

        var container = map.getCanvasContainer()
        this.svg = d3.select(container).append("svg")
        // this.svg = d3.select(dom)
        //     .append("svg")
            .attr("id", "mappingContainer")
            // .style("position", "absolute")
            // .style("top", 0)
            // .style("left", 0)
            // the svg shouldn't capture mouse events, so we can have pan and zoom from mapbox
            .style("pointer-events", "none");


        // function getD3() {
        //     let bb = document.body.getBoundingClientRect();
        //     let center = map.getCenter();
        //     let zoom = map.getZoom();
        //     // 512 is hardcoded tile size, might need to be 256 or changed to suit your map config
        //     let scale = 512 * 0.5 / Math.PI * Math.pow(2, zoom);
        //
        //     let d3projection = d3.geo.mercator()
        //         .center([center.lng, center.lat])
        //         .translate([bb.width / 2, bb.height / 2])
        //         .scale(scale);
        //
        //     return d3projection;
        // }

        // project any point to map's current state
        function projectPoint(lon, lat) {
            let point = map.project(new mapboxgl.LngLat(lon, lat));
            this.stream.point(point.x, point.y);
        }

        //Projection function
        var transform = d3.geoTransform({point: projectPoint});
        var path = d3.geoPath().projection(transform);

        this.selectors = {};
        this.selectors.points = this.svg
            .append('svg:g')
            .attr('id', 'mapboxPoints')
            .selectAll('circle')

        this.update = () => this.selectors.points.attr("d", point => {
            let temp = path(point)
            console.log(temp);
            return temp
        });

        // Every time the map changes, update the dots
        map.on("viewreset", this.update);
        map.on("move", this.update);
        map.on("moveend", this.update);


        // this.map.on('load', function() {
        //     let el = document.createElement('div');
        //     el.className = 'geo-point';
        //     new mapboxgl.Marker(el)
        //         .setLngLat([-74.5, 40])
        //         .addTo(this.map);
        // })
    }

    onupdate({attrs}) {
        let {points} = attrs;

        // console.log("points", points);

        this.selectors.points = this.selectors.points.data(points, _ => _)
        this.selectors.points.exit().remove()

        let newPoints = this.selectors.points.enter().append('svg:circle')
            // .attr('id', point => "trPoint");

        console.log(newPoints);
        this.selectors.points = this.selectors.points.merge(newPoints);

        // ~~~
        newPoints
            // .append('svg:circle')
            .attr("class", "points")
            .style("fill", "salmon")
            .style("pointer-events", "all")
    }

    view() {
        return m(`div`, {
            style: {width: '100%', height: '100%'}
        })
    }
}
