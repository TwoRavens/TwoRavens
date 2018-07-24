import m from 'mithril';
import * as common from '../../common/app/common';

export default class Flowchart {
    view(vnode) {
        let {steps} = vnode.attrs;

        let makeCard = ({title, content}) => m('div', {
            style: {
                'background': common.menuColor,
                'border': common.borderColor,
                'display': 'inline-block'
            }
        },
            title && [m('h5', {style: {display: 'inline-block'}}, title), m('br')], content);

        let arrow = m('div', {
            style: {
                border: 'solid black',
                'border-width': '0 3px 3px 0',
                display: 'inline-block',
                padding: '3px',
                transform: 'rotate(-45deg)',
                '-webkit-transform': 'rotate(-45deg)',
                margin: '1em'
            }
        });
        let format = (arr) => steps.map((elem, i) => i + 1 === arr.length ? makeCard(elem) : [makeCard(elem), arrow]);

        return m('div', {
            display: 'flex',
            'flex-direction': 'column',
            'align-items': 'center',
            'justify-content': 'center',
            'overflow': 'auto',
            'width': '100%'
        }, format(steps))

    }
}