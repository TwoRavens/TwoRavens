import m from 'mithril';

import * as app from '../app';

export let getClass = function(panel, cls='') {
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
        let button = (id, width, text) =>
            m(`button#${id}.btn.${or('right', id, 'active', 'btn-default')}[type=button][style=width: ${width}]`, {
              onclick: _ => app.tabRight(id)},
              text);
        return m(`#${side}panel.sidepanel.container.clearfix${getClass(this)}`,
            m(`#toggle${side === 'left' ? 'L' : 'R'}panelicon.panelbar[style=height: calc(100% - 60px)]`,
              m('span', {onclick: _ => this.closed = !this.closed}, dot, dot, dot, dot)),
            m(`#${side}paneltitle.panel-heading.text-center`,
              m("h3.panel-title", title)),
            side == 'left' ? m(".btn-toolbar[role=toolbar][style=margin-left: .5em; margin-top: .5em]",
              m(".btn-group",
                m(`button#btnVariables.btn.${or('left', 'tab1', 'active', 'btn-default')}[type=button]`, {
                  title: 'Click variable name to add or remove the variable pebble from the modeling space.',
                  onclick: _ => app.tabLeft('tab1')},
                  "Variables"),
                m(`button#btnSubset.btn.${or('left', 'tab2', 'active', 'btn-default')}[type=button]`, {
                  onclick: _ => app.tabLeft('tab2')},
                  "Subset")),
              m("button#btnSelect.btn.btn-default.ladda-button[data-spinner-color=#000000][data-style=zoom-in][type=button]", {
                style: `display: ${app.subset ? 'block' : 'none'}; float: right; margin-right: 10px`,
                onclick: _ => app.subsetSelect('btnSelect'),
                title: 'Subset data by the intersection of all selected values.'},
                m("span.ladda-label[style=pointer-events: none]", "Select"))) :         
            m(".btn-group.btn-group-justified[style=margin-top: .5em]",
              button('btnModels', "33%", "Models"),
              button('btnSetx', "34%", "Set Covar."),
              button('btnResults', "33%", "Results")),
            m(getClass(this, '.row-fluid'), vnode.children));
    }
}

export default Panel;
