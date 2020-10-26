import m from 'mithril';
import * as d3 from "d3";
import * as common from '../../../common/common';

import $ from 'jquery';

// This shuffle is biased towards elements at the start of the color scheme. But that's just fine, the first colors are better
export let nodeColors = d3.scaleOrdinal(d3.schemeCategory10.sort(() => .5 - Math.random()));
const dyadNodeRadius = 40; //various definitions for node display
const dyadNodePadding = 5;
const pebbleBorderColor = '#949494';

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
        let {metadata} = vnode.attrs;

        this.svg = this.svg || d3.select(vnode.dom);

        // set the dimensions and margins of the graph
        let bound = this.svg.node().getBoundingClientRect();

        this.dyadForce = d3.forceSimulation()
            .force("link", d3.forceLink().distance(100).strength(0.5)) //link force to keep nodes together
            .force("x", d3.forceX().x(function (d) {     //grouping by nodes
                let multiplier = d.tab === Object.keys(metadata['tabs'])[0] ? 1 : 3;
                return Math.floor(multiplier * bound.width / 4);
            }).strength(0.06))
            .force("y", d3.forceY().y(function () {     //cluster nodes
                return Math.floor(bound.height / 2);
            }).strength(0.05))
            .force('charge', d3.forceManyBody().strength(-100)); //prevent tight clustering

        this.svg.append("path").attr("id", "centerLine").attr("d", function () {
            return "M" + bound.width / 2 + "," + 0 + "V" + bound.height;
        }).attr("stroke", "black");

        let that = this;
        this.node_drag = d3.drag()
            .on("start", function (_, d) {
                that.dragstart(this, d)
            })
            .on("drag", (e, d) => this.dragmove(vnode, e, d))
            .on("end", e => this.dragend(vnode, e));

        this.dragStarted = false; //determines if dragging
        this.dragSelect = null; //node that has started the drag
        this.dragTarget = null; //node that is under the dragged node
        this.dragTargetHTML = null; //html for dragTarget

        this.originNode = null; //node that is the start of drag link line
        this.destNode = null; //node that is the end of the drag link line

        // furthest a node may move - accessed from vnode.state later, since 'this' was rebound
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
        this.svg.on("mouseup", () => this.lineMouseup(vnode)).on("contextmenu", function (e) {  //prevent right click on svg
            e.preventDefault();
        });

        this.linkGroup = this.svg.append("svg:g").attr("class", "allLinksGroup").selectAll("path");
        this.nodeGroup = this.svg.append("svg:g").attr("class", "allNodesGroup").selectAll("g");
        this.tooltipSVG = d3.select(this.svg.node().parentNode).append("div").attr("class", "SVGtooltip").style("opacity", 0);

        // draw the drag line last to show it over the nodes when dragging
        this.drag_line = this.svg.append('svg:path').attr('class', 'link dragline hidden').attr('d', 'M0,0L0,0');

        this.updateSVG(vnode);
        this.dyadForce.on("tick", () => this.dyadTick(vnode)); //custom tick function
        this.updateAll(vnode);
    }

    onupdate(vnode) {
        let {metadata, redraw, setRedraw} = vnode.attrs;
        if (!redraw) return;
        setRedraw(false);

        let dyadLinkDiv = $("#dyadLinkDiv");
        let [width, height] = [dyadLinkDiv.width(), dyadLinkDiv.height()];

        this.svg.attr("width", width);
        this.svg.attr("height", height);

        this.boundaryLeft = Math.floor(width / 2) - 20; //max x coordinate source nodes can move
        this.boundaryRight = Math.ceil(width / 2) + 20; //max x coordinate target nodes can move

        d3.select("#centerLine").attr("d", function () {
            return "M" + width / 2 + "," + 0 + "V" + height;
        });

        this.dyadForce
            .force("x", d3.forceX().x(function (d) {
                let multiplier = d.tab === Object.keys(metadata['tabs'])[0] ? 1 : 3;
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
    dragstart(context, d) {
        this.dyadForce.stop(); // stops the force auto positioning before you start dragging
        this.dragStarted = true;
        this.dragSelect = d;
        this.tooltipSVG.transition().duration(200).style("opacity", 0).style("display", "none");
        d3.select(context).moveToBack(); // if disabled, merging only works from new-> old node, since the start node may or may not be on top
    }

    //function called while dragging, binds (x, y) within SVG and boundaries
    dragmove(vnode, e, d) {
        let bound = this.svg.node().getBoundingClientRect();
        d.x = Math.max(dyadNodeRadius, Math.min(bound.width - dyadNodeRadius, e.x));
        d.y = Math.max(dyadNodeRadius, Math.min(bound.height - dyadNodeRadius, e.y));
        this.dyadTick(vnode);
    }

    //function called at end of drag, merges dragSelect and dragTarget if dragTarget exists
    dragend(vnode, e) {
        let {preferences} = vnode.attrs;
        //merge dragSel and dragTarg
        if (this.dragTarget) {
            d3.select(this.dragTargetHTML).transition().attr("r", dyadNodeRadius); //transition back to normal size

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
            preferences['nodes'].splice(preferences['nodes'].indexOf(this.dragSelect), 1); //remove the old node

            //now set gui to show dragTarget data
            preferences['current_tab'] = this.dragTarget.tab;
            preferences['tabs'][preferences['current_tab']]['node'] = this.dragTarget;
            preferences['tabs'][preferences['current_tab']]['show_selected'] = true;

            this.updateAll(vnode);
            m.redraw();
        }
        this.dragStarted = false; //now reset all drag variables
        this.dragSelect = null;
        this.dragTarget = null;
        this.dragTargetHTML = null;
        this.dyadTick(vnode);
        this.dyadForce.alpha(1).restart();
    }

    //updates elements in SVG, nodes updated on id
    updateSVG(vnode) {
        let {preferences, metadata} = vnode.attrs;

        //update links
        this.linkGroup = this.linkGroup.data(preferences['edges'].filter(edge => edge.source.tab in metadata['tabs']));

        // remove old links
        this.linkGroup.exit().remove();

        let [leftTab, rightTab] = Object.keys(metadata['tabs']);

        this.linkGroup = this.linkGroup.enter().append('svg:path')
            .attr('class', 'link')
            //~ .style('marker-start', function(d) { return d.source.tab == "target" ? 'url(#start-arrow)' : ''; })
            //~ .style('marker-end', function(d) { return d.target.tab == "target" ? 'url(#end-arrow)' : ''; })
            .style('marker-start', function (d) {
                if (!d.rev) return d.source.tab === rightTab ? 'url(#start-arrow)' : '';
                return 'url(#start-arrow)';
            })
            .style('marker-end', function (d) {
                if (!d.rev) return d.target.tab === rightTab ? 'url(#end-arrow)' : '';
                return 'url(#end-arrow)';
            })
            .style('stroke', function (d) {
                return d.rev ? '#00cc00' : '#000';
            })
            .on('mousedown', (_, d) => {       //delete link
                preferences['edges'].forEach((edge, i) => {
                    if (edge.source !== d.source || edge.target !== d.target) return;
                    if (d.dup) edge.dup = false;
                    else preferences['edges'].splice(i, 1);
                });

                this.updateAll(vnode);
                m.redraw()
            })
            .merge(this.linkGroup);


        //now update nodes
        this.nodeGroup = this.nodeGroup.data(preferences['nodes'].filter(node => node.tab in metadata['tabs']), function (d) {
            return d.id;
        });

        this.nodeGroup.exit().remove(); //remove any nodes that are not part of the display

        // keep this in scope after it gets rebound in function() below
        let that = this;

        //define circle for node
        this.nodeGroup = this.nodeGroup.enter()
            .append("g")
            .attr("id", function (d) {
                return d.name.replace(/\s/g, '') + "Group";
            })
            .style('cursor', 'pointer').call(this.node_drag)
            .each(function () {
                d3.select(this)
                    .append("circle")
                    .attr("r", dyadNodeRadius)
                    .style('fill', (d) => nodeColors(d.id))
                    .style('opacity', "0.5")
                    .style('stroke', pebbleBorderColor)
                    .style("pointer-events", "all")
                    .on("contextmenu", function (e, d) {  //begins drag line drawing for linking nodes
                        e.preventDefault();
                        e.stopPropagation(); //prevents mouseup on node

                        that.originNode = d;

                        //displays arrow in proper direction (source->target and target->source)
                        that.drag_line
                            .style('marker-end', () => d.tab === leftTab ? 'url(#end-arrow)' : '')
                            .style('marker-start', () => d.tab === rightTab ? 'url(#start-arrow)' : '')
                            .classed('hidden', false)
                            .attr('d', 'M' + that.originNode.x + ',' + that.originNode.y + 'L' + that.originNode.x + ',' + that.originNode.y);

                        that.svg.on('mousemove', function () {
                            that.lineMousemove(this)
                        });
                    })
                    .on("mouseup", function (e, d) {			//creates link		//for some reason, this no longer fires
                        e.stopPropagation();		//prevents mouseup on svg
                        createLink(e, d);
                        nodeClick(d);
                    })
                    .on("mousedown", (e, d) => {  //creates link if mouseup did not catch
                        createLink(e, d);
                        nodeClick(d);
                    })
                    .on("mouseover", function (e, d) {  //displays animation for visual indication of mouseover while dragging and sets tooltip
                        if (that.dragSelect && that.dragSelect !== d && that.dragSelect.tab === d.tab) {
                            d3.select(this).transition().attr("r", dyadNodeRadius + 10);
                            that.dragTarget = d;
                            that.dragTargetHTML = this;
                        }

                        if (!that.dragStarted && d.name.length > 12) {
                            that.tooltipSVG.html(d.name).style("display", "block");
                            that.tooltipSVG.transition().duration(200).style("opacity", 1);
                        }
                    })
                    .on("mouseout", function () {  //display animation for visual indication of mouseout and resets dragTarget variables
                        d3.select(this).transition().attr("r", dyadNodeRadius);
                        that.dragTarget = null;
                        that.dragTargetHTML = null;

                        that.tooltipSVG.transition().duration(200).style("opacity", 0).style("display", "none"); //reset tooltip
                    })
                    .on("mousemove", function (_, d) {  //display tooltip
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


        //performs on "click" of node, shows dyad selection on node click; call moved to mousedown because click() did not fire for Chrome
        function nodeClick(d) {
            preferences['current_tab'] = d.tab;
            preferences['tabs'][d.tab]['node'] = d;
            m.redraw();
        }

        //creates link between nodes
        let createLink = (e, d) => {
            // mouse button was right click, so interpret as user wants to create another line instead
            if (e.which === 3) return;

            //if no origin node is selected then return
            if (!this.originNode) return;

            this.drag_line.classed('hidden', true).style('marker-end', ''); //hide drag line

            // check for drag-to-self and same tab to tab (source to source)
            this.destNode = d;
            if (this.destNode === this.originNode || this.destNode.tab === this.originNode.tab) {
                this.resetMouseVars(vnode);
                return;
            }

            let [leftTab, rightTab] = Object.keys(metadata['tabs']);
            //here link is now made
            const actualSource = this.originNode.tab === leftTab ? this.originNode : this.destNode; //choose the node that is a source
            const actualTarget = this.destNode.tab === rightTab ? this.destNode : this.originNode;

            let foundLink;
            for (let idx in preferences['edges'])
                if (preferences['edges'][idx].source === actualSource && preferences['edges'][idx].target === actualTarget)
                    foundLink = idx;

            //link exists for source -> target, check if origin is a target and link does not exist yet
            if (foundLink && this.originNode.tab === rightTab) {
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

            m.redraw()
        };

        //update all names of nodes - changeID and id are not updated on name change to save room for other changes; probably unneccesary for a normal user (unlikely they will perform so many changes)
        this.svg.selectAll("text").text(function (d) {
            return d.name.length > 12 ? d.name.substring(0, 9) + "..." : d.name;
        });
    }

    //function that is called on every animated step of the SVG, handles boundary and node collision
    dyadTick(vnode) {
        let {preferences, metadata} = vnode.attrs;
        let bound = this.svg.node().getBoundingClientRect();

        if (!this.dragStarted) {
            let filteredNodes = preferences['nodes'].filter(node => node.tab in metadata['tabs']);
            const q = d3.quadtree().x((d) => d.x).y((d) => d.y).addAll(filteredNodes);
            filteredNodes.forEach(node => q.visit(this.collide(node)));
        }

        //node movement and display constrained here
        this.nodeGroup.attr("transform", function (d) {
            // console.log("transform D: ");
            // console.log(d);
            d.x = Math.max(dyadNodeRadius, Math.min(bound.width - dyadNodeRadius, d.x)); //test SVG boundary conditions
            d.y = Math.max(dyadNodeRadius, Math.min(bound.height - dyadNodeRadius, d.y));
            let [leftTab, rightTab] = Object.keys(metadata['tabs']);
            let {boundaryLeft, boundaryRight} = vnode.state;
            if (d.tab === leftTab && d.x > boundaryLeft)  //test source/target boundary conditions
                d.x = boundaryLeft;
            if (d.tab === rightTab && d.x < boundaryRight)
                d.x = boundaryRight;
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

            let sourcePadding, targetPadding;
            if (d.dup) {
                sourcePadding = dyadNodeRadius + 5;
                targetPadding = dyadNodeRadius + 5;
            }
            else {
                let [leftTab, rightTab] = Object.keys(metadata['tabs']);
                sourcePadding = (d.source.tab === rightTab) ? dyadNodeRadius + 5 : dyadNodeRadius; //spacing on the line before arrow head
                targetPadding = (d.target.tab === rightTab) ? dyadNodeRadius + 5 : dyadNodeRadius;
            }

            const sourceX = d.source.x + (sourcePadding * normX), sourceY = d.source.y + (sourcePadding * normY),
                targetX = d.target.x - (targetPadding * normX), targetY = d.target.y - (targetPadding * normY);

            return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
        });
    }

    //function called per dyadTick() to prevent collisions among nodes
    collide(node) {
        const r = dyadNodeRadius + dyadNodePadding, nx1 = node.x - r, nx2 = node.x + r, ny1 = node.y - r, ny2 = node.y + r;
        return function (quad, x1, y1, x2, y2) {
            if (quad.data && (quad.data !== node)) {
                let x = node.x - quad.data.x;
                let y = node.y - quad.data.y;
                let l = Math.sqrt(x * x + y * y);
                const r = dyadNodeRadius + dyadNodeRadius + dyadNodePadding;

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
        this.drag_line.attr('d', 'M' + this.originNode.x + ',' + this.originNode.y + 'L' + d3.pointer(context)[0] + ',' + d3.pointer(context)[1]);
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
        let {preferences, metadata} = vnode.attrs;
        this.updateSVG(vnode);
        this.dyadForce
            .nodes(preferences['nodes'].filter(node => node.tab in metadata['tabs'])).force("link")
            .links(preferences['edges'].filter(edge => edge.source.tab in metadata['tabs']));
        this.dyadForce.alpha(1).restart();
        this.resetMouseVars(vnode);
    }
}