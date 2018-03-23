import m from 'mithril'

import {mergeAttributes} from "../common";

// Interface specification

// ```
// m(Dropdown, {
//     id: 'dropdownID' (applied to button and selectors)
//     items: ['Item 1', 'Item 2', 'Item 3'],
//     onclickChild: (value) => console.log(value + " was clicked.")
//     dropWidth: 100 (sets the width of the dropdown)
//     })
//  ```

export default class Dropdown {
    oninit(vnode) {
        this.activeItem = vnode.attrs.items[0]
    }

    view(vnode) {
        let {id, items, onclickChild, dropWidth} = vnode.attrs;

        return m('.dropdown[style=display: block]', [
            m('button.btn.btn-default.dropdown-toggle',
                Object.assign(vnode.attrs, {'data-toggle': 'dropdown'}), [
                    this.activeItem,
                    m('b.caret', {style: {'margin-left': '5px'}})]),

            m('ul.dropdown-menu', {'aria-labelledby': id, style: {width: dropWidth, 'min-width': 0}},
                items.map((item) => m('li.dropdown-item', {
                    value: item,
                    onclick: () => {
                        this.activeItem = item;
                        onclickChild(item);
                    },
                    style: {'padding-left': '10px'}
                }, item))
            )
        ]);
    }
}
