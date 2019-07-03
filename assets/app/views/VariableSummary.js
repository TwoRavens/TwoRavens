import m from 'mithril';
import * as d3 from "d3";
import PlotVegaLite from "./PlotVegaLite";
import {formatPrecision} from "../app";
import Table from "../../common/views/Table";
import ButtonRadio from "../../common/views/ButtonRadio";
import {italicize} from "../index";

export default class VariableSummary {
    oninit() {
        this.densityType = 'PDF'
    }

    view(vnode) {
        let {variable} = vnode.attrs;

        if (!variable) return;

        let plot;
        let filteredMessage;

        let continuousSpecification = {
            "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
            "mark": "area",
            "encoding": {
                "x": {
                    "field": "x", "type": "quantitative"
                },
                "y": {
                    "field": "y", "type": "quantitative",
                    "axis": {"title": "density"}
                }
            }
        };

        let barSpecification = {
            "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
            "mark": "bar",
            "encoding": {
                "y": {
                    "field": "x", "type": "ordinal"
                },
                "x": {
                    "field": "y", "type": "quantitative",
                }
            }
        };

        if (this.densityType === 'PDF') {
            if (variable.plottype === 'continuous') plot = m(PlotVegaLite, {
                data: variable.plotx.map((_, i) => ({x: variable.plotx[i], y: variable.ploty[i]})),
                specification: continuousSpecification,
                identifier: 'x'
            });

            if (variable.plottype === 'bar'){
                let barLimit = 15;
                let keys = Object.keys(variable.plotvalues);

                if (keys.length > barLimit) filteredMessage = true;
                plot = m(PlotVegaLite, {
                    data: Object.keys(variable.plotvalues)
                        .filter((key, i) => keys.length < barLimit || !(i % parseInt(keys.length / barLimit)) || i === keys.length - 1)
                        .map(value => ({x: value, y: variable.plotvalues[value]})),
                    specification: barSpecification,
                    identifier: 'x'
                })
            }
        }

        if (this.densityType === 'CDF') {
            if (variable.cdfplottype === 'continuous') plot = m(PlotVegaLite, {
                data: variable.cdfplotx.map((_, i) => ({x: variable.cdfplotx[i], y: variable.cdfploty[i]})),
                specification: continuousSpecification,
                identifier: 'x'
            });
            if (variable.cdfplottype === 'bar') plot = m(PlotVegaLite, {
                data: variable.cdfplotx.map((_, i) => ({x: variable.cdfplotx[i], y: variable.cdfploty[i]})),
                specification: barSpecification,
                identifier: 'x'
            });
        }

        return [
            m('center', m('i', variable.labl)),
            m(ButtonRadio, {
                sections: [
                    {
                        value: 'PDF',
                        title: 'probability density function plot'
                    },
                    {
                        value: 'CDF',
                        title: 'cumulative density function plot'
                    }
                ],
                activeSection: this.densityType,
                onclick: type => this.densityType = type
            }),
            plot && m('div', {style: {'max-height': '300px', 'text-align': 'center', margin: '1em'}}, plot),
            filteredMessage && italicize(`Only a subset of the ${variable.uniques} unique values are plotted.`),
            m(Table, {
                id: 'varSummaryTable',
                data: formatVariableSummary(variable)
            })
        ]
    }
}

export let formatVariableSummary = variable => {
    if (!variable) return;

    // d3 significant digit formatter
    let rint = d3.format('r');
    const precision = 4;

    let data = {
        'Mean': formatPrecision(variable.mean, precision) + (variable.meanCI
            ? ` (${formatPrecision(variable.meanCI.lowerBound, precision)}, ${formatPrecision(variable.meanCI.upperBound, precision)})`
            : ''),
        'Median': formatPrecision(variable.median, precision),
        'Most Freq': rint(variable.mode),
        'Most Freq Occurrences': rint(variable.freqmode),
        'Median Freq': variable.mid,
        'Mid Freq Occurrences': rint(variable.freqmid),
        'Least Freq': variable.fewest,
        'Least Freq Occurrences': rint(variable.freqfewest),
        'Std Dev (Sample)': formatPrecision(variable.sd, precision),
        'Minimum': formatPrecision(variable.min, precision),
        'Maximum': formatPrecision(variable.max, precision),
        'Invalid': rint(variable.invalid),
        'Valid': rint(variable.valid),
        'Uniques': rint(variable.uniques),
        'Herfindahl': formatPrecision(variable.herfindahl)
    };

    return Object.keys(data)
        .filter(key => data[key] !== "" && data[key] !== undefined && !isNaN(data[key])) // drop all keys with nonexistent values
        .reduce((out, key) => Object.assign(out, {[key]: data[key]}), {})
};
