import m from 'mithril';
import {mergeAttributes, borderColor} from "../common";

// a menu with left and right components.
// On desktop, the center is draggable
// On mobile, can switch between left and right menus on click

// ```
// m(TwoPanel, {
//     left: m(...),
//     right: m(...),
//     })
// ```


export default class TwoPanel {
    oninit() {
        this.focus = 'left';
        this.previous = this.focus;
    }

    view(vnode) {
        let {left, right} = vnode.attrs;

        let animate = this.focus !== this.previous;
        this.previous = this.focus;

        return [
            m('div#leftView', mergeAttributes({
                onclick: () => this.focus = 'left',
                class: {
                    'left': ['focused-left'],
                    'right': ['unfocused-left']
                }[this.focus],
                style: {
                    'border-right': borderColor,
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    right: leftpanelSize + '%',
                    'overflow-y': 'auto',
                    'animation-duration': '.4s'
                }
            }, animate && {style: {'animation-name': 'twopanel-' + this.focus}}), left),
            m('div#rightView', mergeAttributes({
                onclick: () => this.focus = 'right',
                class: {
                    'left': ['unfocused-right'],
                    'right': ['focused-right']
                }[this.focus],
                style: {
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: leftpanelSize + '%',
                    'overflow-y': 'auto',
                    'animation-duration': '.4s'
                }
            }, animate && {style: {'animation-name': 'twopanel-' + this.focus}}), [
                m('#horizontalDrag', {
                    class: ['hide-mobile'],
                    style: {
                        position: 'absolute',
                        left: '-4px',
                        top: 0,
                        bottom: 0,
                        width: '12px',
                        cursor: 'w-resize'
                    },
                    onmousedown: resizeMenu
                }),
                right
            ])
        ]
    }
}

// window resizing
let isResizingMenu = false;
export let leftpanelSize = 50;
export let resizeMenu = (e) => {
    isResizingMenu = true;
    document.body.classList.add('no-select');
    resizeMenuTick(e);
};

let resizeMenuTick = (e) => {
    leftpanelSize = (1 - e.clientX / document.getElementById('canvas').clientWidth) * 100;

    document.getElementById('leftView').style.right = leftpanelSize + "%";
    document.getElementById('rightView').style.width = leftpanelSize + "%";
};

document.onmousemove = (e) => isResizingMenu && resizeMenuTick(e);

document.onmouseup = () => {
    if (isResizingMenu) {
        isResizingMenu = false;
        document.body.classList.remove('no-select');
    }
};