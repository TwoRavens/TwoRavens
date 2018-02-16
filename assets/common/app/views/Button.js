import m from 'mithril'

// Specification

// Arbitrary attributes may be passed
// ```
// m(Button, {
//     id: 'buttonID',
//     text: 'Click Me!',
//     onclick: () => console.log("buttonID was clicked"),
//     })
// ```

export default class Button {
    view(vnode) {
        let {id, text} = vnode.attrs;
        return m(`#${id}.btn.btn-default`, vnode.attrs, text)
    }
}
