import * as d3 from "d3"
import {handleResize, countryData} from "../app";

/**
 * Variables declared for location
 *
 **/
let mapGraphSVG = {};
let mapSubGraphIdCname = {};
export let mapListCountriesSelected = {};

/**
 * Draw the main graph for Location
 *
 **/

export function updateLocation() {
    // Clear existing data and plots
    $("#main_graph_svg").remove();
    $("#sub_graph_td_div").empty();
    $("#country_list_tab").empty();

    mapGraphSVG["main_graph"] = d3.select("#main_graph_td_div").append("svg:svg")
        .attr("width", 450)
        .attr("height", 350)
        .attr("background-color", "#ADADAD")
        .attr("id", "main_graph_svg");

    render(false, 0);
    // Main graph should always default to open
    maingraphAction('Expand');
}

function resetLocationVariables() {
    mapGraphSVG = {};
    mapSubGraphIdCname = {};
    mapListCountriesSelected = {};
}

/**
 * render to render/draw the main/sub graph with the data provided in form of array of Objects
 * with the links to create the sub-graph based on the data
 *
 **/
let arr_location_region_data = [];
let map_location_rid_rname = new Map();

let map_location_lookup = new Map();
let map_fullname_lookup = new Map();

function render(blnIsSubgraph, cid) {

    // console.log(cid);

    if (!blnIsSubgraph) {		//this is the main graph

        // console.log("Rendering Main Graph...");

        let maxDomainX = 1;
        let svg = d3.select("#main_graph_svg");
        let margin = {top: 5, right: 20, bottom: 5, left: 120},
            width = +svg.attr("width") - margin.left - margin.right,
            height = +svg.attr("height") - margin.top - margin.bottom;

        let x = d3.scaleLinear().range([0, width]);
        let y = d3.scaleBand().range([height, 0]);

        svg.append("defs").append("pattern")
            .attr("id", "pattern1")
            .attr("x", "10")
            .attr("y", "10")
            .attr("width", y.bandwidth() / 20)
            .attr("height", y.bandwidth() / 20)
            .attr("patternUnits", "userSpaceOnUse")
            .append("line")
            .attr("x1", "0")
            .attr("y1", "0")
            .attr("x2", y.bandwidth() / 20)
            .attr("y2", y.bandwidth() / 20)
            .attr("style", "stroke:brown;stroke-width:5;");

        d3.csv("/static/EventData/data/locationlookup.csv", function (error, data) {
            // Clear existing region data to redraw with new subsetted data
            arr_location_region_data = [];
            map_location_rid_rname = new Map();
            map_fullname_lookup = new Map();
            resetLocationVariables();

            data.forEach(function (d) {
                map_location_lookup.set(d.cname, d.rname);
                map_location_lookup.set(d.fullcname, d.rname);

                map_fullname_lookup.set(d.cname, d.fullcname);
            });

            let rid = -1;
            let cid = 1;
            for (let key in countryData) {

                let region = "Other";
                if (map_location_lookup.has(key)) {
                    region = map_location_lookup.get(key);
                }

                let fullname = key;
                if (map_fullname_lookup.has(key)) {
                    fullname = map_fullname_lookup.get(key);
                }

                let country = {
                    'id': "" + cid++,
                    'cname': key,
                    'freq': "" + countryData[key],
                    'fullcname': map_fullname_lookup.get(key)
                };

                if (!map_location_rid_rname.has(region)) {

                    rid++;
                    let arr_countries = [];
                    arr_countries.push(country);

                    let arr_country_names = [];
                    arr_country_names.push(country.cname);

                    let rdata = {};
                    rdata.rid = rid;
                    rdata.rname = region;
                    rdata.freq = parseInt(country.freq);
                    rdata.maxCFreq = parseInt(country.freq);
                    rdata.countries = arr_countries;
                    rdata.country_names = arr_country_names;

                    arr_location_region_data[rid] = rdata;

                    map_location_rid_rname.set(region, "" + rid);
                    map_location_rid_rname.set("" + rid, region);

                }
                else {

                    let currrid = map_location_rid_rname.get(region);
                    let rdata = arr_location_region_data[currrid];
                    let freq = rdata.freq + parseInt(country.freq);
                    rdata.freq = freq;
                    rdata.countries.push(country);
                    rdata.country_names.push(country.cname);

                    let cFreq = parseInt(country.freq);
                    if (cFreq > rdata.maxCFreq) {
                        rdata.maxCFreq = cFreq;
                    }

                    arr_location_region_data[currrid] = rdata;

                    if (freq > maxDomainX) {
                        maxDomainX = freq;
                    }
                }
            }

            x.domain([0, maxDomainX]);
            y.domain(arr_location_region_data.map(function (d) {
                //~ console.log(d);
                return d.rname;
            })).padding(0.2);		//this controls the padding

            let g = svg.append("g")		//this draws the x axis ticks
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            g.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(x).ticks(5).tickFormat(function (d) {
                    return parseInt(d);
                }).tickSizeInner([-height]));

            g.append("g")
                .attr("id", "y_axis_main")
                .attr("class", "y axis")
                .call(d3.axisLeft(y));


            g.selectAll(".bar")			//these are the bars themselves
                .data(arr_location_region_data)
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", 0)
                .attr("height", y.bandwidth())
                .attr("y", function (d) {
                    return y(d.rname);
                })
                .attr("width", function (d) {
                    return x(d.freq);
                })
                .attr("onclick", function (d) {
                    mapGraphSVG[d.rid] = null;
                    return "javascript:constructSubgraph('" + d.rid + "', true)";
                })
                .attr("id", function (d) {
                    return "tg_rect_" + d.rid;
                });

            g.selectAll(".bar_click")	//these are the empty space following the bars
                .data(arr_location_region_data)
                .enter()
                .append("rect")
                .attr("class", "bar_click")
                .attr("height", y.bandwidth())
                .attr("width", function (d) {
                    return width - x(d.freq);
                })
                .attr("x", function (d) {
                    return x(d.freq);
                })
                .attr("y", function (d) {
                    return y(d.rname);
                })
                .attr("onclick", function (d) {
                    return "javascript:constructSubgraph('" + d.rid + "', true)";
                });

            g.selectAll(".bar_label")	//these are the labels for the bars
                .data(arr_location_region_data)
                .enter()
                .append("text")
                .attr("class", "bar_label")
                .attr("x", function (d) {
                    return x(d.freq) + 5;
                })
                .attr("y", function (d) {
                    return y(d.rname) + y.bandwidth() / 2 + 4;
                })
                .text(function (d) {
                    return "" + d.freq;
                });

            g.append("text")			//this is the x axis label
                .attr("text-anchor", "middle")
                .attr("transform", "translate(" + (width / 2) + "," + (height + 30) + ")")
                .text("Frequency");

        });
    }
    else {						//this is a sub graph

        // console.log("Rendering Sub Graph...");

        let MAX_HEIGHT = 35;
        let arr_countries = arr_location_region_data[cid].countries;
        let maxDomainX = arr_location_region_data[cid].maxCFreq;

        let svg = d3.select("#sub_graph_td_svg_" + cid);

        let margin = {top: 20, right: 30, bottom: 30, left: 40},
            width = +svg.attr("width") - margin.left - margin.right,
            height = +svg.attr("height") - margin.top - margin.bottom;

        let x = d3.scaleLinear().range([0, width]);
        let y = d3.scaleBand().range([height, 0]);

        // console.log(maxDomainX);

        x.domain([0, maxDomainX]);
        y.domain(arr_countries.map(function (d) {
            return d.cname;
        })).padding(0.1);

        let g = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        g.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x).ticks(5).tickFormat(function (d) {
                return parseInt(d);
            }).tickSizeInner([-height]));

        g.append("g")
            .attr("class", "y axis")
            .call(d3.axisLeft(y));


        g.selectAll(".bar")
            .data(arr_countries)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", 0)
            .attr("height", d3.min([y.bandwidth(), MAX_HEIGHT]))
            .attr("y", function (d) {
                mapSubGraphIdCname[d.cname] = cid + "_" + d.id;
                if (mapListCountriesSelected[d.cname] == null) {
                    mapListCountriesSelected[d.cname] = false;
                }
                return y(d.cname) + (y.bandwidth() - d3.min([y.bandwidth(), MAX_HEIGHT])) / 2;
            })
            .attr("width", function (d) {
                return x(d.freq);
            })
            .attr("onclick", function (d) {
                return "javascript:subgraphYLabelClicked('" + d.cname + "')";
            })
            .attr("id", function (d) {
                return "tg_rect_" + cid + "_" + d.id;
            })
            .append("svg:title")
            .text(function (d) {
                return d.fullcname;
            });

        g.selectAll(".bar_click")
            .data(arr_countries)
            .enter()
            .append("rect")
            .attr("class", "bar_click")
            .attr("height", d3.min([y.bandwidth(), MAX_HEIGHT]))
            .attr("width", function (d) {
                return width - x(d.freq);
            })
            .attr("x", function (d) {
                return x(d.freq);
            })
            .attr("y", function (d) {
                return y(d.cname) + (y.bandwidth() - d3.min([y.bandwidth(), MAX_HEIGHT])) / 2;
            })
            .attr("onclick", function (d) {
                return "javascript:subgraphYLabelClicked('" + d.cname + "')";
            });

        g.selectAll(".bar_label")
            .data(arr_countries)
            .enter()
            .append("text")
            .attr("class", "bar_label")
            .attr("x", function (d) {
                return x(d.freq) + 5;
            })
            .attr("y", function (d) {
                return y(d.cname) + y.bandwidth() / 2 + 4;
            })
            .text(function (d) {
                return "" + d.freq;
            });

        g.append("text")			//this is the x axis label
            .attr("text-anchor", "middle")
            .attr("transform", "translate(" + (width / 2) + "," + (height + 30) + ")")
            .text("Frequency");

    }
    handleResize();
}

/**
 * constructSubgraph by the rname or id of the main graph
 * and do the rendering of the sub graph
 *
 **/
window.constructSubgraph = function(cid, scrollTo) {

    // console.log("constructSubgraph for cid : " + cid);

    if (mapGraphSVG[cid] != null) {
        subgraphAction('expand_collapse_text_' + cid);

        if (scrollTo) document.getElementById('sub_graph_td_div_' + cid).scrollIntoView();
        return;
    }

    if (mapGraphSVG[cid + "_removed"] != null) {

        mapGraphSVG[cid] = mapGraphSVG[cid + "_removed"];
        mapGraphSVG[cid + "_removed"] = null;

        let subGraphDiv = $("#sub_graph_td_div_" + cid);
        subGraphDiv.parent().show();
        subGraphDiv.removeClass('graph_close');
        subGraphDiv.addClass('graph_config');

        if (scrollTo) document.getElementById('sub_graph_td_div_' + cid).scrollIntoView();
        return;
    }

    subGraphLabel(cid);

    mapGraphSVG[cid] = d3.select("#sub_graph_td_div_" + cid).append("svg:svg")
        .attr("width", 470)
        .attr("height", 350)
        .attr("id", "sub_graph_td_svg_" + cid);

    render(true, cid);

    if (scrollTo) document.getElementById('sub_graph_td_div_' + cid).scrollIntoView();
};

/**
 * maingraphAction -> to map the header function {All, None, Expand/Collapse} for the main graph
 *
 **/
export function maingraphAction(action) {

    if (action === 'Expand_Collapse') {

        action = $('#Expand_Collapse_Main_Text').text();
    }

    if (action === 'All') {

        for (let cid in mapGraphSVG) {

            if (cid.indexOf("_removed") > -1) {
                continue;
            }
            let subGraphDiv = $("#sub_graph_td_div_" + cid);

            if (mapGraphSVG[cid] == null) {
                // console.log("SVG CREATE = " + cid);
                subGraphDiv.parent().show();
                subGraphDiv.removeClass('graph_close');
                subGraphDiv.addClass('graph_config');
                constructSubgraph(cid);
            }
            else if (mapGraphSVG[cid + "_removed"] == null) {

                // console.log("SVG SHOW = " + cid);
                subGraphDiv.parent().show();
                subGraphDiv.removeClass('graph_close');
                subGraphDiv.addClass('graph_config');
            }
            else if (mapGraphSVG[cid] != null) {
                // console.log("SVG NO_ACTION = " + cid);
            }
        }

    }
    else if (action === 'None') {

        removeAllSubGraphSVG();
    }
    else if (action === 'Collapse') {

        $("#Expand_Collapse_Main_Text").text("Expand");

        $("#Exp_Col_Icon").removeClass("glyphicon-resize-small").addClass("glyphicon-resize-full");
        $("#main_graph_td_div").removeClass('graph_config').addClass('graph_collapse');
    }
    else if (action === 'Expand') {

        $("#Expand_Collapse_Main_Text").text("Collapse");

        $("#Exp_Col_Icon").removeClass("glyphicon-resize-full").addClass("glyphicon-resize-small");
        $("#main_graph_td_div").removeClass('graph_collapse').addClass('graph_config');
    }
    handleResize();
}

/**
 * subgraphAction-> to map the subgraph function {All, None, Expand/Collapse}
 *
 **/
window.subgraphAction = function(textId) {

    if (textId.indexOf("expand_collapse_text_") !== -1) {
        let actionDiv =  $("#" + textId);

        if (actionDiv.text() === 'Collapse') {

            let cid = textId.substring(21);
            $("#" + textId).text("Expand");

            $("#Exp_Col_Icon_" + cid).removeClass("glyphicon-resize-small").addClass("glyphicon-resize-full");
            $("#sub_graph_td_div_" + cid).removeClass('graph_config').addClass('graph_collapse');

        }
        else if (actionDiv.text() === 'Expand') {

            let cid = textId.substring(21);
            actionDiv.text("Collapse");

            $("#Exp_Col_Icon_" + cid).removeClass("glyphicon-resize-full").addClass("glyphicon-resize-small");
            $("#sub_graph_td_div_" + cid).removeClass('graph_collapse').addClass('graph_config');
        }
    }
    else {

        let actionData = textId.split("_");
        let action = actionData[0];
        let cid = actionData[1];

        let listCname = arr_location_region_data[cid].country_names;
        let bool = true;
        if (action === 'All') {
            bool = true;
        }
        else if (action === 'None') {
            bool = false;
        }

        for (let cname of listCname) {
            mapListCountriesSelected[cname] = bool;
        }

        updateCountryList();
    }
    handleResize();
};


/**
 * removeAllSubGraphSVG - to remove all the subgraph when clicked on "None" in the main graph
 *
 **/
function removeAllSubGraphSVG() {

    for (let cid in mapGraphSVG) {

        if (cid.indexOf("_removed") > -1) {
            continue;
        }

        if (cid != null && mapGraphSVG[cid] != null) {
            mapGraphSVG[cid + "_removed"] = mapGraphSVG[cid];
            mapGraphSVG[cid] = null;

            $("#sub_graph_td_div_" + cid).removeClass('graph_config').addClass('graph_close').parent().hide();
        }
    }
    handleResize();
}

window.subgraphYLabelClicked = function(cname) {
    mapListCountriesSelected[cname] = !mapListCountriesSelected[cname];
    updateCountryList();
};

/**
 * subGraphLabel - to put the header Labels in the sub graph
 *
 **/
function subGraphLabel(cid) {

    $("#sub_graph_td_div").append(
        '        <div style="float:left;">\n' +
        '            <div id="sub_graph_td_div_' + cid + '" class="graph_config" style="width:480px;border: 1px solid #ADADAD; padding-top:3px; background: rgb(249, 249, 249);"  align=\'center\'>\n' +
        '                <div class="panel-heading text-center" style="float:left;padding-top:9px">\n' +
        '                    <h3 class="panel-title">' + map_location_rid_rname.get(cid) + '</h3>\n' +
        '                </div>\n' +
        '                <label id="expand_collapse_text_' + cid + '" class="hide_label">Collapse</label>\n' +
        '                <button class="btn btn-default" style="cursor:pointer;float:right;margin-right:5px;" onclick="subgraphAction(\'expand_collapse_text_' + cid + '\')"><span id="Exp_Col_Icon_' + cid + '" class="glyphicon glyphicon-resize-small" style="color:#818181 !important;"></span></button>\n' +
        '                <button class="btn btn-default" type="button" style="float:right;margin-right:5px;" data-toggle="tooltip" onclick=subgraphAction(\'All_' + cid + '\')>Select All</button>\n' +
        '                <button class="btn btn-default" type="button" style="float:right;margin-right:5px;" data-toggle="tooltip" onclick=subgraphAction(\'None_' + cid + '\')>Deselect All</button>\n' +
        '            </div>\n' +
        '        </div>');
}

function updateCountryList() {

    let td_id = 'country_list_tab';
    $("#" + td_id).empty();

    let mapLocalMainGraphIdWithSubGraphCnameList = {};

    for (let country in mapListCountriesSelected) {

        let bool = mapListCountriesSelected[country];
        let main_subGraphId = mapSubGraphIdCname[country];

        let arrIds = main_subGraphId.split("_");
        let mainGraphId = arrIds[0];

        if (mapLocalMainGraphIdWithSubGraphCnameList[mainGraphId] == null) {
            mapLocalMainGraphIdWithSubGraphCnameList[mainGraphId] = [];
        }

        if (bool) {
            let fullcountry = '';
            if (map_fullname_lookup.has(country)) {
                fullcountry = ": " + map_fullname_lookup.get(country);
            }

            $("#country_list_tab").append('<tr><td><label class="strike_through" style="cursor:pointer;float:left" onclick="removeFromCountryList(\'' + country + '\');">' + country + fullcountry + '</label></td></tr>');
            $("#tg_rect_" + main_subGraphId).attr("class", "bar_all_selected");
            mapLocalMainGraphIdWithSubGraphCnameList[mainGraphId].push(country);
        }
        else {
            $("#tg_rect_" + main_subGraphId).attr("class", "bar");
        }
    }

    for (let mainGraphCid in arr_location_region_data) {

        let originalLength = arr_location_region_data[mainGraphCid].country_names.length;
        let localLength = (mapLocalMainGraphIdWithSubGraphCnameList[mainGraphCid] == null ? 0 : mapLocalMainGraphIdWithSubGraphCnameList[mainGraphCid].length);

        if (localLength === 0) {
            $("#tg_rect_" + mainGraphCid).attr("class", "bar");
        }
        else if (localLength < originalLength) {
            $("#tg_rect_" + mainGraphCid).attr("class", "bar_some_selected");
        }
        else if (localLength === originalLength) {
            $("#tg_rect_" + mainGraphCid).attr("class", "bar_all_selected");
        }

    }
}

window.removeFromCountryList = function(cname) {
    if (cname === 'reset_all') {

        for (let country in mapListCountriesSelected) {
            mapListCountriesSelected[country] = false;
        }
    }
    else {

        mapListCountriesSelected[cname] = false;
    }
    updateCountryList();
};
