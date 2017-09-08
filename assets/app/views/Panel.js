import m from 'mithril';

import * as app from '../app';

export let getClasses = function(cls, panel) {
    return cls + (panel.closed ? '.closepanel' : 
        (panel.side === 'left' && app.lefttab === 'tab2') ? '.expandpanel' : 
        '');
};

export let or = function(side, val, y='block', n='none') {
    return app[side + 'tab'] === val ? y : n;
};

class Panel {
    oninit(vnode) {
        this.closed = false;
    }

    view(vnode) {
        let {side, title} = vnode.attrs;
        const dot = [m.trust('&#9679;'), m('br')]; 
        let button = (id, id2, text, opts) =>
            m(`button#${id}.btn.${or(side, id2, 'active', 'btn-default')}[type=button]`, {
              onclick: _ => side === 'left' ? app.tabLeft(id2) : app.tabRight(id2),
              style: opts && opts.title || `width: ${opts}`,
              title: opts && opts.title},
              text);
        return m(getClasses(`#${side}panel.sidepanel.container.clearfix`, this),
            m(`#toggle${side === 'left' ? 'L' : 'R'}panelicon.panelbar[style=height: calc(100% - 60px)]`,
              m('span', {onclick: _ => this.closed = !this.closed}, dot, dot, dot, dot)),
            m(`#${side}paneltitle.panel-heading.text-center`,
              m("h3.panel-title", title)),
            side == 'left' ? m(".btn-toolbar[role=toolbar][style=margin-left: .5em; margin-top: .5em]",
              m(".btn-group",
                button('btnVariables', 'tab1', 'Variables', {
                  title: 'Click variable name to add or remove the variable pebble from the modeling space.'}),
                button('btnSubset', 'tab2', 'Subset')),
              m("button#btnSelect.btn.btn-default.ladda-button[data-spinner-color=#000000][data-style=zoom-in][type=button]", {
                style: `display: ${app.subset ? 'block' : 'none'}; float: right; margin-right: 10px`,
                onclick: _ => app.subsetSelect('btnSelect'),
                title: 'Subset data by the intersection of all selected values.'},
                m("span.ladda-label[style=pointer-events: none]", "Select"))) :         
            m(".btn-group.btn-group-justified[style=margin-top: .5em]",
              button('btnModels', 'btnModels', "Models", '33%'),
              button('btnSetx','btnSetx', "Set Covar.", '34%'),
              button('btnResults', 'btnResults', "Results", '33%')),
            m(getClasses('.row-fluid', this), vnode.children));
    }
}

export default Panel;
