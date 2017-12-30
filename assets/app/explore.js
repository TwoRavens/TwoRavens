import m from 'mithril';

import * as app from './app';

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
            viz_explore(this.id, json, model_selection_name);
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
    viz_explore(model, json, model_name);
}

