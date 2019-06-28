import * as d3 from "d3";
import 'd3-selection-multi';

import * as jStat from 'jstat';

import * as common from "../../common/common";
import m from "mithril";

export default class ForceDiagram {
    oninit() {
        // strength parameter for group attraction/repulsion
        this.kGroupGravity = 4;
        // set when node is being dragged
        this.isDragging = false;
        this.selectedPebble = undefined;
        this.hoverPebble = undefined;
        this.frozenGroups = {};
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
        let groupNames = new Set(groups.map(group => group.name));

        // remove nodes from groups that don't exist in the pebbles list
        groups.forEach(group => {
            group.nodes = new Set([...group.nodes].filter(pebble => pebbleSet.has(pebble)));
        });

        // remove links where the source or target doesn't exist
        pebbleLinks = pebbleLinks
            .filter(link => pebbleSet.has(link.source) && pebbleSet.has(link.target));
        groupLinks = groupLinks
            .filter(link => groupNames.has(link.source) && groupNames.has(link.target));

        let {width, height, x, y} = dom.getBoundingClientRect();

        // synchronize internal nodes with passed pebbles
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
        attrs.builders && attrs.builders.forEach(builder => builder(attrs, this));

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
                delete (this.nodes[this.hoverPebble] || {}).fx;
                delete (this.nodes[this.hoverPebble] || {}).fy;
            }
            this.hoverPebble = attrs.hoverPebble;

            if (this.hoverPebble && this.hoverPebble in this.nodes) Object.assign(this.nodes[this.hoverPebble], {
                fx: this.nodes[this.hoverPebble].x,
                fy: this.nodes[this.hoverPebble].y
            });
        }

        if (this.selectedPebble !== attrs.selectedPebble) {
            if (!this.isPinned && this.selectedPebble) {
                delete (this.nodes[this.selectedPebble] || {}).fx;
                delete (this.nodes[this.selectedPebble] || {}).fy;
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

            let groupCoords = groups
                .reduce((out, group) => Object.assign(out, {
                    [group.name]: [...group.nodes].map(node => [this.nodes[node].x, this.nodes[node].y])
                }), {});

            let hullCoords = groups.reduce((out, group) => group.nodes.length === 0 ? out
                : Object.assign(out, {
                    [group.name]: d3.polygonHull(lengthen(groupCoords[group.name], attrs.hullRadius))
                }), {});

            this.selectors.hulls.selectAll('path')
                .attr('d', d => `M${hullCoords[d.name].join('L')}Z`);
            this.selectors.hullBackgrounds
                .attr('d', d => `M${hullCoords[d.name].join('L')}Z`);

            // update positions of groupLines
            let centroids = Object.keys(hullCoords)
                .reduce((out, group) => Object.assign(out, {[group]: jamescentroid(groupCoords[group])}), {});

            let intersections = groupLinks.reduce((out, line) => Object.assign(out, {
                [`${line.source}-${line.target}`]: {
                    source: centroids[line.source],
                    target: intersectLineHull(centroids[line.source], centroids[line.target], hullCoords[line.target], attrs.hullRadius * 1.5)
                }}), {});

            this.selectors.groupLinks
                .attr('x1', line => (intersections[`${line.source}-${line.target}`].source || centroids[line.source])[0] || 0)
                .attr('y1', line => (intersections[`${line.source}-${line.target}`].source || centroids[line.source])[1] || 0)
                .attr('x2', line => (intersections[`${line.source}-${line.target}`].target || centroids[line.target])[0] || 0)
                .attr('y2', line => (intersections[`${line.source}-${line.target}`].target || centroids[line.target])[1] || 0);

            // NOTE: update positions of nodes BEFORE adjusting positions for group forces
            // This keeps the nodes centered in the group when resizing,
            // and the adjustment is still applied on the next tick regardless
            this.selectors.pebbles
                .attr('transform', d => `translate(${this.nodes[d].x},${this.nodes[d].y})`);

            // update positions of nodes (not implemented as a force because centroid computation is shared)
            // group members attract each other, repulse non-group members
            groups.filter(group => group.name in centroids).forEach(group => {
                nodeArray.forEach(node => {
                    if (node.fx || node.fy) return;
                    let sign = group.nodes.has(node.name) ? 1 : -1;

                    let delta = [centroids[group.name][0] - node.x, centroids[group.name][1] - node.y];
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

            if (attrs.contextPebble && this.position.x && this.position.y) this.selectors.nodeDragLine
                .attr('display', 'block')
                .attr('d', `M${this.nodes[attrs.contextPebble].x},${this.nodes[attrs.contextPebble].y}L${this.position.x},${this.position.y}`);
            else {
                this.selectors.nodeDragLine.attr('display', 'none');
                this.position = {};
            }

            this.selectors.hulls.selectAll('text')
                .attr("transform", d => `translate(${centroids[d.name][0] - d.name.length * 5},${centroids[d.name][1]})`)
                // .attr('dy', d => centroids[d.name] - Math.min(...hullCoords[d.name].map(_ => _[1])))
        };
        this.force.on('tick', tick);
        this.force.alphaTarget( 1).restart();
        setTimeout(() => {
            if (this.isDragging) return;
            this.force.alphaTarget(0).restart();
        }, 1000);

        let updatePosition = () => this.position = {x: d3.event.pageX - x, y: d3.event.pageY - y};
        // track mouse position for dragging, remove arrow on click
        d3.select(dom)
            .on('mousemove', attrs.contextPebble && updatePosition)
            .on('click', () => attrs.contextPebble = undefined);


        d3.select(dom)
            .call(d3.drag()
                .container(dom)
                .subject(() => this.force.find(d3.event.x, d3.event.y))
                .on("start", () => {
                    if (Math.sqrt(Math.pow(d3.event.sourceEvent.x - d3.event.subject.x, 2) + Math.pow(d3.event.sourceEvent.y - d3.event.subject.y - 100, 2)) > d3.event.subject.radius * 2) {
                        setSelectedPebble(undefined);
                        return;
                    }
                    this.isDragging = true;
                    if (!d3.event.active) this.force.alphaTarget(1).restart();
                    d3.event.subject.fx = d3.event.subject.x;
                    d3.event.subject.fy = d3.event.subject.y;
                    m.redraw()
                })
                .on("drag", () => {
                    if (!this.isDragging) return;
                    d3.event.subject.fx = d3.event.x;
                    d3.event.subject.fy = d3.event.y;

                    if (onDragOver) {

                        let dragCoord = this.selectedPebble === d3.event.subject
                            ? [d3.event.subject.fx, d3.event.subject.fy]
                            : [d3.event.subject.x, d3.event.subject.y];

                        let groupCoords = groups
                            .reduce((out, group) => Object.assign(out, {
                                [group.name]: [...group.nodes].map(node => [this.nodes[node].x, this.nodes[node].y])
                            }), {});

                        let hullCoords = groups.reduce((out, group) => group.nodes.length === 0 ? out
                            : Object.assign(out, {
                                [group.name]: d3.polygonHull(lengthen(groupCoords[group.name], attrs.hullRadius))
                            }), {});

                        // don't freeze own group
                        groups
                            .filter(group => group.nodes.has(d3.event.subject.name))
                            .forEach(group => delete hullCoords[group.name]);

                        Object.keys(hullCoords)
                            .forEach(groupId => {
                                let nodeNames = [...groups.find(group => group.name === groupId).nodes];
                                if (isInside(dragCoord, hullCoords[groupId])) {
                                    this.frozenGroups[groupId] = true;
                                    nodeNames.forEach(node => {
                                        this.nodes[node].fx = this.nodes[node].x;
                                        this.nodes[node].fy = this.nodes[node].y;
                                    })
                                }
                                else if (this.frozenGroups[groupId]) {
                                    nodeNames.forEach(node => {
                                        if (node === (this.selectedPebble || {}).name) return;
                                        delete this.nodes[node].fx;
                                        delete this.nodes[node].fy;
                                    })
                                }
                            });
                    }
                })
                .on("end", () => {
                    if (!this.isDragging) return;
                    this.isDragging = false;
                    if (!d3.event.active) this.force.alphaTarget(0);

                    Object.keys(this.frozenGroups).forEach(groupId => {
                        let nodeNames = [...groups.find(group => group.name === groupId).nodes];
                        nodeNames.forEach(node => {
                            if (node === (this.selectedPebble || {}).name) return;
                            delete this.nodes[node].fx;
                            delete this.nodes[node].fy;
                        })
                    });

                    if (onDragOut) // hook for when a node is dragged out of the scene
                        if (d3.event.subject.fx < 0 || d3.event.subject.fx > width || d3.event.subject.fy < 0 || d3.event.subject.fy > height) {
                            onDragOut(d3.event.subject.name);
                            return;
                        }

                    let dragCoord = this.selectedPebble === d3.event.subject
                        ? [d3.event.subject.fx, d3.event.subject.fy]
                        : [d3.event.subject.x, d3.event.subject.y];

                    let groupCoords, hullCoords;
                    if (onDragOver || onDragAway) {
                        groupCoords = groups
                            .reduce((out, group) => Object.assign(out, {
                                [group.name]: [...group.nodes].map(node => [this.nodes[node].x, this.nodes[node].y])
                            }), {});

                        hullCoords = groups.reduce((out, group) => group.nodes.length === 0 ? out
                            : Object.assign(out, {
                                [group.name]: d3.polygonHull(lengthen(groupCoords[group.name], attrs.hullRadius))
                            }), {});
                    }

                    if (onDragOver) {
                        Object.keys(hullCoords).filter(groupId => isInside(dragCoord, hullCoords[groupId]))
                            .forEach(groupId => onDragOver(d3.event.subject, groupId))
                    }

                    if (onDragAway) {
                        groups
                            .filter(group => group.nodes.has(d3.event.subject.name))
                            .filter(group => {
                                if (group.nodes.size === 2)
                                    return mag(sub(...hullCoords[group.name])) > 4000;

                                let reducedHull = hullCoords[group.name]
                                    .filter(coord => coord[0] !== dragCoord[0] && coord[1] !== dragCoord[1]);
                                let centroidReduced = jamescentroid(reducedHull);
                                let distanceDragged = mag(sub(dragCoord, centroidReduced));

                                return !reducedHull
                                    .some(coord => mag(sub(coord, centroidReduced)) * 5 > distanceDragged);
                            })
                            .forEach(group => onDragAway(d3.event.subject, group.name))
                    }

                    if (this.isPinned || d3.event.subject.name === this.hoverPebble || d3.event.subject.name === this.selectedPebble) return;
                    d3.event.subject.x = dragCoord[0];
                    d3.event.subject.y = dragCoord[1];
                    delete d3.event.subject.fx;
                    delete d3.event.subject.fy;
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
            .attr('id', 'start-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 4)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M10,-5L0,0L10,5')
            .style('fill', '#000');

        this.selectors.groupLinkDefs = svg // group line defs handle
            .append("svg:defs")
            .attr('id', 'groupLinkDefs')
            .selectAll('marker');
        this.selectors.groupLinks = svg // group lines handle
            .append('svg:g')
            .attr('id', 'groupLinks')
            .selectAll('line');

        this.selectors.hullBackgrounds = svg // group hulls handle
            .append('svg:g')
            .attr('id', 'hullBackings')
            .selectAll('g');
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
let mul = (a, b) => a.map(e => e * b);
let dot = (a, b) => a.reduce((out, _, i) => out + a[i] * b[i], 0);
let mag = a => a.reduce((out, e) => out + e * e, 0);

let intersectLineHull = (a1, a2, points, radius) => {
    // endpoints of the line segment on the convex hull that intercepts a1, a2 centroids
    let b1, b2;
    let int; // intercept
    points.some((_, i) => {
        b1 = points[i];
        b2 = points[(i + 1) % points.length];
        int = intersectLineLine(a1, a2, b1, b2);
        return int !== undefined;
    });

    if (!int) return;
    let dir1 = sub(b2, int);
    let dir2 = sub(b2, int);

    let dirSource = sub(a1, int);

    // definition of dot product to find angle between segment a and segment b
    let theta1 = Math.acos(dot(dir1, dirSource) / (mag(dir1) * mag(dirSource)));
    let theta2 = Math.acos(dot(dir2, dirSource) / (mag(dir2) * mag(dirSource)));
    // take the acute side
    let [dirHull, theta] = Math.abs(theta1) < 90 ? [dir1, theta1] : [dir2, theta2];

    // compute length of triangle base
    let width = radius / Math.tan(theta);
    let hypotenuse = Math.sqrt(width * width + radius * radius);
    // offset intercept by the hypotenuse length in the direction of the source centroid
    return sub(int, mul(dirSource, -hypotenuse / Math.sqrt(mag(dirSource))));
};

let intersectLineLine = (p1, p2, p3, p4) => {
    // ua_t is the reparameterization for the segment p1 - p2
    let ua_t = (p3[1] - p4[1]) * (p1[0] - p3[0]) + (p4[0] - p3[0]) * (p1[1] - p3[1]);
    let ub_t = (p1[1] - p2[1]) * (p1[0] - p3[0]) + (p2[0] - p1[0]) * (p1[1] - p3[1]);
    let u_b = (p4[0] - p3[0]) * (p1[1] - p2[1]) - (p1[0] - p2[0]) * (p4[1] - p3[1]);

    if (u_b !== 0) {
        let ua = ua_t / u_b;
        let ub = ub_t / u_b;

        if ( 0 <= ua && ua <= 1 && 0 <= ub && ub <= 1 ) {
            return [
                p1[0] + ua * (p2[0] - p1[0]),
                p1[1] + ua * (p2[1] - p1[1])
            ]
        }
    }
};

function isInside(point, vs) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    var x = point[0], y = point[1];

    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];

        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
}


function lengthen(coords, radius) {
    // d3.geom.hull returns null for two points, and fails if three points are in a line,
    // so this puts a couple points slightly off the line for two points, or around a singleton.
    let magnitude = 1 / 8;
    if (coords.length === 2) {
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
    if (coords.length === 1) {
        let delta = radius * .3;
        coords.push([coords[0][0] + delta, coords[0][1] + delta]);
        coords.push([coords[0][0] - delta, coords[0][1] + delta]);
        coords.push([coords[0][0] + delta, coords[0][1] - delta]);
        coords.push([coords[0][0] - delta, coords[0][1] - delta]);
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
            if ('children' in node) node.value = node.children.reduce((sum, child) => sum + setWidths(child), 0);
            else node.value = node.name.length + 5;
            return node.value;
        };
        setWidths(data);

        let root = d3.hierarchy(data);

        let x = d3.scaleLinear()
            .range([0, 2 * Math.PI]);
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
            .data(partition(root).descendants())
            .enter()
            .append("path")
            .attr('id', label => 'arc' + label.data.id + pebble)
            .attr('opacity', 0.4)
            .append("title");

        // add texts for new nodes
        d3.select(this).selectAll('text')
            .data(partition(root).descendants())
            .enter()
            .append('text')
            .attr("id", label => 'arcText' + label.data.id + pebble)
            .attr("x", 6)
            .attr("dy", d => {
                let center = (d.x0 + d.x1) / 2;
                return center > .25 && center < .75 ? -4 : 11.5;
            })
            .attr('opacity', 0.8)
            .append("textPath")
            .attr("xlink:href", label => '#arc' + label.data.id + pebble)
            .text(label => label.data.name);

        // update arc sizes
        d3.select(this).selectAll('path')
            .on("click", label => label.data.onclick(pebble))
            .on('mouseover', () => state.pebbleEvents.mouseover(pebble))
            .on('mouseout', () => state.pebbleEvents.mouseout(pebble))
            .on('contextmenu', () => state.pebbleEvents.contextmenu(pebble))
            .transition()  // Animate transitions between styles
            .duration(state.selectTransitionDuration)
            .attr("d", d => {
                let center = (d.x0 + d.x1) / 2;
                if (center > .25 && center < .75) {
                    Object.assign(d, {
                        x0: d.x1,
                        x1: d.x0
                    })
                }
                return arc(d);
            })
            .style("fill", d => {
                if (d.depth === 0) return 'transparent';
                return d3.rgb(d.data.attrs.fill)
            });
        d3.select(this).selectAll('path').selectAll('title')
            .text(d => d.data.name);
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

let colors = d3.scaleOrdinal(d3.schemeCategory20);
let speckCoords = Array.from({length: 100})
    .map((_, i) => ({id: i, x: jStat.normal.sample(0, 1), y: jStat.normal.sample(0, 1)}));

let pebbleBuilderPlots = (attrs, context, newPebbles) => {
    newPebbles
        .append('g')
        .attr('class', pebble => ({
            'continuous': 'density-plot',
            'bar': 'bar-plot',
            'collapsed': 'speck-plot'
        }[(attrs.summaries[pebble] || {}).plottype]))
        .attr('opacity', 0.4);

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
        if (!summary || !summary.plotx) {
            d3.select(this).selectAll('path')
                .data([]).exit().remove();
            return;
        }

        let width = context.nodes[pebble].radius * 1.5;
        let height = context.nodes[pebble].radius * 0.75;

        let xScale = d3.scaleLinear()
            .domain(d3.extent(summary.plotx))
            .range([0, width]);
        let yScale = d3.scaleLinear()
            .domain(d3.extent(summary.ploty))
            .range([height, 0]);

        let area = d3.area()
            .curve(d3.curveMonotoneX)
            .x(d => xScale(d.x))
            .y0(height)
            .y1(d => yScale(d.y));

        // append path if not exists
        let plotSelection = d3.select(this).selectAll('path')
            .data([null]).enter().append('path')
            .attr("class", "area")
            .attr("fill", "#1f77b4");

        // bind all events to the plot
        Object.keys(attrs.pebbleEvents)
            .forEach(event => plotSelection
                .on(event, () => attrs.pebbleEvents[event](pebble)));

        // rebind the path datum regardless of if path existed
        d3.select(this).selectAll('path')
            .datum(summary.plotx.map((x_i, i) => ({x: summary.plotx[i], y: summary.ploty[i]})))
            .transition()
            .duration(attrs.selectTransitionDuration)
            .attr("d", area)
            .attr("transform", "translate(" + (-width / 2) + "," + (-height) + ")");
    });

    context.selectors.pebbles
        .select('g.bar-plot').each(function (pebble) {
        let summary = attrs.summaries[pebble];

        if (!summary || !summary.plotvalues) {
            d3.select(this).selectAll('rect')
                .data([]).exit().remove();
            return;
        }

        let width = context.nodes[pebble].radius * 1.5;
        let height = context.nodes[pebble].radius * 0.75;

        let barPadding = .015; // Space between bars
        let barLimit = 15;
        let keys = Object.keys(summary.plotvalues);
        let data = keys
            .filter((key, i) => keys.length < barLimit || !(i % parseInt(keys.length / barLimit)) || i === keys.length - 1)
            .map((key, i) => ({
                x: summary.nature === 'nominal' ? i : Number(key),
                y: summary.plotvalues[key]
            })).sort((a, b) => b.x - a.x);

        let maxY = d3.max(data, d => d.y);
        let [minX, maxX] = d3.extent(data, d => d.x);

        let xScale = d3.scaleLinear()
            .domain([minX - 0.5, maxX + 0.5])
            .range([0, width]);

        let yScale = d3.scaleLinear()
            .domain([0, maxY])
            .range([0, height]);

        let rectSelection = d3.select(this).selectAll("rect").data(data);
        rectSelection.exit().remove();
        rectSelection.enter().append("rect");

        // bind all events to the plot
        Object.keys(attrs.pebbleEvents)
            .forEach(event => rectSelection.on(event, () => attrs.pebbleEvents[event](pebble)));

        d3.select(this).selectAll("rect").data(data)
            .transition()
            .duration(attrs.selectTransitionDuration)
            .attr("x", d => xScale(d.x - 0.5 + barPadding))
            .attr("y", d => yScale(maxY - d.y))
            .attr("width", xScale(minX + 0.5 - 2 * barPadding)) // the "width" is the coordinate of the end of the first bar
            .attr("height", d => yScale(d.y))
            .attr("fill", "#1f77b4")
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

    context.selectors.pebbles = context.selectors.pebbles.data(context.filtered.pebbles, _ => _);
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
    context.selectors.hulls = context.selectors.hulls.data(context.filtered.groups, group => group.name);
    context.selectors.hulls.exit().remove();
    let newHulls = context.selectors.hulls.enter()
        .append('svg:g')
        .attr('id', group => group.name + 'group');

    context.selectors.hulls = context.selectors.hulls.merge(newHulls);

    // add new paths
    newHulls.append("path")
        .attr("id", group => group.name + 'Hull')
        .style('stroke-linejoin', 'round');

    // update all paths
    context.selectors.hulls.selectAll('path')
        .style("fill", group => group.color)
        .style("stroke", group => group.color)
        .style("stroke-width", 2.5 * attrs.hullRadius)
        .style('opacity', group => group.opacity);

    // add new texts
    newHulls.append('text')
        .style('font-weight', 'bold');
        // .append('textPath')
        // .attr('alignment-baseline', 'top')
        // .attr('startOffset', '50%');

    // update all texts
    context.selectors.hulls.selectAll('text')
        .style('display', () => context.isDragging ? 'block' : 'none')
        .attr('xlink:href', group => '#' + group.name + 'Hull')
        .text(group => group.name);

    context.selectors.hullBackgrounds = context.selectors.hullBackgrounds.data(context.filtered.groups, group => group.name);
    context.selectors.hullBackgrounds.exit().remove();
    context.selectors.hullBackgrounds = context.selectors.hullBackgrounds.enter()
        .append("path") // note lines, are behind group hulls of which there is a white and colored semi transparent layer
        .attr("id", group => group.name + 'HullBackground')
        .style("fill", group => group.colorBackground || '#ffffff')
        .style("stroke", group => group.colorBackground || '#ffffff')
        .style("stroke-width", 2.5 * attrs.hullRadius)
        .style('stroke-linejoin', 'round')
        .style("opacity", 1)
        .merge(context.selectors.hullBackgrounds);
};

export let linkBuilder = (attrs, context) => {
    let marker = side => x => {
        let kind = side === 'left' ? 'start' : 'end';
        return attrs.is_explore_mode ? 'url(#circle)' :
            x[side] ? `url(#${kind}-arrow)` : '';
    };

    context.selectors.links = context.selectors.links.data(context.filtered.pebbleLinks, link => `${link.source}-${link.target}`);
    context.selectors.links.exit().remove();
    context.selectors.links = context.selectors.links.enter()
        .append('svg:path')
        .attr('class', 'link')
        .classed('selected', () => null)
        .style('marker-start', marker('left'))
        .style('marker-end', marker('right'))
        .on('mousedown', attrs.onclickLink || Function)
        .merge(context.selectors.links);

    // update existing links
    // VJD: dashed links between pebbles are "selected". this is disabled for now
    // selectors.links.classed('selected', x => null)
    //     .style('marker-start', marker('left'))
    //     .style('marker-end', marker('right'));
};


export let groupLinkBuilder = (attrs, context) => {
    context.selectors.groupLinkDefs = context.selectors.groupLinkDefs.data(context.filtered.groupLinks, link => `${link.source}-${link.target}`);
    context.selectors.groupLinkDefs.exit().remove();

    let newGroupLinkDefs = context.selectors.groupLinkDefs.enter()
        .append("svg:marker")
        .attr("id", groupLink => `${groupLink.source}-${groupLink.target}-arrow`)
        .attr('viewBox', '0 -5 15 15')
        .attr("refX", 2.5)
        .attr("refY", 0)
        .attr("markerWidth", 3)
        .attr("markerHeight", 3)
        .attr("orient", "auto");

    newGroupLinkDefs
        .append("path")
        .attr('d', 'M0,-5L10,0L0,5')
        .style("fill", groupLink => groupLink.color);

    context.selectors.groupLinkDefs = newGroupLinkDefs.merge(context.selectors.groupLinkDefs);

    context.selectors.groupLinks = context.selectors.groupLinks.data(context.filtered.groupLinks, link => `${link.source}-${link.target}`);
    context.selectors.groupLinks.exit().remove();
    context.selectors.groupLinks = context.selectors.groupLinks.enter()
        .append("line")
        .style('fill', 'none')
        .style('stroke', groupLink => groupLink.color)
        .style('stroke-width', 5)
        .attr("marker-end", groupLink => `url(#${groupLink.source}-${groupLink.target}-arrow)`)
        .merge(context.selectors.groupLinks);
};
