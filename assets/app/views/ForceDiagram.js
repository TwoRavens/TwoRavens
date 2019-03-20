import m from 'mithril';
import {mergeAttributes} from "../../common/common";
import * as d3 from 'd3';


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

export default class ForceDiagram {
    oninit() {
        // strength parameter for group attraction/repulsion
        this.kGroupGravity = 4;

        // nodes passed into the diagram are rebound to the pebbles object
        this.pebbles = [];
    }

    onupdate(vnode) {
        // element constructors
        let {
            pebbleBuilder, linkBuilder,
            groupBuilder, groupLinkBuilder
        } = vnode.attrs;

        // data
        let {
            nodes, nodeLinks,
            groups, groupLinks
        } = vnode.attrs;

        // options
        let {radius, forceToggle} = vnode.attrs;

        let nodeNames = new Set(nodes.map(node => node.name));

        groups = groups
            .filter(group => [...group.nodes].some(node => nodeNames.has(node)));
        let groupNames = new Set(groups.map(group => group.name));

        nodeLinks = nodeLinks
            .filter(link => nodeNames.has(link.source) && nodeNames.has(link.target));
        groupLinks = groupLinks
            .filter(link => groupNames.has(link.source) && groupNames.has(link.target));

        let {width, height} = vnode.dom.getBoundingClientRect();

        // construct page
        groupLinkBuilder && groupLinkBuilder(this.groupLineDefs, this.groupLines, groupLinks);
        groupBuilder && groupBuilder(this.hullBackgrounds, this.hulls, groups, width, height, radius);
        linkBuilder && linkBuilder(this.path, nodeLinks);
        pebbleBuilder && pebbleBuilder(this.circle, nodes);

        // nodes.id is pegged to allNodes, i.e. the order in which variables are read in
        // nodes.index is floating and depends on updates to nodes.  a variables index changes when new variables are added.
        this.force.nodes(nodes);

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

        // TODO: this api changed in v4 // https://bl.ocks.org/mbostock/ad70335eeef6d167bc36fd3c04378048
        // this.circle.call(this.force.drag);
        if (forceToggle) {
            this.force
                .force('link', d3.forceLink(nodeLinks).distance(100))
                .force('charge', d3.forceManyBody().strength(getPebbleCharge)) // prevent tight clustering
                .force('x', d3.forceX(width / 2).strength(.05))
                .force('x', d3.forceY(height / 2).strength(.05));

            this.kGroupGravity = 8 / (groups.length || 1); // strength parameter for group attraction/repulsion
        } else {
            this.force
                .force('link', d3.forceLink(nodeLinks).distance(100))
                .force('charge', d3.forceManyBody().strength(0)) // prevent tight clustering
                .force('x', d3.forceX(width / 2).strength(0))
                .force('x', d3.forceY(height / 2).strength(0));
            this.kGroupGravity = 0;
        }

        // called on each force animation frame
        let tick = () => {

            function findCoords(group) {
                let groupCoords = nodes
                    .filter(node => group.nodes.has(node.name))
                    .map(node => [node.x, node.y]);

                // d3.geom.hull returns null for two points, and fails if three points are in a line,
                // so this puts a couple points slightly off the line for two points, or around a singleton.
                if (groupCoords.length === 2) {
                    let deltax = groupCoords[0][0] - groupCoords[1][0];
                    let deltay = groupCoords[0][1] - groupCoords[1][1];
                    groupCoords.push([
                        (groupCoords[0][0] + groupCoords[1][0]) / 2 + deltay / 20,
                        (groupCoords[0][1] + groupCoords[1][1]) / 2 + deltax / 20
                    ]);
                    groupCoords.push([
                        (groupCoords[0][0] + groupCoords[1][0]) / 2 - deltay / 20,
                        (groupCoords[0][1] + groupCoords[1][1]) / 2 - deltax / 20
                    ]);
                }
                if (groupCoords.length === 1) {
                    let delta = radius * 0.2;
                    groupCoords.push([groupCoords[0][0] + delta, groupCoords[0][1]]);
                    groupCoords.push([groupCoords[0][0] - delta, groupCoords[0][1]]);
                    groupCoords.push([groupCoords[0][0], groupCoords[0][1] + delta]);
                    groupCoords.push([groupCoords[0][0], groupCoords[0][1] - delta]);
                }
                return groupCoords;
            }

            // draw convex hull around independent variables, if three or more coordinates given
            // note, d3.geom.hull returns null if shorter coordinate set than 3,
            // so findcoords() function has option to lengthen the coordinates returned to bypass this
            let hullCoords = groups.map(findCoords).map(d3.polygonHull) //.map((hull, i) => [groups[i], hull]);

            this.hulls.data(hullCoords).enter()
                .append('path')
                .attr('d', d => `M${d.join('L')}Z`).exit().remove();
            this.hullBackgrounds.data(hullCoords).enter()
                .append('path')
                .attr('d', d => `M${d.join('L')}Z`).exit().remove();

            // update positions of groupLines
            // TODO: intersect arrow with convex hull
            // let centroids = groups
            //     .reduce((out, group) => Object.assign(out, {[group.name]: jamescentroid(group)}), {});
            //
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
            // // update positions of nodes (not implemented as a force because centroid computation is shared)
            // // group members attract each other, repulse non-group members
            // groups.forEach(group => {
            //     nodes.forEach(n => {
            //         let sign = group.nodes.has(node.name) ? 1 : -1;
            //
            //         let delta = [centroids[group.name][0] - n.x, centroids[group.name][1] - n.y];
            //         let dist = Math.sqrt(delta.reduce((sum, axis) => sum + axis * axis, 0));
            //         let norm = dist === 0 ? [0, 0] : delta.map(axis => axis / dist);
            //
            //         n.x += Math.min(norm[0], delta[0] / 100) * this.kGroupGravity * sign * this.force.alpha();
            //         n.y += Math.min(norm[1], delta[1] / 100) * this.kGroupGravity * sign * this.force.alpha();
            //     });
            // });
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
        this.force.restart();
    };

    oncreate(vnode) {
        let svg = d3.select(vnode.dom);

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

        this.groupLineDefs = svg // group line defs handle
            .append("svg:defs")
            .attr('id', 'groupLineDefs')
            .selectAll('marker');
        this.groupLines = svg // group lines handle
            .append('svg:g')
            .attr('id', 'groupLinks')
            .selectAll('line');

        this.hullBackgrounds = svg // white backings for each group
            .append('g')
            .attr('id', 'hullBackgrounds')
            .selectAll('svg');
        this.hulls = svg // group hulls handle
            .append('svg:g')
            .attr('id', 'hulls')
            .selectAll('svg');

        this.path = svg // links handle
            .append('svg:g')
            .attr('id', 'linksContainer')
            .selectAll('path');
        this.circle = svg  // nodes handle
            .append('svg:g')
            .attr('id', 'pebblesContainer')
            .selectAll('g');

        // line displayed when dragging new nodes
        this.nodeDragLine = svg.append('svg:path')
            .attr('class', 'link dragline hidden')
            .attr('d', 'M0,0L0,0');

        this.force = d3.forceSimulation();

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