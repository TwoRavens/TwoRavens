import m from 'mithril';
import {mergeAttributes} from "../common";

export default class Subpanel {
    oninit() {
        this.show = true;
    }

    view({attrs, children}) {
        let {id, header} = attrs;

        return m(`div.panel.panel-default`, mergeAttributes({
                style: {'margin-bottom': '0px'}
            },
            attrs),
            m(".panel-heading",
                m("h3.panel-title", header,
                    m(`span.glyphicon.glyphicon-large.glyphicon-chevron-${this.show ? 'down' : 'up'}`, {
                        style: {float: 'right', 'margin-left': '.5em'},
                        'data-toggle': 'collapse',
                        'data-target': `#${id}Body`,
                        'href': `#${id}Body`,
                        onclick: () => this.show = !this.show
                    }))),
            m(`div#${id}Body.panel-collapse.collapse.in`, m('div.panel-body', children))
        );
    }
}