import {
    alertError,
    alertWarn,
    allResults,
    byId,
    cdb, d3mMetrics, d3mTaskSubtype, d3mTaskType,
    default as app,
    del,
    downloadIncomplete, getPredictorVariables, getResultsProblem,
    hexToRgba,
    links,
    makeRequest,
    modelCount,
    nodes,
    priv, variableSummaries, workspace
} from "./app";
import * as d3 from "d3";
import m from "mithril";
import {bars, barsSubset, default as plots, density} from "./plots";
import $ from "jquery";
import * as common from "../common/common";
import {
    end_ta3_search,
    GRPC_GetFitSolutionRequest,
    GRPC_ProduceSolutionRequest,
    GRPC_ScoreSolutionRequest
} from "./solvers/d3m";
import {elem, fadeIn, fadeOut, fadeTo, remove, setAttrs} from "./utils";
import * as scatterPE from "./vega-schemas/scatterPE";
import vegaEmbed from "vega-embed";

var callHistory = [];

var transform_data ={
    "preprocess_id":0,
    "current_variable":"",
    "description" : "",
    "transform_variable":[
        "any name (optional)"
    ],
    "transform_type":{
        "manual_transform":true,
        "functional_transform":false
    },
    "transform_data":""
}

export let zparams = {
    zdata: [],
    zedges: [],
    ztime: [],
    znom: [],
    zcross: [],
    zmodel: "",
    zvars: [],
    zdv: [],
    zgroup1: [],
    zgroup2: [], // hard coding to two groups for present experiments, but will eventually make zgroup array of arrays, with zgroup.length the number of groups
    zdataurl: "",
    zd3mdata: "", //these take the place of zdataurl for d3m, because data is in two placees. eventually will generalize
    zd3mtarget: "",
    zsubset: [],
    zsetx: [],
    zmodelcount: 0,
    zplot: [],
    zsessionid: "",
    zdatacite: '...',
    zcrosstab: [],
    zusername: ''
};

/** needs doc */
export function zparamsReset(text, labels = 'zdv zcross ztime znom') {
    labels.split(' ').forEach(x => del(zparams[x], -1, text));
}

export let dataurl = '';

/** needs doc */
export function zPop() {
    if (dataurl) zparams.zdataurl = dataurl;
    zparams.zmodelcount = modelCount;
    zparams.zedges = [];
    zparams.zvars = [];
    zparams.znature = [];
    for (let j = 0; j < nodes.length; j++) { //populate zvars array
        zparams.zvars.push(nodes[j].name);
        zparams.znature.push(nodes[j].nature);
        let temp = nodes[j].id;
        zparams.zsetx[j] = allNodes[temp].setxvals;
        zparams.zsubset[j] = allNodes[temp].subsetrange;
    }
    for (let j = 0; j < links.length; j++) { //populate zedges array
        //correct the source target ordering for Zelig
        let srctgt = links[j].left == false ?
            [links[j].source.name, links[j].target.name] :
            [links[j].target.name, links[j].source.name];
        zparams.zedges.push(srctgt);
    }
}

/** needs doc */
function viz(mym) {
    mym = +mym.substr(5, 5) - 1;

    let removeKids = parent => {
        while (parent.firstChild)
            parent.removeChild(parent.firstChild);
    };
    removeKids(byId("resultsView"));

    let json = allResults[mym];

    // pipe in figures to right panel
    var filelist = new Array;
    for (var i in json.images) {
        var zfig = document.createElement("img");
        zfig.setAttribute("src", json.images[i]);
        zfig.setAttribute('width', 200);
        zfig.setAttribute('height', 200);
        byId("resultsView").appendChild(zfig);
    }

    // write the results table
    var resultsArray = [];
    for (var key in json.sumInfo) {
        if (key == 'colnames')
            continue;
        resultsArray.push(json.sumInfo[key]);
    }

    var table = d3.select("#resultsView")
        .append("p")
        .append("table");

    var thead = table.append("thead");
    thead.append("tr")
        .selectAll("th")
        .data(json.sumInfo.colnames)
        .enter()
        .append("th")
        .text(d => d);

    var tbody = table.append("tbody");
    tbody.selectAll("tr")
        .data(resultsArray)
        .enter().append("tr")
        .selectAll("td")
        .data(d => d)
        .enter().append("td")
        .text(function (d) {
            var myNum = Number(d);
            if (isNaN(myNum))
                return d;
            return myNum.toPrecision(3);
        })
        .on("mouseover", function () {
            d3.select(this).style("background-color", "aliceblue");
        }) // for no discernable reason
        .on("mouseout", function () {
            d3.select(this).style("background-color", "#F9F9F9");
        }); //(but maybe we'll think of one)

    d3.select("#resultsView")
        .append("p")
        .html(() => "<b>Formula: </b>".concat(json.call[0]));

    m.redraw();
}

export async function updateRequest(url) {
    //console.log('url:', url);
    //console.log('POST:', data);
    let res;
    try {
        res = await m.request(url, {method: 'POST', data: {}});       // maybe change the POST and data
        //console.log('response:', res);
        if (Object.keys(res)[0] === 'warning') {
            alertWarn('Warning: ' + res.warning);
            end_ta3_search(false, res.warning);
        }
    } catch (err) {
        end_ta3_search(false, err);
        cdb(err);
        alertError(`Error: call to ${url} failed`);
    }
    return res;
}

/** needs doc */
export function panelPlots() {

    // build arrays from nodes in main
    let vars = [];
    let ids = [];
    nodes.forEach(n => {
        vars.push(n.name.replace(/\(|\)/g, ''));
        ids.push(n.id);
    });

    //remove all plots, could be smarter here
    d3.select('#setxLeft').selectAll('svg').remove();
    for (var i = 0; i < vars.length; i++) {
        if (allNodes[ids[i]].valid == 0) // this was a silent error... very frustrating...
            continue;
        let node = allNodes[ids[i]];
        node.setxplot = false;
        node.subsetplot = false;
        if (node.plottype === "continuous" & node.setxplot == false) {
            node.setxplot = true;
            density(node, div = "setxLeft", priv);
            node.subsetplot = true;
            density(node, div = "Summary", priv);
        } else if (node.plottype === "bar" & node.setxplot == false) {
            node.setxplot = true;
            bars(node, div = "setxLeft", priv);
            node.subsetplot = true;
            barsSubset(node);
        }
    }

    d3.select("#setxLeft").selectAll("svg")
        .each(function () {
            d3.select(this);
            var regstr = /(.+)_setxLeft_(\d+)/;
            var myname = regstr.exec(this.id);
            var nodeid = myname[2];
            myname = myname[1];
            if (!vars.includes(myname)) {
                allNodes[nodeid].setxplot = false;
                let temp = "#".concat(myname, "_setxLeft_", nodeid);
                d3.select(temp)
                    .remove();
                allNodes[nodeid].subsetplot = false;
                temp = "#".concat(myname, "_tab2_", nodeid);
                d3.select(temp)
                    .remove();
            }
        });

    // just removing all the subset plots here, because using this button for problem discover
    d3.select('#tabDiscovery').selectAll('svg').remove();
}

/**
 removes all the children svgs inside subset and setx divs
 */
export function rePlot() {
    d3.select('#tab2')
        .selectAll('svg')
        .remove();
    d3.select('#setx')
        .selectAll('svg')
        .remove();
    allNodes.forEach(n => n.setxplot = n.subsetplot = false);
}

/**
 Retrieve the variable list from the preprocess data.
 This helps handle the new format and (temporarily)
 the older format in PRODUCTION (rp 8.14.2017)
 "new" response:
 {
 "dataset" : {...}
 "variables" : {
 "var1" : {...},
 (etc)
 }
 }
 "old" response:
 {
 "var1" : {...},
 (etc)
 }
 */
export function getVariableData(json) {
    return json.hasOwnProperty('variables') ? json.variables : json;
}

export function trigger(id, event) {
    let evt = document.createEvent('HTMLEvents');
    evt.initEvent(event, true, false);
    byId(id).dispatchEvent(evt);
}

export let logArray = [];

// space index
export let myspace = 0;

export let spaces = [];

/** needs doc */
export function subsetSelect(btn) {
    if (dataurl) {
        zparams.zdataurl = dataurl;
    }
    if (downloadIncomplete()) {
        return;
    }

    zparams.zvars = [];
    zparams.zplot = [];
    var subsetEmpty = true;
    // is this the same as zPop()?
    for (var j = 0; j < nodes.length; j++) { // populate zvars and zsubset arrays
        zparams.zvars.push(nodes[j].name);
        var temp = nodes[j].id;
        zparams.zsubset[j] = allNodes[temp].subsetrange;
        if (zparams.zsubset[j].length > 0) {
            if (zparams.zsubset[j][0] != "")
                zparams.zsubset[j][0] = Number(zparams.zsubset[j][0]);
            if (zparams.zsubset[j][1] != "")
                zparams.zsubset[j][1] = Number(zparams.zsubset[j][1]);
        }
        zparams.zplot.push(allNodes[temp].plottype);
        if (zparams.zsubset[j][1] != "")
            subsetEmpty = false; // only need to check one
    }

    if (subsetEmpty == true) {
        alertWarn("Warning: No new subset selected.");
        return;
    }

    var outtypes = [];
    for (var j = 0; j < allNodes.length; j++) {
        outtypes.push({
            varnamesTypes: allNodes[j].name,
            nature: allNodes[j].nature,
            numchar: allNodes[j].numchar,
            binary: allNodes[j].binary,
            interval: allNodes[j].interval
        });
    }

    let json = makeRequest(
        ROOK_SVC_URL + 'subsetSelect',
        {
            zdataurl: zparams.zdataurl,
            zvars: zparams.zvars,
            zsubset: zparams.zsubset,
            zsessionid: zparams.zsessionid,
            zplot: zparams.zplot,
            callHistory: callHistory,
            typeStuff: outtypes
        });
    if (!json) {
        return;
    }

    trigger("btnVariables", "click"); // programmatic clicks
    trigger("btnModels", "click");

    var grayOuts = [];
    var rCall = [];
    rCall[0] = json.call;

    // store contents of the pre-subset space
    zPop();
    var myNodes = $.extend(true, [], allNodes);
    var myParams = $.extend(true, {}, zparams);
    var myTrans = $.extend(true, [], trans);
    var myForce = $.extend(true, [], forceToggle);
    var myPreprocess = $.extend(true, {}, app.variableSummaries);
    var myLog = $.extend(true, [], logArray);
    var myHistory = $.extend(true, [], callHistory);

    spaces[myspace] = {
        "allNodes": myNodes,
        "zparams": myParams,
        "trans": myTrans,
        "force": myForce,
        "preprocess": myPreprocess,
        "logArray": myLog,
        "callHistory": myHistory
    };

    // remove pre-subset svg
    var selectMe = "#m".concat(myspace);
    d3.select(selectMe).attr('class', 'item');
    selectMe = "#whitespace".concat(myspace);
    d3.select(selectMe).remove();

    myspace = spaces.length;
    callHistory.push({
        func: "subset",
        zvars: $.extend(true, [], zparams.zvars),
        zsubset: $.extend(true, [], zparams.zsubset),
        zplot: $.extend(true, [], zparams.zplot)
    });

    // this is to be used to gray out and remove listeners for variables that have been subsetted out of the data
    function varOut(v) {
        // if in nodes, remove gray out in left panel
        // make unclickable in left panel
        for (var i = 0; i < v.length; i++) {
            var selectMe = v[i].replace(/\W/g, "_");
            byId(selectMe).style.color = hexToRgba(common.grayColor);
            selectMe = "p#".concat(selectMe);
            d3.select(selectMe)
                .on("click", null);
        }
    }

    showLog('subset', rCall);

    d3.select("#innercarousel")
        .append('div')
        .attr('class', 'item active')
        .attr('id', () => "m".concat(myspace.toString()))
        .append('svg')
        .attr('id', 'whitespace');
    svg = d3.select("#whitespace");

    d3.json(json.url, function (error, json) {
        if (error) {
            return console.warn(error);
        }
        var jsondata = getVariableData(json);

        for (var key in jsondata) {
            var myIndex = findNodeIndex(key);

            allNodes[myIndex].plotx = undefined;
            allNodes[myIndex].ploty = undefined;
            allNodes[myIndex].plotvalues = undefined;
            allNodes[myIndex].plottype = "";

            $.extend(true, allNodes[myIndex], jsondata[key]);
            allNodes[myIndex].subsetplot = false;
            allNodes[myIndex].subsetrange = ["", ""];
            allNodes[myIndex].setxplot = false;
            allNodes[myIndex].setxvals = ["", ""];

            if (allNodes[myIndex].valid == 0) {
                grayOuts.push(allNodes[myIndex].name);
                allNodes[myIndex].grayout = true;
            }
        }
        rePlot();
    });

    varOut(grayOuts);
}

// acts as if the user clicked in whitespace. useful when restart() is outside of scope
export function fakeClick() {
    let el = byId(`whitespace${myspace}`);
    let evt = document.createEvent("MouseEvents");
    evt.initMouseEvent("mousedown", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    el.dispatchEvent(evt);
    d3.select(el)
        .classed('active', false);
}

function addPredictions(res) {
    function tabulate(data, columns) {
        var table = d3.select('#setxLeftBottomRightBottom').append('table');
        var thead = table.append('thead');
        var tbody = table.append('tbody');

        // append the header row
        thead.append('tr')
            .selectAll('th')
            .data(columns).enter()
            .append('th')
            .text(function (column) {
                return column;
            });

        // create a row for each object in the data
        var rows = tbody.selectAll('tr')
            .data(data)
            .enter()
            .append('tr');

        // create a cell in each row for each column
        var cells = rows.selectAll('td')
            .data(function (row) {
                return columns.map(function (column) {
                    return {column: column, value: row[column]};
                });
            })
            .enter()
            .append('td')
            .text(function (d) {
                return d.value;
            })
            .attr('id', function (d, i) {
                let rowname = this.parentElement.firstChild.innerText;
                return rowname + d.column;
            });

        return table;
    }

    // this is what ISI should look like, and the test server eventually, so just remove the following line when it's up
    res = res.grpcResp[0];

    console.log(res);
    let allPreds = res.resultData.data;
    let predvals = [];

    for (let i = 0; i < allPreds.length; i++) {
        predvals.push(allPreds[i]["preds"]);
    }

    let mydata = [];
    mydata.push({" ": "Pred 1", "E(Y|X1)": predvals[0], "E(Y|X2)": predvals[1]});

    // render the table(s)
    tabulate(mydata, [' ', 'E(Y|X1)', 'E(Y|X2)']); // 2 column table

}

/** needs doc */
export function setxTable(features) {
    function tabulate(data, columns) {
        var table = d3.select('#setxLeftBottomLeft').append('table');
        var thead = table.append('thead');
        var tbody = table.append('tbody');

        // append the header row
        thead.append('tr')
            .selectAll('th')
            .data(columns).enter()
            .append('th')
            .text(function (column) {
                return column;
            });

        // create a row for each object in the data
        var rows = tbody.selectAll('tr')
            .data(data)
            .enter()
            .append('tr');

        // create a cell in each row for each column
        var cells = rows.selectAll('td')
            .data(function (row) {
                return columns.map(function (column) {
                    return {column: column, value: row[column]};
                });
            })
            .enter()
            .append('td')
            .text(function (d) {
                return d.value;
            })
            .attr('id', function (d, i) {
                let rowname = this.parentElement.firstChild.innerText;
                return rowname + d.column;
            });

        return table;
    }

    let mydata = [];
    for (let i = 0; i < features.length; i++) {
        let myi = findNodeIndex(features[i]); //i+1;                                // This was set as (i+1), but should be allnodes position, not features position
        if (myi === -1) continue;

        if (allNodes[myi].valid == 0) {
            let xval = 0;
            let x1val = 0;
            mydata.push({"Variables": features[i], "From": xval, "To": x1val});
            continue;
        }

        let mysvg = features[i] + "_setxLeft_" + myi;

        try {
            //console.log(mysvg);
            //console.log(byId(mysvg).querySelector('.xval'));
            let xval = byId(mysvg).querySelector('.xval').innerHTML;
            let x1val = byId(mysvg).querySelector('.x1val').innerHTML;
            //console.log(xval);
            //console.log(x1val);
            xval = xval.split("x: ").pop();
            x1val = x1val.split("x1: ").pop();
            mydata.push({"Variables": features[i], "From": xval, "To": x1val});
        } catch (error) {
            continue;
        }
    }

    // render the table(s)
    tabulate(mydata, ['Variables', 'From', 'To']); // 2 column table
}

function singlePlot(pred) {
    d3.select('#setxLeftTopRight').selectAll('svg').remove();
    let i = findNodeIndex(pred);
    let node = allNodes[i];
    node.setxplot = false;
    node.subsetplot = false;
    if (node.plottype === "continuous" & node.setxplot == false) {
        node.setxplot = true;
        density(node, div = "setxLeftTopRight", priv);
    } else if (node.plottype === "bar" & node.setxplot == false) {
        node.setxplot = true;
        bars(node, div = "setxLeftTopRight", priv);
    }
}

export function callTransform(elem) {
    console.log("function called")
    let json = makeRequest(
        ROOK_SVC_URL + 'transformapp',
        {
            zdataurl: dataurl,
            zvars: elem,
            zsessionid: zparams.zsessionid,
            transform: t,
            callHistory: callHistory,
            typeTransform: typeTransform,
            typeStuff: outtypes
        });

    console.log(json)
}

/** needs doc */
async function dataDownload() {
    // zPop();
    // write links to file & run R CMD

    // package the output as JSON
    // add call history and package the zparams object as JSON
    let res = await makeRequest(ROOK_SVC_URL + 'dataapp', zparams);
    if (!res) {
        return;
    }

    zparams.zsessionid = res.sessionid[0];
    // set link URL
    byId("logID").href = `${PRODUCTION ? ROOK_SVC_URL + 'log_dir/log_' : 'rook/log_'}${zparams.zsessionid}.txt`;
}


let heatxaxis, heatyaxis;

let plotnamea, plotnameb, varn1, varn2, varsize1, varsize2;

const $private = false;

function heatmap(x_Axis_name, y_Axis_name) {
    let heatchart = elem('#heatchart');
    heatchart.style.display = "block";
    d3.select("#heatchart").select("svg").remove();
    heatchart.innerHTML = '';

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

    var x = d3.scaleLinear()
        .domain([min_x - avg_x, max_x + avg_x])
        .range([0, width_heat]);

    var y = d3.scaleLinear()
        .domain([min_y - avg_y, max_y + avg_y])
        .range([height_heat, 0]);

    var z = d3.scaleLinear().range(["#EF9A9A", "#EF5350"]);

    // This could be inferred from the data if it weren't sparse.
    var xStep = avg_x + 0.1,
        yStep = avg_y + 0.2;
    var svg_heat = d3.select("#heatchart").append("svg")
        .attr("width", width_heat + margin_heat.left + margin_heat.right)
        .attr("height", height_heat + margin_heat.top + margin_heat.bottom)
        .append("g")
        .attr("transform", "translate(" + margin_heat.left + "," + margin_heat.top + ")")
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
            return y(data_plot[i].yaxis + yStep);
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
        .call(d3.axisBottom().scale(x).ticks(5).tickSize(-height_heat))
        .append("text")
        .attr("class", "label")
        .attr("x", width_heat)
        .attr("y", -6)
        .attr("text-anchor", "end")
        .text("");

    // Add a y-axis with label.
    svg_heat.append("g")
        .attr("class", "y axis")
        .call(d3.axisLeft().scale(y).tickSize(-width_heat))
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
        .style("text-indent", "20px")
        .style("font-size", "12px")
        .style("font-weight", "bold");

    svg_heat.append("text")
        .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
        .attr("transform", "translate(" + (width_heat / 2) + "," + (height_heat + padding / 4) + ")")  // centre below axis
        .text(x_Axis_name)
        .style("fill", "#424242")
        .style("text-indent", "20px")
        .style("font-size", "12px")
        .style("font-weight", "bold");
}

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

    // D3 line charts need sorted data
    data_plot.sort(function (a, b) {
        return a.xaxis - b.xaxis;
    });

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

    var xScale = d3.scaleLinear()
        .domain([min_x - avg_x, max_x + avg_x])
        .range([0, width]);

    var yScale = d3.scaleLinear()
        .domain([min_y - avg_y, max_y + avg_y])
        .range([height, 0]);

    var xAxis = d3.axisBottom()
        .scale(xScale)
        .tickSize(-height);

    var yAxis = d3.axisLeft()
        .scale(yScale)
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
        .attr('width', width + margin.right + margin.left)
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
        .style("text-indent", "20px")
        .style("font-size", "12px")
        .style("font-weight", "bold");

    chart_scatter.append("text")
        .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
        .attr("transform", "translate(" + (width / 2) + "," + (height + (padding / 2)) + ")")  // centre below axis
        .text(x_Axis_name)
        .style("fill", "#424242")
        .style("text-indent", "20px")
        .style("font-size", "12px")
        .style("font-weight", "bold");

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

let continuous_n = 0;
let bar_n = 0;

export function get_width(id) {
    return 50 * (id === 'plotA' ? continuous_n : bar_n);
}

function crossTabPlots(PlotNameA, PlotNameB, json_obj) {
    continuous_n = 0;
    bar_n = 0;
    plotnamea = PlotNameA;
    plotnameb = PlotNameB;
    trigger('#input1', 'blur');
    trigger('#input2', 'blur');
    setAttrs('#input1', {placeholder: PlotNameA});
    setAttrs('#input2', {placeholder: PlotNameB});
    let [plot_a, plot_b] = ['#plotA', '#plotB'];

    var margin_cross = {top: 30, right: 35, bottom: 40, left: 40},
        width_cross = 300 - margin_cross.left - margin_cross.right,
        height_cross = 160 - margin_cross.top - margin_cross.bottom;
    var padding_cross = 100;

    d3.select("#input1").on("mouseover", function () {
        d3.select("#tooltipPlotA")
            .style("visibility", "visible")
            .style("opacity", "1")
            .text(PlotNameA);
    })
        .on("mouseout", function () {
            d3.select("#tooltipPlotA")
                .style("visibility", "hidden")
                .style("opacity", "0");
        });
    d3.select("#input2").on("mouseover", function () {
        d3.select("#tooltipPlotB")
            .style("visibility", "visible")
            .style("opacity", "1")
            .text(PlotNameB);
    })
        .on("mouseout", function () {
            d3.select("#tooltipPlotB")
                .style("visibility", "hidden")
                .style("opacity", "0");
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
    let setStatus = (id, plot, n, size) => elem(id).innerHTML = `${plot} : ${n} distribution with ${size} divisions`;
    elem("#Equidistance1").onclick = function () {
        varn1 = "equidistance";
        plotA_size = parseInt(d3.select("#input1")[0][0].value);
        varsize1 = plotA_size;
        equidistance(PlotNameA, plotA_size);
        setStatus("#plotA_status", PlotNameA, varn1, varsize1);
    };
    elem("#Equimass1").onclick = function () {
        varn1 = "equimass";
        plotA_sizem = parseInt(d3.select("#input1")[0][0].value);
        varsize1 = plotA_sizem;
        equimass(PlotNameA, plotA_sizem);
        setStatus("#plotA_status", PlotNameA, varn1, varsize1);
    };
    elem("#Equidistance2").onclick = function () {
        varn2 = "equidistance";
        plotB_size = parseInt(d3.select("#input2")[0][0].value);
        equidistance(PlotNameB, plotB_size);
        varsize2 = plotB_size;
        setStatus("#plotB_status", PlotNameB, varn2, varsize2);
    };
    elem("#Equimass2").onclick = function () {
        varn2 = "equimass";
        plotB_sizem = parseInt(d3.select("#input2")[0][0].value);
        equimass(PlotNameB, plotB_sizem);
        varsize2 = plotB_sizem;
        setStatus("#plotB_status", PlotNameB, varn2, varsize2);
    };

    // this is the function to add  the density plot if any
    function density_cross(density_env, a, method_name) {
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
        var x = d3.scaleLinear()
            .domain([d3.min(xVals), d3.max(xVals)])
            .range([0, width_cross]);
        var invx = d3.scaleLinear()
            .range([d3.min(data2.map(function (d) {
                return d.x;
            })), d3.max(data2.map(function (d) {
                return d.x;
            }))])
            .domain([0, width_cross]);
        var y = d3.scaleLinear()
            .domain([d3.min(data2.map(function (d) {
                return d.y;
            })), d3.max(data2.map(function (d) {
                return d.y;
            }))])
            .range([height_cross, 0]);
        var xAxis = d3.axisBottom()
            .scale(x)
            .ticks(5);
        var yAxis = d3.axisLeft()
            .scale(y);
        var area = d3.area()
            .curve(d3.curveMonotoneX)
            .x(function (d) {
                return x(d.x);
            })
            .y0(height_cross - avg_y)
            .y1(function (d) {
                return y(d.y);
            });
        var line = d3.line()
            .x(function (d) {
                return x(d.x);
            })
            .y(function (d) {
                return y(d.y);
            })
            .curve(d3.curveMonotoneX);

        var plotsvg = d3.select(plot_a)
            .append("svg")
            .attr("id", "plotsvg_id")
            .style("width", width_cross + margin_cross.left + margin_cross.right) //setting height to the height of #main.left
            .style("height", height_cross + margin_cross.top + margin_cross.bottom)
            .style("margin-left", "20px")
            .append("g")
            .attr("transform", "translate(0," + margin_cross.top + ")");
        plotsvg.append("path")
            .attr("id", "path1")
            .datum(data2)
            .attr("class", "area")
            .attr("d", area);
        plotsvg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + (height_cross) + ")")
            .call(xAxis);
        plotsvg.append("text")
            .attr("x", (width_cross / 2))
            .attr("y", (margin_cross.top + padding_cross - 10))
            .attr("text-anchor", "middle")
            .text(density_env.name)
            .style("text-indent", "20px")
            .style("font-size", "12px")
            .style("font-weight", "bold");

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
    function bar_cross(bar_env, a, method_name) {
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
        var minY = d3.min(yVals);
        var maxY = d3.max(yVals); // in the future, set maxY to the value of the maximum confidence limit
        var minX = d3.min(xVals);
        var maxX = d3.max(xVals);
        var x_1 = d3.scaleLinear()
            .domain([minX - 0.5, maxX + 0.5])
            .range([0, width_cross]);

        var invx = d3.scaleLinear()
            .range([minX - 0.5, maxX + 0.5])
            .domain([0, width_cross]);

        var y_1 = d3.scaleLinear()
        // .domain([0, maxY])
            .domain([0, maxY])
            .range([0, height_cross]);

        var xAxis = d3.axisBottom()
            .scale(x_1)
            .ticks(yVals.length);

        var yAxis = d3.axisLeft()
            .scale(y_1);

        var plotsvg1 = d3.select(plot_b)
            .append("svg")
            .attr("id", "plotsvg1_id")
            .style("width", width_cross + margin_cross.left + margin_cross.right) //setting height to the height of #main.left
            .style("height", height_cross + margin_cross.top + margin_cross.bottom)
            .style("margin-left", "20px")
            .append("g")
            .attr("transform", "translate(0," + margin_cross.top + ")");

        var rectWidth = x_1(minX + 0.5 - 2 * barPadding); //the "width" is the coordinate of the end of the first bar
        plotsvg1.selectAll("rect")
            .data(yVals)
            .enter()
            .append("rect")
            .attr("id", "path2")
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
            .attr("y", margin_cross.top + padding_cross - 10)
            .attr("text-anchor", "middle")
            .text(bar_env.name)
            .style("text-indent", "20px")
            .style("font-size", "12px")
            .style("font-weight", "bold");

        if (isNaN(a) || a === 0) {
            x_cord2 = equimass_bar(bar_env, keys.length);
            for (var i = 0; i < keys.length - 1; i++) {
                plotsvg1.append("line")
                    .attr("id", "line2")
                    .attr("x1", x_1(x_cord2[i]))
                    .attr("x2", x_1(x_cord2[i]))
                    .attr("y1", y_1(0))
                    .attr("y2", y_1(maxY))
                    .style("stroke", "#212121")
                    .style("stroke-dasharray", "4");
            }
        } else {
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
            } else if (method_name === "equimass") {
                var x_cord2 = [];
                x_cord2 = equimass_bar(bar_env, a);
                for (var i = 0; i < a - 1; i++) {
                    plotsvg1.append("line")
                        .attr("id", "line2")
                        .attr("x1", x_1(x_cord2[i]))
                        .attr("x2", x_1(x_cord2[i]))
                        .attr("y1", y_1(0))
                        .attr("y2", y_1(maxY))
                        .style("stroke", "#0D47A1")
                        .style("stroke-dasharray", "4");
                }
            }
        }
    }

    function equidistance(A, a) {
        var method_name = "equidistance";
        // json object to be sent to r server
        var obj = new Object();
        obj.plotNameA = A;
        obj.equidistance = a;
        var string = JSON.stringify(obj);
        for (var i = 0; i < plot_nodes.length; i++) {
            if (plot_nodes[i].name === A) {
                if (plot_nodes[i].plottype === "continuous") {
                    remove("#plotsvg_id");
                    density_cross(plot_nodes[i], a, method_name);
                } else if (plot_nodes[i].plottype === "bar") {
                    remove("#plotsvg1_id");
                    bar_cross(plot_nodes[i], a, method_name);
                }
            } else {
                console.log("not found");
            }
        }
    }

    function equimass(A, a) {
        //equimass function to call the plot function
        var method_name = "equimass";
        var obj = new Object();
        obj.plotNameA = A;
        obj.equidistance = a;
        var string = JSON.stringify(obj);
        for (var i = 0; i < plot_nodes.length; i++) {
            if (plot_nodes[i].name === A) {
                if (plot_nodes[i].plottype === "continuous") {
                    remove("#plotsvg_id");
                    density_cross(plot_nodes[i], a, method_name);
                } else if (plot_nodes[i].plottype === "bar") {
                    remove("#plotsvg1_id");
                    bar_cross(plot_nodes[i], a, method_name);
                }
            } else {
                console.log("not found");
            }
        }
    }

    function equimassCalculation(plot_ev, n) {
        // here we find the coordinates using CDF values
        //var n =v-1;
        var arr_y = [];
        var arr_x = [];

        arr_y = plot_ev.cdfploty;// cdfploty data stored
        arr_x = plot_ev.cdfplotx;// cdfplotx data stored

        var Upper_limitY = d3.max(arr_y);
        var Lower_limitY = d3.min(arr_y);
        var diffy = Upper_limitY - Lower_limitY;
        var e = (diffy) / n; // e is the variable to store the average distance between the points in the cdfy in order to divide the cdfy

        var arr_c = []; //array to store the cdfy divided coordinates data
        var push_data = arr_y[0];
        for (var i = 0; i < n; i++) {
            push_data = push_data + e;
            arr_c.push(push_data);
        }

        var temp_cdfx = [];
        var temp = [];
        var store = [];

        for (var i = 0; i < n; i++)//to get through each arr_c
        {
            for (var j = 0; j < 50; j++)// to compare with cdfy or arr_y
            {
                if (arr_c[i] === arr_y[j]) {
                    store.push({val: i, coor1: j, coor2: j, diff1: 0.34, diff2: 0});// for testing purpose
                }
            }
        }
        for (var i = 0; i < n; i++) {
            var diff_val1, diff_val2;// here the diff is not actual difference, it is the fraction of the distance from the two points
            var x1, x2, x3, x4;
            for (var j = 0; j < 50; j++) {
                if (arr_y[j] < arr_c[i] && arr_c[i] < arr_y[j + 1]) {
                    x1 = arr_c[i];
                    x2 = arr_c[i] - arr_y[j];
                    x3 = arr_y[j + 1] - arr_c[i];
                    x4 = arr_y[j + 1] - arr_y[j];
                    diff_val1 = x2 / x4;
                    diff_val2 = x3 / x4;
                    store.push({val: i, coor1: j, coor2: j + 1, diff1: diff_val1, diff2: diff_val2});
                }
            }
        }

        for (var i = 0; i < n; i++) {
            var y1, y2, y3, diffy1, diffy2;
            y1 = store[i].val;
            y2 = store[i].coor1;
            y3 = store[i].coor2;
            diffy1 = store[i].diff1;
            diffy2 = store[i].diff2;
            var x_coor1 = arr_x[y2];
            var x_coor2 = arr_x[y3];
            var x_diff = x_coor2 - x_coor1;
            var distance1 = x_diff * diffy1;
            var val_x = x_coor1 + distance1;
            temp.push(val_x);
        }
        return temp;
    }

    function equimass_bar(plot_ev, n) {
        var keys = Object.keys(plot_ev.plotvalues);
        var k = keys.length;
        var temp = [];
        var count = 0;

        if (k < n) {
            app.alertError("error: enter valid size");
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
    elem('#linechart').innerHTML = '';
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
    var x = d3.scaleLinear()
        .domain(d3.extent(data_plot, function (d) {
            return d.xaxis;
        }))
        .range([0, width_linechart]);
    var y = d3.scaleLinear()
        .domain([d3.min(data_plot, function (d) {
            return d.yaxis;
        }), d3.max(data_plot, function (d) {
            return d.yaxis;
        })])
        .range([height_linechart, 0]);
    var xAxis = d3.axisBottom()
        .scale(x)
        .ticks(5);
    var yAxis = d3.axisLeft()
        .scale(y)
        .ticks(5);
    var line = d3.line()
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
    let height = window.innerHeight - 120;
    svg.append("text")
        .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
        .attr("transform", "translate(" + padding + "," + (height / 3) + ")rotate(-90)")  // text is drawn off the screen top left, move down and out and rotate
        .text(y_Axis_name)
        .style("fill", "#424242")
        .style("text-indent", "20px")
        .style("font-size", "12px")
        .style("font-weight", "bold");
    svg.append("text")
        .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
        .attr("transform", "translate(" + (width / 5) + "," + (height - padding - 128) + ")")  // centre below axis
        .text(x_Axis_name)
        .style("fill", "#424242")
        .style("text-indent", "20px")
        .style("font-size", "12px")
        .style("font-weight", "bold");

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

    let heatchart = elem('#heatchart');
    let $linechart = elem('#linechart');
    let scatterplot = elem('#scatterplot');
    elem('#scatterplot_img').onclick = function () {
        fadeOut(this, "fast");
        fadeIn(this);
        fadeTo(this, "fast", 1.0);
        heatchart.style.display = "none";
        $linechart.style.display = "none";
        bivariatePlot(x_axis, y_axis, get_data[0], get_data[1]);
    };
    elem('#heatmap_img').onclick = function () {
        fadeOut(this, "fast");
        fadeIn(this);
        fadeTo(this, "fast", 1.0);
        $linechart.style.display = "none";
        scatterplot.style.display = "none";
        heatmap(get_data[0], get_data[1]);
    };
    elem('#linechart_img').onclick = function () {
        fadeOut(this, "fast");
        fadeIn(this);
        fadeTo(this, "fast", 1.0);
        heatchart.style.display = "none";
        scatterplot.style.display = "none";
        linechart(get_data[0], get_data[1]);
    };

    var empty = [];
    crossTabPlots(get_data[0], get_data[1], empty);

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
                colvar = push(i, 'colvar');
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
    for (var i = 0; i < app.workspace.raven_config.variablesInitial.length; i++) {
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
                        tr.append("td").style("border", 1).style("text-align", "center").style("position", "relative").style("background-color", common.varColor).text(data[z].value);
                    }
                }
            }
        }
    }

    crossTab_Table(json);

    var plotAval = varsize1, plotBval = varsize2;
    if (isNaN(plotAval)) plotAval = 10;
    if (isNaN(plotBval)) plotBval = 10;
    let crosstabs = {
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
    elem('#SelectionData1').click(function () {
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
            .attr("class", "btn btn-default btn-xs")
            .attr("id", zbreaks.length)
            .text("break " + (zbreaks.length + 1)).on("click", function () {
            d3.select("#tabular_2").html("");
            removeData();
            let id = this.id - 1;
            app.zparams.zcrosstab.push(zbreaks[id]);
            explore_crosstab(zbreaks_tabular[id]);

            var inputvalue1, inputvalue2;
            inputvalue1 = zbreaks[id].var1.value;
            inputvalue2 = zbreaks[id].var2.value;
            document.getElementById("input1").value = inputvalue1;
            document.getElementById("input2").value = inputvalue2;

            var json_obj = zbreaks[id];
            var varn1, varn2, varsize1, varsize2;
            if (json_obj.length === 0) {
                console.log("break not called");
            } else {
                varn1 = json_obj.var1.buttonType;
                varn2 = json_obj.var2.buttonType;
                varsize1 = json_obj.var1.value;
                varsize2 = json_obj.var2.value;
                if (varn1 === "equidistance") {
                    crossTabPlots.equidistance(get_data[0], varsize1);
                } else if (varn1 === "equimass") {
                    crossTabPlots.equimass(get_data[0], varsize1);
                }
                if (varn2 === "equidistance") {
                    crossTabPlots.equidistance(get_data[1], varsize2);
                } else if (varn2 === "equimass") {
                    crossTabPlots.equimass(get_data[1], varsize2);
                }
            }
        });
    });

    async function explore_crosstab(btn) {
        if (app.downloadIncomplete()) {
            return;
        }
        zPop();

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
                tr.append("td").style("border", 1).style("text-align", "left").style("position", "relative").style("background-color", common.varColor).text(data[row][td]);
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
        .style("overflow-x", "auto")
        .append("button")// top stack for results
        //      .append("xhtml:button")
        .attr("class", "btn btn-outline-success")
        .style("padding", "4px")
        .attr("id", model_selection_name)
        .text(model_selection_name)
        .style('background-color', function () {
            var color1 = "#FFD54F";
            return count == count1 ? plots.selVarColor : color1;
        })
        .style("display", "inline-block")
        .style("white-space", "pre")
        .style("margin-top", 0)
        .style("float", "left")
        .on("click", function () {
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
            m.redraw();
        });
}

function showLog() {
    if (logArray.length > 0) {
        app.byId('logdiv').setAttribute("style", "display:block");
        d3.select("#collapseLog div.panel-body").selectAll("p")
            .data(logArray)
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

    zPop();
    console.log('zpop:', app.zparams);

    // write links to file & run R CMD
    app.zparams.callHistory = app.callHistory;
    app.estimateLadda.start(); // start spinner
    let json = await app.makeRequest(ROOK_SVC_URL + 'exploreapp', app.zparams);
    app.estimateLadda.stop();
    if (!json) {
        return;
    }

    app.allResults.push(json);
    app.explored = true;
    app.univariate_finished = false;

    d3.select("#modelView").html('');
    d3.select("#resultsView_statistics").html('');

    d3.select("#modelView")
        .style('background-color', app.hexToRgba(common.varColor))
        .style("overflow-y", "hidden")
        .style("overflow-x", "auto")
        .append("span")
        .style("white-space", "pre")
        .style("margin-top", 0)
        .style("float", "left")
        .style("position", "relative")
        .style("color", "#757575")
        .text("MODEL SELECTION :  ");

    count = 0;
    count1 = 0;
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
    logArray.push("explore: ".concat(rCall[0]));
    showLog();
    viz(model_name, json, model_name);
    m.redraw();
}// Kripanshu : Function to create D3 Tree using the JSON result from call Tree app
export let exploreVar = '';

export async function callTreeApp(node_var, app) {
    exploreVar = node_var;
    app.zPop();
    app.zparams.callHistory = app.callHistory;

    app.estimateLadda.start();
    let res = await app.makeRequest(ROOK_SVC_URL + 'treeapp', {zparams: app.zparams, dv: node_var});
    app.estimateLadda.stop();
    if (res) {
        app.explored = false;
        app.univariate_finished = true;
        m.redraw();
        univariatePart(res, node_var);
    }
}

function univariatePart(json, var_name) {
    app.setRightTabExplore('Univariate');
    document.getElementById("decisionTree").innerHTML = "";
    d3.select("#decisionTree")
        .style("display", "block")
        .append("p")
        .style("margin-top", "1px")
        .text(var_name);

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

    var tree = d3.tree()
        .size([h, w]);

    var diagonal = d3.line()
        .x(function (d) {
            return d.x;
        })
        .y(function (d) {
            return d.y;
        })
        .curve(d3.curveLinear);

    // set height of SVG via height of tree, 200px per layer
    let getHeight = (json_data) => json_data.children ? Math.max(...json_data.children.map(v => getHeight(v))) + 1 : 0;

    var vis = d3.select("#decisionTree").append("svg:svg")
        .attr("width", w + m[1] + m[3])
        .attr("height", getHeight(json) * 200 + 20)
        .style('height', 'auto')
        .append("svg:g")
        .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

    // global scale for link width
    var link_stoke_scale = d3.scaleLinear();

    var color_map = d3.scaleOrdinal(d3.schemeCategory10);

    // stroke style of link - either color or function
    var stroke_callback = "#ccc";
    load_dataset(json);

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

        link_stoke_scale = d3.scaleLinear()
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
        nodes.forEach(function (d) {
            d.y = d.depth * 180;
        });

        // Update the nodes…
        var node = vis.selectAll("g.node")
            .data(nodes, function (d) {
                return d.id || (d.id = ++i);
            });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("svg:g")
            .attr("class", "node")
            .attr("transform", function (d) {
                return "translate(" + source.x0 + "," + source.y0 + ")";
            })
            .on("click", function (d) {
                toggle(d);
                update(d);
            });

        nodeEnter.append("svg:rect")
            .attr("x", function (d) {
                var label = node_label(d);
                var text_len = label.length * char_to_pxl;
                var width = d3.max([rect_width, text_len]);
                return -width / 2;
            })
            .attr("width", 1e-6)
            .attr("height", 1e-6)
            .attr("rx", function (d) {
                return d.type === "split" ? 2 : 0;
            })
            .attr("ry", function (d) {
                return d.type === "split" ? 2 : 0;
            })
            .style("stroke", function (d) {
                return d.type === "split" ? "steelblue" : "olivedrab";
            })
            .style("fill", function (d) {
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
            .attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            });

        nodeUpdate.select("rect")
            .attr("width", function (d) {
                var label = node_label(d);
                var text_len = label.length * char_to_pxl;
                var width = d3.max([rect_width, text_len])
                return width;
            })
            .attr("height", rect_height)
            .style("fill", function (d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function (d) {
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
            .data(tree.links(nodes), function (d) {
                return d.target.id;
            });

        // Enter any new links at the parent's previous position.
        link.enter().insert("svg:path", "g")
            .attr("class", "link")
            .attr("d", function (d) {
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
            .style("stroke-width", function (d) {
                return link_stoke_scale(d.target.samples);
            })
            .style("stroke", stroke_callback);

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("d", diagonal)
            .style("stroke-width", function (d) {
                return link_stoke_scale(d.target.samples);
            })
            .style("stroke", stroke_callback);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(duration)
            .attr("d", function (d) {
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
        nodes.forEach(function (d) {
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
            d.value.forEach(function (v) {
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
        value.forEach(function (val, i) {
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

        var scale = d3.scaleLinear().domain([min, max])
            .range(["#2166AC", "#B2182B"]);

        function interpolator(d) {
            return scale(d.target.value[0]);
        }

        return interpolator;
    }


}


// INACTIVE TA2 GRPC CALLS

function CreateFitDefinition(datasetDocUrl, solutionId) {
    return Object.assign(
        GRPC_GetFitSolutionRequest(datasetDocUrl),
        {solutionId}
    );
}

// Create a problem description that follows the Problem Schema, for the Task 1 output.
function CreateProblemSchema(problem){
    return {
        about: {
            problemID: problem.problemID,
            problemName: problem.problemID,
            problemDescription: problem.description,
            taskType: d3mTaskType[problem.task],
            problemVersion: '1.0',
            problemSchemaVersion: '3.1.1'
        },
        inputs: {
            data: [
                {
                    datasetId: workspace.d3m_config.name,
                    targets: problem.targets.map((target, resourceId) => ({
                        // resourceId: resourceIdFromDatasetDoc,
                        columnIndex: Object.keys(variableSummaries).indexOf(target),
                        columnName: target
                    }))
                }],
            dataSplits: {
                method: 'holdOut',
                testSize: 0.2,
                stratified: true,
                numRepeats: 0,
                randomSeed: 123,
                splitsFile: 'dataSplits.csv'
            },
            performanceMetrics: [{metric: d3mMetrics[problem.metric]}]
        },
        expectedOutputs: {
            predictionsFile: 'predictions.csv'
        }
    };
}


function CreatePipelineData(dataset, problem) {

    let pipelineSpec = Object.assign({
        // uriCsv is also valid, but not currently accepted by ISI TA2
        dataset_uri: dataset.datasetUrl.substring(0, dataset.datasetUrl.lastIndexOf("/tables")) + "/datasetDoc.json",
        // valid values will come in future API
        output: "OUTPUT_TYPE_UNDEFINED",
        // Example:
        // "predictFeatures": [{
        //     "resource_id": "0",
        //     "feature_name": "RBIs"
        // }],
        predictFeatures: getPredictorVariables(problem).map((predictor, i) => ({resource_id: i, feature_name: predictor})),
        // Example:
        // "targetFeatures": [{
        //     "resource_id": "0",
        //     "feature_name": "At_bats"
        // }],
        targetFeatures: problem.targets.map((target, i) => ({resource_id: i, feature_name: target})),
        task: problem.task,
        taskSubtype: problem.subTask || d3mTaskSubtype.subtypeNone,
        taskDescription: problem.description,
        metrics: [problem.metrics],
        maxPipelines: 1
    });
    if (!pipelineSpec.subTask) delete pipelineSpec.subTask;
    return pipelineSpec;
}

function CreateProduceDefinition(fittedSolutionId) {
    return Object.assign(
        GRPC_ProduceSolutionRequest(),
        {fittedSolutionId}
    );
}


function CreateScoreDefinition(res){

    if (res.response.solutionId === undefined){
        let errMsg = 'ERROR: CreateScoreDefinition. solutionId not set.';
        console.log(errMsg);
        return {errMsg};
    }

    return Object.assign(
        GRPC_ScoreSolutionRequest(getResultsProblem()),
        {solutionId: res.response.solutionId});
}

function estimateNonD3M() {
    // let userUsg = 'This code path is no longer used.  (Formerly, it used Zelig.)';
    // console.log(userMsg);
    // alert(userMsg);
    // return;
    //
    // if (downloadIncomplete()) {
    //     return;
    // }
    // zPop();
    // // write links to file & run R CMD
    // // package the output as JSON
    // // add call history and package the zparams object as JSON
    // zparams.callHistory = callHistory;
    // zparams.allVars = valueKey.slice(10, 25); // because the URL is too long...
    //
    //
    // laddaState['btnEstimate'] = true;
    // m.redraw()
    //
    // let json = await makeRequest(ROOK_SVC_URL + 'zeligapp', zparams);
    // if (!json) {
    //     estimated = true;
    // } else {
    //     allResults.push(json);
    //     if (!estimated) byId("tabResults").removeChild(byId("resultsHolder"));
    //
    //     estimated = true;
    //     d3.select("#tabResults")
    //         .style("display", "block");
    //     d3.select("#resultsView")
    //         .style("display", "block");
    //     d3.select("#modelView")
    //         .style("display", "block");
    //
    //     // programmatic click on Results button
    //     trigger("btnSetx", "click"); // Was "btnResults" - changing to simplify user experience for testing.
    //
    //     let model = "Model".concat(modelCount = modelCount + 1);
    //
    //     function modCol() {
    //         d3.select("#modelView")
    //             .selectAll("p")
    //             .style('background-color', hexToRgba(varColor));
    //     }
    //     modCol();
    //
    //     d3.select("#modelView")
    //         .insert("p", ":first-child") // top stack for results
    //         .attr("id", model)
    //         .text(model)
    //         .style('background-color', hexToRgba(common.selVarColor))
    //         .on("click", function() {
    //             var a = this.style.backgroundColor.replace(/\s*/g, "");
    //             var b = hexToRgba(common.selVarColor).replace(/\s*/g, "");
    //             if (a.substr(0, 17) == b.substr(0, 17))
    //                 return; // escape function if displayed model is clicked
    //             modCol();
    //             d3.select(this)
    //                 .style('background-color', hexToRgba(common.selVarColor));
    //             viz(this.id);
    //         });
    //
    //     let rCall = [json.call];
    //     showLog('estimate', rCall);
    //
    //     viz(model);
    // }
}

/**
 D3M API HELPERS
 because these get built in various places, pulling them out for easy manipulation
 */
function apiFeature (vars, uri) {
    let out = [];
    for(let i = 0; i < vars.length; i++) {
        out.push({featureId:vars[i],dataUri:uri});
    }
    return out;
}

/** needs doc */
function apiFeatureShortPath (vars, uri) {
    let out = [];
    let shortUri = uri.substring(0, uri.lastIndexOf("/"));
    for(let i = 0; i < vars.length; i++) {
        out.push({featureId:vars[i],dataUri:shortUri});
    }
    return out;
}

/**
 silly but perhaps useful if in the future SessionContext requires more things (as suggest by core)
 */
function apiSession(context) {
    return {session_id: context};
}


// INACTIVE PLOTTING FUNCTIONS


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

    var xScale = d3.scaleLinear()
        .domain([min_x - avg_x, max_x + avg_x])
        .range([0, width]);
    var yScale = d3.scaleLinear()
        .domain([min_y - avg_y, max_y + avg_y])
        .range([height, 0]);
    var xAxis = d3.axisBottom()
        .scale(xScale)
        .tickSize(-height);
    var yAxis = d3.axisLeft()
        .scale(yScale)
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


// does not do grouping
// Function takes as input an array of x values, array of y values, x axis name, y axis name, and a div id, and renders a scatterplot there
export function scatter(x_Axis, y_Axis, x_Axis_name, y_Axis_name, id, dim, title) {
    if (id === undefined) id = '#setxLeftPlot';
    if (dim === undefined) dim = {width: 400, height: 300};
    if (title === undefined) title = 'Scatterplot';

    let data = x_Axis.map((_, i) => ({[x_Axis_name]: x_Axis[i], [y_Axis_name]: y_Axis[i]}));
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

    var x = d3.scaleLinear()
        .domain([minX - 0.5, maxX + 0.5])
        .range([0, width]);

    var invx = d3.scaleLinear()
        .range([minX - 0.5, maxX + 0.5])
        .domain([0, width]);

    var y = d3.scaleLinear()
        .domain([0, maxY])
        .range([0, height]);

    var xAxis = d3.axisBottom()
        .scale(x)
        .ticks(yVals.length);

    var yAxis = d3.axisLeft()
        .scale(y);

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

