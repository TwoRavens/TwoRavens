import m from 'mithril';
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

        return m('div', {style: {display: display}}, [
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
                    m(`input#aggregRoot${i}.aggChk.aggChkRoot[type='checkbox']`, {
                        name: 'aggregRoot' + i,
                        value: 'root' + i,
                        onclick: m.withAttr('checked', (checked) => setSelectedRootCodes(checked, i)),
                        checked: selectedRootCodes[i]
                    }),
                    `Root ${i}: ${label}`
                ))
        ].map(val => [val, m(".separator")]));
    }
}
