import m from 'mithril';
import {panelMargin} from "../../../common/common";
import {selectedRootCodes, setSelectedRootCodes} from '../aggreg/aggreg';

export default class CanvasRootCode {
    view(vnode) {
        let {display} = vnode.attrs;

        let labels = [
            "Make Public Statement",
            "Appeal",
            "Express Intent to Coop",
            "Consult",
            "Engage in Dip Coop",
            "Engage in Material Aid",
            "Provide Aid",
            "Yield",
            "Investigate",
            "Demand",
            "Disapprove",
            "Reject",
            "Threaten",
            "Protest",
            "Exhibit Force Posture",
            "Reduce Relations",
            "Coerce",
            "Assault",
            "Fight",
            "Use Unconventional Mass Violence"
        ];

        return m('div', {style: {display: display, 'margin-top': panelMargin}}, [
            // all
            m("label.aggChkLbl",
                m("input#aggregRootAll.aggChk.aggChkRootAll.aggAllCheck[type='checkbox']", {
                    name: 'aggregRootAll',
                    value: 'all',
                    onclick: m.withAttr('checked', setSelectedRootCodes),
                    checked: selectedRootCodes.every(_ => _),
                    indeterminate: !selectedRootCodes.every(_=>_) && selectedRootCodes.some(_=>_)
                }),
                "All"
            ),
            // individual
            ...labels.map((label, i) =>
                m("label.aggChkLbl",
                    m(`input#aggregRoot${i + 1}.aggChk.aggChkRoot[type='checkbox']`, {
                        name: 'aggregRoot' + (i + 1),
                        value: 'root' + (i + 1),
                        onclick: m.withAttr('checked', (checked) => setSelectedRootCodes(checked, i)),
                        checked: selectedRootCodes[i]
                    }),
                    `Root ${i + 1}: ${label}`
                ))
        ].map(val => [val, m(".separator")]));
    }
}
