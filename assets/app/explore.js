import m from 'mithril';

import * as app from './app';
import * as plots from './plots';

const $private = false;

function heatmap(x_Axis_name, y_Axis_name) {
    d3.select("#heatChart").select("svg").remove();
    $('#heatchart').html("");

    var margin_heat = {top: 30, right: 10, bottom: 60, left: 60},
        width_heat = 500 - margin_heat.left - margin_heat.right,
        height_heat = 300 - margin_heat.top - margin_heat.bottom;
    var padding = 100;

    var min_x = d3.min(data_plot, function (d, i) {
        return data_plot[i].xaxis;
    });
    var max_x = d3.max(data_plot, function (d, i) {
        return data_plot[i].xaxis;
    });
    var avg_x = (max_x - min_x) / 100;
    var min_y = d3.min(data_plot, function (d, i) {
        return data_plot[i].yaxis;
    });
    var max_y = d3.max(data_plot, function (d, i) {
        return data_plot[i].yaxis;
    });
    var avg_y = (max_y - min_y) / 100;

    var x = d3.scale.linear()
        .domain([min_x - avg_x, max_x + avg_x])
        .range([0, width_heat]);

    var y = d3.scale.linear()
        .domain([min_y - avg_y, max_y + avg_y])
        .range([height_heat, 0]);

    var z = d3.scale.linear().range(["#EF9A9A", "#EF5350"]);

    // This could be inferred from the data if it weren't sparse.
    var xStep = avg_x+ 0.1,
        yStep = avg_y + 0.2;
    var svg_heat = d3.select("#heatchart").append("svg")
        .attr("width", width_heat + margin_heat.left + margin_heat.right)
        .attr("height", height_heat + margin_heat.top + margin_heat.bottom)
        .append("g")
        .attr("transform", "translate(" + margin_heat.left + "," + margin_heat.top+ ")")
        .style("background-color", "#FFEBEE");


    // Compute the scale domains.
    x.domain(d3.extent(data_plot, function (d, i) {
        return data_plot[i].xaxis;
    }));
    y.domain(d3.extent(data_plot, function (d, i) {
        return data_plot[i].yaxis;
    }));
    z.domain([0, d3.max(data_plot, function (d, i) {
        return data_plot[i].score;
    })]);

    // Extend the x- and y-domain to fit the last bucket.
    // For example, the y-bucket 3200 corresponds to values [3200, 3300].
    x.domain([x.domain()[0], +x.domain()[1] + xStep]);
    y.domain([y.domain()[0], y.domain()[1] + yStep]);

    // Display the tiles for each non-zero bucket.
    // See http://bl.ocks.org/3074470 for an alternative implementation.
    svg_heat.selectAll(".tile")
        .data(data_plot)
        .enter().append("rect")
        .attr("class", "tile")
        .attr("x", function (d, i) {
            return x(data_plot[i].xaxis);
        })
        .attr("y", function (d, i) {
            return y(data_plot[i].yaxis + yStep );
        })
        .attr("width", 15)
        .attr("height", 15)
        .attr("dx", ".35em")
        .attr("dy", ".35em")
        .style("fill", function (d, i) {
            return z(data_plot[i].score);
        });


    svg_heat.append("text")
        .attr("class", "label")
        .attr("x", width_heat + 20)
        .attr("y", 10)
        .attr("dy", ".35em")
        .text("Count");

    // Add an x-axis with label.
    svg_heat.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height_heat + ")")
        .call(d3.svg.axis().scale(x).ticks(5).tickSize(-height_heat).orient("bottom"))
        .append("text")
        .attr("class", "label")
        .attr("x", width_heat)
        .attr("y", -6)
        .attr("text-anchor", "end")
        .text("");

    // Add a y-axis with label.
    svg_heat.append("g")
        .attr("class", "y axis")
        .call(d3.svg.axis().scale(y).tickSize(-width_heat).orient("left"))
        .append("text")
        .attr("class", "label")
        .attr("y", 6)
        .attr("dy", ".71em")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .text("");

    svg_heat.append("text")
        .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
        .attr("transform", "translate(-40," + (height_heat / 2) + ")rotate(-90)")  // text is drawn off the screen top left, move down and out and rotate
        .text(y_Axis_name)
        .style("fill", "#424242")
        .style("text-indent","20px")
        .style("font-size","12px")
        .style("font-weight","bold");

    svg_heat.append("text")
        .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
        .attr("transform", "translate(" + (width_heat / 2) + "," + (height_heat + padding / 4) + ")")  // centre below axis
        .text(x_Axis_name)
        .style("fill", "#424242")
        .style("text-indent","20px")
        .style("font-size","12px")
        .style("font-weight","bold");


}
var data_plot = [];

function bivariatePlot(x_Axis, y_Axis, x_Axis_name, y_Axis_name) {
    app.byId('scatterplot').style.display = 'block';
    app.byId('NAcount').style.display = 'block';
    d3.select("#scatterplot").html("");
    d3.select("#scatterplot").select("svg").remove();

    app.byId('linechart').style.display = 'none';
    d3.select("#heatchart").select("svg").remove();
    d3.select("#linechart").select("svg").remove();
    d3.select("#linechart").html("");
    d3.select("#heatchart").html("");
    // $("#NAcount").html("");

    console.log("bivariate plot called");
    // scatter plot

    data_plot = [];
    let nanCount = 0;
    for (let i = 0; i < 1000; i++) {
        if (isNaN(x_Axis[i]) || isNaN(y_Axis[i])) {
            nanCount++;
        } else {
            let newNumber1 = x_Axis[i];
            let newNumber2 = y_Axis[i];
            data_plot.push({xaxis: newNumber1, yaxis: newNumber2, score: Math.random() * 100});
        }
    }

    let margin = {top: 20, right: 15, bottom: 40, left: 60},
        width = 500 - margin.left - margin.right,
        height = 280 - margin.top - margin.bottom,
        padding = 100;

    let min_x = d3.min(data_plot, (_, i) => data_plot[i].xaxis);
    let max_x = d3.max(data_plot, (_, i) => data_plot[i].xaxis);
    var avg_x = (max_x - min_x) / 10;
    var min_y = d3.min(data_plot, function (d, i) {
        return data_plot[i].yaxis;
    });
    var max_y = d3.max(data_plot, function (d, i) {
        return data_plot[i].yaxis;
    });
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

    var chart_scatter = d3.select('#scatterplot')
        .append('svg:svg')
        .attr('width', width + margin.right + margin.left)
        .attr('height', height + margin.top + margin.bottom)
        .call(zoom);

    var main1 = chart_scatter.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .attr('width', width+ margin.right + margin.left)
        .attr('height', height + margin.top + margin.bottom)
        .attr('class', 'main');

    main1.append('g')
        .attr('transform', 'translate(0,' + height + ')')
        .attr('class', 'x axis')
        .call(xAxis);

    main1.append('g')
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
        .attr("cx", function (d, i) {
            return xScale(data_plot[i].xaxis);
        })
        .attr("cy", function (d, i) {
            return yScale(data_plot[i].yaxis);
        })
        .attr("r", 2)
        .style("fill", "#B71C1C")
    ;
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
            .attr("cx", (_, i) => xScale(data_plot[i].xaxis))
            .attr("cy", (_, i) => yScale(data_plot[i].yaxis))
            .attr("r", 2.5)
            .style("fill", "#B71C1C");
    }

    //heatmap
    d3.select("#NAcount").text("There are " + nanCount + " number of NA values in the relation.");
    // document.getElementById('heatchart').style.display = "block";
    heatmap(x_Axis_name, y_Axis_name);
}

let plotnamea, plotnameb, varn1, varn2, varsize1, varsize2;

function crossTabPlots(PlotNameA, PlotNameB) {
    plotnamea = PlotNameA;
    plotnameb = PlotNameB;
    var mydiv = "#resultsView_tabular";

    var plot_nodes = app.nodes.slice();
    var margin_cross = {top: 30, right: 35, bottom: 40, left: 40},
        width_cross = 300 - margin_cross.left - margin_cross.right,
        height_cross = 160 - margin_cross.top - margin_cross.bottom;

    var padding_cross = 100;

    for (var i = 0; i < plot_nodes.length; i++) {
        if (plot_nodes[i].name === PlotNameA) {
            if (plot_nodes[i].plottype === "continuous") {
                density_cross(plot_nodes[i]);
            }
            else if (plot_nodes[i].plottype === "bar") {
                bar_cross(plot_nodes[i]);
            }
        } else if (plot_nodes[i].name === PlotNameB) {
            if (plot_nodes[i].plottype === "continuous") {
                density_cross(plot_nodes[i]);
            }
            else if (plot_nodes[i].plottype === "bar") {
                bar_cross(plot_nodes[i]);
            }
        }
    }
    d3.select(mydiv).append("g")
        .attr("id", "btnDiv")
        .style('font-size', '75%')
        .style("width", "280px")
        .style("position","relative")
        .style("left", (margin_cross.left+ (padding_cross/2)) + "px")
        .style("top", "18px");

    d3.select("#btnDiv")[0][0].innerHTML =[
        '<h5>Data Selection</h5>',
        '<p>Enter the numbers for both plots respectively to specify the distribution of the cross-tabs.</p>',
        '<p id="boldstuff" style="color: #2a6496">Select between Equidistant and Equimass.</p>'
    ].join('\n');

    d3.select("#btnDiv")
        .append("input")
        .attr({
            id: "a",
            placeholder: PlotNameA,
            size: 20
        });

    // style both of the inputs at once
    // more on HTML5 <input> at https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input
    d3.selectAll("input")
        .attr({
            "type": "text",
            "size": 3,
            "autofocus": "true",
            "inputmode": "numeric"
        })
        .style({
            "text-align": "center",
            "display": "inline-block",
            "margin-right": "10px"
        });


    var btns = d3.select("#btnDiv").selectAll("button").data(["EQUIDISTANCE", "EQUIMASS"]);
    btns = btns.enter().append("button").style("display", "inline-block");

    // fill the buttons with the year from the data assigned to them
    btns.each(function (d) {
        this.innerText = d;
    });

    btns.on("click", getData);

    d3.select(mydiv).append("g")
        .attr("id", "btnDiv1")
        .style('font-size', '75%')
        .style("width", "280px")
        .style("position","relative")
        .style("left", (margin_cross.left-(padding_cross*1.75)) + "px")
        .style("top", "50px");

    d3.select("#btnDiv1")
        .append("input")
        .attr({
            "id": "b",
            "placeholder": PlotNameB,
            "size": 20
        });

    // style both of the inputs at once
    // more on HTML5 <input> at https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input
    d3.selectAll("input")
        .attr({
            "type": "text",
            "size": 3,
            "autofocus": "true",
            "inputmode": "numeric"
        })
        .style({
            "text-align": "center",
            "display": "inline-block",
            "margin-right": "10px"
        });

    var btns1 = d3.select("#btnDiv1").selectAll("button").data(["EQUIDISTANCE", "EQUIMASS"]);
    btns1 = btns1.enter().append("button").style("display", "inline-block");

    // fill the buttons with the year from the data assigned to them
    btns1.each(function (d) {
        this.innerText = d;
    });
    btns1.on("click", getData1);

    function getData() {
        if (this.innerText === "EQUIDISTANCE") {
            varn1 = 'equidistance';
            varsize1 = parseInt(d3.select("input#a")[0][0].value);
            equidistance(PlotNameA, varsize1);
        } else if (this.innerText === "EQUIMASS") {
            varn1 = 'equimass';
            varsize1 = parseInt(d3.select("input#a")[0][0].value);
            equimass(PlotNameA, varsize1);
        }
    }
    function getData1() {
        if (this.innerText === "EQUIDISTANCE") {
            varn2 = 'equidistance';
            varsize2 = parseInt(d3.select("input#b")[0][0].value);
            equidistance(PlotNameB, varsize2);
        } else if (this.innerText === "EQUIMASS") {
            varn2 = 'equimass';
            varsize2 = parseInt(d3.select("input#b")[0][0].value);
            equimass(PlotNameB, varsize2);
        }
    }

    /*
      trail
    */

    // this is the function to add  the density plot if any
    function density_cross(density_env,a,method_name) {
        // setup the x_cord according to the size given by user

        console.log("welcome to : " + density_env.name);
        //var mydiv = "#resultsView_tabular";
        var yVals = density_env.ploty;
        var xVals = density_env.plotx;

        // an array of objects

        var data2 = [];
        for (var i = 0; i < density_env.plotx.length; i++) {
            data2.push({x: density_env.plotx[i], y: density_env.ploty[i]});
        }

        data2.forEach(function (d) {
            d.x = +d.x;
            d.y = +d.y;
        });
        //  console.log(data2);

        var min_x = d3.min(data2, function (d, i) {
            return data2[i].x;
        });
        var max_x = d3.max(data2, function (d, i) {
            return data2[i].x;
        });
        var avg_x = (max_x - min_x) / 10;
        var min_y = d3.min(data2, function (d, i) {
            return data2[i].y;
        });
        var max_y = d3.max(data2, function (d, i) {
            return data2[i].y;
        });
        var avg_y = (max_y - min_y) / 10;
        var x = d3.scale.linear()
            .domain([d3.min(xVals), d3.max(xVals)])
            .range([0, width_cross]);

        var invx = d3.scale.linear()
            .range([d3.min(data2.map(function (d) {
                return d.x;
            })), d3.max(data2.map(function (d) {
                return d.x;
            }))])
            .domain([0, width_cross]);

        var y = d3.scale.linear()
            .domain([d3.min(data2.map(function (d) {
                return d.y;
            })), d3.max(data2.map(function (d) {
                return d.y;
            }))])
            .range([height_cross, 0]);


        var xAxis = d3.svg.axis()
            .scale(x)
            .ticks(5)
            .orient("bottom");

        var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left");

        var area = d3.svg.area()
            .interpolate("monotone")
            .x(function (d) {
                return x(d.x);
            })
            .y0(height_cross - avg_y)
            .y1(function (d) {
                return y(d.y);
            });

        var line = d3.svg.line()
            .x(function (d) {
                return x(d.x);
            })
            .y(function (d) {
                return y(d.y);
            })
            .interpolate("monotone");

        var plotsvg = d3.select(mydiv)
            .append("svg")
            .attr("id", "plotsvg_id")
            .style("width", width_cross + margin_cross.left + margin_cross.right) //setting height to the height of #main.left
            .style("height", height_cross + margin_cross.top + margin_cross.bottom)
            .style("margin-left","20px")
            .append("g")
            .attr("transform", "translate(0," + margin_cross.top + ")");


        plotsvg.append("path")
            .attr("id", "path1")
            .datum(data2)
            .attr("class", "area")
            .attr("d", area);
        plotsvg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + (height_cross  ) + ")")
            .call(xAxis);

        plotsvg.append("text")
            .attr("x", (width_cross / 2))
            .attr("y", (margin_cross.top + padding_cross -10))
            .attr("text-anchor", "middle")
            .text(density_env.name)
            .style("text-indent","20px")
            .style("font-size","12px")
            .style("font-weight","bold");

        if (isNaN(a) || a === 0) {
            console.log("do nothing #bar")
            var upper_limit = d3.max(xVals);
            var lower_limit = d3.min(xVals);

            var z = 10;
            //console.log(upper_limit +" and " + lower_limit);
            var diff = upper_limit - lower_limit;
            var buffer = diff / z;
            var x_cord = [];
            console.log("diff : " + diff);
            console.log("buffer : " + buffer);
            var push_data = lower_limit;
            for (var i = 0; i < z - 1; i++) {
                push_data = push_data + buffer;
                x_cord.push(push_data);
                //console.log("x_cord : " + x_cord);


                plotsvg.append("line")
                    .attr("id", "line1")
                    .attr("x1", x(x_cord[i]))
                    .attr("x2", x(x_cord[i]))
                    .attr("y1", y(d3.min(yVals)))
                    .attr("y2", y(d3.max(yVals)))
                    .style("stroke", "#212121")
                    .style("stroke-dasharray", "3");
            }
        }
        else {
            if (method_name === "equidistance") {

                var upper_limit = d3.max(xVals);
                var lower_limit = d3.min(xVals);


                //console.log(upper_limit +" and " + lower_limit);
                var diff = upper_limit - lower_limit;
                var buffer = diff / a;
                var x_cord = [];
                console.log("diff : " + diff);
                console.log("buffer : " + buffer);
                var push_data = lower_limit;
                for (var i = 0; i < a - 1; i++) {
                    push_data = push_data + buffer;
                    x_cord.push(push_data);
                    // console.log("x_cord : " + x_cord);


                    plotsvg.append("line")
                        .attr("id", "line1")
                        .attr("x1", x(x_cord[i]))
                        .attr("x2", x(x_cord[i]))
                        .attr("y1", y(d3.min(yVals)))
                        .attr("y2", y(d3.max(yVals)))
                        .style("stroke", "#0D47A1")
                        .style("stroke-dasharray", "4");
                }

            }

            else if (method_name === "equimass") // here we use the data from equimassCalculation to draw lines
            {
                console.log(" density equimass called ");
                var temp = [];

                temp = equimassCalculation(density_env, a);
                console.log("temp for density : " + temp);
                for (var i = 1; i < a; i++) {
                    plotsvg.append("line")
                        .attr("id", "line1")
                        .attr("x1", x(temp[i]))
                        .attr("x2", x(temp[i]))
                        .attr("y1", y(d3.min(yVals)))
                        .attr("y2", y(d3.max(yVals)))
                        .style("stroke", "#0D47A1")
                        .style("stroke-dasharray", "4");
                }
            }
        }
    }


    // this is the function to add the bar plot if any
    function bar_cross(bar_env,a,method_name) {
        console.log("welcome to : " + bar_env.name);

        var barPadding = .015;  // Space between bars
        var topScale = 1.2;      // Multiplicative factor to assign space at top within graph - currently removed from implementation
        var plotXaxis = true;

        // Data
        var keys = Object.keys(bar_env.plotvalues);
        var yVals = new Array;
        var ciUpperVals = new Array;
        var ciLowerVals = new Array;
        var ciSize;

        var xVals = new Array;
        var yValKey = new Array;

        // console.log(keys);

        //    var mydiv = "#resultsView_tabular";


        if (bar_env.nature === "nominal") {
            var xi = 0;
            for (var i = 0; i < keys.length; i++) {
                if (bar_env.plotvalues[keys[i]] == 0) {
                    continue;
                }
                yVals[xi] = bar_env.plotvalues[keys[i]];
                xVals[xi] = xi;
                if ($private) {
                    if (bar_env.plotvaluesCI) {
                        ciLowerVals[xi] = bar_env.plotValuesCI.lowerBound[keys[i]];
                        ciUpperVals[xi] = bar_env.plotValuesCI.upperBound[keys[i]];
                    }
                    ciSize = ciUpperVals[xi] - ciLowerVals[xi];
                }
                ;

                yValKey.push({y: yVals[xi], x: keys[i]});
                xi = xi + 1;
            }
            yValKey.sort(function (a, b) {
                return b.y - a.y
            }); // array of objects, each object has y, the same as yVals, and x, the category
            yVals.sort(function (a, b) {
                return b - a
            }); // array of y values, the height of the bars
            ciUpperVals.sort(function (a, b) {
                return b.y - a.y
            }); // ?
            ciLowerVals.sort(function (a, b) {
                return b.y - a.y
            }); // ?
        }
        else {
            for (var i = 0; i < keys.length; i++) {
                // console.log("plotvalues in bars");
                //console.log(node);
                yVals[i] = bar_env.plotvalues[keys[i]];
                xVals[i] = Number(keys[i]);
                if ($private) {
                    if (bar_env.plotvaluesCI) {
                        ciLowerVals[i] = bar_env.plotvaluesCI.lowerBound[keys[i]];
                        ciUpperVals[i] = bar_env.plotvaluesCI.upperBound[keys[i]];
                    }
                    ciSize = ciUpperVals[i] - ciLowerVals[i];
                }
            }
        }

        if ((yVals.length > 15 & bar_env.numchar === "numeric") | (yVals.length > 5 & bar_env.numchar === "character")) {
            plotXaxis = false;
        }
        var minY=d3.min(yVals);
        var  maxY = d3.max(yVals); // in the future, set maxY to the value of the maximum confidence limit
        var  minX = d3.min(xVals);
        var  maxX = d3.max(xVals);
        var   x_1 = d3.scale.linear()
            .domain([minX - 0.5, maxX + 0.5])
            .range([0, width_cross]);

        var invx = d3.scale.linear()
            .range([minX - 0.5, maxX + 0.5])
            .domain([0, width_cross]);

        var  y_1 = d3.scale.linear()
        // .domain([0, maxY])
            .domain([0, maxY])
            .range([0, height_cross]);

        var xAxis = d3.svg.axis()
            .scale(x_1)
            .ticks(yVals.length)
            .orient("bottom");

        var yAxis = d3.svg.axis()
            .scale(y_1)
            .orient("left");

        var    plotsvg1 = d3.select(mydiv)
            .append("svg")
            .attr("id","plotsvg1_id")
            .style("width", width_cross + margin_cross.left + margin_cross.right) //setting height to the height of #main.left
            .style("height", height_cross + margin_cross.top + margin_cross.bottom)
            .style("margin-left","20px")
            .append("g")
            .attr("transform", "translate(0," + margin_cross.top + ")");

        var rectWidth = x_1(minX + 0.5 - 2 * barPadding); //the "width" is the coordinate of the end of the first bar

        plotsvg1.selectAll("rect")

            .data(yVals)
            .enter()
            .append("rect")
            .attr("id","path2")
            .attr("x", function (d, i) {
                return x_1(xVals[i] - 0.5 + barPadding);
            })
            .attr("y", function (d) {
                return y_1(maxY - d);
            })
            .attr("width", rectWidth)
            .attr("height", function (d) {
                return y_1(d);
            })
            .attr("fill", "#fa8072");

        if (plotXaxis) {
            plotsvg1.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height_cross + ")")
                .call(xAxis);
        }

        plotsvg1.append("text")
            .attr("x", (width_cross / 2))
            .attr("y", margin_cross.top + padding_cross-10)
            .attr("text-anchor", "middle")
            .text(bar_env.name)
            .style("text-indent","20px")
            .style("font-size","12px")
            .style("font-weight","bold");

        if(isNaN(a)|| a===0) {
            console.log("do nothing #bar");
            x_cord2 = equimass_bar(bar_env, keys.length);
            //console.log("x_cord2 equidis : " + x_cord2);

            console.log(" bar equimass called ");
            for (var i = 0; i < keys.length - 1; i++) {
                // console.log("x_cord1 actual: " + x_1(x_cord2[i]));
                plotsvg1.append("line")
                    .attr("id", "line2")
                    .attr("x1", x_1(x_cord2[i] ))
                    .attr("x2", x_1(x_cord2[i] ))
                    .attr("y1", y_1(0))
                    .attr("y2", y_1(maxY))
                    .style("stroke", "#212121")
                    .style("stroke-dasharray", "4");
            }
        }
        else {
            if (method_name === "equidistance") {
                var upper_limit1 = maxX;
                var lower_limit1 = minX;
                var diff1 = upper_limit1 - lower_limit1;
                var buffer1 = diff1 / a;
                var x_cord1 = [];
                console.log("diff1 : " + diff1);
                console.log("buffer1 : " + buffer1);
                var push_data1 = lower_limit1;
                for (var i = 0; i < a - 1; i++) {
                    push_data1 = push_data1 + buffer1;
                    x_cord1.push(push_data1);
                    //console.log("x_cord1 equidis : "+ x_cord1);
                    // console.log("x_cord1 actual: " + x_1(x_cord1[i]));
                    //console.log("maxY : "+ maxY);
                    plotsvg1.append("line")
                        .attr("id", "line2")
                        .attr("x1", x_1(x_cord1[i]))
                        .attr("x2", x_1(x_cord1[i]))
                        .attr("y1", y_1(0))
                        .attr("y2", y_1(maxY))
                        .style("stroke", "#0D47A1")
                        .style("stroke-dasharray", "4");
                }
            } else if (method_name==="equimass") {
                var x_cord2 = [];
                x_cord2 = equimass_bar(bar_env, a);
                //console.log("x_cord2 equidis : " + x_cord2);

                console.log(" bar equimass called ");
                for (var i = 0; i < a - 1; i++) {
                    // console.log("x_cord1 actual: " + x_1(x_cord2[i]));
                    plotsvg1.append("line")
                        .attr("id", "line2")
                        .attr("x1", x_1(x_cord2[i] ))
                        .attr("x2", x_1(x_cord2[i] ))
                        .attr("y1", y_1(0))
                        .attr("y2", y_1(maxY))
                        .style("stroke", "#0D47A1")
                        .style("stroke-dasharray", "4");
                }
            }
        }
    }

    function equidistance(A,a)
    {
        var method_name= "equidistance";

        // json object to be sent to r server
        var obj = new Object();
        obj.plotNameA = A;
        obj.equidistance = a;

        //convert object to json string
        var string = JSON.stringify(obj);

        //convert string to Json Object
        console.log(JSON.parse(string)); // this is your requirement.

        for (var i = 0; i < plot_nodes.length; i++) {
            if (plot_nodes[i].name === A) {
                if (plot_nodes[i].plottype === "continuous") {
                    $("#plotsvg_id").remove();
                    density_cross(plot_nodes[i],a,method_name);
                }
                else if (plot_nodes[i].plottype === "bar") {
                    $("#plotsvg1_id").remove();
                    // d3.select("#line2").remove();
                    bar_cross(plot_nodes[i],a,method_name);
                }
            } else {
                console.log("not found")
            }
        }
    }
    function equimass(A,a) //equimass function to call the plot function
    {
        var method_name= "equimass";

        // json object to be sent to r server
        var obj = new Object();
        obj.plotNameA = A;
        obj.equidistance = a;

        //convert object to json string
        var string = JSON.stringify(obj);

        //convert string to Json Object
        console.log(JSON.parse(string)); // this is your requirement.

        for (var i = 0; i < plot_nodes.length; i++) {
            if (plot_nodes[i].name === A) {
                if (plot_nodes[i].plottype === "continuous") {
                    $("#plotsvg_id").remove();
                    //d3.select("#line1").remove();
                    density_cross(plot_nodes[i],a,method_name);
                }
                else if (plot_nodes[i].plottype === "bar") {
                    $("#plotsvg1_id").remove();
                    // d3.select("#line2").remove();
                    bar_cross(plot_nodes[i],a,method_name);
                }
            } else {
                console.log("not found")
            }
        }
    }

    function equimassCalculation(plot_ev,n) // here we find the coordinates using CDF values
    {
        //var n =v-1;
        var arr_y=[];
        var arr_x=[];

        arr_y=plot_ev.cdfploty;// cdfploty data stored
        arr_x=plot_ev.cdfplotx;// cdfplotx data stored

        var Upper_limitY= d3.max(arr_y);
        var Lower_limitY=d3.min(arr_y);
        var diffy=Upper_limitY-Lower_limitY;
        var e=(diffy)/n; // e is the variable to store the average distance between the points in the cdfy in order to divide the cdfy

        console.log("Upper_limitY ;"+Upper_limitY);
        console.log("Lower_limitX :"+Lower_limitY);
        console.log("e "+e );

        var arr_c=[]; //array to store the cdfy divided coordinates data
        var push_data=arr_y[0];
        for(var i=0;i<n;i++)
        {
            push_data=push_data+e;
            arr_c.push(push_data);
        }

        console.log("arr_c : "+ arr_c);

        var temp_cdfx=[];
        var temp=[];
        var store=[];

        for (var i=0; i<n; i++)//to get through each arr_c
        {
            console.log("test arcc_c" + arr_c[i]);
            for (var j = 0; j < 50; j++)// to compare with cdfy or arr_y
            {
                if (arr_c[i] === arr_y[j]) {
                    store.push({val: i, coor1: j, coor2: j, diff1: 0.34, diff2: 0});// for testing purpose
                }
            }
        }
        for(var i=0; i<n;i++) {
            var diff_val1, diff_val2;// here the diff is not actual difference, it is the fraction of the distance from the two points
            var x1, x2, x3,x4;
            for (var j = 0; j < 50; j++) {
                //  console.log(" j out"+ j );
                if (arr_y[j] < arr_c[i] && arr_c[i] < arr_y[j + 1]) {
                    x1 = arr_c[i];
                    x2 = arr_c[i]-arr_y[j];
                    x3 = arr_y[j+1]-arr_c[i];
                    x4=arr_y[j+1]-arr_y[j];
                    console.log(" val1 : " +x1 + " val2 : " + arr_y[j] + " val3: " + arr_y[j+1]);
                    console.log(" x1-x2 : " +x2 + " x3-x1 : " + x3 + " x3-x2: " + x4);

                    // console.log(" j in"+ j );

                    diff_val1 = x2/ x4;
                    diff_val2 = x3 / x4;
                    console.log("diff_val1: "+ diff_val1 +  " diff_val2: "+ diff_val2);
                    store.push({val: i, coor1: j, coor2: j + 1, diff1: diff_val1, diff2: diff_val2});
                }
            }
        }


        for(var i=0; i<n; i++) {
            console.log(" store : " + store[i].val + " " + store[i].coor1 + " "+ store[i].coor2 + " diff1 " + store[i].diff1 + " diff2 "+ store[i].diff2);
        }

        for(var i=0; i<n; i++) {
            var y1,y2,y3,diffy1,diffy2;
            y1=store[i].val;
            y2= store[i].coor1;
            y3= store[i].coor2;
            diffy1=store[i].diff1;
            diffy2=store[i].diff2;

            var x_coor1= arr_x[y2];
            var x_coor2=arr_x[y3];

            var x_diff=x_coor2-x_coor1;

            var distance1= x_diff*diffy1;

            var val_x=x_coor1+distance1;

            temp.push(val_x);
            console.log(" val_x"+ val_x);
        }
        return temp;
    }

    function equimass_bar(plot_ev,n) {
        var keys = Object.keys(plot_ev.plotvalues);
        var k = keys.length;
        var temp = [];
        var count = 0;

        if (k < n) {
            alert("error enter vaild size");
            console.log("error enter vaild size")
        }

        else {
            while (k > 0) {
                temp.push({pos: count, val: k});
                //console.log("k:"+ k+ " and n: "+count );
                count++;
                k--;
                if (count >= n) {
                    count = 0;
                }
            }

            var temp2 = new Array(n);

            for (var i = 0; i < temp2.length; i++) {
                temp2[i] = 0;
            }
            for (var i = 0; i < keys.length; i++) {
                keys[i] = (keys[i] + 5) / 10;// to get the increase in the actual values by 0.5 according to the xaxis in plot
            }
            for (var i = 0; i < n; i++) {
                for (var j = 0; j < temp.length; j++) {
                    if (temp[j].pos === i) {
                        temp2[i] = temp2[i] + 1;
                    }
                }
            }

            for (var i = 0; i < temp.length; i++) {
                console.log("n : " + temp[i].pos + " and k: " + temp[i].val);
            }
            console.log(" the divison of the bar plot : " + temp2);

            var j = 0, k = 0;
            var temp_final = new Array(n);
            for (var i = 0; i < keys.length; i++) {
                temp2[j] = temp2[j] - 1;
                if (temp2[j] === 0) {
                    j++;
                    temp_final[k] = keys[i];
                    k++;
                }
            }
            console.log("temp_final: " + temp_final);
            return temp_final;
        }
    }
}

export function linechart() {
    document.getElementById('linechart').style.display = "block";
    d3.select("#lineChart").select("svg").remove();
    $('#linechart').html("");

    var w_linechart = 500;
    var h_linechart = 300;
    var margin_linechart = {top: 20, right: 80, bottom: 30, left: 50};
    var width_linechart = w_linechart - margin_linechart.left - margin_linechart.right;
    var height_linechart = h_linechart - margin_linechart.top - margin_linechart.bottom;

    var svg = d3.select("#linechart").append("svg")
        .attr("id", "chart")
        .attr("width", w_linechart)
        .attr("height", h_linechart);
    var chart = svg.append("g")
        .classed("display", true)
        .attr("transform", "translate(" + margin_linechart.left + "," + margin_linechart.top + ")");
    // var dateParser = d3.time.format("%Y/%m/%d").parse;
    var x = d3.scale.linear()
        .domain(d3.extent(data_plot, function (d) {

            return d.xaxis;
        }))
        .range([0, width_linechart]);
    var y = d3.scale.linear()
        .domain([d3.min(data_plot, function (d) {
            return d.yaxis;
        }), d3.max(data_plot, function (d) {
            return d.yaxis;
        })])
        .range([height_linechart, 0]);
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .ticks(5)
    ;
    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .ticks(5);
    var line = d3.svg.line()
        .x(function (d) {

            return x(d.xaxis);
        })
        .y(function (d) {
            return y(d.yaxis);
        });

    function plot(params) {
        this.append("g")
            .classed("x axis", true)
            .attr("transform", "translate(0," + height_linechart + ")")
            .call(params.axis.x);
        this.append("g")
            .classed("y axis", true)
            .attr("transform", "translate(0,0)")
            .call(params.axis.y);
        //enter()
        this.selectAll(".trendline")
            .data([params.data])
            .enter()
            .append("path")
            .classed("trendline", true);
        this.selectAll(".point")
            .data(params.data)
            .enter()
            .append("circle")
            .classed("point", true)
            .attr("r", 2);
        //update
        this.selectAll(".trendline")
            .attr("d", function (d) {
                return line(d);
            });
        this.selectAll(".point")
            .attr("cx", function (d) {
                var date = d.xaxis;
                return x(date);
            })
            .attr("cy", function (d) {
                return y(d.yaxis);
            })
            .style("color", "#EF5350");
        //exit()
        this.selectAll(".trendline")
            .data([params.data])
            .exit()
            .remove();
        this.selectAll(".point")
            .data(params.data)
            .exit()
            .remove();
    }

    plot.call(chart, {
        data: data_plot,
        axis: {
            x: xAxis,
            y: yAxis
        }
    });
}

var zbreaks=[];
var zbreaks_tabular=[];

function viz(m, json_vizexplore, model_name_set) {
    console.log('testing....', m, model_name_set);
    d3.select("#tabular_1")
        .style("display", "block");
    d3.select("#plotA").html("");
    d3.select("#plotB").html("");
    d3.select("#SelectionData").html("");
    console.log("Viz explore method called: " + model_name_set);

    var get_data = [];
    get_data = model_name_set.split("-");

    var model_name1 = get_data[0] + "-" + get_data[1];
    var model_name2 = get_data[1] + "-" + get_data[0];
    var mym = +m.substr(5, 5) - 1;

    function removeKids(parent) {
        while (parent.firstChild) {
            parent.removeChild(parent.firstChild);
        }
    }

    var json = json_vizexplore;
    // pipe in figures to right panel
    var filelist = new Array;

    // image added to the div
    var x_axis = [];
    var y_axis = [];
    for (var i in json.plotdata) {
        for (var j in json.plotdata[i].varname) {
            if (json.plotdata[i].varname[j] === get_data[0]) {
                for (var k in json.plotdata[i].data) {
                    x_axis[k] = json.plotdata[i].data[k];
                }
            }
            if (json.plotdata[i].varname[j] === get_data[1]) {
                for (var k in json.plotdata[i].data) {
                    y_axis[k] = json.plotdata[i].data[k];
                }
            }
        }
    }

    document.getElementById('scatterplot').style.display = "none";
    bivariatePlot(x_axis, y_axis, get_data[0], get_data[1]);
    crossTabPlots(get_data[0], get_data[1]);

    var cork = [];
    var corp = [];
    var cors = [];
    var var1 = [];
    var var2 = [];
    var table_obj = [];
    var colnames = [];
    var colvar = [];
    var table_data = [];
    var rowvar = [];
    var rownames = [];
    function crossTab_Table(json_my) {
        var json1 = json_my;
        // data for statistics
        for (var i in json1.tabular) {
            if (i == model_name1 || i == model_name2) {
                for (var j in json1.tabular[i].colnames) {
                    colnames.push(json1.tabular[i].colnames[j]);
                }
            }
        }
        for (var i in json1.tabular) {
            if (i == model_name1 || i == model_name2) {
                for (var k in json1.tabular[i].rownames) {
                    rownames.push(json1.tabular[i].rownames[k]);
                }
            }
        }
        for (var i in json1.tabular) {
            if (i == model_name1 || i == model_name2) {
                for (var l in json1.tabular[i].rowvar) {
                    rowvar.push(json1.tabular[i].rowvar[l]);
                }
            }
        }
        for (var i in json1.tabular) {
            if (i == model_name1 || i == model_name2) {
                for (var m in json1.tabular[i].colvar) {
                    colvar.push(json1.tabular[i].colvar[m]);
                }
            }
        }
        for (var i in json1.tabular) {
            if (i == model_name1 || i == model_name2) {
                for (var n in json1.tabular[i].data) {
                    table_data[n] = [];
                    for (var a = 0; a < colnames.length; a++) {
                        table_data[n].push(json1.tabular[i].data[n][a]);
                    }
                }
            }
        }
        for (var p = 0; p < rownames.length; p++) {// console.log(" row data : "+ p);
            for (var l = 0; l < colnames.length; l++) {
                table_obj.push({rowname: rownames[p], colname: colnames[l], value: table_data[p][l]});
            }
        }
        d3table1(table_obj);
    }

    // for the statistics
    for (var key in json.statistical) {
        if (key == model_name1 || key == model_name2) {
            for (var a in json.statistical[key].cork) {
                cork.push(json.statistical[key].cork[a]);
            }
        }
    }
    for (var key1 in json.statistical) {
        if (key1 == model_name1 || key1 == model_name2) {
            for (var b in json.statistical[key1].corp) {
                corp.push(json.statistical[key1].corp[b]);
            }
        }
    }
    for (var key in json.statistical) {
        if (key == model_name1 || key == model_name2) {
            for (var c in json.statistical[key].cors) {
                cors.push(json.statistical[key].cors[c]);
            }
        }
    }
    for (var key in json.statistical) {
        if (key == model_name1 || key == model_name2) {
            for (var d in json.statistical[key].var1) {
                var1.push(json.statistical[key].var1[d]);
            }
        }
    }
    for (var key4 in json.statistical) {
        if (key == model_name1 || key == model_name2) {
            for (var e in json.statistical[key].var2) {
                var2.push(json.statistical[key].var2[e]);
            }
        }
    }
    for (var i = 0; i < app.zparams.zvars.length; i++)
        // write the results table
        var resultsArray = [];
    for (var key in json.tabular) {
        if (key == "colnames") {
            console.log("colnames found");
            continue;
        }
        var obj = json.tabular[key];
        resultsArray.push(obj);
    }

    function d3table1(data) {
        d3.select("#tabular_2").style("display","block");
        d3.select("#tabular_1").style("display","none");
        var width = 120,   // width of svg
            height = 160,  // height of svg
            padding = 22; // space around the chart, not including labels

        d3.select("#tabular_2")
            .html("")
            .style("background-color", "#fff")
            .append("h5")
            .text("CROSS-TABS ")
            .style("color", "#424242");

        var sv = d3.select("#tabular_2").append("svg").attr("width", "100%").attr("height", "100%").style("overflow", "visible");
        var fo = sv.append('foreignObject').attr("width", "100%").attr("height", "100%").style("padding", 10).attr("overflow", "visible");
        var table = fo.append("xhtml:table").attr("class", "table").style("border-collapse", " collapse"),
            th = table.append("tr").style("border", 1).text("_").style("color", "#fff");
        for (var i = 0; i < colnames.length; i++) {
            th.append("td").style("border-bottom", 1).style("text-align", "center").style("background-color", plots.selVarColor).append("b").text(colnames[i]);
        }
        for (var k = 0; k < rownames.length; k++) {
            var pos = 0;
            var tr = table.append("tr").style("margin-left", 20).style("background-color", "#BDBDBD").style("border", 1).style("text-align", "center").text(rownames[k]);
            for (var m = 0; m < colnames.length; m++) {
                for (var z = 0; z < data.length; z++) {
                    if (rownames[k] === data[z].rowname && colnames[m] === data[z].colname) {
                        tr.append("td").style("border", 1).style("text-align", "center").style("position", "relative").style("background-color", app.varColor).text(data[z].value);
                    }
                }
            }
        }
    }
    $('#selection').click(function() {
        console.log("this is selection");
        d3.select("#tabular_2").html("");
        d3.select("#tabular_2").style("display","none");
        d3.select("#tabular_1").style("display","block");
        d3.select("#plotA").html("");
        d3.select("#plotB").html("");
        d3.select("#SelectionData").html("");
        crossTabPlots(get_data[0], get_data[1]);
    });
    $('#crossTabs').click(function() {
        console.log("this is crossTabs");
        d3.select("#plotA").html("");
        d3.select("#plotB").html("");
        d3.select("#SelectionData").html("");
        d3.select("#tabular_2").html("");
        explore_crosstab(json);
        estimateLadda.stop();  // stop spinner
        estimated = true;
    });

    function explore_crosstab(btn) {
        for (var key in app.zparams) {
            if (app.zparams.hasOwnProperty(key)) {
                // do something with `key'
                if(key==="zcrosstabs")
                {
                    delete app.zparams[key];
                }
            }
        }

        function writeCrossTabsJson() {
            var plotAval=varsize1,plotBval=varsize2;
            if(isNaN(plotAval)) {
                plotAval=10;
            }
            if(isNaN(plotBval)){plotBval=10;}
            var jsondata = {
                var1: {
                    name: plotnamea,
                    value: plotAval,
                    buttonType: varn1
                },
                var2: {
                    name: plotnameb,
                    value: plotBval,
                    buttonType: varn2
                }
            };
            return JSON.stringify(jsondata);
        }
        app.zparams.zcrosstab.push(writeCrossTabsJson());
        if (PRODUCTION && app.zparams.zsessionid == "") {
            alert("Warning: Data download is not complete. Try again soon.");
            return;
        }
        app.zPop();

        // write links to file & run R CMD
        app.zparams.callHistory = app.callHistory;
        var jsonout = JSON.stringify(app.zparams);

        urlcall = rappURL + "exploreapp"; //base.concat(jsonout);
        var solajsonout = "solaJSON=" + jsonout;
        console.log("POST out this: ", solajsonout);

        function explore_crosstabSuccess(json) {
            console.log("crossTabSuccess");
            d3.json("rook/myresult2.json", function (error, json) {
                if (error) return console.warn(error);
                var jsondata = json;
                console.log("explore DATA json: ", jsondata);
                crossTab_Table(jsondata);
            });
        }
        function explore_crosstabFail() {
            estimateLadda.stop();  // stop spinner
            estimated = true;
        }
        estimateLadda.start();  // start spinner
        makeCorsRequest(urlcall, btn, explore_crosstabSuccess, explore_crosstabFail, solajsonout);
    }

    // data for the statistical div
    var string1 = cork.toString();
    var string3 = string1.substring(string1.indexOf(":"), string1.length);
    var string2 = string1.substring(0, string1.indexOf("c"));
    var string4 = corp.toString();
    var string6 = string4.substring(string4.indexOf(":"), string4.length);
    var string5 = string4.substring(0, string4.indexOf("c"));
    var string7 = cors.toString();
    var string9 = string7.substring(string7.indexOf(":"), string7.length);
    var string8 = string7.substring(0, string7.indexOf("c"));
    var statistical_data = [
        {correlation: string2, value: string3},
        {correlation: string5, value: string6},
        {correlation: string8, value: string9}
    ];

    function d3table(data) {
        d3.select("#resultsView_statistics")
            .html("")
            .style("background-color", "#fff")
            .append("h5")
            .text("CORRELATION STATISTICS ")
            .style("color", "#424242");
        var table = d3.select("#resultsView_statistics").append("table").attr("class", "table").style("border-collapse", " collapse"),
            th = table.append("tr").style("border", 1);
        for (var i in Object.keys(data[0])) {
            th.append("td").style("border-bottom", 1).style("text-align", "left").style("background-color", plots.selVarColor).append("b").text(Object.keys(data[0])[i]);
        }
        for (var row in data) {
            var tr = table.append("tr").style("margin-left", 40).style("border", 1).style("text-align", "left");
            for (var td in data[row])
                tr.append("td").style("border", 1).style("text-align", "left").style("position", "relative").style("background-color", app.varColor).text(data[row][td]);
        }
    }
    d3table(statistical_data);
}


function model_selection(model_selection_name, count_value, json) {
    if (count_value % 2 == 0 && count_value != 0) {
        d3.select("#modelView")
            .append("span")
            .text("\u00A0 \u00A0 \u00A0 \u00A0   \u00A0 ")
            .style("margin-top", 0)
            .style("white-space", "pre")
            .style("display", "inline-block")
            .style("float", "left")
            .append("span")
            .text("|")
            .style("margin-top", 0)
            .style("white-space", "pre")
            .style("display", "inline-block")
            .style("float", "left")
            .append("span")
            .text("\u00A0 \u00A0 \u00A0 \u00A0   \u00A0 ")
            .style("margin-top", 0)
            .style("white-space", "pre")
            .style("display", "inline-block")
            .style("float", "left");

    }
    d3.select("#modelView")
        .append("span")
        .text(" \u00A0")
        .style("margin-top", 0)
        .style("float", "left")

        .style("display", "inline-block")
        .style("white-space", "pre")
        .style("overflow-y", "hidden")
        .style("overflow-x", "scroll")
        .append("button")// top stack for results
    //      .append("xhtml:button")
        .attr("class","btn btn-outline-success")
        .style("padding","4px")
        .attr("id", model_selection_name)
        .text(model_selection_name)
        .style('background-color', function() {
            var color1 = "#FFD54F";
            return count == count1 ? plots.selVarColor : color1;
        })
        .style("display", "inline-block")
        .style("white-space", "pre")
        .style("margin-top", 0)
        .style("float", "left")
        .on("click", function() {
            var a = this.style.backgroundColor.replace(/\s*/g, "");
            var b = app.hexToRgba(plots.selVarColor).replace(/\s*/g, "");
            if (a.substr(0, 17) === b.substr(0, 17)) {
                return; //escapes the function early if the displayed model is clicked
            }
            viz(this.id, json, model_selection_name);
            d3.select("#modelView")
                .selectAll("button")
                .style('background-color', "#FFD54F");
            d3.select(this)
                .style('background-color', plots.selVarColor);
        });
}

function showLog() {
    if (app.logArray.length > 0) {
        app.byId('logdiv').setAttribute("style", "display:block");
        d3.select("#collapseLog div.panel-body").selectAll("p")
            .data(app.logArray)
            .enter()
            .append("p")
            .text(d => d);
        return;
    }
    app.byId('logdiv').setAttribute("style", "display:none");
}

let count = 0;
let count1 = 0;

/**
   called by clicking 'Explore' in explore mode
*/
export async function explore() {
    if (app.downloadIncomplete()) {
        return;
    }

    app.zPop();
    console.log('zpop:', app.zparams);

    // write links to file & run R CMD
    app.zparams.callHistory = app.callHistory;
    app.estimateLadda.start(); // start spinner
    let json = await app.makeRequest(ROOK_SVC_URL + 'exploreapp', app.zparams);
    app.estimated = true;
    if (!json) {
        return;
    }
    app.allResults.push(json);

    d3.select('#rightpanel')
        .style('width', '75%');

    let parent = app.byId('rightContentArea');
    app.estimated || parent.removeChild(app.byId('resultsHolder'));
    d3.select("#modelView").html('');
    d3.select("#resultsView_statistics").html('');

    d3.select("#result_left")
        .style("display", "block");
    d3.select("#result_right")
        .style("display", "block");
    d3.select("#scatterplot")
        .style("display", "block");
    d3.select("#heatchart")
        .style("display", "block");
    d3.select("#modelView_Container")
        .style("display", "block");
    d3.select("#modelView")
        .style("display", "block");
    d3.select("#resultsView_tabular")
        .style("display", "block");
    d3.select("#resultsView_statistics")
        .style("display", "block");

    d3.select("#modelView")
        .style('background-color', app.hexToRgba(app.varColor))
        .style("overflow-y", "hidden")
        .style("overflow-x", "scroll")
        .append("span")
        .style("white-space", "pre")
        .style("margin-top", 0)
        .style("float", "left")
        .style("position", "relative")
        .style("color", "#757575")
        .text("MODEL SELECTION :  ");

    // programmatic click on Results button
    $("#btnBivariate").trigger("click");
    let model_name;
    for (let img in json.images) {
        if (count === 0) {
            model_name = img;
        }
        model_selection(img, count, json); // for entering all the variables
        count++;
    }
    count1 = count - 1;
    app.modelCount++;

    var rCall = [];
    rCall[0] = json.call;
    app.logArray.push("explore: ".concat(rCall[0]));
    showLog();
    viz(model_name, json, model_name);
}

