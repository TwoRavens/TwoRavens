import m from 'mithril'
import vegaEmbed from 'vega-embed';
import * as common from '../../../common/common';
import * as eventdata from '../eventdata';

import ButtonRadio from '../../../common/views/ButtonRadio';

function melt(data, factors) {
    factors = new Set(factors);
    let outData = [];
    data.forEach(record => {
        let UID = [...factors].reduce((out, idx) => {
            out[idx] = record[idx];
            return out;
        }, {});

        Object.keys(record)
            .filter(key => !factors.has(key))
            .forEach(idxMelted => outData.push(Object.assign({}, UID, {variable: idxMelted, value: record[idxMelted]})))
    });
    return outData;
}

export default class CanvasResults {

    oninit(vnode) {
        let {preferences} = vnode.attrs;

        let actorHeaders = 'dyad' in eventdata.aggregationHeadersLabels ? eventdata.aggregationHeadersLabels['dyad'] : [];

        if (!('filter' in preferences)) {
            preferences['filters'] = {};
            actorHeaders.forEach(actorHeader => preferences['filters'][actorHeader] = eventdata.tableData[0][actorHeader]);
        }

        preferences['melt'] = actorHeaders.length ? actorHeaders[0] : 'event';
    }

    view(vnode) {
        let {preferences, setRedraw} = vnode.attrs;
        // choose which plot to draw via "app.selectedResult"

        if (!('date' in eventdata.aggregationHeadersLabels) || eventdata.aggregationHeadersLabels['date'].length !== 1)
            return m('h4', 'There must be one date measure to visualize a time series.');

        let actorHeaders = 'dyad' in eventdata.aggregationHeadersLabels ? eventdata.aggregationHeadersLabels['dyad'] : [];

        return m('div#canvasResults', {
                style: {
                    'margin-top': common.panelMargin,
                    width: "100%",
                    height: "calc(100% - 100px)"
                }
            },

            // if there are actors, then user picks how to melt the data
            actorHeaders.length !== 0 && m(ButtonRadio, {
                id: 'btnMelt',
                sections: [...actorHeaders, ...eventdata.tableHeadersEvent].map(header => ({value: header})),
                activeSection: preferences['melt'],
                onclick: melt => {
                    preferences['melt'] = melt;
                    setRedraw(true);
                },
                attrsAll: {style: {width: 'auto'}}
            }),

            eventdata.tableHeaders.indexOf(preferences['melt']) !== -1 && actorHeaders.map(actorHeader => m(ButtonRadio, {
                id: 'btnFilter' + actorHeader,
                sections: [...eventdata.tableData.reduce((out, entry) => {
                    out.add(entry[actorHeader]);
                    return out
                }, new Set())]
                    .map(actorGroup => ({value: actorGroup})),
                activeSection: preferences['filters'][actorHeader],
                onclick: actorGroup => {
                    preferences['filters'][actorHeader] = actorGroup;
                    setRedraw(true);
                },
                attrsAll: {style: {width: 'auto'}}
            })),
            m('div#plotResults', {style: {width: "100%", height: "100%"}}))
    }

    onupdate(vnode) {
        // only replot when setRedraw(true) is called. Note that 'redraw' is also set from the window resize event listener
        let {redraw, setRedraw} = vnode.attrs;
        if (!redraw) return;
        setRedraw(false);
        this.plot(vnode)
    }

    oncreate(vnode) {
        this.plot(vnode)
    }

    plot(vnode) {
        let {preferences} = vnode.attrs;

        let width = Math.max(window.innerWidth
            - document.getElementById('leftpanel').getBoundingClientRect().width
            - document.getElementById('rightpanel').getBoundingClientRect().width
            - Math.max(...eventdata.tableHeaders.map(col => col.length)) * 4 - 133, 400);
        let height = Math.max(window.innerHeight
            - document.getElementById('aggregDataOutput').getBoundingClientRect().height
            - 40 - 153, 400);

        let vegaSchema;
        if (eventdata.tableHeaders.length === 1 && 'date' in eventdata.aggregationHeadersLabels) {
            vegaSchema = {
                "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
                "data": {"values": melt(eventdata.tableData, eventdata.tableHeaders)},
                "mark": "line",
                "encoding": {
                    "x": {"field": eventdata.aggregationHeadersLabels['date'][0], "type": "temporal", "axis": {"format": "%Y-%m-%d"}},
                    "y": {"field": "value", "type": "quantitative"},
                    "color": {"field": "variable", "type": "nominal"}
                }
            };
        }
        else {
            let isUnitMelt = eventdata.tableHeaders.indexOf(preferences['melt']) !== -1;

            let factors = isUnitMelt ? eventdata.tableHeaders : [eventdata.aggregationHeadersLabels['date'][0], preferences['melt']];
            let processed = melt(eventdata.tableData, factors);

            if (isUnitMelt) {
                // filter to one group of actors
                Object.keys(preferences['filters'])
                    .forEach(header => processed = processed.filter(point => point[header] === preferences['filters'][header]));

                vegaSchema = {
                    "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
                    "data": {"values": processed},
                    "mark": "line",
                    "encoding": {
                        "x": {"field": eventdata.aggregationHeadersLabels['date'][0], "type": "temporal", "axis": {"format": "%Y-%m-%d"}},
                        "y": {"field": "value", "type": "quantitative"},
                        "color": {"field": "variable", "type": "nominal"}
                    }
                };
            }
            else {
                // filter to one event measure
                processed = processed.filter(point => point['variable'] === eventdata.aggregationHeadersLabels['dyad'][0]);

                vegaSchema = {
                    "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
                    "data": {"values": processed},
                    "mark": "line",
                    "encoding": {
                        "x": {"field": eventdata.aggregationHeadersLabels['date'][0], "type": "temporal", "axis": {"format": "%Y-%m-%d"}},
                        "y": {"field": preferences['melt'], "type": "quantitative"},
                        "color": {"field": "value", "type": "nominal"}
                    }
                };
            }
        }

        vegaEmbed('#plotResults', vegaSchema, {actions: false, width: width, height: height});
    }
}