import m from 'mithril'

import {varColor, selVarColor, mergeAttributes} from "../common";

// Interface specification
//
// ```
// m(Table, {
//     id: id (String),
//     headers: ['col1Header', 'col2Header'],
//     data: [['row1col1', 'row1col2'], ['row2col1', 'row2col2']],
//     activeRow: 'row1col1',
//     onclickRow: (row) => console.log(row + " was clicked."),
//     checkboxes: Set(['row1col1']),
//     onclickCheckbox: (checkbox) => console.log(row + "was checked/unchecked"),
//     })
// ```

export default class Table {

    view(vnode) {
        let {id, headers, data, attrsAll, attrsRows} = vnode.attrs;

        // Interactive rows and checkboxes
        let {activeRow, onclickRow} = vnode.attrs;
        let {checkboxes, onclickCheckbox} = vnode.attrs;

        let allChecked = data.length === checkboxes.size;
        let setAllChecked = (checked) => {
            // turn on or off all checks
            data.map((row) => {
                if (checked !== checkboxes.has(row[0])) onclickCheckbox(row[0], checked)
            });
        };

        let headerDiv = headers ? m('tr', {style: {width: '100%'}}, [
            ...headers.map((header) => m('th', header)),
            checkboxes ? m('td', m('input[type="checkbox"]', {
                onclick: m.withAttr("checked", setAllChecked),
                checked: allChecked
            })) : undefined
        ]) : undefined;

        return m(`table#${id}`, mergeAttributes({style: {width: '100%'}}, attrsAll),
            // rows
            [headerDiv, ...data.map((row) => {
                return m('tr', mergeAttributes({
                        style: {'background-color': row[0] === activeRow ? selVarColor : varColor},
                        onclick: () => onclickRow(row[0])
                    }, attrsRows),

                    // columns
                    [
                        ...row.map((item) => m('td', item)),
                        checkboxes ? m('td', m('input[type="checkbox"]', {
                            onclick: m.withAttr("checked", (checked) => onclickCheckbox(row[0], checked)),
                            checked: checkboxes.has(row[0])
                        })) : undefined
                    ]
                )
            })]
        )
    }
}
