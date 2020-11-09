import m from 'mithril';
import * as d3 from "d3";

import {panelMargin} from "../../common/common";
import TextField from "../../common/views/TextField";

// preferences contains:
// latUpper
// latUpperLabel
// latLower
// latLowerLabel
// lonLeft
// lonLeftLabel

let widthCoord = 0.2,
    heightCoord = 0.2,
    dragbarw = 0.03;

function clip(x, lower, upper) {
    return Math.max(Math.min(x, upper), lower);
}

// called after a drag event
let setInputBounds = (vnode, d) => {
    let {preferences} = vnode.attrs;
    preferences['latUpperLabel'] = "North Latitude";
    preferences['latLowerLabel'] = "South Latitude";

    // 180, not 360 due to svg dimensions
    preferences['latUpper'] = Math.round(1000 * -(d.y * 180 - 90)) / 1000;
    preferences['latLower'] = Math.round(1000 * -((d.y + heightCoord) * 180 - 90)) / 1000;

    preferences['lonLeftLabel'] = "West Longitude";
    preferences['lonRightLabel'] = "East Longitude";

    preferences['lonLeft'] = Math.round(1000 * (d.x * 180 - 180)) / 1000;
    preferences['lonRight'] = Math.round(1000 * ((d.x + widthCoord) * 180 - 180)) / 1000;

    m.redraw();
};


export default class CanvasCoordinates {
    oninit(vnode) {
        let {preferences} = vnode.attrs;

        preferences['latUpperLabel'] = "North Latitude";
        preferences['latLowerLabel'] = "South Latitude";

        // 180, not 360 due to svg dimensions
        preferences['latUpper'] = 56.682;
        preferences['latLower'] = 26.381;

        preferences['lonLeftLabel'] = "West Longitude";
        preferences['lonRightLabel'] = "East Longitude";

        preferences['lonLeft'] = -9.524;
        preferences['lonRight'] = 17.823;
    }

    oncreate(vnode) {
        let {preferences} = vnode.attrs;

        let drag = d3.drag()
            .subject(Object)
            .on("drag", (e, d) => this.dragmove(vnode, e, d));

        let dragright = d3.drag()
            .subject(Object)
            .on("drag", (e, d) => this.rdragresize(vnode, e, d));

        let dragleft = d3.drag()
            .subject(Object)
            .on("drag", (e, d) => this.ldragresize(vnode, e, d));

        let dragtop = d3.drag()
            .subject(Object)
            .on("drag", (e, d) => this.tdragresize(vnode, e, d));

        let dragbottom = d3.drag()
            .subject(Object)
            .on("drag", (e, d) => this.bdragresize(vnode, e, d));

        let dragbottomright = d3.drag()
            .subject(Object)
            .on("drag", (e, d) => this.brdragresize(vnode, e, d));

        let dragbottomleft = d3.drag()
            .subject(Object)
            .on("drag", (e, d) => this.bldragresize(vnode, e, d));

        let dragtopright = d3.drag()
            .subject(Object)
            .on("drag", (e, d) => this.trdragresize(vnode, e, d));

        let dragtopleft = d3.drag()
            .subject(Object)
            .on("drag", (e, d) => this.tldragresize(vnode, e, d));

        this.svgMap = d3.select('#worldMap');
        this.imgs = this.svgMap.selectAll("image").data([0]);
        this.imgs.enter()
            .append("svg:image")
            .attr("id", "worldMapImage")
            .attr("xlink:href", "/static/images/eventdata/world.svg")
            .attr("x", "0")
            .attr("y", "0")
            .attr("width", "100%")
            .attr("height", "100%");

        this.newg = this.svgMap.append("g")
            .data([{x: .5, y: .5}]);

        this.dragrect = this.newg.append("rect")
            .attr("id", "active")
            .attr("x", function (d) {
                return d.x;
            })
            .attr("y", function (d) {
                return d.y;
            })
            .attr("height", heightCoord)
            .attr("width", widthCoord)
            .attr("fill-opacity", .2)
            .attr("fill", "#9D9D9D !important")
            .attr("stroke", "#9D9D9D")
            .attr("stroke-width", .005)
            .attr("cursor", "move")
            .call(drag);

        this.dragbarleft = this.newg.append("rect")
            .attr("x", function (d) {
                return d.x - (dragbarw / 2);
            })
            .attr("y", function (d) {
                return d.y + (dragbarw / 2);
            })
            .attr("height", heightCoord - dragbarw)
            .attr("id", "dragleft")
            .attr("width", dragbarw)
            .attr("fill", "#ADADAD")
            .attr("fill-opacity", .0)
            .attr("cursor", "ew-resize")
            .call(dragleft);

        this.dragbarright = this.newg.append("rect")
            .attr("x", function (d) {
                return d.x + widthCoord - (dragbarw / 2);
            })
            .attr("y", function (d) {
                return d.y + (dragbarw / 2);
            })
            .attr("id", "dragright")
            .attr("height", heightCoord - dragbarw)
            .attr("width", dragbarw)
            .attr("fill", "#ADADAD")
            .attr("fill-opacity", .0)
            .attr("cursor", "ew-resize")
            .call(dragright);

        this.dragbartop = this.newg.append("rect")
            .attr("x", function (d) {
                return d.x + (dragbarw / 2);
            })
            .attr("y", function (d) {
                return d.y - (dragbarw / 2);
            })
            .attr("height", dragbarw)
            .attr("id", "dragtop")
            .attr("width", widthCoord - dragbarw)
            .attr("fill", "#ADADAD")
            .attr("fill-opacity", .0)
            .attr("cursor", "ns-resize")
            .call(dragtop);

        this.dragbarbottom = this.newg.append("rect")
            .attr("x", function (d) {
                return d.x + (dragbarw / 2);
            })
            .attr("y", function (d) {
                return d.y + heightCoord - (dragbarw / 2);
            })
            .attr("id", "dragbottom")
            .attr("height", dragbarw)
            .attr("width", widthCoord - dragbarw)
            .attr("fill", "#ADADAD")
            .attr("fill-opacity", .0)
            .attr("cursor", "ns-resize")
            .call(dragbottom);

        this.dragbarbottomright = this.newg.append("rect")
            .attr("x", function (d) {
                return d.x + widthCoord - (dragbarw / 2);
            })
            .attr("y", function (d) {
                return d.y + heightCoord - (dragbarw / 2);
            })
            .attr("id", "dragbottomright")
            .attr("height", dragbarw)
            .attr("width", dragbarw)
            .attr("fill", "#ADADAD")
            .attr("fill-opacity", .0)
            .attr("cursor", "nwse-resize")
            .call(dragbottomright);

        this.dragbarbottomleft = this.newg.append("rect")
            .attr("x", function (d) {
                return d.x - (dragbarw / 2);
            })
            .attr("y", function (d) {
                return d.y + heightCoord - (dragbarw / 2);
            })
            .attr("id", "dragbottomleft")
            .attr("height", dragbarw)
            .attr("width", dragbarw)
            .attr("fill", "#ADADAD")
            .attr("fill-opacity", .0)
            .attr("cursor", "nesw-resize")
            .call(dragbottomleft);

        this.dragbartopleft = this.newg.append("rect")
            .attr("x", function (d) {
                return d.x - (dragbarw / 2);
            })
            .attr("y", function (d) {
                return d.y - (dragbarw / 2);
            })
            .attr("id", "dragtopleft")
            .attr("height", dragbarw)
            .attr("width", dragbarw)
            .attr("fill", "#ADADAD")
            .attr("fill-opacity", .0)
            .attr("cursor", "nwse-resize")
            .call(dragtopleft);

        this.dragbartopright = this.newg.append("rect")
            .attr("x", function (d) {
                return d.x + widthCoord - (dragbarw / 2);
            })
            .attr("y", function (d) {
                return d.y - (dragbarw / 2);
            })
            .attr("id", "dragtopleft")
            .attr("height", dragbarw)
            .attr("width", dragbarw)
            .attr("fill", "#ADADAD")
            .attr("fill-opacity", .0)
            .attr("cursor", "nesw-resize")
            .call(dragtopright);


        this.updateLatitude(preferences);
        this.updateLongitude(preferences);
    }


    dragmove(vnode, e, d) {
        this.dragrect
            .attr("x", d.x = Math.max(0, Math.min(2 - widthCoord, e.x)));
        this.dragbarleft
            .attr("x", function (d) {
                return d.x - (dragbarw / 2);
            });
        this.dragbarright
            .attr("x", function (d) {
                return d.x + widthCoord - (dragbarw / 2);
            });
        this.dragbartop
            .attr("x", function (d) {
                return d.x + (dragbarw / 2);
            });
        this.dragbarbottom
            .attr("x", function (d) {
                return d.x + (dragbarw / 2);
            });

        this.dragrect
            .attr("y", d.y = Math.max(0, Math.min(1 - heightCoord, e.y)));
        this.dragbarleft
            .attr("y", function (d) {
                return d.y + (dragbarw / 2);
            });
        this.dragbarright
            .attr("y", function (d) {
                return d.y + (dragbarw / 2);
            });
        this.dragbartop
            .attr("y", function (d) {
                return d.y - (dragbarw / 2);
            });
        this.dragbarbottom
            .attr("y", function (d) {
                return d.y + heightCoord - (dragbarw / 2);
            });

        this.dragbarbottomleft
            .attr("x", function (d) {
                return d.x - (dragbarw / 2);
            });
        this.dragbarbottomright
            .attr("x", function (d) {
                return d.x + widthCoord - (dragbarw / 2);
            });
        this.dragbartopleft
            .attr("x", function (d) {
                return d.x - (dragbarw / 2);
            });
        this.dragbartopright
            .attr("x", function (d) {
                return d.x + widthCoord - (dragbarw / 2);
            });

        this.dragbarbottomleft
            .attr("y", function (d) {
                return d.y + heightCoord - (dragbarw / 2);
            });
        this.dragbarbottomright
            .attr("y", function (d) {
                return d.y + heightCoord - (dragbarw / 2);
            });
        this.dragbartopleft
            .attr("y", function (d) {
                return d.y - (dragbarw / 2);
            });
        this.dragbartopright
            .attr("y", function (d) {
                return d.y - (dragbarw / 2);
            });

        setInputBounds(vnode, d)
    };

    ldragresize(vnode, e, d) {
        let oldx = d.x;
        //Max x on the right is x + width - dragbarw
        //Max x on the left is 0 - (dragbarw/2)
        d.x = Math.max(0, Math.min(d.x + widthCoord - (dragbarw / 2), e.x));
        widthCoord = widthCoord + (oldx - d.x);
        this.dragbarleft
            .attr("x", function (d) {
                return d.x - (dragbarw / 2);
            });

        this.dragrect
            .attr("x", function (d) {
                return d.x;
            })
            .attr("width", widthCoord);

        this.dragbartop
            .attr("x", function (d) {
                return d.x + (dragbarw / 2);
            })
            .attr("width", widthCoord - dragbarw);
        this.dragbarbottom
            .attr("x", function (d) {
                return d.x + (dragbarw / 2);
            })
            .attr("width", widthCoord - dragbarw);

        this.dragbarbottomleft
            .attr("x", function (d) {
                return d.x - (dragbarw / 2);
            });
        this.dragbartopleft
            .attr("x", function (d) {
                return d.x - (dragbarw / 2);
            });

        setInputBounds(vnode, d)
    };

    rdragresize(vnode, e, d) {
        //Max x on the left is x - width
        //Max x on the right is width of screen + (dragbarw/2)
        let dragx = Math.max(d.x + (dragbarw / 2), Math.min(2, d.x + widthCoord + e.dx));
        //recalculate width
        widthCoord = dragx - d.x;

        //move the right drag handle
        this.dragbarright
            .attr("x", function () {
                return dragx - (dragbarw / 2)
            });

        //resize the drag rectangle
        //as we are only resizing from the right, the x coordinate does not need to change
        this.dragrect
            .attr("width", widthCoord);
        this.dragbartop
            .attr("width", widthCoord - dragbarw);
        this.dragbarbottom
            .attr("width", widthCoord - dragbarw);

        this.dragbarbottomright
            .attr("x", function (d) {
                return d.x + widthCoord - (dragbarw / 2);
            });
        this.dragbartopright
            .attr("x", function (d) {
                return d.x + widthCoord - (dragbarw / 2);
            });

        setInputBounds(vnode, d)
    };


    tdragresize(vnode, e, d) {

        let oldy = d.y;
        //Max x on the right is x + width - dragbarw
        //Max x on the left is 0 - (dragbarw/2)
        d.y = Math.max(0, Math.min(d.y + heightCoord - (dragbarw / 2), e.y));

        heightCoord = heightCoord + (oldy - d.y);
        this.dragbartop
            .attr("y", function (d) {
                return d.y - (dragbarw / 2);
            });

        this.dragrect
            .attr("y", function (d) {
                return d.y;
            })
            .attr("height", heightCoord);

        this.dragbarleft
            .attr("y", function (d) {
                return d.y + (dragbarw / 2);
            })
            .attr("height", heightCoord - dragbarw);
        this.dragbarright
            .attr("y", function (d) {
                return d.y + (dragbarw / 2);
            })
            .attr("height", heightCoord - dragbarw);

        this.dragbartopleft
            .attr("y", function (d) {
                return d.y - (dragbarw / 2);
            });
        this.dragbartopright
            .attr("y", function (d) {
                return d.y - (dragbarw / 2);
            });

        setInputBounds(vnode, d)
    };

    bdragresize(vnode, e, d) {
        //Max x on the left is x - width
        //Max x on the right is width of screen + (dragbarw/2)
        let dragy = Math.max(d.y + (dragbarw / 2), Math.min(2, d.y + heightCoord + e.dy));

        //recalculate width
        heightCoord = dragy - d.y;

        //move the right drag handle
        this.dragbarbottom
            .attr("y", function () {
                return dragy - (dragbarw / 2)
            });

        //resize the drag rectangle
        //as we are only resizing from the right, the x coordinate does not need to change
        this.dragrect
            .attr("height", heightCoord);
        this.dragbarleft
            .attr("height", heightCoord - dragbarw);
        this.dragbarright
            .attr("height", heightCoord - dragbarw);

        this.dragbarbottomleft
            .attr("y", function (d) {
                return d.y + heightCoord - (dragbarw / 2);
            });
        this.dragbarbottomright
            .attr("y", function (d) {
                return d.y + heightCoord - (dragbarw / 2);
            });

        setInputBounds(vnode, d)
    };

    trdragresize(vnode, e, d) {
        this.tdragresize(vnode, e, d);
        this.rdragresize(vnode, e, d);
    };

    tldragresize(vnode, e, d) {
        this.tdragresize(vnode, e, d);
        this.ldragresize(vnode, e, d);
    };

    bldragresize(vnode, e, d) {
        this.bdragresize(vnode, e, d);
        this.ldragresize(vnode, e, d);
    };

    brdragresize(vnode, e, d) {
        this.bdragresize(vnode, e, d);
        this.rdragresize(vnode, e, d);
    };

    updateLatitude(preferences) {

        // Validation
        if (isNaN(preferences['latLower']) || preferences['latLower'] === '') return;
        if (isNaN(preferences['latUpper']) || preferences['latUpper'] === '') return;

        let valLower = parseFloat(preferences['latLower']);
        if (valLower < -90 || valLower > 90) {
            preferences['latLower'] = clip(valLower, -90, 90);
        }

        let valUpper = parseFloat(preferences['latUpper']);
        if (valUpper < -90 || valUpper > 90) {
            preferences['latUpper'] = clip(valUpper, -90, 90);
        }

        let lowerBound;
        let upperBound;

        // Correct bounds if necessary
        if (parseFloat(preferences['latUpper']) > parseFloat(preferences['latLower'])) {
            preferences['latUpperLabel'] = "North Latitude";
            preferences['latLowerLabel'] = "South Latitude";
        } else {
            preferences['latUpperLabel'] = "South Latitude";
            preferences['latLowerLabel'] = "North Latitude";
        }
        lowerBound = parseFloat(preferences['latLower']);
        upperBound = parseFloat(preferences['latUpper']);

        // Transform to map coordinates
        lowerBound = (-lowerBound + 90) / 180;
        upperBound = (-upperBound + 90) / 180;

        heightCoord = Math.abs(upperBound - lowerBound);

        this.newg.attr("y", upperBound);

        this.dragrect
            .attr("y", function (d) {
                d.y = upperBound;
                return upperBound;
            })
            .attr("height", heightCoord);

        this.dragbarleft
            .attr("y", function () {
                return upperBound + (dragbarw / 2);
            })
            .attr("height", heightCoord - dragbarw);
        this.dragbarright
            .attr("y", function () {
                return upperBound + (dragbarw / 2);
            })
            .attr("height", heightCoord - dragbarw);
        this.dragbartop
            .attr("y", function () {
                return upperBound - (dragbarw / 2);
            });
        this.dragbarbottom
            .attr("y", function () {
                return upperBound + heightCoord - (dragbarw / 2);
            });

        this.dragbarbottomleft
            .attr("y", function () {
                return upperBound + heightCoord - (dragbarw / 2);
            });
        this.dragbarbottomright
            .attr("y", function () {
                return upperBound + heightCoord - (dragbarw / 2);
            });
        this.dragbartopleft
            .attr("y", function () {
                return upperBound - (dragbarw / 2);
            });
        this.dragbartopright
            .attr("y", function () {
                return upperBound - (dragbarw / 2);
            });
    }

    updateLongitude(preferences) {

        // Validation
        if (isNaN(preferences['lonLeft']) || preferences['lonLeft'] === '') return;
        if (isNaN(preferences['lonRight']) || preferences['lonRight'] === '') return;

        let valLeft = parseFloat(preferences['lonRight']);
        if (valLeft < -180 || valLeft > 180) {
            preferences['lonRight'] = clip(valLeft, -180, 180);
        }

        let valRight = parseFloat(preferences['lonLeft']);
        if (valRight < -180 || valRight > 180) {
            preferences['lonLeft'] = clip(valRight, -180, 180);
        }

        let leftBound;
        let rightBound;

        // Correct bounds if necessary
        if (parseFloat(preferences['lonLeft']) < parseFloat(preferences['lonRight'])) {
            preferences['lonLeftLabel'] = "West Longitude";
            preferences['lonRightLabel'] = "East Longitude";

            leftBound = parseFloat(preferences['lonLeft']);
            rightBound = parseFloat(preferences['lonRight']);

        } else {
            preferences['lonLeftLabel'] = "East Longitude";
            preferences['lonRightLabel'] = "West Longitude";

            leftBound = parseFloat(preferences['lonRight']);
            rightBound = parseFloat(preferences['lonLeft']);
        }

        // Transform to map coordinates
        leftBound = (leftBound + 180) / 180;
        rightBound = (rightBound + 180) / 180;

        widthCoord = Math.abs(rightBound - leftBound);

        this.newg.attr("x", leftBound);

        this.dragrect
            .attr("x", function (d) {
                d.x = leftBound;
                return leftBound
            })
            .attr("width", widthCoord);

        this.dragbartop
            .attr("x", function () {
                return leftBound + (dragbarw / 2);
            })
            .attr("width", widthCoord - dragbarw);
        this.dragbarbottom
            .attr("x", function () {
                return leftBound + (dragbarw / 2);
            })
            .attr("width", widthCoord - dragbarw);
        this.dragbarleft
            .attr("x", function () {
                return leftBound - (dragbarw / 2);
            });
        this.dragbarright
            .attr("x", function () {
                return leftBound + widthCoord - (dragbarw / 2);
            });

        this.dragbarbottomleft
            .attr("x", function () {
                return leftBound - (dragbarw / 2);
            });
        this.dragbarbottomright
            .attr("x", function () {
                return leftBound + widthCoord - (dragbarw / 2);
            });
        this.dragbartopleft
            .attr("x", function () {
                return leftBound - (dragbarw / 2);
            });
        this.dragbartopright
            .attr("x", function () {
                return leftBound + widthCoord - (dragbarw / 2);
            });
    }

    onupdate(vnode) {
        let {preferences} = vnode.attrs;
        this.updateLatitude(preferences);
        this.updateLongitude(preferences);
    }

    view(vnode) {
        let {preferences} = vnode.attrs;
        if (Object.keys(preferences).length === 0) this.oninit(vnode);
        return (m("#canvasCoordinates", {style: {'padding-top': panelMargin}},
            [
                m("#latitudeInterval.form-inline", {
                        style: {
                            "display": "inline-block",
                            "vertical-align": "top",
                            "margin": "20px",
                            "margin-bottom": "0"
                        }
                    },
                    [
                        m("label#latUpperLabel[for='latUpper']", {
                            style: {
                                "width": "120px",
                                "float": "left",
                                "display": "inline-block",
                                "margin-top": "10px"
                            }
                        }, preferences['latUpperLabel']),
                        m(TextField, {
                            id: 'latUpper',
                            value: preferences['latUpper'],
                            style: {"display": "inline-block", "float": "left", "width": "auto"},
                            oninput: (value) => {
                                preferences['latUpper'] = value;
                                this.updateLatitude(preferences);
                            }
                        }),
                        m("label#latLowerLabel[for='latLower']", {
                            style: {
                                "width": "120px",
                                "float": "left",
                                "display": "inline-block",
                                "margin-top": "10px",
                                "margin-left": "10px"
                            }
                        }, preferences['latLowerLabel']),
                        m(TextField, {
                            id: 'latLower',
                            value: preferences['latLower'],
                            style: {"display": "inline-block", "float": "left", "width": "auto"},
                            oninput: (value) => {
                                preferences['latLower'] = value;
                                this.updateLatitude(preferences);
                            }
                        })
                    ]
                ),
                m("#longitudeInterval.form-inline", {
                        style: {
                            "display": "inline-block",
                            "vertical-align": "top",
                            "margin": "20px",
                            "margin-bottom": "0"
                        }
                    },
                    [
                        m("label#lonLeftLabel[for='LonLeft']", {
                            style: {
                                "width": "120px",
                                "float": "left",
                                "display": "inline-block",
                                "margin-top": "10px"
                            }
                        }, preferences['lonLeftLabel']),
                        m(TextField, {
                            id: 'lonLeft',
                            value: preferences['lonLeft'],
                            style: {"display": "inline-block", "float": "left", "width": "auto"},
                            oninput: (value) => {
                                preferences['lonLeft'] = value;
                                this.updateLongitude(preferences);
                            }
                        }),
                        m("label#lonRightLabel[for='lonRight']", {
                            style: {
                                "width": "120px",
                                "float": "left",
                                "display": "inline-block",
                                "margin-top": "10px",
                                "margin-left": "10px"
                            }
                        }, preferences['lonRightLabel']),
                        m(TextField, {
                            id: 'lonRight',
                            value: preferences['lonRight'],
                            style: {"display": "inline-block", "float": "left", "width": "auto"},
                            oninput: (value) => {
                                preferences['lonRight'] = value;
                                this.updateLongitude(preferences);
                            }
                        })
                    ]
                ),
                m("svg#worldMap[preserveAspectRatio='xMinYMid'][viewBox='0 0 2 1']", {
                    style: {
                        "margin-left": "10px",
                        "width": "calc(100% - 45px)",
                        "height": "calc(100% - 100px)"
                    }
                })
            ]
        ));
    }
}