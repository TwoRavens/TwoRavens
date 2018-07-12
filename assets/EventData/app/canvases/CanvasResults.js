import m from 'mithril'
import vegaEmbed from 'vega-embed';
import * as common from '../../../common-eventdata/common';
import * as app from '../app';

import ButtonRadio from '../../../common-eventdata/views/ButtonRadio';

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

        // TODO delete these setters when done testing
        app.setSelectedDataset('cline_phoenix_nyt');
        app.setAggregationHeadersUnit(["Actor", "Date"]);
        app.setAggregationHeadersEvent(["AGREE", "CONSULT", "SUPPORT"]);
        app.setAggregationData([
            {"AGREE": 1, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1949-01-01"},
            {"AGREE": 0, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1952-01-01"},
            {"AGREE": 0, "CONSULT": 1, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1953-01-01"},
            {"AGREE": 3, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1955-01-01"},
            {"AGREE": 1, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1958-01-01"},
            {"AGREE": 1, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1959-01-01"},
            {"AGREE": 1, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1960-01-01"},
            {"AGREE": 0, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1961-01-01"},
            {"AGREE": 0, "CONSULT": 1, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1962-01-01"},
            {"AGREE": 0, "CONSULT": 3, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1963-01-01"},
            {"AGREE": 0, "CONSULT": 1, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1964-01-01"},
            {"AGREE": 1, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1968-01-01"},
            {"AGREE": 0, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1969-01-01"},
            {"AGREE": 0, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1972-01-01"},
            {"AGREE": 0, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1973-01-01"},
            {"AGREE": 0, "CONSULT": 1, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1974-01-01"},
            {"AGREE": 0, "CONSULT": 1, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1976-01-01"},
            {"AGREE": 0, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1979-01-01"},
            {"AGREE": 1, "CONSULT": 2, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1980-01-01"},
            {"AGREE": 1, "CONSULT": 1, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1981-01-01"},
            {"AGREE": 0, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1982-01-01"},
            {"AGREE": 0, "CONSULT": 4, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1983-01-01"},
            {"AGREE": 0, "CONSULT": 2, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1984-01-01"},
            {"AGREE": 2, "CONSULT": 1, "SUPPORT": 1, "Actor": "USA-AFG", "Date": "1985-01-01"},
            {"AGREE": 1, "CONSULT": 1, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1986-01-01"},
            {"AGREE": 1, "CONSULT": 1, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1987-01-01"},
            {"AGREE": 3, "CONSULT": 4, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1988-01-01"},
            {"AGREE": 1, "CONSULT": 2, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1989-01-01"},
            {"AGREE": 0, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1990-01-01"},
            {"AGREE": 0, "CONSULT": 1, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1993-01-01"},
            {"AGREE": 0, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1997-01-01"},
            {"AGREE": 0, "CONSULT": 2, "SUPPORT": 1, "Actor": "USA-AFG", "Date": "1998-01-01"},
            {"AGREE": 1, "CONSULT": 1, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "1999-01-01"},
            {"AGREE": 0, "CONSULT": 7, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "2000-01-01"},
            {"AGREE": 10, "CONSULT": 8, "SUPPORT": 8, "Actor": "USA-AFG", "Date": "2001-01-01"},
            {"AGREE": 4, "CONSULT": 18, "SUPPORT": 1, "Actor": "USA-AFG", "Date": "2002-01-01"},
            {"AGREE": 4, "CONSULT": 2, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "2003-01-01"},
            {"AGREE": 6, "CONSULT": 1, "SUPPORT": 0, "Actor": "USA-AFG", "Date": "2004-01-01"},
            {"AGREE": 4, "CONSULT": 3, "SUPPORT": 1, "Actor": "USA-AFG", "Date": "2005-01-01"},
            {"AGREE": 1, "CONSULT": 0, "SUPPORT": 1, "Actor": "USA-IRQ", "Date": "1945-01-01"},
            {"AGREE": 0, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-IRQ", "Date": "1948-01-01"},
            {"AGREE": 0, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-IRQ", "Date": "1950-01-01"},
            {"AGREE": 0, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-IRQ", "Date": "1951-01-01"},
            {"AGREE": 0, "CONSULT": 1, "SUPPORT": 1, "Actor": "USA-IRQ", "Date": "1954-01-01"},
            {"AGREE": 0, "CONSULT": 0, "SUPPORT": 1, "Actor": "USA-IRQ", "Date": "1955-01-01"},
            {"AGREE": 2, "CONSULT": 1, "SUPPORT": 1, "Actor": "USA-IRQ", "Date": "1956-01-01"},
            {"AGREE": 2, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-IRQ", "Date": "1957-01-01"},
            {"AGREE": 1, "CONSULT": 1, "SUPPORT": 2, "Actor": "USA-IRQ", "Date": "1958-01-01"},
            {"AGREE": 0, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-IRQ", "Date": "1959-01-01"},
            {"AGREE": 0, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-IRQ", "Date": "1960-01-01"},
            {"AGREE": 1, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-IRQ", "Date": "1962-01-01"},
            {"AGREE": 0, "CONSULT": 0, "SUPPORT": 1, "Actor": "USA-IRQ", "Date": "1963-01-01"},
            {"AGREE": 0, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-IRQ", "Date": "1966-01-01"},
            {"AGREE": 0, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-IRQ", "Date": "1969-01-01"},
            {"AGREE": 0, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-IRQ", "Date": "1972-01-01"},
            {"AGREE": 2, "CONSULT": 2, "SUPPORT": 0, "Actor": "USA-IRQ", "Date": "1980-01-01"},
            {"AGREE": 0, "CONSULT": 1, "SUPPORT": 0, "Actor": "USA-IRQ", "Date": "1981-01-01"},
            {"AGREE": 2, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-IRQ", "Date": "1982-01-01"},
            {"AGREE": 0, "CONSULT": 0, "SUPPORT": 1, "Actor": "USA-IRQ", "Date": "1983-01-01"},
            {"AGREE": 1, "CONSULT": 2, "SUPPORT": 1, "Actor": "USA-IRQ", "Date": "1984-01-01"},
            {"AGREE": 2, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-IRQ", "Date": "1985-01-01"},
            {"AGREE": 2, "CONSULT": 1, "SUPPORT": 0, "Actor": "USA-IRQ", "Date": "1986-01-01"},
            {"AGREE": 3, "CONSULT": 3, "SUPPORT": 3, "Actor": "USA-IRQ", "Date": "1987-01-01"},
            {"AGREE": 1, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-IRQ", "Date": "1988-01-01"},
            {"AGREE": 0, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-IRQ", "Date": "1989-01-01"},
            {"AGREE": 8, "CONSULT": 13, "SUPPORT": 2, "Actor": "USA-IRQ", "Date": "1990-01-01"},
            {"AGREE": 13, "CONSULT": 14, "SUPPORT": 7, "Actor": "USA-IRQ", "Date": "1991-01-01"},
            {"AGREE": 1, "CONSULT": 4, "SUPPORT": 1, "Actor": "USA-IRQ", "Date": "1992-01-01"},
            {"AGREE": 0, "CONSULT": 0, "SUPPORT": 1, "Actor": "USA-IRQ", "Date": "1993-01-01"},
            {"AGREE": 2, "CONSULT": 1, "SUPPORT": 0, "Actor": "USA-IRQ", "Date": "1994-01-01"},
            {"AGREE": 0, "CONSULT": 1, "SUPPORT": 0, "Actor": "USA-IRQ", "Date": "1995-01-01"},
            {"AGREE": 2, "CONSULT": 4, "SUPPORT": 1, "Actor": "USA-IRQ", "Date": "1996-01-01"},
            {"AGREE": 4, "CONSULT": 1, "SUPPORT": 0, "Actor": "USA-IRQ", "Date": "1997-01-01"},
            {"AGREE": 1, "CONSULT": 6, "SUPPORT": 2, "Actor": "USA-IRQ", "Date": "1998-01-01"},
            {"AGREE": 3, "CONSULT": 3, "SUPPORT": 0, "Actor": "USA-IRQ", "Date": "1999-01-01"},
            {"AGREE": 0, "CONSULT": 0, "SUPPORT": 0, "Actor": "USA-IRQ", "Date": "2000-01-01"},
            {"AGREE": 1, "CONSULT": 3, "SUPPORT": 0, "Actor": "USA-IRQ", "Date": "2001-01-01"},
            {"AGREE": 17, "CONSULT": 6, "SUPPORT": 1, "Actor": "USA-IRQ", "Date": "2002-01-01"},
            {"AGREE": 37, "CONSULT": 48, "SUPPORT": 7, "Actor": "USA-IRQ", "Date": "2003-01-01"},
            {"AGREE": 29, "CONSULT": 11, "SUPPORT": 5, "Actor": "USA-IRQ", "Date": "2004-01-01"},
            {"AGREE": 13, "CONSULT": 5, "SUPPORT": 2, "Actor": "USA-IRQ", "Date": "2005-01-01"},
            {"AGREE": 1, "CONSULT": 1, "SUPPORT": 0, "Actor": "USA-IRQ", "Date": "2006-01-01"}
        ]);

        let {preferences} = vnode.attrs;

        let actorHeaders = app.aggregationHeadersUnit
            .filter(header => app.genericMetadata[app.selectedDataset]['subsets'][header]['type'] === 'dyad');

        if (!('filter' in preferences)) {
            preferences['filters'] = {};
            actorHeaders.forEach(actorHeader => preferences['filters'][actorHeader] = app.aggregationData[0][actorHeader]);
        }

        preferences['melt'] = actorHeaders.length ? actorHeaders[0] : 'event';
    }

    view(vnode) {
        let {preferences, setRedraw} = vnode.attrs;

        let actorHeaders = app.aggregationHeadersUnit.filter(header =>
            app.genericMetadata[app.selectedDataset]['subsets'][header]['type'] === 'dyad');

        return m('div#canvasTimeSeries', {
                style: {
                    'margin-top': common.panelMargin,
                    width: "100%",
                    height: "calc(100% - 100px)"
                }
            },

            // if there are actors, then user picks how to melt the data
            actorHeaders.length && m(ButtonRadio, {
                id: 'btnMelt',
                sections: [...actorHeaders, ...app.aggregationHeadersEvent].map(header => ({value: header})),
                activeSection: preferences['melt'],
                onclick: melt => {
                    preferences['melt'] = melt;
                    setRedraw(true);
                },
                attrsAll: {style: {width: 'auto'}}
            }),

            app.aggregationHeadersUnit.indexOf(preferences['melt']) !== -1 && actorHeaders.map(actorHeader => m(ButtonRadio, {
                id: 'btnFilter' + actorHeader,
                sections: [...app.aggregationData.reduce((out, entry) => {
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
            m('div#plotTimeSeries', {style: {width: "100%", height: "100%"}}))
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

        let isUnitMelt = app.aggregationHeadersUnit.indexOf(preferences['melt']) !== -1;

        let factors = isUnitMelt ? app.aggregationHeadersUnit : ['Date', preferences['melt']];
        let processed = melt(app.aggregationData, factors);

        let vegaSchema;

        if (isUnitMelt) {
            // filter to one group of actors
            Object.keys(preferences['filters'])
                .forEach(header => processed = processed.filter(point => point[header] === preferences['filters'][header]));

            vegaSchema = {
                "$schema": "https://vega.github.io/schema/vega-lite/v2.0.json",
                "data": {"values": processed},
                "mark": "line",
                "encoding": {
                    "x": {"field": "Date", "type": "temporal", "axis": {"format": "%Y-%m-%d"}},
                    "y": {"field": "value", "type": "quantitative"},
                    "color": {"field": "variable", "type": "nominal"}
                }
            };
        }
        else {
            // filter to one event measure
            processed = processed.filter(point => point['variable'] === 'Actor'); // note this 'Actor' is hardcoded

            vegaSchema = {
                "$schema": "https://vega.github.io/schema/vega-lite/v2.0.json",
                "data": {"values": processed},
                "mark": "line",
                "encoding": {
                    "x": {"field": "Date", "type": "temporal", "axis": {"format": "%Y-%m-%d"}},
                    "y": {"field": preferences['melt'], "type": "quantitative"},
                    "color": {"field": "value", "type": "nominal"}
                }
            };
        }

        let bounds = document.getElementById('plotTimeSeries').getBoundingClientRect();
        vegaEmbed('#plotTimeSeries', vegaSchema, {actions: false, width: bounds.width, height: bounds.height});
    }
}