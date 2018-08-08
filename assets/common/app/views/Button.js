import m from 'mithril'

// Specification

// Arbitrary attributes may be passed
// ```
// m(Button, {
//     onclick: () => console.log("buttonID was clicked"),
//     })
// ```

export default class Button {
    view(vnode) {
        return m(`button.btn.btn-default`, vnode.attrs, vnode.children)
    }
}
