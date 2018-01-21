import m from 'mithril'

// Interface specification

// contents: all mithril to be rendered on the canvas

import {panelOcclusion, heightFooter, heightHeader, scrollBarChanged, panelMargin} from "../common";

export default class Canvas {
    oncreate() {
        // Redraw if scroll bar status has changed
        window.onresize = () => {if (scrollBarChanged()) m.redraw()};
    }

    view(vnode) {
        let {contents} = vnode.attrs;
        console.log(panelOcclusion['right']);
        return m('div#canvas', {
            style: {
                width: '100%',
                height: `calc(100% - ${heightHeader + heightFooter}px)`,
                'padding-top': panelMargin + 'px',
                'padding-left': panelOcclusion['left'] + 'px',
                'padding-right': panelOcclusion['right'] + 'px',
                top: heightHeader + 'px',
                position: 'fixed',
                overflow: 'auto'
            }
        }, contents)
    }
}
