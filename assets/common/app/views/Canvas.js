import m from 'mithril'

// Interface specification

// ```
// m(Canvas, {
//     contents: m(...)
//     })
// ```

// Purpose:
// 1. if a left or right panel is not permitted to occlude the content on the canvas,
//      this class resizes the contents to maintain a margin away from the panels
// 2. if the contents of the canvas overflow and cause a scroll bar,
//      the left and right panel are shifted to maintain a margin

import {panelOcclusion, heightFooter, heightHeader, scrollBarChanged, panelMargin} from "../common";

export default class Canvas {
    oncreate() {
        // Redraw if scroll bar status has changed
        window.onresize = () => {if (scrollBarChanged()) m.redraw()};
    }

    view(vnode) {
        let {contents} = vnode.attrs;
        return m('div#canvas', {
            style: {
                width: '100%',
                height: `calc(100% - ${heightHeader + heightFooter}px)`,
                'padding-left': panelOcclusion['left'] + 'px',
                'padding-right': panelOcclusion['right'] + 'px',
                top: heightHeader + 'px',
                position: 'fixed',
                overflow: 'auto'
            }
        }, contents)
    }
}
