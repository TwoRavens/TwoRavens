import m from 'mithril';
import vegaEmbed from "vega-embed";

// m(PlotVegaLite, {
//     specification: {...}, // an instance of this spec: https://vega.github.io/vega-lite/docs/spec.html,
//     data: [...], // data that is rebound on update
//     *: any attrs may be passed
// })

export default class PlotVegaLite {
    view() {
        return m('div', {style: {width: '100%', height: '100%'}})
    }

    static plot(vnode, heightOffset) {
        let {specification, data} = vnode.attrs;

        vegaEmbed(vnode.dom, specification, {
            actions: false,
            width: vnode.dom.offsetWidth - 38,
            height: vnode.dom.offsetHeight + (heightOffset || 0)
        });
    }
    oncreate(vnode) {
        PlotVegaLite.plot(vnode);
    }
    onupdate(vnode) {
        // mask repeated warnings about outdated vega-lite specification
        let tempWarn = console.warn;
        console.warn = _ => _;

        try {
            PlotVegaLite.plot(vnode, -6)
        } finally {
            console.warn = tempWarn;
        }
    }
}