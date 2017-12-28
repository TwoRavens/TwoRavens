export default class Footer {
    view(vnode) {
        return (m(".ticker[id='ticker']",
            [
                m("span.label.label-default", {style: {"margin-left": "10px"}}, "Tours"),
                m("button.btn.btn-default.btn-sm[id='tourButtonGeneral'][onclick='hopscotch.startTour(generalTour)'][type='button']", {
                    style: {
                        "margin-left": "5px",
                        "margin-top": "4px"
                    }
                }, "General"),
                m("button.btn.btn-default.btn-sm[id='tourButtonActor'][onclick='tourStartActor()'][type='button']", {
                    style: {
                        "margin-left": "5px",
                        "margin-top": "4px"
                    }
                }, "Actor"),
                m("button.btn.btn-default.btn-sm[id='tourButtonDate'][onclick='tourStartDate()'][type='button']", {
                    style: {
                        "margin-left": "5px",
                        "margin-top": "4px"
                    }
                }, "Date"),
                m("button.btn.btn-default.btn-sm[id='tourButtonAction'][onclick='tourStartAction()'][type='button']", {
                    style: {
                        "margin-left": "5px",
                        "margin-top": "4px"
                    }
                }, "Action"),
                m("button.btn.btn-default.btn-sm[id='tourButtonLocation'][onclick='tourStartLocation()'][type='button']", {
                    style: {
                        "margin-left": "5px",
                        "margin-top": "4px"
                    }
                }, "Location"),
                m("button.btn.btn-default.btn-sm[id='tourButtonCoordinates'][onclick='tourStartCoordinates()'][type='button']", {
                    style: {
                        "margin-left": "5px",
                        "margin-top": "4px"
                    }
                }, "Coordinates"),
                m("button.btn.btn-default.btn-sm[id='tourButtonCustom'][onclick='tourStartCustom()'][type='button']", {
                    style: {
                        "margin-left": "5px",
                        "margin-top": "4px"
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