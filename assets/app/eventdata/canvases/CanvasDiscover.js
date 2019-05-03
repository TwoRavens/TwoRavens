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
    }
    view(vnode) {
        let {preferences, setRedraw} = vnode.attrs;
console.log(eventdata.discoveryData[eventdata.selectedDataset]["data"]);
        let plotArr = [];
        for (var plt in eventdata.discoveryData[eventdata.selectedDataset]["data"]["max"]) {
            plotArr.push(m("h3", {}, "Max " + plt));
            for (var count in eventdata.discoveryData[eventdata.selectedDataset]["data"]["max"][plt][0]) {
                plotArr.push(m("div#plotMax" + plt + count, {style: {width: "100%", height: "100%"}}));
            }
        }
        for (var plt in eventdata.discoveryData[eventdata.selectedDataset]["data"]["min"]) {
            plotArr.push(m("h3", {}, "Min " + plt));
            for (var count in eventdata.discoveryData[eventdata.selectedDataset]["data"]["min"][plt][0]) {
                plotArr.push(m("div#plotMin" + plt + count, {style: {width: "100%", height: "100%"}}));
            }
        }
        console.log("viewed", plotArr);
        return m('div#canvasDiscoveryBody', {
                style: {
                    'margin-top': common.panelMargin,
                    width: "100%",
                    height: "calc(100% - 100px)"
                }
            },
            //loop here to create subplots
            //m('div#plotDiscovery', {style: {width: "100%", height: "100%"}}))
            m("div#canvasDiscoveryMax", {}, plotArr))
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

        //let width = Math.max(window.innerWidth
            //~ - document.getElementById('leftpanel').getBoundingClientRect().width
            //~ - document.getElementById('rightpanel').getBoundingClientRect().width
            // Math.max(...eventdata.tableHeaders.map(col => col.length)) * 4 - 133, 400);
//        let height = Math.max(window.innerHeight
//            - document.getElementById('aggregDataOutput').getBoundingClientRect().height
//            - 40 - 153, 400);
        let height = Math.max(window.innerHeight - 200, 400);
        let width = Math.max(window.innerWidth - 600, 400);

        for (var plt in eventdata.discoveryData[eventdata.selectedDataset]["data"]["max"]) {
            for (var count in eventdata.discoveryData[eventdata.selectedDataset]["data"]["max"][plt][0]) {
                let vegaSchema = {
                    "$schema": "https://vega.github.io/schema/vega-lite/v2.0.json",
                    "data": {"values": [...melt(eventdata.discoveryData[eventdata.selectedDataset]["data"]["max"][plt][0][count]["data"], ["date"])]},
                    "mark": "line",
                    "encoding": {
                        "x": {"field": "date", "type": "temporal", "axis": {"format": "%Y-%m-%d"}},
                        "y": {"field": "value", "type": "quantitative"},
                        "color": {"field": "variable", "type": "nominal"}
                    }
                };
                vegaEmbed('#plotMax' + plt + count, vegaSchema, {actions: false, width: width, height: height});
            }
        }
        for (var plt in eventdata.discoveryData[eventdata.selectedDataset]["data"]["min"]) {
            for (var count in eventdata.discoveryData[eventdata.selectedDataset]["data"]["min"][plt][0]) {
                let vegaSchema = {
                    "$schema": "https://vega.github.io/schema/vega-lite/v2.0.json",
                    "data": {"values": [...melt(eventdata.discoveryData[eventdata.selectedDataset]["data"]["min"][plt][0][count]["data"], ["date"])]},
                    "mark": "line",
                    "encoding": {
                        "x": {"field": "date", "type": "temporal", "axis": {"format": "%Y-%m-%d"}},
                        "y": {"field": "value", "type": "quantitative"},
                        "color": {"field": "variable", "type": "nominal"}
                    }
                };
                vegaEmbed('#plotMin' + plt + count, vegaSchema, {actions: false, width: width, height: height});
            }
        }
    }
}
