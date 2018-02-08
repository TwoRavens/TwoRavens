import m from 'mithril';

import * as app from './app';
import * as plots from './plots';

const $private = false;

function heatmap(x_Axis_name, y_Axis_name) {
    document.getElementById('heatchart').style.display = "block";
    d3.select("#heatchart").select("svg").remove();
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

let heatxaxis, heatyaxis;
let data_plot = [];

function bivariatePlot(x_Axis, y_Axis, x_Axis_name, y_Axis_name) {
    heatxaxis = x_Axis_name;
    heatyaxis = y_Axis_name;
    app.byId('scatterplot').style.display = 'block';
    d3.select("#scatterplot").html("");
    d3.select("#scatterplot").select("svg").remove();

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
        .attr("cx", (_, i) => xScale(data_plot[i].xaxis))
        .attr("cy", (_, i) => yScale(data_plot[i].yaxis))
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

    d3.select('#NAcount').style('display', 'block');
    d3.select("#NAcount").text("There are " + nanCount + " number of NA values in the relation.");
}

let plotnamea, plotnameb, varn1, varn2, varsize1, varsize2;

let continuous_n = 0;
let bar_n = 0;

export function get_width(id) {
    return 50 * (id === 'plotA' ? continuous_n : bar_n);
}

function crossTabPlots(PlotNameA, PlotNameB, json_obj) {
    plotnamea = PlotNameA;
    plotnameb = PlotNameB;
    $("#input1").attr("placeholder", PlotNameA).blur();
    $("#input2").attr("placeholder", PlotNameB).blur();
    let [plot_a, plot_b] = ['#plotA', '#plotB'];

    var margin_cross = {top: 30, right: 35, bottom: 40, left: 40},
        width_cross = 300 - margin_cross.left - margin_cross.right,
        height_cross = 160 - margin_cross.top - margin_cross.bottom;
    var padding_cross = 100;

    d3.select("#input1").on("mouseover", function() {
        d3.select("#tooltipPlotA")
            .style("visibility", "visible")
            .style("opacity","1")
            .text(PlotNameA);
    })
        .on("mouseout",function(){
            d3.select("#tooltipPlotA")
                .style("visibility", "hidden")
                .style("opacity","0");
        });
    d3.select("#input2").on("mouseover", function() {
        d3.select("#tooltipPlotB")
            .style("visibility", "visible")
            .style("opacity","1")
            .text(PlotNameB);
    })
        .on("mouseout",function(){
            d3.select("#tooltipPlotB")
                .style("visibility", "hidden")
                .style("opacity","0");
        });

    var plot_nodes = app.nodes.slice();
    for (let node of plot_nodes) {
        if (node.name === PlotNameA) {
            if (node.plottype === "continuous") {
                continuous_n++;
                density_cross(node);
            } else if (node.plottype === "bar") {
                bar_n++;
                bar_cross(node);
            }
        } else if (node.name === PlotNameB) {
            if (node.plottype === "continuous") {
                continuous_n++;
                density_cross(node);
            } else if (node.plottype === "bar") {
                bar_n++;
                bar_cross(node);
            }
        }
    }

    let plotA_size, plotB_size, plotA_sizem, plotB_sizem;
    let varn1, varn2, varsize1, varsize2;
    $("#Equidistance1").click(function(){
        varn1 = "equidistance";
        plotA_size = parseInt(d3.select("#input1")[0][0].value);
        varsize1 = plotA_size;
        equidistance(PlotNameA, plotA_size);
        document.getElementById("plotA_status").innerHTML = `${PlotNameA} : ${varn1} distribution with ${varsize1} divisions`;
    });
    $("#Equimass1").click(function(){
        plotA_sizem = parseInt(d3.select("#input1")[0][0].value);
        varsize1 = plotA_sizem;
        equimass(PlotNameA, plotA_sizem);
        varn1 = "equimass";
        document.getElementById("plotA_status").innerHTML = `${PlotNameA} : ${varn1} distribution with ${varsize1} divisions`;
    });
    $("#Equidistance2").click(function(){
        varn2 = "equidistance";
        plotB_size = parseInt(d3.select("#input2")[0][0].value);
        equidistance(PlotNameB, plotB_size);
        varsize2 = plotB_size;
        document.getElementById("plotB_status").innerHTML = `${PlotNameB} : ${varn2} distribution with ${varsize2} divisions`;
    });
    $("#Equimass2").click(function(){
        varn2 = "equimass";
        plotB_sizem = parseInt(d3.select("#input2")[0][0].value);
        equimass(PlotNameB, plotB_sizem);
        varsize2 = plotB_sizem;
        document.getElementById("plotB_status").innerHTML = `${PlotNameB} : ${varn2} distribution with ${varsize2} divisions`;
    });

    // this is the function to add  the density plot if any
    function density_cross(density_env,a,method_name) {
        // setup the x_cord according to the size given by user
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

        var plotsvg = d3.select(plot_a)
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
            var upper_limit = d3.max(xVals);
            var lower_limit = d3.min(xVals);
            var z = 10;
            var diff = upper_limit - lower_limit;
            var buffer = diff / z;
            var x_cord = [];
            var push_data = lower_limit;
            for (var i = 0; i < z - 1; i++) {
                push_data = push_data + buffer;
                x_cord.push(push_data);
                plotsvg.append("line")
                    .attr("id", "line1")
                    .attr("x1", x(x_cord[i]))
                    .attr("x2", x(x_cord[i]))
                    .attr("y1", y(d3.min(yVals)))
                    .attr("y2", y(d3.max(yVals)))
                    .style("stroke", "#0D47A1")
                    .style("stroke-dasharray", "3");
            }
        } else {
            if (method_name === "equidistance") {
                var upper_limit = d3.max(xVals);
                var lower_limit = d3.min(xVals);
                var diff = upper_limit - lower_limit;
                var buffer = diff / a;
                var x_cord = [];
                var push_data = lower_limit;
                for (var i = 0; i < a - 1; i++) {
                    push_data = push_data + buffer;
                    x_cord.push(push_data);
                    plotsvg.append("line")
                        .attr("id", "line1")
                        .attr("x1", x(x_cord[i]))
                        .attr("x2", x(x_cord[i]))
                        .attr("y1", y(d3.min(yVals)))
                        .attr("y2", y(d3.max(yVals)))
                        .style("stroke", "#0D47A1")
                        .style("stroke-dasharray", "4");
                }
            } else if (method_name === "equimass") {
                // here we use the data from equimassCalculation to draw lines
                var temp = [];
                temp = equimassCalculation(density_env, a);
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
                yValKey.push({y: yVals[xi], x: keys[i]});
                xi = xi + 1;
            }
            yValKey.sort((a, b) => b.y - a.y); // array of objects, each object has y, the same as yVals, and x, the category
            yVals.sort((a, b) => b - a); // array of y values, the height of the bars
            ciUpperVals.sort((a, b) => b.y - a.y); // ?
            ciLowerVals.sort((a, b) => b.y - a.y); // ?
        } else {
            for (var i = 0; i < keys.length; i++) {
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

        var plotsvg1 = d3.select(plot_b)
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
            x_cord2 = equimass_bar(bar_env, keys.length);
            for (var i = 0; i < keys.length - 1; i++) {
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
                var push_data1 = lower_limit1;
                for (var i = 0; i < a - 1; i++) {
                    push_data1 = push_data1 + buffer1;
                    x_cord1.push(push_data1);
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
                for (var i = 0; i < a - 1; i++) {
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

    function equidistance(A,a) {
        var method_name= "equidistance";
        // json object to be sent to r server
        var obj = new Object();
        obj.plotNameA = A;
        obj.equidistance = a;
        var string = JSON.stringify(obj);
        for (var i = 0; i < plot_nodes.length; i++) {
            if (plot_nodes[i].name === A) {
                if (plot_nodes[i].plottype === "continuous") {
                    $("#plotsvg_id").remove();
                    density_cross(plot_nodes[i],a,method_name);
                }
                else if (plot_nodes[i].plottype === "bar") {
                    $("#plotsvg1_id").remove();
                    bar_cross(plot_nodes[i],a,method_name);
                }
            } else {
                console.log("not found");
            }
        }
    }
    function equimass(A,a) {
        //equimass function to call the plot function
        var method_name= "equimass";
        var obj = new Object();
        obj.plotNameA = A;
        obj.equidistance = a;
        var string = JSON.stringify(obj);
        for (var i = 0; i < plot_nodes.length; i++) {
            if (plot_nodes[i].name === A) {
                if (plot_nodes[i].plottype === "continuous") {
                    $("#plotsvg_id").remove();
                    density_cross(plot_nodes[i],a,method_name);
                }
                else if (plot_nodes[i].plottype === "bar") {
                    $("#plotsvg1_id").remove();
                    bar_cross(plot_nodes[i],a,method_name);
                }
            } else {
                console.log("not found");
            }
        }
    }

    function equimassCalculation(plot_ev,n) {
        // here we find the coordinates using CDF values
        //var n =v-1;
        var arr_y=[];
        var arr_x=[];

        arr_y=plot_ev.cdfploty;// cdfploty data stored
        arr_x=plot_ev.cdfplotx;// cdfplotx data stored

        var Upper_limitY= d3.max(arr_y);
        var Lower_limitY=d3.min(arr_y);
        var diffy=Upper_limitY-Lower_limitY;
        var e=(diffy)/n; // e is the variable to store the average distance between the points in the cdfy in order to divide the cdfy

        var arr_c=[]; //array to store the cdfy divided coordinates data
        var push_data=arr_y[0];
        for(var i=0;i<n;i++) {
            push_data=push_data+e;
            arr_c.push(push_data);
        }

        var temp_cdfx=[];
        var temp=[];
        var store=[];

        for (var i=0; i<n; i++)//to get through each arr_c
        {
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
                if (arr_y[j] < arr_c[i] && arr_c[i] < arr_y[j + 1]) {
                    x1 = arr_c[i];
                    x2 = arr_c[i]-arr_y[j];
                    x3 = arr_y[j+1]-arr_c[i];
                    x4=arr_y[j+1]-arr_y[j];
                    diff_val1 = x2/ x4;
                    diff_val2 = x3 / x4;
                    store.push({val: i, coor1: j, coor2: j + 1, diff1: diff_val1, diff2: diff_val2});
                }
            }
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
        } else {
            while (k > 0) {
                temp.push({pos: count, val: k});
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
            return temp_final;
        }
    }
}

export function linechart(x_Axis_name, y_Axis_name) {
    document.getElementById('linechart').style.display = "block";
    d3.select("#lineChart").select("svg").remove();
    $('#linechart').html("");
    let padding = 10;
    var w_linechart = 480;
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
        .ticks(5);
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

    let temp = d3.select("#main.left").style("width");
    let width = temp.substring(0, (temp.length - 2));
    let height = $(window).height() - 120;
    svg.append("text")
        .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
        .attr("transform", "translate(" + padding  + "," + (height / 3) + ")rotate(-90)")  // text is drawn off the screen top left, move down and out and rotate
        .text(y_Axis_name)
        .style("fill", "#424242")
        .style("text-indent","20px")
        .style("font-size","12px")
        .style("font-weight","bold");
    svg.append("text")
        .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
        .attr("transform", "translate(" + (width / 5) + "," + (height - padding - 128 ) + ")")  // centre below axis
        .text(x_Axis_name)
        .style("fill", "#424242")
        .style("text-indent","20px")
        .style("font-size","12px")
        .style("font-weight","bold");

    plot.call(chart, {
        data: data_plot,
        axis: {
            x: xAxis,
            y: yAxis
        }
    });
}

function viz(m, json_vizexplore, model_name_set) {
    d3.select("#plotA").html("");
    d3.select("#plotB").html("");
    d3.select("#tabular_1").style("display", "block");
    d3.select("#tabular_2").style("display", "block");

    let get_data = model_name_set.split("-");
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

    bivariatePlot(x_axis, y_axis, get_data[0], get_data[1]);

    $('#scatterplot_img').on('click', function(){
        $("#scatterplot_img").fadeOut("fast").fadeIn().fadeTo("fast",1.0);
    });
    $('#heatmap_img').on('click', function(){
        $("#heatmap_img").fadeOut("fast").fadeIn().fadeTo("fast",1.0);
    });
    $('#linechart_img').on('click', function(){
        $("#linechart_img").fadeOut("fast").fadeIn().fadeTo("fast",1.0);
    });
    $('#scatterplot_img').click(function() {
        document.getElementById('heatchart').style.display = "none";
        document.getElementById('linechart').style.display = "none";
        bivariatePlot(x_axis, y_axis, get_data[0], get_data[1]);
    });
    $('#heatmap_img').click(function() {
        document.getElementById('scatterplot').style.display = "none";
        document.getElementById('linechart').style.display = "none";
        heatmap(get_data[0], get_data[1]);
    });
    $('#linechart_img').click(function() {
        document.getElementById('heatchart').style.display = "none";
        document.getElementById('scatterplot').style.display = "none";
        linechart(get_data[0],get_data[1]);
    });

    var empty=[];
    crossTabPlots(get_data[0], get_data[1],empty);

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
    function crossTab_Table(json) {
        table_data = [];
        table_obj = [];
        let push = (i, key) => json.tabular[i][key].map(v => v);
        // data for statistics
        for (var i in json.tabular) {
            if (i == model_name1 || i == model_name2) {
                colnames = push(i, 'colnames');
                rownames = push(i, 'rownames');
                rowvar = push(i, 'rowvar');
                colvar = push(i,'colvar');
            }
        }
        for (var i in json.tabular) {
            if (i == model_name1 || i == model_name2) {
                for (var n in json.tabular[i].data) {
                    table_data[n] = [];
                    for (var a = 0; a < colnames.length; a++) {
                        table_data[n].push(json.tabular[i].data[n][a]);
                    }
                }
            }
        }
        for (var p = 0; p < rownames.length; p++) {
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
    for (var i = 0; i < app.zparams.zvars.length; i++) {
        var resultsArray = [];
    }
    for (var key in json.tabular) {
        if (key == "colnames") {
            console.log("colnames found");
            continue;
        }
        var obj = json.tabular[key];
        resultsArray.push(obj);
    }

    function d3table1(data) {
        var width = 120, // width of svg
            height = 160,// height of svg
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

    crossTab_Table(json);

    var plotAval=varsize1,plotBval=varsize2;
    if (isNaN(plotAval)) plotAval = 10;
    if (isNaN(plotBval)) plotBval = 10;
    let crosstabs =  {
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

    function removeData(key) {
        for (var key1 in app.zparams) {
            if (app.zparams.hasOwnProperty(key1) && key === key1 && app.zparams[key1.length] > 0) app.zparams[key1] = [];
        }
    }

    let zbreaks = [];
    let zbreaks_tabular = [];
    $('#SelectionData1').click(function() {
        d3.select("#tabular_2").html("");
        removeData('zcrosstab');
        app.zparams.zcrosstab.push(crosstabs);
        explore_crosstab(json);
        app.estimateLadda.stop();
        app.explored = true;
        zbreaks.push(crosstabs);
        zbreaks_tabular.push(json.tabular);
        d3.select('#breakspace')
            .append("span")
            .text("\u00A0 \u00A0 \u00A0 \u00A0   ")
            .style("margin-top", 0)
            .style("white-space", "pre")
            .style("display", "inline-block")
            .style("float", "left")
            .append("span")
            .append("button") // top stack for results
            .attr("class","btn btn-default btn-xs")
            .attr("id", zbreaks.length)
            .text("break " + (zbreaks.length + 1)).on("click", function() {
                d3.select("#tabular_2").html("");
                removeData();
                let id = this.id - 1;
                app.zparams.zcrosstab.push(zbreaks[id]);
                explore_crosstab(zbreaks_tabular[id]);

                var inputvalue1,inputvalue2;
                inputvalue1=zbreaks[id].var1.value;
                inputvalue2=zbreaks[id].var2.value;
                document.getElementById("input1").value = inputvalue1;
                document.getElementById("input2").value = inputvalue2;

                var json_obj=zbreaks[id];
                var varn1,varn2,varsize1,varsize2;
                if (json_obj.length===0) {
                    console.log("break not called");
                } else {
                    varn1=json_obj.var1.buttonType;
                    varn2=json_obj.var2.buttonType;
                    varsize1=json_obj.var1.value;
                    varsize2=json_obj.var2.value;
                    if (varn1==="equidistance") {
                        crossTabPlots.equidistance(get_data[0], varsize1);
                    } else if (varn1==="equimass") {
                        crossTabPlots.equimass(get_data[0],varsize1);
                    }
                    if (varn2==="equidistance") {
                        crossTabPlots.equidistance(get_data[1], varsize2);
                    } else if (varn2==="equimass") {
                        crossTabPlots.equimass(get_data[1], varsize2);
                    }
                }
            });
    });

    async function explore_crosstab(btn) {
        if (app.downloadIncomplete()) {
            return;
        }
        app.zPop();

        app.estimateLadda.start();
        // write links to file & run R CMD
        app.zparams.callHistory = app.callHistory;
        let json = await app.makeRequest(ROOK_SVC_URL + 'exploreapp', app.zparams);
        app.estimateLadda.start();
        app.explored = false;
        d3.json("static/result.json", (err, json) => {
            if (err) {
                return console.warn(err);
            }
            crossTab_Table(json);
            app.estimateLadda.stop();
            app.explored = true;
        });
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
    if (!json) {
        return;
    }
    app.allResults.push(json);

    let parent = app.byId('rightContentArea');
    //app.explored || parent.removeChild(app.byId('resultsHolder'));
    app.explored = true;

    d3.select("#decisionTree")
        .style("display", "none");
    d3.select("#modelView").html('');
    d3.select("#resultsView_statistics").html('');
    ["#left_thumbnail",
     "#result_left",
     "#result_left1",
     "#result_right",
     "#modelView_Container",
     "#modelView",
     "#resultsView_tabular",
     "#plotA",
     "#plotB",
     "#SelectionData",
     "#resultsView_statistics"
    ].forEach(id => d3.select(id).style("display", "block"));

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

export async function callTreeApp(node_var) {
    app.zPop();
    app.zparams.callHistory = app.callHistory;
    
    let res = await app.makeRequest(ROOK_SVC_URL + 'treeapp', {zparams:app.zparams, dv:node_var});
    if (!res) {
        alert("treeapp failed");
    } else {
        // console.log(res);
        univariatePart(res,node_var);
    }
}

// Kripanshu : Function to create D3 Tree using the JSON result from call Tree app
function univariatePart(json, var_name) {
    document.getElementById("decisionTree").innerHTML = "";
    d3.select('#rightpanel')
        .style('width', '75%');
    d3.select("#decisionTree")
        .style("display", "block")
        .append("p")
        .style("margin-top", "1px")
        .text(var_name);
    d3.select("p#resultsHolder").style("display", "none");
    d3.select("#left_thumbnail")
        .style("display", "none");
    d3.select("#result_left")
        .style("display", "none");
    d3.select("#result_left1")
        .style("display", "none");
    d3.select("#result_right")
        .style("display", "none");
    d3.select("#modelView_Container")
        .style("display", "none");
    d3.select("#modelView")
        .style("display", "none");
    d3.select("#resultsView_tabular")
        .style("display", "none");
    d3.select("#plotA")
        .style("display", "none");
    d3.select("#plotB")
        .style("display", "none");
    d3.select("#SelectionData")
        .style("display", "none");
    d3.select("#resultsView_statistics")
        .style("display", "none");

    // request for r code using nodevar
    //code for the  decision tree map

    var m = [15, 100, 15, 100],
        w = 700 - m[1] - m[3],
        h = 500 - m[0] - m[2],
        i = 0,
        rect_width = 60,
        rect_height = 20,
        max_link_width = 20,
        min_link_width = 1.5,
        char_to_pxl = 6,
        root;



    var tree = d3.layout.tree()
        .size([h, w]);

    var diagonal = d3.svg.diagonal()
        .projection(function(d) {
            return [d.x, d.y];
        });

    var vis = d3.select("#decisionTree").append("svg:svg")
        .attr("width", w + m[1] + m[3])
        .attr("height", h + m[0] + m[2] + 1000)
        .append("svg:g")
        .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

    // global scale for link width
    var link_stoke_scale = d3.scale.linear();

    var color_map = d3.scale.category10();

    // stroke style of link - either color or function
    var stroke_callback = "#ccc";
    load_dataset(json)

    function load_dataset(json_data) {

        console.log("our data for decision tree", json_data);
        root = json_data;
        root.x0 = 0;
        root.y0 = 0;

        var n_samples = root.samples;
        var n_labels = root.value.length;

        if (n_labels >= 2) {
            stroke_callback = mix_colors;
        } else if (n_labels === 1) {
            stroke_callback = mean_interpolation(root);
        }

        link_stoke_scale = d3.scale.linear()
            .domain([0, n_samples])
            .range([min_link_width, max_link_width]);

        function toggleAll(d) {
            if (d && d.children) {
                d.children.forEach(toggleAll);
                toggle(d);
            }
        }

        // Initialize the display to show a few nodes.
        root.children.forEach(toggleAll);

        update(root);
    }

    function update(source) {
        var duration = d3.event && d3.event.altKey ? 5000 : 500;

        // Compute the new tree layout.
        var nodes = tree.nodes(root).reverse();

        // Normalize for fixed-depth.
        nodes.forEach(function(d) {
            d.y = d.depth * 180;
        });

        // Update the nodes…
        var node = vis.selectAll("g.node")
            .data(nodes, function(d) {
                return d.id || (d.id = ++i);
            });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("svg:g")
            .attr("class", "node")
            .attr("transform", function(d) {
                return "translate(" + source.x0 + "," + source.y0 + ")";
            })
            .on("click", function(d) {
                toggle(d);
                update(d);
            });

        nodeEnter.append("svg:rect")
            .attr("x", function(d) {
                var label = node_label(d);
                var text_len = label.length * char_to_pxl;
                var width = d3.max([rect_width, text_len]);
                return -width / 2;
            })
            .attr("width", 1e-6)
            .attr("height", 1e-6)
            .attr("rx", function(d) {
                return d.type === "split" ? 2 : 0;
            })
            .attr("ry", function(d) {
                return d.type === "split" ? 2 : 0;
            })
            .style("stroke", function(d) {
                return d.type === "split" ? "steelblue" : "olivedrab";
            })
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

        nodeEnter.append("svg:text")
            .attr("dy", "12px")
            .attr("text-anchor", "middle")
            .text(node_label)
            .style("fill-opacity", 1e-6);

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")";
            });

        nodeUpdate.select("rect")
            .attr("width", function(d) {
                var label = node_label(d);
                var text_len = label.length * char_to_pxl;
                var width = d3.max([rect_width, text_len])
                return width;
            })
            .attr("height", rect_height)
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + source.x + "," + source.y + ")";
            })
            .remove();

        nodeExit.select("rect")
            .attr("width", 1e-6)
            .attr("height", 1e-6);

        nodeExit.select("text")
            .style("fill-opacity", 1e-6);

        // Update the links
        var link = vis.selectAll("path.link")
            .data(tree.links(nodes), function(d) {
                return d.target.id;
            });

        // Enter any new links at the parent's previous position.
        link.enter().insert("svg:path", "g")
            .attr("class", "link")
            .attr("d", function(d) {
                var o = {
                    x: source.x0,
                    y: source.y0
                };
                return diagonal({
                    source: o,
                    target: o
                });
            })
            .transition()
            .duration(duration)
            .attr("d", diagonal)
            .style("stroke-width", function(d) {
                return link_stoke_scale(d.target.samples);
            })
            .style("stroke", stroke_callback);

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("d", diagonal)
            .style("stroke-width", function(d) {
                return link_stoke_scale(d.target.samples);
            })
            .style("stroke", stroke_callback);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(duration)
            .attr("d", function(d) {
                var o = {
                    x: source.x,
                    y: source.y
                };
                return diagonal({
                    source: o,
                    target: o
                });
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    // Toggle children.
    function toggle(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
    }

    // Node labels
    function node_label(d) {
        if (d.type === "leaf") {
            // leaf
            var formatter = d3.format(".2f");
            var vals = [];
            d.value.forEach(function(v) {
                vals.push(formatter(v));
            });
            return "[" + vals.join(", ") + "]";
        } else {
            // split node
            return d.label;
        }
    }

    /**
     * Mixes colors according to the relative frequency of classes.
     */
    function mix_colors(d) {
        var value = d.target.value;
        var sum = d3.sum(value);
        var col = d3.rgb(0, 0, 0);
        value.forEach(function(val, i) {
            var label_color = d3.rgb(color_map(i));
            var mix_coef = val / sum;
            col.r += mix_coef * label_color.r;
            col.g += mix_coef * label_color.g;
            col.b += mix_coef * label_color.b;
        });
        return col;
    }


    /**
     * A linear interpolator for value[0].
     *
     * Useful for link coloring in regression trees.
     */
    function mean_interpolation(root) {

        var max = 1e-9,
            min = 1e9;

        function recurse(node) {
            if (node.value[0] > max) {
                max = node.value[0];
            }

            if (node.value[0] < min) {
                min = node.value[0];
            }

            if (node.children) {
                node.children.forEach(recurse);
            }
        }

        recurse(root);

        var scale = d3.scale.linear().domain([min, max])
            .range(["#2166AC", "#B2182B"]);

        function interpolator(d) {
            return scale(d.target.value[0]);
        }

        return interpolator;
    }


}






