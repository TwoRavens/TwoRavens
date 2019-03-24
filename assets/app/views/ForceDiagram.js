import m from 'mithril';
import {mergeAttributes} from "../../common/common";
import * as d3 from 'd3';
import 'd3-selection-multi';


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

// normalize: text -> html id
let normalize = text => text.replace(/\W/g,'_');

export default class ForceDiagram {
    oninit() {
        // strength parameter for group attraction/repulsion
        this.kGroupGravity = 4;
    }

    onupdate(vnode) {
        // element constructors
        let {builder, nodes} = vnode.attrs;

        // data
        let {
            pebbles, pebbleLinks,
            groups, groupLinks
        } = vnode.attrs;

        // options
        let {radius, forceToggle} = vnode.attrs;
        let pebbleSet = new Set(pebbles);

        groups = groups
            .filter(group => [...group.nodes].some(node => pebbleSet.has(node)));
        let groupNames = new Set(groups.map(group => group.name));

        pebbleLinks = pebbleLinks
            .filter(link => pebbleSet.has(link.source) && pebbleSet.has(link.target));
        groupLinks = groupLinks
            .filter(link => groupNames.has(link.source) && groupNames.has(link.target));

        let {width, height} = vnode.dom.getBoundingClientRect();

        // synchronize nodes with pebbles
        pebbles
            .filter(pebble => !(pebble in nodes))
            .forEach(pebble => nodes[pebble] = {id: normalize(pebble), name: pebble});
        Object.keys(nodes)
            .filter(pebble => !pebbleSet.has(pebble))
            .forEach(pebble => delete nodes[pebble]);

        // rebind data to selectors
        builder && builder({
            nodes, width, height,

            data: {pebbles, pebbleLinks, groups, groupLinks},
            selectors: this.selectors
        });

        /**
         Define each pebble charge.
         */
        let uppersize = 7;
        function getPebbleCharge(d) {
            let groupSize = Math.max(...groups // find the size of the largest group that d is a member of
                .filter(group => group.nodes.has(d.name)) // find groups that contain node
                .map(group => group.nodes.length)); // grab the group size

            if (groupSize === -Infinity) return -800;
            if (d.forefront) return -1000;

            // decrease charge as pebbles become smaller, so they can pack together
            return groupSize > uppersize ? -400 * uppersize / groupSize : -400;
        }

        let nodeArray = [...Object.values(nodes)];
        // TODO: this api changed in v4 // https://bl.ocks.org/mbostock/ad70335eeef6d167bc36fd3c04378048
        // this.circle.call(this.force.drag);
        this.force.nodes(nodeArray);
        if (forceToggle) {
            this.force
                .force('link', d3.forceLink(pebbleLinks).distance(100))
                .force('charge', d3.forceManyBody().strength(0)) // prevent tight clustering
                .force('x', d3.forceX(width / 2).strength(0))
                .force('y', d3.forceY(height / 2).strength(0));

            this.kGroupGravity = 0;
        } else {
            this.force
                .force('link', d3.forceLink(pebbleLinks).distance(100))
                .force('charge', d3.forceManyBody().strength(getPebbleCharge)) // prevent tight clustering
                .force('x', d3.forceX(width / 2).strength(.05))
                .force('y', d3.forceY(height / 2).strength(.05));

            this.kGroupGravity = 8 / (groups.length || 1); // strength parameter for group attraction/repulsion
        }

        let debugCount = 0;

        // called on each force animation frame
        let tick = () => {

            function lengthen(coords) {
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
                    coords.push([coords[0][0] + delta, coords[0][1]]);
                    coords.push([coords[0][0] - delta, coords[0][1]]);
                    coords.push([coords[0][0], coords[0][1] + delta]);
                    coords.push([coords[0][0], coords[0][1] - delta]);
                }
                return coords;
            }

            let groupCoords = groups
                .reduce((out, group) => Object.assign(out, {
                    [group.name]: [...group.nodes].map(node => [nodes[node].x, nodes[node].y])
                }), {});

            let hullCoords = groups.reduce((out, group) => group.nodes.length === 0 ? out
                : Object.assign(out, {
                    [group.name]: d3.polygonHull(lengthen(groupCoords[group.name]))
                }), {});

            this.selectors.hulls
                .attr('d', d => `M${hullCoords[d.name].join('L')}Z`);
            // this.selectors.hullBackgrounds.data(hullCoords, coord => coord.name)
            //     .attr('d', d => `M${hullCoords[d.name].join('L')}Z`);

            // update positions of groupLines
            // TODO: intersect arrow with convex hull
            let centroids = Object.keys(groupCoords)
                .reduce((out, group) => Object.assign(out, {[group]: jamescentroid(hullCoords[group])}), {});

            // let groupLinkPrep = link => {
            //     let srcCent = centroids[link.source];
            //     let tgtCent = centroids[link.target];
            //
            //     let delta = [tgtCent[0] - srcCent[0], tgtCent[1] - srcCent[1]];
            //     let dist = Math.sqrt(delta.reduce((sum, axis) => sum + axis * axis, 0));
            //     let norm = dist === 0 ? [0, 0] : delta.map(axis => axis / dist);
            //     let padding = [radius + 7, radius + 10];
            //
            //     return {srcCent, tgtCent, padding, norm};
            // };
            //
            // this.groupLines.data(groupLinks.map(groupLinkPrep)).enter()
            //     .append('line')
            //     .attr('x1', d => d.srcCent[0] + d.padding[0] * d.norm[0])
            //     .attr('y1', d => d.srcCent[1] + d.padding[0] * d.norm[1])
            //     .attr('x2', d => d.tgtCent[0] + d.padding[1] * d.norm[0])
            //     .attr('x1', d => d.tgtCent[1] + d.padding[1] * d.norm[1])
            //     .exit().remove();
            //

            // NOTE: update positions of nodes BEFORE adjusting positions for group forces
            // This keeps the nodes centered in the group when resizing,
            // and the adjustment is still applied on the next tick regardless
            this.selectors.circle
                .attr('transform', d => `translate(${nodes[d].x},${nodes[d].y})`);

            // update positions of nodes (not implemented as a force because centroid computation is shared)
            // group members attract each other, repulse non-group members
            groups.filter(group => group.name in centroids).forEach(group => {
                nodeArray.forEach(node => {
                    let sign = group.nodes.has(node.name) ? 1 : -1;

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
        this.force.alpha(1).restart();
    };

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

        this.selectors.hullBackgrounds = svg // white backings for each group
            .append('g')
            .attr('id', 'hullBackgrounds')
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