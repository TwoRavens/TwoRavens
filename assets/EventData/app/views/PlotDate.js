import m from 'mithril';
import * as d3 from "d3";

// m(PlotDate, {
//     attrsAll: (arbitrary attributes),
//     data: {
//         'gray': [ {'Date': new Date(), 'Freq': 22}, ...],
//         'blue': [ {'Date': new Date(), 'Freq': 12}, ...]
//     },
//     callbackHandles: (handles) => console.log("From: " + handles[0] + " To: " + handles[1])
// })

// If data is passed, the D3 plot will be reconstructed. Otherwise, the plot state will be preserved
// Passed dates must be sorted!

let getFreq = entry => entry.Freq;
let getDate = entry => entry.Date;

export default class PlotDate {

    onupdate(vnode) {
        // TODO: handle locations are not used! this defaults to min and max dates
        let {id, data, handles, callbackHandles} = vnode.attrs;
        if (data === undefined) return;

        let dateSVG = d3.select('#' + id);
        dateSVG.html('');

        let margin = {top: 20, right: 20, bottom: 180, left: 80};
        let margin2 = {top: 430, right: 20, bottom: 80, left: 80};
        let datewidth = +dateSVG.attr("width") - margin.left - margin.right;
        let dateheight = +dateSVG.attr("height") - margin.top - margin.bottom;
        let dateheight2 = +dateSVG.attr("height") - margin2.top - margin2.bottom;

        // The date range needs to be transformed to image width. Range defined here, domain defined below
        // Range of X:
        let datex = d3.scaleTime().range([0, datewidth]),
            datex2 = d3.scaleTime().range([0, datewidth]),
            datey = d3.scaleLinear().range([dateheight, 0]),
            datey2 = d3.scaleLinear().range([dateheight2, 0]);

        let datexAxis = d3.axisBottom(datex),
            datexAxis2 = d3.axisBottom(datex2),
            dateyAxis = d3.axisLeft(datey);

        // Brush and zoom elements
        let datebrush = d3.brushX()
            .extent([[0, 0], [datewidth, dateheight2]])
            .on("brush end", brushed);

        let datezoom = d3.zoom()
            .scaleExtent([1, Infinity])
            .translateExtent([[0, 0], [datewidth, dateheight]])
            .extent([[0, 0], [datewidth, dateheight]])
            .on("zoom", zoomed);

        // Focus data element:
        let datearea = d3.area()
            .curve(d3.curveMonotoneX)
            .x(function (d) {
                return datex(d.Date);
            })
            .y0(dateheight)
            .y1(function (d) {
                return datey(d.Freq);
            });

        // Context data element:
        let datearea2 = d3.area()
            .curve(d3.curveMonotoneX)
            .x(function (d) {
                return datex2(d.Date);
            })
            .y0(dateheight2)
            .y1(function (d) {
                return datey2(d.Freq);
            });

        // Set the svg metadata:
        dateSVG.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", datewidth)
            .attr("height", dateheight);

        // Add svg groups for the focus and context portions of the graphic
        let datefocus = dateSVG.append("g")
            .attr("class", "focus")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        let datecontext = dateSVG.append("g")
            .attr("class", "context")
            .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

        // Invoked on initialization and interaction
        function brushed() {
            if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
            let s = d3.event.selection || datex2.range();

            datex.domain(s.map(datex2.invert, datex2));
            datefocus.select(".area").attr("d", datearea);
            datefocus.select(".areaUser").attr("d", datearea);
            datefocus.select(".axis--x").call(datexAxis)
                .selectAll("text")
                .attr("transform", "rotate(45)")
                .style("text-anchor", "start");
            dateSVG.select(".zoom").call(datezoom.transform, d3.zoomIdentity
                .scale(datewidth / (s[1] - s[0]))
                .translate(-s[0], 0));

            callbackHandles(s.map(datex2.invert).map(x => new Date(x.getTime())));
        }

        function zoomed() {
            if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
            let t = d3.event.transform;
            datex.domain(t.rescaleX(datex2).domain());
            datefocus.select(".area").attr("d", datearea);
            datefocus.select(".areaUser").attr("d", datearea);
            datefocus.select(".axis--x").call(datexAxis)
                .selectAll("text")
                .attr("transform", "rotate(45)")
                .style("text-anchor", "start");
            datecontext.select(".brush").call(datebrush.move, datex.range().map(t.invertX, t));
        }

        // Set calendar ranges
        let datemin = d3.min(Object.keys(data).map(color => d3.min(data[color], getDate)), getDate);
        let datemax = d3.max(Object.keys(data).map(color => d3.max(data[color], getDate)), getDate);
        let freqmax = d3.max(Object.keys(data).map(color => d3.max(data[color], getFreq)), getFreq);

        datex.domain([datemin, datemax]);
        datey.domain([0, freqmax]);
        datex2.domain(datex.domain());
        datey2.domain(datey.domain());

        // Draw data on focus portion of svg (datefocus) with the area variable attribute
        Object.keys(data).forEach(color => {
            datefocus.append("path")
                .datum(data[color])
                .style('fill', color)
                .style("clip-path", "url(#clip)")
                .attr('d', datearea);

            datecontext.append("path")
                .datum(data[color])
                .style("fill", "#ADADAD")
                .attr("class", "area")
                .attr("d", datearea2);
        });

        // Add x and y axes to focus group
        datefocus.append("g")
            .attr("class", "dateFocusX axis axis--x")
            .attr("transform", "translate(0," + dateheight + ")")
            .call(datexAxis)
            .selectAll("text")
            .attr("transform", "rotate(45)")
            .style("text-anchor", "start");

        datefocus.append("g")
            .attr("class", "axis axis--y")
            .call(dateyAxis);

        // Add x axis to context group
        datecontext.append("g")
            .attr("class", "dateContextX axis axis--x")
            .attr("transform", "translate(0," + dateheight2 + ")")
            .call(datexAxis2)
            .selectAll("text")
            .attr("transform", "rotate(45)")
            .style("text-anchor", "start");

        // Add brushes to context group
        datecontext.append("g")
            .attr("class", "brush")
            .call(datebrush)
            .call(datebrush.move, datex.range());

        dateSVG.append("rect")
            .attr("class", "zoom")
            .attr("width", datewidth)
            .attr("height", dateheight)
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(datezoom);

        dateSVG.append("datecontext");

        dateSVG.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0)
            .attr("x", 0 - (dateheight / 2))
            .attr("dy", "2em")
            .style("text-anchor", "middle")
            .text("Frequency");
    }

    view(vnode) {
        let {id, attrsAll} = vnode.attrs;
        return m(`div#${id}`, attrsAll)
    }
}
