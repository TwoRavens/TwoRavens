import m from 'mithril'
import {mergeAttributes} from "../common";

// ```
// m(TextField, {
//     id: string,
//     cancellable: Bool NOT IMPLEMENTED
//     })
// ```

export default class TextField {
    view(vnode) {
        let {id, cancellable} = vnode.attrs;

        return m(`input#${id}.form-control`, mergeAttributes({
            oninput: m.withAttr('value', vnode.attrs.oninput),
            style: {
                'margin': '5px 0',
                'width': '100%'
            }
        }, vnode.attrs));
    }
}
