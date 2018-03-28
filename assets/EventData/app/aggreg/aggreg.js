import {opMode, rappURL, dataset, datasource, makeCorsRequest, laddaAggregate} from "../app";
import {dateminUser, datemaxUser} from "../subsets/Date";
import {actorLinks} from "../subsets/Actor";
import {varColor, selVarColor} from '../../../common/app/common';

let aggregMode = "penta";
export let aggregDateOn = 0;		//0 = off, 1 = week, 2 = month, 3 = quarter, 4 = year
export let aggregActorOn = true;
var aggregDataNumber = 6;

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
// export let dateMeasure = 'None';
// export let setDateMeasure = (measure) => dateMeasure = measure;

export let setAggregMode = (mode) => aggregMode = mode;

// Map measure string to numeric value used in existing aggregation code
export let setDateMeasure = (measure) => {
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

export let tableHeight = '20%';

var aggregURL;

export function updateToAggreg() {
	if (opMode === "subset") {

		if (initAggregLoad) {
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

			$("#aggregPentaAll").change(function(e) {
			aggregMode = "penta";
			if (this.checked) {
				$(".aggChkPenta").prop("checked", true).each(function() {
					$(this).trigger("change");
				});
				aggregPentaSelectNum = 5;
				$(this).prop("checked", true);
				//~ aggregPentaChkOrd[0] = 1;
			}
			else {
				$(".aggChkPenta").prop("checked", false).each(function() {
					$(this).trigger("change");
				});
				aggregPentaSelectNum = 0;
				$(this).prop("checked", false);
				//~ aggregPentaChkOrd[0] = 0;
				}
				$(this).prop("indeterminate", false);
			}).prop("checked", true);

			$(".aggChkPenta").change(function(e) {
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
				console.log(aggregPentaChkOrd);
				console.log("aggreg penta select number");
				console.log(aggregPentaSelectNum);
			}).prop("checked", true);

			$("#aggregRootAll").change(function(e) {
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
				console.log(aggregRootChkOrd);
			}).prop("checked", true);

			$(".aggregDataRoot").hide();

			//~ setupAggregation();

			aggregURL = rappURL + "eventdataaggregapp";

			initAggregLoad = false;
		}

		$("#aggregTable .th").css({"width":"300px", "padding":"5px"});

		/*
		 * jsondata : contains all data - see console output for format
		 * updateDate() : this will refresh the range and data
		 * updateActor() : this will refresh the data
		 * add a none option to actor
		 *

		// $(".aggregDateChk").change(function(e) {
		// 	//~ console.log(this.id);
		// 	if (!this.checked)
		// 		return;
		// 	console.log("checked proceed");
		// 	if (this.id.substring(10, this.id.length) == "None") {
		// 		$(".aggregDataDate").hide();
		// 		aggregDateOn = 0;
		// 	}
		// 	else {
		// 		$(".aggregDataDate").show();
		// 		//~ console.log(datemin);
		// 		//~ var month = datemin.getMonth();
		// 		//~ var day = datemin.getDate();
		// 		//~ var year = datemin.getFullYear();
		// 		//~ $("#aggregDataDateR1").html(datemin.toLocaleDateString());
		// 		//~ var datenew = new Date(datemin.getDate());
		// 		//~ var datenew = new Date(datemin.toLocaleDateString());
		// 		//~ console.log(datenew.toLocaleDateString());
		// 		if (this.id.substring(10, this.id.length) == "Week") {
		// 			aggregDateOn = 1;
		// 			//~ console.log("updating by week");
		// 			//~ for (var x = 2; x < 4; x ++) {
		// 				//~ datenew = new Date(datenew.setDate(datenew.getDate() + 7));
		// 				//~ console.log(datenew.toLocaleDateString());
		// 				//~ $("#aggregDataDateR" + x).html(datenew.toLocaleDateString());
		// 			//~ }
		// 		}
		// 		else if (this.id.substring(10, this.id.length) == "Month") {
		// 			aggregDateOn = 2;
		// 			//~ for (var x = 2; x < 4; x ++) {
		// 				//~ datenew.setMonth(datenew.getMonth() + 1);
		// 				//~ $("#aggregDataDateR" + x).html(datenew.toLocaleDateString());
		// 			//~ }
		// 		}
		// 		else if (this.id.substring(10, this.id.length) == "Quarter") {
		// 			aggregDateOn = 3;
		// 			//~ for (var x = 2; x < 4; x ++) {
		// 				//~ datenew.setMonth(datenew.getMonth() + 4);
		// 				//~ $("#aggregDataDateR" + x).html(datenew.toLocaleDateString());
		// 			//~ }
		// 		}
		// 		else if (this.id.substring(10, this.id.length) == "Year") {
		// 			aggregDateOn = 4;
		// 			//~ for (var x = 2; x < 4; x ++) {
		// 				//~ datenew.setMonth(datenew.getMonth() + 12);
		// 				//~ $("#aggregDataDateR" + x).html(datenew.toLocaleDateString());
		// 			//~ }
		// 		}
		// 	}
		// 	updateAggregTable();
		//
		// });*/

		updateAggregTable();
	}
	else {
		makeAggregQuery("aggreg");
	}
}

function updateTable(json) {
	console.log("aggregated json");
	console.log(json);
	laddaAggregate.stop();
	
	for (let row = 1; row <= aggregDataNumber; row++) {
		if (row > json["action_data"].length) {
			$("#aggregTableR" + row + " th").each(function() { $(this).html(""); });
			continue;
		}
		console.log(row + " is updating")
		if (aggregDateOn) {
			$("#aggregDataDateR" + row).html(json["action_data"][row - 1]["Date"]);
		}
		console.log("date up");
		if (aggregActorOn) {
			$("#aggregDataSrcR" + row).html(json["action_data"][row - 1]["Source"]);
			$("#aggregDataTgt" + row).html(json["action_data"][row - 1]["Target"]);
		}
		console.log("actor up");
		if (aggregMode == "penta") {
			for (let code = 0; code < 5; code++) {
				$("#aggregDataPenta" + code + "R" + row).html(json["action_data"][row - 1][code]);
			}
			console.log("penta up");
		}
		else {
			for (let code = 1; code <= 20; code ++) {
				$("#aggregDataRoot" + code + "R" + row).html(json["action_data"][row - 1][code]);
			}
			console.log("root up");
		}
	}

	if (aggregMode == "penta") {
		//~ if (aggregPentaChkOrd[0] == 1) {
			//~ $("#aggregPentaAll").prop("checked", true).trigger("change");
		//~ }
		//~ else {
		console.log("in update table callback penta");
		console.log(aggregPentaChkOrd);
		console.log(aggregPentaSelectNum);
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
			console.log("post force check");
			console.log(aggregPentaChkOrd);
			console.log(aggregPentaSelectNum);
		//~ }
	}
	else {
		//~ if (aggregPentaChkOrd[0] == 1) {
			//~ $("#aggregPentaAll").prop("checked", true).trigger("change");
		//~ }
		//~ else {
		console.log("in update table callback root");
		console.log(aggregRootChkOrd);
		console.log(aggregRootSelectNum);
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
			console.log("post force check");
			console.log(aggregRootChkOrd);
			console.log(aggregRootSelectNum);
		//~ }
	}
}

//~ let aggregDates;
function updateDates(json) {
	console.log(json);
	console.log(json["aggreg_dates"]);

	laddaAggregate.stop();
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
		console.log("in update table callback penta");
		console.log(aggregPentaChkOrd);
		console.log(aggregPentaSelectNum);
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
			console.log("post force check");
			console.log(aggregPentaChkOrd);
			console.log(aggregPentaSelectNum);
		//~ }
	}
	else {
		//~ if (aggregPentaChkOrd[0] == 1) {
			//~ $("#aggregPentaAll").prop("checked", true).trigger("change");
		//~ }
		//~ else {
		console.log("in update table callback root");
		console.log(aggregRootChkOrd);
		console.log(aggregRootSelectNum);
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
			console.log("post force check");
			console.log(aggregRootChkOrd);
			console.log(aggregRootSelectNum);
		//~ }
	}
}

export function makeAggregQuery(action, save = null) {
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
		aggregActorFormat["group" + x] = {"sourceName" : actorLinks[x].source.name, "sources" : '"' + Array.from(actorLinks[x].source.group).join('","') + '"',
								"targetName" : actorLinks[x].target.name, "targets" : '"' + Array.from(actorLinks[x].target.group).join('","') + '"'
								};
	}
	console.log("aggreg actor Format");
	console.log(aggregActorFormat);
	console.log("JSON actor format");
	console.log(JSON.stringify(aggregActorFormat));

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
	laddaAggregate.start();

	if (action != "preview") {
		makeCorsRequest(aggregURL, aggregQuery, updateTable);
		if (taction == "download") {
			console.log("making aggreg download req");
			aggregQuery["action"] = "download";
			console.log(aggregQuery);
			makeCorsRequest(aggregURL, aggregQuery, save);
		}
	}
	else {
		console.log("previewing dates");
		makeCorsRequest(aggregURL, aggregQuery, updateDates);
	}
}

export function setupAggregation() {
    $("#aggregDateToggle").click(function() {
        d3.select("#aggregActorToggle").style("background-color", varColor);
        $("#subsetDate").siblings().hide();
        if ($("#subsetDate").is(":visible")) {
            d3.select("#aggregDateToggle").style("background-color", varColor);
            $("#subsetDate").hide();
        }
        else {
            d3.select("#aggregDateToggle").style("background-color", selVarColor);
            $("#subsetDate").show();
        }
    });

    $("#aggregActorToggle").click(function() {
        d3.select("#aggregDateToggle").style("background-color", varColor);
        $("#subsetActor").siblings().hide();
        if ($("#subsetActor").is(":visible")) {
            d3.select("#aggregActorToggle").style("background-color", varColor);
            $("#subsetActor").hide();
        }
        else {
            d3.select("#aggregActorToggle").style("background-color", selVarColor);
            $("#subsetActor").show();
        }
    });

    //~ $("#aggregPentaToggle").click(function() {
        //~ d3.select("#aggregRootToggle").style("background-color", varColor);
        //~ $("#aggregEventByPenta").siblings().hide();
        //~ $(".aggregDataRoot").hide();
        //~ for (var x = 0; x <= 4; x ++) {
            //~ if ($("#aggregPenta" + x).prop("checked")) {
                //~ $(".aggregDataPenta" + x).show();
            //~ }
        //~ }

        //~ if ($("#aggregEventByPenta").is(":visible")) {
            //~ d3.select("#aggregPentaToggle").style("background-color", varColor);
            //~ $("#aggregEventByPenta").hide();
        //~ }
        //~ else {
            //~ d3.select("#aggregPentaToggle").style("background-color", selVarColor);
            //~ $("#aggregEventByPenta").show();
            //~ aggregMode = "penta";
            //~ updateAggregTable();
        //~ }
    //~ });
    $("#aggregPentaToggle").click(function() {
		console.log("penta toggled");
		console.log(aggregPentaChkOrd);
        d3.select("#aggregRootToggle").style("background-color", varColor);
        //~ $("#aggregEventByPenta").siblings().hide();
        $(".aggregDataRoot").hide();
        //~ for (var x = 0; x <= 4; x ++) {
            //~ if ($("#aggregPenta" + x).prop("checked")) {
                //~ $(".aggregDataPenta" + x).show();
            //~ }
        //~ }
        for (let x = 1; x < aggregPentaChkOrd.length; x ++) {
			if (aggregPentaChkOrd[x] == 1) {
				$("#aggregPenta" + x).prop("checked", true).trigger("change");
			}
		}

        //~ if ($("#aggregEventByPenta").is(":visible")) {
            //~ d3.select("#aggregPentaToggle").style("background-color", varColor);
            //~ $("#aggregEventByPenta").hide();
        //~ }
        //~ else {
            //~ d3.select("#aggregPentaToggle").style("background-color", selVarColor);
            //~ $("#aggregEventByPenta").show();
            //~ aggregMode = "penta";
            //~ updateAggregTable();
        //~ }
    });

    $("#aggregRootToggle").click(function() {
        d3.select("#aggregPentaToggle").style("background-color", varColor);
        $("#aggregEventByRoot").siblings().hide();
        $(".aggregDataPenta").hide();
        for (var x = 1; x <= 20; x ++) {
            if ($("#aggregRoot" + x).prop("checked")) {
                $(".aggregDataRoot" + x).show();
            }
        }

        if ($("#aggregEventByRoot").is(":visible")) {
            d3.select("#aggregRootToggle").style("background-color", varColor);
            $("#aggregEventByRoot").hide();
            aggregMode = "penta";
            d3.select("#aggregPentaToggle").style("background-color", selVarColor);
            updateAggregTable();
        }
        else {
            d3.select("#aggregRootToggle").style("background-color", selVarColor);
            $("#aggregEventByRoot").show();
            aggregMode = "root";
            updateAggregTable();
        }
    });
}

//~ $(".allCheck").click(function (event)

export function updateAggregTable() {
	console.log("updating table");
	//~ console.log(dateData);
	//~ console.log(dateData[0]);
	//~ console.log(dateData[0]._id);
	//~ console.log(datemin);
	//~ aggregDateData = dateData.sort(dateSort);
	//~ aggregDateMin = d3.min(aggregDateData, function(d) {return d.Freq;});
	//~ console.log("min date");
	//~ console.log(aggregDateMin);
	//~ console.log(aggregDateData);

	$(".aggregTableRow").show();

	//~ var curActor = 0;
	//~ var dateNext = false;
	//~ var dateCur = new Date(dateminUser.toLocaleDateString());
	//~ for (var row = 1; row <= aggregDataNumber; row++) {
		//~ if (aggregDateOn == 1) {
			//~ if (dateNext) {
				//~ dateCur = new Date(dateCur.setDate(dateCur.getDate() + 7));
				//~ dateNext = false;
			//~ }
			//~ $("#aggregDataDateR" + row).html(dateCur.toLocaleDateString());
		//~ }
		//~ else if (aggregDateOn == 2) {
			//~ if (dateNext) {
				//~ dateCur.setMonth(dateCur.getMonth() + 1);
				//~ dateNext = false;
			//~ }
			//~ $("#aggregDataDateR" + row).html(dateCur.toLocaleDateString());
		//~ }
		//~ else if (aggregDateOn == 3) {
			//~ if (dateNext) {
				//~ dateCur.setMonth(dateCur.getMonth() + 3);
				//~ dateNext = false;
			//~ }
			//~ $("#aggregDataDateR" + row).html(dateCur.toLocaleDateString());
		//~ }
		//~ else if (aggregDateOn == 4) {
			//~ if (dateNext) {
				//~ dateCur.setMonth(dateCur.getMonth() + 12);
				//~ dateNext = false;
			//~ }
			//~ $("#aggregDataDateR" + row).html(dateCur.toLocaleDateString());
		//~ }
		
		//~ if (aggregActorOn) {
			//~ if (actorLinks.length == 0) {
				//~ dateNext = true;
				//~ continue;
			//~ }

			//~ if (curActor == actorLinks.length) {
				//~ console.log("actor limit reached");
				//~ if (aggregDateOn == 0) {
					//~ $("#aggregTableR" + row).hide();
					//~ console.log("hide");
					//~ continue;
				//~ }
				//~ else {
					//~ curActor = 0;
				//~ }
			//~ }
			
			//~ $("#aggregDataSrcR" + row).html(actorLinks[curActor].source.name);
			//~ $("#aggregDataTgtR" + row).html(actorLinks[curActor].target.name);
			//~ curActor++;
			//~ if(curActor == actorLinks.length) {
				//~ dateNext = true;
				//curActor = 0;
			//~ }
		//~ }
		//~ else {
			//~ dateNext = true;
		//~ }
	//~ }

	if (aggregDateOn != 0) {
		makeAggregQuery("preview");
	}
	else {	//no date
		var curActor = 0;
		for (let row = 1; row <= aggregDataNumber; row ++) {
			if (aggregActorOn) {
				if (actorLinks.length == 0) {
					console.log("table continue?");
					continue;
				}

				if (curActor == actorLinks.length) {
					console.log("actor limit reached");
					if (aggregDateOn == 0) {
						$("#aggregTableR" + row).hide();
						console.log("hide");
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
