import * as app from "../app.js"
import * as d3 from 'd3'
import {panelOcclusion} from "../../../common/common";
import {updateAggregTable} from "../aggreg/aggreg";
import m from 'mithril'

// number of elements to show in search actor list
let defaultPageSize = 200;
let scrolledPageSize = defaultPageSize;

//definition of a node
function NodeObj(name, actorType, actors = new Set()) {

    actorSize[actorType]++;
    actorActualSize[actorType]++;

    this.name = name;
    this.actor = actorType;
    this.group = actors;
    this.nodeCol = actorColors(currentSize++);
    this.actorID = changeID++;				//this is to keep track of any changes that may have happened in the node
}

//definition of a link
function LinkObj(source, target, rev, dup) {
    this.source = source;
    this.target = target;
    this.rev = rev;
    this.dup = dup;
}

//begin force definitions
let actorSVG;

let actorWidth;		//not yet set since window has not yet been displayed; defaults to 0
let actorHeight;	//this code is here to remind what is under subset.js


let boundaryLeft;		//max x coordinate source nodes can move
let boundaryRight;		//max x coordinate target nodes can move

const actorNodeR = 40;									//various definitions for node display
const actorPadding = 5;
const actorColors = d3.scaleOrdinal(d3.schemeCategory20);
const pebbleBorderColor = '#fa8072';
const fillRatio = 0.6;

//default group display on page load, adds default source/target to nodes and SVG
// TODO: check if empty within oninit
actorNodes.push(new NodeObj("Source 0", "source"));
currentNode['source'] = actorNodes[0];

actorNodes.push(new NodeObj("Target 0", "target"));
currentNode['target'] = actorNodes[1];

let actorForce;

const node_drag = d3.drag().on("start", dragstart).on("drag", dragmove).on("end", dragend);		//defines the drag

let dragStarted = false;		//determines if dragging
let dragSelect = null;			//node that has started the drag
let dragTarget = null;			//node that is under the dragged node
let dragTargetHTML = null;		//html for dragTarget

let mousedownNode = null;		//catch for Chrome, check for mouseup + mousedown and manually trigger click

//moves node to back of HTML index in order to allow mouseover detection
// noinspection JSPotentiallyInvalidConstructorUsage
d3.selection.prototype.moveToBack = function () {
    return this.each(function () {
        const firstChild = this.parentNode.firstChild;
        if (firstChild) {
            this.parentNode.insertBefore(this, firstChild);
        }
    });
};

//all links in SVG
let linkGroup;

//all nodes in SVG
let nodeGroup;

//draw the drag line last to show it over the nodes when dragging
let drag_line;
let tooltipSVG;

let originNode = null;				//node that is the start of drag link line
let destNode = null;				//node that is the end of the drag link line

let searchTimeout = null;
export let showSelectedCheck = false;

//end force definitions, begin force functions

export function setupActor(){
    actorSVG = d3.select("#actorLinkSVG");
    $("#actorLinkDiv").css("height", $("#actorSelectionDiv").height() + 2);

    actorWidth = actorSVG.node().getBoundingClientRect().width;		//not yet set since window has not yet been displayed; defaults to 0
    actorHeight = actorSVG.node().getBoundingClientRect().height;	//this code is here to remind what is under subset.js

    //update display variables
    boundaryRight = Math.ceil(actorWidth / 2) + 20;		//max x coordinate target nodes can move
    boundaryLeft = Math.floor(actorWidth / 2) - 20;		//max x coordinate source nodes can move

    actorForce = d3.forceSimulation()
        .force("link", d3.forceLink().distance(100).strength(0.5))	//link force to keep nodes together
        .force("x", d3.forceX().x(function (d) {					//grouping by nodes
            if (d.actor === "source")
                return Math.floor(actorWidth / 4);
            return Math.floor(3 * actorWidth / 4);
        }).strength(0.06))
        .force("y", d3.forceY().y(function () {					//cluster nodes
            return Math.floor(actorHeight / 2);
        }).strength(0.05))
        .force('charge', d3.forceManyBody().strength(-100));	//prevent tight clustering

    actorSVG.append("path").attr("id", "centerLine").attr("d", function () {
        return "M" + actorWidth / 2 + "," + 0 + "V" + actorHeight;
    }).attr("stroke", "black");

    //define arrow markers
    actorSVG.append('svg:defs').append('svg:marker')
        .attr('id', 'end-arrow').attr('viewBox', '0 -5 10 10')
        .attr('refX', 6).attr('markerWidth', 3)
        .attr('markerHeight', 3)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5')
        .style('fill', '#000');
    actorSVG.append('svg:defs')
        .append('svg:marker')
        .attr('id', 'start-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 4)
        .attr('markerWidth', 3)
        .attr('markerHeight', 3)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M10,-5L0,0L10,5')
        .style('fill', '#000');

    //define SVG mouse actions
    actorSVG.on("mouseup", function () {		//cancel draw line
        lineMouseup();
    }).on("contextmenu", function () {		//prevent right click on svg
        d3.event.preventDefault();
    });

    linkGroup = actorSVG.append("svg:g").attr("class", "allLinksGroup").selectAll("path");
    nodeGroup = actorSVG.append("svg:g").attr("class", "allNodesGroup").selectAll("g");
    drag_line = actorSVG.append('svg:path').attr('class', 'link dragline hidden').attr('d', 'M0,0L0,0');
    tooltipSVG = d3.select(actorSVG.node().parentNode).append("div").attr("class", "SVGtooltip").style("opacity", 0);

    updateSVG();						//updates SVG elements

    actorForce.on("tick", actorTick);		//custom tick function

    //adds a new group for source/target
    $("#actorNewGroup").click(function () {
        $(".actorBottom, .clearActorBtn, #deleteGroup, .actorShowSelectedLbl, #editGroupName").popover("hide");
        let newName = capitalizeFirst(currentTab) + " " + actorSize[currentTab];
        let nameCount = 1;
        while (actorNodeNames.indexOf(newName) > -1) {
            newName = capitalizeFirst(currentTab) + " " + (actorSize[currentTab] + nameCount);
            nameCount++;
        }
        actorNodes.push(new NodeObj(newName, currentTab));
        actorNodeNames.push(actorNodes[actorNodes.length - 1].name);

        // Set current node to new node
        currentNode[currentTab] = actorNodes[actorNodes.length - 1];
        updateGroupName(currentNode[currentTab].name);

        //update gui
        $("#clearAllActors").click();
        filterSet[currentTab]["full"] = new Set();
        showSelected(false);

        //update svg
        //change dimensions of SVG if needed (exceeds half of the space)
        if (actorActualSize[currentTab] > calcCircleNum(actorHeight)) {
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
        if (app.selectedMode === "aggregate")
            updateAggregTable();
        actorTick();
        actorForce.alpha(1).restart();

        $(this).blur();
    });

    // infinite scroll on the actor list
    let searchList = $('#searchListActors');
    searchList.on('scroll', function(){
        let container = document.querySelector('#searchListActors');
        let lastChild = document.querySelector('#searchListActors > div:last-child');

        // don't apply infinite scrolling when actor list is empty
        if (lastChild === null) return;

        let scrollHeight = container.scrollHeight - container.scrollTop;

        if (scrollHeight < container.offsetHeight) {

            let newLines = app.subsetMetadata['Actor'][currentTab]['full'].slice(scrolledPageSize, scrolledPageSize + defaultPageSize);
            for (let line of newLines) {

                // Don't create an element if it is an empty string
                if (line === null || line === '') continue;

                if (!showSelectedCheck || currentNode[currentTab].group.has(line)) {
                    searchList.append(createElement(currentTab, 'full', line, true));
                }
            }
            scrolledPageSize += defaultPageSize;
        }
    }).scroll();

    //remove a group if possible
    $("#deleteGroup").click(function () {
        $(".actorBottom, .clearActorBtn, #deleteGroup, .actorShowSelectedLbl, #editGroupName").popover("hide");
        const cur = actorNodes.indexOf(currentNode[currentTab]);
        let prev = cur - 1;
        let next = cur + 1;
        while (true) {
            if (actorNodes[prev] && actorNodes[prev].actor === currentTab) {
                performUpdate(prev);
                $(this).blur();
                return;
            }
            else if (actorNodes[next] && actorNodes[next].actor === currentTab) {
                performUpdate(next);
                $(this).blur();
                return;
            }
            else {
                //update search in both directions
                if (prev > -1)
                    prev--;
                if (next < actorNodes.length)
                    next++;
                if (prev === -1 && next === actorNodes.length)
                    break;
            }
        }
        alert("Need at least one " + currentTab + " node!");

        function performUpdate(index) {
            //set index node to current
            currentNode[currentTab] = actorNodes[index];
            updateGroupName(actorNodes[index].name);

            $("#clearAllActors").click();
            showSelectedCheck = true;

            //update links
            for (let x = 0; x < actorLinks.length; x++) {
                if (actorLinks[x].source === actorNodes[cur]) {
                    actorLinks.splice(x, 1);
                    x--;
                }
                else if (actorLinks[x].target === actorNodes[cur]) {
                    actorLinks.splice(x, 1);
                    x--;
                }
            }
            actorNodeNames.splice(actorNodes[cur].name, 1);
            actorNodes.splice(cur, 1);
            actorActualSize[currentTab]--;

            const curHeight = $("#canvasActor").height();		//this is the height of the container
            const titleHeight = $("#linkTitleLeft").height();			//this is the height of the title div above the SVG

            if (actorActualSize['source'] <= calcCircleNum(curHeight - titleHeight) && actorActualSize['target'] <= calcCircleNum(curHeight - titleHeight)) {		//if link div is empty enough, maintain height alignment
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

                if (actorActualSize[currentTab] <= calcCircleNum(actorHeight - actorNodeR)) {
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

            if (app.selectedMode === "aggregate")
                updateAggregTable();
        }
    });
}

//function called at start of drag. 'i' is also passed but ignored
function dragstart(d) {
    actorForce.stop();		// stops the force auto positioning before you start dragging
    dragStarted = true;
    dragSelect = d;
    tooltipSVG.transition().duration(200).style("opacity", 0).style("display", "none");
    d3.select(this).moveToBack();
}

//function called while dragging, binds (x, y) within SVG and boundaries
function dragmove(d) {
    d.x = Math.max(actorNodeR, Math.min(actorWidth - actorNodeR, d3.event.x));
    d.y = Math.max(actorNodeR, Math.min(actorHeight - actorNodeR, d3.event.y));
    actorTick();
}

//function called at end of drag, merges dragSelect and dragTarget if dragTarget exists
function dragend() {
    //merge dragSel and dragTarg
    if (dragTarget) {
        d3.select(dragTargetHTML).transition().attr("r", actorNodeR);		//transition back to normal size

        dragTarget.group = new Set([...dragSelect.group, ...dragTarget.group]);

        //update checks in actor selection
        for (let actor of dragTarget.group) document.getElementById(currentTab + 'full' + actor + 'check').checked = true;

        //merge dragSel links to dragTarg
        //~ for (var x = 0; x < actorLinks.length;x ++) {
        //~ if (actorLinks[x].source == dragSelect)
        //~ actorLinks[x].source = dragTarget;
        //~ else if (actorLinks[x].target == dragSelect)
        //~ actorLinks[x].target = dragTarget;
        //~ }

        for (let x = 0; x < actorLinks.length; x++) {
            if (actorLinks[x].source === dragSelect) {
                actorLinks[x].source = dragTarget;
            }
            else if (actorLinks[x].target === dragSelect) {
                actorLinks[x].target = dragTarget;
            }
        }

        //~ console.log('begin clean');
        for (let x = 0; x < actorLinks.length; x++) {
            //~ console.log(x);
            if (actorLinks[x] === undefined) {
                //~ console.log("removing");
                actorLinks.splice(x, 1);
                x--;
                continue;
            }

            for (let y = x + 1; y < actorLinks.length; y++) {
                if (!actorLinks[y])
                    continue;
                if (actorLinks[x].source === actorLinks[y].source && actorLinks[x].target === actorLinks[y].target) {
                    //~ console.log("matched " + x + " " + y);
                    actorLinks[y] = undefined;

                }
                else if (actorLinks[x].source === actorLinks[y].target && actorLinks[x].target === actorLinks[y].source) {
                    actorLinks[x].dup = true;
                    actorLinks[y].dup = true;
                    //do not need to set rev flag because this is preserved
                }
            }
        }
        //~ console.log(actorLinks);

        actorNodeNames.splice(actorNodeNames.indexOf(dragSelect.name), 1);		//remove from name list
        actorNodes.splice(actorNodes.indexOf(dragSelect), 1);		//remove the old node

        dragTarget.actorID = changeID;
        changeID++;												//update actorID so SVG can update
        //now set gui to show dragTarget data
        currentNode[dragTarget.actor] = dragTarget;
        $("#" + dragTarget.actor + "TabBtn").trigger("click");
        currentTab = dragTarget.actor;								//sanity check
        updateGroupName(currentNode[currentTab].name);
        $("#clearAllActors").click();

        showSelected(true);

        updateAll();

        if (app.selectedMode === "aggregate")
            updateAggregTable();
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
                return d.source.actor === "target" ? 'url(#start-arrow)' : '';
            }
            return 'url(#start-arrow)';
        })
        .style('marker-end', function (d) {
            if (!d.rev) {
                return d.target.actor === "target" ? 'url(#end-arrow)' : '';
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
                if (d.dup && actorLinks[x].target === d.source && actorLinks[x].source === d.target) {
                    actorLinks[x].dup = false;
                }

                if (actorLinks[x].source === d.source && actorLinks[x].target === d.target) {
                    actorLinks.splice(x, 1);
                }
            }
            updateAll();
            if (app.selectedMode === "aggregate")
                updateAggregTable();
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
        .each(function () {
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
                        if (d.actor === "source")
                            return 'url(#end-arrow)';
                        else
                            return '';
                    })
                        .style('marker-start', function () {
                            if (d.actor === "target")
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
                    $(".actorChkLbl").popover("hide");
                    createLink(d);
                    nodeClick(d);
                })
                .on("mouseover", function (d) {		//displays animation for visual indication of mouseover while dragging and sets tooltip
                    if (dragSelect && dragSelect !== d && dragSelect.actor === d.actor) {
                        d3.select(this).transition().attr("r", actorNodeR + 10);
                        dragTarget = d;
                        dragTargetHTML = this;
                    }

                    if (!dragStarted) {
                        tooltipSVG.html(d.name).style("display", "block");
                        tooltipSVG.transition().duration(200).style("opacity", 1);
                    }
                })
                .on("mouseout", function () {		//display animation for visual indication of mouseout and resets dragTarget variables
                    d3.select(this).transition().attr("r", actorNodeR);
                    dragTarget = null;
                    dragTargetHTML = null;

                    tooltipSVG.transition().duration(200).style("opacity", 0).style("display", "none");		//reset tooltip
                })
                .on("mousemove", function (d) {		//display tooltip
                    if (!dragStarted) {
                        tooltipSVG.style("display", "block")
                            .style("left", 'calc(' + (d.x + 320) + 'px + ' + panelOcclusion['left'] + ')')
                            .style("top", (d.y - 30) + "px");
                    }
                });

            d3.select(this).append('svg:text').attr('x', 0).attr('y', 10).attr('class', 'id').text(function (d) {	//add text to nodes
                if (d.name.length > 12)
                    return d.name.substring(0, 9) + "...";
                else
                    return d.name;
            });
        })
        .merge(nodeGroup);


    //performs on "click" of node, shows actor selection on node click; call moved to mousedown because click() did not fire for Chrome
    function nodeClick(d) {
        $("#" + d.actor + "TabBtn").trigger("click");
        currentNode[currentTab] = d;

        //update gui
        updateGroupName(d.name);
        clearChecks();
        console.log(currentNode[currentTab].group);
        if (currentNode[currentTab].group.size === 0) actorSearch();
        else showSelected(true);
    }

    //creates link between nodes
    function createLink(d) {
        if (d3.event.which === 3) {	//mouse button was right click, so interpret as user wants to create another line instead
            return;
        }

        if (!originNode)				//if no origin node is selected then return
            return;

        drag_line.classed('hidden', true).style('marker-end', '');		//hide drag line

        // check for drag-to-self and same actor to actor (source to source)
        destNode = d;
        if (destNode === originNode || destNode.actor === originNode.actor) {
            resetMouseVars();
            return;
        }

        //here link is now made
        const actualSource = originNode.actor === "source" ? originNode : destNode;	//choose the node that is a source
        const actualTarget = destNode.actor === "target" ? destNode : originNode;

        const linkExist = actorLinks.filter(function (linkItem) {
            return (linkItem.source === actualSource && linkItem.target === actualTarget);
        })[0];

        if (linkExist) {
            //link exists for source -> target, check if origin is a target and link does not exist yet
            if (originNode.actor === "target" && !(actorLinks.filter(function (linkItem) {
                    return (linkItem.source === actualTarget && linkItem.target === actualSource);
                })[0])) {
                actorLinks[actorLinks.indexOf(linkExist)].dup = true;
                actorLinks.push(new LinkObj(actualTarget, actualSource, true, true));
                updateAll();
            }
        }
        else {
            //add link
            actorLinks.push(new LinkObj(actualSource, actualTarget, false, false));
            updateAll();
        }

        //~ console.log("links:");
        //~ for (var x = 0; x < actorLinks.length; x ++) {
        //~ console.log(actorLinks[x].source.name + "\t" + actorLinks[x].target.name);
        //~ }
        //~ console.log("end links");

        resetMouseVars();

        if (app.selectedMode === "aggregate")
            updateAggregTable();
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
        if (d.actor === "source" && d.x > boundaryLeft)		//test source/target boundary conditions
            d.x = boundaryLeft;
        if (d.actor === "target" && d.x < boundaryRight)
            d.x = boundaryRight;
        return "translate(" + d.x + "," + d.y + ")";
    });

    //node outline defined here
    actorSVG.selectAll("circle").style("stroke", function (d) {
        //give selected node a black outline, and all other nodes the default color
        if (d === currentNode[currentTab]) {
            return "#000000";
        }
        else {
            return pebbleBorderColor;
        }
    }).style("stroke-width", function (d) {
        //give selected node a thicker 3px outline, and all other nodes the default 1px
        if (d === currentNode[currentTab])
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
            sourcePadding = (d.source.actor === "target") ? actorNodeR + 5 : actorNodeR;		//spacing on the line before arrow head
            targetPadding = (d.target.actor === "target") ? actorNodeR + 5 : actorNodeR;
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

export function resizeActorSVG(redraw=true) {
    if (document.getElementById('canvasActor').style.display === 'none') return;
    //actor resize on window resize handled here
    const curHeight = $("#canvas").height() - 20;     //this is the height of the container. Note that 20 refers to panelMargin * 2
    const titleHeight = $("#linkTitle").height();           //this is the height of the title div above the SVG
    let trySize = actorHeight;

    let actorSelectionDiv = $("#actorSelectionDiv");
    let actorLinkDiv = $("#actorLinkDiv");
    // actorSelectionDiv.css("height", curHeight);   //this constrains the left side
    if (actorActualSize['source'] <= calcCircleNum(curHeight - titleHeight) && actorActualSize['target'] <= calcCircleNum(curHeight - titleHeight)) {     //if link div is empty enough, maintain height alignment
        actorLinkDiv.css("height", actorSelectionDiv.height() + 2);
        actorHeight = actorSVG.node().getBoundingClientRect().height;
        actorSVG.attr("height", actorHeight);
        d3.select("#centerLine").attr("d", function () {
            return "M" + actorWidth / 2 + "," + 0 + "V" + actorHeight;
        });
        updateAll();
    }
    else if (trySize > curHeight) {     //note this is a slow implementation, especially if dragging to resize
        while (actorActualSize['source'] <= calcCircleNum(trySize) && actorActualSize['target'] <= calcCircleNum(trySize)) {      //reduce the size of the SVG to a comfortable viewing size
            trySize -= 20;      //try half of actorNodeR
        }

        actorLinkDiv.height(function (n, c) {
            return c - (actorHeight - trySize);
        });
        actorHeight = trySize;
        actorSVG.attr("height", actorHeight);
        d3.select("#centerLine").attr("d", function () {
            return "M" + actorWidth / 2 + "," + 0 + "V" + actorHeight;
        });
        updateAll();
    }

    let diagramWidth = actorLinkDiv.width();
    actorSVG.attr("width", diagramWidth);

    actorWidth = actorSVG.node().getBoundingClientRect().width;
    boundaryLeft = Math.floor(actorWidth / 2) - 20;     //max x coordinate source nodes can move
    boundaryRight = Math.ceil(actorWidth / 2) + 20;     //max x coordinate target nodes can move

    d3.select("#centerLine").attr("d", function () {
        return "M" + diagramWidth / 2 + "," + 0 + "V" + actorHeight;
    });
    updateAll();

    redraw && m.redraw();
}
