import m from 'mithril';

import {heightFooter, menuColor, borderColor} from "../common";
// ```
// m(Footer, vnode.children)
// ```

export default class Footer {
    view(vnode) {
        return m('#footer', {
            style: {
                background: menuColor,
                'border-top': borderColor,
                bottom: 0,
                height: heightFooter + 'px',
                position: 'fixed',
                width: '100%'
            }
        }, vnode.children);
    }
}
