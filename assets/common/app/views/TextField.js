import m from 'mithril'
import {mergeAttributes} from "../common";

// ```
// m(TextField, {
//     id: string,
//     cancellable: Bool NOT IMPLEMENTED
//     *: any attribute may be passed
//     })
// ```

// Can pass attributes directly, for example 'placeholder' or 'oninput'

export default class TextField {
    view(vnode) {
        let {id, cancellable} = vnode.attrs;

        return m(`input#${id}.form-control`, mergeAttributes({
                style: {'margin': '5px 0', 'width': '100%'}
            },
            vnode.attrs,
            {oninput: m.withAttr('value', vnode.attrs.oninput)})
        );
    }
}
