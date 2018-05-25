import m from 'mithril';
import {setupCoordinates} from "../subsets/Coordinates"
import {panelMargin} from "../../../common/common";

export default class CanvasCoordinates {

    oncreate(){
        setupCoordinates();
    }

    view(vnode) {
        let {display} = vnode.attrs;
        return (m("#canvasCoordinates.subsetDiv", {style: {"display": display, 'padding-top': panelMargin}},
            [
                m(".form-inline[id='latitudeInterval']", {
                        style: {
                            "display": "inline-block",
                            "vertical-align": "top",
                            "margin": "20px",
                            "margin-bottom": "0"
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
                            "margin": "20px",
                            "margin-bottom": "0"
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
                        "height": "calc(100% - 100px)"
                    }
                })
            ]
        ));
    }
}