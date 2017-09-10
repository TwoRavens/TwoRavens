import m from 'mithril';

import * as app from '../app';

export let getClasses = function(cls, panel) {
    return cls + (panel.closed ? '.closepanel' : 
        (panel.side === 'left' && app.lefttab === 'tab2') ? '.expandpanel' : 
        '');
};

class Panel {
    oninit(vnode) {
        this.closed = false;
    }

    view(vnode) {
        let {side, title} = vnode.attrs;
        const dot = [m.trust('&#9679;'), m('br')]; 
        return m(getClasses(`#${side}panel.sidepanel.container.clearfix`, this),
            m(`#toggle${side === 'left' ? 'L' : 'R'}panelicon.panelbar[style=height: calc(100% - 60px)]`,
              m('span', {onclick: _ => this.closed = !this.closed}, dot, dot, dot, dot)),
            m(`#${side}paneltitle.panel-heading.text-center`,
              m("h3.panel-title", title)),
            vnode.children[0],
            m(getClasses('.row-fluid', this), 
              m(`#${side}panelcontent`,
                m(`#${side}ContentArea[style=height: 453px; overflow: auto]`, vnode.children.slice(1)))));
    }
}

export default Panel;
