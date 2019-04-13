import m from 'mithril';
import vegaEmbed from "vega-embed";

// m(PlotVegaLite, {
//     specification: {...}, // an instance of this spec: https://vega.github.io/vega-lite/docs/spec.html,
//     data: [...], // data that is rebound on update
//     *: any attrs may be passed
// })

export default class PlotVegaLite {
    view({attrs}) {
        return m('', attrs)
    }



    static plot({children, dom}) {
    }
    oncreate(vnode) {
        let {specification, data} = vnode.attrs;

        vegaEmbed(dom, children, {
            actions: false,
            width: dom.offsetWidth,
            height: dom.offsetHeight
        });

    }
    onupdate(vnode) {
        // mask repeated warnings about outdated vega-lite specification
        let tempWarn = console.warn;
        console.warn = Function;

        try {
            PlotVegaLite.plot(vnode)
        } finally {
            console.warn = tempWarn;
        }
    }
}