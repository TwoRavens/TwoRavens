import {opMode, setOpMode, rappURL, varColor, selVarColor, rightpanelMargin, dataset, datasource} from "../app";
import {updateDate, dateminUser, datemaxUser} from "../subsets/Date";
import {updateActor, actorLinks, resizeActorSVG} from "../subsets/Actor";

var aggregMode = "penta";
var aggregDateOn = 0;		//0 = off, 1 = week, 2 = month, 3 = quarter, 4 = year
var aggregActorOn = true;
var aggregDataNumber = 6;

var aggregPentaSelectNum = 5;
var aggregRootSelectNum = 20;

export let tableHeight = '20%';

export function updateToAggreg() {
	if (opMode === "subset") {

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

		$("#aggregTable .th").css({"width":"300px", "padding":"5px"});

		$("#aggregActorSelect").change(function(e) {
			if (!this.checked) {
				$(".aggregDataActor").hide();
				aggregActorOn = false;
			}
			else {
				$(".aggregDataActor").show();
				aggregActorOn = true;
			}
			updateAggregTable();
		}).prop("checked", true);

		/*
		 * jsondata : contains all data - see console output for format
		 * updateDate() : this will refresh the range and data
		 * updateActor() : this will refresh the data
		 * add a none option to actor
		 */

		$(".dateAggregIntBtn").click(function() {
			//~ console.log("#aggregDate" + this.id.substring(4, this.id.length));
			$("#aggregDate" + this.id.substring(4, this.id.length)).prop("checked", true).trigger("change").siblings(".aggregDateChk").prop("checked", false);
		});

		$(".aggregDateChk").prop("checked", false);

		$(".aggregDateChk").change(function(e) {
			//~ console.log(this.id);
			if (!this.checked)
				return;
			console.log("checked proceed");
			if (this.id.substring(10, this.id.length) == "None") {
				$(".aggregDataDate").hide();
				aggregDateOn = 0;
			}
			else {
				$(".aggregDataDate").show();
				//~ console.log(datemin);
				//~ var month = datemin.getMonth();
				//~ var day = datemin.getDate();
				//~ var year = datemin.getFullYear();
				//~ $("#aggregDataDateR1").html(datemin.toLocaleDateString());
				//~ var datenew = new Date(datemin.getDate());
				//~ var datenew = new Date(datemin.toLocaleDateString());
				//~ console.log(datenew.toLocaleDateString());
				if (this.id.substring(10, this.id.length) == "Week") {
					aggregDateOn = 1;
					//~ console.log("updating by week");
					//~ for (var x = 2; x < 4; x ++) {
						//~ datenew = new Date(datenew.setDate(datenew.getDate() + 7));
						//~ console.log(datenew.toLocaleDateString());
						//~ $("#aggregDataDateR" + x).html(datenew.toLocaleDateString());
					//~ }
				}
				else if (this.id.substring(10, this.id.length) == "Month") {
					aggregDateOn = 2;
					//~ for (var x = 2; x < 4; x ++) {
						//~ datenew.setMonth(datenew.getMonth() + 1);
						//~ $("#aggregDataDateR" + x).html(datenew.toLocaleDateString());
					//~ }
				}
				else if (this.id.substring(10, this.id.length) == "Quarter") {
					aggregDateOn = 3;
					//~ for (var x = 2; x < 4; x ++) {
						//~ datenew.setMonth(datenew.getMonth() + 4);
						//~ $("#aggregDataDateR" + x).html(datenew.toLocaleDateString());
					//~ }
				}
				else if (this.id.substring(10, this.id.length) == "Year") {
					aggregDateOn = 4;
					//~ for (var x = 2; x < 4; x ++) {
						//~ datenew.setMonth(datenew.getMonth() + 12);
						//~ $("#aggregDataDateR" + x).html(datenew.toLocaleDateString());
					//~ }
				}
			}
			updateAggregTable();
				
		});

		$("#aggregPentaAll").change(function(e) {
			aggregMode = "penta";
			if (this.checked) {
				$(".aggChkPenta").prop("checked", true).each(function() {
					$(this).trigger("change");
				});
				aggregPentaSelectNum = 5;
				$(this).prop("checked", true);
			}
			else {
				$(".aggChkPenta").prop("checked", false).each(function() {
					$(this).trigger("change");
				});
				aggregPentaSelectNum = 0;
				$(this).prop("checked", false);
			}
			$(this).prop("indeterminate", false);
		}).prop("checked", true);

		$(".aggChkPenta").change(function(e) {
			aggregMode = "penta";
			$(".aggregDataRoot").hide();
			
			if (this.checked) {
				$(".aggregData" + this.id.substring(6, this.id.length)).show();
				aggregPentaSelectNum ++;
			}
			else {
				$(".aggregData" + this.id.substring(6, this.id.length)).hide();
				aggregPentaSelectNum --;
			}

			if (aggregPentaSelectNum == 5)
				$("#aggregPentaAll").prop("indeterminate", false).prop("checked", true);
			else if (aggregPentaSelectNum == 0)
				$("#aggregPentaAll").prop("indeterminate", false).prop("checked", false);
			else
				$("#aggregPentaAll").prop("checked", false).prop("indeterminate", true);
		}).prop("checked", true);

		$("#aggregRootAll").change(function(e) {
			aggregMode = "root";
			if (this.checked) {
				$(".aggChkRoot").prop("checked", true).each(function() {
					$(this).trigger("change");
				});
				aggregRootSelectNum = 20;
				$(this).prop("checked", true);
			}
			else {
				$(".aggChkRoot").prop("checked", false).each(function() {
					$(this).trigger("change");
				});
				aggregRootSelectNum = 0;
				$(this).prop("checked", false);
			}
			$(this).prop("indeterminate", false);
		}).prop("checked", true);
		
		$(".aggChkRoot").change(function(e) {
			aggregMode = "root";
			$(".aggregDataPenta").hide();
			
			if (this.checked) {
				$(".aggregData" + this.id.substring(6, this.id.length)).show();
				aggregRootSelectNum ++;
			}
			else {
				$(".aggregData" + this.id.substring(6, this.id.length)).hide();
				aggregRootSelectNum --;
			}

			if (aggregRootSelectNum == 20)
				$("#aggregRootAll").prop("indeterminate", false).prop("checked", true);
			else if (aggregRootSelectNum == 0)
				$("#aggregRootAll").prop("indeterminate", false).prop("checked", false);
			else
				$("#aggregRootAll").prop("checked", false).prop("indeterminate", true);
		}).prop("checked", true);

		updateAggregTable();
	}
	else {
		//send to R
		console.log("aggregation R");
		console.log(dateminUser);
		console.log(datemaxUser);
		console.log("remaining dates");
		//~ console.log(datemin);
		//~ console.log(formatAggregDate(datemin));
		//~ console.log(datemin.toUTCString());
		//~ console.log(datemax);

		console.log(actorLinks);
		console.log(actorLinks[0].source.group.entries());
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
			"dataset": dataset,
			"datasource": datasource
		};

		console.log(JSON.stringify(aggregQuery));

		
		let aggregURL = rappURL + "eventdataaggregapp";

		let xhr = new XMLHttpRequest();
		if ("withCredentials" in xhr) {
			// XHR for Chrome/Firefox/Opera/Safari.
			xhr.open('POST', aggregURL, true);
		} else if (typeof XDomainRequest != "undefined") {
			// XDomainRequest for IE.
			xhr = new XDomainRequest();
			xhr.open('POST', aggregURL);
		} else {
			// CORS not supported.
			xhr = null;
		}
		xhr.setRequestHeader('Content-Type', 'text');

		if (!xhr) {
			alert('CORS not supported');
			return;
		}

		xhr.onload = function () {
			let text = xhr.responseText;
			console.log("aggreg response");
			console.log(text);

			let json = '';
			let names = [];

			try {
				json = JSON.parse(text);
				names = Object.keys(json);
			}
			catch (err) {
				console.log(err);
				alert('Error: Could not parse incoming JSON.');
			}
			console.log("json");
			console.log(json);
			console.log("names");
			console.log(names);
			
			//~ let json = '';
			//~ let names = [];

			//~ try {
				//~ json = JSON.parse(text);
				//~ names = Object.keys(json);
			//~ }
			//~ catch (err) {
				//~ console.log(err);
				//~ alert('Error: Could not parse incoming JSON.');
			//~ }
			//~ if (names[0] === "warning") {
				//~ console.log(json.warning);
				//~ alert('Warning: Additional information in console.')
			//~ }
			//~ callback(json);


			//display first 6 in table: consider moving this out to another function
			for (let row = 1; row <= aggregDataNumber; row++) {
				console.log(row + " is updating")
				if (aggregDateOn) {
					$("#aggregDataDateR" + row).html(json["action_data"][row - 1]["_row"]);
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
		};

		xhr.onerror = function () {
			// note: xhr.readystate should be 4, and status should be 200.
			// xhr.status should not be zero
			alert("There was an error making the data request. \nDebugging information has been logged.");
			console.log(xhr);
		};
		//~ xhr.send('solaJSON='+ JSON.stringify(post));
		xhr.send("solaJSON=" + JSON.stringify(aggregQuery));
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

    $("#aggregPentaToggle").click(function() {
        d3.select("#aggregRootToggle").style("background-color", varColor);
        $("#aggregEventByPenta").siblings().hide();
        $(".aggregDataRoot").hide();
        for (var x = 0; x <= 4; x ++) {
            if ($("#aggregPenta" + x).prop("checked")) {
                $(".aggregDataPenta" + x).show();
            }
        }

        if ($("#aggregEventByPenta").is(":visible")) {
            d3.select("#aggregPentaToggle").style("background-color", varColor);
            $("#aggregEventByPenta").hide();
        }
        else {
            d3.select("#aggregPentaToggle").style("background-color", selVarColor);
            $("#aggregEventByPenta").show();
            aggregMode = "penta";
            updateAggregTable();
        }
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

function linkTable() {

}

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

	var curActor = 0;
	var dateNext = false;
	var dateCur = new Date(dateminUser.toLocaleDateString());
	for (var row = 1; row <= aggregDataNumber; row++) {
		if (aggregDateOn == 1) {
			if (dateNext) {
				dateCur = new Date(dateCur.setDate(dateCur.getDate() + 7));
				dateNext = false;
			}
			$("#aggregDataDateR" + row).html(dateCur.toLocaleDateString());
		}
		else if (aggregDateOn == 2) {
			if (dateNext) {
				dateCur.setMonth(dateCur.getMonth() + 1);
				dateNext = false;
			}
			$("#aggregDataDateR" + row).html(dateCur.toLocaleDateString());
		}
		else if (aggregDateOn == 3) {
			if (dateNext) {
				dateCur.setMonth(dateCur.getMonth() + 3);
				dateNext = false;
			}
			$("#aggregDataDateR" + row).html(dateCur.toLocaleDateString());
		}
		else if (aggregDateOn == 4) {
			if (dateNext) {
				dateCur.setMonth(dateCur.getMonth() + 12);
				dateNext = false;
			}
			$("#aggregDataDateR" + row).html(dateCur.toLocaleDateString());
		}
		
		if (aggregActorOn) {
			if (actorLinks.length == 0) {
				dateNext = true;
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
			curActor++;
			if(curActor == actorLinks.length) {
				dateNext = true;
				//~ curActor = 0;
			}
		}
		else {
			dateNext = true;
		}
	}
				
}
