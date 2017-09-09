import m from 'mithril';

import * as app from '../app';

import Button from './PanelButton';

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
            side == 'left' ? m(".btn-toolbar[role=toolbar][style=margin-left: .5em; margin-top: .5em]",
              m(".btn-group",
                m(Button, {
                  id: 'btnVariables', 
                  id2: 'tab1',
                  title: 'Click variable name to add or remove the variable pebble from the modeling space.'}, 
                  'Variables'),                
                m(Button, {id: 'btnSubset', id2: 'tab2'}, 'Subset')),
              m("button#btnSelect.btn.btn-default.ladda-button[data-spinner-color=#000000][data-style=zoom-in][type=button]", {
                style: `display: ${app.subset ? 'block' : 'none'}; float: right; margin-right: 10px`,
                onclick: _ => app.subsetSelect('btnSelect'),
                title: 'Subset data by the intersection of all selected values.'},
                m("span.ladda-label[style=pointer-events: none]", "Select"))) :         
            m(".btn-group.btn-group-justified[style=margin-top: .5em]",
                m(Button, {id: 'btnModels', width: '33%'}, 'Models'),
                m(Button, {id: 'btnSetx', width: '34%'}, 'Set Covar.'),
                m(Button, {id: 'btnResults', width: '33%'}, 'Results')),
            m(getClasses('.row-fluid', this), 
              m(`#${side}panelcontent`,
                m(`#${side}ContentArea[style=height: 453px; overflow: auto]`, vnode.children))));
    }
}

export default Panel;
