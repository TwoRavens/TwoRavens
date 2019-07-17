import m from 'mithril';
import {mergeAttributes} from "../../common/common";

import * as d3 from 'd3';

// adapted from this block: https://bl.ocks.org/arpitnarechania/dbf03d8ef7fffa446379d59db6354bac

// m(ConfusionMatrix, {
//     id: 'MyID', // actually important to add if you have a list of matrices, to prevent mithril DOM node reuse
//     data: [list of lists],
//     title: 'My Title',
//     startColor: 'black',
//     endColor: 'white',
//     classes: [list of labels],
//     margin: {left: 10, right: 10, top: 50, bottom: 10}
// })

export default class ConfusionMatrix {
    oninit() {
        this.classes = undefined;
    }

    onupdate(vnode) {
        (vnode.attrs.id !== this.id || !this.classes || vnode.attrs.classes.length !== this.classes.size ||
         !vnode.attrs.classes.every(clss => this.classes.has(clss))) && this.plot(vnode)

        let {width, height} = vnode.dom.getBoundingClientRect();

        if (this.width !== width) {
            this.width = width;
            this.height = height;
            this.plot(vnode);
        }
        if (this.height !== height) {
            this.width = width;
            this.height = height;
            this.plot(vnode);
        }
        // this is more aggressive about updates, but O(n^2) in a hot code path
        // (!this.data || this.data.length === vnode.attrs.data.length &&
        //  vnode.attrs.data.some((row, i) => row.some((cell, j) => cell !== this.data[i][j]))) && this.plot(vnode)
    }

    oncreate(vnode) {
        let {width, height} = vnode.dom.getBoundingClientRect();
        this.width = width;
        this.height = height;
        this.plot(vnode)
    }

    plot(vnode) {

        let {
            id, data, classes, title,
            margin, startColor, endColor,
            xLabel, yLabel
        } = vnode.attrs;

        this.id = id;

        this.classes = new Set(classes);

        if (data === undefined) return;

        let container = d3.select(vnode.dom);
        container.html('');

        let maxValue = d3.max(data, function (layer) {
            return d3.max(layer);
        });
        let minValue = d3.min(data, function (layer) {
            return d3.min(layer);
        });

        // compute how many pixels are necessary for the legend and labels
        let widthLegend = 15 + 7 * String(maxValue).length;

        // set the dimensions and margins of the graph
        let width = this.width - widthLegend - 20;
        let height = this.height;

        if (width < 0 || height < 0) return;

        let numrows = data.length;
        let numcols = data[0].length;

        let fontSize = Math.max(10,Math.round(46/Math.sqrt(numcols+1)));

        let longestLabel = Math.max(...classes.map(val => String(val).length));
        let widthLabels = 15 + fontSize / 2 * longestLabel; // # number of pixels the row labels need
        let heightLabels = 15 + fontSize / 2 * longestLabel * .86602; // # of pixels the column labels need

        // legend
        let key = d3.select(vnode.dom)
            .append("svg")
            .attr("width", widthLegend)
            .attr("height", height);

        let legend = key
            .append("defs")
            .append("svg:linearGradient")
            .attr("id", "gradient")
            .attr("x1", "100%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "100%")
            .attr("spreadMethod", "pad");

        legend
            .append("stop")
            .attr("offset", "0%")
            .attr("stop-color", endColor)
            .attr("stop-opacity", 1);

        legend
            .append("stop")
            .attr("offset", "100%")
            .attr("stop-color", startColor)
            .attr("stop-opacity", 1);

        key.append("rect")
            .attr("width", widthLegend)
            .attr("height", height - margin.top - margin.bottom - heightLabels)
            .style("fill", "url(#gradient)")
            .attr("transform", "translate(0," + margin.top + ")");

        // this y is for the legend
        y = d3.scaleLinear()
            .range([height - margin.top - margin.bottom - heightLabels, 0])
            .domain([minValue, maxValue]);

        let yAxis = d3.axisRight()
            .scale(y);

        key
            .append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(0," + margin.top + ")")    // first number is separation between legend scale and legend key
            .call(yAxis);

        // matrix
        let svg = d3.select(vnode.dom).append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("display", 'inline-block')
            .append("g")
            .attr("transform", "translate(" + (margin.left + widthLabels) + "," + margin.top + ")");

        // background
        svg.append("rect")
            .style("stroke", "black")
            .style("stroke-width", "2px")
            .attr("width", width - margin.left - margin.right - widthLabels)
            .attr("height", height - margin.top - margin.bottom - heightLabels);

        let x = d3.scaleBand()
            .domain(d3.range(numcols))
            .range([0, width - margin.left - widthLabels - margin.right]);

        let y = d3.scaleBand()
            .domain(d3.range(numrows))
            .range([0, height - margin.top - margin.bottom - heightLabels]);

        let colorMap = d3.scaleLinear()
            .domain([minValue, maxValue])
            .range([startColor, endColor]);

        let row = svg.selectAll(".row")
            .data(data)
            .enter().append("g")
            .attr("class", "row")
            .attr("transform", function (d, i) {
                return "translate(0," + y(i) + ")";
            });

        let cell = row.selectAll(".cell")
            .data(function (d) {
                return d;
            })
            .enter().append("g")
            .attr("class", "cell")
            .attr("transform", function (d, i) {
                return "translate(" + x(i) + ", 0)";
            });

        cell.append('rect')
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            .style("stroke-width", 0);

        if (numcols < 20) {
            cell.append("text")
                .attr("dy", ".32em")
                .attr("x", x.bandwidth() / 2)
                .attr("y", y.bandwidth() / 2)
                .attr("text-anchor", "middle")
                .attr("font-size", Math.round(46/Math.sqrt(numcols+1)))  // ramps from 27pt to 10pt font
                .style("fill", d => d >= maxValue / 2 ? 'white' : 'black')
                .text(d => d);
        }

        row.selectAll(".cell")
            .data(function (d, i) {
                return data[i];
            })
            .style("fill", colorMap);

        // this portion of the code isn't as robust to sizing. column labels not rendering in the right place
        let labels = svg.append('g')
            .attr('class', "labels");

        let columnLabels = labels.selectAll(".column-label")
            .data(classes)
            .enter().append("g")
            .attr("class", "column-label")
            .attr("transform", function (d, i) {
                return "translate(" + x(i) + "," + (height - margin.bottom - margin.top - heightLabels + 20) + ")";
            });

        columnLabels.append("line")
            .style("stroke", "black")
            .style("stroke-width", "1px")
            .attr("x1", x.bandwidth() / 2)
            .attr("x2", x.bandwidth() / 2)
            .attr("y1", 5 - 20)
            .attr("y2", -20);

        columnLabels.append("text")
            .attr("x", x.bandwidth() / 2)
            .attr("y", -10)
            .attr("font-size", fontSize)
            //.attr("dy", "0.5em")
            .attr("text-anchor", "start")
            .attr("transform", "rotate(60," + x.bandwidth() / 2 + ",-10)")
            .text(_ => _);

        let rowLabels = labels.selectAll(".row-label")
            .data(classes)
            .enter().append("g")
            .attr("class", "row-label")
            .attr("transform", function (d, i) {
                return "translate(" + 0 + "," + y(i) + ")";
            });

        rowLabels.append("line")
            .style("stroke", "black")
            .style("stroke-width", "1px")
            .attr("x1", 0)
            .attr("x2", -5)
            .attr("y1", y.bandwidth() / 2)
            .attr("y2", y.bandwidth() / 2);

        rowLabels.append("text")
            .attr("x", -8)
            .attr("y", y.bandwidth() / 2)
            .attr("font-size", fontSize)
            .attr("dy", ".32em")
            .attr("text-anchor", "end")
            .text(function (d) {
                return d;
            });

        svg.append("text")
            .attr("transform", "translate(" + ((width + widthLegend) / 2) + " ," + (0 - 10) + ")")
            .style("text-anchor", "middle")
            .text(xLabel || "Fitted Class");

        svg.append("text")
            .attr("transform", "translate(" + ((width + widthLegend) / 2) + " ," + (0 - 30) + ")")
            .style("text-anchor", "middle")
            .text(title);

        svg.append("text")
            .attr("transform", "rotate(-90)")

            .attr("x", 0 - (height - margin.bottom - margin.top) / 2)
            .attr("y", - widthLabels)
            //.attr("dy", "1em")
            .style("text-anchor", "middle")
            .text(yLabel || "Actual Class");
    }

    view({attrs}) {
        return m('div',
            mergeAttributes({
                id: attrs.id,
                style: {
                    width: '100%', height: '100%', // the svg fills all area is given
                    overflow: 'hidden' // prevents the scroll bar from causing the graphs to split lines
                }
            }, attrs.attrsAll || {})
        );
    }
}
