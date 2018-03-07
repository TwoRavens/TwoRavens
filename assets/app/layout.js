import * as app from './app';

let nodes = [];
let links = [];

// mouse event vars
var selected_node = null,
    selected_link = null,
    mousedown_link = null,
    mousedown_node = null,
    mouseup_node = null;

function resetMouseVars() {
    mousedown_node = null;
    mouseup_node = null;
    mousedown_link = null;
}

// update force layout (called automatically each iteration)
function tick(path, circle) {
    // draw directed edges with proper padding from node centers
    path.attr('d', d => {
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

    circle.attr('transform', d => 'translate(' + d.x + ',' + d.y + ')');
    circle.selectAll('circle') // shrink/expand pebbles that join/leave groups
        .transition()
        .duration(100)
        .attr('r', d => setPebbleRadius(d));
}

function mousedown(d) {
    // prevent I-bar on drag
    d3.event.preventDefault();
    // because :active only works in WebKit?
    svg.classed('active', true);
    if (d3.event.ctrlKey || mousedown_node || mousedown_link) return;
    //restart();
}

function mousemove(d) {
    if (!mousedown_node)
        return;
    // update drag line
    drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);
}

function mouseup(d) {
    if (mousedown_node) {
        drag_line
            .classed('hidden', true)
            .style('marker-end', '');
    }
    // because :active only works in WebKit?
    svg.classed('active', false);
    // clear mouse event vars
    resetMouseVars();
}

// update graph (called when needed)
function restart(force, line, line2, visbackground, vis2background, vis, vis2, drag_line, path, circle) {
    let {forcetoggle, setPebbleCharge, k, zparams, arc3, dvColor, arc4, nomColor, arc1, gr1Color, arcInd1, arcInd2, gr2Color, record_user_metadata} = app;

    // nodes.id is pegged to allNodes, i.e. the order in which variables are read in
    // nodes.index is floating and depends on updates to nodes. a variables index changes when new variables are added.
    circle.call(force.drag);
    if (forcetoggle[0] == "true") {
        force.gravity(0.1);
        force.charge(setPebbleCharge);
        force.start();
        force.linkStrength(1);
        k = 4; // strength parameter for group attraction/repulsion
        if ((zparams.zgroup1.length > 0) & (zparams.zgroup2.length > 0 )) { // scale down by number of active groups
            k = 2.5;
        }
    } else {
        force.gravity(0);
        force.charge(0);
        force.linkStrength(0);
        k = 0;
    }
    force.resume();

    // path (link) group
    path = path.data(links);

    // update existing links
    // VJD: dashed links between pebbles are "selected". this is disabled for now
    path.classed('selected', x => null)
        .style('marker-start', x => '')
        .style('marker-end', x => '');

    // add new links
    path.enter().append('svg:path')
        .attr('class', 'link')
        .classed('selected', x => null)
        .style('marker-start', x => '')
        .style('marker-end', x => '')
        .on('mousedown', d => { // do we ever need to select a link? make it delete..
            var obj = JSON.stringify(d);
            for (var j = 0; j < links.length; j++) {
                if (obj === JSON.stringify(links[j])) {
                    del(links, j);
                }
            }
        });

    // remove old links
    path.exit().remove();

    // circle (node) group
    circle = circle.data(nodes, x => x.id);

    // update existing nodes (reflexive & selected visual states)
    // d3.rgb is the function adjusting the color here
    circle.selectAll('circle')
        .classed('reflexive', x => x.reflexive)
        .style('fill', x => d3.rgb(x.nodeCol))
        .style('stroke', x => d3.rgb(x.strokeColor))
        .style('stroke-width', x => x.strokeWidth);

    // add new nodes
    let g = circle.enter()
        .append('svg:g')
        .attr('id', x => x.name + 'biggroup');

    // add plot
    g.each(function(d) {
        d3.select(this);
        if (d.plottype == 'continuous') densityNode(d, this);
        else if (d.plottype == 'bar') barsNode(d, this);
    });

    let append = (str, attr) => x => str + x[attr || 'id'];

    g.append("path")
        .attr("id", append('dvArc'))
        .attr("d", arc3)
        .style("fill", dvColor)
        .attr("fill-opacity", 0)
        .on('mouseover', function(d) {
            fillThis(this, .3, 0, 100);
            fill(d, 'dvText', .9, 0, 100);
        })
        .on('mouseout', function(d) {
            fillThis(this, 0, 100, 500);
            fill(d, 'dvText', 0, 100, 500);
        })
        .on('click', d => {
            setColors(d, dvColor);
            legend(dvColor);
            //restart();
            d.group1 = d.group2 = false;
        });

    g.append("text")
        .attr("id", append('dvText'))
        .attr("x", 6)
        .attr("dy", 11.5)
        .attr("fill-opacity", 0)
        .append("textPath")
        .attr("xlink:href", append('#dvArc'))
        .text("Dep Var");

    g.append("path")
        .attr("id", append('nomArc'))
        .attr("d", arc4)
        .style("fill", nomColor)
        .attr("fill-opacity", 0)
        .on('mouseover', function(d) {
            if (d.defaultNumchar == "character") return;
            fillThis(this, .3, 0, 100);
            fill(d, "nomText", .9, 0, 100);
        })
        .on('mouseout', function(d) {
            if (d.defaultNumchar == "character") return;
            fillThis(this, 0, 100, 500);
            fill(d, "nomText", 0, 100, 500);
        })
        .on('click', function(d) {
            if (d.defaultNumchar == "character") return;
            setColors(d, nomColor);
            legend(nomColor);
            //restart();
        });

    g.append("text")
        .attr("id", append("nomText"))
        .attr("x", 6)
        .attr("dy", 11.5)
        .attr("fill-opacity", 0)
        .append("textPath")
        .attr("xlink:href", append("#nomArc"))
        .text("Nominal");

    g.append("path")
        .attr("id", append('grArc'))
        .attr("d", arc1)
        .style("fill",  gr1Color)
        .attr("fill-opacity", 0)
        .on('mouseover', function(d) {
            fill(d, "gr1indicator", .3, 0, 100);
            fill(d, "gr2indicator", .3, 0, 100);
            fillThis(this, .3, 0, 100);
            fill(d, 'grText', .9, 0, 100);
        })
        .on('mouseout', function(d) {
            fill(d, "gr1indicator", 0, 100, 500);
            fill(d, "gr2indicator", 0, 100, 500);
            fillThis(this, 0, 100, 500);
            fill(d, 'grText', 0, 100, 500);
        })
        .on('click', d => {
            //d.group1 = !d.group1;      // This might be easier, but currently set in setColors()
            setColors(d, gr1Color);
            legend(gr1Color);
            //restart();
        });

    g.append("path")
        .attr("id", append('gr1indicator'))
        .attr("d", arcInd1)
        .style("fill", gr1Color)  // something like: zparams.zgroup1.indexOf(node.name) > -1  ?  #FFFFFF : gr1Color)
        .attr("fill-opacity", 0)
        .on('mouseover', function(d) {
            fillThis(this, .3, 0, 100);
            fill(d, "grArc", .1, 0, 100);
            fill(d, 'grText', .9, 0, 100);
        })
        .on('mouseout', function(d) {
            fillThis(this, 0, 100, 500);
            fill(d, "grArc", 0, 100, 500);
            fill(d, 'grText', 0, 100, 500);
        })
        .on('click', d => {
            //d.group1 = !d.group1;      // This might be easier, but currently set in setColors()
            setColors(d, gr1Color);
            legend(gr1Color);
            //restart();
        });

    g.append("path")
        .attr("id", append('gr2indicator'))
        .attr("d", arcInd2)
        .style("fill", gr2Color)  // something like: zparams.zgroup1.indexOf(node.name) > -1  ?  #FFFFFF : gr1Color)
        .attr("fill-opacity", 0)
        .on('mouseover', function(d) {
            fillThis(this, .3, 0, 100);
            fill(d, "grArc", .1, 0, 100);
            fill(d, 'grText', .9, 0, 100);
        })
        .on('mouseout', function(d) {
            fillThis(this, 0, 100, 500);
            fill(d, "grArc", 0, 100, 500);
            fill(d, 'grText', 0, 100, 500);
        })
        .on('click', d => {
            //d.group2 = !d.group2;      // This might be easier, but currently set in setColors()
            setColors(d, gr2Color);
            legend(gr2Color);
            //restart();
        });

    g.append("text")
        .attr("id", append('grText'))
        .attr("x", 6)
        .attr("dy", 11.5)
        .attr("fill-opacity", 0)
        .append("textPath")
        .attr("xlink:href", append('#grArc'))
        .text("Groups");

    g.append('svg:circle')
        .attr('class', 'node')
        .attr('r', d => setPebbleRadius(d))
        .style('pointer-events', 'inherit')
        .style('fill', d => d.nodeCol)
        .style('opacity', "0.5")
        .style('stroke', d => d3.rgb(d.strokeColor).toString())
        .classed('reflexive', d => d.reflexive)
        .on('dblclick', function(d) {
            d3.event.stopPropagation(); // stop click from bubbling
            summaryHold = true;
            console.log("pebble");
            console.log(d.group2);
            if(d.group1){
                var len = allNodes.length;
                var hold = [.6, .2, .9, .8, .1, .3, .4];
                for(var p = 0; p < d.properties.length;p++){
                    let obj = {
                        id: len + p,
                        reflexive: false,
                        name: d.properties[p],
                        labl: "no labels",
                        data: [5, 15, 20, 0, 5, 15, 20],
                        count: hold,
                        nodeCol: colors(p),
                        baseCol: colors(p),
                        strokeColor: selVarColor,
                        strokeWidth: "1",
                        subsetplot: false,
                        subsetrange: ["", ""],
                        setxplot: false,
                        setxvals: ["", ""],
                        grayout: false,
                        group1: false,
                        group2: true,
                        forefront: false
                    };
                    console.log("obj after merge");
                    console.log(allNodes);
                    allNodes.push(obj);
                    nodes.push(obj);
                    console.log(nodes);
                    links.push({
                        source: nodes[d.id-1],
                        target: nodes[nodes.length-1], // not able to access with object id!!
                        left: false,
                        right: true
                    });


                }
                //_restart();
            }
        })
        .on('contextmenu', function(d) {
            // right click on node
            d3.event.preventDefault();
            d3.event.stopPropagation();

            rightClickLast = true;
            mousedown_node = d;
            selected_node = mousedown_node === selected_node ? null : mousedown_node;
            selected_link = null;

            // reposition drag line
            drag_line
                .style('marker-end', 'url(#end-arrow)')
                .classed('hidden', false)
                .attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y);

            svg.on('mousemove', mousemove);
            //restart();
        })
        .on('mouseup', function(d) {
            d3.event.stopPropagation();

            if (rightClickLast) {
                rightClickLast = false;
                return;
            }
            if (!mousedown_node) return;

            // needed by FF
            drag_line
                .classed('hidden', true)
                .style('marker-end', '');

            // check for drag-to-self
            mouseup_node = d;
            if (mouseup_node === mousedown_node) {
                resetMouseVars();
                return;
            }

            // unenlarge target node
            d3.select(this).attr('transform', '');

            // add link to graph (update if exists)
            // NB: links are strictly source < target; arrows separately specified by booleans
            var source, target, direction;
            if (mousedown_node.id < mouseup_node.id) {
                source = mousedown_node;
                target = mouseup_node;
                direction = 'right';
            } else {
                source = mouseup_node;
                target = mousedown_node;
                direction = 'left';
            }

            let link = links.filter(x => x.source == source && x.target == target)[0];
            if (link) {
                link[direction] = true;
            } else {
                link = {
                    source: source,
                    target: target,
                    left: false,
                    right: false
                };
                link[direction] = true;
                links.push(link);
            }

            // select new link
            selected_link = link;
            selected_node = null;
            svg.on('mousemove', null);

            resetMouseVars();
            //restart();
        });

    // show node names
    g.append('svg:text')
        .attr('x', 0)
        .attr('y', 15)
        .attr('class', 'id')
        .text(d => d.name);

    // show summary stats on mouseover
    // SVG doesn't support text wrapping, use html instead
    g.selectAll("circle.node")
        .on("mouseover", d => {
            tabLeft('tab3');
            varSummary(d);
            d.forefront = true;

            byId('transformations').setAttribute('style', 'display:block');
            byId("transSel").selectedIndex = d.id;
            transformVar = valueKey[d.id];

            fill(d, "dvArc", .1, 0, 100);
            fill(d, "dvText", .5, 0, 100);
            fill(d, "grArc", .1, 0, 100);
            fill(d, "grText", .5, 0, 100);

            if (d.defaultNumchar == "numeric") {
                fill(d, "nomArc", .1, 0, 100);
                fill(d, "nomText", .5, 0, 100);
            }
            fill(d, "csArc", .1, 0, 100);
            fill(d, "csText", .5, 0, 100);
            fill(d, "timeArc", .1, 0, 100);
            fill(d, "timeText", .5, 0, 100);

            m.redraw();
        })
        .on('mouseout', d => {
            d.forefront = false;
            summaryHold || tabLeft(subset ? 'tab2' : 'tab1');
            'csArc csText timeArc timeText dvArc dvText nomArc nomText grArc grText'.split(' ').map(x => fill(d, x, 0, 100, 500));
            m.redraw();
        });

    // the transformation variable list is silently updated as pebbles are added/removed
    d3.select("#transSel")
        .selectAll('li')
        .remove();

    d3.select("#transSel")
        .selectAll('li')
        .data(nodes.map(x => x.name)) // set to variables in model space as they're added
        .enter()
        .append("li")
        .text(d => d);

    // remove old nodes
    circle.exit().remove();
    force.start();

    // save workspaces
    console.log('ok ws');
    record_user_metadata();
}

export function results_layout(v, v2) {
    let {gr1Color, gr2Color, RADIUS, height, width, allNodes, fakeClick, myspace} = app;

    nodes = [];//allNodes;
    //nodes = Object.values(allPipelineInfo);
    // app starts here

    let svg = d3.select('#whitespace0');
    svg.selectAll('*').remove();
    svg.attr('id', () => "whitespace".concat(myspace))
        .attr('height', height)
        .on('mousedown', mousedown)
        .on('mouseup', mouseup);
    let [line, line2, visbackground, vis2background, vis, vis2, drag_line, path, circle] = app.setup_svg(svg);
    let force = d3.layout.force()
        .nodes(nodes)
        .links(links)
        .size([width, height])
        .linkDistance(150)
        .charge(-800)
        .on('tick', _ => tick(path, circle));

    d3.select(window)
        .on('click', () => {
            // all clicks will bubble here unless event.stopPropagation()
            $('#transList').fadeOut(100);
            $('#transSel').fadeOut(100);
        });

    restart(force, line, line2, visbackground, vis2background, vis, vis2, drag_line, path, circle); // initializes force.layout()
    fakeClick();
}
