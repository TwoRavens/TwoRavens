import m from 'mithril';
import {mergeAttributes} from "../../common/common";
import * as d3 from 'd3';
import 'd3-selection-multi';

export default class ForceDiagram {
    oninit() {
        // strength parameter for group attraction/repulsion
        this.kGroupGravity = 4;
        this.isDragging = false;
        this.selectedPebble;
    }

    onupdate(vnode) {
        // element constructors
        let {builder, nodes} = vnode.attrs;

        // data
        let {
            pebbles, pebbleLinks,
            groups, groupLinks,
            selectedPebble
        } = vnode.attrs;

        // options
        let {isPinned, hullRadius} = vnode.attrs;
        let pebbleSet = new Set(pebbles);

        groups = groups
            .filter(group => [...group.nodes].some(node => pebbleSet.has(node)));
        let groupNames = new Set(groups.map(group => group.name));

        groups.forEach(group => {
            group.nodes = new Set([...group.nodes].filter(pebble => pebbleSet.has(pebble)));
        });

        pebbleLinks = pebbleLinks
            .filter(link => pebbleSet.has(link.source) && pebbleSet.has(link.target));
        groupLinks = groupLinks
            .filter(link => groupNames.has(link.source) && groupNames.has(link.target));

        let {width, height} = vnode.dom.getBoundingClientRect();

        // synchronize nodes with pebbles
        pebbles
            .filter(pebble => !(pebble in nodes))
            .forEach(pebble => nodes[pebble] = {id: normalize(pebble), name: pebble, x: width * Math.random(), y: height * Math.random()});
        Object.keys(nodes)
            .filter(pebble => !pebbleSet.has(pebble))
            .forEach(pebble => delete nodes[pebble]);

        // rebind data to selectors
        builder && builder({
            nodes, width, height,
            data: {pebbles, pebbleLinks, groups, groupLinks},
            selectors: this.selectors
        });

        if (this.selectedPebble !== selectedPebble) {
            if (this.selectedPebble) {
                delete nodes[this.selectedPebble].fx;
                delete nodes[this.selectedPebble].fy;
            }
            this.selectedPebble = selectedPebble;

            if (this.selectedPebble) Object.assign(nodes[selectedPebble], {
                fx: nodes[selectedPebble].x,
                fy: nodes[selectedPebble].y
            });
        }

        /**
         Define each pebble charge.
         */
        let uppersize = 7;
        function getPebbleCharge(d) {
            let groupSize = Math.max(...groups // find the size of the largest group that d is a member of
                .filter(group => group.nodes.has(d.name)) // find groups that contain node
                .map(group => group.nodes.size)); // grab the group size

            if (groupSize === -Infinity) return -800;
            if (d.name === selectedPebble) return -1000;

            // decrease charge as pebbles become smaller, so they can pack together
            return groupSize > uppersize ? -400 * uppersize / groupSize : -400;
        }

        let nodeArray = [...Object.values(nodes)];

        this.kGroupGravity = isPinned ? 0 : 6 / (groups.length || 1); // strength parameter for group attraction/repulsion
        this.force.nodes(nodeArray)
            .force('link', d3.forceLink(pebbleLinks).distance(100))
            .force('charge', d3.forceManyBody().strength(getPebbleCharge)) // prevent tight clustering
            .force('x', d3.forceX(width / 2).strength(.05))
            .force('y', d3.forceY(height / 2).strength(.05));

        if (this.isPinned !== isPinned) {
            this.isPinned = isPinned;
            if (isPinned) Object.keys(nodes)
                .forEach(key => Object.assign(nodes[key], {
                    fx: nodes[key].x,
                    fy: nodes[key].y
                }));
            else Object.keys(nodes).forEach(key => {
                delete nodes[key].fx;
                delete nodes[key].fy;
            })
        }

        // called on each force animation frame
        let tick = () => {

            let groupCoords = groups
                .reduce((out, group) => Object.assign(out, {
                    [group.name]: [...group.nodes].map(node => [nodes[node].x, nodes[node].y])
                }), {});

            let hullCoords = groups.reduce((out, group) => group.nodes.length === 0 ? out
                : Object.assign(out, {
                    [group.name]: d3.polygonHull(lengthen(groupCoords[group.name], hullRadius))
                }), {});

            this.selectors.hulls
                .attr('d', d => `M${hullCoords[d.name].join('L')}Z`);
            this.selectors.hullBackgrounds
                .attr('d', d => `M${hullCoords[d.name].join('L')}Z`);

            // update positions of groupLines
            let centroids = Object.keys(hullCoords)
                .reduce((out, group) => Object.assign(out, {[group]: jamescentroid(hullCoords[group])}), {});

            let intersections = groupLinks.reduce((out, line) => Object.assign(out, {
                [`${line.source}-${line.target}`]: {
                    source: centroids[line.source],
                    target: intersectLineHull(centroids[line.source], centroids[line.target], hullCoords[line.target], hullRadius * 1.5)
                }}), {});

            this.selectors.groupLines// TODO: intersect arrow with convex hull
                .attr('x1', line => (intersections[`${line.source}-${line.target}`].source || centroids[line.source])[0] || 0)
                .attr('y1', line => (intersections[`${line.source}-${line.target}`].source || centroids[line.source])[1] || 0)
                .attr('x2', line => (intersections[`${line.source}-${line.target}`].target || centroids[line.target])[0] || 0)
                .attr('y2', line => (intersections[`${line.source}-${line.target}`].target || centroids[line.target])[1] || 0);

            // NOTE: update positions of nodes BEFORE adjusting positions for group forces
            // This keeps the nodes centered in the group when resizing,
            // and the adjustment is still applied on the next tick regardless
            this.selectors.circle
                .attr('transform', d => `translate(${nodes[d].x},${nodes[d].y})`);

            // update positions of nodes (not implemented as a force because centroid computation is shared)
            // group members attract each other, repulse non-group members
            groups.filter(group => group.name in centroids).forEach(group => {
                nodeArray.forEach(node => {
                    let sign = group.nodes.has(node.name) ? 2.5 : -1;

                    let delta = [centroids[group.name][0] - node.x, centroids[group.name][1] - node.y];
                    let dist = Math.sqrt(delta.reduce((sum, axis) => sum + axis * axis, 0));
                    let norm = dist === 0 ? [0, 0] : delta.map(axis => axis / dist);

                    node.x += Math.min(norm[0], delta[0] / 100) * this.kGroupGravity * sign * this.force.alpha();
                    node.y += Math.min(norm[1], delta[1] / 100) * this.kGroupGravity * sign * this.force.alpha();
                });
            });
            //
            // // draw directed edges with proper padding from node centers
            // this.path.attr('d', d => {
            //     let deltaX = d.target.x - d.source.x,
            //         deltaY = d.target.y - d.source.y,
            //         dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
            //         normX = deltaX / dist,
            //         normY = deltaY / dist,
            //         sourcePadding = d.left ? radius + 5 : radius,
            //         targetPadding = d.right ? radius + 5 : radius,
            //         sourceX = d.source.x + (sourcePadding * normX),
            //         sourceY = d.source.y + (sourcePadding * normY),
            //         targetX = d.target.x - (targetPadding * normX),
            //         targetY = d.target.y - (targetPadding * normY);
            //     return `M${sourceX},${sourceY}L${targetX},${targetY}`;
            // });
            //
            // this.circle.attr('transform', d => 'translate(' + (d.x || 0) + ',' + (d.y || 0) + ')');
        };
        this.force.on('tick', tick);
        this.force.alphaTarget( 1).restart();
        setTimeout(() => {
            if (this.isDragging) return;
            this.force.alphaTarget(0).restart();
        }, 1000)
    }

    oncreate(vnode) {
        let {nodes} = vnode.attrs;
        let svg = d3.select(vnode.dom);
        this.selectors = {};

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

        this.selectors.groupLineDefs = svg // group line defs handle
            .append("svg:defs")
            .attr('id', 'groupLineDefs')
            .selectAll('marker');
        this.selectors.groupLines = svg // group lines handle
            .append('svg:g')
            .attr('id', 'groupLinks')
            .selectAll('line');

        this.selectors.hullBackgrounds = svg // group hulls handle
            .append('svg:g')
            .attr('id', 'hulls')
            .selectAll('svg');
        this.selectors.hulls = svg // group hulls handle
            .append('svg:g')
            .attr('id', 'hulls')
            .selectAll('svg');

        this.selectors.path = svg // links handle
            .append('svg:g')
            .attr('id', 'linksContainer')
            .selectAll('path');
        this.selectors.circle = svg  // nodes handle
            .append('svg:g')
            .attr('id', 'pebblesContainer')
            .selectAll('g');

        // line displayed when dragging new nodes
        this.selectors.nodeDragLine = svg.append('svg:path')
            .attr('class', 'link dragline hidden')
            .attr('d', 'M0,0L0,0');

        this.force = d3.forceSimulation([...Object.values(nodes)]);


        d3.select(vnode.dom)
            .call(d3.drag()
                .container(vnode.dom)
                .subject(() => this.force.find(d3.event.x, d3.event.y))
                .on("start", () => {
                    this.isDragging = true;
                    if (!d3.event.active) this.force.alphaTarget(1).restart();
                    d3.event.subject.fx = d3.event.subject.x;
                    d3.event.subject.fy = d3.event.subject.y;
                })
                .on("drag", () => {
                    d3.event.subject.fx = d3.event.x;
                    d3.event.subject.fy = d3.event.y;
                })
                .on("end", () => {
                    this.isDragging = false;
                    if (!d3.event.active) this.force.alphaTarget(0);
                    if (this.isPinned) return;
                    d3.event.subject.fx = null;
                    d3.event.subject.fy = null;
                }));

        this.onupdate(vnode);
    }

    view(vnode) {
        return m('svg',
            mergeAttributes({
                width: '100%',
                height: '100%'
            }, vnode.attrs.attrsAll || {})
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


function lengthen(coords, radius) {
    // d3.geom.hull returns null for two points, and fails if three points are in a line,
    // so this puts a couple points slightly off the line for two points, or around a singleton.
    if (coords.length === 2) {
        let deltax = coords[0][0] - coords[1][0];
        let deltay = coords[0][1] - coords[1][1];
        coords.push([
            (coords[0][0] + coords[1][0]) / 2 + deltay / 20,
            (coords[0][1] + coords[1][1]) / 2 + deltax / 20
        ]);
        coords.push([
            (coords[0][0] + coords[1][0]) / 2 - deltay / 20,
            (coords[0][1] + coords[1][1]) / 2 - deltax / 20
        ]);
    }
    if (coords.length === 1) {
        let delta = radius * 0.2;
        coords.push([coords[0][0] + delta, coords[0][1] + delta]);
        coords.push([coords[0][0] - delta, coords[0][1] + delta]);
        coords.push([coords[0][0] + delta, coords[0][1] - delta]);
        coords.push([coords[0][0] - delta, coords[0][1] - delta]);
    }
    return coords;
}


// normalize: text -> html id
let normalize = text => text.replace(/\W/g,'_');
