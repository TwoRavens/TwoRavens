import m from 'mithril';
import * as d3 from "d3";

// m(PlotContinuous, {
//     attrsAll: (arbitrary attributes),
//     data: {
//         'gray': [ {'Label': new Date(), 'Freq': 22}, ...],
//         'blue': [ {'Label': new Date(), 'Freq': 12}, ...]
//     },
//     callbackHandles: (handles) => console.log("From: " + handles[0] + " To: " + handles[1]),
//     disableBrushes: false,
//     lines: [ X values to draw lines at ]
// })

// If data is passed, the D3 plot will be reconstructed. Otherwise, the plot state will be preserved
// Passed data must be sorted!

let getFreq = entry => entry.Freq;
let getLabel = entry => entry.Label;

export default class PlotContinuous {
    oncreate(vnode) {
        this.plot(vnode)
    }

    onupdate(vnode) {
        this.plot(vnode)
    }

    plot(vnode) {
        let {data, callbackHandles, labelY, disableBrushes, lines} = vnode.attrs;
        if (data === undefined) return;

        // Set Y ranges
        let min = d3.min(Object.keys(data).map(color => d3.min(data[color], getLabel)));
        let max = d3.max(Object.keys(data).map(color => d3.max(data[color], getLabel)));
        let freqmax = d3.max(Object.keys(data).map(color => d3.max(data[color], getFreq)));

        let SVG = d3.select(vnode.dom);
        SVG.html('');

        let bound = SVG.node().getBoundingClientRect();


        let margin = {top: 25, right: 20, bottom: 180, left: 80};
        let margin2 = {top: 430, right: 20, bottom: 80, left: 80};
        let width = +bound.width - margin.left - margin.right;
        let height = +bound.height - margin.top - margin.bottom;
        let height2 = +bound.height - margin2.top - margin2.bottom;

        if (disableBrushes) {
            margin = {top: 25, right: 20, bottom: 80, left: 80};
            height = +bound.height - margin.top - margin.bottom;
        }


        // The range needs to be transformed to image width. Range defined here, domain defined below
        // Range of X:
        let x, x2;
        if (typeof min === 'object') {
            x = d3.scaleTime().range([0, width]).domain([min, max]);
            x2 = d3.scaleTime().range([0, width]).domain(x.domain());
        } else {
            x = d3.scaleLinear().range([0, width]).domain([min, max]);
            x2 = d3.scaleLinear().range([0, width]).domain(x.domain());
        }
        let y = d3.scaleLinear().range([height, 0]).domain([0, freqmax]);
        let y2 = d3.scaleLinear().range([height2, 0]).domain(y.domain());

        let xAxis = d3.axisBottom(x),
            xAxis2 = d3.axisBottom(x2),
            yAxis = d3.axisLeft(y);

        // Brush and zoom elements
        let brush = d3.brushX()
            .extent([[0, 0], [width, height2]])
            .on("brush end", brushed);

        let zoom = d3.zoom()
            .scaleExtent([1, Infinity])
            .translateExtent([[200, 0], [width, height]])
            .extent([[0, 0], [width, height]])
            .on("zoom", zoomed);

        // Focus data element:
        let area = d3.area()
            .curve(d3.curveMonotoneX)
            .x(function (d) {
                return x(d.Label);
            })
            .y0(height)
            .y1(function (d) {
                return y(d.Freq);
            });

        // Context data element:
        let area2 = d3.area()
            .curve(d3.curveMonotoneX)
            .x(function (d) {
                return x2(d.Label);
            })
            .y0(height2)
            .y1(function (d) {
                return y2(d.Freq);
            });

        // Set the svg metadata:
        SVG.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", width)
            .attr("height", height);

        // Add svg groups for the focus and context portions of the graphic
        let focus = SVG.append("g")
            .attr("class", "focus")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        let context = !disableBrushes && SVG.append("g")
            .attr("class", "context")
            .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

        // Invoked on initialization and interaction
        function brushed(e) {
            if (disableBrushes || e.sourceEvent && e.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
            let s = e.selection || x2.range();

            x.domain(s.map(x2.invert, x2));
            Object.keys(data).forEach((color, i) => focus.select(".area" + i).attr("d", area));
            focus.select(".axis--x").call(xAxis)
                .selectAll("text")
                .attr("transform", "rotate(45)")
                .style("text-anchor", "start");
            SVG.select(".zoom").call(zoom.transform, d3.zoomIdentity
                .scale(width / (s[1] - s[0]))
                .translate(-s[0], 0));

            (callbackHandles || Function)(s.map(x2.invert));
        }

        function zoomed(e) {
            if (disableBrushes || e?.sourceEvent?.type === "brush") return; // ignore zoom-by-brush
            let t = e.transform;
            x.domain(t.rescaleX(x2).domain());
            focus.select(".area").attr("d", area);
            focus.select(".axis--x").call(xAxis)
                .selectAll("text")
                .attr("transform", "rotate(45)")
                .style("text-anchor", "start");
            // !disableBrushes && context.select(".brush").call(brush.move, x.range().map(t.invertX, t));
        }

        // Draw data on focus portion of svg (focus) with the area variable attribute
        Object.keys(data).forEach((color, i) => {
            focus.append("path")
                .datum(data[color])
                .style('fill', color)
                .attr("class", "area" + i)
                .style("clip-path", "url(#clip)")
                .attr('d', area);

            !disableBrushes && context.append("path")
                .datum(data[color])
                .style("fill", color)
                .attr("class", "area" + i)
                .style("clip-path", "url(#clip)")
                .attr("d", area2);
        });

        if (lines) {
            focus.selectAll('line')
                .data(lines)
                .enter()
                .append('line')
                .attr("x1", x)
                .attr("y1", 0)
                .attr("x2", x)
                .attr("y2", height)
                .style("stroke-width", 2)
                .style("stroke", "rgb(4, 23, 52)")
                .style("stroke-dasharray", 3);

            !disableBrushes && context.selectAll('line')
                .data(lines)
                .enter()
                .append('line')
                .attr("x1", x2)
                .attr("y1", 0)
                .attr("x2", x2)
                .attr("y2", height2)
                .style("stroke-width", 2)
                .style("stroke", "rgb(4, 23, 52)")
                .style("stroke-dasharray", 3);
        }

        // Add x and y axes to focus group
        focus.append("g")
            .attr("class", "FocusX axis axis--x")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis)
            .selectAll("text")
            .attr("transform", "rotate(45)")
            .style("text-anchor", "start");

        focus.append("g")
            .attr("class", "axis axis--y")
            .call(yAxis);

        // Add x axis to context group
        !disableBrushes && context.append("g")
            .attr("class", "ContextX axis axis--x")
            .attr("transform", "translate(0," + height2 + ")")
            .call(xAxis2)
            .selectAll("text")
            .attr("transform", "rotate(45)")
            .style("text-anchor", "start");

        // Add brushes to context group
        !disableBrushes && context.append("g")
            .attr("class", "brush")
            .call(brush)
            .call(brush.move, x.range());

        SVG.append("rect")
            .attr("class", "zoom")
            .attr("width", width)
            .attr("height", height)
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(zoom);

        !disableBrushes && SVG.append("context");

        SVG.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0)
            .attr("x", 0 - (height / 2))
            .attr("dy", "2em")
            .style("text-anchor", "middle")
            .text(labelY || "Frequency");
    }

    view(vnode) {
        let {id, attrsAll} = vnode.attrs;
        return m(`svg#${id.replace(/ /g,"_")}[width=100%][height=100%]`, attrsAll)
    }
}
