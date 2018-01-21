import m from 'mithril'

// TODO: Add interface option for cancel button

export default class TextField {
    view(vnode) {
        let {id, cancellable} = vnode.attrs;

        return m(`input#${id}.form-control`, Object.assign(vnode.attrs, {
            oninput: m.withAttr('value', vnode.attrs.oninput),
            style: {
                'margin': '5px 0',
                'width': '100%'
            }
        }));
    }
}
