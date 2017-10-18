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
        let {side, title, buttons} = vnode.attrs;
        const dot = [m.trust('&#9679;'), m('br')];
        return m(
            getClasses(`#${side}panel.sidepanel.container.clearfix`, this),
            m(`#toggle${side === 'left' ? 'L' : 'R'}panelicon.panelbar[style=height: 100%]`,
              m('span', {onclick: _ => this.closed = !this.closed}, dot, dot, dot, dot)),
            m(`#${side}paneltitle.panel-heading.text-center`,
              m("h3.panel-title", title)),
            m(`ul${side === 'right' ? '#rightpanelbuttons' : ''}.accordion`,
              buttons.map(b => m('li', b))),
            m(getClasses('.row-fluid', this),
              m(`#${side}panelcontent`,
                m(`#${side}ContentArea[style=height: calc(100vh - 210px); overflow: auto]`, vnode.children))));
    }
}

export default Panel;
