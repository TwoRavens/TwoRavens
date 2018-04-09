import m from 'mithril'
// This honestly doesn't do much. More of a proof of concept

// Specification

// Arbitrary attributes may be passed
// ```
// m(Button, {
//     id: 'buttonID',
//     onclick: () => console.log("buttonID was clicked"),
//     })
// ```

export default class Button {
    view(vnode) {
        let {id} = vnode.attrs;
        return m(`#${id || 'btn' + text}.btn.btn-default`, vnode.attrs, vnode.children)
    }
}
