import m from 'mithril'
import {heightFooter, menuColor, borderColor} from "../common";

export default class Footer {
    view(vnode) {
        let {items, onclick} = vnode.attrs;

        return m('#footer', {
            style: {
                background: menuColor,
                'border-top': borderColor,
                bottom: 0,
                height: heightFooter + 'px',
                position: 'fixed',
                width: '100%',
            }
        }, items.map((item) =>
            m(`button#footerButton${item}.btn.btn-default.btn-sm[type=button]`, {
                onclick: onclick,
                style: {
                    'margin-left': '5px',
                    'margin-top': '4px'
                }
            }, item)));
    }
}
