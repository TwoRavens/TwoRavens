import m from 'mithril';

import * as app from '../app';

export let getClass = panel => {
    if (panel.closed) 
        return '.closepanel';
    return (panel.side === 'left' && app.lefttab === 'tab2') ? '.expandpanel' : '';
};

class Panel {
    oninit(vnode) {
        this.closed = false;
    }

    view(vnode) {
        let {side, title} = vnode.attrs;
        const dot = [m.trust('&#9679;'), m('br')];
        return m(`#${side}panel.sidepanel.container.clearfix${getClass(this)}`, [
            m(`#toggle${side === 'left' ? 'L' : 'R'}panelicon.panelbar[style=height: calc(100% - 60px)]`,
              m('span', {onclick: _ => this.closed = !this.closed},
                [].concat([dot, dot, dot, dot]))),
            m(`#${side}paneltitle.panel-heading.text-center`,
              m("h3.panel-title", title))
        ].concat(vnode.children));
    }
}

export default Panel;
