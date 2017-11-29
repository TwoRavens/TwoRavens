function updateToAggreg() {
	opMode = "aggreg";
	//clear main
	console.log("aggreg on");
	$("#btnSubmit").removeAttr("onclick").click(function(){alert("Functionality disabled for now");});
	$("#stageButton").hide();
	$("#subsetLeftPanelSelection").hide();
	$("#aggregLeftPanelSelection").show();
	$(".subsetDiv").hide();
	$(".aggregDiv").show();

	d3.select("#aggregOptions").selectAll("p").style("background-color", varColor);
	d3.select("#aggregPentaToggle").style("background-color", selVarColor);
	d3.select("#aggregRootToggle").style("background-color", varColor); 
	
	$("#subsetDate").appendTo("#aggregDataDisplay");
	//~ $("#dateSVGdiv").appendTo("#aggregDataDisplay");
	d3date(true);

	
	$("#subsetActor").appendTo("#aggregDataDisplay");
	
	
	console.log("new height: " + $("#aggregDataDisplay").height());
	$("#subsetActor").height($("#aggregDataDisplay").height());
	actorDataLoad();

	/*
	 * jsondata : contains all data - see console output for format
	 * d3date() : this will refresh the range and data
	 * actorDataLoad() : this will refresh the data
	 * add a none option to actor
	 */

	 updateAggregTable();
}

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
	if ($("#aggregEventByPenta").is(":visible")) {
		d3.select("#aggregPentaToggle").style("background-color", varColor);
		$("#aggregEventByPenta").hide();
	}
	else {
		d3.select("#aggregPentaToggle").style("background-color", selVarColor);
		$("#aggregEventByPenta").show();
	}
});

$("#aggregRootToggle").click(function() {
	d3.select("#aggregPentaToggle").style("background-color", varColor);
	$("#aggregEventByRoot").siblings().hide();
	if ($("#aggregEventByRoot").is(":visible")) {
		d3.select("#aggregRootToggle").style("background-color", varColor);
		$("#aggregEventByRoot").hide();
	}
	else {
		d3.select("#aggregRootToggle").style("background-color", selVarColor);
		$("#aggregEventByRoot").show();
	}
});

function updateAggregTable() {
	console.log("updating table");
	console.log(dateData);
	console.log(dateData[0]);
	console.log(dateData[0]._id);
	console.log(datemin);
	aggregDateData = dateData.sort(dateSort);
	aggregDateMin = d3.min(aggregDateData, function(d) {return d.Freq;});
	console.log("min date");
	console.log(aggregDateMin);
	console.log(aggregDateData);
}
