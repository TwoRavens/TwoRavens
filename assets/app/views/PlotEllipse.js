import m from 'mithril';

import * as d3 from 'd3';

// m(PlotEllipse, {
//     x: [],
//     y: [],
//     ellipses: [
//         {
//             class: "my-css-class",
//             x: 23, y: 14,
//             angle: 542
//         }
//     ]
// });

export default class PlotEllipse {
    view(vnode) {
        let {id} = vnode.attrs;
        return m('svg', {id, width: '100%', height: '100%'})
    }

    plot(vnode) {

        let {x, y, ellipses} = vnode.attrs;

        let {width, height} = vnode.dom.getBoundingClientRect();

        let selection = d3.select(vnode.dom);
        selection.empty();

        let xExtent = d3.extent(x);
        let yExtent = d3.extent(y);

        let margin = 25,
            xAxis, yAxis,
            svg = selection.append('svg')
                .attr('width', width)
                .attr('height', height)
                .append('g').attr("transform", `translate(${[margin, margin]})`),
            xScale = d3.scaleLinear().range([margin, width + (margin * 2)]).domain(xExtent),
            yScale = d3.scaleLinear().range([height - (margin * 2), 0]).domain(yExtent);

        xAxis = d3.axisBottom().scale(xScale);
        yAxis = d3.axisLeft().scale(yScale);

        ellipses.forEach(ellipse => svg.append('ellipse').attr('class', ellipse.class) // TODO sensible default
            .attr('rx', Math.abs(xScale(xExtent[0] + ellipse.x) - xScale(xExtent[0])))
            .attr('ry', Math.abs(yScale(yExtent[0] + ellipse.y) - yScale(yExtent[0])))
            .attr('transform', 'translate(' + xScale(ellipse.x) + ',' + yScale(ellipse.y) + ')rotate(' + ellipse.angle + ')'));

        svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(" + margin + ",0)")
            .call(yAxis);

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + (height - (2 * margin)) + ")")
            .call(xAxis);

        svg.selectAll("circle").data(x).enter()
            .append("circle")
            .attr("cx", function (d, i) { // TODO can be simplified
                return xScale(x[i]);
            })
            .attr("r", 3)
            .attr("cy", function (d, i) {
                return yScale(y[i]);
            }).style({
            'opacity': 0.5,
            'stroke': '#0af',
            'fill': '#cfc',
            'stroke-width': 1
        });
    }
}