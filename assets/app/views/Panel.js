import m from 'mithril';

import * as app from '../app';

export let getClasses = function(cls, panel) {
    return cls + (panel.closed ? '.closepanel' :
        (panel.side === 'left' && app.lefttab === 'tab2') ? '.expandpanel' :
        '');
};

export function btnWidths(btns) {
    lis.forEach(li => {
        li.addEventListener('mouseover', function() {
            lis.forEach(li => li.style.width = shrinkwidth);
            this.style.width = expandwidth;
        });
        li.addEventListener('mouseout', () => lis.forEach(li => li.style.width = width));
    });
}

class Panel {
    oninit(vnode) {
        this.closed = false;
    }

    view(vnode) {
        let {side, title, buttons} = vnode.attrs;
        let btns = buttons;
        let dot = [m.trust('&#9679;'), m('br')];
        let width = 100 / btns.length;
        let expandwidth = 35;
        let shrinkwidth = 65 / (btns.length - 1);
        return m(
            getClasses(`#${side}panel.sidepanel.container.clearfix`, this),
            m(`#toggle${side === 'left' ? 'L' : 'R'}panelicon.panelbar[style=height: 100%]`,
              m('span', {onclick: _ => this.closed = !this.closed}, dot, dot, dot, dot)),
            m(`#${side}paneltitle.panel-heading.text-center`,
              m("h3.panel-title", title)),
            m(`ul${side === 'right' ? '#rightpanelbuttons' : ''}.accordion`,
              btns.map(b => {
                  b.attrs.style = b.attrs.style + '; width: 100%';
                  let id = b.attrs.id;
                  let w = this.active_btn === id ? shrinkwidth :
                      this.active_btn === null ? width :
                      expandwidth;
                  return m(
                      'li',
                      {style: {width: width + '%', 'max-width': '150px'},
                       onmouseover: _ => this.active_btn = id,
                       onmouseout: _ => this.active_btn = null},
                      b);
              })),
            m(getClasses('.row-fluid', this),
              m(`#${side}panelcontent`,
                m(`#${side}ContentArea[style=height: calc(100vh - 213px); overflow: auto]`, vnode.children))));
    }
}

export default Panel;
