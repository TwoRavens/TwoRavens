import m from 'mithril';

import * as app from './app';

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
            .attr("cx", function (d, i) {
                return xScale(data_plot[i].xaxis);
            })
            .attr("cy", function (d, i) {
                return yScale(data_plot[i].yaxis);
            })
            .attr("r", 2.5)
            .style("fill", "#B71C1C")
        ;
    }

    //heatmap
    d3.select("#NAcount").text("There are " + nanCount + " number of NA values in the relation.");
    // document.getElementById('heatchart').style.display = "block";
    heatmap(x_Axis_name, y_Axis_name);
}

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

function linechart() {
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
    zbreaks_tabular=[];
    // d3.select("#resultsView_tabular").html("");
    d3.select("#plotA").html("");
    d3.select("#plotB").html("");
    d3.select("#tabular_2").style("display", "block");
    d3.select("#tabular_1").style("display", "block");
    console.log("Viz explore method called: " + model_name_set);

    var get_data = [];
    get_data = model_name_set.split("-");

    //  console.log(get_data[0]+" and "+get_data[1]);

    var model_name1 = get_data[0] + "-" + get_data[1];
    var model_name2 = get_data[1] + "-" + get_data[0];

    var mym = +m.substr(5, 5) - 1;

    //console.log("mym is : "+ mym);
    function removeKids(parent) {
        while (parent.firstChild) {
            parent.removeChild(parent.firstChild);
        }
    }

    var json = json_vizexplore;
    //   console.log("json explore viz:"+json.toString());
    // pipe in figures to right panel
    var filelist = new Array;

    // image added to the div

    var x_axis = [];
    var y_axis = [];
    for (var i in json.plotdata) {
        for (var j in json.plotdata[i].varname) {
            //console.log(" the var name is : " + json.plotdata[i].varname[j]);
            if (json.plotdata[i].varname[j] === get_data[0]) {
                for (var k in json.plotdata[i].data) {
                    // console.log(json.plotdata[i].varname[j] + "data is : " + json.plotdata[i].data[k]);
                    x_axis[k] = json.plotdata[i].data[k];

                }
            }
            if (json.plotdata[i].varname[j] === get_data[1]) {
                for (var k in json.plotdata[i].data) {
                    // console.log(json.plotdata[i].varname[j] + "data is : " + json.plotdata[i].data[k]);
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
        //document.getElementById('scatterplot_img').style.display = "block";
        document.getElementById('heatchart').style.display = "none";
        document.getElementById('linechart').style.display = "none";
        bivariatePlot(x_axis, y_axis, get_data[0], get_data[1]);
    });

    $('#heatmap_img').click(function() {
        document.getElementById('scatterplot').style.display = "none";
        document.getElementById('linechart').style.display = "none";
        heatmap(get_data[0],get_data[1]);
    });
    $('#linechart_img').click(function() {
        document.getElementById('heatchart').style.display = "none";
        document.getElementById('scatterplot').style.display = "none";
        linechart(get_data[0],get_data[1]);
    });
    //  crossTabDensityPlot(x_axis,y_axis,get_data[0],get_data[1]);
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
    function crossTab_Table(json_my) {
        colnames=[];
        rownames=[];
        table_data=[];
        table_obj=[];
        console.log("test json:",json_my);
        var json1 = json_my;

        // data for statistics
        for (var i in json1.tabular) {
            //console.log("this is data : " + i)
            if (i == model_name1 || i == model_name2) {
                for (var j in json1.tabular[i].colnames) {
                    colnames.push(json1.tabular[i].colnames[j]);
                }
            }
        }

        for (var i in json1.tabular) {
            //   console.log("rownames: ");
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

    // for the statistics]
    // console.log("The data for the statistical"+ json.statistical)
    for (var key in json.statistical) {
        //   console.log(key);
        if (key == model_name1 || key == model_name2) {
            for (var a in json.statistical[key].cork) {
                //    console.log("cork: ");
                //   console.log(json.statistical[key].cork[a]);
                cork.push(json.statistical[key].cork[a]);
            }
        }
    }
    for (var key1 in json.statistical) {
        if (key1 == model_name1 || key1 == model_name2) {
            for (var b in json.statistical[key1].corp) {
                //  console.log("corp: ");
                //   console.log(json.statistical[key1].corp[b]);
                corp.push(json.statistical[key1].corp[b]);
            }
        }
    }
    for (var key in json.statistical) {
        if (key == model_name1 || key == model_name2) {
            for (var c in json.statistical[key].cors) {
                //  console.log("cors: ");
                //  console.log(json.statistical[key].cors[c]);
                cors.push(json.statistical[key].cors[c]);
            }
        }
    }

    for (var key in json.statistical) {
        if (key == model_name1 || key == model_name2) {
            for (var d in json.statistical[key].var1) {
                //     console.log("var1: ");
                //     console.log(json.statistical[key].var1[d]);
                var1.push(json.statistical[key].var1[d]);
            }
        }
    }
    for (var key4 in json.statistical) {
        if (key == model_name1 || key == model_name2) {
            for (var e in json.statistical[key].var2) {
                //   console.log("var2: ");
                //   console.log(json.statistical[key].var2[e]);
                var2.push(json.statistical[key].var2[e]);
            }
        }
    }

    for (var i = 0; i < zparams.zvars.length; i++)
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
        var width = 120,   // width of svg
            height = 160,  // height of svg
            padding = 22; // space around the chart, not including labels


        d3.select("#tabular_2")
            .html("")
            .style("background-color", "#fff")
            .append("h5")
            .text("CROSS-TABS ")
            .style("color", "#424242")
            .style("overflow","auto")
        ;

        var sv = d3.select("#tabular_2").append("svg").attr("width", "100%").attr("height", "100%").style("overflow", "visible");
        var fo = sv.append('foreignObject').attr("width", "100%").attr("height", "100%").style("padding", 10).attr("overflow", "visible");
        var table = fo.append("xhtml:table").attr("class", "table").style("border-collapse", " collapse"),
        th = table.append("tr").style("border", 1).text("_").style("color", "#fff");

        for (var i = 0; i < colnames.length; i++) {

            th.append("td").style("border-bottom", 1).style("text-align", "center").style("background-color", selVarColor).append("b").text(colnames[i]);

        }


        for (var k = 0; k < rownames.length; k++) {
            var pos = 0;
            var tr = table.append("tr").style("margin-left", 20).style("background-color", "#BDBDBD").style("border", 1).style("text-align", "center").text(rownames[k]);
            for (var m = 0; m < colnames.length; m++) {
                for (var z = 0; z < data.length; z++) {


                    if (rownames[k] === data[z].rowname && colnames[m] === data[z].colname) {
                        tr.append("td").style("border", 1).style("text-align", "center").style("position", "relative").style("background-color", varColor).text(data[z].value);
                        console.log("data for table: "+ data[z].value);
                    }
                }

            }
        }
        crossTab_Table(json);

        function removeData()
        {
            for (var key in zparams) {
                if (zparams.hasOwnProperty(key)) {
                    // do something with `key'
                    if(key==="zcrosstab" && key.length>0)
                    {
                        zparams[key]=[];
                    }

                }
            }
        }
        var breakcount=1;
        // crossTabPlots(get_data[0], get_data[1]);
        $('#SelectionData1').click(function(){
            // alert("The paragraph was clicked.");
            d3.select("#tabular_2").html("");
            removeData();
            zparams.zcrosstab.push(crossTabPlots.writeCrossTabsJson());
            explore_crosstab(json);

            estimateLadda.stop();  // stop spinner
            estimated = true;
            zbreaks.push(crossTabPlots.writeCrossTabsJson());
            zbreaks_tabular.push(json.tabular);

            d3.select("#breakspace")
                .append("span")
                .text("\u00A0 \u00A0 \u00A0 \u00A0   ")
                .style("margin-top", 0)
                .style("white-space", "pre")
                .style("display", "inline-block")
                .style("float", "left")
                .append("span")
                .append("button")// top stack for results
                .attr("class","btn btn-default btn-xs")
                .attr("id", breakcount-1)
                .text("break "+breakcount) .on("click", function () {
                    d3.select("#tabular_2").html("");
                    removeData();
                    zparams.zcrosstab.push(zbreaks[this.id]);
                    explore_crosstab(zbreaks_tabular[this.id]);

                    var inputvalue1,inputvalue2;
                    inputvalue1=zbreaks[this.id].var1.value;
                    inputvalue2=zbreaks[this.id].var2.value;

                    // console.log("val1:",inputvalue1);
                    // console.log("val2:",inputvalue2);

                    document.getElementById("input1").value = inputvalue1;
                    document.getElementById("input2").value = inputvalue2;

                    var json_obj=zbreaks[this.id];
                    var varn1,varn2,varsize1,varsize2;

                    if(json_obj.length===0)
                    {
                        console.log("break not called")
                    }else{
                        // console.log("break button called in crosstab")
                        varn1=json_obj.var1.buttonType;
                        varn2=json_obj.var2.buttonType;
                        varsize1=json_obj.var1.value;
                        varsize2=json_obj.var2.value;

                        if(varn1==="equidistance")
                        {
                            crossTabPlots.equidistance(get_data[0], varsize1);
                        }
                        else if (varn1==="equimass")
                        {
                            crossTabPlots.equimass(get_data[0],varsize1);
                        }

                        if(varn2==="equidistance")
                        {
                            crossTabPlots.equidistance(get_data[1], varsize2);
                        } else if (varn2==="equimass")
                        {
                            crossTabPlots.equimass(get_data[1], varsize2);
                        }
                    }
                });
            breakcount++;
        });

        for(var i=0; i<zbreaks.length; i++) {
            console.log("zbreaks are : "+ zbreaks[i]);
        }

        function explore_crosstab(btn) {
            if (production && zparams.zsessionid == "") {
                alert("Warning: Data download is not complete. Try again soon.");
                return;
            }
            zPop();
            //  console.log("zpop: ", zparams);
            // write links to file & run R CMD

            //package the output as JSON
            // add call history and package the zparams object as JSON
            zparams.callHistory = callHistory;
            var jsonout = JSON.stringify(zparams);

            //var base = rappURL+"zeligapp?solaJSON="
            urlcall = rappURL + "exploreapp"; //base.concat(jsonout);
            var solajsonout = "solaJSON=" + jsonout;
            //console.log("urlcall out: ", urlcall);
            // console.log("POST out this: ", solajsonout);

            function explore_crosstabSuccess(json) {
                console.log("crossTabSuccess");
                // readPreprocess(url,p,v,callback);
                d3.json("rook/result.json", function (error, json) {
                    if (error) return console.warn(error);
                    var jsondata = json;
                    //console.log("explore DATA json test: ", jsondata);

                    crossTab_Table(jsondata);
                    // var jsonget=json.tabular;
                    //console.log("json :"+ jsonget);
                    // d3table1(d);
                    estimateLadda.stop();  // stop spinner
                    estimated = true;
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
        //  console.log(string3);
        var string2 = string1.substring(0, string1.indexOf("c"));
        //  console.log(string2);
        var string4 = corp.toString();
        var string6 = string4.substring(string4.indexOf(":"), string4.length);
        //  console.log(string3);
        var string5 = string4.substring(0, string4.indexOf("c"));
        //  console.log(string2);
        var string7 = cors.toString();
        var string9 = string7.substring(string7.indexOf(":"), string7.length);
        //  console.log(string3);
        var string8 = string7.substring(0, string7.indexOf("c"));
        //  console.log(string2);
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
                th.append("td").style("border-bottom", 1).style("text-align", "left").style("background-color", selVarColor).append("b").text(Object.keys(data[0])[i]);
            }

            for (var row in data) {
                var tr = table.append("tr").style("margin-left", 40).style("border", 1).style("text-align", "left");
                for (var td in data[row])
                    tr.append("td").style("border", 1).style("text-align", "left").style("position", "relative").style("background-color", varColor).text(data[row][td]);
            }
        }

        d3table(statistical_data);
    }
}

function model_selection(model_selection_name, count_value) {
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
            return count === count1 ? selVarColor : color1;
        })
        .style("display", "inline-block")
        .style("white-space", "pre")
        .style("margin-top", 0)
        .style("float", "left")
        .on("click", function() {
            var a = this.style.backgroundColor.replace(/\s*/g, "");
            var b = hexToRgba(selVarColor).replace(/\s*/g, "");
            if (a.substr(0, 17) === b.substr(0, 17)) {
                return; //escapes the function early if the displayed model is clicked
            }
            viz(this.id, json, model_selection_name);
            d3.select("#modelView")
                .selectAll("button")
                .style('background-color', "#FFD54F");
            d3.select(this)
                .style('background-color', selVarColor);
        });
}

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
    let value;
    let count = 0;
    for (var i in json.images) {
        value = i;
        model_selection(value, count); // for entering all the variables
        count++;
    }
    let count1 = count - 1;
    app.modelCount++;
    var model = "Model".concat(app.modelCount);
    var model_name = value;
    console.log(" and our value is  : " + count1);

    var rCall = [];
    rCall[0] = json.call;
    app.logArray.push("explore: ".concat(rCall[0]));
    showLog();
    viz(model, json, model_name);
}

