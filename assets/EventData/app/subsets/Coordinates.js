
$("#latUpper").keyup(setLatitude);
$("#latLower").keyup(setLatitude);
$("#lonLeft").keyup(setLongitude);
$("#lonRight").keyup(setLongitude);

function setLatitude() {
    let latUpper = $("#latUpper");
    let latLower = $("#latLower");

    let latUpperLabel = $("#latUpperLabel");
    let latLowerLabel = $("#latLowerLabel");

    // Validation
    if (isNaN(latLower.val()) || latLower.val() === '') return;
    if (isNaN(latUpper.val()) || latUpper.val() === '') return;

    let valLower = parseFloat(latLower.val());
    if (valLower < -90 || valLower > 90) {
        latLower.val(clip(valLower, -90, 90));
    }

    let valUpper = parseFloat(latUpper.val());
    if (valUpper < -90 ||valUpper > 90) {
        latUpper.val(clip(valUpper, -90, 90));
    }

    // Correct bounds if necessary
    if (parseFloat(latUpper.val()) > parseFloat(latLower.val())) {
        latUpperLabel.text("North Latitude");
        latLowerLabel.text("South Latitude");

        var lowerBound = parseFloat(latLower.val());
        var upperBound = parseFloat(latUpper.val());

    } else {
        latUpperLabel.text("South Latitude");
        latLowerLabel.text("North Latitude");

        var lowerBound = parseFloat(latLower.val());
        var upperBound = parseFloat(latUpper.val());
    }

    // Transform to map coordinates
    lowerBound = (-lowerBound + 90) / 180;
    upperBound = (-upperBound + 90) / 180;

    heightCoord = Math.abs(upperBound - lowerBound);

    newg.attr("y", upperBound);

    dragrect
        .attr("y", function(d) { d.y = upperBound; return upperBound; })
        .attr("height", heightCoord);

    dragbarleft
        .attr("y", function(d) { return upperBound + (dragbarw/2); })
        .attr("height", heightCoord - dragbarw);
    dragbarright
        .attr("y", function(d) { return upperBound + (dragbarw/2); })
        .attr("height", heightCoord - dragbarw);
    dragbartop
        .attr("y", function(d) { return upperBound - (dragbarw/2); });
    dragbarbottom
        .attr("y", function(d) { return upperBound + heightCoord - (dragbarw/2); });

    dragbarbottomleft
        .attr("y", function(d) { return upperBound + heightCoord - (dragbarw/2); });
    dragbarbottomright
        .attr("y", function(d) { return upperBound + heightCoord - (dragbarw/2); });
    dragbartopleft
        .attr("y", function(d) { return upperBound - (dragbarw/2); });
    dragbartopright
        .attr("y", function(d) { return upperBound - (dragbarw/2); });
}

function setLongitude() {
    let lonLeft = $("#lonLeft");
    let lonRight = $("#lonRight");

    let lonLeftLabel = $("#lonLeftLabel");
    let lonRightLabel = $("#lonRightLabel");

    // Validation
    if (isNaN(lonRight.val()) || lonRight.val() === '') return;
    if (isNaN(lonLeft.val()) || lonLeft.val() === '') return;

    let valLeft = parseFloat(lonRight.val());
    if (valLeft < -90 || valLeft > 90) {
        lonRight.val(clip(valLeft, -90, 90));
    }

    let valRight = parseFloat(lonLeft.val());
    if (valRight < -90 ||valRight > 90) {
        lonLeft.val(clip(valRight, -90, 90));
    }

    // Correct bounds if necessary
    if (parseFloat(lonLeft.val()) < parseFloat(lonRight.val())) {
        lonLeftLabel.text("West Longitude");
        lonRightLabel.text("East Longitude");

        var leftBound = parseFloat(lonLeft.val());
        var rightBound = parseFloat(lonRight.val());

    } else {
        lonLeftLabel.text("East Longitude");
        lonRightLabel.text("West Longitude");

        var leftBound = parseFloat(lonRight.val());
        var rightBound = parseFloat(lonLeft.val());
    }

    // Transform to map coordinates
    leftBound = (leftBound + 90) / 90;
    rightBound = (rightBound + 90) / 90;

    widthCoord = Math.abs(rightBound - leftBound);

    newg.attr("x", leftBound);

    dragrect
        .attr("x", function(d) { d.x = leftBound; return leftBound })
        .attr("width", widthCoord);

    dragbartop
        .attr("x", function(d) { return leftBound + (dragbarw/2); })
        .attr("width", widthCoord - dragbarw);
    dragbarbottom
        .attr("x", function(d) { return leftBound + (dragbarw/2); })
        .attr("width", widthCoord - dragbarw);
    dragbarleft
        .attr("x", function(d) { return leftBound - (dragbarw/2); });
    dragbarright
        .attr("x", function(d) { return leftBound + widthCoord - (dragbarw/2); });

    dragbarbottomleft
        .attr("x", function(d) { return leftBound - (dragbarw/2); });
    dragbarbottomright
        .attr("x", function(d) { return leftBound + widthCoord - (dragbarw/2); });
    dragbartopleft
        .attr("x", function(d) { return leftBound - (dragbarw/2); });
    dragbartopright
        .attr("x", function(d) { return leftBound + widthCoord - (dragbarw/2); });
}

function clip(x, lower, upper) {
    return Math.max(Math.min(x, upper), lower);
}

let svgMap = d3.select('#worldMap');

let imgs = svgMap.selectAll("image").data([0]);
imgs.enter()
    .append("svg:image")
    .attr("id", "worldMapImage")
    .attr("xlink:href", "../images/world.svg")
    .attr("x", "0")
    .attr("y", "0")
    .attr("width", "100%")
    .attr("height", "100%");

var widthCoord = 0.2,
    heightCoord = 0.2,
    dragbarw = 0.03;

var drag = d3.drag()
    .subject(Object)
    .on("drag", dragmove);

var dragright = d3.drag()
    .subject(Object)
    .on("drag", rdragresize);

var dragleft = d3.drag()
    .subject(Object)
    .on("drag", ldragresize);

var dragtop = d3.drag()
    .subject(Object)
    .on("drag", tdragresize);

var dragbottom = d3.drag()
    .subject(Object)
    .on("drag", bdragresize);

var dragbottomright = d3.drag()
    .subject(Object)
    .on("drag", brdragresize);

var dragbottomleft = d3.drag()
    .subject(Object)
    .on("drag", bldragresize);

var dragtopright = d3.drag()
    .subject(Object)
    .on("drag", trdragresize);

var dragtopleft= d3.drag()
    .subject(Object)
    .on("drag", tldragresize);

var newg = svgMap.append("g")
    .data([{x: .5, y: .5}]);

var dragrect = newg.append("rect")
    .attr("id", "active")
    .attr("x", function(d) { return d.x; })
    .attr("y", function(d) { return d.y; })
    .attr("height", heightCoord)
    .attr("width", widthCoord)
    .attr("fill-opacity", .2)
    .attr("fill", "#9D9D9D !important")
    .attr("stroke", "#9D9D9D")
    .attr("stroke-width", .005)
    .attr("cursor", "move")
    .call(drag);

var dragbarleft = newg.append("rect")
    .attr("x", function(d) { return d.x - (dragbarw/2); })
    .attr("y", function(d) { return d.y + (dragbarw/2); })
    .attr("height", heightCoord - dragbarw)
    .attr("id", "dragleft")
    .attr("width", dragbarw)
    .attr("fill", "#ADADAD")
    .attr("fill-opacity", .0)
    .attr("cursor", "ew-resize")
    .call(dragleft);

var dragbarright = newg.append("rect")
    .attr("x", function(d) { return d.x + widthCoord - (dragbarw/2); })
    .attr("y", function(d) { return d.y + (dragbarw/2); })
    .attr("id", "dragright")
    .attr("height", heightCoord - dragbarw)
    .attr("width", dragbarw)
    .attr("fill", "#ADADAD")
    .attr("fill-opacity", .0)
    .attr("cursor", "ew-resize")
    .call(dragright);

var dragbartop = newg.append("rect")
    .attr("x", function(d) { return d.x + (dragbarw/2); })
    .attr("y", function(d) { return d.y - (dragbarw/2); })
    .attr("height", dragbarw)
    .attr("id", "dragtop")
    .attr("width", widthCoord - dragbarw)
    .attr("fill", "#ADADAD")
    .attr("fill-opacity", .0)
    .attr("cursor", "ns-resize")
    .call(dragtop);

var dragbarbottom = newg.append("rect")
    .attr("x", function(d) { return d.x + (dragbarw/2); })
    .attr("y", function(d) { return d.y + heightCoord - (dragbarw/2); })
    .attr("id", "dragbottom")
    .attr("height", dragbarw)
    .attr("width", widthCoord - dragbarw)
    .attr("fill", "#ADADAD")
    .attr("fill-opacity", .0)
    .attr("cursor", "ns-resize")
    .call(dragbottom);

var dragbarbottomright = newg.append("rect")
    .attr("x", function(d) { return d.x + widthCoord - (dragbarw/2); })
    .attr("y", function(d) { return d.y + heightCoord - (dragbarw/2); })
    .attr("id", "dragbottomright")
    .attr("height", dragbarw)
    .attr("width", dragbarw)
    .attr("fill", "#ADADAD")
    .attr("fill-opacity", .0)
    .attr("cursor", "nwse-resize")
    .call(dragbottomright);

var dragbarbottomleft = newg.append("rect")
    .attr("x", function(d) { return d.x - (dragbarw/2); })
    .attr("y", function(d) { return d.y + heightCoord - (dragbarw/2); })
    .attr("id", "dragbottomleft")
    .attr("height", dragbarw)
    .attr("width", dragbarw)
    .attr("fill", "#ADADAD")
    .attr("fill-opacity", .0)
    .attr("cursor", "nesw-resize")
    .call(dragbottomleft);

var dragbartopleft = newg.append("rect")
    .attr("x", function(d) { return d.x - (dragbarw/2); })
    .attr("y", function(d) { return d.y - (dragbarw/2); })
    .attr("id", "dragtopleft")
    .attr("height", dragbarw)
    .attr("width", dragbarw)
    .attr("fill", "#ADADAD")
    .attr("fill-opacity", .0)
    .attr("cursor", "nwse-resize")
    .call(dragtopleft);

var dragbartopright = newg.append("rect")
    .attr("x", function(d) { return d.x + widthCoord - (dragbarw/2); })
    .attr("y", function(d) { return d.y - (dragbarw/2); })
    .attr("id", "dragtopleft")
    .attr("height", dragbarw)
    .attr("width", dragbarw)
    .attr("fill", "#ADADAD")
    .attr("fill-opacity", .0)
    .attr("cursor", "nesw-resize")
    .call(dragtopright);

function dragmove(d) {
    dragrect
        .attr("x", d.x = Math.max(0, Math.min(2 - widthCoord, d3.event.x)));
    dragbarleft
        .attr("x", function(d) { return d.x - (dragbarw/2); });
    dragbarright
        .attr("x", function(d) { return d.x + widthCoord - (dragbarw/2); });
    dragbartop
        .attr("x", function(d) { return d.x + (dragbarw/2); });
    dragbarbottom
        .attr("x", function(d) { return d.x + (dragbarw/2); });

    dragrect
        .attr("y", d.y = Math.max(0, Math.min(1 - heightCoord, d3.event.y)));
    dragbarleft
        .attr("y", function(d) { return d.y + (dragbarw/2); });
    dragbarright
        .attr("y", function(d) { return d.y + (dragbarw/2); });
    dragbartop
        .attr("y", function(d) { return d.y - (dragbarw/2); });
    dragbarbottom
        .attr("y", function(d) { return d.y + heightCoord - (dragbarw/2); });

    dragbarbottomleft
        .attr("x", function(d) { return d.x - (dragbarw/2); });
    dragbarbottomright
        .attr("x", function(d) { return d.x + widthCoord - (dragbarw/2); });
    dragbartopleft
        .attr("x", function(d) { return d.x - (dragbarw/2); });
    dragbartopright
        .attr("x", function(d) { return d.x + widthCoord - (dragbarw/2); });

    dragbarbottomleft
        .attr("y", function(d) { return d.y + heightCoord - (dragbarw/2); });
    dragbarbottomright
        .attr("y", function(d) { return d.y + heightCoord - (dragbarw/2); });
    dragbartopleft
        .attr("y", function(d) { return d.y - (dragbarw/2); });
    dragbartopright
        .attr("y", function(d) { return d.y - (dragbarw/2); });

    setInputBounds(d)
}

function ldragresize(d) {
    var oldx = d.x;
    //Max x on the right is x + width - dragbarw
    //Max x on the left is 0 - (dragbarw/2)
    d.x = Math.max(0, Math.min(d.x + widthCoord - (dragbarw / 2), d3.event.x));
    widthCoord = widthCoord + (oldx - d.x);
    dragbarleft
        .attr("x", function(d) { return d.x - (dragbarw / 2); });

    dragrect
        .attr("x", function(d) { return d.x; })
        .attr("width", widthCoord);

    dragbartop
        .attr("x", function(d) { return d.x + (dragbarw/2); })
        .attr("width", widthCoord - dragbarw);
    dragbarbottom
        .attr("x", function(d) { return d.x + (dragbarw/2); })
        .attr("width", widthCoord - dragbarw);

    dragbarbottomleft
        .attr("x", function(d) { return d.x - (dragbarw/2); });
    dragbartopleft
        .attr("x", function(d) { return d.x - (dragbarw/2); });

    setInputBounds(d)
}

function rdragresize(d) {
    //Max x on the left is x - width
    //Max x on the right is width of screen + (dragbarw/2)
    var dragx = Math.max(d.x + (dragbarw / 2), Math.min(2, d.x + widthCoord + d3.event.dx));
    //recalculate width
    widthCoord = dragx - d.x;

    //move the right drag handle
    dragbarright
        .attr("x", function(d) { return dragx - (dragbarw/2) });

    //resize the drag rectangle
    //as we are only resizing from the right, the x coordinate does not need to change
    dragrect
        .attr("width", widthCoord);
    dragbartop
        .attr("width", widthCoord - dragbarw);
    dragbarbottom
        .attr("width", widthCoord - dragbarw);

    dragbarbottomright
        .attr("x", function(d) { return d.x + widthCoord - (dragbarw/2); });
    dragbartopright
        .attr("x", function(d) { return d.x + widthCoord - (dragbarw/2); });

    setInputBounds(d)
}


function tdragresize(d) {

    let oldy = d.y;
    //Max x on the right is x + width - dragbarw
    //Max x on the left is 0 - (dragbarw/2)
    d.y = Math.max(0, Math.min(d.y + heightCoord - (dragbarw / 2), d3.event.y));

    heightCoord = heightCoord + (oldy - d.y);
    dragbartop
        .attr("y", function(d) { return d.y - (dragbarw / 2); });

    dragrect
        .attr("y", function(d) { return d.y; })
        .attr("height", heightCoord);

    dragbarleft
        .attr("y", function(d) { return d.y + (dragbarw/2); })
        .attr("height", heightCoord - dragbarw);
    dragbarright
        .attr("y", function(d) { return d.y + (dragbarw/2); })
        .attr("height", heightCoord - dragbarw);

    dragbartopleft
        .attr("y", function(d) { return d.y - (dragbarw/2); });
    dragbartopright
        .attr("y", function(d) { return d.y - (dragbarw/2); });

    setInputBounds(d)
}

function bdragresize(d) {
    //Max x on the left is x - width
    //Max x on the right is width of screen + (dragbarw/2)
    var dragy = Math.max(d.y + (dragbarw / 2), Math.min(2, d.y + heightCoord + d3.event.dy));

    //recalculate width
    heightCoord = dragy - d.y;

    //move the right drag handle
    dragbarbottom
        .attr("y", function(d) { return dragy - (dragbarw/2) });

    //resize the drag rectangle
    //as we are only resizing from the right, the x coordinate does not need to change
    dragrect
        .attr("height", heightCoord);
    dragbarleft
        .attr("height", heightCoord - dragbarw);
    dragbarright
        .attr("height", heightCoord - dragbarw);

    dragbarbottomleft
        .attr("y", function(d) { return d.y + heightCoord - (dragbarw/2); });
    dragbarbottomright
        .attr("y", function(d) { return d.y + heightCoord - (dragbarw/2); });

    setInputBounds(d)
}

function trdragresize(d) {
    tdragresize(d);
    rdragresize(d);
}

function tldragresize(d) {
    tdragresize(d);
    ldragresize(d);
}

function bldragresize(d) {
    bdragresize(d);
    ldragresize(d);
}

function brdragresize(d) {
    bdragresize(d);
    rdragresize(d);
}

function setInputBounds(d) {

    $('#latUpperLabel').text("North Latitude");
    $('#latLowerLabel').text("South Latitude");

    // 180, not 360 due to svg dimensions
    $('#latUpper').val(Math.round(1000 * -(d.y * 180 - 90)) / 1000);
    $('#latLower').val(Math.round(1000 * -((d.y + heightCoord) * 180 - 90)) / 1000);

    $('#lonLeftLabel').text("West Longitude");
    $('#lonRightLabel').text("East Longitude");

    $('#lonLeft').val(Math.round(1000 * (d.x * 90 - 90)) / 1000);
    $('#lonRight').val(Math.round(1000 * ((d.x + widthCoord) * 90 - 90)) / 1000);
}

setLatitude();
setLongitude();