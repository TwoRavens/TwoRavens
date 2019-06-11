import m from 'mithril';
import vegaEmbed from "vega-embed";

import * as vega from 'vega';

// m(PlotVegaLite, {
//     specification: {...}, // an instance of this spec: https://vega.github.io/vega-lite/docs/spec.html,
//     data: [...], // data that is rebound on update
//     *: any attrs may be passed
// })

export default class PlotVegaLite {
    view() {
        return m('div', {style: {width: '100%', height: '100%'}})
    }

    plot(vnode) {
        let {specification} = vnode.attrs;

        let newSpecification = JSON.stringify(specification);
        if (this.specification !== newSpecification) {

            this.specification = newSpecification;

            Object.assign(specification, {
                autosize: {
                    "type": "fit",
                    "contains": "padding"
                },
                data: {name: 'embedded'}
            });

            vegaEmbed(vnode.dom, specification, {
                actions: false
            }).then(result => {
                this.instance = result.view;
                this.dataKeys = new Set();
                this.diff(vnode);
                m.redraw()
            })
        }

        // this is the optimized path
        // check for existence of dataKeys because the initial plotting is asynchronous
        else if (this.dataKeys) this.diff(vnode);
    }

    diff(vnode) {
        let {data, identifier} = vnode.attrs;

        let newData = data.filter(datum => !this.dataKeys.has(datum[identifier]));

        this.dataKeys = new Set(data.map(datum => datum[identifier]));
        this.instance
            // .width(offsetWidth)
            // .height(offsetHeight + (heightOffset || 0))
            .change('embedded', vega.changeset()
                .insert(newData)
                .remove(datum => !this.dataKeys.has(datum[identifier])))
            .run();
    }

    oncreate(vnode) {

        // mask repeated warnings about outdated vega-lite specification
        let tempWarn = console.warn;
        console.warn = _ => _;

        try {
            this.plot(vnode)
        } finally {
            console.warn = tempWarn;
        }
    }
    onupdate(vnode) {

        // mask repeated warnings about outdated vega-lite specification
        let tempWarn = console.warn;
        console.warn = _ => _;

        try {
            this.plot(vnode)
        } finally {
            console.warn = tempWarn;
        }
    }
}