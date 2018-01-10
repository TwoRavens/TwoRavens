// Date tab of subsetting screen
import * as app from "../app.js"

import * as d3 from "d3"
import $ from 'jquery'
import "jquery-ui/ui/widgets/datepicker"

// Used for rendering date calendar
import '../../../../node_modules/jquery-ui/themes/base/datepicker.css'
import '../../../../node_modules/jquery-ui-dist/jquery-ui.theme.min.css'

let margin;
let margin2;
let datewidth;
let dateheight;
let dateheight2;

// Default calendar ranges
export var datemax = new Date();
export var datemin = d3.timeYear.offset(datemax, -5);

let min = datemin.getFullYear();
let max = datemax.getFullYear();

// Stubs for user preference
export var dateminUser = new Date(datemin.getTime());
export var datemaxUser = new Date(datemax.getTime());

// Only true on page setup
let firstDraw = true;

// Stores brush dates
let plotSelection;

export function setupDate() {

    $("#fromdate").datepicker({
        dateFormat: 'mm-dd-yy',
        changeYear: true,
        changeMonth: true,
        defaultDate: datemin,
        yearRange: min + ':' + max,
        minDate: datemin,
        maxDate: datemax,
        orientation: top,
        onSelect: function () {
            dateminUser = new Date($(this).datepicker('getDate').getTime());
            let toDate = $('#toDate');
            toDate.datepicker('option', 'minDate', dateminUser);
            toDate.datepicker('option', 'defaultDate', datemax);
            toDate.datepicker('option', 'maxDate', datemax);
            // fromdatestring = dateminUser.getFullYear() + "" + ('0' + (dateminUser.getMonth() + 1)).slice(-2) + "" + ('0' + dateminUser.getDate()).slice(-2);
        },
        onClose: function () {
            setTimeout(function () {
                $('#todate').focus();
            }, 100);

            // Update plot, but don't reset slider
            updateDate(false);
            $("#todate").datepicker("show");
        }
    });


    $("#todate").datepicker({
        changeYear: true,
        changeMonth: true,
        yearRange: min + ':' + max,
        dateFormat: 'mm-dd-yy',
        defaultDate: datemax,
        minDate: dateminUser,
        maxDate: datemax,
        orientation: top,
        onSelect: function () {
            datemaxUser = new Date($(this).datepicker('getDate').getTime());
            // todatestring = datemaxUser.getFullYear() + "" + ('0' + (datemaxUser.getMonth() + 1)).slice(-2) + "" + ('0' + datemaxUser.getDate()).slice(-2);
        },
        onClose: function () {
            // Update plot, but don't reset slider
            updateDate(false);
        }
    });
}

// Redraws the date page. If reset is true, then slider bars get reset
export function updateDate(reset_sliders=true) {
    $("#dateSVG").empty();
    if (app.opMode === "subset") {
		$("#dateInterval").css("display", "block");
		$("#dateAggregOption").css("display", "none");
	}
	else if (app.opMode === "aggreg") {
		$("#dateInterval").css("display", "none");
		$("#dateAggregOption").css("display", "block");
	}
	
    let dateSVG = d3.select("#dateSVG");

    margin = {top: 20, right: 20, bottom: 110, left: 80};
    margin2 = {top: 430, right: 20, bottom: 30, left: 80};
    datewidth = +dateSVG.attr("width") - margin.left - margin.right;
    dateheight = +dateSVG.attr("height") - margin.top - margin.bottom;
    dateheight2 = +dateSVG.attr("height") - margin2.top - margin2.bottom;

    // The date range needs to be transformed to image width. Range defined here, domain defined below
    // Range of X:
    let datex = d3.scaleTime().range([0, datewidth]),
        datex2 = d3.scaleTime().range([0, datewidth]),
        datey = d3.scaleLinear().range([dateheight, 0]),
        datey2 = d3.scaleLinear().range([dateheight2, 0]);

    let datexAxis = d3.axisBottom(datex),
        datexAxis2 = d3.axisBottom(datex2),
        dateyAxis = d3.axisLeft(datey);

    // Brush and zoom elements
    let datebrush = d3.brushX()
        .extent([[0, 0], [datewidth, dateheight2]])
        .on("brush end", brushed);

    let datezoom = d3.zoom()
        .scaleExtent([1, Infinity])
        .translateExtent([[0, 0], [datewidth, dateheight]])
        .extent([[0, 0], [datewidth, dateheight]])
        .on("zoom", zoomed);

    // Focus data element:
    let datearea = d3.area()
        .curve(d3.curveMonotoneX)
        .x(function (d) {
            return datex(d.Date);
        })
        .y0(dateheight)
        .y1(function (d) {
            return datey(d.Freq);
        });

    // Context data element:
    let datearea2 = d3.area()
        .curve(d3.curveMonotoneX)
        .x(function (d) {
            return datex2(d.Date);
        })
        .y0(dateheight2)
        .y1(function (d) {
            return datey2(d.Freq);
        });

    // Set the svg metadata:
    dateSVG.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", datewidth)
        .attr("height", dateheight);

    // Add svg groups for the focus and context portions of the graphic
    let datefocus = dateSVG.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    let datecontext = dateSVG.append("g")
        .attr("class", "context")
        .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

    // Invoked on initialization and interaction
    function brushed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
        let s = d3.event.selection || datex2.range();

        datex.domain(s.map(datex2.invert, datex2));
        datefocus.select(".area").attr("d", datearea);
        datefocus.select(".areaUser").attr("d", datearea);
        datefocus.select(".axis--x").call(datexAxis);
        dateSVG.select(".zoom").call(datezoom.transform, d3.zoomIdentity
            .scale(datewidth / (s[1] - s[0]))
            .translate(-s[0], 0));
        plotSelection = s.map(datex2.invert);
    }

    function zoomed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
        let t = d3.event.transform;
        datex.domain(t.rescaleX(datex2).domain());
        datefocus.select(".area").attr("d", datearea);
        datefocus.select(".areaUser").attr("d", datearea);
        datefocus.select(".axis--x").call(datexAxis);
        datecontext.select(".brush").call(datebrush.move, datex.range().map(t.invertX, t));
    }

    let data = [];

    function dateSort(a, b) {
        if (a['Date'] === b['Date']) {
            return 0;
        }
        else {
            return (a['Date'] < b['Date']) ? -1 : 1;
        }
    }

    for (let entry of app.dateData) {

        // Ensure data is valid
        if (isNaN(parseInt(entry['<year>']))) continue;

        let bin = {'Date': new Date(entry['<year>'], entry['<month>'] - 1, 0), 'Freq': entry.total};
        data.push(bin);
    }
    data = data.sort(dateSort);		//here is where date is collected as monthly?
    //look at: https://bl.ocks.org/cjhin/8872a492d44694ecf5a883642926f19c

    // Set calendar ranges
    datemin = d3.min(data, function (d) {
        return d.Date;
    });

    datemax = d3.max(data, function (d) {
        return d.Date;
    });

    let freqmax = d3.max(data, function (d) {
        return d.Freq;
    });

    if (reset_sliders) {
        dateminUser = new Date(datemin.getTime());
        datemaxUser = new Date(datemax.getTime());
    }

    // Filter highlighted data by date picked
    let data_highlight = data.filter(function (row) {
        return row.Date >= dateminUser && row.Date <= datemaxUser;
    });

    data_highlight.unshift({"Date": dateminUser, "Freq": interpolate(data, dateminUser)});
    data_highlight.push({"Date": datemaxUser, "Freq": interpolate(data, datemaxUser)});

    let format = d3.timeFormat("%m-%d-%Y");

    if (firstDraw) {
        let fromDate = $('#fromdate');
        fromDate.datepicker('option', 'minDate', datemin);
        fromDate.datepicker('option', 'maxDate', datemax);
        fromDate.datepicker('option', 'defaultDate', datemin);
        fromDate.datepicker('option', 'yearRange', datemin.getFullYear() + ':' + datemax.getFullYear());

        let toDate = $('#todate');
        toDate.datepicker('option', 'minDate', datemin);
        toDate.datepicker('option', 'maxDate', datemax);
        toDate.datepicker('option', 'defaultDate', datemax);
        toDate.datepicker('option', 'yearRange', dateminUser.getFullYear() + ':' + datemax.getFullYear());

        fromDate.val(format(datemin));
        toDate.val(format(datemax));

        firstDraw = false;
    }

    // Domain of dates: (range was set in variable initialization)
    datex.domain(d3.extent(data, function (d) {
        return d.Date;
    }));

    datey.domain([0, freqmax]);
    datex2.domain(datex.domain());
    datey2.domain(datey.domain());

    // Draw data on focus portion of svg (datefocus) with the area variable attribute
    datefocus.append("path")
        .datum(data)
        .style("fill", "#ADADAD")
        .attr("class", "area")
        .attr("d", datearea);

    // Draw a highlighted path to focus portion of svg within datearea parameters
    datefocus.append("path")
        .datum(data_highlight)
        .attr("class", "areaUser")
        .style("clip-path", "url(#clip)")
        .style("fill", "steelblue")
        .attr("d", datearea);

    // Add x and y axes to focus group
    datefocus.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + dateheight + ")")
        .call(datexAxis);

    datefocus.append("g")
        .attr("class", "axis axis--y")
        .call(dateyAxis);

    // Draw data on context portion of svg (datecontext)
    datecontext.append("path")
        .datum(data)
        .style("fill", "#ADADAD")
        .attr("class", "area")
        .attr("d", datearea2);

    // Draw a highlighted path to context portion of svg
    datecontext.append("path")
        .datum(data_highlight)
        .style("fill", "steelblue")
        .attr("class", "area")
        .attr("d", datearea2);

    // Add x axis to context group
    datecontext.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + dateheight2 + ")")
        .call(datexAxis2);

    // Add brushes to context group
    datecontext.append("g")
        .attr("class", "brush")
        .call(datebrush)
        .call(datebrush.move, datex.range());

    // Draw a box? Maybe for buffering?
    dateSVG.append("rect")
        .attr("class", "zoom")
        .attr("width", datewidth)
        .attr("height", dateheight)
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .call(datezoom);

    dateSVG.append("datecontext");

    dateSVG.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0)
        .attr("x", 0 - (dateheight / 2))
        .attr("dy", "2em")
        .style("text-anchor", "middle")
        .text("Frequency by Month");
}

function interpolate(data, date) {
    let allDates = [];
    for (let entry of data){
        allDates.push(entry['Date'])
    }

    let lower = allDates[0];
    let upper = allDates[allDates.length - 1];

    for (let candidate in allDates) {
        if (allDates[candidate] > lower && allDates[candidate] < date) {
            lower = allDates[candidate];
        }
        if (allDates[candidate] < upper && allDates[candidate] > date) {
            upper = allDates[candidate];
        }
    }

    let lowerFreq = data[0]['Freq'];
    let upperFreq = data[data.length - 1]['Freq'];

    for (let candidate of data) {
        if (candidate['Date'] === lower) lowerFreq = candidate['Freq'];
        if (candidate['Date'] === upper) upperFreq = candidate['Freq'];
    }

    let interval_lower = date.getTime() - lower.getTime();
    let timespan = upper.getTime() - lower.getTime();

    let weight = interval_lower / timespan;
    return (1 - weight) * lowerFreq + weight * upperFreq;
}


export function setDatefromSlider() {
    // Update user preference
    dateminUser = new Date(plotSelection[0].getTime());
    datemaxUser = new Date(plotSelection[1].getTime());

    // Update gui
    let format = d3.timeFormat("%m-%d-%Y");
    $('#fromdate').val(format(dateminUser));
    $('#todate').val(format(datemaxUser));

    // Update plot, but don't reset slider
    updateDate(false);
}

function getUserDates() {
    return [new Date(plotSelection[0].getTime()), new Date(plotSelection[1].getTime())];
}