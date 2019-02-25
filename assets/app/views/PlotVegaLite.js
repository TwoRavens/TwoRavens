import m from 'mithril';
import vegaEmbed from "vega-embed";

// m(PlotVegaLite, {
//     *: any attrs may be passed
// }, specification) // an instance of this spec: https://vega.github.io/vega-lite/docs/spec.html,

export default class PlotVegaLite {
    static plot({children, dom}) {
        vegaEmbed(dom, children, {
            actions: false,
            width: dom.offsetWidth,
            height: dom.offsetHeight
        });
    }

    view({attrs}) {return m('', attrs)}
    oncreate(vnode) {PlotVegaLite.plot(vnode)}
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