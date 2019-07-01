import m from 'mithril';
import vegaEmbed from "vega-embed";

import * as vega from 'vega';

// m(PlotVegaLite, {
//     specification: {...}, // an instance of this spec: https://vega.github.io/vega-lite/docs/spec.html,
//
//     data: [...], // optional: data that is rebound on update
//     identifier: 'id', // optional: used for the data diff, unique identifier for each point
//     *: any attrs may be passed
// })

// plot is automatically rebuilt whenever specification, data, or dimensions are changed
// data attr may optionally be passed separately (alternative to including within the specification)
//     if passed separately, then a diff is computed based on the identifier for each data point.
//     the diff is applied to the existing plot as a vegalite changeset, instead of rebuilding the entire plot

export default class PlotVegaLite {
    view() {
        return m('div', {style: {width: '100%', height: '100%'}})
    }

    plot(vnode) {
        let {data, specification} = vnode.attrs;

        let newSpecification = JSON.stringify(specification);
        let {width, height} = vnode.dom.getBoundingClientRect();

        if (this.specification !== newSpecification || this.width !== width || this.height !== height) {

            this.specification = newSpecification;
            this.width = width;
            this.height = height;

            specification.autosize = {"type": "fit", "contains": "padding"};
            if (data) specification.data = 'embedded';

            // mask repeated warnings about outdated vega-lite specification
            let tempWarn = console.warn;
            console.warn = _ => _;

            try {
                vegaEmbed(vnode.dom, specification, {
                    actions: false, width, height
                }).then(result => {
                    this.instance = result.view;
                    if (data) {
                        this.dataKeys = new Set();
                        this.diff(vnode);
                    }
                    m.redraw()
                })
            } finally {
                console.warn = tempWarn;
            }
        }

        // this is the optimized path for the optional data attr
        // check for existence of dataKeys because the initial plotting is asynchronous
        else if (data && this.dataKeys) this.diff(vnode);
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

    oncreate(vnode) {this.plot(vnode)}
    onupdate(vnode) {this.plot(vnode)}
}