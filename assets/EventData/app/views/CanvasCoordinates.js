import m from 'mithril';

export default class CanvasCoordinates {

    oncreate(){
        $("#latUpper").keyup(setLatitude);
        $("#latLower").keyup(setLatitude);
        $("#lonLeft").keyup(setLongitude);
        $("#lonRight").keyup(setLongitude);

        svgMap = d3.select('#worldMap');
        imgs = svgMap.selectAll("image").data([0]);
        imgs.enter()
            .append("svg:image")
            .attr("id", "worldMapImage")
            .attr("xlink:href", "../images/world.svg")
            .attr("x", "0")
            .attr("y", "0")
            .attr("width", "100%")
            .attr("height", "100%");

        newg = svgMap.append("g")
            .data([{x: .5, y: .5}]);

        dragrect = newg.append("rect")
            .attr("id", "active")
            .attr("x", function(d) { return d.x; })
            .attr("y", function(d) { return d.y; })
            .attr("height", heightCoord)
            .attr("width", widthCoord)
            .attr("fill-opacity", .2)
            .attr("fill", "#9D9D9D !important")
            .attr("stroke", "#9D9D9D")
            .attr("stroke-width", .005)
            .attr("cursor", "move")
            .call(drag);

        dragbarleft = newg.append("rect")
            .attr("x", function(d) { return d.x - (dragbarw/2); })
            .attr("y", function(d) { return d.y + (dragbarw/2); })
            .attr("height", heightCoord - dragbarw)
            .attr("id", "dragleft")
            .attr("width", dragbarw)
            .attr("fill", "#ADADAD")
            .attr("fill-opacity", .0)
            .attr("cursor", "ew-resize")
            .call(dragleft);

        dragbarright = newg.append("rect")
            .attr("x", function(d) { return d.x + widthCoord - (dragbarw/2); })
            .attr("y", function(d) { return d.y + (dragbarw/2); })
            .attr("id", "dragright")
            .attr("height", heightCoord - dragbarw)
            .attr("width", dragbarw)
            .attr("fill", "#ADADAD")
            .attr("fill-opacity", .0)
            .attr("cursor", "ew-resize")
            .call(dragright);

        dragbartop = newg.append("rect")
            .attr("x", function(d) { return d.x + (dragbarw/2); })
            .attr("y", function(d) { return d.y - (dragbarw/2); })
            .attr("height", dragbarw)
            .attr("id", "dragtop")
            .attr("width", widthCoord - dragbarw)
            .attr("fill", "#ADADAD")
            .attr("fill-opacity", .0)
            .attr("cursor", "ns-resize")
            .call(dragtop);

        dragbarbottom = newg.append("rect")
            .attr("x", function(d) { return d.x + (dragbarw/2); })
            .attr("y", function(d) { return d.y + heightCoord - (dragbarw/2); })
            .attr("id", "dragbottom")
            .attr("height", dragbarw)
            .attr("width", widthCoord - dragbarw)
            .attr("fill", "#ADADAD")
            .attr("fill-opacity", .0)
            .attr("cursor", "ns-resize")
            .call(dragbottom);

        dragbarbottomright = newg.append("rect")
            .attr("x", function(d) { return d.x + widthCoord - (dragbarw/2); })
            .attr("y", function(d) { return d.y + heightCoord - (dragbarw/2); })
            .attr("id", "dragbottomright")
            .attr("height", dragbarw)
            .attr("width", dragbarw)
            .attr("fill", "#ADADAD")
            .attr("fill-opacity", .0)
            .attr("cursor", "nwse-resize")
            .call(dragbottomright);

        dragbarbottomleft = newg.append("rect")
            .attr("x", function(d) { return d.x - (dragbarw/2); })
            .attr("y", function(d) { return d.y + heightCoord - (dragbarw/2); })
            .attr("id", "dragbottomleft")
            .attr("height", dragbarw)
            .attr("width", dragbarw)
            .attr("fill", "#ADADAD")
            .attr("fill-opacity", .0)
            .attr("cursor", "nesw-resize")
            .call(dragbottomleft);

        dragbartopleft = newg.append("rect")
            .attr("x", function(d) { return d.x - (dragbarw/2); })
            .attr("y", function(d) { return d.y - (dragbarw/2); })
            .attr("id", "dragtopleft")
            .attr("height", dragbarw)
            .attr("width", dragbarw)
            .attr("fill", "#ADADAD")
            .attr("fill-opacity", .0)
            .attr("cursor", "nwse-resize")
            .call(dragtopleft);

        dragbartopright = newg.append("rect")
            .attr("x", function(d) { return d.x + widthCoord - (dragbarw/2); })
            .attr("y", function(d) { return d.y - (dragbarw/2); })
            .attr("id", "dragtopleft")
            .attr("height", dragbarw)
            .attr("width", dragbarw)
            .attr("fill", "#ADADAD")
            .attr("fill-opacity", .0)
            .attr("cursor", "nesw-resize")
            .call(dragtopright);

        setLatitude();
        setLongitude();
    }

    view(vnode) {
        return (m(".subsetDiv[id='subsetCoordinates']", {style: {"display": "none"}},
            [
                m(".form-inline[id='latitudeInterval']", {
                        style: {
                            "display": "inline-block",
                            "vertical-align": "top",
                            "margin": "20px"
                        }
                    },
                    [
                        m("label[for='latUpper'][id='latUpperLabel']", {
                            style: {
                                "width": "120px",
                                "float": "left",
                                "display": "inline-block",
                                "margin-top": "10px"
                            }
                        }, "North Latitude"),
                        m("input.form-control[id='latUpper'][type='text'][value='56.682']", {
                            style: {
                                "display": "inline-block",
                                "float": "left"
                            }
                        }),
                        m("label[for='latLower'][id='latLowerLabel']", {
                            style: {
                                "width": "120px",
                                "float": "left",
                                "display": "inline-block",
                                "margin-top": "10px",
                                "margin-left": "10px"
                            }
                        }, "South Latitude"),
                        m("input.form-control[id='latLower'][type='text'][value='26.381']", {
                            style: {
                                "display": "inline-block",
                                "float": "left"
                            }
                        })
                    ]
                ),
                m(".form-inline[id='longitudeInterval']", {
                        style: {
                            "display": "inline-block",
                            "vertical-align": "top",
                            "margin-left": "20px"
                        }
                    },
                    [
                        m("label[for='LonLeft'][id='lonLeftLabel']", {
                            style: {
                                "width": "120px",
                                "float": "left",
                                "display": "inline-block",
                                "margin-top": "10px"
                            }
                        }, "West Longitude"),
                        m("input.form-control[id='lonLeft'][type='text'][value='-9.524']", {
                            style: {
                                "display": "inline-block",
                                "float": "left"
                            }
                        }),
                        m("label[for='lonRight'][id='lonRightLabel']", {
                            style: {
                                "width": "120px",
                                "float": "left",
                                "display": "inline-block",
                                "margin-top": "10px",
                                "margin-left": "10px"
                            }
                        }, "East Longitude"),
                        m("input.form-control[id='lonRight'][type='text'][value='17.823']", {
                            style: {
                                "display": "inline-block",
                                "float": "left"
                            }
                        })
                    ]
                ),
                m("svg[id='worldMap'][preserveAspectRatio='xMinYMid'][viewBox='0 0 2 1']", {
                    style: {
                        "margin-left": "10px",
                        "width": "calc(100% - 45px)",
                        "height": "calc(100% - 120px)"
                    }
                })
            ]
        ));
    }
}