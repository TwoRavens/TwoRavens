// render a vega-lite specification

import m from 'mithril';
import vegaEmbed from "vega-embed";

import * as vega from 'vega';
import {setDefaultDeep} from "../utils";

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
        let {data, specification, listeners} = vnode.attrs;

        // change-sets are not currently supported. Data is manually inserted here.
        // long term, if change-sets are not returned, it would be better to remove the data argument from this component
        if (data) specification.data = {values: data};

        let newSpecification = JSON.stringify(specification);
        let {width, height} = vnode.dom.getBoundingClientRect();

        if (this.isPlotting) return;
        if (this.specification !== newSpecification
            || this.width !== width
            || this.height !== height
            || this.theme !== localStorage.getItem('plotTheme')) {

            this.isPlotting = true;
            this.specification = newSpecification;
            if (width) this.width = width;
            if (height) this.height = height;
            this.dataKeys = undefined;
            this.theme = localStorage.getItem('plotTheme');

            // include padding in width/height calculations
            if (!('autosize' in specification)) specification.autosize = {
                "type": "fit",
                "contains": "padding"
            };
            // if ('vconcat' in specification) specification.vconcat.forEach(spec => spec.width = this.width);
            // change-sets are not currently supported
            // if (data) specification.data = {name: 'embedded'};

            let options = {actions: true, theme: this.theme || 'default'};
            if ('vconcat' in specification)
                width && specification.vconcat.forEach(spec => spec.width = 'width' in spec ? spec.width : width);
            else if ('hconcat' in specification)
                height && specification.hconcat.forEach(spec => spec.height = 'height' in spec ? spec.height : height);
            else {
                if (width && !specification?.encoding?.column) specification.width = 'width' in specification ? specification.width : width;
                if (height && !specification?.encoding?.row) specification.height = 'height' in specification ? specification.height : height;
            }

            // by default, make sure labels on all plots are limited to 50 pixels
            ['axisX', 'axisY'].forEach(axis => setDefaultDeep(specification, ['config', axis, 'labelLimit'], 100));
            // setDefaultRecursive(specification, [['config', {}], ['background', 'transparent']]);

            vegaEmbed(vnode.dom, specification, options).then(result => {
                let addThemeSetter = theme => {
                    const themeAction = document.createElement('a');
                    themeAction.textContent = "Theme: " + theme;
                    themeAction.onclick = () => {
                        localStorage.setItem('plotTheme', theme);
                        vnode.dom.querySelector('details').removeAttribute('open');
                        m.redraw();
                    }
                    vnode.dom.querySelector('.vega-actions').appendChild(themeAction);
                }
                ['default', 'excel', 'ggplot2', 'quartz', 'vox', 'fivethirtyeight', 'latimes', 'dark'].map(addThemeSetter)

                // attach event listeners
                Object.entries(listeners || {}).forEach(([name, callback]) =>
                    result.view.addSignalListener(name, (n, v) => callback(v)))

                // vegalite only gets close to the width/height set in the config
                let {width, height} = vnode.dom.getBoundingClientRect();
                this.width = width;
                this.height = height;

                // change-sets are not currently supported
                // this.instance = result.view;
                // if (data) {
                //     this.dataKeys = new Set();
                //     this.diff(vnode);
                // }
                this.isPlotting = false;
                m.redraw()
            })
        }

        // this is the optimized path for the optional data attr
        // check for existence of dataKeys because the initial plotting is asynchronous
        // else if (data && this.dataKeys) this.diff(vnode);
    }

    // diff(vnode) {
    //     let {data, identifier} = vnode.attrs;
    //     let newData = data.filter(datum => !this.dataKeys.has(datum[identifier]));
    //
    //     this.dataKeys = new Set(data.map(datum => datum[identifier]));
    //     this.instance
    //         .change('embedded', vega.changeset()
    //             .insert(newData)
    //             .remove(datum => !this.dataKeys.has(datum[identifier])))
    //         .run();
    // }

    oncreate(vnode) {this.plot(vnode)}
    onupdate(vnode) {this.plot(vnode)}
}