// Date tab of subsetting screen
$("#dateSVG").empty();
// Default calendar ranges
var datemax = new Date();
var datemin = d3.timeYear.offset(datemax, -5);

// Stubs for user preference
var dateminUser = new Date(datemin.getTime());
var datemaxUser = new Date(datemax.getTime());

// Only true on page setup
var dateSetup = true;

// Stores brush dates
var plotSelection;


function d3date(init=false) {
    $("#dateSVG").empty();
    var dateSVG = d3.select("#dateSVG");

    margin = {top: 20, right: 20, bottom: 110, left: 80};
    margin2 = {top: 430, right: 20, bottom: 30, left: 80};
    datewidth = +dateSVG.attr("width") - margin.left - margin.right;
    dateheight = +dateSVG.attr("height") - margin.top - margin.bottom;
    dateheight2 = +dateSVG.attr("height") - margin2.top - margin2.bottom;

    // The date range needs to be transformed to image width. Range defined here, domain defined below
    // Range of X:
    var datex = d3.scaleTime().range([0, datewidth]),
        datex2 = d3.scaleTime().range([0, datewidth]),
        datey = d3.scaleLinear().range([dateheight, 0]),
        datey2 = d3.scaleLinear().range([dateheight2, 0]);

    var datexAxis = d3.axisBottom(datex),
        datexAxis2 = d3.axisBottom(datex2),
        dateyAxis = d3.axisLeft(datey);

    // Brush and zoom elements
    var datebrush = d3.brushX()
        .extent([[0, 0], [datewidth, dateheight2]])
        .on("brush end", brushed);

    var datezoom = d3.zoom()
        .scaleExtent([1, Infinity])
        .translateExtent([[0, 0], [datewidth, dateheight]])
        .extent([[0, 0], [datewidth, dateheight]])
        .on("zoom", zoomed);

    // Focus data element:
    var datearea = d3.area()
        .curve(d3.curveMonotoneX)
        .x(function (d) {
            return datex(d.Date);
        })
        .y0(dateheight)
        .y1(function (d) {
            return datey(d.Freq);
        });

    // Context data element:
    var datearea2 = d3.area()
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
    var datefocus = dateSVG.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var datecontext = dateSVG.append("g")
        .attr("class", "context")
        .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

    // Invoked on initialization and interaction
    function brushed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
        var s = d3.event.selection || datex2.range();

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
        var t = d3.event.transform;
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

    for (let idx in dateData) {
        let binLabel = dateData[idx]._id;

        // Ensure data is valid
        if (isNaN(parseInt(binLabel.year))) continue;

        let bin = {'Date': new Date(binLabel.year, binLabel.month - 1, 0), 'Freq': dateData[idx].total};
        data.push(bin);
    }
    data = data.sort(dateSort);

    // Set calendar ranges
    datemin = d3.min(data, function (d) {
        return d.Date;
    });

    datemax = d3.max(data, function (d) {
        return d.Date;
    });

    if (init) {
        dateminUser = new Date(datemin.getTime());
        datemaxUser = new Date(datemax.getTime());
    }

    var freqmax = d3.max(data, function (d) {
        return d.Freq;
    });

    // Filter highlighted data by date picked
    var data_highlight = data.filter(function (row) {
        return row.Date >= dateminUser && row.Date <= datemaxUser;
    });

    data_highlight.unshift({"Date": dateminUser, "Freq": interpolate(data, dateminUser)});
    data_highlight.push({"Date": datemaxUser, "Freq": interpolate(data, datemaxUser)});

    var format = d3.timeFormat("%m-%d-%Y");

    if (dateSetup) {
        $("#fromdate").datepicker('option', 'minDate', datemin);
        $("#fromdate").datepicker('option', 'maxDate', datemax);
        $("#fromdate").datepicker('option', 'defaultDate', datemin);
        $("#fromdate").datepicker('option', 'yearRange', datemin.getFullYear() + ':' + datemax.getFullYear());

        $("#todate").datepicker('option', 'minDate', datemin);
        $("#todate").datepicker('option', 'maxDate', datemax);
        $("#todate").datepicker('option', 'defaultDate', datemax);
        $("#todate").datepicker('option', 'yearRange', dateminUser.getFullYear() + ':' + datemax.getFullYear());

        $('#fromdate').val(format(datemin));
        $('#todate').val(format(datemax));
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

    dateSetup = false;
}

min=datemin.getFullYear();
max=datemax.getFullYear();

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
        $("#todate").datepicker('option', 'minDate', dateminUser);
        $("#todate").datepicker('option', 'defaultDate', datemax);
        $("#todate").datepicker('option', 'maxDate', datemax);
        fromdatestring = dateminUser.getFullYear() + "" + ('0' + (dateminUser.getMonth() + 1)).slice(-2) + "" + ('0' + dateminUser.getDate()).slice(-2);
    },
    onClose: function (selectedDate) {
        setTimeout(function () {
            $('#todate').focus();
        }, 100);

        d3date();
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
        todatestring = datemaxUser.getFullYear() + "" + ('0' + (datemaxUser.getMonth() + 1)).slice(-2) + "" + ('0' + datemaxUser.getDate()).slice(-2);
    },
    onClose: function () {
        d3date();
    }
});

function interpolate(data, date) {
    let allDates = [];
    for (let item in data){
        allDates.push(data[item]['Date'])
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

    for (let candidate in data) {
        if (data[candidate]['Date'] === lower) lowerFreq = data[candidate]['Freq'];
        if (data[candidate]['Date'] === upper) upperFreq = data[candidate]['Freq'];
    }

    let interval_lower = date.getTime() - lower.getTime();
    let timespan = upper.getTime() - lower.getTime();

    let weight = interval_lower / timespan;
    return (1 - weight) * lowerFreq + weight * upperFreq;
}


function setDatefromSlider() {
    // Update user preference
    dateminUser = new Date(plotSelection[0].getTime());
    datemaxUser = new Date(plotSelection[1].getTime());

    // Update gui
    var format = d3.timeFormat("%m-%d-%Y");
    $('#fromdate').val(format(dateminUser));
    $('#todate').val(format(datemaxUser));

    // Update plot
    d3date()
}