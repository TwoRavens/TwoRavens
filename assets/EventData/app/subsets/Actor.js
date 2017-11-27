/* The actor menu cannot have the full list of actors, but still needs to remembers filters subset over the entire dataset.
   This is a proposal for how the code can be structured to achieve that. --Michael Shoemate

   There are two queries for source, and two queries for target.
	Query 1: [VISIBLE]		First n records that match visibility
	Query 2: [SELECTED]		First n selected records
	Notice selected actors is always a subset of visible actors,
		so in the actor menu check the actors that are also in the [SELECTED] query


 --Specification for [VISIBLE], the list of all actors currently shown in the editing menu.
   	Important: If EDITED flag is set, then also re-query [SELECTED].

	When a node is selected, set [VISIBLE] to the stored value for [SELECTED] (the node members). Re-query [VISIBLE].

	When show selected is toggled, set/unset the 'show visible' filter. Re-query [VISIBLE].

	When a filter is toggled, add/remove it from <filter_list>. Re-query [VISIBLE].

	When 'Search Source Actors' has an edit with length modulus 3, add text to a temporary <filter_list>. Re-query [VISIBLE].

	When 'Clear All Filters' is selected, clear the <filter_list>. Re-query [VISIBLE].

	When 'show more' is selected, Re-query both [VISIBLE] and [SELECTED] with an increased limit.


 --Specification for [SELECTED], the data structure that describes the elements in a node, or group of actors.
	Every modification to the check boxes updates the rule's query data structure.
	Do not re-query on edits here, but set an EDITED flag that causes re-query of [SELECTED] when [VISIBLE] is changed.

	When a checkbox is clicked in the actor list, a {$Source: 'AFG'} rule is or'ed to root.
		These entries are collapsed to one $in: [] statement by the query builder in subset.js.

	When select all is clicked, a { $Source: { $in: [<filter_list>] }} rule is or'ed to root.

	When a checkbox is unclicked in the actor list, the entire query tree is added to a new root,
		and a { $not: {$Source: 'AFG'}} rule is and'ed to root.

	When deselect all is clicked, the entire query tree is added to a new root,
		and a { $Source: { $not: { $in: [<filter_list>] }}} rule is and'ed to root.

	The object <filter_list> is composed of elements in the form: {$regex: '<filter>'}.

	~~~~~~~~~~~~~~~~~~~
	On stage, for each link, use a deep copy of [SELECTED] as the value for what is currently the raw string list.
*/


let actorCodeLoaded = true;
let actorDisplayed = false;

function d3actor() {
    if (!actorDisplayed) {
        $(document).ready(function () {
            if (typeof actorCodeLoaded !== "undefined" && actorCodeLoaded) {			//if .js file has loaded, this variable will be true and defined
                //update display variables
                $("#actorLinkDiv").css("height", $("#actorSelectionDiv").height() + 2);

                actorWidth = actorSVG.node().getBoundingClientRect().width;
                actorHeight = actorSVG.node().getBoundingClientRect().height;

                boundaryLeft = Math.floor(actorWidth / 2) - 40;
                boundaryRight = Math.ceil(actorWidth / 2) + 40;

                actorSVG.append("path").attr("id", "centerLine").attr("d", function () {
                    return "M" + actorWidth / 2 + "," + 0 + "V" + actorHeight;
                }).attr("stroke", "black");

                actorForce.force("x", d3.forceX().x(function (d) {
                    if (d.actor === "source")
                        return Math.floor(actorWidth / 3);
                    return Math.floor(2 * actorWidth / 3);
                }).strength(0.06))
                    .force("y", d3.forceY().y(function (d) {
                        return Math.floor(actorHeight / 2);
                    }).strength(0.05));
                updateAll();
                actorDisplayed = true;
            }
        });
    }
}

//some preparation and activation for gui display
$(document).ready(function () {
    //expands divs with filters
    $(".filterExpand").click(function () {
        if (this.value == "expand") {
            this.value = "collapse";
            $(this).css("background-image", "url(images/collapse.png)");
            $(this).next().next("div.filterContainer").show("fast");
        }
        else {
            this.value = "expand";
            $(this).css("background-image", "url(images/expand.png)");
            $(this).next().next("div.filterContainer").hide("fast");
        }
    });

    //enable jquery hover text for various gui elements
    $(".actorBottom, .clearActorBtn, #deleteGroup, .actorShowSelectedLbl, #editGroupName").tooltip({container: "body"});
});

// Lists of all checked values
let filterSet = {
    'source': {
        'full': new Set(),
        'entities': new Set(),
        'roles': new Set(),
        'attributes': new Set()
    },
    'target': {
        'full': new Set(),
        'entities': new Set(),
        'roles': new Set(),
        'attributes': new Set()
    }
};

const orgs = ["IGO", "IMG", "MNC", "NGO"];		//hard coded organizations to remove from entities list; hopefully temporary
const actorTypes = ["source", "target"];		//these arrays are to help loop through actor loading

//definition of a node
function nodeObj(name, group, groupIndices, color, actorType, actorID) {
    this.name = name;
    this.group = group;
    this.groupIndices = groupIndices;
    this.nodeCol = color;
    this.actor = actorType;
    this.actorID = actorID;				//this is to keep track of any changes that may have happened in the node
}

//definition of a link
function linkObj(source, target, rev, dup) {
    this.source = source;
    this.target = target;
    this.rev = rev;
    this.dup = dup;
}

const actorNodes = [];
const actorLinks = [];

let currentTab = "source";

var sourceCurrentNode = null;			//current source node that is selected
var targetCurrentNode = null;
let currentSize = 0;					//total number of nodes created; this is never decremented
var sourceSize = 0;						//total number of source nodes created; this is never decremented
var targetSize = 0;						//total number of target nodes created; this is never decremented
var sourceActualSize = 0;				//total number of source nodes present
var targetActualSize = 0;				//total number of target nodes present
let changeID = 0;						//number that is updated whenever a node is added/changed, set to actorID

//begin force definitions
var actorSVG = d3.select("#actorLinkSVG");

var actorWidth = actorSVG.node().getBoundingClientRect().width;		//not yet set since window has not yet been displayed; defaults to 0
var actorHeight = actorSVG.node().getBoundingClientRect().height;	//this code is here to remind what is under subset.js


var boundaryLeft = Math.floor(actorWidth / 2) - 20;		//max x coordinate source nodes can move
var boundaryRight = Math.ceil(actorWidth / 2) + 20;		//max x coordinate target nodes can move

const actorNodeR = 40;									//various definitions for node display
const actorPadding = 5;
const actorColors = d3.scaleOrdinal(d3.schemeCategory20);
const pebbleBorderColor = '#fa8072';
const fillRatio = 0.6;

var actorForce = d3.forceSimulation()
    .force("link", d3.forceLink().distance(100).strength(0.5))	//link force to keep nodes together
    .force("x", d3.forceX().x(function (d) {					//grouping by nodes
        if (d.actor == "source")
            return Math.floor(actorWidth / 4);
        return Math.floor(3 * actorWidth / 4);
    }).strength(0.06))
    .force("y", d3.forceY().y(function (d) {					//cluster nodes
        return Math.floor(actorHeight / 2);
    }).strength(0.05))
    .force('charge', d3.forceManyBody().strength(-100));	//prevent tight clustering


const node_drag = d3.drag().on("start", dragstart).on("drag", dragmove).on("end", dragend);		//defines the drag

let dragStarted = false;		//determines if dragging
let dragSelect = null;			//node that has started the drag
let dragTarget = null;			//node that is under the dragged node
let dragTargetHTML = null;		//html for dragTarget

let mousedownNode = null;		//catch for Chrome, check for mouseup + mousedown and manually trigger click

//moves node to back of HTML index in order to allow mouseover detection
d3.selection.prototype.moveToBack = function () {
    return this.each(function () {
        const firstChild = this.parentNode.firstChild;
        if (firstChild) {
            this.parentNode.insertBefore(this, firstChild);
        }
    });
};

//define arrow markers
actorSVG.append('svg:defs').append('svg:marker').attr('id', 'end-arrow').attr('viewBox', '0 -5 10 10').attr('refX', 6).attr('markerWidth', 3).attr('markerHeight', 3).attr('orient', 'auto').append('svg:path').attr('d', 'M0,-5L10,0L0,5').style('fill', '#000');

actorSVG.append('svg:defs').append('svg:marker').attr('id', 'start-arrow').attr('viewBox', '0 -5 10 10').attr('refX', 4).attr('markerWidth', 3).attr('markerHeight', 3).attr('orient', 'auto').append('svg:path').attr('d', 'M10,-5L0,0L10,5').style('fill', '#000');

//define SVG mouse actions
actorSVG.on("mouseup", function (d) {		//cancel draw line
    lineMouseup();
}).on("contextmenu", function (d) {		//prevent right click on svg
    d3.event.preventDefault();
});

//all links in SVG
let linkGroup = actorSVG.append("svg:g").attr("class", "allLinksGroup").selectAll("path");

//all nodes in SVG
let nodeGroup = actorSVG.append("svg:g").attr("class", "allNodesGroup").selectAll("g");

//draw the drag line last to show it over the nodes when dragging
const drag_line = actorSVG.append('svg:path').attr('class', 'link dragline hidden').attr('d', 'M0,0L0,0');

const tooltipSVG = d3.select(actorSVG.node().parentNode).append("div").attr("class", "SVGtooltip").style("opacity", 0);

let originNode = null;				//node that is the start of drag link line
let destNode = null;				//node that is the end of the drag link line

updateSVG();						//updates SVG elements

actorForce.on("tick", actorTick);		//custom tick function

//end force definitions, begin force functions

//function called at start of drag
function dragstart(d, i) {
    actorForce.stop();		// stops the force auto positioning before you start dragging
    dragStarted = true;
    dragSelect = d;
    tooltipSVG.transition().duration(200).style("opacity", 0).style("display", "none");
    d3.select(this).moveToBack();
}

//function called while dragging, binds (x, y) within SVG and boundaries
function dragmove(d, i) {
    d.x = Math.max(actorNodeR, Math.min(actorWidth - actorNodeR, d3.event.x));
    d.y = Math.max(actorNodeR, Math.min(actorHeight - actorNodeR, d3.event.y));
    actorTick();
}

//function called at end of drag, merges dragSelect and dragTarget if dragTarget exists
function dragend(d, i) {
    //merge dragSel and dragTarg
    if (dragTarget) {
        d3.select(dragTargetHTML).transition().attr("r", actorNodeR);		//transition back to normal size

        //merge dragSel.group to dragTarg.group
        for (var x = 0; x < dragSelect.group.length; x++) {
            if (dragTarget.group.indexOf(dragSelect.group[x]) < 0) {
                dragTarget.group.push(dragSelect.group[x]);
                dragTarget.groupIndices.push(dragSelect.groupIndices[x]);
            }
        }

        //update checks in actor selection
        for (var x = 0; x < dragTarget.groupIndices.length; x++)
            $("#" + dragTarget.groupIndices[x]).prop("checked", "true");

        //merge dragSel links to dragTarg
        //~ for (var x = 0; x < actorLinks.length;x ++) {
        //~ if (actorLinks[x].source == dragSelect)
        //~ actorLinks[x].source = dragTarget;
        //~ else if (actorLinks[x].target == dragSelect)
        //~ actorLinks[x].target = dragTarget;
        //~ }
        for (var x = 0; x < actorLinks.length; x++) {
            if (actorLinks[x].source == dragSelect) {
                actorLinks[x].source = dragTarget;
            }
            else if (actorLinks[x].target == dragSelect) {
                actorLinks[x].target = dragTarget;
            }
        }

        //~ console.log('begin clean');
        for (var x = 0; x < actorLinks.length; x++) {
            //~ console.log(x);
            if (actorLinks[x] == undefined) {
                //~ console.log("removing");
                actorLinks.splice(x, 1);
                x--;
                continue;
            }

            for (let y = x + 1; y < actorLinks.length; y++) {
                if (!actorLinks[y])
                    continue;
                if (actorLinks[x].source == actorLinks[y].source && actorLinks[x].target == actorLinks[y].target) {
                    //~ console.log("matched " + x + " " + y);
                    actorLinks[y] = undefined;

                }
                else if (actorLinks[x].source == actorLinks[y].target && actorLinks[x].target == actorLinks[y].source) {
                    actorLinks[x].dup = true;
                    actorLinks[y].dup = true;
                    //do not need to set rev flag because this is preserved
                }
            }
        }
        //~ console.log(actorLinks);

        actorNodes.splice(actorNodes.indexOf(dragSelect), 1);		//remove the old node

        dragTarget.actorID = changeID;
        changeID++;												//update actorID so SVG can update
        //now set gui to show dragTarget data
        window[dragTarget.actor + "CurrentNode"] = dragTarget;
        $("#" + dragTarget.actor + "TabBtn").trigger("click");
        currentTab = dragTarget.actor;								//sanity check
        updateGroupName(window[currentTab + "CurrentNode"].name);
        $("#clearAll" + capitalizeFirst(currentTab) + "s").click();

        $("#" + currentTab + "ShowSelected").prop("checked", true);
        showSelected($("#" + currentTab + "ShowSelected")[0]);

        updateAll();
    }
    dragStarted = false;		//now reset all drag variables
    dragSelect = null;
    dragTarget = null;
    dragTargetHTML = null;
    actorTick();
    actorForce.alpha(1).restart();
}

//updates elements in SVG, nodes updated on actorID
function updateSVG() {
    //update links
    linkGroup = linkGroup.data(actorLinks);

    // remove old links
    linkGroup.exit().remove();

    linkGroup = linkGroup.enter().append('svg:path')
        .attr('class', 'link')
        //~ .style('marker-start', function(d) { return d.source.actor == "target" ? 'url(#start-arrow)' : ''; })
        //~ .style('marker-end', function(d) { return d.target.actor == "target" ? 'url(#end-arrow)' : ''; })
        .style('marker-start', function (d) {
            if (!d.rev) {
                return d.source.actor == "target" ? 'url(#start-arrow)' : '';
            }
            return 'url(#start-arrow)';
        })
        .style('marker-end', function (d) {
            if (!d.rev) {
                return d.target.actor == "target" ? 'url(#end-arrow)' : '';
            }
            return 'url(#end-arrow)';
        })
        .style('stroke', function (d) {
            if (d.rev) {
                return '#00cc00';
            }
            return '#000';
        })
        .on('mousedown', function (d) {							//delete link
            //~ var obj1 = JSON.stringify(d);
            //~ console.log("link: " + obj1);
            //~ for(var j = 0; j < actorLinks.length; j++) {		//this removes the links on click
            //~ if(obj1 === JSON.stringify(actorLinks[j])) {
            //~ actorLinks.splice(j,1);
            //~ }
            //~ }
            for (let x = 0; x < actorLinks.length; x++) {
                if (d.dup && actorLinks[x].target == d.source && actorLinks[x].source == d.target) {
                    actorLinks[x].dup = false;
                }

                if (actorLinks[x].source == d.source && actorLinks[x].target == d.target) {
                    actorLinks.splice(x, 1);
                }
            }
            updateAll();
        })
        .merge(linkGroup);


    //now update nodes
    nodeGroup = nodeGroup.data(actorNodes, function (d) {
        return d.actorID;
    });

    nodeGroup.exit().remove();		//remove any nodes that are not part of the display

    //define circle for node

    nodeGroup = nodeGroup.enter().append("g").attr("id", function (d) {
        return d.name.replace(/\s/g, '') + "Group";
    }).call(node_drag)
        .each(function (d) {
            d3.select(this).append("circle").attr("class", "actorNode").attr("r", actorNodeR)
                .style('fill', function (d) {
                    return d.nodeCol;
                })
                .style('opacity', "0.5")
                .style('stroke', pebbleBorderColor)
                .style("pointer-events", "all")
                .on("contextmenu", function (d) {		//begins drag line drawing for linking nodes
                    d3.event.preventDefault();
                    d3.event.stopPropagation();		//prevents mouseup on node

                    originNode = d;

                    drag_line.style('marker-end', function () {		//displays arrow in proper direction (source->target and target->source)
                        if (d.actor == "source")
                            return 'url(#end-arrow)';
                        else
                            return '';
                    })
                        .style('marker-start', function () {
                            if (d.actor == "target")
                                return 'url(#start-arrow)';
                            else
                                return '';
                        })
                        .classed('hidden', false).attr('d', 'M' + originNode.x + ',' + originNode.y + 'L' + originNode.x + ',' + originNode.y);

                    actorSVG.on('mousemove', lineMousemove);
                })
                .on("mouseup", function (d) {			//creates link		//for some reason, this no longer fires
                    d3.event.stopPropagation();		//prevents mouseup on svg
                    createLink(d);
                    nodeClick(d);
                    mousedownNode = null;
                })
                .on("mousedown", function (d) {		//creates link if mouseup did not catch
                    createLink(d);
                    nodeClick(d);
                })
                .on("mouseover", function (d) {		//displays animation for visual indication of mouseover while dragging and sets tooltip
                    if (dragSelect && dragSelect != d && dragSelect.actor == d.actor) {
                        d3.select(this).transition().attr("r", actorNodeR + 10);
                        dragTarget = d;
                        dragTargetHTML = this;
                    }

                    if (!dragStarted) {
                        tooltipSVG.html(d.name).style("display", "block");
                        tooltipSVG.transition().duration(200).style("opacity", 1);
                    }
                })
                .on("mouseout", function (d) {		//display animation for visual indication of mouseout and resets dragTarget variables
                    d3.select(this).transition().attr("r", actorNodeR);
                    dragTarget = null;
                    dragTargetHTML = null;

                    tooltipSVG.transition().duration(200).style("opacity", 0).style("display", "none");		//reset tooltip
                })
                .on("mousemove", function (d) {		//display tooltip
                    if (!dragStarted)
                        tooltipSVG.style("display", "block").style("left", (d.x + 350) + "px").style("top", (d.y) + "px");
                });

            d3.select(this).append('svg:text').attr('x', 0).attr('y', 15).attr('class', 'id').text(function (d) {	//add text to nodes
                if (d.name.length > 12)
                    return d.name.substring(0, 9) + "...";
                else
                    return d.name;
            });
        })
        .merge(nodeGroup);


    //performs on "click" of node, shows actor selection on node click; call moved to mousedown because click() did not fire for Chrome
    function nodeClick(d) {
        window[currentTab + "CurrentNode"].group = [...filterSet[currentTab]["full"]];
        $("#" + d.actor + "TabBtn").trigger("click");

        if (window[currentTab + "CurrentNode"] !== d) {			//only update gui if selected node is different than the current

            window[currentTab + "CurrentNode"] = d;
            filterSet[currentTab]["full"] = new Set(d.group);

            //update gui
            updateGroupName(d.name);
            clearChecks();
            document.getElementById(currentTab + "ShowSelected").checked = true;
            showSelected(document.getElementById(currentTab + "ShowSelected"));
        }
    }

    //creates link between nodes
    function createLink(d) {
        if (d3.event.which == 3) {	//mouse button was right click, so interpret as user wants to create another line instead
            return;
        }

        if (!originNode)				//if no origin node is selected then return
            return;

        drag_line.classed('hidden', true).style('marker-end', '');		//hide drag line

        // check for drag-to-self and same actor to actor (source to source)
        destNode = d;
        if (destNode === originNode || destNode.actor == originNode.actor) {
            resetMouseVars();
            return;
        }

        //here link is now made
        const actualSource = originNode.actor == "source" ? originNode : destNode;	//choose the node that is a source
        const actualTarget = destNode.actor == "target" ? destNode : originNode;

        const linkExist = actorLinks.filter(function (linkItem) {
            return (linkItem.source == actualSource && linkItem.target == actualTarget);
        })[0];

        if (linkExist) {
            //link exists for source -> target, check if origin is a target and link does not exist yet
            if (originNode.actor == "target" && !(actorLinks.filter(function (linkItem) {
                    return (linkItem.source == actualTarget && linkItem.target == actualSource);
                })[0])) {
                actorLinks[actorLinks.indexOf(linkExist)].dup = true;
                actorLinks.push(new linkObj(actualTarget, actualSource, true, true));
                updateAll();
            }
        }
        else {
            //add link
            actorLinks.push(new linkObj(actualSource, actualTarget, false, false));
            updateAll();
        }

        //~ console.log("links:");
        //~ for (var x = 0; x < actorLinks.length; x ++) {
        //~ console.log(actorLinks[x].source.name + "\t" + actorLinks[x].target.name);
        //~ }
        //~ console.log("end links");

        resetMouseVars();
    }	//end of createLink()

    //update all names of nodes - changeID and actorID are not updated on name change to save room for other changes; probably unneccesary for a normal user (unlikely they will perform so many changes)
    actorSVG.selectAll("text").text(function (d) {
        if (d.name.length > 12)
            return d.name.substring(0, 9) + "...";
        else
            return d.name;
    });
}

//function that is called on every animated step of the SVG, handles boundary and node collision
function actorTick() {
    if (!dragStarted) {
        const q = d3.quadtree().x((d) => d.x).y((d) => d.y).addAll(actorNodes);
        for (let x = 0; x < actorNodes.length; x++) {
            q.visit(collide(actorNodes[x]));
        }
    }

    //node movement and display constrained here
    nodeGroup.attr("transform", function (d) {
        // console.log("transform D: ");
        // console.log(d);
        d.x = Math.max(actorNodeR, Math.min(actorWidth - actorNodeR, d.x));		//test SVG boundary conditions
        d.y = Math.max(actorNodeR, Math.min(actorHeight - actorNodeR, d.y));
        if (d.actor == "source" && d.x > boundaryLeft)		//test source/target boundary conditions
            d.x = boundaryLeft;
        if (d.actor == "target" && d.x < boundaryRight)
            d.x = boundaryRight;
        return "translate(" + d.x + "," + d.y + ")";
    });

    //node outline defined here
    actorSVG.selectAll("circle").style("stroke", function (d) {
        //give selected node a black outline, and all other nodes the default color
        if (d == window[currentTab + "CurrentNode"]) {
            return "#000000";
        }
        else {
            return pebbleBorderColor;
        }
    }).style("stroke-width", function (d) {
        //give selected node a thicker 3px outline, and all other nodes the default 1px
        if (d == window[currentTab + "CurrentNode"])
            return 3;
        else
            return 1;
    });

    //link movement and display determined here
    linkGroup.attr('d', function (d) {
        const deltaX = d.target.x - d.source.x, deltaY = d.target.y - d.source.y, dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY), normX = deltaX / dist, normY = deltaY / dist;

        //~ sourcePadding = (d.source.actor == "target") ? actorNodeR+5 : actorNodeR,		//spacing on the line before arrow head
        //~ targetPadding = (d.target.actor == "target") ? actorNodeR+5 : actorNodeR,
        let sourcePadding, targetPadding;
        if (d.dup) {
            sourcePadding = actorNodeR + 5;
            targetPadding = actorNodeR + 5;
        }
        else {
            sourcePadding = (d.source.actor == "target") ? actorNodeR + 5 : actorNodeR;		//spacing on the line before arrow head
            targetPadding = (d.target.actor == "target") ? actorNodeR + 5 : actorNodeR;
        }

        const sourceX = d.source.x + (sourcePadding * normX), sourceY = d.source.y + (sourcePadding * normY), targetX = d.target.x - (targetPadding * normX), targetY = d.target.y - (targetPadding * normY);

        return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
    });
}

//function called per actorTick() to prevent collisions among nodes
function collide(node) {
    const r = actorNodeR + actorPadding, nx1 = node.x - r, nx2 = node.x + r, ny1 = node.y - r, ny2 = node.y + r;
    return function (quad, x1, y1, x2, y2) {
        if (quad.data && (quad.data !== node)) {
            let x = node.x - quad.data.x;
            let y = node.y - quad.data.y;
            let l = Math.sqrt(x * x + y * y);
            const r = actorNodeR + actorNodeR + actorPadding;

            if (l < r) {
                l = (l - r) / l * .5;
                node.x -= x *= l;
                node.y -= y *= l;
                quad.data.x += x;
                quad.data.y += y;
            }
        }
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
    };
}

//if dragging update drag line to mouse coordinates, called on mousemove on SVG
function lineMousemove() {
    if (!originNode) return;

    // update drag line
    drag_line.attr('d', 'M' + originNode.x + ',' + originNode.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);
}

//if dragging hide line, called on mouseup on SVG
function lineMouseup() {
    if (originNode) {
        // hide drag line
        drag_line.classed('hidden', true).style('marker-end', '');
    }
    // clear mouse event vars
    resetMouseVars();
}

//reset drag link node variables
function resetMouseVars() {
    originNode = null;
    destNode = null;
}

//function to handle force and SVG updates
function updateAll() {
    updateSVG();
    actorForce.nodes(actorNodes).force("link").links(actorLinks);
    actorForce.alpha(1).restart();
    resetMouseVars();
}

//end force functions, begin actor code

//calculates the max number of nodes that can be fit in the fillRatio of the SVG
function calcCircleNum(curHeight) {
    const numWidth = Math.floor((actorWidth / 2 + actorPadding) / (2 * actorNodeR + actorPadding));
    const numHeight = Math.floor((curHeight + actorPadding) / (2 * actorNodeR + actorPadding));
    const numCircle1 = Math.floor(numWidth * numHeight * fillRatio);		//total number of circles by rectangular packing by fillRatio

    const numHeightTri = Math.floor(((curHeight - (2 * actorNodeR)) + ((actorNodeR + actorPadding / 2) * Math.sqrt(3))) / ((actorNodeR + (actorPadding / 2)) * Math.sqrt(3)));
    let numCircle2;
    if (Math.floor((actorWidth / 2) - ((numWidth * 2 * actorNodeR) + ((numWidth - 1) * actorPadding))) >= actorNodeR)
        numCircle2 = Math.ceil(numHeightTri / 2) * numWidth + Math.floor(numHeightTri / 2) * (numWidth - 1);
    else
        numCircle2 = Math.ceil(numHeightTri / 2) * numWidth + Math.floor(numHeightTri / 2) * (numWidth - 2);

    numCircle2 = Math.floor(numCircle2 * fillRatio);		//total number of circles by triangular/hexagonal packing by fillRatio

    if (numCircle1 > numCircle2)
        return numCircle1;
    return numCircle2;
}

//rename group on click, initialize groups
$(document).ready(function () {
    //default group display on page load, adds default source/target to nodes and SVG
    $("#editGroupName").ready(function () {
        actorNodes.push(new nodeObj("Source 0", [], [], actorColors(currentSize), "source", changeID));
        currentSize++;
        sourceSize++;
        sourceActualSize++;
        changeID++;
        actorNodes.push(new nodeObj("Target 0", [], [], actorColors(currentSize), "target", changeID));
        currentSize++;
        targetSize++;
        targetActualSize++;
        changeID++;
        sourceCurrentNode = actorNodes[0];
        targetCurrentNode = actorNodes[1];
    });

    //visual feedback for name changing
    $("#editGroupName").click(function () {
        $("#editGroupName").css("background-color", "white").css("border", "1px solid black");
    });

    //catch enter and escape key
    $("#editGroupName").keydown(function (e) {
        if (e.keyCode == 13 || e.keyCode == 27) {		//enter or escape key pressed
            $("#editGroupName").focusout();
            $("#" + currentTab + "TabBtn").focus();		//remove focus
        }
    });

    //save changes to group name
    $("#editGroupName").focusout(function () {
        let newGroupName = $("#editGroupName").val().trim();
        if (newGroupName == "") {		//revert to previous name if none entered
            newGroupName = window[currentTab + "CurrentNode"].name;
        }
        //remove visual feedback
        $("#editGroupName").css("background-color", "#F9F9F9").css("border", "none");
        //update in nodes data structure
        window[currentTab + "CurrentNode"].name = newGroupName;
        //update DOM
        updateGroupName(newGroupName);

        updateAll();		//update force
    });
});

//update display of group name
function updateGroupName(newGroupName) {
    $("#editGroupName").attr("placeholder", newGroupName);
    $("#editGroupName").val(newGroupName);
}

//switches tabs in actor subset, sets current and active nodes
function actorTabSwitch(origin, tab) {
    switch (origin) {
        case "sourceTabBtn":
            document.getElementById("targetDiv").style.display = "none";
            $("#targetTabBtn").removeClass("active").addClass("btn-default");
            $("#sourceTabBtn").removeClass("btn-default").addClass("active");
            currentTab = "source";
            break;
        default:	//other button (targetTabBtn)
            document.getElementById("sourceDiv").style.display = "none";
            $("#sourceTabBtn").removeClass("active").addClass("btn-default");
            $("#targetTabBtn").removeClass("btn-default").addClass("active");
            currentTab = "target";
            break;
    }

    updateGroupName(window[currentTab + "CurrentNode"].name);
    document.getElementById(tab).style.display = "inline-block";
    actorTick();
}

//read dictionary and store for fast retrieval
let dict;

//loads the dictionary for translation
const loadDictionary = function () {
    const defer = $.Deferred();
    $.get('../data/dict_sorted.txt', function (data) {
        dict = data.split('\n');
        dict.length--;	//remove last element(empty line)
        defer.resolve();
    });
    return defer;		//return dictionary load completed
};

// Load dictionary on page open
loadDictionary();

// This code is called when data is loaded. It populates the dictionary and source/target lists
function actorDataLoad() {
    document.getElementById("sourceSearch").value = "";
    document.getElementById("targetSearch").value = "";
    $("#sourceTabBtn").trigger("click");

    const defer = $.Deferred();

    for (let actorType of actorTypes) {
        let orgList;
        if (actorType === "source") {
            orgList = document.getElementById("orgSourcesList");
            orgList.innerHTML = "";
        }
        else {
            orgList = document.getElementById("orgTargetsList");
            orgList.innerHTML = "";
        }

        for (let y = 0; y < orgs.length; y++) {
            createElement(true, actorType, "entities", orgs[y], y, orgList);
        }

        for (let columnType in actorData[actorType]) {
            loadDataHelper(actorType, columnType);
        }
    }
    defer.resolve();
}


//handles data selection and read asynchronously to help speed up load
function loadDataHelper(actorType, columnType) {
    let lines = actorData[actorType][columnType];
    let displayList;
    let chkSwitch = true;		//enables code for filter

    if (columnType === "full") {
        displayList = document.getElementById("searchList" + capitalizeFirst(actorType) + "s");
        displayList.innerHTML = "";
        chkSwitch = false;
    }

    if (columnType === "entities") {
        displayList = document.getElementById("country" + capitalizeFirst(actorType) + "sList");
        displayList.innerHTML = "";

        lines = lines.filter(function (val) {
            return (orgs.indexOf(val) === -1);
        });
    }

    if (columnType === "roles") {
        displayList = document.getElementById("role" + capitalizeFirst(actorType) + "sList");
        displayList.innerHTML = "";
    }

    if (columnType === "attributes") {
        displayList = document.getElementById("attribute" + capitalizeFirst(actorType) + "sList");
        displayList.innerHTML = "";
    }

    // Populate listing
    let idx = 0;
    for (let line of lines) createElement(chkSwitch, actorType, columnType, line, idx++, displayList);
}

// creates elements and adds to display
function createElement(chkSwitch = true, actorType, columnType, value, index, displayList) {
    // Don't create an element if it is not selected and must be selected
    if (document.getElementById(currentTab + "ShowSelected").checked && !filterSet[actorType][columnType].has(value)) {
        return;
    }

    const separator = document.createElement("div");
    separator.className = "separator";

    const chkbox = document.createElement("input");
    chkbox.type = "checkbox";
    chkbox.name = actorType + columnType + "Check";
    chkbox.id = actorType + columnType + "Check" + index;
    chkbox.value = value;
    chkbox.className = "actorChk";
    chkbox.checked = filterSet[actorType][columnType].has(value);

    if (chkSwitch) {
        chkbox.onchange = function () {
            actorFilterChanged(this);
        };
    }
    else {
        chkbox.onchange = function () {
            actorSelectChanged(this);
        };
    }

    const lbl = document.createElement("label");
    lbl.htmlFor = actorType + columnType + "Check" + index;
    lbl.className = "actorChkLbl";
    lbl.id = actorType + columnType + "Lbl" + index;
    lbl.innerHTML = value;

    lbl.setAttribute("data-container", "body");
    lbl.setAttribute("data-toggle", "popover");
    lbl.setAttribute("data-placement", "right");
    lbl.setAttribute("data-trigger", "hover");

    displayList.appendChild(chkbox);
    displayList.appendChild(lbl);
    displayList.appendChild(separator);

    $("#" + lbl.id).mouseover(function () {
        if (!$(this).attr("data-content")) {
            if (columnType !== "full")
                $(this).attr("data-content", binarySearch(value));
            else {
                const head = binarySearch(value);
                let tail = "";
                for (let x = 0; x < value.length; x += 3) {
                    let temp = binarySearch(value.substring(x, x + 3));
                    if (temp === "no translation found")
                        temp = "?";
                    tail += temp + " ";
                }
                tail = tail.trim();

                if (head === "no translation found")
                    $(this).attr("data-content", tail);
                else {
                    if (head !== tail)
                        $(this).attr("data-content", head + "; " + tail);
                    else
                        $(this).attr("data-content", head);
                }
            }
        }
        $(this).popover("toggle");
    });

    $("#" + lbl.id).mouseout(function () {
        $(this).popover("toggle");
    });

    setTimeout(function(){
        $("#" + lbl.id).modal('hide')
    }, 4000);

    function binarySearch(element) {
        let l = 0, r = dict.length - 1;
        while (l <= r) {
            const m = Math.floor((l + r) / 2);
            const head = dict[m].split("\t")[0];
            if (head === element) {
                return dict[m].split("\t")[1];
            }
            else {
                if (head < element) {
                    l = m + 1;
                }
                else {
                    r = m - 1;
                }
            }
        }
        return "no translation found";
    }
}

//when an actor selected, add into currentNode.group
function actorSelectChanged(element) {
    element.checked = !!(element.checked);
    if (element.checked) {					//add into group
        if (window[currentTab + "CurrentNode"].group.indexOf(element.value < 0)) {		//perhaps change to a set
            window[currentTab + "CurrentNode"].group.push(element.value);
            window[currentTab + "CurrentNode"].groupIndices.push(element.id);
        }
    }
    else {									//remove from group
        const index = window[currentTab + "CurrentNode"].group.indexOf(element.value);
        if (index > -1) {
            window[currentTab + "CurrentNode"].group.splice(index, 1);
            window[currentTab + "CurrentNode"].groupIndices.splice(index, 1);
        }
    }
}

//when filter checkbox checked, add or remove filter
function actorFilterChanged(element) {
    let filterListing;

    function toggleFilter(element) {
        if (!!(element.checked)) {
            filterListing.add(element.value);
        } else {
            filterListing.delete(element.value);
        }
    }

    if (element.name.indexOf("OrgCheck") !== -1) {
        filterListing = filterSet[currentTab]["entities"];
        toggleFilter(element);

        let allOrgSet = true;
        for (let org of orgs) {
            if (!filterListing.has(org)){
                allOrgSet = false;
                break;
            }
        }

        $("#" + currentTab + "OrgAllCheck")
            .prop("checked", allOrgSet)
            .prop("indeterminate", !allOrgSet);
    }

    else if (element.name.indexOf("entitiesCheck") !== -1) {
        filterListing = filterSet[currentTab]["entities"];
        toggleFilter(element);

        let allCountrySet = true;

        for (let country of actorData[currentTab]["entities"]) {
            if (!(country in orgs) && !filterListing.has(country)){
                allCountrySet = false;
                break;
            }
        }

        $("#" + currentTab + "CountryAllCheck")
            .prop("checked", allCountrySet)
            .prop("indeterminate", !allCountrySet);
    }

    else if (element.name.indexOf("rolesCheck") !== -1) {
        filterListing = filterSet[currentTab]["roles"];
        toggleFilter(element);
    }

    else if (element.name.indexOf("attributesCheck") !== -1) {
        filterListing = filterSet[currentTab]["attributes"];
        toggleFilter(element);
    }

    else {
        filterListing = filterSet[currentTab]["full"];
        toggleFilter(element);
    }

    actorSearch(currentTab);
}

//clears search and filter selections
$(".clearActorBtn").click(function (event) {
    clearChecks();
    actorSearch(currentTab);
});

// Clear all filters
function clearChecks() {
    document.getElementById(currentTab + "Search").value = "";
    $("#" + currentTab + "Filter :checkbox").prop("checked", false);
    $("#" + currentTab + "OrgAllCheck").prop("checked", false).prop("indeterminate", false);
    $("#" + currentTab + "CountryAllCheck").prop("checked", false).prop("indeterminate", false);

    filterSet[currentTab]["entities"] = new Set();
    filterSet[currentTab]["roles"] = new Set();
    filterSet[currentTab]["attributes"] = new Set();

    actorSearch(currentTab);
}

//clear search box when reloading page
$(".actorSearch").ready(function () {
    $(".actorSearch").val("");
});

//when typing in search box
$(".actorSearch").on("keyup", function (event) {
    const searchText = $("#" + currentTab + "Search").val().toUpperCase();
    if (searchText.length % 3 === 0) {
        actorSearch(currentTab);
    }
});

//on load of page, keep actorShowSelected unchecked
$(".actorShowSelected").ready(function () {
    $(".actorShowSelected").prop("checked", false);
});

//called when showing only selected elements, element is the checkbox calling the function
function showSelected(element) {
    actorSearch(currentTab);
}

//on load of page, keep checkbox for selecting all filters unchecked
$(".allCheck").ready(function () {
    $(".allCheck").prop("checked", false);
});

//selects all checks for specified element, handles indeterminate state of checkboxes
$(".allCheck").click(function (event) {
    const currentEntityType = event.target.id.substring(6, 9);
    const currentElement = (currentEntityType === "Org") ? $("#" + currentTab + currentEntityType + "AllCheck") : $("#" + currentTab + "CountryAllCheck");

    currentElement.prop("indeterminate", false);

    let entityDiv;
    if (currentEntityType === "Org") {
        entityDiv = $("#org" + capitalizeFirst(currentTab) + "sList input:checkbox");
    } else {
        entityDiv = $("#country" + capitalizeFirst(currentTab) + "sList input:checkbox");
    }

    if (currentElement.prop("checked")) {
        entityDiv.each(function () {
            filterSet[currentTab]['entities'].add(this.value);
            $(this).prop("checked", true);
        });
    } else {
        entityDiv.each(function() {
            filterSet[currentTab]['entities'].delete(this.value);
            $(this).prop("checked", false);
        });
    }
    actorSearch(currentTab);
});

//adds all of the current matched items into the current selection
$(".actorSelectAll").click(function (event) {
    $("#searchList" + capitalizeFirst(currentTab) + "s").children().each(function () {
        filterSet[currentTab]["full"].add(this.value);
        this.checked = true;
    });
});

//clears all of the current matched items from the current selection
$(".actorClearAll").click(function (event) {
    $("#searchList" + capitalizeFirst(currentTab) + "s").children().each(function () {
        filterSet[currentTab]["full"].delete(this.value);
        this.checked = false;
    });
});

//adds a new group for source/target
$(".actorNewGroup").click(function (event) {
    actorNodes.push(new nodeObj(capitalizeFirst(currentTab) + " " + window[currentTab + "Size"], [], [], actorColors(currentSize), currentTab, changeID));
    window[currentTab + "Size"]++;
    window[currentTab + "ActualSize"]++;
    currentSize++;
    changeID++;

    // Save values to the current node
    window[currentTab + "CurrentNode"].group = [...filterSet[currentTab]["full"]];

    // Set current node to new node
    window[currentTab + "CurrentNode"] = actorNodes[actorNodes.length - 1];
    updateGroupName(window[currentTab + "CurrentNode"].name);

    //update gui
    $("#clearAll" + capitalizeFirst(currentTab) + "s").click();
    filterSet[currentTab]["full"] = new Set();
    actorSearch(currentTab);

    //update svg
    //change dimensions of SVG if needed (exceeds half of the space)
    if (window[currentTab + "ActualSize"] > calcCircleNum(actorHeight)) {
        actorHeight += actorNodeR;
        $("#actorLinkDiv").height(function (n, c) {
            return c + actorNodeR;
        });
        actorSVG.attr("height", actorHeight);
        d3.select("#centerLine").attr("d", function () {
            return "M" + actorWidth / 2 + "," + 0 + "V" + actorHeight;
        });
    }
    updateAll();
    actorTick();
    actorForce.alpha(1).restart();
});

//remove a group if possible
$("#deleteGroup").click(function () {
    const cur = actorNodes.indexOf(window[currentTab + "CurrentNode"]);
    let prev = cur - 1;
    let next = cur + 1;
    while (true) {
        if (actorNodes[prev] && actorNodes[prev].actor == currentTab) {
            performUpdate(prev);
            return;
        }
        else if (actorNodes[next] && actorNodes[next].actor == currentTab) {
            performUpdate(next);
            return;
        }
        else {
            //update search in both directions
            if (prev > -1)
                prev--;
            if (next < actorNodes.length)
                next++;
            if (prev == -1 && next == actorNodes.length)
                break;
        }
    }
    alert("Need at least one " + currentTab + " node!");

    function performUpdate(index) {
        //set index node to current
        window[currentTab + "CurrentNode"] = actorNodes[index];
        updateGroupName(actorNodes[index].name);

        $("#clearAll" + capitalizeFirst(currentTab) + "s").click();
        //update actor selection checks
        $("." + currentTab + "Chk:checked").prop("checked", false);
        for (var x = 0; x < actorNodes[index].groupIndices.length; x++)
            $("#" + actorNodes[index].groupIndices[x]).prop("checked", true);
        $("#" + currentTab + "ShowSelected").trigger("click");

        //update links
        for (var x = 0; x < actorLinks.length; x++) {
            if (actorLinks[x].source == actorNodes[cur]) {
                actorLinks.splice(x, 1);
                x--;
            }
            else if (actorLinks[x].target == actorNodes[cur]) {
                actorLinks.splice(x, 1);
                x--;
            }
        }
        actorNodes.splice(cur, 1);
        window[currentTab + "ActualSize"]--;

        const curHeight = $("#actorContainer").height();		//this is the height of the container
        const titleHeight = $("#linkTitle").height();			//this is the height of the title div above the SVG

        if (sourceActualSize <= calcCircleNum(curHeight - titleHeight) && targetActualSize <= calcCircleNum(curHeight - titleHeight)) {		//if link div is empty enough, maintain height alignment
            $("#actorLinkDiv").css("height", $("#actorSelectionDiv").height() + 2);
            actorHeight = actorSVG.node().getBoundingClientRect().height;
            actorSVG.attr("height", actorHeight);
            d3.select("#centerLine").attr("d", function () {
                return "M" + actorWidth / 2 + "," + 0 + "V" + actorHeight;
            });
        }
        else {	//if deleting the element and shrinking the SVG will cause the height of the SVG to be less than the height of the container, do nothing; else shrink SVG
            if (actorHeight - actorNodeR < curHeight - titleHeight)
                return;

            if (window[currentTab + "ActualSize"] <= calcCircleNum(actorHeight - actorNodeR)) {
                actorHeight -= actorNodeR;
                $("#actorLinkDiv").height(function (n, c) {
                    return c - actorNodeR;
                });
                actorSVG.attr("height", actorHeight);
                d3.select("#centerLine").attr("d", function () {
                    return "M" + actorWidth / 2 + "," + 0 + "V" + actorHeight;
                });
            }
        }
        updateAll();

    }
});

function actorSearch(actorName) {
    const searchText = $("#" + actorName + "Search").val().toUpperCase();

    const operator = '$and';
    let actorFilters = [];

    let abbreviated = currentTab === "source" ? "src" : "tgt";

    if (filterSet[currentTab]["entities"].size !== 0) {
        let filter = {};
        filter['<' + abbreviated + '_actor>'] = { '$in': [...filterSet[currentTab]["entities"]] };
        actorFilters.push(filter);
    }

    if (filterSet[currentTab]["roles"].size !== 0) {
        let filter = {};
        filter['<' + abbreviated + '_agent>'] = {'$in': [...filterSet[currentTab]["roles"]]};
        actorFilters.push(filter);
    }

    if (filterSet[currentTab]["attributes"].size !== 0) {
        let filter = {};

        filter['<' + abbreviated + '_other_agent>'] = {
            '$regex':  "^(....)*(" + [...filterSet[currentTab]["attributes"]].join('|') + ")"
        };
        actorFilters.push(filter);
    }

    // Apply the lookahead search regex last, as it is the most expensive
    if (searchText.length % 3 === 0 && searchText.length !== 0) {
        const tags = searchText.match(/.{3}/g);

        let regex = "";
        for (let tag of tags) {
            regex = regex + "(?=^(...)*" + tag + ")";
        }

        let filter = {};
        filter['<' + currentTab + '>'] = { '$regex': regex + ".*" };
        actorFilters.push(filter)
    }

    let actorFiltersOp = {};
    actorFiltersOp[operator] = actorFilters;

    let stagedSubsetData = [];
    for (let child of subsetData) {
        if (child.name.indexOf("Query") !== -1) {
            stagedSubsetData.push(child)
        }
    }

    let stagedQuery = buildSubset(stagedSubsetData);

    // If no filters are set, don't add any filtering
    let subsets;
    if (actorFilters.length !== 0) {
        subsets = {'$and': [stagedQuery, actorFiltersOp]};
    } else {
        subsets = stagedQuery;
    }

    // Submit query and update listings
    query = {
        'subsets': JSON.stringify(subsets),
        'dataset': dataset,
        'datasource': datasource,
        'type': currentTab
    };

    function updateActorListing(data) {
        if ('source' in data) {
            actorData.source.full = data.source;
            loadDataHelper("source", "full");
        }
        if ('target' in data) {
            document.getElementById("searchListTargets").innerHTML = "";
            actorData.target.full = data.target;
            loadDataHelper("target", "full");
        }
    }
    makeCorsRequest(subsetURL, query, updateActorListing);
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.substring(1);
}

function resizeActorSVG() {
    //actor resize on window resize handled here
    // Only resize actor SVG if actor subset is selected
    if (subsetKeySelected === 'Actor') {
        const curHeight = $("#main").height() - 20;		//this is the height of the container
        const titleHeight = $("#linkTitle").height();			//this is the height of the title div above the SVG
        let trySize = actorHeight;
        $("#actorSelectionDiv").css("height", curHeight);	//this constrains the left side
        if (sourceActualSize <= calcCircleNum(curHeight - titleHeight) && targetActualSize <= calcCircleNum(curHeight - titleHeight)) {		//if link div is empty enough, maintain height alignment
            $("#actorLinkDiv").css("height", $("#actorSelectionDiv").height() + 2);
            actorHeight = actorSVG.node().getBoundingClientRect().height;
            actorSVG.attr("height", actorHeight);
            d3.select("#centerLine").attr("d", function () {
                return "M" + actorWidth / 2 + "," + 0 + "V" + actorHeight;
            });
            updateAll();
        }
        else if (trySize > curHeight) {		//note this is a slow implementation, especially if dragging to resize
            while (sourceActualSize <= calcCircleNum(trySize) && targetActualSize <= calcCircleNum(trySize)) {		//reduce the size of the SVG to a comfortable viewing size
                trySize -= 20;		//try half of actorNodeR
            }

            $("#actorLinkDiv").height(function (n, c) {
                return c - (actorHeight - trySize);
            });
            actorHeight = trySize;
            actorSVG.attr("height", actorHeight);
            d3.select("#centerLine").attr("d", function () {
                return "M" + actorWidth / 2 + "," + 0 + "V" + actorHeight;
            });
            updateAll();
        }
        let diagramWidth = $("#linkTitle").width();
        actorWidth = actorSVG.node().getBoundingClientRect().width;

        boundaryLeft = Math.floor(actorWidth / 2) - 20;		//max x coordinate source nodes can move
        boundaryRight = Math.ceil(actorWidth / 2) + 20;		//max x coordinate target nodes can move

        actorSVG.attr("width", diagramWidth);
        d3.select("#centerLine").attr("d", function () {
            return "M" + diagramWidth / 2 + "," + 0 + "V" + actorHeight;
        });
        updateAll();
    }
}
