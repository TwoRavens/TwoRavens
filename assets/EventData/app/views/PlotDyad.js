import m from 'mithril';
import * as d3 from "d3";
import * as app from "../app";
import * as common from '../../../common/common';
import {updateAggregTable} from "../aggreg/aggreg";


export const actorColors = d3.scaleOrdinal(d3.schemeCategory20);
const actorNodeR = 40; //various definitions for node display
const actorPadding = 5;
const pebbleBorderColor = '#fa8072';
const fillRatio = 0.6;

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

export default class PlotDyad {
    oncreate(vnode) {
        let {id, preferences} = vnode.attrs;

        this.svg = this.svg || d3.select('#' + id.replace(/ /g, "_"));

        // set the dimensions and margins of the graph
        let bound = this.svg.node().getBoundingClientRect();

        this.actorForce = d3.forceSimulation()
            .force("link", d3.forceLink().distance(100).strength(0.5)) //link force to keep nodes together
            .force("x", d3.forceX().x(function (d) {     //grouping by nodes
                let multiplier = d.actor === Object.keys(preferences['tabs'])[0] ? 1 : 3;
                return Math.floor(multiplier * bound.width / 4);
            }).strength(0.06))
            .force("y", d3.forceY().y(function () {     //cluster nodes
                return Math.floor(bound.height / 2);
            }).strength(0.05))
            .force('charge', d3.forceManyBody().strength(-100)); //prevent tight clustering

        this.svg.append("path").attr("id", "centerLine").attr("d", function () {
            return "M" + bound.width / 2 + "," + 0 + "V" + bound.height;
        }).attr("stroke", "black");

        this.node_drag = d3.drag()
            .on("start", (d) => this.dragstart(vnode, d))
            .on("drag", (d) => this.dragmove(vnode, d))
            .on("end", () => this.dragend(vnode));

        this.dragStarted = false; //determines if dragging
        this.dragSelect = null; //node that has started the drag
        this.dragTarget = null; //node that is under the dragged node
        this.dragTargetHTML = null; //html for dragTarget

        this.originNode = null; //node that is the start of drag link line
        this.destNode = null; //node that is the end of the drag link line

        // furthest a node may move
        this.boundaryRight = Math.ceil(bound.width / 2) + 20; //max x coordinate target nodes can move
        this.boundaryLeft = Math.floor(bound.width / 2) - 20; //max x coordinate source nodes can move

        //define arrow markers
        this.svg.append('svg:defs').append('svg:marker')
            .attr('id', 'end-arrow').attr('viewBox', '0 -5 10 10')
            .attr('refX', 6).attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M0,-5L10,0L0,5')
            .style('fill', '#000');
        this.svg.append('svg:defs')
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
        this.svg.on("mouseup", () => this.lineMouseup(vnode)).on("contextmenu", function () {  //prevent right click on svg
            d3.event.preventDefault();
        });

        this.linkGroup = this.svg.append("svg:g").attr("class", "allLinksGroup").selectAll("path");
        this.nodeGroup = this.svg.append("svg:g").attr("class", "allNodesGroup").selectAll("g");
        this.tooltipSVG = d3.select(this.svg.node().parentNode).append("div").attr("class", "SVGtooltip").style("opacity", 0);

        // draw the drag line last to show it over the nodes when dragging
        this.drag_line = this.svg.append('svg:path').attr('class', 'link dragline hidden').attr('d', 'M0,0L0,0');

        this.updateSVG(vnode);
        this.actorForce.on("tick", () => this.actorTick(vnode)); //custom tick function
        this.updateAll(vnode);
    }

    onupdate(vnode) {
        let {preferences, redraw, setRedraw} = vnode.attrs;
        if (!redraw) return;
        setRedraw(false);

        let actorLinkDiv = $("#actorLinkDiv");
        let [width, height] = [actorLinkDiv.width(), actorLinkDiv.height()];

        this.svg.attr("width", width);
        this.svg.attr("height", height);

        this.boundaryLeft = Math.floor(width / 2) - 20; //max x coordinate source nodes can move
        this.boundaryRight = Math.ceil(width / 2) + 20; //max x coordinate target nodes can move

        d3.select("#centerLine").attr("d", function () {
            return "M" + width / 2 + "," + 0 + "V" + height;
        });

        this.actorForce
            .force("x", d3.forceX().x(function (d) {
                let multiplier = d.actor === Object.keys(preferences['tabs'])[0] ? 1 : 3;
                return Math.floor(multiplier * width / 4);
            }).strength(0.06))
            .force("y", d3.forceY().y(function () {
                return Math.floor(height / 2);
            }).strength(0.05));

        this.updateAll(vnode);
    }

    view(vnode) {
        let {id, attrsAll} = vnode.attrs;
        return m(`svg#${id.replace(/ /g, "_")}[width=100%][height=100%]`, attrsAll)
    }

    //function called at start of drag. 'i' is also passed but ignored
    dragstart(vnode, d) {
        this.actorForce.stop(); // stops the force auto positioning before you start dragging
        this.dragStarted = true;
        this.dragSelect = d;
        this.tooltipSVG.transition().duration(200).style("opacity", 0).style("display", "none");
        // d3.select(this).moveToBack(); // TODO is this needed?
    }

    //function called while dragging, binds (x, y) within SVG and boundaries
    dragmove(vnode, d) {
        let bound = this.svg.node().getBoundingClientRect();
        d.x = Math.max(actorNodeR, Math.min(bound.width - actorNodeR, d3.event.x));
        d.y = Math.max(actorNodeR, Math.min(bound.height - actorNodeR, d3.event.y));
        this.actorTick(vnode);
    }

    //function called at end of drag, merges dragSelect and dragTarget if dragTarget exists
    dragend(vnode) {
        let {preferences} = vnode.attrs;
        //merge dragSel and dragTarg
        if (this.dragTarget) {
            d3.select(this.dragTargetHTML).transition().attr("r", actorNodeR); //transition back to normal size

            this.dragTarget['selected'] = new Set([...this.dragSelect['selected'], ...this.dragTarget['selected']]);

            for (let x = 0; x < preferences['edges'].length; x++) {
                if (preferences['edges'][x].source === this.dragSelect) {
                    preferences['edges'][x].source = this.dragTarget;
                }
                else if (preferences['edges'][x].target === this.dragSelect) {
                    preferences['edges'][x].target = this.dragTarget;
                }
            }

            for (let x = 0; x < preferences['edges'].length; x++) {
                if (preferences['edges'][x] === undefined) {
                    preferences['edges'].splice(x, 1);
                    x--;
                    continue;
                }

                for (let y = x + 1; y < preferences['edges'].length; y++) {
                    if (!preferences['edges'][y])
                        continue;
                    if (preferences['edges'][x].source === preferences['edges'][y].source && preferences['edges'][x].target === preferences['edges'][y].target) {
                        preferences['edges'][y] = undefined;

                    }
                    else if (preferences['edges'][x].source === preferences['edges'][y].target && preferences['edges'][x].target === preferences['edges'][y].source) {
                        preferences['edges'][x].dup = true;
                        preferences['edges'][y].dup = true;
                        //do not need to set rev flag because this is preserved
                    }
                }
            }
            preferences['edges'].splice(preferences['edges'].indexOf(this.dragSelect), 1); //remove the old node

            //now set gui to show dragTarget data
            preferences['current_tab'] = this.dragTarget.actor;
            preferences['tabs'][preferences['current_tab']]['node'] = this.dragTarget;
            preferences['tabs'][preferences['current_tab']]['show_selected'] = true;

            this.updateAll(vnode);

            if (app.selectedMode === "aggregate")
                updateAggregTable();
        }
        this.dragStarted = false; //now reset all drag variables
        this.dragSelect = null;
        this.dragTarget = null;
        this.dragTargetHTML = null;
        this.actorTick(vnode);
        this.actorForce.alpha(1).restart();
    }

    //updates elements in SVG, nodes updated on actorID
    updateSVG(vnode) {
        let {preferences} = vnode.attrs;

        //update links
        this.linkGroup = this.linkGroup.data(preferences['edges']);

        // remove old links
        this.linkGroup.exit().remove();

        let [leftTab, rightTab] = Object.keys(preferences['tabs']);

        this.linkGroup = this.linkGroup.enter().append('svg:path')
            .attr('class', 'link')
            //~ .style('marker-start', function(d) { return d.source.actor == "target" ? 'url(#start-arrow)' : ''; })
            //~ .style('marker-end', function(d) { return d.target.actor == "target" ? 'url(#end-arrow)' : ''; })
            .style('marker-start', function (d) {
                if (!d.rev) return d.source.actor === rightTab ? 'url(#start-arrow)' : '';
                return 'url(#start-arrow)';
            })
            .style('marker-end', function (d) {
                if (!d.rev) return d.target.actor === rightTab ? 'url(#end-arrow)' : '';
                return 'url(#end-arrow)';
            })
            .style('stroke', function (d) {
                return d.rev ? '#00cc00' : '#000';
            })
            .on('mousedown', (d) => {       //delete link

                preferences['edges'].forEach((edge, i) => {
                    if (edge.target !== d.source || edge.source !== d.target) return;
                    if (d.dup) edge.dup = false;
                    else preferences['edges'].splice(i, 1);
                });

                this.updateAll(vnode);
                if (app.selectedMode === "aggregate")
                    updateAggregTable();
            })
            .merge(this.linkGroup);


        //now update nodes
        this.nodeGroup = this.nodeGroup.data(preferences['nodes'], function (d) {
            return d.id;
        });

        this.nodeGroup.exit().remove(); //remove any nodes that are not part of the display

        // keep this in scope after it gets rebound in function() below
        let that = this;

        //define circle for node
        this.nodeGroup = this.nodeGroup.enter().append("g").attr("id", function (d) {
            return d.name.replace(/\s/g, '') + "Group";
        }).call(this.node_drag)
            .each(function () {
                d3.select(this).append("circle").attr("class", "actorNode").attr("r", actorNodeR)
                    .style('fill', (d) => actorColors(d.id))
                    .style('opacity', "0.5")
                    .style('stroke', pebbleBorderColor)
                    .style("pointer-events", "all")
                    .on("contextmenu", function (d) {  //begins drag line drawing for linking nodes
                        d3.event.preventDefault();
                        d3.event.stopPropagation(); //prevents mouseup on node

                        that.originNode = d;

                        //displays arrow in proper direction (source->target and target->source)
                        let [leftTab, rightTab] = Object.keys(preferences['tabs']);
                        that.drag_line
                            .style('marker-end', () => d.actor === leftTab ? 'url(#end-arrow)' : '')
                            .style('marker-start', () => d.actor === rightTab ? 'url(#start-arrow)' : '')
                            .classed('hidden', false)
                            .attr('d', 'M' + that.originNode.x + ',' + that.originNode.y + 'L' + that.originNode.x + ',' + that.originNode.y);

                        that.svg.on('mousemove', function() {that.lineMousemove(this)});
                    })
                    .on("mouseup", (d) => {   //creates link  //TODO for some reason, this no longer fires
                        d3.event.stopPropagation(); //prevents mouseup on svg
                        createLink(d);
                        nodeClick(d);
                    })
                    .on("mousedown", (d) => {  //creates link if mouseup did not catch
                        createLink(d);
                        nodeClick(d);
                    })
                    .on("mouseover", function (d) {  //displays animation for visual indication of mouseover while dragging and sets tooltip
                        if (that.dragSelect && that.dragSelect !== d && that.dragSelect.actor === d.actor) {
                            d3.select(this).transition().attr("r", actorNodeR + 10);
                            that.dragTarget = d;
                            that.dragTargetHTML = this;
                        }

                        if (!that.dragStarted) {
                            that.tooltipSVG.html(d.name).style("display", "block");
                            that.tooltipSVG.transition().duration(200).style("opacity", 1);
                        }
                    })
                    .on("mouseout", function () {  //display animation for visual indication of mouseout and resets dragTarget variables
                        d3.select(this).transition().attr("r", actorNodeR);
                        that.dragTarget = null;
                        that.dragTargetHTML = null;

                        that.tooltipSVG.transition().duration(200).style("opacity", 0).style("display", "none"); //reset tooltip
                    })
                    .on("mousemove", function (d) {  //display tooltip
                        if (!that.dragStarted) {
                            that.tooltipSVG.style("display", "block")
                                .style("left", 'calc(' + (d.x + 320) + 'px + ' + common.panelOcclusion['left'] + ')')
                                .style("top", (d.y - 30) + "px");
                        }
                    });

                d3.select(this).append('svg:text').attr('x', 0).attr('y', 10).attr('class', 'id').text(function (d) { //add text to nodes
                    return d.name.length > 12 ? d.name.substring(0, 9) + "..." : d.name;
                });
            })
            .merge(this.nodeGroup);


        //performs on "click" of node, shows actor selection on node click; call moved to mousedown because click() did not fire for Chrome
        function nodeClick(d) {
            preferences['current_tab'] = d.actor;
            preferences['tabs'][d.actor]['node'] = d;
            m.redraw();
        }

        //creates link between nodes
        let createLink = (d) => {
            // mouse button was right click, so interpret as user wants to create another line instead
            if (d3.event.which === 3) return;

            //if no origin node is selected then return
            if (!this.originNode) return;

            this.drag_line.classed('hidden', true).style('marker-end', ''); //hide drag line

            // check for drag-to-self and same actor to actor (source to source)
            this.destNode = d;
            if (this.destNode === this.originNode || this.destNode.actor === this.originNode.actor) {
                this.resetMouseVars(vnode);
                return;
            }

            let [leftTab, rightTab] = Object.keys(preferences['tabs']);
            //here link is now made
            const actualSource = this.originNode.actor === leftTab ? this.originNode : this.destNode; //choose the node that is a source
            const actualTarget = this.destNode.actor === rightTab ? this.destNode : this.originNode;

            let foundLink;
            for (let idx in preferences['edges'])
                if (preferences['edges'][idx].source === actualSource && preferences['edges'][idx].target === actualTarget)
                    foundLink = idx;

            //link exists for source -> target, check if origin is a target and link does not exist yet
            if (foundLink && this.originNode.actor === rightTab) {
                preferences['edges'][foundLink].dup = true;
            }

            preferences['edges'].push({
                source: actualSource,
                target: actualTarget,
                rev: !!foundLink,
                dup: !!foundLink
            });

            this.updateAll(vnode);
            this.resetMouseVars(vnode);

            if (app.selectedMode === "aggregate")
                updateAggregTable();
        };

        //update all names of nodes - changeID and actorID are not updated on name change to save room for other changes; probably unneccesary for a normal user (unlikely they will perform so many changes)
        this.svg.selectAll("text").text(function (d) {
            return d.name.length > 12 ? d.name.substring(0, 9) + "..." : d.name;
        });
    }

    //function that is called on every animated step of the SVG, handles boundary and node collision
    actorTick(vnode) {
        let {preferences} = vnode.attrs;
        let bound = this.svg.node().getBoundingClientRect();

        if (!this.dragStarted) {
            const q = d3.quadtree().x((d) => d.x).y((d) => d.y).addAll(preferences['nodes']);
            preferences['nodes'].forEach(node => q.visit(this.collide(node)));
        }

        //node movement and display constrained here
        this.nodeGroup.attr("transform", function (d) {
            // console.log("transform D: ");
            // console.log(d);
            d.x = Math.max(actorNodeR, Math.min(bound.width - actorNodeR, d.x)); //test SVG boundary conditions
            d.y = Math.max(actorNodeR, Math.min(bound.height - actorNodeR, d.y));
            let [leftTab, rightTab] = Object.keys(preferences['tabs']);
            if (d.actor === leftTab && d.x > this.boundaryLeft)  //test source/target boundary conditions
                d.x = this.boundaryLeft;
            if (d.actor === rightTab && d.x < this.boundaryRight)
                d.x = this.boundaryRight;
            return "translate(" + d.x + "," + d.y + ")";
        });

        //node outline defined here
        this.svg.selectAll("circle").style("stroke", function (d) {
            //give selected node a black outline, and all other nodes the default color
            return d === preferences['tabs'][preferences['current_tab']]['node'] ? "black" : pebbleBorderColor;
        }).style("stroke-width", function (d) {
            //give selected node a thicker 3px outline, and all other nodes the default 1px
            return d === preferences['tabs'][preferences['current_tab']]['node'] ? 3 : 1;
        });

        //link movement and display determined here
        this.linkGroup.attr('d', function (d) {
            const deltaX = d.target.x - d.source.x, deltaY = d.target.y - d.source.y,
                dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY), normX = deltaX / dist, normY = deltaY / dist;

            //~ sourcePadding = (d.source.actor == "target") ? actorNodeR+5 : actorNodeR,  //spacing on the line before arrow head
            //~ targetPadding = (d.target.actor == "target") ? actorNodeR+5 : actorNodeR,
            let sourcePadding, targetPadding;
            if (d.dup) {
                sourcePadding = actorNodeR + 5;
                targetPadding = actorNodeR + 5;
            }
            else {
                let [leftTab, rightTab] = Object.keys(preferences['tabs']);
                sourcePadding = (d.source.actor === rightTab) ? actorNodeR + 5 : actorNodeR; //spacing on the line before arrow head
                targetPadding = (d.target.actor === rightTab) ? actorNodeR + 5 : actorNodeR;
            }

            const sourceX = d.source.x + (sourcePadding * normX), sourceY = d.source.y + (sourcePadding * normY),
                targetX = d.target.x - (targetPadding * normX), targetY = d.target.y - (targetPadding * normY);

            return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
        });
    }

    //function called per actorTick() to prevent collisions among nodes
    collide(node) {
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
    lineMousemove(context) {
        if (!this.originNode) return;

        // update drag line
        this.drag_line.attr('d', 'M' + this.originNode.x + ',' + this.originNode.y + 'L' + d3.mouse(context)[0] + ',' + d3.mouse(context)[1]);
    }

    //if dragging hide line, called on mouseup on SVG
    lineMouseup(vnode) {
        if (this.originNode) {
            // hide drag line
            this.drag_line.classed('hidden', true).style('marker-end', '');
        }
        // clear mouse event vars
        this.resetMouseVars(vnode);
    }

    //reset drag link node variables
    resetMouseVars(vnode) {
        vnode.state.originNode = null;
        vnode.state.destNode = null;
    }

    //function to handle force and SVG updates
    updateAll(vnode) {
        let {preferences} = vnode.attrs;
        this.updateSVG(vnode);
        this.actorForce.nodes(preferences['nodes']).force("link").links(preferences['edges']);
        this.actorForce.alpha(1).restart();
        this.resetMouseVars(vnode);
    }
}