import m from 'mithril';
import {tableHeight} from '../aggreg/aggreg'
import {heightFooter} from "../../../common/common";

export default class TableAggregation {
    view(vnode) {
        let {mode} = vnode.attrs;

        return (m("[id='aggregDataOutput']", {
                style: {
                    "display": mode === 'aggregate' ? 'inline' : 'none',
                    "position": "fixed",
                    "bottom": heightFooter,
                    "height": tableHeight,
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
                                m("th.aggregDataDate.aggregTblHdr[id='aggregDataDateHead']",
                                    "Date"
                                ),
                                m("th.aggregDataSrc.aggregDataActor.aggregTblHdr[id='aggregDataSrcHead']",
                                    "Source"
                                ),
                                m("th.aggregDataTgt.aggregDataActor.aggregTblHdr[id='aggregDataTgtHead']",
                                    "Target"
                                ),
                                m("th.aggregDataPenta0.aggregDataPenta.aggregTblHdr[id='aggregDataPenta0Head']",
                                    "Penta 0"
                                ),
                                m("th.aggregDataPenta1.aggregDataPenta.aggregTblHdr[id='aggregDataPenta1Head']",
                                    "Penta 1"
                                ),
                                m("th.aggregDataPenta2.aggregDataPenta.aggregTblHdr[id='aggregDataPenta2Head']",
                                    "Penta 2"
                                ),
                                m("th.aggregDataPenta3.aggregDataPenta.aggregTblHdr[id='aggregDataPenta3Head']",
                                    "Penta 3"
                                ),
                                m("th.aggregDataPenta4.aggregDataPenta.aggregTblHdr[id='aggregDataPenta4Head']",
                                    "Penta 4"
                                ),
                                m("th.aggregDataRoot1.aggregDataRoot.aggregTblHdr[id='aggregDataRoot1Head']",
                                    "Root 1"
                                ),
                                m("th.aggregDataRoot2.aggregDataRoot.aggregTblHdr[id='aggregDataRoot2Head']",
                                    "Root 2"
                                ),
                                m("th.aggregDataRoot3.aggregDataRoot.aggregTblHdr[id='aggregDataRoot3Head']",
                                    "Root 3"
                                ),
                                m("th.aggregDataRoot4.aggregDataRoot.aggregTblHdr[id='aggregDataRoot4Head']",
                                    "Root 4"
                                ),
                                m("th.aggregDataRoot5.aggregDataRoot.aggregTblHdr[id='aggregDataRoot5Head']",
                                    "Root 5"
                                ),
                                m("th.aggregDataRoot6.aggregDataRoot.aggregTblHdr[id='aggregDataRoot6Head']",
                                    "Root 6"
                                ),
                                m("th.aggregDataRoot7.aggregDataRoot.aggregTblHdr[id='aggregDataRoot7Head']",
                                    "Root 7"
                                ),
                                m("th.aggregDataRoot8.aggregDataRoot.aggregTblHdr[id='aggregDataRoot8Head']",
                                    "Root 8"
                                ),
                                m("th.aggregDataRoot9.aggregDataRoot.aggregTblHdr[id='aggregDataRoot9Head']",
                                    "Root 9"
                                ),
                                m("th.aggregDataRoot10.aggregDataRoot.aggregTblHdr[id='aggregDataRoot10Head']",
                                    "Root 10"
                                ),
                                m("th.aggregDataRoot11.aggregDataRoot.aggregTblHdr[id='aggregDataRoot11Head']",
                                    "Root 11"
                                ),
                                m("th.aggregDataRoot12.aggregDataRoot.aggregTblHdr[id='aggregDataRoot12Head']",
                                    "Root 12"
                                ),
                                m("th.aggregDataRoot13.aggregDataRoot.aggregTblHdr[id='aggregDataRoot13Head']",
                                    "Root 13"
                                ),
                                m("th.aggregDataRoot14.aggregDataRoot.aggregTblHdr[id='aggregDataRoot14Head']",
                                    "Root 14"
                                ),
                                m("th.aggregDataRoot15.aggregDataRoot.aggregTblHdr[id='aggregDataRoot15Head']",
                                    "Root 15"
                                ),
                                m("th.aggregDataRoot16.aggregDataRoot.aggregTblHdr[id='aggregDataRoot16Head']",
                                    "Root 16"
                                ),
                                m("th.aggregDataRoot17.aggregDataRoot.aggregTblHdr[id='aggregDataRoot17Head']",
                                    "Root 17"
                                ),
                                m("th.aggregDataRoot18.aggregDataRoot.aggregTblHdr[id='aggregDataRoot18Head']",
                                    "Root 18"
                                ),
                                m("th.aggregDataRoot19.aggregDataRoot.aggregTblHdr[id='aggregDataRoot19Head']",
                                    "Root 19"
                                ),
                                m("th.aggregDataRoot20.aggregDataRoot.aggregTblHdr[id='aggregDataRoot20Head']",
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
