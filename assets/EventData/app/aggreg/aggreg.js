import {dataset, datasource, laddaUpdate, makeCorsRequest, rappURL, showCanvas} from "../app";
import {datemaxUser, dateminUser} from "../subsets/Date";
import {actorLinks} from "../subsets/Actor";
import * as d3 from "d3";
import m from 'mithril';

let aggregMode = "penta";
// set once results are loaded on update. unsets when subsets/aggregations are changed before updates. unlocks the results menus in aggregation.
export let aggregResults = false;
export let aggregResultsDate = false;

export let aggregDateOn = 0;		//0 = off, 1 = week, 2 = month, 3 = quarter, 4 = year
export let aggregActorOn = true;
var aggregDataNumber = 6;

var initTblColor;

var initAggregLoad = true;

var aggregPentaSelectNum = 5;
var aggregRootSelectNum = 20;

export var aggregPentaChkOrd = [];
export var aggregRootChkOrd = [];

for (let x = 0; x <= aggregRootSelectNum; x ++) {
	if (x <= aggregPentaSelectNum)
		aggregPentaChkOrd[x] = 1;
	aggregRootChkOrd[x] = 1;
}

export let eventMeasure = 'Penta Class';
export let setEventMeasure = (measure) => eventMeasure = measure;
export let setAggregMode = (mode) => aggregMode = mode;

// Map measure string to numeric value used in existing aggregation code
export let setDateMeasure = (measure) => {
	aggregResults = false;
    aggregDateOn = {
        'None': 0,
        'Weekly': 1,
        'Monthly': 2,
        'Quarterly': 3,
        'Yearly': 4
    }[measure];

    measure === 'None' ? $(".aggregDataDate").hide() : $(".aggregDataDate").show();
    updateAggregTable();
};

export let setAggregActor = (state) => {
	aggregActorOn = state;

	aggregActorOn ? $(".aggregDataActor").show() : $(".aggregDataActor").hide();
    updateAggregTable();
};

// start with all selected
export let selectedPentaClasses = Array(5).fill(true);
export let setSelectedPentaClasses = (status, penta) => {
	if (penta === undefined) selectedPentaClasses.fill(status);
	else selectedPentaClasses[penta] = status;
};

export let selectedRootCodes = Array(5).fill(true);
export let setSelectedRootCodes = (status, root) => {
    if (root === undefined) selectedRootCodes.fill(status);
    else selectedRootCodes[root] = status;
};

export let tableHeight = '20%';

var aggregURL;

let tooltipSVG;

export function updateToAggreg(alreadyInAggreg=true) {
	if (!alreadyInAggreg) {

		if (initAggregLoad) {
			tooltipSVG = d3.select("#canvasAggregTSBin").select(".SVGtooltip").style("opacity", 0);
			$("#aggregTable").append(function() {
				var tablestring = "";
				for (var row = 1; row <= aggregDataNumber; row ++) {
					tablestring +=
						'<tr id="aggregTableR' + row + '" class="aggregTableRow">\
							<th id="aggregDataDateR' + row + '" class="aggregDataDate">TBD</th>\
							<th id="aggregDataSrcR' + row + '" class="aggregDataSrc aggregDataActor">TBD</th>\
							<th id="aggregDataTgtR' + row + '" class="aggregDataTgt aggregDataActor">TBD</th>\
							<th id="aggregDataPenta0R' + row + '" class="aggregDataPenta0 aggregDataPenta">TBD</th>\
							<th id="aggregDataPenta1R' + row + '" class="aggregDataPenta1 aggregDataPenta">TBD</th>\
							<th id="aggregDataPenta2R' + row + '" class="aggregDataPenta2 aggregDataPenta">TBD</th>\
							<th id="aggregDataPenta3R' + row + '" class="aggregDataPenta3 aggregDataPenta">TBD</th>\
							<th id="aggregDataPenta4R' + row + '" class="aggregDataPenta4 aggregDataPenta">TBD</th>\
							<th id="aggregDataRoot1R' + row + '" class="aggregDataRoot1 aggregDataRoot" style="display:none;">TBD</th>\
							<th id="aggregDataRoot2R' + row + '" class="aggregDataRoot2 aggregDataRoot" style="display:none;">TBD</th>\
							<th id="aggregDataRoot3R' + row + '" class="aggregDataRoot3 aggregDataRoot" style="display:none;">TBD</th>\
							<th id="aggregDataRoot4R' + row + '" class="aggregDataRoot4 aggregDataRoot" style="display:none;">TBD</th>\
							<th id="aggregDataRoot5R' + row + '" class="aggregDataRoot5 aggregDataRoot" style="display:none;">TBD</th>\
							<th id="aggregDataRoot6R' + row + '" class="aggregDataRoot6 aggregDataRoot" style="display:none;">TBD</th>\
							<th id="aggregDataRoot7R' + row + '" class="aggregDataRoot7 aggregDataRoot" style="display:none;">TBD</th>\
							<th id="aggregDataRoot8R' + row + '" class="aggregDataRoot8 aggregDataRoot" style="display:none;">TBD</th>\
							<th id="aggregDataRoot9R' + row + '" class="aggregDataRoot9 aggregDataRoot" style="display:none;">TBD</th>\
							<th id="aggregDataRoot10R' + row + '" class="aggregDataRoot10 aggregDataRoot" style="display:none;">TBD</th>\
							<th id="aggregDataRoot11R' + row + '" class="aggregDataRoot11 aggregDataRoot" style="display:none;">TBD</th>\
							<th id="aggregDataRoot12R' + row + '" class="aggregDataRoot12 aggregDataRoot" style="display:none;">TBD</th>\
							<th id="aggregDataRoot13R' + row + '" class="aggregDataRoot13 aggregDataRoot" style="display:none;">TBD</th>\
							<th id="aggregDataRoot14R' + row + '" class="aggregDataRoot14 aggregDataRoot" style="display:none;">TBD</th>\
							<th id="aggregDataRoot15R' + row + '" class="aggregDataRoot15 aggregDataRoot" style="display:none;">TBD</th>\
							<th id="aggregDataRoot16R' + row + '" class="aggregDataRoot16 aggregDataRoot" style="display:none;">TBD</th>\
							<th id="aggregDataRoot17R' + row + '" class="aggregDataRoot17 aggregDataRoot" style="display:none;">TBD</th>\
							<th id="aggregDataRoot18R' + row + '" class="aggregDataRoot18 aggregDataRoot" style="display:none;">TBD</th>\
							<th id="aggregDataRoot19R' + row + '" class="aggregDataRoot19 aggregDataRoot" style="display:none;">TBD</th>\
							<th id="aggregDataRoot20R' + row + '" class="aggregDataRoot20 aggregDataRoot" style="display:none;">TBD</th>\
						</tr>';
				}
				return tablestring;
			});

			$("#aggregPentaAll").change(function (e) {
                aggregResults = false;
                m.redraw();
                aggregMode = "penta";
                if (this.checked) {
                    $(".aggChkPenta").prop("checked", true).each(function () {
                        $(this).trigger("change");
                    });
                    aggregPentaSelectNum = 5;
                    $(this).prop("checked", true);
                    //~ aggregPentaChkOrd[0] = 1;
                }
                else {
                    $(".aggChkPenta").prop("checked", false).each(function () {
                        $(this).trigger("change");
                    });
                    aggregPentaSelectNum = 0;
                    $(this).prop("checked", false);
                    //~ aggregPentaChkOrd[0] = 0;
                }
                $(this).prop("indeterminate", false);
            }).prop("checked", true);

			$(".aggChkPenta").change(function(e) {
                aggregResults = false;
                m.redraw();
				aggregMode = "penta";
				$(".aggregDataRoot").hide();

				if (this.checked) {
					$(".aggregData" + this.id.substring(6, this.id.length)).show();
					aggregPentaChkOrd[parseInt(this.id.substring(11, this.id.length)) + 1] = 1;
					aggregPentaSelectNum ++;
				}
				else {
					$(".aggregData" + this.id.substring(6, this.id.length)).hide();
					aggregPentaChkOrd[parseInt(this.id.substring(11, this.id.length)) + 1] = 0;
					aggregPentaSelectNum --;
				}

				if (aggregPentaSelectNum >= 5) {
					aggregPentaSelectNum = 5;
					$("#aggregPentaAll").prop("indeterminate", false).prop("checked", true);
					aggregPentaChkOrd[0] = 1;
				}
				else if (aggregPentaSelectNum <= 0) {
					aggregPentaSelectNum = 0;
					$("#aggregPentaAll").prop("indeterminate", false).prop("checked", false);
					aggregPentaChkOrd[0] = 0;
				}
				else {
					$("#aggregPentaAll").prop("checked", false).prop("indeterminate", true);
					aggregPentaChkOrd[0] = 2;
				}
				// console.log(aggregPentaChkOrd);
				// console.log("aggreg penta select number");
				// console.log(aggregPentaSelectNum);
			}).prop("checked", true);

			$("#aggregRootAll").change(function(e) {
				aggregResults = false;
				m.redraw();
				aggregMode = "root";
				if (this.checked) {
					$(".aggChkRoot").prop("checked", true).each(function() {
						$(this).trigger("change");
					});
					aggregRootSelectNum = 20;
					$(this).prop("checked", true);
					//~ aggregRootChkOrd[0] = 1;
				}
				else {
					$(".aggChkRoot").prop("checked", false).each(function() {
						$(this).trigger("change");
					});
					aggregRootSelectNum = 0;
					$(this).prop("checked", false);
					//~ aggregRootChkOrd[0] = 0;
				}
				$(this).prop("indeterminate", false);
			}).prop("checked", true);

			$(".aggChkRoot").change(function(e) {
                aggregResults = false;
                m.redraw();
				aggregMode = "root";
				$(".aggregDataPenta").hide();

				if (this.checked) {
					$(".aggregData" + this.id.substring(6, this.id.length)).show();
					aggregRootChkOrd[parseInt(this.id.substring(10, this.id.length))] = 1;
					aggregRootSelectNum ++;
				}
				else {
					$(".aggregData" + this.id.substring(6, this.id.length)).hide();
					aggregRootChkOrd[parseInt(this.id.substring(10, this.id.length))] = 0;
					aggregRootSelectNum --;
				}

				if (aggregRootSelectNum == 20) {
					$("#aggregRootAll").prop("indeterminate", false).prop("checked", true);
					aggregRootChkOrd[0] = 1;
				}
				else if (aggregRootSelectNum == 0) {
					$("#aggregRootAll").prop("indeterminate", false).prop("checked", false);
					aggregRootChkOrd[0] = 0;
				}
				else {
					$("#aggregRootAll").prop("checked", false).prop("indeterminate", true);
					aggregRootChkOrd[0] = 2;
				}
				// console.log(aggregRootChkOrd);
			}).prop("checked", true);

			$(".aggregDataRoot").hide();

			//~ setupAggregation();

			aggregURL = rappURL + "eventdataaggregapp";

			initTblColor = d3.select("#aggregDataPenta0Head").style("background-color");

			initAggregLoad = false;
		}

		$("#aggregTable .th").css({"width":"300px", "padding":"5px"});

		updateAggregTable();
	}
	else {
		makeAggregQuery("aggreg");
	}
}

//~ let prevTSData = null;
let aggTSChkCount = 0;
let aggTSChkOrder = [];

export function setupAggregTS(data) {
	console.log("setting up TS");

	// console.log("original data");
	console.log(data);

	//set up group toggles
	/* if actor used in aggreg and multiple groups:
		* create all chk and indiv group chk
		* each toggles the appropriate line; through changing data -> redraw
			* will this be affected by m.redraw???
	*/
	if (aggregActorOn && actorLinks.length > 1) {
		 // console.log("multiple TS groups");
		 // console.log(actorLinks);
		 $("#aggregTSGroupSelect").empty().append(function() {
			 let retStr = "";
			 retStr += '<h3 class="panel-title">Group Selection</h3>';
			 retStr += '<label class="aggChkLbl">\
							<input id="aggregTSAll" class="aggChk aggTSChkAll" name="aggTSAll" value="aggTSAll" type="checkbox">\
							All Groups\
						</label>';
			for (let x = 0; x < actorLinks.length; x ++) {
				retStr += '<div class="seperator"></div>\
							<label class="aggChkLbl">\
								<input id="aggregTS' + x + '" class="aggChk aggTSChk" name="aggTS' + x + '" value="aggTS' + x + '" type="checkbox">';
				retStr += actorLinks[x].source.name + "-" + actorLinks[x].target.name;
				retStr += '</label><div class="seperator"></div>';
			}
			return retStr;
		});
		aggTSChkCount = 0;
		aggTSChkOrder = [];
		//add events to checks
		$("#aggregTSAll").change(function(e) {
			// console.log("changing all chk");
			if (this.checked) {
				$(".aggTSChk").prop("checked", true).each(function(){$(this).trigger("change");});
				$(this).prop("indeterminate", false).prop("checked", true);
			}
			else {
				$(".aggTSChk").prop("checked", false).each(function(){$(this).trigger("change");});
				$(this).prop("indeterminate", false).prop("checked", false);
			}
			// console.log("TS check info");
			// console.log(aggTSChkCount);
			// console.log(aggTSChkOrder);

			//~ drawTS(updateTSData(data));
		});

		$(".aggTSChk").change(function(e) {
			// console.log("changing indiv chk");
			if (this.checked) {
				aggTSChkCount ++;
				//update data
				aggTSChkOrder.push(parseInt(this.id.substring(8, this.id.length)));
			}
			else {
				aggTSChkCount --;
				//update data
				aggTSChkOrder.splice(aggTSChkOrder.indexOf(parseInt(this.id.substring(8, this.id.length))), 1);
			}
			// console.log("TS check info");
			// console.log(aggTSChkCount);
			// console.log(aggTSChkOrder);

			if (aggTSChkCount == 0) {
				$("#aggregTSAll").prop("indeterminate", false).prop("checked", false);
				//~ drawTS(updateTSData(data));
			}
			else if (aggTSChkCount == actorLinks.length) {
				$("#aggregTSAll").prop("indeterminate", false).prop("checked", true);
			}
			else {
				$("#aggregTSAll").prop("indeterminate", true).prop("checked", true);
				//~ drawTS(updateTSData(data));
			}
			drawTS(updateTSData(data));
		});

		$("#aggregTSAll").prop("checked", true).trigger("change");
	}
	else {
		$("#aggregTSGroupSelect").empty();
	}
	drawTS(updateTSData(data));




}

function updateTSData(data) {
	//called to get formatted data
	let parseFormat = d3.timeParse("%Y-%m-%d");
	//reformat data
	let formattedData = [];
	//~ if (data) {
		//~ console.log("reformatting data");
		//in format of:
		if (aggregMode == "penta") {
			for (let x = 1; x < aggregPentaChkOrd.length; x ++) {
				let tempVals = [];
				if (!aggregActorOn || actorLinks.length == 1 || aggTSChkCount == actorLinks.length) {
					// console.log("using all data");
					for (let y = 0; y < data["action_data"].length; y ++) {
						tempVals[y] =
							{
								"date": parseFormat(data["action_data"][y]["Date"]),
								"count": data["action_data"][y][x-1]
							};
					}
				}
				else {
					let tempCount = 0;
					// console.log("using only checked data");
					// console.log(aggTSChkOrder);
					for (let y = 0; y < data["action_data"].length; y ++) {
						for (let z = 0; z < aggTSChkOrder.length; z ++) {
							//~ console.log("in checking loop");
							//~ console.log(z);
							//~ console.log(aggTSChkOrder[z]);
							//~ console.log(actorLinks[aggTSChkOrder[z]]);
							//~ console.log(data["action_data"][y]);
							if (actorLinks[aggTSChkOrder[z]].source.name == data["action_data"][y]["Source"] && actorLinks[aggTSChkOrder[z]].target.name == data["action_data"][y]["Target"]) {
								tempVals[tempCount] =
									{
										"date": parseFormat(data["action_data"][y]["Date"]),
										"count": data["action_data"][y][x-1]
									};
								tempCount ++;
							}
						}
					}
				}
				formattedData[x-1] =
					{
						id: "Penta " + (x-1),
						values: tempVals
					};
			}
		}
		else {	//is root code
			for (let x = 1; x < aggregRootChkOrd.length; x ++) {
				let tempVals = [];
				if (!aggregActorOn || actorLinks.length == 1 || aggTSChkCount == actorLinks.length) {
					// console.log("using all data");
					for (let y = 0; y < data["action_data"].length; y ++) {
						tempVals[y] =
							{
								"date": parseFormat(data["action_data"][y]["Date"]),
								"count": data["action_data"][y][x]
							};
					}
				}
				else {
					let tempCount = 0;
					// console.log("using only checked data");
					// console.log(aggTSChkOrder);
					for (let y = 0; y < data["action_data"].length; y ++) {
						for (let z = 0; z < aggTSChkOrder.length; z ++) {
							if (actorLinks[aggTSChkOrder[z]].source.name == data["action_data"][y]["Source"] && actorLinks[aggTSChkOrder[z]].target.name == data["action_data"][y]["Target"]) {
								tempVals[tempCount] =
									{
										"date": parseFormat(data["action_data"][y]["Date"]),
										"count": data["action_data"][y][x]
									};
								tempCount ++;
							}
						}
					}
				}
				formattedData[x-1] =
					{
						id: "Root " + x,
						values: tempVals
					};
			}
		}
		//~ prevTSData = formattedData;
	//~ }
	//~ else if (prevTSData) {
		//~ console.log("using old data");
		//~ formattedData = prevTSData;
	//~ }
	//~ else {
		//~ return;
	//~ }
	// console.log("ret form data");
	// console.log(formattedData);
	return formattedData;
}

function drawTS(formattedData) {
	//called with updated data per group select, or by default when only one actor group present
	//~ $("#canvasAggregTS").empty().append('<svg id="aggregTS_SVG" style="border: 1px solid black"></svg>');
	$("#aggregTS_SVG").empty();
	let svgTS = d3.select("#aggregTS_SVG");

	let margin = {top: 20, right: 80, bottom: 30, left: 50};
	//~ svgTS.attr("width", document.getElementById("canvas").offsetWidth - document.getElementById("rightpanel").offsetWidth - margin.left - margin.right - 50).attr("height", document.getElementById("canvas").offsetHeight - margin.top - margin.bottom - 10);		//resize later	1000, 450
    svgTS.attr("width", document.getElementById("canvasAggregTS").clientWidth)
        .attr("height", document.getElementById("canvas").clientHeight - margin.top - margin.bottom);
	//~ svgTS.attr("width", 600).attr("height", 450);
	let widthTS = svgTS.attr("width") - margin.left - margin.right;
    let heightTS = svgTS.attr("height") - margin.top - margin.bottom;
	let g = svgTS.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	// console.log("post svg setup");

	let x = d3.scaleTime().range([0, widthTS]);
    let y = d3.scaleLinear().range([heightTS, 0]);
    let z = d3.scaleOrdinal(d3.schemeCategory20);

	var line = d3.line()	//update this in accordance to data format
		.curve(d3.curveBasis)
		.x(function(d) {
			//~ console.log("x"); console.log(d); console.log(x(d.date));
			return x(d.date); })
		.y(function(d) {
			//~ console.log("y"); console.log(d); console.log(y(d.date));
			return y(d.count); });

	x.domain([
		d3.min(formattedData, function(c) { return d3.min(c.values, function(d) { return d.date; }); }),
		d3.max(formattedData, function(c) { return d3.max(c.values, function(d) { return d.date; }); })
	]);

	y.domain([
	d3.min(formattedData, function(c) { return d3.min(c.values, function(d) { return d.count; }); }),
	d3.max(formattedData, function(c) { return d3.max(c.values, function(d) { return d.count; }); })
	]);

	z.domain(formattedData.map(function(c) { return c.id; }));

	g.append("g")
	  .attr("class", "axis axis--x")
	  .attr("transform", "translate(0," + heightTS + ")")
	  .call(d3.axisBottom(x));

	g.append("g")
	  .attr("class", "axis axis--y")
	  .call(d3.axisLeft(y))
	.append("text")
	  .attr("transform", "rotate(-90)")
	  .attr("y", 6)
	  .attr("dy", "0.71em")
	  .attr("fill", "#000")
	  .text("Count");

	var aggregTSLine = g.selectAll(".aggregTSLine")
	.data(formattedData)
	.enter().append("g")
	  .attr("class", "aggregTSLine").attr("id", function(d) { return d.id.split(" ")[0] + d.id.split(" ")[1] + "Line"; });

	aggregTSLine.append("path")
	  .attr("class", "line")
	  //~ .attr("id", function(d) { return d.id;})
	  .attr("d", function(d) {
		  return line(d.values); })
	  .style("stroke", function(d) { return z(d.id); }).style("fill", "none")
	  .on("mouseover", function(d) {
		  d3.select(this).attr("stroke-width", 3);
		  tooltipSVG.html(d.id).style("display", "block");
          tooltipSVG.transition().duration(50).style("opacity", 1);
	  })
	  .on("mousemove", function (d) {
			tooltipSVG.style("display", "block")
				.style("left", d3.event.pageX + "px")
				.style("top", d3.event.pageY - 70 + "px");
		})
	  .on("mouseout", function(d) {
		  d3.select(this).attr("stroke-width", 1);
		  tooltipSVG.transition().duration(50).style("opacity", 0).style("display", "none");
	  });

	if (aggregMode == "penta") {
		for (let a = 1; a < aggregPentaChkOrd.length; a ++) {
			let curLine = d3.select("#Penta" + (a - 1) + "Line");
			if (!aggregPentaChkOrd[a]) {
				curLine.style("opacity", 0);
			}
			else {
				curLine.style("opacity", 1);
				d3.select("#aggregDataPenta" + (a - 1) + "Head").style("background-color", curLine.select(".line").style("stroke"));
			}
		}
	}
	else {
		for (let a = 1; a < aggregRootChkOrd.length; a ++) {
			let curLine = d3.select("#Root" + a + "Line");
			if (!aggregRootChkOrd[a]) {
				curLine.style("opacity", 0);
			}
			else {
				curLine.style("opacity", 1);
				d3.select("#aggregDataRoot" + a + "Head").style("background-color", curLine.select(".line").style("stroke"));
			}
		}
	}
}

// eventually redraws the timeseries too
function updateTable(json) {
	// console.log("aggregated json");
	// console.log(json);
	laddaUpdate.stop();

	aggregResults = true;
	aggregResultsDate = aggregDateOn !== 0;
	m.redraw();

	document.getElementById('recordCount').innerHTML = json["action_data"].length + " records";

	for (let row = 1; row <= aggregDataNumber; row++) {
		if (row > json["action_data"].length) {
			$("#aggregTableR" + row + " th").each(function() { $(this).html(""); });
			continue;
		}
		// console.log(row + " is updating")
		if (aggregDateOn) {
			$("#aggregDataDateR" + row).html(json["action_data"][row - 1]["Date"]);
		}
		// console.log("date up");
		if (aggregActorOn) {
			$("#aggregDataSrcR" + row).html(json["action_data"][row - 1]["Source"]);
			$("#aggregDataTgt" + row).html(json["action_data"][row - 1]["Target"]);
		}
		// console.log("actor up");
		if (aggregMode == "penta") {
			for (let code = 0; code < 5; code++) {
				$("#aggregDataPenta" + code + "R" + row).html(json["action_data"][row - 1][code]);
			}
			// console.log("penta up");
		}
		else {
			for (let code = 1; code <= 20; code ++) {
				$("#aggregDataRoot" + code + "R" + row).html(json["action_data"][row - 1][code]);
			}
			// console.log("root up");
		}
	}

	if (aggregMode == "penta") {
		//~ if (aggregPentaChkOrd[0] == 1) {
			//~ $("#aggregPentaAll").prop("checked", true).trigger("change");
		//~ }
		//~ else {
		// console.log("in update table callback penta");
		// console.log(aggregPentaChkOrd);
		// console.log(aggregPentaSelectNum);
			$("#aggregPentaAll").prop("indeterminate", false);
			for (let x = 0; x < aggregPentaChkOrd.length - 1; x ++) {
				if (aggregPentaChkOrd[x + 1] == 1) {
					//~ $("#aggregPenta" + x).prop("checked", false).trigger("change");
					$("#aggregPenta" + x).prop("checked", true);
				}
				else {
					//~ $("#aggregPenta" + x).prop("checked", true).trigger("change");
					$("#aggregPenta" + x).prop("checked", false);
				}
			}
			if (aggregPentaChkOrd[0] == 0)
				$("#aggregPentaAll").prop("checked", false);
			else if (aggregPentaChkOrd[0] == 2)
				$("#aggregPentaAll").prop("indeterminate", true);
			// console.log("post force check");
			// console.log(aggregPentaChkOrd);
			// console.log(aggregPentaSelectNum);
		//~ }
	}
	else {
		//~ if (aggregPentaChkOrd[0] == 1) {
			//~ $("#aggregPentaAll").prop("checked", true).trigger("change");
		//~ }
		//~ else {
		// console.log("in update table callback root");
		// console.log(aggregRootChkOrd);
		// console.log(aggregRootSelectNum);
			$("#aggregRootAll").prop("indeterminate", false);
			for (let x = 1; x < aggregRootChkOrd.length; x ++) {
				if (aggregRootChkOrd[x] == 1) {
					//~ $("#aggregPenta" + x).prop("checked", false).trigger("change");
					$("#aggregRoot" + x).prop("checked", true);
				}
				else {
					//~ $("#aggregPenta" + x).prop("checked", true).trigger("change");
					$("#aggregRoot" + x).prop("checked", false);
				}
			}
			if (aggregRootChkOrd[0] == 0)
				$("#aggregRootAll").prop("checked", false);
			else if (aggregRootChkOrd[0] == 2)
				$("#aggregRootAll").prop("indeterminate", true);
			// console.log("post force check");
			// console.log(aggregRootChkOrd);
			// console.log(aggregRootSelectNum);
		//~ }
	}

	if (aggregDateOn) {
		showCanvas("Time Series");
		m.redraw();
		setupAggregTS(json);
	}
}

//~ let aggregDates;
function updateDates(json) {
	// console.log(json);
	// console.log(json["aggreg_dates"]);

	laddaUpdate.stop();
	//~ aggregDates = json["aggreg_dates"];

	var curActor = 0;
	var curDate = 0;

	for (let row = 1; row <= aggregDataNumber; row ++) {
		if (curDate < json["aggreg_dates"].length) {
			$("#aggregDataDateR" + (row)).html(json["aggreg_dates"][curDate]);
		}
		else {
			$("#aggregDataDateR" + (row)).html("");
			$("#aggregTableR" + (row)).hide();
		}

		if (aggregActorOn) {
			//~ if (actorLinks.length == 0) {
				//~ curDate ++;
				//~ console.log("table continue?");
				//~ continue;
			//~ }

			if (curActor == actorLinks.length) {
				curActor = 0;
			}

			$("#aggregDataSrcR" + row).html(actorLinks[curActor].source.name);
			$("#aggregDataTgtR" + row).html(actorLinks[curActor].target.name);
			curActor ++;
			if (curActor == actorLinks.length) {
				curDate ++;
			}
		}
		else {
			curDate ++;
		}

		$(".aggregDataPenta:not(.aggregTblHdr)").html("TBD");
		$(".aggregDataRoot:not(.aggregTblHdr)").html("TBD");
	}

	if (aggregMode == "penta") {
		//~ if (aggregPentaChkOrd[0] == 1) {
			//~ $("#aggregPentaAll").prop("checked", true).trigger("change");
		//~ }
		//~ else {
		// console.log("in update table callback penta");
		// console.log(aggregPentaChkOrd);
		// console.log(aggregPentaSelectNum);
			$("#aggregPentaAll").prop("indeterminate", false);
			for (let x = 0; x < aggregPentaChkOrd.length - 1; x ++) {
				if (aggregPentaChkOrd[x + 1] == 1) {
					//~ $("#aggregPenta" + x).prop("checked", false).trigger("change");
					$("#aggregPenta" + x).prop("checked", true);
				}
				else {
					//~ $("#aggregPenta" + x).prop("checked", true).trigger("change");
					$("#aggregPenta" + x).prop("checked", false);
				}
			}
			if (aggregPentaChkOrd[0] == 0)
				$("#aggregPentaAll").prop("checked", false);
			else if (aggregPentaChkOrd[0] == 2)
				$("#aggregPentaAll").prop("indeterminate", true);
			// console.log("post force check");
			// console.log(aggregPentaChkOrd);
			// console.log(aggregPentaSelectNum);
		//~ }
	}
	else {
		//~ if (aggregPentaChkOrd[0] == 1) {
			//~ $("#aggregPentaAll").prop("checked", true).trigger("change");
		//~ }
		//~ else {
		// console.log("in update table callback root");
		// console.log(aggregRootChkOrd);
		// console.log(aggregRootSelectNum);
			$("#aggregRootAll").prop("indeterminate", false);
			for (let x = 1; x < aggregRootChkOrd.length; x ++) {
				if (aggregRootChkOrd[x] == 1) {
					//~ $("#aggregPenta" + x).prop("checked", false).trigger("change");
					$("#aggregRoot" + x).prop("checked", true);
				}
				else {
					//~ $("#aggregPenta" + x).prop("checked", true).trigger("change");
					$("#aggregRoot" + x).prop("checked", false);
				}
			}
			if (aggregRootChkOrd[0] == 0)
				$("#aggregRootAll").prop("checked", false);
			else if (aggregRootChkOrd[0] == 2)
				$("#aggregRootAll").prop("indeterminate", true);
			// console.log("post force check");
			// console.log(aggregRootChkOrd);
			// console.log(aggregRootSelectNum);
		//~ }
	}
}

export function makeAggregQuery(action, save = null) {
    aggregResults = false;
    aggregResultsDate = aggregDateOn !== 0;
    m.redraw();

	if (actorLinks.length == 0 && aggregActorOn) {
		alert("There are no actor groups linked");
		return;
	}
	let taction = action;
	if (action == "download")
		action = "aggreg";
	let aggregActorFormat = {};
	for (let x = 0; x < actorLinks.length; x ++) {
		//~ aggregActorFormat[x] = {"sourceName" : actorLinks[x].source.name, "sources" : JSON.stringify(actorLinks[x].source.group),
								//~ "targetName" : actorLinks[x].target.name, "targets" : JSON.stringify(actorLinks[x].target.group)
								//~ };
		//~ aggregActorFormat["group" + x] = {"sourceName" : actorLinks[x].source.name, "sources" : Array.from(actorLinks[x].source.group),
								//~ "targetName" : actorLinks[x].target.name, "targets" : Array.from(actorLinks[x].target.group)
								//~ };
		aggregActorFormat["group" + x] = {
            "sourceName": actorLinks[x].source.name,
            "sources": '"' + Array.from(actorLinks[x].source.group).join('","') + '"',
            "targetName": actorLinks[x].target.name,
            "targets": '"' + Array.from(actorLinks[x].target.group).join('","') + '"'
        };
	}
	// console.log("aggreg actor Format");
	// console.log(aggregActorFormat);
	// console.log("JSON actor format");
	// console.log(JSON.stringify(aggregActorFormat));

	function formatAggregDate(date) {
		let ret = date.getUTCFullYear() + "";
		//~ console.log("length of month = " + date.getUTCMonth().toString().length);
		if (date.getUTCMonth().toString().length == 1)
			ret += "0";
		ret += (date.getUTCMonth() + 1) + "";
		if (date.getUTCDate().toString().length == 1)
			ret += "0";
		ret += date.getUTCDate();
		return ret;
	}

	let aggregQuery = {
		"date": {
			"min": formatAggregDate(dateminUser),
			"max": formatAggregDate(datemaxUser),
			"dateType": aggregDateOn
		},
		"actors": {
			//~ "links": JSON.stringify(aggregActorFormat),
			"links": aggregActorFormat,
			"actorType": aggregActorOn
		},
		"aggregMode": aggregMode,
		"toggles": (aggregMode == "penta" ? aggregPentaChkOrd : aggregRootChkOrd),
		"action": action,		//preview = get dates, aggreg = perform aggregation, download = download aggreg
		"numberPreview": aggregDataNumber,
		"dataset": dataset,
		"datasource": datasource
	};

	console.log(JSON.stringify(aggregQuery));
	laddaUpdate.start();

	if (action === 'preview') {
        // console.log("previewing dates");
        makeCorsRequest(aggregURL, aggregQuery, updateDates);
	}
	else {
        makeCorsRequest(aggregURL, aggregQuery, updateTable);
        if (taction == "download") {
            aggregQuery["action"] = "download";

            console.log("Aggregation Query: ");
            console.log(aggregQuery);
            makeCorsRequest(aggregURL, aggregQuery, save);
        }
	}
}

export function updateAggregTable() {
	// console.log("updating table");

	$(".aggregTableRow").show();

	d3.selectAll(".aggregTblHdr").style("background-color", initTblColor);

	if (aggregDateOn != 0) {
		makeAggregQuery("preview");
	}
	else {	//no date
		var curActor = 0;
		for (let row = 1; row <= aggregDataNumber; row ++) {
			if (aggregActorOn) {
				if (actorLinks.length == 0) {
					// console.log("table continue?");
					continue;
				}

				if (curActor == actorLinks.length) {
					// console.log("actor limit reached");
					if (aggregDateOn == 0) {
						$("#aggregTableR" + row).hide();
						// console.log("hide");
						continue;
					}
					else {
						curActor = 0;
					}
				}

				$("#aggregDataSrcR" + row).html(actorLinks[curActor].source.name);
				$("#aggregDataTgtR" + row).html(actorLinks[curActor].target.name);
				$(".aggregDataPenta:not(.aggregTblHdr)").html("TBD");
				$(".aggregDataRoot:not(.aggregTblHdr)").html("TBD");
				curActor++;
			}
			else {	//no date or actor
				if (row == 1) {
					$(".aggregDataDate:not(.aggregTblHdr)").html("TBD");
					$(".aggregDataSrc:not(.aggregTblHdr)").html("TBD");
					$(".aggregDataTgt:not(.aggregTblHdr)").html("TBD");
					$(".aggregDataPenta:not(.aggregTblHdr)").html("TBD");
					$(".aggregDataRoot:not(.aggregTblHdr)").html("TBD");
				}
				else
					$("#aggregTableR" + row).hide();
			}
		}
	}
}
