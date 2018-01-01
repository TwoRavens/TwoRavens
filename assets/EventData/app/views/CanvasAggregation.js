import m from 'mithril';

function topStuff() {
    return m("[id='aggregDataDisplay']", {
            style: {
                "display": "inline-block",
                "width": "100%",
                "height": "75%",
                "overflow-x": "auto",
                "overflow-y": "scroll",
                "white-space": "nowrap"
            }
        },
        [
            m("[id='aggregEventByPenta']", {style: {"display": "none"}},
                [
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkPentaAll.aggAllCheck[checked=''][id='aggregPentaAll'][name='aggregPentaAll'][type='checkbox'][value='all']"),
                            "All"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkPenta[checked=''][id='aggregPenta0'][name='aggregPenta0'][type='checkbox'][value='penta0']"),
                            "Penta 0: Public Statement"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkPenta[checked=''][id='aggregPenta1'][name='aggregPenta1'][type='checkbox'][value='penta1']"),
                            "Penta 1: Verbal Cooperation"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkPenta[checked=''][id='aggregPenta2'][name='aggregPenta2'][type='checkbox'][value='penta2']"),
                            "Penta 2: Material Cooperation"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkPenta[checked=''][id='aggregPenta3'][name='aggregPenta3'][type='checkbox'][value='penta3']"),
                            "Penta 3: Verbal Conflict"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkPenta[checked=''][id='aggregPenta4'][name='aggregPenta4'][type='checkbox'][value='penta4']"),
                            "Penta 4: Material Conflict"
                        ]
                    )
                ]
            ),
            m("[id='aggregEventByRoot']", {style: {"display": "none"}},
                [
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkRootAll.aggAllCheck[checked=''][id='aggregRootAll'][name='aggregRootAll'][type='checkbox'][value='all']"),
                            "All"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkRoot[checked=''][id='aggregRoot1'][name='aggregRoot1'][type='checkbox'][value='root1']"),
                            "Root 1: Make Public Statement"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkRoot[checked=''][id='aggregRoot2'][name='aggregRoot2'][type='checkbox'][value='root2']"),
                            "Root 2: Appeal"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkRoot[checked=''][id='aggregRoot3'][name='aggregRoot3'][type='checkbox'][value='root3']"),
                            "Root 3: Express Intent to Coop"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkRoot[checked=''][id='aggregRoot4'][name='aggregRoot4'][type='checkbox'][value='root4']"),
                            "Root 4: Consult"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkRoot[checked=''][id='aggregRoot5'][name='aggregRoot5'][type='checkbox'][value='root5']"),
                            "Root 5: Engage in Dip Coop"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkRoot[checked=''][id='aggregRoot6'][name='aggregRoot6'][type='checkbox'][value='root6']"),
                            "Root 6: Engage in Material Aid"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkRoot[checked=''][id='aggregRoot7'][name='aggregRoot7'][type='checkbox'][value='root7']"),
                            "Root 7: Provide Aid"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkRoot[checked=''][id='aggregRoot8'][name='aggregRoot8'][type='checkbox'][value='root8']"),
                            "Root 8: Yield"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkRoot[checked=''][id='aggregRoot9'][name='aggregRoot9'][type='checkbox'][value='root9']"),
                            "Root 9: Investigate"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkRoot[checked=''][id='aggregRoot10'][name='aggregRoot10'][type='checkbox'][value='root10']"),
                            "Root 10: Demand"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkRoot[checked=''][id='aggregRoot11'][name='aggregRoot11'][type='checkbox'][value='root11']"),
                            "Root 11: Disapprove"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkRoot[checked=''][id='aggregRoot12'][name='aggregRoot12'][type='checkbox'][value='root12']"),
                            "Root 12: Reject"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkRoot[checked=''][id='aggregRoot13'][name='aggregRoot13'][type='checkbox'][value='root13']"),
                            "Root 13: Threaten"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkRoot[checked=''][id='aggregRoot14'][name='aggregRoot14'][type='checkbox'][value='root14']"),
                            "Root 14: Protest"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkRoot[checked=''][id='aggregRoot15'][name='aggregRoot15'][type='checkbox'][value='root15']"),
                            "Root 15: Exhibit Force Posture"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkRoot[checked=''][id='aggregRoot16'][name='aggregRoot16'][type='checkbox'][value='root16']"),
                            "Root 16: Reduce Relations"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkRoot[checked=''][id='aggregRoot17'][name='aggregRoot17'][type='checkbox'][value='root17']"),
                            "Root 17: Coerce"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkRoot[checked=''][id='aggregRoot18'][name='aggregRoot18'][type='checkbox'][value='root18']"),
                            "Root 18: Assault"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkRoot[checked=''][id='aggregRoot19'][name='aggregRoot19'][type='checkbox'][value='root19']"),
                            "Root 19: Fight"
                        ]
                    ),
                    m(".separator"),
                    m("label.aggChkLbl",
                        [
                            m("input.aggChk.aggChkRoot[checked=''][id='aggregRoot20'][name='aggregRoot20'][type='checkbox'][value='root20']"),
                            "Root 20: Use Unconventional Mass Violence"
                        ]
                    )
                ]
            )
        ]
    );
}

function tableAggregation() {
    return(m("[id='aggregDataOutput']", {
            style: {
                "display": "inline-block",
                "height": "calc(25% - 15px)",
                "width": "100%",
                "border": "1px solid black",
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

export default class CanvasAggregation {
    view(vnode) {
        return m("canvasAggregation",
            [
                topStuff(),
                tableAggregation()
            ]);
    }
}
