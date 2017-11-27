
/**
 * ACTION
 *
 */

function pentaClass (classNum, count, maxSelect) {
	this.classNum = classNum;
	this.count = count;
	this.maxSelect = maxSelect;			//this and selectCount are to choose what fill: if selectCount == 0 then standard, != maxSelect then partial, else fill
	this.selectCount = 0;
	this.description = "";
}

var actionTooltip = d3.select("#subsetAction").select(".SVGtooltip").style("opacity", 0);		//tooltip

var pentaCounts = [];		//this will probably have to move into d3action() in order to "reload" data from queries
var pentaDesc = ["Public Statement", "Verbal Cooperation", "Material Cooperation", "Verbal Conflict", "Material Conflict"];

var actionBuffer = [];			//this is for query submission - remember to clear it after query!
var actionSubData = [];			//this is for the data in each root event code

var d3action_draw = false;		//only draw graphs once

var actionMainX, actionMainY, actionMainMargin, actionMainWidth, actionMainHeight, actionMainGraphData;
var actionSubX, actionSubY, actionSubMargin, actionSubWidth, actionSubHeight, actionSubGraphData;

// Action labels
d3.csv("../data/actionlookup.csv", function(d) {
    return {
        rootCode: +d.EventRootCode,
        rootDesc: d.Description,
        penta: +d.PentaClass,
        count: 0,
        used: false,				//this is from pentaCounts; on click from main graph this is set
        active: false				//this is from actionSubData; on click from sub graph this is set
    };
}, function(data) {
    actionSubData = data;
});

function resetActionCounts() {
	pentaCounts = [];
	actionBuffer = [];

    for (var x = 0; x < 5; x++) {
        pentaCounts.push(new pentaClass(x, 0, 0));
        pentaCounts[x].description = pentaDesc[x];
    }

    for (var x = 0; x < 20; x ++) {
        if (!isNaN(actionData[x + 1])) {
            pentaCounts[actionSubData[x].penta].count += actionData[x + 1];
            actionSubData[x].count = actionData[x + 1];
        }
        pentaCounts[actionSubData[x].penta].maxSelect ++;
    }
}

function drawGraphs() {
    $("#actionMainGraph").empty();
	$("#actionSubGraph").empty();

	//begin drawing for main graph
	var svgMain = d3.select("#actionMainGraph");
	actionMainMargin = {top: 0, right: 50, bottom: 50, left: 50};

	actionMainWidth = +$('#pentaclass_container').width() - actionMainMargin.left - actionMainMargin.right;
	actionMainHeight = +$('#pentaclass_container').height() - actionMainMargin.top - actionMainMargin.bottom - 38;

	actionMainX = d3.scaleLinear().range([0, actionMainWidth]);
    actionMainY = d3.scaleBand().range([0, actionMainHeight]);

    svgMain.append("defs").append("pattern")
		.attr("id", "actionPattern")
		.attr("x", "10")
		.attr("y", "10")
		.attr("width", actionMainY.bandwidth()/20)
		.attr("height", actionMainY.bandwidth()/20)
		.attr("patternUnits", "userSpaceOnUse")
		.append("line")
		.attr("x1","0")
		.attr("y1","0")
		.attr("x2", actionMainY.bandwidth()/20)
		.attr("y2", actionMainY.bandwidth()/20)
		.attr("style", "stroke:brown;stroke-width:5;");

	actionMainX.domain([0, d3.max(pentaCounts, function(d) {return d.count;})]);
	actionMainY.domain(pentaCounts.map(function(d) {return d.classNum;})).padding(0.15);

	var gMain = svgMain.append("g").attr("id", "actionMainG")
		.attr("transform", "translate(" + actionMainMargin.left + "," + actionMainMargin.top + ")");

	gMain.append("g")
	.attr("class", "x axis mainX")
	.attr("transform", "translate(0," + actionMainHeight + ")")
	.call(d3.axisBottom(actionMainX).ticks(5).tickFormat(function(d) {
		return parseInt(d);
	}).tickSizeInner([-actionMainHeight])).select("path").style("display", "inline");

	gMain.append("g").attr("class", "y axis mainY").call(d3.axisLeft(actionMainY));

	// console.log("creating actionMainGraphData");

	actionMainGraphData = gMain.append("g").attr("id", "actionMainData").selectAll("g");		//group data together

	gMain.append("text")
		.attr("text-anchor", "middle")
		.attr("transform", "translate(" + (actionMainWidth / 2) + "," + (actionMainHeight + 35) + ")")
		.attr("class", "graph_axis_label")
		.text("Frequency");

	//end of main graph, begin sub graph

	var svgSub = d3.select("#actionSubGraph");
		actionSubMargin = {top: 0, right: 50, bottom: 50, left: 50},
		actionSubWidth = +$('#rootcode_container').width() - actionSubMargin.left - actionSubMargin.right,
		actionSubHeight = +$('#rootcode_container').height() - actionSubMargin.top - actionSubMargin.bottom - 38;

	actionSubX = d3.scaleLinear().range([0, actionSubWidth]);
    actionSubY = d3.scaleBand().range([0, actionSubHeight]);

    actionSubX.domain([0, d3.max(actionSubData, function(d) {return d.count;})]);
    actionSubY.domain(actionSubData.map(function(d) {return d.rootCode;})).padding(0.15);

	var gSub = svgSub.append("g").attr("id", "actionSubG")
		.attr("transform", "translate(" + actionSubMargin.left + "," + actionSubMargin.top + ")");

	gSub.append("g")
		.attr("class", "x axis subX")
		.attr("transform", "translate(0," + actionSubHeight + ")")
		.call(d3.axisBottom(actionSubX).ticks(5).tickFormat(function(d) {
			return parseInt(d);
		}).tickSizeInner([-actionSubHeight])).select("path").style("display", "inline");

	gSub.append("g").attr("class", "y axis subY").call(d3.axisLeft(actionSubY));

	// console.log("creating actionSubGraphData");

	actionSubGraphData = gSub.append("g").attr("id", "actionSubData").selectAll("g");		//group data together
	//~ gSub.append("g").attr("id", "actionSubData");

	gSub.append("text")
		.attr("text-anchor", "middle")
		.attr("transform", "translate(" + (actionSubWidth / 2) + "," + (actionSubHeight + 35) + ")")
		.attr("class", "graph_axis_label")
		.text("Frequency");
}

function updateData() {
    for (let i in pentaCounts) {
        pentaCounts[i].selectCount = 0;
    }
	//begin updating main graph data
	actionMainX.domain([0, d3.max(pentaCounts, function(d) {return d.count;})]);
	actionMainY.domain(pentaCounts.map(function(d) {return d.classNum;}));

	d3.select("#actionMainGraph").select(".mainX").call(d3.axisBottom(actionMainX).ticks(5).tickFormat(function(d) {
		return parseInt(d);
	}).tickSizeInner([-actionMainHeight]));
	d3.select("#actionMainGraph").select(".mainY").call(d3.axisLeft(actionMainY));

	actionMainGraphData = actionMainGraphData.data(pentaCounts, function(d) {return d.count;});
	actionMainGraphData.exit().remove();
	
	actionMainGraphData = actionMainGraphData.enter()
		.append("g").attr("id", function(d) {return "Data" + d.classNum;})
		.each(function(d) {
			d3.select(this).append("rect")
				.attr("id", function(d) {return "actionBar_click" + d.classNum;})
				.attr("class", "actionBar_click").attr("height", actionMainY.bandwidth())
				.attr("width", function(d) {
					return actionMainWidth - actionMainX(d.count) + actionMainMargin.right;
				})		//extend to edge of svg
				.attr("x", function(d) {return actionMainX(d.count);}).attr("y", function(d) {return actionMainY(d.classNum);})
				.on("click", function(d) {
					// console.log("clicked " + d.classNum);
					if (d.maxSelect == d.selectCount) {		//deselect all of penta class
						for (var x = 0; x < actionSubData.length; x ++) {
							if (actionSubData[x].penta == d.classNum && actionSubData[x].active) {
								// console.log("deselecting #actionSubBar" + (x + 1));
								$("#actionSubBar" + (x + 1)).d3Click();
							}
						}
					}
					else {
						for (var x = 0; x < actionSubData.length; x ++) {
							if (actionSubData[x].penta == d.classNum && !actionSubData[x].active) {
								// console.log("selecting #actionSubBar" + (x + 1));
								$("#actionSubBar" + (x + 1)).d3Click();
							}
						}
					}
					// console.log("main buffer:");
					// console.log(actionBuffer);
					// console.log("\n");
				})
				.on("mouseover", function(d) {
					var oldClasses = $("#actionBar" + d.classNum).attr("class");
					$("#actionBar" + d.classNum).attr("class", oldClasses + " "
						+ oldClasses.split(/(\s+)/).filter(function(e) {return e.trim().length > 0;})[1] + "_hover");
					actionTooltip.html(d.description).style("display", "block");
					actionTooltip.transition().duration(200).style("opacity", 1);
				})
				.on("mousemove", function(d) {
					actionTooltip.style("display", "block")
						.style("left", d3.event.pageX - 250 + "px")
						.style("top", d3.event.pageY - 70 + "px");
				})
				.on("mouseout", function(d) {
					var oldClasses = $("#actionBar" + d.classNum).attr("class");
					$("#actionBar" + d.classNum).attr("class", oldClasses.replace(/ *\b\S*?_hover\S*\b/g, ''));
					actionTooltip.transition().duration(200).style("opacity", 0).style("display", "none");
				});

			d3.select(this).append("rect")
				.attr("id", function(d) {return "actionBar" + d.classNum;}).attr("class", "actionBar actionBar_none")
				.attr("x", 0).attr("height", actionMainY.bandwidth()).attr("y", function(d) {return actionMainY(d.classNum);})
				.attr("width", function(d) {return actionMainX(d.count);})
				.on("click", function (d) {
					// console.log("clicked " + d.classNum);
					if (d.maxSelect == d.selectCount) {		//deselect all of penta class
						for (var x = 0; x < actionSubData.length; x ++) {
							if (actionSubData[x].penta == d.classNum && actionSubData[x].active) {
								// console.log("deselecting #actionSubBar" + (x + 1));
								$("#actionSubBar" + (x + 1)).d3Click();
							}
						}
					}
					else {
						for (var x = 0; x < actionSubData.length; x ++) {
							if (actionSubData[x].penta == d.classNum && !actionSubData[x].active) {
								// console.log("selecting #actionSubBar" + (x + 1));
								$("#actionSubBar" + (x + 1)).d3Click();
							}
						}
					}
					// console.log("main buffer:");
					// console.log(actionBuffer);
					// console.log("\n");
				})
				.on("mouseover", function(d) {					
					actionTooltip.html(d.description).style("display", "block");
					actionTooltip.transition().duration(200).style("opacity", 1);
				})
				.on("mousemove", function(d) {
					actionTooltip.style("display", "block")
						.style("left", d3.event.pageX - 250 + "px")
						.style("top", d3.event.pageY - 70 + "px");
				})
				.on("mouseout", function(d) {
					actionTooltip.transition().duration(200).style("opacity", 0).style("display", "none");
				});

			d3.select(this).append("text")
				.attr("class", "actionBar_label").attr("x", function(d) {return actionMainX(d.count) + 5;})
				.attr("y", function(d) {return actionMainY(d.classNum) + actionMainY.bandwidth() / 2 + 4;})
				.text(function(d) {return "" + d.count;});
		})
		.merge(actionMainGraphData);

	//end of update main graph data, begin update sub graph data

	actionSubX.domain([0, d3.max(actionSubData, function(d) {return d.count;})]);
    actionSubY.domain(actionSubData.map(function(d) {return d.rootCode;}));

	d3.select("#actionSubGraph").select(".subX").call(d3.axisBottom(actionSubX).ticks(5).tickFormat(function(d) {
		return parseInt(d);
	}).tickSizeInner([-actionMainHeight]));
	d3.select("#actionSubGraph").select(".subY").call(d3.axisLeft(actionSubY));

	actionSubGraphData = actionSubGraphData.data(actionSubData, function(d) {return d.rootCode + "_" + d.count;});
	actionSubGraphData.exit().remove();

	actionSubGraphData = actionSubGraphData.enter()
		.append("g").attr("id", function(d) {return "SubData" + d.rootCode;})
		.each(function(d) {
			d3.select(this).append("rect")
				.attr("id", function(d) {return "actionSubBar_click" + d.rootCode;})
				.attr("class", "actionBar_click")
				.attr("height", actionSubY.bandwidth())
				.attr("width", function(d) {
					return actionSubWidth - actionSubX(d.count) + actionSubMargin.right;
				})		//extend to edge of svg
				.attr("x", function(d) {return actionSubX(d.count);}).attr("y", function(d) {return actionSubY(d.rootCode);})
				.on("click", function(d) {
                    // console.log("clicked on actionSubBar" + d.rootCode);
                    d.active = !d.active;
                    $("#actionSubBar" + d.rootCode).attr("class", function() {return "actionBar " + (d.active ? "actionBar_all" : "actionBar_none");});
                    d.active ? actionBuffer.push(d.rootCode) : actionBuffer.splice(actionBuffer.indexOf(d.rootCode), 1);

                    applyCodeSelection(d);
                })
				.on("mouseover", function(d) {
					var oldClasses = $("#actionSubBar" + d.rootCode).attr("class");
					$("#actionSubBar" + d.rootCode).attr("class", oldClasses + " "
						+ oldClasses.split(/(\s+)/).filter(function(e) {return e.trim().length > 0;})[1] + "_hover");
					actionTooltip.html(d.rootDesc).style("display", "block");
					actionTooltip.transition().duration(200).style("opacity", 1);
				})
				.on("mousemove", function(d) {
					actionTooltip.style("display", "block")
						.style("left", d3.event.pageX - 250 + "px")
						.style("top", d3.event.pageY - 70 + "px");
				})
				.on("mouseout", function(d) {
					var oldClasses = $("#actionSubBar" + d.rootCode).attr("class");
					$("#actionSubBar" + d.rootCode).attr("class", oldClasses.replace(/ *\b\S*?_hover\S*\b/g, ''));
					actionTooltip.transition().duration(200).style("opacity", 0).style("display", "none");
				});

			d3.select(this).append("rect")
				.attr("id", function(d) {return "actionSubBar" + d.rootCode;})
				.attr("class", function(d) {
                    if (actionBuffer.indexOf(d.rootCode) !== -1) {
                        d.active = true;
                        applyCodeSelection(d);
                        return "actionBar actionBar_all";
                    } else {
                        d.active = false;
                        return "actionBar actionBar_none";
                    }
                })
				.attr("x", 0).attr("height", actionSubY.bandwidth()).attr("y", function(d) {return actionSubY(d.rootCode);})
				.attr("width", function(d) {return actionSubX(d.count);})
				.on("click", function(d) {
                    d.active = !d.active;
                    $("#actionSubBar" + d.rootCode).attr("class", function() {return "actionBar " + (d.active ? "actionBar_all" : "actionBar_none");});
                    d.active ? actionBuffer.push(d.rootCode) : actionBuffer.splice(actionBuffer.indexOf(d.rootCode), 1);

                    applyCodeSelection(d);
                })
				.on("mouseover", function(d) {
					actionTooltip.html(d.rootDesc).style("display", "block");
					actionTooltip.transition().duration(200).style("opacity", 1);
				})
				.on("mousemove", function(d) {
					actionTooltip.style("display", "block")
						.style("left", d3.event.pageX - 250 + "px")
						.style("top", d3.event.pageY - 70 + "px");
				})
				.on("mouseout", function(d) {
					actionTooltip.transition().duration(200).style("opacity", 0).style("display", "none");
				});

			d3.select(this).append("text")
				.attr("class", "actionBar_label").attr("x", function(d) {return actionSubX(d.count) + 5;})
				.attr("y", function(d) {return actionSubY(d.rootCode) + actionSubY.bandwidth() / 2 + 4;})
				.text(function(d) {return "" + d.count;});
		})
		.merge(actionSubGraphData);
}

let applyCodeSelection = function(d) {
    // console.log("in sub buffer");
    // console.log(actionBuffer);
    for (var x = 0; x < pentaCounts.length; x ++) {
        if (pentaCounts[x].classNum === d.penta) {
            // console.log("found " + x);
            if (d.active) {
                pentaCounts[x].selectCount ++;
            }
            else {
                pentaCounts[x].selectCount --;
            }
            // console.log("selectCount: " + pentaCounts[x].selectCount + " out of " + pentaCounts[x].maxSelect);
            if (pentaCounts[x].selectCount === pentaCounts[x].maxSelect) {
                // console.log("all");
                $("#actionBar" + x).attr("class", "actionBar actionBar_all");
            }
            else if (pentaCounts[x].selectCount === 0) {
                // console.log("none");
                $("#actionBar" + x).attr("class", "actionBar actionBar_none");
            }
            else {
                // console.log("some");
                $("#actionBar" + x).attr("class", "actionBar actionBar_some");
            }
            // console.log("end sub click");
            break;
        }
    }
}

jQuery.fn.d3Click = function () {
  this.each(function (i, e) {
    var evt = new MouseEvent("click");
    e.dispatchEvent(evt);
  });
};
