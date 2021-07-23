import m from 'mithril';
import * as d3 from "d3";
import * as common from '../../../common/common';

import '../../../css/plotBars.css';

// m(PlotBars, {
//     data: [..., { "key": "A", "value": 23, "class": "bar" }],
//     orientation: "horizontal" or "vertical",
//     callbackBar: (bar) => console.log(bar + " was clicked!")
// });


export default class PlotBars {

    onupdate(vnode) {this.plot(vnode)}
    oncreate(vnode) {this.plot(vnode)}

    plot(vnode) {
        let {data, orient, callbackBar, margin, xLabel, yLabel} = vnode.attrs;
        if (data === undefined) return;
        let horizontal = orient === 'horizontal';

        let svg = d3.select(vnode.dom);

        svg.html('');

        // set the dimensions and margins of the graph
        let bound = svg.node().getBoundingClientRect();
        let width = bound.width - margin.left - margin.right;
        let height = bound.height - margin.top - margin.bottom;

        let x = d3.scaleBand()
            .range([0, horizontal ? width : height])
            .padding(0.1).domain(data.map(d => d.key));
        let y = d3.scaleLinear()
            .range(horizontal ? [height, 0] : [0, width])
            .domain([0, d3.max(data, d => d.value)]);

        // tooltip
        let tooltip = d3.select('#plotTooltip');
        if (tooltip.empty()) tooltip = d3.select('body')
            .append("div")
            .attr('id', 'plotTooltip')
            .style("position", "absolute")
            .style("z-index", "10")
            .style("pointer-events", "none")
            .style("background", common.colors.menu)
            .style("border", common.colors.border)
            .style("padding", "4px")
            .style("margin-top", '-20px')
            .attr("class", "tooltip");

        // graphing area
        let g = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // axes
        g.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(horizontal ? x : y));

        g.append("g")
            .attr("class", "axis axis--y")
            .call(d3.axisLeft(horizontal ? y : x)) // use .ticks(10, "%") for percents
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", "0.71em");

        let barClick = (e, d) =>  {
            if (!callbackBar) return;
            callbackBar(d);
            m.redraw();
        };

        let tooltipMove = (e, d) => {
            // only show the tooltip if a title has been set
            if (!d.title) return;
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(d.title)
                .style("left", (e.pageX) + "px")
                .style("top", (e.pageY - 28) + "px");
        };

        let tooltipOut = () => {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0)
        };

        // transparent bar that covers entire area
        g.selectAll(".bar")
            .data(data)
            .enter().append("rect")
            .attr("x", d => horizontal ? x(d.key) : 0)
            .attr("y", d => horizontal ? 0 : x(d.key))
            .attr("width", horizontal ? x.bandwidth() : width)
            .attr("height", horizontal ? width : x.bandwidth())
            .style("fill-opacity", 0)
            .style("z-index", 20)
            .on("click", barClick)
            .on("mousemove", tooltipMove)
            .on("mouseout", tooltipOut);

        // visible bar rendered in background
        g.selectAll(".bar")
            .data(data)
            .enter().append("rect")
            .attr("class", d => d.class || "bar")
            .attr("x", d => horizontal ? x(d.key) : 0)
            .attr("y", d => horizontal ? y(d.value) : x(d.key))
            .attr("width", horizontal ? x.bandwidth() : d => y(d.value))
            .attr("height", horizontal ? d => height - y(d.value) : x.bandwidth())
            .on("click", barClick)
            .on("mousemove", tooltipMove)
            .on("mouseout", tooltipOut);

        // axis labels
        let label = horizontal ? yLabel : xLabel;
        label && svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 10)
            .attr("x", 0 - (height / 2))
            .style("text-anchor", "middle")
            .text(label);

        label = horizontal ? xLabel : yLabel;
        label && svg.append("text")
            .attr("transform", "translate(" + (width / 2) + " ," + (height + margin.top + margin.bottom - 10) + ")")
            .style("text-anchor", "middle")
            .text(label);

        // make a stripe pattern svg def available
        let pattern = svg.append("defs").append("pattern")
            .attr("id", "plotBarsStripes")
            .attr("width", 20)
            .attr("height", 20)
            .attr("patternUnits", "userSpaceOnUse");
        pattern.append("line").attr("x1", 0).attr("y1", -5).attr("x2", 25).attr("y2", 20)
            .attr("style", "stroke:#419641; stroke-width:5;");
        pattern.append("line").attr("x1", -5).attr("y1", 10).attr("x2", 10).attr("y2", 25)
            .attr("style", "stroke:#419641; stroke-width:5;");
    }

    view(vnode) {
        let {id, attrsAll} = vnode.attrs;
        return m(`svg#${id.replace(/ /g,"_")}[width=100%][height=100%]`, attrsAll)
    }
}
