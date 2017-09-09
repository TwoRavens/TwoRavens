import m from 'mithril';

import * as app from '../app';

export let or = function(side, val, y='block', n='none') {
    return app[side + 'tab'] === val ? y : n;
};

class PanelButton {
    view(vnode) {
        let {id, id2, title, width} = vnode.attrs;
        let left = id2 ? true : false;
        id2 = id2 || id;
        return m(`button#${id}.btn.${or(left ? 'left' : 'right', id2, 'active', 'btn-default')}[type=button]`, {
            onclick: _ => left ? app.tabLeft(id2) : app.tabRight(id2),
            style: width && `width: ${width}`,
            title: title},
            vnode.children);
    }
}

export default PanelButton;
