import m from 'mithril';
import * as common from '../common';

// ```
// m(ModalVanilla, {
//     id: string,
//     display: boolean, (is active)
//     setDisplay: (state) => display = state, (called when × or background clicked)
//     contents: m(...)
// })
// ```

// I wrote this because I wanted a non-jquery alternative with a less-specific specification -Shoeboxam

export default class ModalVanilla {
    view(vnode) {
        let {id, setDisplay, contents} = vnode.attrs;

        return m(`div#modalBackground${id}`, {
            style: {
                animation: 'opacity 0.5s',
                position: 'fixed',
                'z-index': 2000,
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                overflow: 'auto',
                'background-color': 'rgba(0,0,0,0.4)'
            },
            onclick: () => setDisplay(false)
        }, m(`div#modalBox${id}`, {
            style: {
                'background-color': common.menuColor,
                margin: '15% auto',
                padding: '20px',
                border: common.borderColor,
                width: '80%',
                transform: 'translateY(-50%)',
                'box-shadow': '0 5px 20px rgba(0,0,0,.4)'
            },
            onclick: (e) => e.stopPropagation()
        }, m(`div#modalCancel${id}`, {
            onclick: () => setDisplay(false),
            style: {
                display: 'inline-block',
                'margin-right': '0.5em',
                transform: 'scale(2, 2)',
                float: 'right',
                'font-weight': 'bold',
                'line-height': '14px'
            }
        }, '×'), contents));
    }
}