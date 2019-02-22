import m from 'mithril';
import {mergeAttributes} from "../../common/common";
import {dvColor, gr1Color, gr2Color, nomColor, setSelectedPebble,
    is_explore_mode,
    RADIUS, setColors,
    zparams
} from "../app";
import {barsNode, densityNode} from "../plots";
import * as d3 from 'd3';

/**
 Define each pebble radius.
 Presently, most pebbles are scaled to radius set by global RADIUS.
 Members of groups are scaled down if group gets large.
 */
export function getPebbleRadius(d){
    if (d.group1 || d.group2) { // if a member of a group, need to calculate radius size
        var uppersize = 7;
        var ng1 = (d.group1) ? zparams.zgroup1.length : 1; // size of group1, if a member of group 1
        var ng2 = (d.group2) ? zparams.zgroup2.length : 1; // size of group2, if a member of group 2
        var maxng = Math.max(ng1, ng2); // size of the largest group variable is member of
        let node_radius = (maxng>uppersize) ? RADIUS*Math.sqrt(uppersize/maxng) : RADIUS; // keep total area of pebbles bounded to pi * RADIUS^2 * uppersize, thus shrinking radius for pebbles in larger groups

        // make the selected node a bit bigger
        if (d.name === selectedPebble) return Math.min(node_radius * 1.5, RADIUS);
        return node_radius
    } else {
        return RADIUS; // nongroup members get the common global radius
    }
}


/**
 Define each pebble charge.
 */
function getPebbleCharge(d) {
    if(d.group1 || d.group2){
        if(d.forefront){// pebbles packed in groups repel others on mouseover
            return -1000;
        }
        var uppersize = 7;
        var ng1 = (d.group1) ? zparams.zgroup1.length : 1;      // size of group1, if a member of group 1
        var ng2 = (d.group2) ? zparams.zgroup2.length : 1;      // size of group2, if a member of group 2
        var maxng = Math.max(ng1,ng2);                                                      // size of the largest group variable is member of
        return (maxng>uppersize) ? -400*(uppersize/maxng) : -400;                           // decrease charge as pebbles become smaller, so they can pack together
    }else{
        return -800;
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
    for(let j = 1; j<coord.length; j++){
        if (coord[j][0] < minx) minx = coord[j][0];
        if (coord[j][1] < miny) miny = coord[j][1];
        if (coord[j][0] > maxx) maxx = coord[j][0];
        if (coord[j][1] > maxy) maxy = coord[j][1];
    };
    return[(minx + maxx)/2, (miny + maxy)/2];
}

export let k = 4; // strength parameter for group attraction/repulsion

// depth increments for child arcs
let radialGapSize = depth => Math.pi / 10;
let axialGapSize = depth => 5 / (depth + 1); // gap between pebble and arc, or between arcs
let arcHeight = 15;

// arcs for denoting pebble characteristics
const arc = (start, end) => (radius) => d3.svg.arc()
    .innerRadius(radius + 5)
    .outerRadius(radius + 20)
    .startAngle(start)
    .endAngle(end);
export const [arc0, arc1, arc2, arc3, arc4] = [arc(0, 3.2), arc(0, 1), arc(1.1, 2.2), arc(2.3, 3.3), arc(4.3, 5.3)];
// outer arc
const arcInd = arclimits => radius => d3.svg.arc()
    .innerRadius(radius + 22)
    .outerRadius(radius + 37)
    .startAngle(arclimits[0])
    .endAngle(arclimits[1]);

const [arcInd1Limits, arcInd2Limits] = [[0, 0.3], [0.35, 0.65]];
const [arcInd1, arcInd2] = [arcInd(arcInd1Limits), arcInd(arcInd2Limits)];

// milliseconds to wait before showing/hiding the pebble handles
let hoverTimeout = 150;
let hoverPebble;

let $fill = (obj, op, d1, d2) => d3.select(obj).transition()
    .attr('fill-opacity', op).attr('display', op ? '' : 'none')
    .delay(d1)
    .duration(d2);
let fill = (d, id, op, d1, d2) => $fill('#' + id + d.id, op, d1, d2);
let fillThis = (self, op, d1, d2) => $fill(self, op, d1, d2);

export default class ForceDiagram {

    onupdate(vnode) {

        // overall structure
        let {
            nodes, nodeLinks,
            groups, groupLinks,
            events
        } = vnode.attrs;

        // features
        let {selectedNode, setSelectedNode} = vnode.attrs;

        // options
        let {forceToggle} = vnode.attrs;

        // callbacks
        let circleEvents = (events || {}).circle || {};
        let edgeEvents = (events || {}).edge || {};

        let {width, height} = vnode.dom.getBoundingClientRect();

        // nodes.id is pegged to allNodes, i.e. the order in which variables are read in
        // nodes.index is floating and depends on updates to nodes.  a variables index changes when new variables are added.
        this.circle.call(this.force.drag);
        if (forceToggle) {
            this.force
                .force('link', d3.forceLink(nodeLinks).distance(100))
                .force('charge', d3.forceManyBody().strength(getPebbleCharge)) // prevent tight clustering
                .force('center', d3.forceCenter(width / 2, height / 2).strength(.05));

            k = 8 / groups.filter(group => group.nodes.length).length; // strength parameter for group attraction/repulsion
            this.force.restart();

        } else {
            this.force
                .force('link', d3.forceLink(nodeLinks).distance(100))
                .force('charge', d3.forceManyBody().strength(0)) // prevent tight clustering
                .force('center', d3.forceCenter(width / 2, height / 2).strength(0));
            k = 0;
        }

        let makeGroups = () => {
            this.groupLineDefs.data(groups).enter()
                .append("svg:marker")
                .attr("id", group => `${group.id}-arrow`)
                .attr('viewBox', '0 -5 15 15')
                .attr("refX", 2.5)
                .attr("refY", 0)
                .attr("markerWidth", 3)
                .attr("markerHeight", 3)
                .attr("orient", "auto")
                .append("path")
                .attr('d', 'M0,-5L10,0L0,5')
                .style("fill", group => group.color)
                .exit().remove();

            this.groupLines.data(groupLinks).enter()
                .append("line")
                .style('fill', 'none')
                .style('stroke', group => group.color)
                .style('stroke-width', 5)
                .attr("marker-end", group => `url(#${group.source}-arrow)`)
                .exit().remove();

            this.hullBackgrounds.data(groups).enter()
                .append('svg')
                .attr("width", width)
                .attr("height", height)
                .append("path") // note lines, are behind group hulls of which there is a white and colored semi transparent layer
                .attr("id", 'gr1background')
                .style("fill", '#ffffff')
                .style("stroke", '#ffffff')
                .style("stroke-width", 2.5 * RADIUS)
                .style('stroke-linejoin', 'round')
                .style("opacity", 1)
                .exit().remove();

            this.hulls.data(groups).enter()
                .append("svg")
                .attr("width", width)
                .attr("height", height)
                .append("path")
                .attr("id", 'gr1hull')
                .style("fill", group => group.color)
                .style("stroke", group => group.color)
                .style("stroke-width", 2.5 * RADIUS)
                .style('stroke-linejoin', 'round')
                .exit().remove();

        };
        makeGroups();

        let makeLinks = () => {
            // path (link) group
            this.path = this.path.data(nodeLinks);

            let marker = side => x => {
                let kind = side === 'left' ? 'start' : 'end';
                return is_explore_mode ? 'url(#circle)' :
                    x[side] ? `url(#${kind}-arrow)` : '';
            };

            // update existing links
            // VJD: dashed links between pebbles are "selected". this is disabled for now
            this.path.classed('selected', x => null)
                .style('marker-start', marker('left'))
                .style('marker-end', marker('right'));

            // add new links
            this.path.enter().append('svg:path')
                .attr('class', 'link')
                .classed('selected', x => null)
                .style('marker-start', marker('left'))
                .style('marker-end', marker('right'))
                .on('mousedown', edgeEvents.mousedown);

            // remove old links
            this.path.exit().remove();

        };
        makeLinks();

        let makeCircles = () => {
            // circle (node) group
            this.circle = this.circle.data(nodes, x => x.id);

            // remove handles and make sure pebbles are properly sized on redraw
            this.circle.each(pebble => {
                // nullity check for when reintroducing variable from variable list
                if (pebble === null) return;
                let data = pebble.__data__;

                let radius = getPebbleRadius(data);
                if (data.plottype === 'continuous') densityNode(data, pebble, getPebbleRadius(data));
                else if (data.plottype === 'bar') barsNode(data, pebble, getPebbleRadius(data));

                d3.select(pebble.querySelector("[id^='pebbleLabel']")).style('font-size', radius * .175 + 7 + 'px');  // proportional scaling would be 14 / 40, but I added y-intercept at 7
                d3.select(pebble.querySelector("[id^='dvArc']")).attr("d", arc3(radius));
                d3.select(pebble.querySelector("[id^='nomArc']")).attr("d", arc4(radius));
                d3.select(pebble.querySelector("[id^='grArc']")).attr("d", arc1(radius));
                d3.select(pebble.querySelector("[id^='gr1indicator']")).attr("d", arcInd1(radius));
                d3.select(pebble.querySelector("[id^='gr2indicator']")).attr("d", arcInd2(radius));

                if (!data.forefront && data.name !== selectedNode) {
                    fillThis(pebble.querySelector('[id^=grArc]'), 0, 100, 500);
                    fill(data, "grText", 0, 100, 500);
                    fillThis(pebble.querySelector('[id^=dvArc]'), 0, 100, 500);
                    fill(data, "dvText", 0, 100, 500);
                    fillThis(pebble.querySelector('[id^=nomArc]'), 0, 100, 500);
                    fill(data, "nomText", 0, 100, 500);
                    fill(data, "gr1indicator", 0, 100, 500);
                    fill(data, "gr2indicator", 0, 100, 500);
                }
            });

            // update existing nodes (reflexive & selected visual states)
            // d3.rgb is the function adjusting the color here
            this.circle.selectAll('circle')
                .classed('reflexive', x => x.reflexive)
                .style('fill', x => d3.rgb(x.nodeCol))
                .style('stroke', x => d3.rgb(x.strokeColor))
                .style('stroke-width', x => x.strokeWidth);

            // add new nodes
            let g = this.circle.enter()
                .append('svg:g')
                .attr('id', x => x.name + 'biggroup');

            // add plot
            g.each(function (d) {
                d3.select(this);
                if (d.plottype === 'continuous') densityNode(d, this, getPebbleRadius(d));
                else if (d.plottype === 'bar') barsNode(d, this, getPebbleRadius(d));
            });

            g.append('svg:circle')
                .attr('class', 'node')
                .attr('r', d => getPebbleRadius(d))
                .style('pointer-events', 'inherit')
                .style('fill', d => d.nodeCol)
                .style('opacity', "0.5")
                .style('stroke', d => d3.rgb(d.strokeColor).toString())
                .classed('reflexive', d => d.reflexive)
                .on('contextmenu', circleEvents.contextmenu)
                .on('click', circleEvents.click);

            // show node names
            g.append('svg:text')
                .attr('id', append('pebbleLabel'))
                .attr('x', 0)
                .attr('y', 15)
                .attr('class', 'id')
                .text(d => d.name);

            // remove old nodes
            this.circle.exit().remove();
        };
        makeCircles();


        let append = (str, attr) => x => str + x[attr || 'id'];
        let makeArcs = (labels, left = 0, right = 2 * Math.pi, depth = 0) => labels.forEach((label, i) => {
            let labelLeft = left + (right - left) / labels.length * i;
            let labelRight = left + (right - left) / labels.length * (i + 1) - radialGapSize(depth);

            g.append("path").each(function(d) {
                let offset = getPebbleRadius(d) + Array.from({length: depth})
                    .reduce((sum, lvl) => sum + axialGapSize(lvl), 0) + arcHeight * depth;

                d3.select(this)
                    .attr("id", append('arc' + label.id))
                    .attr("d", d3.arc()
                        .innerRadius(offset).outerRadius(offset + arcHeight)
                        .startAngle(labelLeft)
                        .endAngle(labelRight))
                    .attrs(label.attrs)
                    .on('mouseover', function (d) {
                        d.forefront = true;
                        if (hoverPebble === d.name) {
                            setTimeout(() => {
                                if (!d.forefront) return;
                                hoverPebble = d.name;
                                fillThis(this, .3, 0, 100);
                                fill(d, 'text' + label.id, .9, 0, 100);
                            }, hoverTimeout)
                        }
                    });

                g.append("text")
                    .attr("id", append('text' + label.id))
                    .attr("x", 6)
                    .attr("dy", 11.5)
                    .attr("fill-opacity", 0)
                    .append("textPath")
                    .attr("xlink:href", append('#arc' + label.id))
                    .text(label.name);
            });

            if ('children' in label)
                makeArcs(label.children, labelLeft, labelRight, depth + 1)
        });
        makeArcs(nodes.map(getPebbleRadius), labels);

        this.force.start();
    };

    oncreate(vnode) {
        let {nodes} = vnode.attrs;

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

        // TODO: if this were implemented as a force, it could be generalized to n-groups?
        // NOTE: line1 and line2 are now elements of groupLines
        let tick = () => {

            function findcoords(findnames, allnames, coords, lengthen) {
                let fcoords = new Array(findnames.length);   // found coordinates
                let addlocation = 0;
                for (let j = 0; j < findnames.length; j++) {
                    addlocation = allnames.indexOf(findnames[j]);
                    fcoords[j] = coords[addlocation];
                }


                if (lengthen) {
                    // d3.geom.hull returns null for two points, and fails if three points are in a line,
                    // so this puts a couple points slightly off the line for two points, or around a singleton.
                    if (fcoords.length === 2) {
                        let deltax = fcoords[0][0] - fcoords[1][0];
                        let deltay = fcoords[0][1] - fcoords[1][1];
                        fcoords.push([(fcoords[0][0] + fcoords[1][0]) / 2 + deltay / 20, (fcoords[0][1] +
                            fcoords[1][1]) / 2 + deltax / 20]);
                        fcoords.push([(fcoords[0][0] + fcoords[1][0]) / 2 - deltay / 20, (fcoords[0][1] +
                            fcoords[1][1]) / 2 - deltax / 20]);
                    }
                    if (fcoords.length === 1) {
                        let delta = RADIUS * 0.2;
                        fcoords.push([fcoords[0][0] + delta, fcoords[0][1]]);
                        fcoords.push([fcoords[0][0] - delta, fcoords[0][1]]);
                        fcoords.push([fcoords[0][0], fcoords[0][1] + delta]);
                        fcoords.push([fcoords[0][0], fcoords[0][1] - delta]);
                    }
                }
                return fcoords;
            }

            // d3.geom.hull returns null for two points, and fails if three points are in a line,
            // so this puts a couple points slightly off the line for two points, or around a singleton.
            function lengthencoords(coords) {
                if (coords.length === 2) {
                    let deltax = coords[0][0] - coords[1][0];
                    let deltay = coords[0][1] - coords[1][1];
                    coords.push([(coords[0][0] + coords[1][0]) / 2 + deltay / 20, (coords[0][1] + coords[1][1]) / 2 +
                    deltax / 20]);
                    coords.push([(coords[0][0] + coords[1][0]) / 2 - deltay / 20, (coords[0][1] + coords[1][1]) / 2 -
                    deltax / 20]);
                }
                if (coords.length === 1) {
                    var delta = RADIUS * 0.2;
                    coords.push([coords[0][0] + delta, coords[0][1]]);
                    coords.push([coords[0][0] - delta, coords[0][1]]);
                    coords.push([coords[0][0], coords[0][1] + delta]);
                    coords.push([coords[0][0], coords[0][1] - delta]);
                }
                return (coords);
            }

            let coords = nodes.map(d => [d.x, d.y]);

            let gr1coords = findcoords(zparams.zgroup1, zparams.zvars, coords, true);
            let gr2coords = findcoords(zparams.zgroup2, zparams.zvars, coords, true);
            let depcoords = findcoords(zparams.zdv, zparams.zvars, coords, false);

            // draw convex hull around independent variables, if three or more coordinates given
            // note, d3.geom.hull returns null if shorter coordinate set than 3,
            // so findcoords() function has option to lengthen the coordinates returned to bypass this
            if (gr1coords.length > 2) {
                this.line.style("opacity", 1);
                this.visbackground.style("opacity", 1);
                this.vis.style("opacity", 0.3);
                let myhull = d3.geom.hull(gr1coords);

                this.vis.selectAll("path")
                    .data([myhull])   // returns null if less than three coordinates
                    .attr("d", function (d) {
                        return "M" + d.join("L") + "Z";
                    });
                this.visbackground.selectAll("path")
                    .data([myhull])   // returns null if less than three coordinates
                    .attr("d", function (d) {
                        return "M" + d.join("L") + "Z";
                    });

                //var p = d3.geom.polygon(indcoords).centroid();  // Seems to go strange sometimes
                var p = jamescentroid(gr1coords);

                if (depcoords.length > 0) {
                    q = depcoords[0];                         // Note, only using first dep var currently
                    //var r = findboundary(p,q,gr1coords);        // An approach to find the exact boundary, not presently working
                    ldeltaX = q[0] - p[0];
                    ldeltaY = q[1] - p[1];
                    ldist = Math.sqrt(ldeltaX * ldeltaX + ldeltaY * ldeltaY),
                        lnormX = 0;
                    lnormY = 0;
                    lsourcePadding = RADIUS + 7;
                    ltargetPadding = RADIUS + 10;

                    if (ldist > 0) {
                        lnormX = ldeltaX / ldist;
                        lnormY = ldeltaY / ldist;
                    }

                    this.line.attr("x1", p[0] + (lsourcePadding * lnormX))   // or r[0] if findboundary works
                        .attr("y1", p[1] + (lsourcePadding * lnormY))   // or r[1] if findboundary works
                        .attr("x2", q[0] - (ltargetPadding * lnormX))
                        .attr("y2", q[1] - (ltargetPadding * lnormY))
                        .style('opacity', 1);
                } else this.line.style('opacity', 0);

                // group members attract each other, repulse non-group members
                nodes.forEach(n => {
                    let sign = (n.group1) ? 1 : -1;    //was: Math.sign( zparams.zgroup1.indexOf(n.name) +0.5 );  // 1 if n in group, -1 if n not in group;
                    let ldeltaX = p[0] - n.x,
                        ldeltaY = p[1] - n.y,
                        ldist = Math.sqrt(ldeltaX * ldeltaX + ldeltaY * ldeltaY);
                    lnormX = 0;
                    lnormY = 0;

                    if (ldist > 0) {
                        lnormX = ldeltaX / ldist;
                        lnormY = ldeltaY / ldist;
                    }

                    console.log(n.x);

                    n.x += Math.min(lnormX, ldeltaX / 100) * k * sign * this.force.alpha();
                    n.y += Math.min(lnormY, ldeltaY / 100) * k * sign * this.force.alpha();
                });

            } else {
                this.visbackground.style("opacity", 0);
                this.vis.style("opacity", 0);
                this.line.style("opacity", 0);
            }


            if (gr2coords.length > 2) {
                this.line2.style("opacity", 1);
                this.vis2background.style("opacity", 1);
                this.vis2.style("opacity", 0.3);
                let myhull = d3.geom.hull(gr2coords);
                this.vis2.selectAll("path")
                    .data([myhull])   // returns null if less than three coordinates
                    .attr("d", function (d) {
                        return "M" + d.join("L") + "Z";
                    });
                this.vis2background.selectAll("path")
                    .data([myhull])   // returns null if less than three coordinates
                    .attr("d", function (d) {
                        return "M" + d.join("L") + "Z";
                    });

                //var p = d3.geom.polygon(indcoords).centroid();  // Seems to go strange sometimes
                var p = jamescentroid(gr2coords);

                if (depcoords.length > 0) {
                    var q = depcoords[0];                             // Note, only using first dep var currently
                    var ldeltaX = q[0] - p[0],
                        ldeltaY = q[1] - p[1],
                        ldist = Math.sqrt(ldeltaX * ldeltaX + ldeltaY * ldeltaY),
                        lnormX = ldeltaX / ldist,
                        lnormY = ldeltaY / ldist,
                        lsourcePadding = RADIUS + 7,
                        ltargetPadding = RADIUS + 10;

                    this.line2.attr("x1", p[0] + (lsourcePadding * lnormX))
                        .attr("y1", p[1] + (lsourcePadding * lnormY))
                        .attr("x2", q[0] - (ltargetPadding * lnormX))
                        .attr("y2", q[1] - (ltargetPadding * lnormY))
                        .style('opacity', 0);
                } else this.line2.style('opacity', 0);

                // group members attract each other, repulse non-group members
                nodes.forEach(n => {

                    var sign = (n.group2) ? 1 : -1;  // was: Math.sign( zparams.zgroup2.indexOf(n.name) +0.5 );  // 1 if n in group, -1 if n not in group;
                    var ldeltaX = p[0] - n.x,
                        ldeltaY = p[1] - n.y,
                        ldist = Math.sqrt(ldeltaX * ldeltaX + ldeltaY * ldeltaY),
                        lnormX = 0,
                        lnormY = 0;

                    if (ldist > 0) {
                        lnormX = ldeltaX / ldist;
                        lnormY = ldeltaY / ldist;
                    }

                    n.x += Math.min(lnormX, ldeltaX / 100) * k * sign * this.force.alpha();
                    n.y += Math.min(lnormY, ldeltaY / 100) * k * sign * this.force.alpha();
                });


            } else {
                this.vis2background.style("opacity", 0);
                this.vis2.style("opacity", 0);
                this.line2.style("opacity", 0);
            }


            // draw directed edges with proper padding from node centers
            this.path.attr('d', d => {
                var deltaX = d.target.x - d.source.x,
                    deltaY = d.target.y - d.source.y,
                    dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
                    normX = deltaX / dist,
                    normY = deltaY / dist,
                    sourcePadding = d.left ? RADIUS + 5 : RADIUS,
                    targetPadding = d.right ? RADIUS + 5 : RADIUS,
                    sourceX = d.source.x + (sourcePadding * normX),
                    sourceY = d.source.y + (sourcePadding * normY),
                    targetX = d.target.x - (targetPadding * normX),
                    targetY = d.target.y - (targetPadding * normY);
                return `M${sourceX},${sourceY}L${targetX},${targetY}`;
            });

            // if (this.circle.length) {
            //     console.warn('#debug this.circle[0]');
            //     console.log(this.circle[0]);
            //     console.warn('#debug this.circle[0].x');
            //     console.log(this.circle[0].x);
            // }

            this.circle.attr('transform', d => 'translate(' + (d.x || 0) + ',' + (d.y || 0) + ')');

            this.circle.selectAll('circle')           // Shrink/expand pebbles that join/leave groups
                .transition()
                .duration(100)
                .attr('r', d => getPebbleRadius(d));
        };

        this.force = d3.forceSimulation(nodes).on('tick', tick);

        this.onupdate(vnode); // initializes force.layout()
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