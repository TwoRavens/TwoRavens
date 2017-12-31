import m from 'mithril';
import * as tour from '../tour'

export default class Footer {
    view(vnode) {
        return (m(".ticker[id='ticker']",
            [
                m("span.label.label-default", {style: {"margin-left": "10px"}}, "Tours"),
                m("button.btn.btn-default.btn-sm[id='tourButtonGeneral'][type='button']", {
                    style: {
                        "margin-left": "5px",
                        "margin-top": "4px"
                    },
                    onclick: function(e) {
                        tour.tourStartGeneral();
                        e.redraw = false;
                    }
                }, "General"),
                m("button.btn.btn-default.btn-sm[id='tourButtonActor'][type='button']", {
                    style: {
                        "margin-left": "5px",
                        "margin-top": "4px"
                    },
                    onclick: function(e) {
                        tour.tourStartActor();
                        e.redraw = false;
                    }
                }, "Actor"),
                m("button.btn.btn-default.btn-sm[id='tourButtonDate'][type='button']", {
                    style: {
                        "margin-left": "5px",
                        "margin-top": "4px"
                    },
                    onclick: function(e) {
                        tour.tourStartDate();
                        e.redraw = false;
                    }
                }, "Date"),
                m("button.btn.btn-default.btn-sm[id='tourButtonAction'][type='button']", {
                    style: {
                        "margin-left": "5px",
                        "margin-top": "4px"
                    },
                    onclick: function(e) {
                        tour.tourStartAction();
                        e.redraw = false;
                    }
                }, "Action"),
                m("button.btn.btn-default.btn-sm[id='tourButtonLocation'][type='button']", {
                    style: {
                        "margin-left": "5px",
                        "margin-top": "4px"
                    },
                    onclick: function(e) {
                        tour.tourStartLocation();
                        e.redraw = false;
                    }
                }, "Location"),
                m("button.btn.btn-default.btn-sm[id='tourButtonCoordinates'][type='button']", {
                    style: {
                        "margin-left": "5px",
                        "margin-top": "4px"
                    },
                    onclick: function(e) {
                        tour.tourStartCoordinates();
                        e.redraw = false;
                    }
                }, "Coordinates"),
                m("button.btn.btn-default.btn-sm[id='tourButtonCustom'][type='button']", {
                    style: {
                        "margin-left": "5px",
                        "margin-top": "4px"
                    },
                    onclick: function(e) {
                        tour.tourStartCustom();
                        e.redraw = false;
                    }
                }, "Custom"),

                // Record Count
                m("span.label.label-default[id='recordCount']", {
                    style: {
                        "margin-top": "10px",
                        "margin-right": "10px",
                        "float": "right"
                    }
                })
            ]
        ));
    }
}