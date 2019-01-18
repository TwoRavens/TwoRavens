import {elem} from './utils';

import vegaEmbed from 'vega-embed';
import * as scatterPE from './vega-schemas/scatterPE';

let d3Color = '#1f77b4'; // d3's default blue
export let selVarColor = '#fa8072'; // d3.rgb("salmon");

// function to use d3 to graph density plots with preprocessed data
export function density(node, div, priv) {
    div = {setxLeft: '#setxLeft', setxLeftTopRight: '#setxLeftTopRight', Summary: '#tabSummary', explore: '#plot'}[div];

    if (!div) return alert("Error: incorrect div selected for plots: " + div);

    let [xVals, yVals] = [node.plotx, node.ploty];
    if (priv && node.plotCI) {
        let [upperError, lowerError] = ['upperBound', 'lowerBound'].map(
            bound => xVals.map((x, i) => ({x: +x, y: +node.plotCI[bound][i]})));
        console.log('upperError\n', upperError);
    }

    var tempWidth = d3.select(div).style("width");
    var width = tempWidth.substring(0, (tempWidth.length - 2));
    let tw = document.getElementById('main').offsetWidth;
    var tempHeight = d3.select(div).style("height");
    var height = tempHeight.substring(0, (tempHeight.length - 2));
    var margin = {
        top: 20,//20,
        right: 20,
        bottom: 53,//53,
        left: 10
    };

    // Need to fix automatic width and height settings for leftpanel (#tabSubset, #tabSummary)
    if (div == "#tabSummary" || div === '#plot') {
        [width, height] = [242,150]; //[242, 250];             // These should not be hard coded
        // width = 0.7 * (width - margin.left - margin.right),
        // height = 0.3 * (height - margin.top - margin.bottom);
    } else if (div == "#setxLeft" || div == "#setxLeftTopRight") {
        width=tw*.185-margin.left-margin.right; //rightpanel.expand is 40 percent, setxLeft to 50 percent, toggle bar is 16px, padding, it's all about .185
        height=width*.6; //height to width is .6
    } else {
        width = 0.35 * (width - margin.left - margin.right),
        height = 0.25 * (height - margin.top - margin.bottom);
    };


    var x = d3.scale.linear()
        .domain([d3.min(xVals), d3.max(xVals)])
        .range([0, width]);
    var invx = d3.scale.linear()
        .range([d3.min(xVals), d3.max(xVals)])
        .domain([0, width]);
    var y = d3.scale.linear()
        .domain([d3.min(yVals), d3.max(yVals)])
        .range([height, 0]);
    var xAxis = d3.svg.axis()
        .scale(x)
        .ticks(5)
        .orient("bottom");
    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");
    var brush = d3.svg.brush()
        .x(x)
        .extent(node.subsetrange)
        .on("brush", brushed);
    var brush2 = d3.svg.brush()
        .x(x)
        .on("brush", brushed2);
    var area = d3.svg.area()
        .interpolate("monotone")
        .x(d => x(d.x))
        .y0(height)
        .y1(d => y(d.y));
    var line = d3.svg.line()
        .x(d => x(d.x))
        .y(d => y(d.y))
        .interpolate("monotone");

    // cumbersome to treat "tabSummary" differently, but works for now
    // tabSummary, has an issue, that unless width height hardcoded, they grow with each additional graph.
    if (div == "#tabSummary") {
        var plotsvg = d3.select(div)
            .selectAll("svg")
            .remove();
        plotsvg = d3.select(div)
            .append("svg")
            .attr("id", () => node.name.toString().concat(div.substr(1)))
            .style("width", 300) // set height to the height of #main.left
            .style("height", 200)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
    } else {
        var plotsvg = d3.select(div)
            .append("svg")
            .attr("id", () => node.name.toString()
                  .replace(/\(|\)/g, "")
                  .concat("_", div.substr(1), "_", node.id))
            .style("width", width + margin.left + margin.right) //setting height to the height of #main.left
            .style("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
    };
    plotsvg.append("path")
        .datum(xVals.map((x, i) => ({x: +x, y: +node.ploty[i]})))
        .attr("class", "area")
        .attr("d", area);

    //add upper bound
    priv && node.plotCI && plotsvg.append("path")
        .attr("class", "upperError")
        .datum(upperError)
        .attr("d", area);

    //add lower bound
    priv && node.plotCI && plotsvg.append("path")
        .attr("class", "lowerError")
        .datum(lowerError)
        .attr("d", area);

    plotsvg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    plotsvg.append("text")
        .attr("x", (width / 2))
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text(node.name);

    // add brush if subset
    // this tab doesn't exist anymore - Shoeboxam
    if (div == "#tabSubset") {
        plotsvg.append("text")
            .attr("id", "range")
            .attr("x", 25)
            .attr("y", height + 40)
            .text(() => "Range: ".concat(d3.min(xVals).toPrecision(4), " to ", d3.max(xVals).toPrecision(4)));
        plotsvg.append("g")
            .attr("class", "x brush")
            .call(brush)
            .selectAll("rect")
            .attr("height", height);
    }

    // add z lines and sliders setx
    if (div == "#setxLeft" || div == "#setxLeftTopRight") {
        plotsvg.append("text")
            .attr("id", "range") // this is bad practice, id is not unique
            .attr('class','xval')
            .attr("x", 25)
            .attr("y", height + 40)
            .text(() => "x: ".concat((+node.mean).toPrecision(4)));

        plotsvg.append("text")
            .attr("id", "range2") // this is bad practice, id is not unique
            .attr('class','x1val')
            .attr("x", 25)
            .attr("y", height + 50)
            .text( _ => {
                  let returnval = "x1: ".concat((+node.mean).toPrecision(4));
               return returnval});
        

        // create tick marks at all zscores in the bounds of the data
        var lineFunction = d3.svg.line()
            .x(d => d.x)
            .y(d => d.y)
            .interpolate("linear");

        var colSeq = ["#A2CD5A", "orange", "red"]; // will cycle through color sequence, and then repeat last color
        var lineData = new Array;

        var zLower = -1 * (d3.min(xVals) - node.mean) / node.sd; // zscore of lower bound
        var zUpper = (d3.max(xVals) - node.mean) / node.sd; // zscore of upper bound

        for (var i = 0; i < zUpper; i++) {
            lineData = [{
                "x": x(+node.mean + i * node.sd),
                "y": height * .7
            }, {
                "x": x(+node.mean + i * node.sd),
                "y": height * .9
            }];
            plotsvg.append("path")
                .attr("d", lineFunction([lineData[0], lineData[1]]))
                .attr("stroke", colSeq[d3.min([i, colSeq.length - 1])])
                .attr("stroke-width", 1.5)
                .attr("fill", "none");
        }

        for (var i = 1; i < zLower; i++) {
            lineData = [{
                "x": x(+node.mean - i * node.sd),
                "y": height * .7
            }, {
                "x": x(+node.mean - i * node.sd),
                "y": height * .9
            }];
            plotsvg.append("path")
                .attr("d", lineFunction([lineData[0], lineData[1]]))
                .attr("stroke", colSeq[d3.min([i, colSeq.length - 1])])
                .attr("stroke-width", 1.5)
                .attr("fill", "none");
        }

        // initialize slider components
        var slideBox = plotsvg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height * .8 + ")")
            .call(d3.svg.axis()
                  .scale(x)
                  .ticks(0)
                  .orient("bottom"));
        var slider = plotsvg.append("g")
            .attr("class", "slider")
            .call(brush);
        var handle = slider.append("polygon")
            .attr("class", "handle")
            .attr("transform", "translate(0," + height * .7 + ")")
            .attr("points", _ => {
                let s = 6;
                let xnm = node.setxvals[0] == '' ? x(node.mean) : x(node.setxvals[0]);
                return (xnm - s) + "," + (-s) + " " + (xnm + s) + "," + (-s) + " " + xnm + "," + (s * 1.3);
            });
        var slider2 = plotsvg.append("g")
            .attr("class", "slider")
            .call(brush2);
        var handle2 = slider2.append("polygon")
            .attr("class", "handle")
            .attr("transform", "translate(0," + height * .9 + ")")
            .attr("points", _ => {
                let s = 6;
                let xnm = node.setxvals[1] == '' ? x(node.mean) : x(node.setxvals[1]);
                return (xnm - s) + "," + s + " " + (xnm + s) + "," + s + " " + xnm + "," + (-s * 1.3);
            });
    }

    // brushing functions
    function brushed() {
        if (div == "#tabSummary") {
            plotsvg.select("text#range")
                .text(() => brush.empty() ?
                    "Range: ".concat(d3.min(xVals).toPrecision(4), " to ", d3.max(xVals).toPrecision(4)) :
                    "Range: ".concat((brush.extent()[0]).toPrecision(4), " to ", (brush.extent()[1]).toPrecision(4))
                );
            node.subsetrange = brush.extent()[0].toPrecision(4) != brush.extent()[1].toPrecision(4) ?
                [(brush.extent()[0]).toPrecision(4), (brush.extent()[1]).toPrecision(4)] :
                ["", ""];
        } else if (div == "#setxLeft" || div == "#setxLeftTopRight") {
            var value = brush.extent()[0];
            var s = 6;
            if (d3.event.sourceEvent) {
                value = x.invert(d3.mouse(this)[0]);
                brush.extent([value, value]);
            }

            // set x position of slider center
            var xpos = x(value);
            if (value > d3.max(xVals)) { // dragged past max
                xpos = x(d3.max(xVals));
            } else if (value < d3.min(xVals)) { // dragged past min
                xpos = x(d3.min(xVals));
            } else {
                var m = +node.mean;
                var sd = +node.sd;
                var zScore = (value - m) / sd; // z-score
                var zRound = Math.round(zScore); // nearest integer z-score
                if (.1 > Math.abs(zRound - zScore)) // snap to integer z-score
                    xpos = x(m + (zRound * sd));
            }

            // create slider symbol and text
            handle.attr("points", _ => (xpos - s) + "," + (-s) + " " + (xpos + s) + "," + (-s) + " " + xpos + "," + (s * 1.3));
            plotsvg.select("text#range")
            .text(_ => {
                  let returnval = "x: ".concat((invx(xpos)).toPrecision(4));
                  let xval = invx(xpos).toPrecision(4);
                  let mycell = node.name+"From"; // hardcoded here
                  if(document.getElementById(mycell)) {
                    document.getElementById(mycell).innerText=xval;
                  }
                  return returnval});
            node.setxvals[0] = (invx(xpos)).toPrecision(4);
        }
    }

    // certainly a more clever way to do this, but for now it's basically copied with brush and handle changes to brush2 and handle2 and #range to #range2 and setxvals[0] to setxvals[1]
    function brushed2() {
        var value = brush2.extent()[0];
        var s = 6; // scaling for triangle shape

        if (d3.event.sourceEvent) {
            value = x.invert(d3.mouse(this)[0]);
            brush2.extent([value, value]);
        }

        // set x position of slider center
        var xpos = x(value);
        if (value > d3.max(xVals)) { // dragged past max
            xpos = x(d3.max(xVals));
        } else if (value < d3.min(xVals)) { // dragged past min
            xpos = x(d3.min(xVals));
        } else {
            var m = +node.mean;
            var sd = +node.sd;
            var zScore = (value - m) / sd; // z-score
            var zRound = Math.round(zScore); // nearest integer z-score
            if (.1 > Math.abs(zRound - zScore)) // snap to integer z-score
                xpos = x(m + (zRound * sd));
        }

        // create slider symbol and text
        handle2.attr("points", _ => (xpos - s) + "," + s + " " + (xpos + s) + "," + s + " " + xpos + "," + (-s * 1.3));
        plotsvg.select("text#range2")
        .text(_ => {
            let returnval = "x1: ".concat((invx(xpos)).toPrecision(4));
            let x1val = invx(xpos).toPrecision(4);
            let mycell = node.name+"To"; // hardcoded here
            if(document.getElementById(mycell)) {
                document.getElementById(mycell).innerText=x1val;
            }
            return returnval;
        });
        node.setxvals[1] = (invx(xpos)).toPrecision(4);
    }
}

export function bars(node, div, priv) {
    // Histogram spacing
    var barPadding = .015; // Space between bars
    var topScale = 1.2; // Multiplicative factor to assign space at top within graph - currently removed from implementation
    var plotXaxis = true;

    // Data
    var keys = Object.keys(node.plotvalues);
    var yVals = new Array;
    var ciUpperVals = new Array;
    var ciLowerVals = new Array;
    var ciSize;

    var xVals = new Array;
    var yValKey = new Array;

    if (node.nature == "nominal") {
        var xi = 0;
        for (var i = 0; i < keys.length; i++) {
            if (node.plotvalues[keys[i]] == 0)
                continue;
            yVals[xi] = node.plotvalues[keys[i]];
            xVals[xi] = xi;
            if (priv) {
                if (node.plotvaluesCI) {
                    ciLowerVals[xi] = node.plotValuesCI.lowerBound[keys[i]];
                    ciUpperVals[xi] = node.plotValuesCI.upperBound[keys[i]];
                }
                ciSize = ciUpperVals[xi] - ciLowerVals[xi];
            };

            yValKey.push({
                y: yVals[xi],
                x: keys[i]
            });
            xi = xi + 1;
        }
        yValKey.sort((a, b) => b.y - a.y); // array of objects, each object has y, the same as yVals, and x, the category
        yVals.sort((a, b) => b - a); // array of y values, the height of the bars
        ciUpperVals.sort((a, b) => b.y - a.y); // ?
        ciLowerVals.sort((a, b) => b.y - a.y); // ?
    } else {
        for (var i = 0; i < keys.length; i++) {
           // console.log("plotvalues in bars");
            yVals[i] = node.plotvalues[keys[i]];
            xVals[i] = Number(keys[i]);
            if (priv) {
                if (node.plotvaluesCI) {
                    ciLowerVals[i] = node.plotvaluesCI.lowerBound[keys[i]];
                    ciUpperVals[i] = node.plotvaluesCI.upperBound[keys[i]];
                }
                ciSize = ciUpperVals[i] - ciLowerVals[i];
            }
        }
    }

    if ((yVals.length > 15 & node.numchar == "numeric") || (yVals.length > 5 & node.numchar == "character"))
        plotXaxis = false;
    var maxY = d3.max(yVals); // in the future, set maxY to the value of the maximum confidence limit
    if (priv && node.plotvaluesCI) maxY = d3.max(ciUpperVals);
    var minX = d3.min(xVals);
    var maxX = d3.max(xVals);

    let mydiv;
    if (div == "setxLeft") mydiv = "#setxLeft";
    else if (div == 'explore') mydiv = '#plot';
    else if (div == "Summary") mydiv = "#tabSummary";
    else if (div == "setxLeftTopRight") mydiv = "#setxLeftTopRight";
    else {
        return alert("Error: incorrect div selected for plots");
    }

    var tempWidth = d3.select(mydiv).style("width");
    var width = tempWidth.substring(0, (tempWidth.length - 2));
    var tempHeight = d3.select(mydiv).style("height");
    var height = tempHeight.substring(0, (tempHeight.length - 2));

    var margin = {
        top: 20,
        right: 20,
        bottom: 53,
        left: 10
    };
    let tw = document.getElementById('main').offsetWidth;

    // Need to fix automatic width and height settings for leftpanel (#tabSubset, #tabSummary)
    if (mydiv == "#tabSummary" || mydiv === '#plot') {
        [width, height] = [242,150]; //[242, 250];       // These should not be hard coded
        // width = 0.7 * (width - margin.left - margin.right);
        // height = 0.3 * (height - margin.top - margin.bottom);
    } else if (mydiv == "#setxLeft" || mydiv=="#setxLeftTopRight") {
        //width = 200;
        //height = 120;
        width=tw*.185-margin.left-margin.right; //rightpanel.expand is 40 percent, setxLeft to 50 percent, toggle bar is 16px, padding, it's all about .185
        height=width*.6; //height to width is .6
    } else {
        width = 0.35 * (width - margin.left - margin.right);
        height = 0.25 * (height - margin.top - margin.bottom);
    };

    if (priv && node.stabilityBin) {
        var x = d3.scale.linear()
            .domain([minX - 0.5, maxX + 1.5])
            .range([0, width]);
    } else {
        var x = d3.scale.linear()
            .domain([minX - 0.5, maxX + 0.5])
            .range([0, width]);
    }

    var invx = d3.scale.linear()
        .range([minX - 0.5, maxX + 0.5])
        .domain([0, width]);

    var y = d3.scale.linear()
        .domain([0, maxY])
        .range([0, height]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .ticks(yVals.length)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var brush = d3.svg.brush()
        .x(x)
        .extent(() => {
            return node.subsetrange.length == 1 ?
                [node.subsetrange[0], node.subsetrange[0]]
                : node.subsetrange;
        })
        .on("brush", brushed);

    var brush2 = d3.svg.brush()
        .x(x)
        .on("brush", brushed2);

    // Create SVG element
    // cumbersome to treat "tabSummary" differently, but works for now
    // tabSummary, has an issue, that unless width height hardcoded, they grow with each additional graph.
    if (mydiv == "#tabSummary") {
        var plotsvg = d3.select(mydiv)
            .selectAll("svg")
            .remove();
        var plotsvg = d3.select(mydiv)
            .append("svg")
            .attr("id", () => node.name.toString().concat(mydiv.substr(1)))
            .style("width", 300) //setting height to the height of #main.left
            .style("height", 200)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    } else {
        var plotsvg = d3.select(mydiv)
            .append("svg")
            .attr("id", function() {
                var myname = node.name.toString();
                myname = myname.replace(/\(|\)/g, "");
                return myname.concat("_", mydiv.substr(1), "_", node.id);
            })
            .style("width", width + margin.left + margin.right) //setting height to the height of #main.left
            .style("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    };

    var rectWidth = x(minX + 0.5 - 2 * barPadding); //the "width" is the coordinate of the end of the first bar

    plotsvg.selectAll("rect")
        .data(yVals)
        .enter()
        .append("rect")
        .attr("x", (d, i) => x(xVals[i] - 0.5 + barPadding))
        .attr("y", d => y(maxY - d))
        .attr("width", rectWidth)
        .attr("height", y)
        .attr("fill", "#1f77b4");

    // draw error bars, threshold line and extra bin
    if (priv) {
        if (yVals.length <= 20) {
            plotsvg.selectAll("line")
                .data(ciUpperVals)
                .enter()
                .append("line")
                .style("stroke", "black")
                .attr("x1", function(d, i) {
                    return x(xVals[i] - 0.5 + barPadding) + rectWidth / 2;
                })
        	.attr("y1", d => y(maxY - d))
                .attr("x2", function(d, i) {
                    return x(xVals[i] - 0.5 + barPadding) + rectWidth / 2;
                })
                .attr("y2", d => {
                    let y2 = y(maxY - d + ciSize);
                    return y2 >= y(maxY) ? y(maxY) : y2;
                 });

            //draw top ticks on error bars
            //need to fix the height of the graphs - the tops of error bars are getting cut off
            plotsvg.selectAll(".topTick")
                .data(ciUpperVals)
                .enter()
                .append("line")
                .attr("class", "topTick")
                .style("stroke", "black")
                .attr("x1", function(d, i) {
                    if (yVals.length > 20) {
                        return x(xVals[i] - 0.5 + barPadding); //make tick bigger to increase visibility
                    } else {
                        return x(xVals[i] - 0.5 + barPadding) + 0.4 * rectWidth;
                    }
                })
                .attr("y1", function(d) {
                    return y(maxY - d);
                })
                .attr("x2", function(d, i) {
                    if (yVals.length > 20) {
                        return x(xVals[i] - 0.5 + barPadding) + rectWidth; //make tick bigger to increase visibility
                    } else {
                        return x(xVals[i] - 0.5 + barPadding) + 0.6 * rectWidth;
                    }
                })
                .attr("y2", d => y(maxY - d));

            // draw bottom ticks of error bars
            plotsvg.selectAll(".bottomTick")
                .data(ciLowerVals)
                .enter()
                .append("line")
                .attr("class", "bottomTick")
                .style("stroke", "black")
                .attr("x1", function(d, i) {
                    if (yVals.length > 20) {
                        return x(xVals[i] - 0.5 + barPadding);
                    } else {
                        return x(xVals[i] - 0.5 + barPadding) + 0.4 * rectWidth;
                    }
                })
                .attr("y1", d => y(maxY - d))
                .attr("x2", function(d, i) {
                    if (yVals.length > 20) {
                        return x(xVals[i] - 0.5 + barPadding) + rectWidth;
                    } else {
                        return x(xVals[i] - 0.5 + barPadding) + 0.6 * rectWidth;
                    }
                })
                .attr("y2", d => y(maxY - d));
        } else {
            plotsvg.selectAll(".denseError")
                .data(yVals)
                .enter()
                .append("rect")
                .attr("class", "denseError")
                .attr("x", (d, i) => x(xVals[i] - 0.5 + barPadding))
                .attr("y", d => y(maxY - d) - .1 * y(d))
                .attr("width", rectWidth)
                .attr("height", d => (y(maxY - d) + .1 * y(d)) - (y(maxY - d) - .1 * y(d)))
                .attr("fill", "silver");
        }

        //if statement for stability histograms
        //extra stability bin
        if (node.stabilityBin) {
            plotsvg.append("rect")
                .attr("x", x(maxX + 0.5 - barPadding))
                .attr("y", y(maxY) - node.stabilityBin)
                .attr("width", rectWidth)
                .attr("height", node.stabilityBin)
                .attr("fill", "silver");
        }

        //threshold line
        if (node.threshold) {
            plotsvg.append("line")
                .style("stroke", "black")
                .attr("x1", x(minX - 0.5 + barPadding))
                .attr("y1", y(maxY) - node.threshold)
                .attr("x2", function() {
                    console.log("stabilityBin");
                    console.log(node.stabilityBin);
                    if (node.stabilityBin) {
                        return x(maxX + 0.5 - barPadding) + rectWidth;
                    } else {
                        return x(maxX + 0.5 - barPadding);
                    }
                })
                .attr("y2", y(maxY) - node.threshold);
        }
    }

    if (plotXaxis) {
        plotsvg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);
    }

    plotsvg.append("text")
        .attr("x", (width / 2))
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text(node.name);

    if (mydiv == "#setxLeft" || mydiv=="#setxLeftTopRight") {
        plotsvg.append("text")
            .attr("id", "range") // bad practice, not unique
            .attr('class','xval')
            .attr("x", 25)
            .attr("y", height + 40)
            .text(function() {
                if (node.nature === "nominal") {
                    var t = Math.round(yValKey.length / 2) - 1;
                    let mycell = node.name+"From"; // hardcoded here
                    if(document.getElementById(mycell)) {
                        document.getElementById(mycell).innerText=yValKey[t].x;
                    }
                    return ("x: " + yValKey[t].x);
                } else {
                    let mycell = node.name+"From"; // hardcoded here
                    if(document.getElementById(mycell)) {
                        document.getElementById(mycell).innerText=(+node.mean).toPrecision(4).toString();
                    }
                    return ("x: ".concat((+node.mean).toPrecision(4).toString()));
                }
            });

        plotsvg.append("text")
            .attr("id", "range2") //bad practice, not unique
            .attr('class','x1val')
            .attr("x", 25)
            .attr("y", height + 50)
            .text(function() {
                if (node.nature === "nominal") {
                    var t = Math.round(yValKey.length / 2) - 1;
                    return ("x1: " + yValKey[t].x);
                } else {
                    return ("x1: ".concat((+node.mean).toPrecision(4).toString()));
                }
            });

        // create tick marks at all zscores in the bounds of the data
        var lineFunction = d3.svg.line()
            .x(d => d.x)
            .y(d => d.y)
            .interpolate("linear");

        var colSeq = ["#A2CD5A", "orange", "red"]; // will cycle through color sequence, and then repeat last color
        var lineData = new Array;

        var zLower = -1 * (minX - node.mean) / node.sd; // zscore of lower bound
        var zUpper = (maxX - node.mean) / node.sd; // zscore of upper bound

        for (var i = 0; i < zUpper; i++) {
            lineData = [{
                "x": x(+node.mean + i * node.sd),
                "y": height * .7
            }, {
                "x": x(+node.mean + i * node.sd),
                "y": height * .9
            }];
            plotsvg.append("path")
                .attr("d", lineFunction([lineData[0], lineData[1]]))
                .attr("stroke", colSeq[d3.min([i, colSeq.length - 1])])
                .attr("stroke-width", 1.5)
                .attr("fill", "none");
        }

        for (var i = 1; i < zLower; i++) {
            lineData = [{
                "x": x(+node.mean - i * node.sd),
                "y": height * .7
            }, {
                "x": x(+node.mean - i * node.sd),
                "y": height * .9
            }];
            plotsvg.append("path")
                .attr("d", lineFunction([lineData[0], lineData[1]]))
                .attr("stroke", colSeq[d3.min([i, colSeq.length - 1])])
                .attr("stroke-width", 1.5)
                .attr("fill", "none");
        }

        for (var i = d3.min(xVals); i <= d3.max(xVals); i++) {
            lineData = [{
                "x": x(i),
                "y": height * .75
            }, {
                "x": x(i),
                "y": height * .85
            }];
            plotsvg.append("path")
                .attr("d", lineFunction([lineData[0], lineData[1]]))
                .attr("stroke", "black")
                .attr("stroke-width", 1)
                .attr("fill", "none");
        }

        // initialize slider components
        var slideBox = plotsvg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height * .8 + ")")
            .call(d3.svg.axis()
                  .scale(x)
                  .ticks(0)
                  .orient("bottom"));

        var slider = plotsvg.append("g")
            .attr("class", "slider")
            .call(brush);
        var slider2 = plotsvg.append("g")
            .attr("class", "slider")
            .call(brush2);

        let points = i => d => {
            let xnm, s = 6;
            if (node.setxvals[i] == '') {
                // if nominal, use the median frequency as the position for the setx slider
                xnm = node.nature == 'nominal' ? x(Math.round(xVals.length / 2) - 1) : x(node.mean);
            } else {
                xnm = x(node.setxvals[i]);
            };
            return `${xnm - s},${-s} ${xnm + s},${-s} ${xnm},${s * 1.3}`;
        };
        var handle = slider.append("polygon")
            .attr("class", "handle")
            .attr("transform", "translate(0," + height * .7 + ")")
            .attr("points", points(0));
        var handle2 = slider2.append("polygon")
            .attr("class", "handle")
            .attr("transform", "translate(0," + height * .9 + ")")
            .attr("points", points(1));
    }

    function twoSF(x) {
        var tsf = d3.format(".2r"); // format to two significant figures after the decimal place
        return tsf(x).replace(/0+$/, "").replace(/\.$/, ""); // trim trailing zeros after a period, and any orphaned period
    }

    // brushing functions
    function brushed() {
        var value = brush.extent()[0];
        var s = 6;

        if (d3.event.sourceEvent) {
            value = x.invert(d3.mouse(this)[0]);
            brush.extent([value, value]);
        }

        // set x position of slider center
        var xpos = x(value);
        if (value > maxX) { // dragged past max
            xpos = x(maxX);
        } else if (value < minX) { // dragged past min
            xpos = x(minX);
        } else {
            var m = +node.mean;
            var sd = +node.sd;
            var zScore = (value - m) / sd; // z-score
            var zRound = Math.round(zScore); // nearest integer z-score
            if (.1 > Math.abs(Math.round(value) - value)) { // snap to integer
                xpos = x(Math.round(value));
            } else if (.1 > Math.abs(zRound - zScore)) { // snap to integer z-score
                xpos = x(m + (zRound * sd));
            }
        }

        // create slider symbol and text
        handle.attr("points", function(d) {
            return (xpos - s) + "," + (-s) + " " + (xpos + s) + "," + (-s) + " " + xpos + "," + (s * 1.3);
        });
        plotsvg.select("text#range")
            .text(function() {
                if (node.nature === "nominal") {
                    let mycell = node.name+"From"; // hardcoded here
                    if(document.getElementById(mycell)) {
                        document.getElementById(mycell).innerText=yValKey[Math.round(invx(xpos))].x;
                    }
                    return ("x: " + yValKey[Math.round(invx(xpos))].x);
                } else {
                    let mycell = node.name+"From"; // hardcoded here
                    if(document.getElementById(mycell)) {
                        document.getElementById(mycell).innerText=+(invx(xpos)).toPrecision(4).toString();
                    }
                    return ("x: ".concat(+(invx(xpos)).toPrecision(4).toString()));
                }
            });
        node.setxvals[0] = +(invx(xpos)).toPrecision(4);
    }

    // certainly a more clever way to do this, but for now it's basically copied with brush and handle changes to brush2 and handle2 and #range to #range2 and setxvals[0] to setxvals[1]
    function brushed2() {
        var value = brush2.extent()[0];
        var s = 6; // scaling for triangle shape

        if (d3.event.sourceEvent) {
            value = x.invert(d3.mouse(this)[0]);
            brush2.extent([value, value]);
        }

        // set x position of slider center
        var xpos = x(value);
        if (value > maxX) { // dragged past max
            xpos = x(maxX);
        } else if (value < minX) { // dragged past min
            xpos = x(minX);
        } else {
            var m = +node.mean;
            var sd = +node.sd;
            var zScore = (value - m) / sd; // z-score
            var zRound = Math.round(zScore); // nearest integer z-score
            if (.1 > Math.abs(Math.round(value) - value)) { // snap to integer
                xpos = x(Math.round(value));
            } else if (.1 > Math.abs(zRound - zScore)) { // snap to integer z-score
                xpos = x(m + (zRound * sd));
            }
        }

        // create slider symbol and text
        handle2.attr("points", function(d) {
            return (xpos - s) + "," + s + " " + (xpos + s) + "," + s + " " + xpos + "," + (-s * 1.3);
        });
        plotsvg.select("text#range2")
            .text(function() {
                if (node.nature === "nominal") {
                    let mycell = node.name+"To"; // hardcoded here
                    if(document.getElementById(mycell)) {
                        document.getElementById(mycell).innerText=yValKey[Math.round(invx(xpos))].x;
                    }
                    return ("x1: " + yValKey[Math.round(invx(xpos))].x);
                } else {
                    let mycell = node.name+"To"; // hardcoded here
                    if(document.getElementById(mycell)) {
                        document.getElementById(mycell).innerText=+(invx(xpos)).toPrecision(4).toString();
                    }
                    return ("x1: ".concat(+(invx(xpos)).toPrecision(4).toString()));
                }
            });
        node.setxvals[1] = +(invx(xpos)).toPrecision(4);
    }
}

// draws barplots in subset tab
export function barsSubset(node) {
    // if untouched, set node.subsetrange to an empty array, meaning all values selected by default
    if (node.subsetrange[0] == "" & node.subsetrange[1] == "") {
        node.subsetrange = [];
    }

    // Histogram spacing
    var barPadding = .015; // Space between bars
    var topScale = 1.2; // Multiplicative factor to assign space at top within graph - currently removed from implementation
    var plotXaxis = true;

    // Variable name
    var myname = node.name.toString();
    myname = myname.replace(/\(|\)/g, "");

    // Data
    var keys = Object.keys(node.plotvalues);
    var yVals = new Array;
    var xVals = new Array;
    var yValKey = new Array;

    var xi = 0;
    for (var i = 0; i < keys.length; i++) {
        if (node.plotvalues[keys[i]] == 0)
            continue;
        yVals[xi] = node.plotvalues[keys[i]];
        xVals[xi] = xi;
        yValKey.push({
            y: yVals[xi],
            x: keys[i]
        });
        xi = xi + 1;
    }
    if (node.nature === "nominal") { // if nominal, orders bars left to right, highest frequency to lowest
        yValKey.sort((a, b) => b.y - a.y); // array of objects, each object has y, the same as yVals, and x, the category
        yVals.sort((a, b) => b - a); // array of y values, the height of the bars
    }

    plotXaxis = false;

    var maxY = d3.max(yVals);
    var minX = d3.min(xVals);
    var maxX = d3.max(xVals);
    var gname = ["subsetyes", "subsetno"];

    var yVals2 = [];
    var yVals1 = [];
    for (i = 0; i < yVals.length; i++) {
        yVals1.push({
            y0: maxY - yVals[i],
            y1: yVals[i],
            col: d3Color
        });
        yVals2.push({
            y0: 0,
            y1: maxY - yVals[i],
            col: "transparent"
        });
    }
    var freqs = [yVals1, yVals2];

    // y0 is the starting point
    // y1 is the length of the bar

    var mydiv = "#tabSubset";
    var width = 200;
    var height = 120;
    var margin = {
        top: 20,
        right: 20,
        bottom: 53,
        left: 50
    };

    var x = d3.scale.linear()
        .domain([minX - 0.5, maxX + 0.5])
        .range([0, width]);

    var invx = d3.scale.linear()
        .range([minX - 0.5, maxX + 0.5])
        .domain([0, width]);

    var y = d3.scale.linear()
        .domain([0, maxY])
        .range([0, height]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .ticks(yVals.length)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    //Create SVG element
    var plotsvg = d3.select(mydiv)
        .append("svg")
        .attr("id", function() {
            return myname.concat("_", mydiv.substr(1), "_", node.id);
        })
        .style("width", width + margin.left + margin.right) //setting height to the height of #main.left
        .style("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var freq = plotsvg.selectAll("g.freq")
        .data(freqs)
        .enter().append("g")
        .attr("class", "freq")
        .attr("name", function(d, i) {
            return myname.concat(gname[i]);
        });

    var rect = freq.selectAll("rect")
        .data(Object)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("name", function(d, i) {
            return xVals[i];
        })
        .attr("x", function(d, i) {
            return x(xVals[i] - 0.5 + barPadding);
        })
        .attr("y", function(d) {
            return y(d.y0);
        })
        .attr("width", x(minX + 0.5 - 2 * barPadding)) // the "width" is the coordinate of the end of the first bar
        .attr("height", function(d) {
            return y(d.y1);
        })
        .style("fill", function(d, i) {
            if (node.subsetrange.length > 0 & d.col === d3Color & $.inArray(xVals[i].toString(), node.subsetrange) > -1) {
                return selVarColor;
            } else {
                return d.col;
            }
        })
        .on("click", function() {
            var selectMe = this;
            var selectName = this.getAttribute("name");
            if (this.parentNode.getAttribute("name") == myname.concat("subsetno")) {
                selectMe = elem(`[name="${myname}subsetyes"] > [name="${selectName}"]`);
            }
            d3.select(selectMe)
                .style("fill", function(d, i) {
                    var myCol = "";
                    if (this.style.fill === selVarColor) {
                        var myindex = node.subsetrange.indexOf(this.getAttribute("name"));
                        node.subsetrange.splice(myindex, 1);
                        myCol = d3Color;
                    } else {
                        node.subsetrange.push(this.getAttribute("name"));
                        myCol = selVarColor;
                    }
                    return myCol;
                });
            plotsvg.select("text#selectrange")
                .text(function() {
                    if (node.subsetrange.length == 0) {
                        return ("Selected: all values");
                    } else {
                        var a = node.subsetrange;
                        var selecteds = new Array;
                        a.forEach(function(val) {
                            selecteds.push(yValKey[val].x);
                        });
                        return ("Selected: " + selecteds);
                    }
                });

        })
        .on("mouseover", function() {
            var i = this.getAttribute("name");
            plotsvg.select("text#mymouseover")
                .text(() => yValKey[i].x + ": " + yValKey[i].y);
        })
        .on("mouseout", function() {
            var i = this.getAttribute("name");
            plotsvg.select("text#mymouseover")
                .text(() => "Value: Frequency");
        });

    if (plotXaxis) {
        plotsvg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);
    } else {
        plotsvg.append("text")
            .attr("id", "mymouseover")
            .attr("x", 25)
            .attr("y", height + 20)
            .text(() => "Value: Frequency");
    }

    plotsvg.append("text")
        .attr("x", (width / 2))
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text(myname);

    plotsvg.append("text")
        .attr("id", "selectrange")
        .attr("x", 25)
        .attr("y", height + 40)
        .text(() => {
            if (node.subsetrange.length == 0)
                return "Selected: all values";
            var selecteds = new Array;
            node.subsetrange.forEach(val =>  selecteds.push(yValKey[val].x));
            return "Selected: " + selecteds;
        });
}

export function densityNode(node, obj, radius, explore) {
    var myname = node.name.toString().concat("nodeplot");

    d3.select(obj).selectAll("svg").remove();

    var yVals = node.ploty;
    var xVals = node.plotx;
    // array of objects
    let data2 = node.plotx.map((x, i) => ({x: +x, y: +node.ploty[i]}));

    // default radius 40

    // width 60
    // height 30
    // top 20
    // l/r 10

    var width = radius * 1.5;
    var height = radius * 0.75;
    var margin = {
        top: 50 - radius * .75,
        right: (80 - width) / 2,
        bottom: 53,
        left: (80 - width) / 2
    };

    var x = d3.scale.linear()
        .domain([d3.min(xVals), d3.max(xVals)])
        .range([0, width]);

    var y = d3.scale.linear()
        .domain([d3.min(yVals), d3.max(yVals)])
        .range([height, 0]);

    var area = d3.svg.area()
        .interpolate("monotone")
        .x(d => x(d.x))
        .y0(height)
        .y1(d => y(d.y));

    let {left, top} = margin;
    if (explore) {
        left = 5;
        top = 60;
    }
    var plotsvg = d3.select(obj)
        .insert("svg", ":first-child")
        .attr("x", -40) // NOTE: Not sure exactly why these numbers work, but these hardcoded values seem to position the plot inside g correctly.  this shouldn't be hardcoded in the future
        .attr("y", -45)
        .attr("id", () => myname)
        .style("width", width)
        // .style("height", height) // MIKE: I commented this because the plots were getting cut off in explore mode
        .append("g")
        .attr("transform", "translate(" + left + "," + top + ")");

    plotsvg.append("path")
        .datum(data2)
        .attr("class", "area")
        .attr("d", area);
}

export function barsNode(node, obj, radius, explore) {
    var myname = node.name.toString().concat("nodeplot");

    d3.select(obj).selectAll("svg").remove();

    // Histogram spacing
    var barPadding = .015; // Space between bars
    var topScale = 1.2; // Multiplicative factor to assign space at top within graph - currently removed from implementation

    // Data
    var keys = Object.keys(node.plotvalues);
    var yVals = new Array;
    var xVals = new Array;
    var yValKey = new Array;

    if (node.nature === "nominal") {
        var xi = 0;
        for (var i = 0; i < keys.length; i++) {
            if (node.plotvalues[keys[i]] == 0)
                continue;
            yVals[xi] = node.plotvalues[keys[i]];
            xVals[xi] = xi;
            yValKey.push({y: yVals[xi], x: keys[i]});
            xi = xi + 1;
        }
        yValKey.sort((a, b) => b.y - a.y); // array of objects, each object has y, the same as yVals, and x, the category
        yVals.sort((a, b) => b - a); // array of y values, the height of the bars
    } else {
        for (var i = 0; i < keys.length; i++) {
            yVals[i] = node.plotvalues[keys[i]];
            xVals[i] = Number(keys[i]);
        }
    }

    var maxY = d3.max(yVals);
    var minX = d3.min(xVals);
    var maxX = d3.max(xVals);

    var width = radius * 1.5;
    var height = radius * 0.75;
    var margin = {
        top: 50 - radius * .75,
        right: (80 - width) / 2,
        bottom: 53,
        left: (80 - width) / 2
    };

    var x = d3.scale.linear()
        .domain([minX - 0.5, maxX + 0.5])
        .range([0, width]);

    var invx = d3.scale.linear()
        .range([minX - 0.5, maxX + 0.5])
        .domain([0, width]);

    var y = d3.scale.linear()
        .domain([0, maxY])
        .range([0, height]);

    let {left, top} = margin;
    if (explore) {
        left = 5;
        top = 60;
    }
    var plotsvg = d3.select(obj)
        .insert("svg", ":first-child")
        .attr("x", -40)
        .attr("y", -45)
        .attr("id", () => myname)
        .style("width", width) // set height to the height of #main.left
        .style("height", height)
        .append("g")
        .attr("transform", "translate(" + left + "," + top + ")");

    plotsvg.selectAll("rect")
        .data(yVals)
        .enter()
        .append("rect")
        .attr("x", (d, i) =>  x(xVals[i] - 0.5 + barPadding))
        .attr("y", d =>  y(maxY - d))
        .attr("width", x(minX + 0.5 - 2 * barPadding)) // the "width" is the coordinate of the end of the first bar
        .attr("height", y)
        .attr("fill", "#1f77b4");
}


// Function takes as input an array of x values, array of y values, x axis name, y axis name, and a div id, and renders a scatterplot there
export function scatter(x_Axis, y_Axis, x_Axis_name, y_Axis_name, id, dim, title) {
    if(typeof id === 'undefined') id = '#setxLeftPlot';
    if(typeof dim === 'undefined') dim = {width: 400, height: 300};
    if(typeof title === 'undefined') title='Scatterplot';
    let data = [];
    for(let i = 0; i<x_Axis.length; i++) {
        data[i] = {[x_Axis_name]:x_Axis[i], [y_Axis_name]:y_Axis[i]};
    }
    data = JSON.stringify(data);
    let stringified = JSON.stringify(scatterPE);
    stringified = stringified.replace(/tworavensY/g, y_Axis_name);
    stringified = stringified.replace(/tworavensX/g, x_Axis_name);
    stringified = stringified.replace(/tworavensTitle/g, title);
    stringified = stringified.replace("url", "values");
    stringified = stringified.replace('"tworavensData"',data);

    let vegajson = JSON.parse(stringified);
    vegaEmbed(id, vegajson, dim);
}


export function scatterOld(x_Axis, y_Axis, x_Axis_name, y_Axis_name, id='#setxLeftPlot') {
    d3.select(id).html("");
    d3.select(id).select("svg").remove();

    x_Axis = x_Axis.map(Number);
    y_Axis = y_Axis.map(Number);

    console.log(x_Axis);
    console.log(y_Axis);

    let mainwidth = elem('#main').clientWidth;
    let mainheight = elem('#main').clientHeight;

    // scatter plot
    let data_plot = [];
    var nanCount = 0;
    for (var i = 0; i < x_Axis.length; i++) {
        if (isNaN(x_Axis[i]) || isNaN(y_Axis[i])) {
            nanCount++;
        } else {
            var newNumber1 = x_Axis[i];
            var newNumber2 = y_Axis[i];
            data_plot.push({xaxis: newNumber1, yaxis: newNumber2, score: Math.random() * 100});
        }
    }

    var margin = {top: 35, right: 35, bottom: 35, left: 35};
    var width = mainwidth*.25- margin.left - margin.right;
    var height = mainwidth*.25 - margin.top - margin.bottom;
    var padding = 100;

    var min_x = d3.min(data_plot, (d, i) => data_plot[i].xaxis);
    var max_x = d3.max(data_plot, (d, i) => data_plot[i].xaxis);
    var avg_x = (max_x - min_x) / 10;
    var min_y = d3.min(data_plot, (d, i) => data_plot[i].yaxis);
    var max_y = d3.max(data_plot, (d, i) => data_plot[i].yaxis);
    var avg_y = (max_y - min_y) / 10;

    var xScale = d3.scale.linear()
        .domain([min_x - avg_x, max_x + avg_x])
        .range([0, width]);
    var yScale = d3.scale.linear()
        .domain([min_y - avg_y, max_y + avg_y])
        .range([height, 0]);
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickSize(-height);
    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(5)
        .tickSize(-width);
    var zoom = d3.behavior.zoom()
        .x(xScale)
        .y(yScale)
        .scaleExtent([1, 10])
        .on("zoom", zoomed);

    var chart_scatter = d3.select(id)
        .append('svg:svg')
        .attr('width', width + margin.right + margin.left)
        .attr('height', height + margin.top + margin.bottom);
    // .call(zoom); dropping this for now, until the line zooms properly
    var main1 = chart_scatter.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .attr('width', width+ margin.right + margin.left)
        .attr('height', height + margin.top + margin.bottom)
        .attr('class', 'main');
    let gX = main1.append('g')
        .attr('transform', 'translate(0,' + height + ')')
        .attr('class', 'x axis')
        .call(xAxis);
    let gY = main1.append('g')
        .attr('transform', 'translate(0,0)')
        .attr('class', 'y axis')
        .call(yAxis);
    var clip = main1.append("defs").append("svg:clipPath")
        .attr("id", "clip")
        .append("svg:rect")
        .attr("id", "clip-rect")
        .attr("x", "0")
        .attr("y", "0")
        .attr('width', width)
        .attr('height', height);

    main1.append("g").attr("clip-path", "url(#clip)")
        .selectAll("circle")
        .data(data_plot)
        .enter()
        .append("circle")
        .attr("cx", (d, i) => xScale(data_plot[i].xaxis))
        .attr("cy", (d, i) => yScale(data_plot[i].yaxis))
        .attr("r", 2)
        .style("fill", "#B71C1C");
    chart_scatter.append("text")
        .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
        .attr("transform", "translate(" + padding / 5 + "," + (height / 2) + ")rotate(-90)")  // text is drawn off the screen top left, move down and out and rotate
        .text(y_Axis_name)
        .style("fill", "#424242")
        .style("text-indent","20px")
        .style("font-size","12px")
        .style("font-weight","bold");
    chart_scatter.append("text")
        .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
        .attr("transform", "translate(" + (width / 2) + "," + (height + (padding / 2)) + ")")  // centre below axis
        .text(x_Axis_name)
        .style("fill", "#424242")
        .style("text-indent","20px")
        .style("font-size","12px")
        .style("font-weight","bold");
    main1.append("line")
        .attr("x1", xScale(min_x))
        .attr("y1", yScale(min_x))
        .attr("x2", xScale(max_x))
        .attr("y2", yScale(max_x))
        .attr("stroke-width", 2)
        .attr("stroke", "black");

    function zoomed() {
        var panX = d3.event.translate[0];
        var panY = d3.event.translate[1];
        var scale = d3.event.scale;

        panX = panX > 10 ? 10 : panX;
        var maxX = -(scale - 1) * width - 10;
        panX = panX < maxX ? maxX : panX;

        panY = panY > 10 ? 10 : panY;
        var maxY = -(scale - 1) * height - 10;
        panY = panY < maxY ? maxY : panY;

        zoom.translate([panX, panY]);

        main1.select(".x.axis").call(xAxis);
        main1.select(".y.axis").call(yAxis);
        main1.selectAll("circle")
            .attr("cx", (d, i) => {
                console.log("circle x ", xScale(5));
                return xScale(data_plot[i].xaxis);
            })
            .attr("cy", (d, i) => yScale(data_plot[i].yaxis))
            .attr("r", 2.5)
            .style("fill", "#B71C1C");

        // below doesn't work, so I'm just dropping the zoom
        main1.select("line")
            .attr("x1", (d, i) => xScale(min_x))
            .attr("y1", (d, i) => xScale(min_x))
            .attr("x2", (d, i) => xScale(max_x))
            .attr("y2", (d, i) => yScale(max_x))
            .attr("stroke-width", 2)
            .attr("stroke", "black");
    }
    //  d3.select("#NAcount").text("There are " + nanCount + " number of NA values in the relation.");
}


