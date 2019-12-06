import m from 'mithril';
import * as d3 from "d3";
import PlotVegaLite from "./PlotVegaLite";
import {formatPrecision, saveSystemLogEntry} from "../app";
import Table from "../../common/views/Table";
import ButtonRadio from "../../common/views/ButtonRadio";
import {italicize} from "../index";
import * as app from '../app';


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
            if (variable.pdfPlotType === 'continuous') plot = m(PlotVegaLite, {
                data: variable.pdfPlotX.map((_, i) => ({x: variable.pdfPlotX[i], y: variable.pdfPlotY[i]})),
                specification: continuousSpecification,
                identifier: 'x'
            });

            if (!variable.pdfPlotType || variable.pdfPlotType === 'bar'){
                let barLimit = 15;
                let keys = Object.keys(variable.plotValues);

                if (keys.length > barLimit) filteredMessage = true;
                plot = m(PlotVegaLite, {
                    data: Object.keys(variable.plotValues)
                        .filter((key, i) => keys.length < barLimit || !(i % parseInt(keys.length / barLimit)) || i === keys.length - 1)
                        .map(value => ({x: value, y: variable.plotValues[value]})),
                    specification: barSpecification,
                    identifier: 'x'
                })
            }
        }

        if (this.densityType === 'CDF') {
            if (variable.cdfPlotType === 'continuous') plot = m(PlotVegaLite, {
                data: variable.cdfPlotX.map((_, i) => ({x: variable.cdfPlotX[i], y: variable.cdfPlotY[i]})),
                specification: continuousSpecification,
                identifier: 'x'
            });
            let isCategorical = app.getNominalVariables(app.getSelectedProblem()).includes(variable.name);
            if (!isCategorical && variable.cdfPlotType === 'bar') plot = m(PlotVegaLite, {
                data: variable.cdfPlotX.map((_, i) => ({x: variable.cdfPlotX[i], y: variable.cdfPlotY[i]})),
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
            filteredMessage && italicize(`Only a subset of the ${variable.uniqueCount} unique values are plotted.`),
            m(Table, {
                id: 'varSummaryTable',
                data: formatVariableSummary(variable)
            })
        ]
    }
}

export let formatVariableSummary = variable => {
    if (!variable) return;

    /*
    let logParams = {
                  feature_id: 'VIEW_VARIABLE_SUMMARY',
                  activity_l1: 'DATA_PREPARATION',
                  activity_l2: 'DATA_EXPLORE',
                  other: {variable: variable.name}
                }
    saveSystemLogEntry(logParams);
    */

    // d3 significant digit formatter
    let rint = d3.format('r');
    const precision = 4;

    let data = {
        'Mean': formatPrecision(variable.mean, precision),
        'Median': formatPrecision(variable.median, precision),
        'Mode Values': variable.mode.map(rint),
        'Mode Frequency': Math.round(variable.modeFreq),
        'Midpoint': (variable.midpoint || []).length === 0 ? undefined : variable.midpoint,
        'Midpoint Freq': (variable.midpoint || []).length === 0 ? undefined : Math.round(variable.midpointFreq),
        'Least Freq': variable.fewestValues,
        'Least Freq Occurrences': Math.round(variable.fewestFreq),
        'Std Dev (Sample)': formatPrecision(variable.stdDev, precision),
        'Minimum': formatPrecision(variable.min, precision),
        'Maximum': formatPrecision(variable.max, precision),
        'Invalid Count': Math.round(variable.invalidCount),
        'Valid Count': Math.round(variable.validCount),
        'Unique Count': Math.round(variable.uniqueCount),
        'Herfindahl Index': formatPrecision(variable.herfindahlIndex),
        'Num/Char': variable.numchar,
        'Nature': variable.nature,
        'Binary': String(variable.binary),
        'Interval': variable.interval
    };

    return Object.keys(data)
        .filter(key => data[key] !== "" && data[key] !== undefined) // drop all keys with nonexistent values
        .reduce((out, key) => Object.assign(out, {[key]: data[key]}), {})
};
