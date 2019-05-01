import m from 'mithril'
import vegaEmbed from 'vega-embed';
import * as common from '../../../common/common';
import * as eventdata from '../eventdata';

import ButtonRadio from '../../../common/views/ButtonRadio';

//this function (from CanvasResults.js) takes the raw MongoDB data and puts them into buckets by date and value for Vegas to process
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

export default class CanvasDiscover {

    oninit(vnode) {
        let {preferences} = vnode.attrs;
/**
        let actorHeaders = 'dyad' in eventdata.aggregationHeadersLabels ? eventdata.aggregationHeadersLabels['dyad'] : [];

        if (!('filter' in preferences)) {
            preferences['filters'] = {};
            actorHeaders.forEach(actorHeader => preferences['filters'][actorHeader] = eventdata.tableData[0][actorHeader]);
        }

        preferences['melt'] = actorHeaders.length ? actorHeaders[0] : 'event';
**/
    }
    view(vnode) {
        let {preferences, setRedraw} = vnode.attrs;
        // choose which plot to draw via "app.selectedResult"
/**
        if (!('date' in eventdata.aggregationHeadersLabels) || eventdata.aggregationHeadersLabels['date'].length !== 1)
            return m('h4', 'There must be one date measure to visualize a time series.');

        let actorHeaders = 'dyad' in eventdata.aggregationHeadersLabels ? eventdata.aggregationHeadersLabels['dyad'] : [];
**/
        return m('div#canvasDiscoveryBody', {
                style: {
                    'margin-top': common.panelMargin,
                    width: "100%",
                    height: "calc(100% - 100px)"
                }
            },
            //loop here to create subplots
            m('div#plotDiscovery', {style: {width: "100%", height: "100%"}}))
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
        console.log("plotting");
        console.log(preferences);

        let width = Math.max(window.innerWidth
            //~ - document.getElementById('leftpanel').getBoundingClientRect().width
            //~ - document.getElementById('rightpanel').getBoundingClientRect().width
            - Math.max(...eventdata.tableHeaders.map(col => col.length)) * 4 - 133, 400);
//        let height = Math.max(window.innerHeight
//            - document.getElementById('aggregDataOutput').getBoundingClientRect().height
//            - 40 - 153, 400);
        let height = Math.max(window.innerHeight - 153, 400);

        console.log(eventdata.discoveryData[eventdata.selectedDataset]["data"]["max"]);
        console.log(melt(eventdata.discoveryData[eventdata.selectedDataset]["data"]["max"]["localKendall"][0][0]["data"], ["date"]));
/**
        let vegaSchema;
        vegaSchema = {
            "$schema": "https://vega.github.io/schema/vega-lite/v2.0.json",
            "data": {"values": melt(eventdata.discoveryData[eventdata.selectedDataset]["data"]["max"]["localKendall"][0][0]["data"], ["date"])},
            "mark": "line",
            "encoding": {
                "x": {"field": "date", "type": "temporal", "axis": {"format": "%Y-%m-%d"}},
                "y": {"field": "value", "type": "quantitative"},
                "color": {"field": "variable", "type": "nominal"}
            }
        };
        //~ //if (eventdata.tableHeaders.length === 1 && 'date' in eventdata.aggregationHeadersLabels) {
            //~ vegaSchema = {
                //~ "$schema": "https://vega.github.io/schema/vega-lite/v2.0.json",
//~ //                "data": {"values": melt(eventdata.tableData, eventdata.tableHeaders)},
                //~ // "data": {"values": eventdata.discoveryData[eventdata.selectedDataset]}, //need to loop on this
                //~ "data": {"values": melt(eventdata.discoveryData[eventdata.selectedDataset]["data"]["max"]["localKendall"][0][0]["data"], ["date"])}, //need to loop on this
                //~ "mark": "line",
                //~ "encoding": {
                    //~ "x": {"field": "date", "type": "temporal", "axis": {"format": "%Y-%m-%d"}},
                    //~ "y": {"field": "value", "type": "quantitative"},
                    //~ "color": {"field": "variable", "type": "nominal"}
                //~ }
            //~ };
        //}

        vegaEmbed('#plotDiscovery', vegaSchema, {actions: false, width: width, height: height});
        **/
    }
}
