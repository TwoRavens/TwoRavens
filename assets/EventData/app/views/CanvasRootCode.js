import m from 'mithril';
import {panelMargin} from "../../../common/app/common";

// Aggregation menu!
export default class CanvasRootCode {
    view(vnode) {
        let {mode, display} = vnode.attrs;
        return m('div', {style: {display: display}}, [
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkRootAll.aggAllCheck[checked='true'][id='aggregRootAll'][name='aggregRootAll'][type='checkbox'][value='all']"),
                    "All"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkRoot[checked='true'][id='aggregRoot1'][name='aggregRoot1'][type='checkbox'][value='root1']"),
                    "Root 1: Make Public Statement"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkRoot[checked='true'][id='aggregRoot2'][name='aggregRoot2'][type='checkbox'][value='root2']"),
                    "Root 2: Appeal"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkRoot[checked='true'][id='aggregRoot3'][name='aggregRoot3'][type='checkbox'][value='root3']"),
                    "Root 3: Express Intent to Coop"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkRoot[checked='true'][id='aggregRoot4'][name='aggregRoot4'][type='checkbox'][value='root4']"),
                    "Root 4: Consult"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkRoot[checked='true'][id='aggregRoot5'][name='aggregRoot5'][type='checkbox'][value='root5']"),
                    "Root 5: Engage in Dip Coop"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkRoot[checked='true'][id='aggregRoot6'][name='aggregRoot6'][type='checkbox'][value='root6']"),
                    "Root 6: Engage in Material Aid"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkRoot[checked='true'][id='aggregRoot7'][name='aggregRoot7'][type='checkbox'][value='root7']"),
                    "Root 7: Provide Aid"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkRoot[checked='true'][id='aggregRoot8'][name='aggregRoot8'][type='checkbox'][value='root8']"),
                    "Root 8: Yield"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkRoot[checked='true'][id='aggregRoot9'][name='aggregRoot9'][type='checkbox'][value='root9']"),
                    "Root 9: Investigate"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkRoot[checked='true'][id='aggregRoot10'][name='aggregRoot10'][type='checkbox'][value='root10']"),
                    "Root 10: Demand"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkRoot[checked='true'][id='aggregRoot11'][name='aggregRoot11'][type='checkbox'][value='root11']"),
                    "Root 11: Disapprove"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkRoot[checked='true'][id='aggregRoot12'][name='aggregRoot12'][type='checkbox'][value='root12']"),
                    "Root 12: Reject"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkRoot[checked='true'][id='aggregRoot13'][name='aggregRoot13'][type='checkbox'][value='root13']"),
                    "Root 13: Threaten"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkRoot[checked='true'][id='aggregRoot14'][name='aggregRoot14'][type='checkbox'][value='root14']"),
                    "Root 14: Protest"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkRoot[checked='true'][id='aggregRoot15'][name='aggregRoot15'][type='checkbox'][value='root15']"),
                    "Root 15: Exhibit Force Posture"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkRoot[checked='true'][id='aggregRoot16'][name='aggregRoot16'][type='checkbox'][value='root16']"),
                    "Root 16: Reduce Relations"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkRoot[checked='true'][id='aggregRoot17'][name='aggregRoot17'][type='checkbox'][value='root17']"),
                    "Root 17: Coerce"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkRoot[checked='true'][id='aggregRoot18'][name='aggregRoot18'][type='checkbox'][value='root18']"),
                    "Root 18: Assault"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkRoot[checked='true'][id='aggregRoot19'][name='aggregRoot19'][type='checkbox'][value='root19']"),
                    "Root 19: Fight"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkRoot[checked='true'][id='aggregRoot20'][name='aggregRoot20'][type='checkbox'][value='root20']"),
                    "Root 20: Use Unconventional Mass Violence"
                ]
            )
        ])
    }
}
