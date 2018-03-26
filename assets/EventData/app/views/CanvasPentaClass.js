import m from 'mithril';
import {panelMargin} from "../../../common/app/common";

// Aggregation menu!
export default class CanvasPentaClass {
    view(vnode) {
        let {mode, display} = vnode.attrs;
        return m('div', {style: {display: display}}, [
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkPentaAll.aggAllCheck[checked='true'][id='aggregPentaAll'][name='aggregPentaAll'][type='checkbox'][value='all']"),
                    "All"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkPenta[checked='true'][id='aggregPenta0'][name='aggregPenta0'][type='checkbox'][value='penta0']"),
                    "Penta 0: Public Statement"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkPenta[checked='true'][id='aggregPenta1'][name='aggregPenta1'][type='checkbox'][value='penta1']"),
                    "Penta 1: Verbal Cooperation"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkPenta[checked='true'][id='aggregPenta2'][name='aggregPenta2'][type='checkbox'][value='penta2']"),
                    "Penta 2: Material Cooperation"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkPenta[checked='true'][id='aggregPenta3'][name='aggregPenta3'][type='checkbox'][value='penta3']"),
                    "Penta 3: Verbal Conflict"
                ]
            ),
            m(".separator"),
            m("label.aggChkLbl",
                [
                    m("input.aggChk.aggChkPenta[checked='true'][id='aggregPenta4'][name='aggregPenta4'][type='checkbox'][value='penta4']"),
                    "Penta 4: Material Conflict"
                ]
            )
        ])
    }
}
