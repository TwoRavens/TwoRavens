import m from 'mithril';

import * as app from '../app';

export let when = function(side, val, y='block', n='none') {
    return app[side + 'tab'] === val ? y : n;
};

class PanelButton {
    view(vnode) {
        let {id, id2, classes, onclick, style, title, is_explore_mode} = vnode.attrs;
        let left = id2 ? true : false;
        id2 = id2 || id;
        let disabled = is_explore_mode && !app.explored;
        return m(
            `button#${id}.btn.${classes || when(left ? 'left' : 'right', id2, 'active', disabled ? 'btn.disabled' : 'btn-default')}[type=button]`, {
            onclick: onclick || (_ => left ? app.tabLeft(id2) : disabled || app.tabRight(id2)),
            style: style,
            title: title},
            vnode.children);
    }
}

export default PanelButton;
