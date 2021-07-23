import * as d3 from "d3";
import * as jStat from 'jstat';

import * as common from "../../common/common";
import m from "mithril";
import {hexToRgba} from "../app";

export default class ForceDiagram {
    oninit() {
        // strength parameter for group attraction/repulsion
        this.kGroupGravity = 4;
        // set when node is being dragged
        this.isDragging = false;
        this.selectedPebble = undefined;
        this.hoverPebble = undefined;
        this.frozenGroups = new Set();
        this.nodes = {};
        this.selectors = {};
        this.filtered = {};  // a cleaned copy of the data passed for pebbles, groups, etc.
        this.position = {};
    }

    onupdate({attrs, dom}) {

        // data
        let {
            pebbles=[], pebbleLinks=[],
            groups=[], groupLinks=[]
        } = attrs;

        let {
            setSelectedPebble, onDragOut, onDragAway, onDragOver
        } = attrs;

        let pebbleSet = new Set(pebbles);

        // remove duplicate pebbles
        pebbles = [...pebbleSet];

        // remove empty groups
        groups = groups
            .filter(group => [...group.nodes].some(node => pebbleSet.has(node)));
        let groupIds = new Set(groups.map(group => group.id));

        // remove nodes from groups that don't exist in the pebbles list
        groups.forEach(group => {
            group.nodes = new Set([...group.nodes].filter(pebble => pebbleSet.has(pebble)));
        });

        // remove links where the source or target doesn't exist
        pebbleLinks = pebbleLinks
            .filter(link => pebbleSet.has(link.source) && pebbleSet.has(link.target));
        groupLinks = groupLinks
            .filter(link => groupIds.has(link.source) && groupIds.has(link.target));

        let {width, height, x, y} = dom.getBoundingClientRect();

        // update internal nodes to be synchronized with passed pebbles
        pebbles
            .filter(pebble => !(pebble in this.nodes))
            .forEach(pebble => this.nodes[pebble] = {id: normalize(pebble), name: pebble, x: width * Math.random(), y: height * Math.random()});
        Object.keys(this.nodes)
            .filter(pebble => !pebbleSet.has(pebble))
            .forEach(pebble => delete this.nodes[pebble]);

        this.filtered = {
            pebbles, pebbleLinks,
            groups, groupLinks
        };

        // rebind data to elements in the force diagram
        // if this is called after hoverPebble assignment, the pebble jilts on hover
        attrs?.builders?.forEach?.(builder => builder(attrs, this));

        /**
         Define each pebble charge.
         */
        let uppersize = 7;
        function getPebbleCharge(d) {
            let groupSize = Math.max(...groups // find the size of the largest group that d is a member of
                .filter(group => group.nodes.has(d.name)) // find groups that contain node
                .map(group => group.nodes.size)); // grab the group size

            if (groupSize === -Infinity) return -800;
            if (d.name === attrs.selectedPebble) return -1000;

            // decrease charge as pebbles become smaller, so they can pack together
            return groupSize > uppersize ? -400 * uppersize / groupSize : -400;
        }

        let nodeArray = [...Object.values(this.nodes)];

        this.kGroupGravity = attrs.isPinned ? 0 : 6 / (groups.length || 1); // strength parameter for group attraction/repulsion
        this.force.nodes(nodeArray)

            .force('link', d3.forceLink(common.deepCopy(pebbleLinks)).id(d => d.id).distance(100).strength(.01)) // beware, pebbleLinks is mutated by forceLink
            .force('charge', d3.forceManyBody().strength(getPebbleCharge)) // prevent tight clustering
            .force('x', d3.forceX(width / 2).strength(.05))
            .force('y', d3.forceY(height / 2.5).strength(.05));

        if (this.hoverPebble !== attrs.hoverPebble) {
            if (!this.isPinned && this.hoverPebble && this.hoverPebble !== this.selectedPebble) {
                delete this.nodes[this.hoverPebble]?.fx;
                delete this.nodes[this.hoverPebble]?.fy;
            }
            this.hoverPebble = attrs.hoverPebble;

            if (this.hoverPebble && this.hoverPebble in this.nodes) Object.assign(this.nodes[this.hoverPebble], {
                fx: this.nodes[this.hoverPebble].x,
                fy: this.nodes[this.hoverPebble].y
            });
        }

        if (this.selectedPebble !== attrs.selectedPebble) {
            if (!this.isPinned && this.selectedPebble) {
                delete this.nodes[this.selectedPebble]?.fx;
                delete this.nodes[this.selectedPebble]?.fy;
            }
            this.selectedPebble = attrs.selectedPebble;

            if (this.selectedPebble && this.selectedPebble in this.nodes) Object.assign(this.nodes[this.selectedPebble], {
                fx: this.nodes[this.selectedPebble].x,
                fy: this.nodes[this.selectedPebble].y
            });
        }

        if (this.isPinned !== attrs.isPinned) {
            this.isPinned = attrs.isPinned;
            if (this.isPinned) Object.keys(this.nodes)
                .forEach(key => Object.assign(this.nodes[key], {
                    fx: this.nodes[key].x,
                    fy: this.nodes[key].y
                }));
            else Object.keys(this.nodes).forEach(key => {
                delete this.nodes[key].fx;
                delete this.nodes[key].fy;
            })
        }

        // called on each force animation frame
        let tick = () => {

            let groupCoords = new Map(groups.map(group => [
                group.id,
                [...group.nodes].map(node => [this.nodes[node].fx || this.nodes[node].x, this.nodes[node].fy || this.nodes[node].y])
            ]));

            let hullCoords = new Map(groups.filter(group => group.nodes.size > 0)
                .map(group => [
                    group.id,
                    d3.polygonHull(lengthen(groupCoords.get(group.id), attrs.hullRadius))
                ]));

            this.selectors.hulls.selectAll('path.hull')
                .attr('d', d => `M${hullCoords.get(d.id).join('L')}Z`);
            this.selectors.hulls.selectAll('path.hullLabelPath')
                .attr('d', d => `M${makeHullLabelSegment(hullCoords.get(d.id)).join('L')}Z`);

            // update positions of groupLines
            let centroids = new Map(hullCoords.keys().map(groupId => [groupId, getMean(groupCoords.get(groupId))]));

            let intersections = new Map(groupLinks.map(line => {
                let source = intersectLineHull(centroids.get(line.target), centroids.get(line.source), hullCoords.get(line.source), attrs.hullRadius);
                let target = intersectLineHull(centroids.get(line.source), centroids.get(line.target), hullCoords.get(line.target), attrs.hullRadius);

                if (source?.every?.(_ => _) && target?.every?.(_ => _)) {
                    // flip arrow direction when regions are overlapping
                    if (mag(sub(centroids.get(line.target), target)) > mag(sub(centroids.get(line.target), source)))
                        [source, target] = [target, source];

                    return [`${line.source}-${line.target}`, {source, target}]
                }
            }).filter(_=>_));

            this.selectors.groupLinks.filter(line => intersections.has(`${line.source}-${line.target}`))
                .attr('x1', line => (intersections.get(`${line.source}-${line.target}`).source || centroids.get(line.source))[0] || 0)
                .attr('y1', line => (intersections.get(`${line.source}-${line.target}`).source || centroids.get(line.source))[1] || 0)
                .attr('x2', line => (intersections.get(`${line.source}-${line.target}`).target || centroids.get(line.target))[0] || 0)
                .attr('y2', line => (intersections.get(`${line.source}-${line.target}`).target || centroids.get(line.target))[1] || 0);
            this.selectors.groupLinks.style("opacity", line => intersections.has(`${line.source}-${line.target}`) ? 1 : 0);
            // .style('opacity', line => Object.values(intersections[`${line.source}-${line.target}`]).flatMap(_ => _).some(v => v === undefined) ? 0 : 1)

            // NOTE: update positions of nodes BEFORE adjusting positions for group forces
            // This keeps the nodes centered in the group when resizing,
            // and the adjustment is still applied on the next tick regardless
            this.selectors.pebbles
                .attr('transform', d => `translate(${this.nodes[d].x},${this.nodes[d].y})`);

            // update positions of nodes (not implemented as a force because centroid computation is shared)
            // group members attract each other, repulse non-group members
            groups.filter(group => centroids.has(group.id)).forEach(group => {
                nodeArray.forEach(node => {
                    if (node.fx || node.fy) return;
                    let sign = group.nodes.has(node.name) ? 1 : -1;

                    let delta = [centroids.get(group.id)[0] - node.x, centroids.get(group.id)[1] - node.y];
                    let dist = Math.sqrt(delta.reduce((sum, axis) => sum + axis * axis, 0));
                    let norm = dist === 0 ? [0, 0] : delta.map(axis => axis / dist);

                    let dx = Math.min(norm[0], delta[0] / 100) * this.kGroupGravity * sign * this.force.alpha();
                    let dy = Math.min(norm[1], delta[1] / 100) * this.kGroupGravity * sign * this.force.alpha();
                    node.x += dx;
                    node.y += dy;
                    node.vx += dx * .1;
                    node.vy += dy * .1;
                });
            });

            pebbles.forEach(pebble => {
                this.nodes[pebble].x = Math.max(this.nodes[pebble].radius, Math.min(width - this.nodes[pebble].radius, this.nodes[pebble].x));
                this.nodes[pebble].y = Math.max(this.nodes[pebble].radius, Math.min(height - this.nodes[pebble].radius, this.nodes[pebble].y));
            });

            // draw directed edges with proper padding from node centers
            this.selectors.links.attr('d', d => {
                let deltaX = this.nodes[d.target].x - this.nodes[d.source].x,
                    deltaY = this.nodes[d.target].y - this.nodes[d.source].y,
                    dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
                    normX = deltaX / dist,
                    normY = deltaY / dist,
                    sourcePadding = this.nodes[d.source].radius + (d.left ? 5 : 0),
                    targetPadding = this.nodes[d.target].radius + (d.right ? 5 : 0),
                    sourceX = this.nodes[d.source].x + (sourcePadding * normX),
                    sourceY = this.nodes[d.source].y + (sourcePadding * normY),
                    targetX = this.nodes[d.target].x - (targetPadding * normX),
                    targetY = this.nodes[d.target].y - (targetPadding * normY);
                return `M${sourceX},${sourceY}L${targetX},${targetY}`;
            });

            // this.selectors.hulls.selectAll('text')
            //     .attr("transform", d => `translate(${centroids.get(d.id)[0] - d.id.length * 5},${centroids.get(d.id)[1]})`)
            // .attr('dy', d => centroids.get(d.id) - Math.min(...hullCoords[d.id].map(_ => _[1])))
        };
        this.force.on('tick', () => {
            // somehow tick is keeping a reference to an older 'this' after being rebound
            // this aggressively rebinds until something catches, which surprisingly works
            // TODO: RCA, TEMP FIX 7/19
            // try{tick()} catch(_) {
            //     m.redraw();
            // }
            tick()
        });
        this.force.alphaTarget(1).restart();
        setTimeout(() => {
            if (this.isDragging) return;
            this.force.alphaTarget(0).restart();
        }, 1000);

        let updatePosition = e => {
            this.position = {x: e.pageX - x, y: e.pageY - y};

            // context line from a pebble
            if (attrs.contextPebble && this.position.x && this.position.y) this.selectors.nodeDragLine
                .attr('display', 'block')
                .attr('d', `M${this.nodes[attrs.contextPebble].x},${this.nodes[attrs.contextPebble].y}L${this.position.x},${this.position.y}`)
                .style('stroke', 'black')
                .style('stroke-width', '4px');
            // context line from a group
            else if (attrs.contextGroup && this.position.x && this.position.y) {
                let sourceCoords = d3.polygonHull(lengthen([...groups.find(group => group.id === attrs.contextGroup.id).nodes]
                    .map(node => [this.nodes[node].fx || this.nodes[node].x, this.nodes[node].fy || this.nodes[node].y], 0)))

                let sourceCenter = getMean(sourceCoords);

                let sourceIntersection = intersectLineHull([this.position.x, this.position.y], sourceCenter, sourceCoords, attrs.hullRadius);
                // let source = sourceIntersection?.every?.(v => !isNaN(v)) ? sourceIntersection : sourceCenter;
                this.selectors.nodeDragLine
                    .attr('display', sourceIntersection ? 'block' : 'none')
                    .attr('d', `M${sourceIntersection}L${this.position.x},${this.position.y}`)
                    .style('stroke', attrs.contextGroup.color)
                    .style('stroke-width', '5px')
            }
            else {
                this.selectors.nodeDragLine.attr('display', 'none');
                this.position = {};
            }
        }
        // track mouse position for dragging, remove arrow on click
        d3.select(dom)
            .on('mousemove', (attrs.contextPebble || attrs.contextGroup) && updatePosition)
            .on('click', e => {
                if (attrs.contextGroup) {
                    groups.filter(group => group.nodes.size > 0)
                        .filter(group => isInside([this.position.x, this.position.y], d3.polygonHull(lengthen(
                            [...group.nodes].map(node => [this.nodes[node].x, this.nodes[node].y]),
                            attrs.hullRadius, true))))
                        .forEach(group => attrs.groupEvents.contextmenu(e, group));
                }

                attrs.contextPebble = undefined;
                attrs.contextGroup = undefined;
                this.selectors.nodeDragLine.attr('display', 'none')
            });

        d3.select(dom)
            .call(d3.drag()
                .container(dom)
                .subject(e => this.force.find(e.x, e.y))
                .on("start", e => {
                    let {x: offsetX, y: offsetY} = dom.getBoundingClientRect();
                    if (Math.sqrt(Math.pow(e.sourceEvent.x - e.subject.x - offsetX, 2) + Math.pow(e.sourceEvent.y - e.subject.y - offsetY, 2)) > e.subject.radius * 2) {
                        setSelectedPebble(undefined);
                        return;
                    }
                    this.isDragging = true;
                    if (!e.active) this.force.alphaTarget(1).restart();
                    if (e.subject.x !== undefined)
                        e.subject.fx = e.subject.x;
                    if (e.subject.y !== undefined)
                        e.subject.fy = e.subject.y;
                    this.startDragLocation = [e.subject.x, e.subject.y];
                    m.redraw()
                })
                .on("drag", e => {
                    if (!this.isDragging) return;
                    e.subject.fx = e.x;
                    e.subject.fy = e.y;

                    // manually update location of the dragged pebble
                    this.selectors.pebbles
                        .filter(d => d === e.subject.name)
                        .attr('transform', d => `translate(${this.nodes[d].fx},${this.nodes[d].fy})`);

                    if (onDragOver) {
                        let hullCoords = new Map(groups.filter(group => group.nodes.size > 0)
                            .map(group => [
                                group.id,
                                d3.polygonHull(lengthen(
                                    [...group.nodes].map(node => [this.nodes[node].x, this.nodes[node].y]),
                                    attrs.hullRadius, true))
                            ]));

                        // don't freeze own group
                        groups
                            .filter(group => group.nodes.has(e.subject.name))
                            .forEach(group => hullCoords.delete(group.id));

                        hullCoords.keys().forEach(groupId => {
                            if (isInside([e.subject.fx, e.subject.fy], hullCoords.get(groupId))) {
                                this.frozenGroups.add(groupId);
                                !this.isPinned && groups.find(group => group.id === groupId).nodes.forEach(node => {
                                    node = this.nodes[node];
                                    if (!node.fx) node.fx = node.x;
                                    if (!node.fy) node.fy = node.y;
                                })
                            } else if (this.frozenGroups.has(groupId)) {
                                !this.isPinned && groups.find(group => group.id === groupId).nodes.forEach(node => {
                                    if (node === this.selectedPebble?.name) return;
                                    delete this.nodes[node].fx;
                                    delete this.nodes[node].fy;
                                })
                            }
                        });
                    }
                })
                .on("end", e => {
                    if (!this.isDragging) return;
                    this.isDragging = false;
                    if (!e.active) this.force.alphaTarget(0);

                    !this.isPinned && [...this.frozenGroups].forEach(groupId => {
                        let nodeNames = [...groups.find(group => group.id === groupId).nodes];
                        nodeNames.forEach(node => {
                            if (node === this.selectedPebble?.name) return;
                            delete this.nodes[node].fx;
                            delete this.nodes[node].fy;
                        })
                    });

                    if (onDragOut) // hook for when a node is dragged out of the scene
                        if (e.subject.fx < 0 || e.subject.fx > width || e.subject.fy < 0 || e.subject.fy > height) {
                            onDragOut(e.subject.name);
                            return;
                        }

                    let dragCoord = [e.x, e.y];

                    // prevent drag actions if the drag distance is too small
                    if (Math.abs(mag(sub(dragCoord, this.startDragLocation))) < 50) return;

                    let hullCoords;
                    if (onDragOver || onDragAway) {
                        hullCoords = new Map(groups.filter(group => group.nodes.size > 0)
                            .map(group => [
                                group.id,
                                d3.polygonHull(lengthen(
                                    [...group.nodes].map(node => [this.nodes[node].x, this.nodes[node].y]),
                                    attrs.hullRadius, true))
                            ]));
                    }

                    if (onDragAway) {
                        groups
                            .filter(group => group.nodes.has(e.subject.name))
                            .filter(group => {
                                if (group.nodes.size === 1)
                                    return false;
                                if (group.nodes.size === 2)
                                    return mag(sub(...hullCoords.get(group.id))) > 50;

                                let reducedHull = hullCoords.get(group.id)
                                    .filter(coord => coord[0] !== dragCoord[0] && coord[1] !== dragCoord[1]);
                                let centroidReduced = jamescentroid(reducedHull);
                                let distanceDragged = mag(sub(dragCoord, centroidReduced));

                                return !reducedHull
                                    .some(coord => mag(sub(coord, centroidReduced)) * 5 > distanceDragged);
                            })
                            .forEach(group => onDragAway(e.subject, group.id))
                    }

                    if (onDragOver) {
                        groups
                            .filter(group => group.nodes.has(e.subject.name))
                            .forEach(group => hullCoords.delete(group.id));
                        hullCoords.keys()
                            .filter(groupId => isInside(dragCoord, hullCoords.get(groupId)))
                            .forEach(groupId => onDragOver(e.subject, groupId))
                    }

                    if (this.isPinned || e.subject.name === this.hoverPebble || e.subject.name === this.selectedPebble) return;
                    e.subject.x = dragCoord[0];
                    e.subject.y = dragCoord[1];
                    delete e.subject.fx;
                    delete e.subject.fy;
                    m.redraw();
                }));
    }

    oncreate({attrs: state, dom}) {
        let {nodes} = state;

        let svg = d3.select(dom);
        this.nodes = nodes || this.nodes;

        // define arrow markers for graph links
        svg.append('svg:defs').append('svg:marker')
            .attr('id', 'end-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 6)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M0,-5L10,0L0,5')
            .style('fill', '#000');
        svg.append('svg:defs').append('svg:marker')
            .attr('id', 'end-arrow-plus')
            .attr('viewBox', '0 -5 10 10')
            .attr('overflow', 'visible')
            .attr('refX', 4)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
            .append('svg:path')
            //          arrow               top edge        right edge      bottom edge        left edge          return
            .attr('d', 'M0,-5L10,0L0,5L0,-5 L-6,4L-4,4L-4,8 L0,8L0,10L-4,10 L-4,14L-6,14L-6,10 L-10,10L-10,8L-6,8 L-6,4')
            .style('fill', '#000');
        svg.append('svg:defs').append('svg:marker')
            .attr('id', 'end-arrow-minus')
            .attr('viewBox', '0 -5 10 10')
            .attr('overflow', 'visible')
            .attr('refX', 4)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
            .append('svg:path')
            //          arrow                top edge   bottom edge  return
            .attr('d', 'M0,-5L10,0L0,5L0,-5 L-6,4L-4,4 L-4,14L-6,14 L-6,4')
            .style('fill', '#000');
        svg.append('svg:defs').append('svg:marker')
            .attr('id', 'start-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 4)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M10,-5L0,0L10,5')
            .style('fill', '#000');
        svg.append('svg:defs').append('svg:marker')
            .attr('id', 'start-arrow-plus')
            .attr('viewBox', '0 -5 10 10')
            .attr('overflow', 'visible')
            .attr('refX', 4)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
            .append('svg:path')
            //          arrow                top edge        right edge        bottom edge        left edge        return
            .attr('d', 'M10,5L10,-5L0,0L10,5 L14,4L16,4L16,8 L20,8L20,10L16,10 L16,14L14,14L14,10 L10,10L10,8L14,8 L14,4')
            .style('fill', '#000');
        svg.append('svg:defs').append('svg:marker')
            .attr('id', 'start-arrow-minus')
            .attr('viewBox', '0 -5 10 10')
            .attr('overflow', 'visible')
            .attr('refX', 4)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
            .append('svg:path')
            //          arrow                top edge   bottom edge  return
            .attr('d', 'M10,5L10,-5L0,0L10,5 L14,4L16,4 L16,14L14,14 L14,4')
            .style('fill', '#000');

        this.selectors.groupLinkDefs = svg // group line defs handle
            .append("svg:defs")
            .attr('id', 'groupLinkDefs')
            .selectAll('marker');
        this.selectors.groupLinkPositiveDefs = svg // group line defs handle
            .append("svg:defs")
            .attr('id', 'groupLinkPositiveDefs')
            .selectAll('marker');
        this.selectors.groupLinkNegativeDefs = svg // group line defs handle
            .append("svg:defs")
            .attr('id', 'groupLinkNegativeDefs')
            .selectAll('marker');
        this.selectors.groupLinks = svg // group lines handle
            .append('svg:g')
            .attr('id', 'groupLinks')
            .selectAll('line');

        // this.selectors.hullBackgrounds = svg // group hulls handle
        //     .append('svg:g')
        //     .attr('id', 'hullBackings')
        //     .selectAll('g');
        this.selectors.hulls = svg // group hulls handle
            .append('svg:g')
            .attr('id', 'hulls')
            .selectAll('svg');

        this.selectors.links = svg // links handle
            .append('svg:g')
            .attr('id', 'links')
            .selectAll('path');
        this.selectors.pebbles = svg  // nodes handle
            .append('svg:g')
            .attr('id', 'pebbles')
            .selectAll('g');

        // line displayed when dragging new nodes
        this.selectors.nodeDragLine = svg.append('svg:path')
            .attr('class', 'link dragline')
            .attr('d', 'M0,0L0,0');

        this.force = d3.forceSimulation([...Object.values(this.nodes)]);

        this.onupdate({attrs: state, dom});
    }

    view({attrs}) {
        return m('svg',
            common.mergeAttributes({
                width: '100%',
                height: '100%'
            }, attrs.attrsAll || {})
        );
    }
}


/**
 find something centerish to the vertices of a convex hull
 (specifically, the center of the bounding box)
 */
function jamescentroid(coord) {
    let minx = coord[0][0],
        maxx = coord[0][0],
        miny = coord[0][1],
        maxy = coord[0][1];
    for (let j = 1; j < coord.length; j++) {
        if (coord[j][0] < minx) minx = coord[j][0];
        if (coord[j][1] < miny) miny = coord[j][1];
        if (coord[j][0] > maxx) maxx = coord[j][0];
        if (coord[j][1] > maxy) maxy = coord[j][1];
    }
    return [(minx + maxx) / 2, (miny + maxy) / 2];
}

let sub = (a, b) => a.reduce((out, _, i) => [...out, a[i] - b[i]], []);
let add = (a, b) => a.reduce((out, _, i) => [...out, a[i] + b[i]], []);
let mul = (a, b) => a.map(e => e * b);
// let dot = (a, b) => a.reduce((out, _, i) => out + a[i] * b[i], 0);
let mag = a => Math.sqrt(a.reduce((out, e) => out + e * e, 0));
// let dist = (a, b) => mag(sub(b, a));
let getMean = points => points.reduce((center, point) =>
    [center[0] + point[0] / points.length, center[1] + point[1] / points.length], [0, 0])

let unitNormal = function (p0, p1) {
    // Returns the unit normal to the line segment from p0 to p1.
    let difference = sub(p1, p0);
    let magnitude = mag(difference);
    return [-difference[1] / magnitude, difference[0] / magnitude];
};

/**
 *
 * @param a1 source coordinates
 * @param a2 target coordinates
 * @param points list of coordinates of points on hull
 * @param radius
 * @returns {*}
 */
let intersectLineHull = (a0, a1, points, radius) => {
    if (!a0 || !a1 || !points) return;

    for (let i = 0; i < points.length; i++) {
        let [b0, b1] = [points[i], points[(i + 1) % points.length]];
        let offset = unitNormal(b0, b1);
        offset = mul(offset, radius);
        let int = intersectLineLine(add(b0, offset), add(b1, offset), a0, a1);
        if (int !== undefined) return int;
    }

    let intersections = []
    for (let point of points) {
        let [dx, dy] = sub(a1, a0);

        let a0c = sub(a0, point);
        let A = dx * dx + dy * dy;
        let B = 2 * (dx * a0c[0] + dy * a0c[1]);
        let C = a0c[0] * a0c[0] + a0c[1] * a0c[1] - radius * radius;
        let determinant = B * B - 4 * A * C;

        if ((A <= 0.0000001) || (determinant < 0)) continue;
        let t;
        if (determinant === 0) {
            t = -B / (2 * A);
            intersections.push([a0[0] + t * dx, a0[1] + t * dy]);
        } else {
            t = (-B + Math.sqrt(determinant)) / (2 * A);
            intersections.push([a0[0] + t * dx, a0[1] + t * dy]);
            t = (-B - Math.sqrt(determinant)) / (2 * A);
            intersections.push([a0[0] + t * dx, a0[1] + t * dy]);
        }
    }
    let closestInt = intersections.reduce(([minMag, j], cand, i) => {
        let candMag = mag(sub(a0, cand));
        return candMag < minMag ? [candMag, i] : [minMag, j]
    }, [Infinity, -1])[1];
    if (closestInt > -1) return intersections[closestInt];
}

// compute the intersection between the line from p1 to p2 against the line from p3 to p4
let intersectLineLine = (p1, p2, p3, p4) => {
    let det = (p4[0] - p3[0]) * (p1[1] - p2[1]) - (p1[0] - p2[0]) * (p4[1] - p3[1]);
    if (det === 0) return;

    // ua is the reparameterization for the segment p1 - p2
    let ua = ((p3[1] - p4[1]) * (p1[0] - p3[0]) + (p4[0] - p3[0]) * (p1[1] - p3[1])) / det;
    let ub = ((p1[1] - p2[1]) * (p1[0] - p3[0]) + (p2[0] - p1[0]) * (p1[1] - p3[1])) / det;

    let eps = 1e-5;
    if (-eps <= ua && ua <= 1 + eps && -eps <= ub && ub <= 1 + eps) {
        return [
            p1[0] + ua * (p2[0] - p1[0]),
            p1[1] + ua * (p2[1] - p1[1])
        ]
    }
};

function isInside(point, vs) {
    // ray-casting algorithm based on
    // https://wrf.ecse.rpi.edu//Research/Short_Notes/pnpoly.html

    let x = point[0], y = point[1];

    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i][0], yi = vs[i][1];
        let xj = vs[j][0], yj = vs[j][1];

        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi))
            inside = !inside;
    }

    return inside;
}

let makeHullLabelSegment = coords => {

    let center = getMean(coords);

    let segments = coords
        .map((p0, i) => [p0, coords[(i + 1) % coords.length]])
        .filter(([p0, p1]) => p0[0] <= p1[0]);
    let idealTheta = Math.PI * 1.5;
    let worstTheta = (idealTheta + Math.PI) % (Math.PI * 2);
    let segment = segments[segments
        .map(segment => {
            let [dx, dy] = sub(getMean(segment), center);
            return Math.atan2(dy, dx)
        })
        .reduce(([bestTheta, j], theta, i) =>
            Math.abs((idealTheta - theta) % (Math.PI * 2)) > Math.abs((idealTheta - bestTheta) % (Math.PI * 2))
                ? [bestTheta, j]
                : [theta, i],
            [worstTheta, 0])[1]];

    if (segment[0][0] < segment[1][0])
        segment = [segment[1], segment[0]]

    // adjust the right point to ensure segment length is 200 px
    let v = sub(segment[1], segment[0]);
    return [sub(segment[1], mul(v, 200 / mag(v))), segment[1]]
}


function lengthen(coords, radius, isDragging) {
    // d3.geom.hull returns null for two points, and fails if three points are in a line,
    // so this puts a couple points slightly off the line for two points, or around a singleton.
    if (coords.length === 2) {
        let magnitude = 1 / 16;
        let deltax = coords[0][0] - coords[1][0];
        let deltay = coords[0][1] - coords[1][1];
        coords.push([
            (coords[0][0] + coords[1][0]) / 2 + deltay * magnitude,
            (coords[0][1] + coords[1][1]) / 2 + deltax * magnitude
        ]);
        coords.push([
            (coords[0][0] + coords[1][0]) / 2 - deltay * magnitude,
            (coords[0][1] + coords[1][1]) / 2 - deltax * magnitude
        ]);
        coords.push([
            (coords[0][0] + coords[1][0]) / 2 - deltax * magnitude,
            (coords[0][1] + coords[1][1]) / 2 + deltay * magnitude
        ]);
        coords.push([
            (coords[0][0] + coords[1][0]) / 2 + deltax * magnitude,
            (coords[0][1] + coords[1][1]) / 2 - deltay * magnitude
        ]);
    }
    // extend the vertices of the region to be similar to rounded parts
    if (coords.length === 1) {
        let delta = 10;
        coords.push([coords[0][0] + delta, coords[0][1] + delta]);
        coords.push([coords[0][0] - delta, coords[0][1] + delta]);
        coords.push([coords[0][0] + delta, coords[0][1] - delta]);
        coords.push([coords[0][0] - delta, coords[0][1] - delta]);

        coords.push([coords[0][0] + Math.sqrt(2) * delta, coords[0][1]]);
        coords.push([coords[0][0] - Math.sqrt(2) * delta, coords[0][1]]);
        coords.push([coords[0][0], coords[0][1] + Math.sqrt(2) * delta]);
        coords.push([coords[0][0], coords[0][1] - Math.sqrt(2) * delta]);
    }
    if (isDragging) {
        let centroid = coords.reduce((out, point) => [out[0] + point[0] / coords.length, out[1] + point[1] / coords.length], [0, 0])
        coords = coords.map(coord => {
            let angle = Math.atan2(coord[1] - centroid[1], coord[0] - centroid[0])
            return [coord[0] + Math.cos(angle) * radius, coord[1] + Math.sin(angle) * radius]
        })
    }
    return coords;
}

// normalize: text -> html id
let normalize = text => text.replace(/\W/g,'_');

// ~~~~~~~~~~~~~~~~~~~~~~~
// BEGIN BUILDER FUNCTIONS

let pebbleBuilderArcs = (state, context, newPebbles) => {
    newPebbles
        .append('svg:g')
        .attr('id', pebble => 'pebbleArcs' + pebble)
        .attr('class', 'arc')
        .attr('opacity', 0);

    context.selectors.pebbles
        .selectAll('g.arc')
        .transition()  // Animate transitions between styles
        .duration(state.selectTransitionDuration)
        .style('opacity', d => (d === state.hoverPebble || d === state.selectedPebble) ? 1 : 0)
        .on('start', function () {
            d3.select(this).style('display', 'block')
        }) // prevent mouseovers/clicks from opacity:0 elements
        .on('end', function (d) {
            if (d === state.hoverPebble || d === state.selectedPebble) return;
            d3.select(this).style('display', 'none');
        });

    // construct and update arcs for hovered/selected pebbles
    context.selectors.pebbles
        .selectAll('g.arc').filter(d => d === state.hoverPebble || d === state.selectedPebble).each(function (pebble) {
        let data = {name: '', children: state.labels(pebble)};
        let setWidths = node => {
            if ('children' in node) {
                node.children.forEach(setWidths);
                node.value = 0;
            }
            else node.value = node.name.length + 5;
        };
        setWidths(data);

        let root = d3.hierarchy(data);

        let x = d3.scaleLinear().range([0, 2 * Math.PI]);
        let partition = d3.partition();

        let arc = d3.arc()
            .startAngle(function (d) {
                return Math.max(0, Math.min(2 * Math.PI, x(d.x0)));
            })
            .endAngle(function (d) {
                return Math.max(0, Math.min(2 * Math.PI, x(d.x1)));
            })
            .innerRadius(function (d) {
                if (d.depth === 0) return 0;
                return context.nodes[pebble].radius + state.arcGap + (state.arcGap + state.arcHeight) * (d.depth - 1)
            })
            .outerRadius(function (d) {
                if (d.depth === 0) return context.nodes[pebble].radius;
                return context.nodes[pebble].radius + (state.arcGap + state.arcHeight) * d.depth
            });

        // add paths for new nodes
        d3.select(this).selectAll('path')
            .data(partition(root.sum(d => d.value)).descendants(), label => label.data.id)
            .attr("d", arc)
            .enter()
            .append("path")
            .attr('id', label => 'arc' + label.data.id + pebble)
            .attr('opacity', 0.4)
            .style("fill", d => {
                if (d.depth === 0) return 'transparent';
                return d3.rgb(d.data.attrs.fill)
            })
            .append("title");

        // remove paths for old nodes
        d3.select(this).selectAll('path')
            .data(partition(root).descendants(), label => label.data.id)
            .exit()
            .remove();

        // update paths for existing nodes
        d3.select(this).selectAll('path')
            .data(partition(root).descendants(), label => label.data.id)
            .on("click", (e, label) => label.data.onclick(e, pebble))
            .on('mouseover', e => state.pebbleEvents.mouseover(e, pebble))
            .on('mouseout', e => state.pebbleEvents.mouseout(e, pebble))
            .on('contextmenu', e => state.pebbleEvents.contextmenu(e, pebble))
            .transition()  // Animate transitions between styles
            .duration(state.selectTransitionDuration)
            .attr("d", arc);

        // add texts for new nodes
        d3.select(this).selectAll('text')
            .data(partition(root).descendants(), label => label.data.id)
            .enter()
            .append('text')
            .attr("id", label => 'arcText' + label.data.id + pebble)
            .attr("x", 6)
            .attr("dy", 11.5)
            .attr('opacity', 0.8)
            .append("textPath")
            .attr("xlink:href", label => '#arc' + label.data.id + pebble)
            .text(label => label.data.name);

        // remove text for old nodes
        d3.select(this).selectAll('text')
            .data(partition(root).descendants(), label => label.data.id)
            .exit()
            .remove();

        // update text for changed nodes
        d3.select(this).selectAll('textPath')
            .data(partition(root).descendants(), label => label.data.id)
            .attr("xlink:href", label => '#arc' + label.data.id + pebble)
            .text(label => label.data.name);

        d3.select(this).selectAll('path').selectAll('title')
            .text(d => d.data.title ?? d.data.name);
    });
};

let pebbleBuilderCircles = (attrs, context, newPebbles) => {
    newPebbles
        .append('svg:circle')
        .attr('class', 'node')
        .style('pointer-events', 'inherit')
        .style('opacity', "0.5");

    // update existing nodes
    context.selectors.pebbles
        .selectAll('circle.node')
        .style('fill', pebble => d3.rgb(context.nodes[pebble].nodeCol))
        .style('stroke', pebble => d3.rgb(context.nodes[pebble].strokeColor))
        .style('stroke-width', pebble => context.nodes[pebble].strokeWidth)
        .transition()  // Animate transitions between styles
        .duration(attrs.selectTransitionDuration)
        .attr('r', pebble => context.nodes[pebble].radius);

    // bind all events to the plot
    Object.keys(attrs.pebbleEvents)
        .forEach(event => context.selectors.pebbles.selectAll('circle.node')
            .on(event, attrs.pebbleEvents[event]));
};

let pebbleBuilderLabels = (attrs, context, newPebbles) => {
    newPebbles
        .append('svg:text')
        .attr('class', 'id')
        .attr('id', pebble => 'pebbleLabel' + pebble)
        .attr('x', 0)
        .attr('y', 15);

    context.selectors.pebbles
        .selectAll('text.id')
        .text(d => d)
        .transition()  // Animate transitions between styles
        .duration(attrs.selectTransitionDuration)
        .style('font-size', pebble => context.nodes[pebble].radius * .175 + 7 + 'px');
};

let colors = d3.scaleOrdinal(d3.schemeCategory10);
let speckCoords = Array.from({length: 100})
    .map((_, i) => ({id: i, x: jStat.normal.sample(0, 1), y: jStat.normal.sample(0, 1)}));

let pebbleBuilderPlots = (attrs, context, newPebbles) => {
    newPebbles
        .append('g')
        .attr('class', 'pebble-plot')
        .attr('opacity', 0.4);

    context.selectors.pebbles.select('g.pebble-plot')
        .attr('class', function(pebble) {
            let className = {
                'continuous': 'density-plot',
                'bar': 'bar-plot',
                'collapsed': 'speck-plot'
            }[attrs.summaries[pebble]?.pdfPlotType] || 'bar-plot';

            // delete old plot if plot type changed
            if (!this.classList.contains(className))
                d3.select(this).selectAll('.embedded-plot').remove();

            return 'pebble-plot ' + className
        });

    context.selectors.pebbles
        .select('g.speck-plot').each(function (pebble) {

        let groupSpeckCoords = speckCoords.slice(0, attrs.summaries[pebble].childNodes.size);

        let width = context.nodes[pebble].radius * 1.5;
        let height = context.nodes[pebble].radius * 1.5;

        let x = d3.scaleLinear().range([0, width]).domain([-2, 2]);
        let y = d3.scaleLinear().range([height + 20, 20]).domain([-2, 2]);

        let circleSelection = d3.select(this).selectAll("circle.embedded-plot").data(groupSpeckCoords);
        circleSelection.exit().remove();
        circleSelection.enter().append("circle").attr('class', 'embedded-plot');

        // bind all events to the plot
        Object.keys(attrs.pebbleEvents)
            .forEach(event => circleSelection
                .on(event, e => attrs.pebbleEvents[event](e, pebble)));

        d3.select(this).selectAll("circle.embedded-plot").data(groupSpeckCoords)
            .transition()
            .duration(attrs.selectTransitionDuration)
            .attr("r", 5)
            .attr("cx", function(d) { return x(d.x); })
            .attr("cy", function(d) { return y(d.y); })
            .attr("fill", d => colors(d.id))
            .attr("transform", "translate(" + (-width / 2) + "," + (-height) + ")");

    });

    context.selectors.pebbles
        .select('g.density-plot').each(function (pebble) {
        let summary = attrs.summaries[pebble];
        if (!summary || !summary.pdfPlotX) {
            d3.select(this).selectAll('path')
                .data([]).exit().remove();
            return;
        }

        let width = context.nodes[pebble].radius * 1.5;
        let height = context.nodes[pebble].radius * 0.75;

        let xScale = d3.scaleLinear()
            .domain(d3.extent(summary.pdfPlotX))
            .range([0, width]);
        let yScale = d3.scaleLinear()
            .domain(d3.extent(summary.pdfPlotY))
            .range([height, 0]);

        let area = d3.area()
            .curve(d3.curveMonotoneX)
            .x(d => xScale(d.x))
            .y0(height)
            .y1(d => yScale(d.y));

        // append path if not exists
        let plotSelection = d3.select(this).selectAll('path')
            .attr('class', 'embedded-plot')
            .data([null]).enter().append('path')
            .attr("class", "area")
            .attr("fill", common.colors.steelBlue);

        // bind all events to the plot
        Object.keys(attrs.pebbleEvents)
            .forEach(event => plotSelection
                .on(event, e => attrs.pebbleEvents[event](e, pebble)));

        // rebind the path datum regardless of if path existed
        d3.select(this).selectAll('path')
            .datum(summary.pdfPlotX.map((x_i, i) => ({x: summary.pdfPlotX[i], y: summary.pdfPlotY[i]})))
            .transition()
            .duration(attrs.selectTransitionDuration)
            .attr("d", area)
            .attr("transform", "translate(" + (-width / 2) + "," + (-height) + ")");
    });

    context.selectors.pebbles
        .select('g.bar-plot').each(function (pebble) {
        let summary = attrs.summaries[pebble];

        if (!summary || !summary.plotValues) {
            d3.select(this).selectAll('rect')
                .data([]).exit().remove();
            return;
        }

        let width = context.nodes[pebble].radius * 1.5;
        let height = context.nodes[pebble].radius * 0.75;

        let barPadding = .015; // Space between bars
        let barLimit = 15;
        let keys = Object.keys(summary.plotValues);
        let data = keys
            .filter((key, i) => keys.length < barLimit || !(i % parseInt(keys.length / barLimit)) || i === keys.length - 1)
            .map((key, i) => ({
                x: summary.nature === 'nominal' ? i : Number(key),
                y: summary.plotValues[key]
            })).sort((a, b) => b.x - a.x);

        let maxY = d3.max(data, d => d.y);
        let [minX, maxX] = d3.extent(data, d => d.x);

        let xScale = d3.scaleLinear()
            .domain([minX - 0.5, maxX + 0.5])
            .range([0, width]);

        let yScale = d3.scaleLinear()
            .domain([0, maxY])
            .range([0, height]);

        let rectSelection = d3.select(this).selectAll("rect").attr('class', 'embedded-plot').data(data);
        rectSelection.exit().remove();
        rectSelection.enter().append("rect");

        // bind all events to the plot
        Object.keys(attrs.pebbleEvents)
            .forEach(event => rectSelection.on(event, e => attrs.pebbleEvents[event](e, pebble)));

        d3.select(this).selectAll("rect").data(data)
            .transition()
            .duration(attrs.selectTransitionDuration)
            .attr("x", d => xScale(d.x - 0.5 + barPadding))
            .attr("y", d => yScale(maxY - d.y))
            .attr("width", xScale(minX + 0.5 - 2 * barPadding)) // the "width" is the coordinate of the end of the first bar
            .attr("height", d => yScale(d.y))
            .attr("fill", common.colors.steelBlue)
            .attr("transform", "translate(" + (-width / 2) + "," + (-height) + ")");
    });
};


// builder for pebbles without labels
export let pebbleBuilder = (attrs, context) => {
    attrs.mutateNodes(attrs, context);

    context.selectors.pebbles = context.selectors.pebbles.data(context.filtered.pebbles, _ => _);
    context.selectors.pebbles.exit().remove();

    let newPebbles = context.selectors.pebbles
        .enter().append('svg:g')
        .attr('id', pebble => pebble + 'biggroup');

    context.selectors.pebbles = context.selectors.pebbles.merge(newPebbles);
    pebbleBuilderCircles(attrs, context, newPebbles);
    pebbleBuilderLabels(attrs, context, newPebbles);
    pebbleBuilderPlots(attrs, context, newPebbles);
};

// builder for pebbles with labels
export let pebbleBuilderLabeled = (attrs, context) => {
    attrs.mutateNodes(attrs, context);

    let nonemptyPebbles = context.filtered.pebbles
        .filter(pebble => attrs.summaries[pebble]?.pdfPlotType !== "nonexistent");

    context.selectors.pebbles = context.selectors.pebbles.data(nonemptyPebbles, _ => _);
    context.selectors.pebbles.exit().remove();

    let newPebbles = context.selectors.pebbles
        .enter().append('svg:g')
        .attr('id', pebble => pebble + 'biggroup');

    context.selectors.pebbles = context.selectors.pebbles.merge(newPebbles);

    pebbleBuilderArcs(attrs, context, newPebbles);
    pebbleBuilderCircles(attrs, context, newPebbles);
    pebbleBuilderLabels(attrs, context, newPebbles);
    pebbleBuilderPlots(attrs, context, newPebbles);
};


export let groupBuilder = (attrs, context) => {
    // rebind data
    context.selectors.hulls = context.selectors.hulls
        .data(context.filtered.groups, group => JSON.stringify(group));
    // remove hulls that no longer exist
    context.selectors.hulls.exit().remove();
    let newHulls = context.selectors.hulls.enter()
        .append('svg:g')
        .attr('id', group => group.id + 'group');

    context.selectors.hulls = context.selectors.hulls.merge(newHulls);

    // add new paths
    newHulls.append("path")
        .attr('class', 'hull')
        .attr("id", group => group.id + 'Hull')
        .style('stroke-linejoin', 'round');
    newHulls.append("path")
        .attr('class', 'hullLabelPath')
        .attr("id", group => group.id + 'HullLabelPath')

    // update all hulls
    context.selectors.hulls.selectAll('path.hull')
        .style("fill", group => group.color)
        .style("stroke", group => group.color)
        .style("stroke-width", attrs.hullRadius * 2)
        .style('opacity', group => group.opacity);

    context.selectors.hulls.selectAll('path.hull').each(function(group) {
        d3.select(this)
            .on('click', e => attrs.groupEvents.click(e, group))
            .on('contextmenu', e => attrs.groupEvents.contextmenu(e, group))
    })

    // add new texts
    newHulls.append('text')
        .attr("dy", 60)
        .attr("dx", 0)
        .append('textPath')
        .attr('startOffset', '50%')
        .attr('alignment-baseline', 'middle')

    context.selectors.hulls.selectAll('textPath')
        .attr("xlink:href", group => `#${group.id}HullLabelPath`)
        .style("opacity", group => group.opacity)
        .text(group => group.name);
};

export let linkBuilder = (attrs, context) => {
    let marker = side => x => {
        let postfix = '';
        if (x.sign === 'plus') postfix = '-plus'
        if (x.sign === 'minus') postfix = '-minus'

        if (side === 'end' && x.right || side === 'start' && x.left)
            return `url(#${side}-arrow${postfix})`;
        return ''
    };

    context.selectors.links = context.selectors.links.data(context.filtered.pebbleLinks, link => `${link.source}-${link.target}`);
    context.selectors.links.exit().remove();
    context.selectors.links = context.selectors.links.enter()
        .append('svg:path')
        .attr('class', 'link')
        .style('stroke', 'black')
        .style('stroke-width', '4px')
        .on('mousedown', attrs.onclickLink || Function)
        .merge(context.selectors.links);

    // update these attrs every time
    context.selectors.links
        .classed('selected', link => link.selected)
        .style('marker-start', marker('start'))
        .style('marker-end', marker('end'));
};


export let groupLinkBuilder = (attrs, context) => {
    [
        ['-plus', 'groupLinkPositiveDefs', 'M0,-5L10,0L0,5L0,-5 L-6,4L-4,4L-4,8 L0,8L0,10L-4,10 L-4,14L-6,14L-6,10 L-10,10L-10,8L-6,8 L-6,4'],
        ['', 'groupLinkDefs', 'M0,-5L10,0L0,5'],
        ['-minus', 'groupLinkNegativeDefs', 'M0,-5L10,0L0,5L0,-5 L-6,4L-4,4 L-4,14L-6,14 L-6,4']
    ].forEach(([suffix, key, path]) => {
        context.selectors[key] = context.selectors[key].data(context.filtered.groupLinks, link => `${link.source}-${link.target}`);
        context.selectors[key].exit().remove();

        let newGroupLinkDefs = context.selectors[key].enter()
            .append("svg:marker")
            .attr("id", groupLink => `${groupLink.source}-${groupLink.target}-arrow${suffix}`)
            .attr('viewBox', '0 -5 15 15')
            .attr('overflow', 'visible')
            .attr("refX", 2.5)
            .attr("refY", 0)
            .attr("markerWidth", 3)
            .attr("markerHeight", 3)
            .attr("orient", "auto");

        newGroupLinkDefs
            .append("path")
            .attr('d', path)
            .style("fill", groupLink => hexToRgba(groupLink.color, groupLink.opacity ?? 1));

        context.selectors[key] = newGroupLinkDefs.merge(context.selectors[key]);
    })
    context.selectors.groupLinks = context.selectors.groupLinks.data(context.filtered.groupLinks, link => `${link.source}-${link.target}`);
    context.selectors.groupLinks.exit().remove();
    context.selectors.groupLinks = context.selectors.groupLinks.enter()
        .append("line")
        .style('fill', 'none')
        .style('stroke', groupLink => hexToRgba(groupLink.color, groupLink.opacity ?? 1))
        .style('stroke-width', groupLink => (groupLink.opacity ?? 1) * 5)
        .on('mousedown', attrs.onclickGroupLink || Function)
        .merge(context.selectors.groupLinks);

    context.selectors.groupLinks
        .classed('selected', link => link.selected)
        .attr("marker-end", groupLink => {
            let suffix = {plus: '-plus', minus: '-minus'}[groupLink.sign] || '';
            return `url(#${groupLink.source}-${groupLink.target}-arrow${suffix})`
        })
};
