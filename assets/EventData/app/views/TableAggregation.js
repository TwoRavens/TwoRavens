import m from 'mithril';

export default class TableAggregation {
    view(vnode) {
        return (m("[id='aggregDataOutput']", {
                style: {
                    "display": "none",
                    "position": "fixed",
                    "bottom": "40px",
                    "height": "100px",
                    "width": "100%",
                    "border-top": "1px solid #ADADAD",
                    "overflow-y": "scroll",
                    "overflow-x": "auto"
                }
            },
            m("table[id='aggregTable']",
                [
                    m("caption",
                        "Data Results (Preview)"
                    ),
                    m("tbody",
                        m("tr[id='aggregTableHeader']",
                            [
                                m("th.aggregDataDate[id='aggregDataDateHead']",
                                    "Date"
                                ),
                                m("th.aggregDataSrc.aggregDataActor[id='aggregDataSrcHead']",
                                    "Source"
                                ),
                                m("th.aggregDataTgt.aggregDataActor[id='aggregDataTgtHead']",
                                    "Target"
                                ),
                                m("th.aggregDataPenta0.aggregDataPenta[id='aggregDataPenta0Head']",
                                    "Penta 0"
                                ),
                                m("th.aggregDataPenta1.aggregDataPenta[id='aggregDataPenta1Head']",
                                    "Penta 1"
                                ),
                                m("th.aggregDataPenta2.aggregDataPenta[id='aggregDataPenta2Head']",
                                    "Penta 2"
                                ),
                                m("th.aggregDataPenta3.aggregDataPenta[id='aggregDataPenta3Head']",
                                    "Penta 3"
                                ),
                                m("th.aggregDataPenta4.aggregDataPenta[id='aggregDataPenta4Head']",
                                    "Penta 4"
                                ),
                                m("th.aggregDataRoot1.aggregDataRoot[id='aggregDataRoot1Head']", {style: {"display": "none"}},
                                    "Root 1"
                                ),
                                m("th.aggregDataRoot2.aggregDataRoot[id='aggregDataRoot2Head']", {style: {"display": "none"}},
                                    "Root 2"
                                ),
                                m("th.aggregDataRoot3.aggregDataRoot[id='aggregDataRoot3Head']", {style: {"display": "none"}},
                                    "Root 3"
                                ),
                                m("th.aggregDataRoot4.aggregDataRoot[id='aggregDataRoot4Head']", {style: {"display": "none"}},
                                    "Root 4"
                                ),
                                m("th.aggregDataRoot5.aggregDataRoot[id='aggregDataRoot5Head']", {style: {"display": "none"}},
                                    "Root 5"
                                ),
                                m("th.aggregDataRoot6.aggregDataRoot[id='aggregDataRoot6Head']", {style: {"display": "none"}},
                                    "Root 6"
                                ),
                                m("th.aggregDataRoot7.aggregDataRoot[id='aggregDataRoot7Head']", {style: {"display": "none"}},
                                    "Root 7"
                                ),
                                m("th.aggregDataRoot8.aggregDataRoot[id='aggregDataRoot8Head']", {style: {"display": "none"}},
                                    "Root 8"
                                ),
                                m("th.aggregDataRoot9.aggregDataRoot[id='aggregDataRoot9Head']", {style: {"display": "none"}},
                                    "Root 9"
                                ),
                                m("th.aggregDataRoot10.aggregDataRoot[id='aggregDataRoot10Head']", {style: {"display": "none"}},
                                    "Root 10"
                                ),
                                m("th.aggregDataRoot11.aggregDataRoot[id='aggregDataRoot11Head']", {style: {"display": "none"}},
                                    "Root 11"
                                ),
                                m("th.aggregDataRoot12.aggregDataRoot[id='aggregDataRoot12Head']", {style: {"display": "none"}},
                                    "Root 12"
                                ),
                                m("th.aggregDataRoot13.aggregDataRoot[id='aggregDataRoot13Head']", {style: {"display": "none"}},
                                    "Root 13"
                                ),
                                m("th.aggregDataRoot14.aggregDataRoot[id='aggregDataRoot14Head']", {style: {"display": "none"}},
                                    "Root 14"
                                ),
                                m("th.aggregDataRoot15.aggregDataRoot[id='aggregDataRoot15Head']", {style: {"display": "none"}},
                                    "Root 15"
                                ),
                                m("th.aggregDataRoot16.aggregDataRoot[id='aggregDataRoot16Head']", {style: {"display": "none"}},
                                    "Root 16"
                                ),
                                m("th.aggregDataRoot17.aggregDataRoot[id='aggregDataRoot17Head']", {style: {"display": "none"}},
                                    "Root 17"
                                ),
                                m("th.aggregDataRoot18.aggregDataRoot[id='aggregDataRoot18Head']", {style: {"display": "none"}},
                                    "Root 18"
                                ),
                                m("th.aggregDataRoot19.aggregDataRoot[id='aggregDataRoot19Head']", {style: {"display": "none"}},
                                    "Root 19"
                                ),
                                m("th.aggregDataRoot20.aggregDataRoot[id='aggregDataRoot20Head']", {style: {"display": "none"}},
                                    "Root 20"
                                )
                            ]
                        )
                    )
                ]
            )
        ));
    }
}