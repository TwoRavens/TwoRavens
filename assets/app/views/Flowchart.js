import m from 'mithril';
import * as common from '../../common/common';

export default class Flowchart {
    view(vnode) {
        let {steps, labelWidth, attrsAll} = vnode.attrs;
        let bold = (value) => m('div', {style: {'font-weight': 'bold', display: 'inline'}}, value);

        let makeCard = ({key, color, content, summary}) => m('table', {
                onclick: () => this.key = key,
                ondblclick: () => this.key = undefined,
                style: {
                    'background': common.colors.menu,
                    'border': common.colors.border,
                    margin: '1em',
                    'box-shadow': '0px 5px 5px rgba(0, 0, 0, .2)',
                    width: 'calc(100% - 2em)'
                }
            },
            m('tr',
                m('td', {
                    style: {
                        background: color,
                        height: '100%',
                        padding: '1em',
                        width: labelWidth || 0, // by default, 0 makes div width wrap content
                        'border-right': common.colors.border
                    }
                }, bold(key)),
                m('td', {
                    style: {width: 'calc(100% - 2em)'}
                }, (this.key === key || !summary) ? content : summary)
            )
        );

        let arrow = m('div', {
            style: {
                border: 'solid black',
                'border-width': '0 3px 3px 0',
                padding: '4px',
                width: '10px',
                'margin-left': '50%',
                'margin-bottom': '20px',
                transform: 'rotate(45deg) scale(1.5)'
            }
        });

        return m('div', common.mergeAttributes({style: {'white-space': 'nowrap'}}, attrsAll),
            steps.map((step, i) => i + 1 === steps.length ? makeCard(step) : [makeCard(step), arrow]))

    }
}