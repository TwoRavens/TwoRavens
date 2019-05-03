import {
    alertError,
    alertWarn,
    allResults, default as app,
    byId,
    callHistory,
    cdb,
    del,
    downloadIncomplete,
    getSelectedDataset,
    hexToRgba,
    links,
    makeRequest,
    modelCount,
    nodes,
    priv,
    zparams
} from "./app";
import * as d3 from "d3";
import m from "mithril";
import {bars, barsSubset, density} from "./plots";
import $ from "jquery";
import * as common from "../common/common";
import {end_ta3_search} from "./solvers/d3m";

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