import m from 'mithril';
import {selectedPentaClasses, setSelectedPentaClasses} from "../aggreg/aggreg";

export default class CanvasPentaClass {
    view(vnode) {
        let {display} = vnode.attrs;

        let labels = [
            "Public Statement",
            "Verbal Cooperation",
            "Material Cooperation",
            "Verbal Conflict",
            "Material Conflict"
        ];

        return m('div', {style: {display: display}}, [
            // all
            m("label.aggChkLbl",
                m("input#aggregPentaAll.aggChk.aggChkPentaAll.aggAllCheck[type='checkbox']", {
                    name: 'aggregPentaAll',
                    value: 'all',
                    onclick: m.withAttr('checked', setSelectedPentaClasses),
                    checked: selectedPentaClasses.every(_ => _),
                    indeterminate: !selectedPentaClasses.every(_=>_) && selectedPentaClasses.some(_=>_)
                }),
                "All"
            ),
            // individual
            ...labels.map((label, i) =>
                m("label.aggChkLbl",
                    m(`input#aggregPenta${i}.aggChk.aggChkPenta[type='checkbox']`, {
                        name: 'aggregPenta' + i,
                        value: 'penta' + i,
                        onclick: m.withAttr('checked', (checked) => setSelectedPentaClasses(checked, i)),
                        checked: selectedPentaClasses[i]
                    }),
                    `Penta ${i}: ${label}`
                ))
        ].map(val => [val, m(".separator")]));
    }
}
