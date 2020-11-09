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
        let map = dom.value = new mapboxgl.Map({
            container: dom,
            style: 'mapbox://styles/mapbox/streets-v11', // stylesheet location
            center: [7.5, 13.5], // starting position [lng, lat]
            zoom: 3 // starting zoom
        })
        window.map = map;

        // var container = map.getCanvasContainer()
        let bb = dom.getBoundingClientRect();
        // this.svg = d3.select(container).append("svg")
        this.svg = d3.select(dom).append("svg")
            .attr("id", "mappingContainer")
            .style("position", "absolute")
            .style("top", 0)
            .style("left", 0)
            .attr("width", bb.width)
            .attr("height", bb.height)
            // the svg shouldn't capture mouse events, so we can have pan and zoom from mapbox
            .style("pointer-events", "none");

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
            .attr("width", bb.width)
            .attr("height", bb.height)
            .attr('id', 'mapboxPoints')
            .selectAll('circle')

        this.update = () => this.selectors.points.attr("d", path);

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
        if (!points) return

        // console.log(d3.extent(points.map(p => p.color)))
        var colors = d3.scaleLinear()
            .domain(d3.ticks(...d3.extent(points.map(p => p.color)), 11))
            .range([
                "#5E4FA2", "#3288BD", "#66C2A5", "#ABDDA4", "#E6F598",
                "#FFFFBF", "#FEE08B", "#FDAE61", "#F46D43", "#D53E4F", "#9E0142"
            ]);

        // console.log("points", points);
        // points.map(p => console.log(`https://www.google.com/maps/@${p.geometry.coordinates.join(',')},6z`))
        this.selectors.points = this.selectors.points.data(points, p => JSON.stringify(p))
        this.selectors.points.exit().remove()

        let newPoints = this.selectors.points.enter().append('svg:path')

        this.selectors.points = this.selectors.points.merge(newPoints);

        // newPoints
        //     // .append('svg:circle')
        //     .attr("class", "points")
        //     .style("fill", "salmon")
        //     .style("pointer-events", "all")

        this.selectors.points.style("fill", p => colors(p.color));
        this.update()
    }

    view() {
        return m(`div`, {
            style: {width: '100%', height: '100%'}
        })
    }
}
