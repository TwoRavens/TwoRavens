import m from 'mithril'
import {varColor, selVarColor} from '../common'

// ```
// m(PanelList, {
//     id: 'id of container',
//     items: ['Clickable 1', 'Clickable 2'],
//     itemsSelected: ['Clickable 1'],
//     callback: (item) => console.log(item + " clicked."),
//     attrsInterface: {... additional attributes for each item}
//     })
// ```

export default class PanelList {
    view(vnode) {
        let {id, items, itemsSelected, callback, attrsInterface} = vnode.attrs;
        let itemsSelectedSet = new Set(itemsSelected);

        return m(`div#${id}`, attrsInterface, items.map((item) => m(`div#${id + item}`, {
            style: {
                'margin-top': '4px',
                'text-align': "center",
                'background-color': itemsSelectedSet.has(item) ? selVarColor : varColor
            },
            onclick: () => callback(item)
        }, item)));
    }
}
